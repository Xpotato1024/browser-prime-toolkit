// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {validateGuardManifest} from './source-guard.mjs';
const base='docs/benchmarks/staged-matrix-memory-stage39',head='1181a66c9e41e92ac33cd38e53643281a08487ad';
const sha=b=>createHash('sha256').update(b).digest('hex');
const historical=p=>execFileSync('git',['show',head+':'+p],{maxBuffer:16777216});
const run=JSON.parse(readFileSync(join(base,'run.json'))),index=JSON.parse(readFileSync(join(base,'evidence-index.json')));
assert.equal(run.head,head);assert.equal(index.head,head);validateGuardManifest(run);
assert.equal(run.nodeVersion,'v24.19.0');assert.equal(run.plan,'llm01-matrix-memory-stage39');
const planBytes=historical('bench/staged-matrix-memory-plan.json'),plan=JSON.parse(planBytes);
assert.equal(sha(planBytes),run.planSha256);assert.equal(sha(historical('scripts/benchmark-matrix-memory.mjs')),run.driverSha256);
assert.equal(run.trials.length,8);assert.ok(run.completedAt&&!run.error);
assert.ok(Date.parse(run.completedAt)-Date.parse(run.startedAt)<=plan.limits.totalCampaignMs);
assert.equal(index.encoding,'gzip+canonical-base64-lines76');
assert.deepEqual(Object.keys(index.files).sort(),run.trials.flatMap(t=>[t.id+'.json',t.id+'.log']).sort());
function unpack(name,expected){
 const e=index.files[name];assert.equal(e.file,name+'.gz.base64');
 const text=readFileSync(join(base,e.file),'utf8');assert.equal(Buffer.byteLength(text),e.encodedBytes);assert.ok(e.encodedBytes<=2097152);
 const packed=Buffer.from(text.replaceAll('\n',''),'base64');
 assert.equal(packed.toString('base64').match(/.{1,76}/g).join('\n')+'\n',text);
 assert.equal(packed.length,e.compressedBytes);assert.equal(sha(packed),e.compressedSha256);
 const bytes=gunzipSync(packed,{maxOutputLength:2097152});
 assert.equal(bytes.length,e.originalBytes);assert.equal(sha(bytes),e.originalSha256);assert.equal(e.originalSha256,expected);return bytes;
}
const groups=new Map(),rows=[];
for(const[i,t]of run.trials.entries()){
 for(const[k,v]of Object.entries(plan.trials[i]))assert.deepEqual(t[k],v);
 assert.equal(t.state,'completed');assert.equal(t.exitCode,0);assert.equal(t.signal,null);assert.ok(t.availableMiB>=4096);
 assert.ok(Date.parse(t.finishedAt)-Date.parse(t.startedAt)<=30000);
 assert.equal(unpack(t.id+'.log',t.logSha256).length,t.logBytes);
 const bytes=unpack(t.id+'.json',t.receipt.sha256);assert.equal(bytes.length,t.receipt.bytes);const r=JSON.parse(bytes);
 assert.equal(r.measuredHead,head);assert.equal(r.runtime,'v24.19.0');assert.equal(r.variant,t.variant);assert.equal(r.caseId,t.caseId);
 assert.equal(r.plan,run.plan);assert.equal(r.knownFactorsUsed,false);assert.equal(r.disposed,true);
 assert.equal(r.input,plan.cases.find(c=>c.id===r.caseId).input);
 const moduleText=historical(r.artifactPath).toString('utf8'),payload=moduleText.match(/['"]([A-Za-z0-9+/=]{100,})['"]/);
 assert.ok(payload);assert.equal(sha(Buffer.from(payload[1],'base64')),r.artifactSha256);
 assert.equal(r.memoryContract.maximumBytes,1073741824);assert.equal(r.memoryContract.shared,false);assert.ok(r.memoryContract.initialBytes<2097152);
 assert.equal(r.extraction.status,1);assert.ok(r.requestWallMs>0&&r.requestWallMs<30000);
 assert.ok(r.families<=1024&&r.families>0&&r.usable>=r.target);
 assert.equal(r.before.failures,0);assert.equal(r.after.failures,0);
 assert.equal(r.before.peak,r.after.peak);assert.ok(r.after.peak<=640*1048576);
 const n=BigInt(r.input),d=BigInt(r.extraction.divisor);assert.ok(d>1n&&d<n&&n%d===0n);
 const pair=[d,n/d].sort((a,b)=>a<b?-1:a>b?1:0).map(String);
 const proof={input:r.input,families:r.families,target:r.target,usable:r.usable,packets:r.packets,counters:r.counters,columnBytes:r.columnBytes,columnSha256:r.columnSha256,profile:r.profile,pair};
 assert.equal(r.packets.length,r.families);assert.equal(r.counters.length,r.families);
 r.packets.forEach((p,i)=>{assert.equal(p.family,i);assert.match(p.sha256,/^[a-f0-9]{64}$/);assert.ok(p.bytes>0);});
 const previous=groups.get(r.caseId);if(previous)assert.deepEqual(proof,previous.proof);else groups.set(r.caseId,{proof});
 const phases=r.extraction.phases;assert.ok(phases.length<=16);
 if(r.variant==='candidate'){
  const at=phases.findIndex(p=>p[0]===26);assert.ok(at>0);assert.equal(phases[at-1][0],22);assert.ok(phases[at][1]<phases[at-1][1]);
 }else assert.ok(!phases.some(p=>p[0]===26));
 rows.push({id:t.id,caseId:r.caseId,variant:r.variant,families:r.families,ms:r.requestWallMs,peak:r.after.peak,linear:r.after.linear,phases});
}
const median=a=>{const s=a.slice().sort((a,b)=>a-b);assert.equal(s.length,2);return(s[0]+s[1])/2;};
const decisions=plan.cases.map(c=>{
 const old=rows.filter(r=>r.caseId===c.id&&r.variant==='baseline'),next=rows.filter(r=>r.caseId===c.id&&r.variant==='candidate');
 const peakRatio=median(next.map(r=>r.peak))/median(old.map(r=>r.peak)),timeRatio=median(next.map(r=>r.ms))/median(old.map(r=>r.ms));
 return{caseId:c.id,peakRatio,timeRatio,pass:timeRatio<=plan.adoption.requestRatioMax&&(c.id!=='digits64'||peakRatio<=plan.adoption.digits64PeakRatioMax)};
});
const adopted=decisions.every(d=>d.pass);assert.equal(adopted,false,'Frozen result is a rejected candidate; do not silently change interpretation');
const fmt=(n,d=3)=>n.toFixed(d),percent=n=>fmt((n-1)*100,2)+'%';
const report=`# LLM-01 filter配列早期解放の有限比較

測定head \`${head}\`、Node24.19.0上のNative WASM単体。実Chromeの速度比較ではない。期間${run.startedAt}〜${run.completedAt}（準備・source guard込み${fmt((Date.parse(run.completedAt)-Date.parse(run.startedAt))/1000)}秒）、直列8試行。各child30秒、外枠360秒、Native最大1024MiB・JS heap128MiB、開始WSL available4096MiB以上を固定した。

| 試行 | families | request秒 | 全工程peak requested MiB | linear MiB |
| --- | ---: | ---: | ---: | ---: |
${rows.map(r=>`| ${r.id} | ${r.families} | ${fmt(r.ms/1000)} | ${fmt(r.peak/1048576)} | ${fmt(r.linear/1048576)} |`).join('\n')}

requestはNative生成・収集・抽出を含み、module instantiateと親のsource guardを含まない。各2回の中央値比は以下。メモリは同一最終prefixの全工程peak requestedで、Chrome RSSではない。

| 入力 | peak変化 | request変化 | 事前gate |
| --- | ---: | ---: | --- |
${decisions.map(d=>`| ${d.caseId} | ${percent(d.peakRatio)} | ${percent(d.timeRatio)} | ${d.pass?'成立':'不成立'} |`).join('\n')}

全packet・全counter・最終column bytes/SHA・canonical proper-factor pair・事前profileが同一で、allocation失敗0・全session解放。64桁のmarker22→26でliveは9,014,782→6,033,512 bytes（2.843MiB減）。早期解放自体は動くが、収集中の既存peak12,356,156 bytesが全工程最大のため、全工程peakは変わらない。40桁も全工程peakは同じだった。

64桁の事前条件「全工程peak中央値10%以上削減」を満たさず、不採用。選定Worker・通常入口・Stage38成功artifactへ反映しない。契約どおり追加RSA100長時間試行は0回。RSA100での省メモリ効果がないと証明したわけではなく、その効果は未測定である。全工程時間の有意差も主張しない。

[事前契約](../contracts/matrix-memory.md)、[固定plan](../../bench/staged-matrix-memory-plan.json)、[run原本](staged-matrix-memory-stage39/run.json)、[可逆証跡索引](staged-matrix-memory-stage39/evidence-index.json)。失敗した初回buildと赤→緑の開発logもLLM-01内へ保持した。
`;
const output='docs/benchmarks/llm01-matrix-memory.md';
if(process.argv.includes('--check'))assert.equal(readFileSync(output,'utf8'),report);else writeFileSync(output,report);
console.log(JSON.stringify({adopted,decisions,rows:rows.length,allMathIdentical:true}));

// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {validateGuardManifest} from './source-guard.mjs';
import {historicalHashes} from './git-source-blobs.mjs';
import {validateStreamRecord} from './graph-multicore-proof.mjs';
import {validateCollectionFinal} from '../src/collection-profile/bridge.js';
import {validateCollectionSources,validateCollectionContracts,validateNativeCollection} from './collection-receipt-proof.mjs';
const base='docs/benchmarks/staged-prefix-stage42',sha=b=>createHash('sha256').update(b).digest('hex');
if(process.argv.includes('--pack')){
 const from=process.argv[process.argv.indexOf('--pack')+1];assert.ok(from&&!existsSync(base));
 const items={'run.json':'campaign1-prefix/run.json','driver.log':'campaign1-prefix-driver.log','native.json':'prefix-native-final.json','oracles.json':'prefix-final-oracles.json','contracts-prefix.json':'contracts-prefix-final.json','probe-prefix.json':'prefix-final-oracle.wasm.json'};
 const run=JSON.parse(readFileSync(join(from,items['run.json'])));
 for(const t of run.trials)for(const ext of ['json','log'])items[t.id+'.'+ext]='campaign1-prefix/'+t.id+'.'+ext;
 mkdirSync(base,{recursive:true});const index={encoding:'gzip+canonical-base64-lines76',files:{}};let total=0;
 for(const[name,path]of Object.entries(items)){
  const raw=readFileSync(join(from,path));assert.ok(raw.length<=2097152);
  const packed=gzipSync(raw,{level:9,mtime:0}),text=packed.toString('base64').match(/.{1,76}/g).join('\n')+'\n';total+=Buffer.byteLength(text);
  index.files[name]={file:name+'.gz.base64',originalBytes:raw.length,originalSha256:sha(raw),compressedBytes:packed.length,compressedSha256:sha(packed),encodedBytes:Buffer.byteLength(text)};
  writeFileSync(join(base,name+'.gz.base64'),text,{flag:'wx'});
 }
 assert.ok(total<=4194304);index.totalEncodedBytes=total;writeFileSync(join(base,'evidence-index.json'),JSON.stringify(index,null,2)+'\n',{flag:'wx'});
}
const index=JSON.parse(readFileSync(join(base,'evidence-index.json')));assert.equal(index.encoding,'gzip+canonical-base64-lines76');assert.ok(index.totalEncodedBytes<=4194304);
let total=0;const originals=new Map();
for(const[name,e]of Object.entries(index.files)){
 assert.equal(e.file,name+'.gz.base64');const text=readFileSync(join(base,e.file),'utf8');total+=Buffer.byteLength(text);assert.equal(Buffer.byteLength(text),e.encodedBytes);
 const packed=Buffer.from(text.replaceAll('\n',''),'base64');assert.equal(packed.toString('base64').match(/.{1,76}/g).join('\n')+'\n',text);
 assert.equal(packed.length,e.compressedBytes);assert.equal(sha(packed),e.compressedSha256);
 const raw=gunzipSync(packed,{maxOutputLength:2097152});assert.equal(raw.length,e.originalBytes);assert.equal(sha(raw),e.originalSha256);originals.set(name,raw);
}
assert.equal(total,index.totalEncodedBytes);const json=n=>JSON.parse(originals.get(n));
const run=json('run.json');assert.equal(run.head,'f0f9c788d8afc04fe7ab3d6f21c9094e89ae9f2f');validateGuardManifest(run);
const historical=p=>execFileSync('git',['show',run.head+':'+p],{maxBuffer:16777216});
const planBytes=historical('bench/staged-resieve-prefix-plan.json'),plan=JSON.parse(planBytes);
assert.equal(run.plan,plan.id);assert.equal(run.plan,'llm01-resieve-prefix-stage42');assert.equal(sha(planBytes),run.planSha256);assert.equal(sha(historical('scripts/benchmark-resieve-prefix.mjs')),run.driverSha256);
assert.ok(run.completedAt&&!run.error);assert.ok(Date.parse(run.completedAt)-Date.parse(run.startedAt)<=480000);assert.equal(run.trials.length,4);
const oldBase='docs/benchmarks/staged-wide-window-stage38/completed',oldIndex=JSON.parse(readFileSync(join(oldBase,'evidence-index.json'))),entry=oldIndex.files['wide-1024.json'];
const oldRaw=gunzipSync(Buffer.from(readFileSync(join(oldBase,entry.file),'utf8').replaceAll('\n',''),'base64'),{maxOutputLength:16777216});assert.equal(sha(oldRaw),entry.originalSha256);
const reference=JSON.parse(oldRaw).records[0],rows=[];
function sources(r){
 const paths=[...new Set([...Object.keys(r.sourceFiles??{}),...Object.keys(r.graphSourceFiles??{})])];
 validateCollectionSources(r,historicalHashes(run.head,paths));
}
for(const[i,t]of run.trials.entries()){
 for(const[k,v]of Object.entries(plan.trials[i]))assert.deepEqual(t[k],v);
 assert.equal(t.state,'completed');assert.equal(t.exitCode,0);assert.equal(t.signal,null);assert.ok(t.availableMiB>=4096);
 const bytes=originals.get(t.id+'.json'),log=originals.get(t.id+'.log');assert.equal(sha(bytes),t.sha256);assert.equal(bytes.length,t.bytes);assert.equal(sha(log),t.logSha256);assert.equal(log.length,t.logBytes);
 const r=JSON.parse(bytes);assert.equal(r.measuredHead,run.head);assert.equal(r.graphVariant,t.graph);sources(r);
 assert.deepEqual(r.quiet,{networkRequests:0,httpRequests:0,badEvents:0,assetServerStopped:true,cacheDisabled:true});assert.deepEqual(r.detectorSelfTest,{blockedPageFetchCsp:true,pageCdpAndHttp:true,workerCdpAndHttp:true});
 assert.equal(r.sampledRam.observerFailure,null);assert.ok(r.sampledRam.minAvailableMiB>=4096&&r.sampledRam.peakPssBytes<1536*1048576);
 assert.equal(r.records.length,1);const a=r.records[0],o=a.outcome;validateStreamRecord(a);assert.equal(a.knownFactorsUsed,false);assert.equal(a.resourceStop,null);
 assert.equal(o.workers,1);assert.equal(o.maximumWasmBytes,1073741824);assert.equal(o.fixedFamilies,4);assert.equal(o.familiesSubmitted,4);assert.equal(o.polynomialsSubmitted,8192);
 assert.ok(o.allWorkersDisposed&&o.allWorkerSourcesReleased);assert.deepEqual(o.retirementErrors,[]);assert.ok(o.peakTransportBytes<=64*1048576&&o.creditState.peakOutstanding<=8);
 assert.deepEqual(o.configuration,reference.outcome.configuration);assert.deepEqual(a.familyDigests,reference.familyDigests.filter(d=>d.family<4));assert.equal(a.graphColumns.find(c=>c.family===4).sha256,reference.graphColumns.find(c=>c.family===4).sha256);
 for(let k=1;k<=4;k++)assert.deepEqual(a.progressTimeline.find(p=>p.families===k).collectorStats,reference.progressTimeline.find(p=>p.families===k).collectorStats);
 const d=r.collectionDiagnostics;assert.equal(d.failure,null);assert.equal(d.livePorts,0);assert.equal(d.channels.length,1);const c=d.channels[0];assert.ok(c.closed&&c.terminated);assert.equal(c.failure,null);validateCollectionFinal(c.last,t.graph);assert.equal(c.last.instrumented,false);
 assert.equal(t.summary.requestWallMs,o.requestWallMs);assert.equal(t.summary.peakPssBytes,r.sampledRam.peakPssBytes);
 const artifact=plan.artifacts[t.graph],module=historical(artifact.path).toString(),match=/export const RUSQSIEVE_BASE64=("[^"]+");/.exec(module);assert.ok(match);assert.equal(sha(Buffer.from(JSON.parse(match[1]),'base64')),artifact.sha256);
 rows.push({id:t.id,graph:t.graph,candidate:t.candidate,ms:o.requestWallMs,pss:r.sampledRam.peakPssBytes});
}
const native=json('native.json');validateGuardManifest({head:native.measuredHead,sourceGuard:native.sourceGuard});validateNativeCollection(native,{head:run.head,variants:['baseline','prefix']});
for(const kind of ['baseline','prefix']){
 const module=historical(plan.artifacts[kind].path).toString(),match=/export const RUSQSIEVE_BASE64=("[^"]+");/.exec(module);
 assert.ok(match);assert.equal(sha(Buffer.from(JSON.parse(match[1]),'base64')),native.artifacts[kind]);
}

const oracles=json('oracles.json');assert.equal(oracles.rows.length,1);
for(const row of oracles.rows){
 assert.ok(['prefix'].includes(row.kind));assert.equal(row.cases,446);assert.equal(row.pass,true);
 const bytes=originals.get('probe-'+row.kind+'.json'),r=JSON.parse(bytes);assert.equal(sha(bytes),row.receiptSha256);assert.equal(r.sha256,row.wasmSha256);assert.equal(r.cleanBuilds,1);assert.deepEqual(row.sourceHashes,r.sourceHashes);
 const h=historicalHashes(run.head,Object.keys(r.sourceHashes));for(const[p,v]of Object.entries(r.sourceHashes))assert.equal(h.get(p),v);
}
for(const graph of ['prefix']){const r=json('contracts-'+graph+'.json');validateCollectionContracts(r,{head:run.head,graph});sources(r);}
const median=a=>{assert.equal(a.length,2);return(a[0]+a[1])/2;};
const decisions=['prefix'].map(kind=>{
 const old=rows.filter(r=>r.candidate===kind&&r.graph==='baseline'),next=rows.filter(r=>r.graph===kind),timeRatio=median(next.map(r=>r.ms))/median(old.map(r=>r.ms)),pssRatio=median(next.map(r=>r.pss))/median(old.map(r=>r.pss));
 const d={timeRatio,pssRatio,allPrefixesMatched:true,initialGatePassed:timeRatio<=0.95&&pssRatio<=1.10};assert.deepEqual(run.comparisons[kind],d);assert.equal(d.initialGatePassed,false);return{kind,...d};
});
const fmt=(x,d=3)=>x.toFixed(d),pct=x=>fmt((x-1)*100,2)+'%';
const report=`# LLM-01 resieve prefixループ順の有限比較

固定head \`${run.head}\`。LLM-01 i7-9700K、WSL2 / 実Headless Chrome155、combined Worker 1。
RSA100先頭4family（8192多項式）、ABBA4回。期間${run.startedAt}〜${run.completedAt}。
最大480秒・各90秒＋予備30秒を事前固定。別build/計算との同時負荷はない。

| 試行 | request秒 | Chrome tree PSS MiB |
| --- | ---: | ---: |
${rows.map(r=>`| ${r.id} | ${fmt(r.ms/1000)} | ${fmt(r.pss/1048576)} |`).join('\n')}

時間中央値変化${pct(decisions[0].timeRatio)}、PSS変化${pct(decisions[0].pssRatio)}。
小幅短縮だが5%の初回gateには届かず未採用。差がゼロとは断定しない。
prefixループ順だけをprime外側へ交換し、追加scratch・係数・tail・builtin剰余は変更していない。
一candidateのoverflow後も他candidateの処理を継続する446旧新関数ケース、
Native40/64の全packet・列・counter・proper/canonical因子、実Chrome共通22契約を確認。
時計専用2件は対象外（harness記録は24エントリ）。各2clean build一致、時計importなし。
全4試行のpacket・4family列・各prefix counterはStage38成功原本と一致し、通信0、全退役。

requestは初期化・収集・packet検証・集約を含む。asset準備・親guard・build/CIを含まない。
1Worker2回ずつの中央値から5Workerや全RSA100完了時間を外挿しない。
WASM最大1024MiB、手動1536MiB、slots8、輸送64MiB、credit2、
available>=4096MiB・Chrome PSS<1536MiB、取消/deadlineを維持した。
PSSとWASM requested/linearは別指標。追加RSA100長時間試行は0回。

[事前契約](../contracts/resieve-prefix.md)、[固定plan](../../bench/staged-resieve-prefix-plan.json)、
[可逆原本](staged-prefix-stage42/evidence-index.json)は合計${index.totalEncodedBytes.toLocaleString('en-US')} bytes、上限4MiB。
初期oracleはoverflow後の別candidate処理を直接覆うよう強化し、性能WASM不変で再検査した。
初回receiptもローカル保全。現在は通常入口未反映。改善余地ゼロやmerge条件成立とは扱わない。
次は大きな現行処理score35.81%に対する既存2回展開→4回展開を独立に1候補だけ確認する。
`;

const output='docs/benchmarks/llm01-resieve-prefix.md';
if(process.argv.includes('--check'))assert.equal(readFileSync(output,'utf8'),report);else writeFileSync(output,report);
console.log(JSON.stringify({decisions,trials:rows.length,allPrefixesMatched:true,evidenceBytes:index.totalEncodedBytes}));

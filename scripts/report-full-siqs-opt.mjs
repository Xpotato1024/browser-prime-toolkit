// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Xpotato.net / Xpotato1024
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {resolve,join} from 'node:path';
const root=resolve(import.meta.dirname,'..'),dir='docs/benchmarks/staged-full-opt-stage16',diag='docs/benchmarks/staged-full-diagnostic-stage16',ev='docs/benchmarks/archive/validation-logs/staged-full-opt-stage16';
const read=p=>readFileSync(join(root,p)),json=p=>JSON.parse(read(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const plan=json('bench/staged-full-opt-plan.json'),run=json(dir+'/run-all.json'),manifest=json(ev+'/manifest.json');
assert.equal(run.plan,plan.id);assert.equal(run.planSha256,sha(read('bench/staged-full-opt-plan.json')));
assert.deepEqual(run.trials.map(t=>t.id),plan.trials.map(t=>t.id));assert.equal(plan.trials.length,6);
assert.ok(run.trials.every(t=>t.exitCode===0&&!t.signal&&!t.error));
assert.equal(manifest.measuredHead,run.measuredHead);
for(const[p,h]of Object.entries(manifest.files))assert.equal(sha(read(ev+'/'+p)),h,'Evidence '+p);
function bound(r){
 assert.match(r.measuredHead,/^[a-f0-9]{40}$/);
 for(const[p,h]of Object.entries(r.sourceFiles)){
  assert.equal(sha(read(p)),h,'Current source '+p);
  assert.equal(sha(execFileSync('git',['show',r.measuredHead+':'+p],{cwd:root,maxBuffer:8*1024*1024})),h,'Committed source '+p);
 }
 for(const a of r.initialAssets){assert.ok(!/oracle|manifest/.test(a.path));assert.equal(read(a.path.slice(1)).length,a.bytes);assert.equal(sha(read(a.path.slice(1))),a.sha256);}
 assert.deepEqual(r.quiet,{networkRequests:0,httpRequests:0,badEvents:0,assetServerStopped:true,cacheDisabled:true});
 assert.deepEqual(r.detectorSelfTest,{blockedPageFetchCsp:true,pageCdpAndHttp:true,workerCdpAndHttp:true});
 assert.equal(r.ownership.live,0);assert.equal(r.ownership.maxLive,1);
 assert.equal(r.assetBoundarySelfTest.length,6);assert.ok(r.assetBoundarySelfTest.every(t=>t.status===404));
}
for(const engine of ['base','lto']){
 const r=json(ev+'/browser-'+engine+'-head.json');bound(r);
 assert.equal(r.measuredHead,run.measuredHead);assert.equal(r.variant,engine);
 assert.equal(r.records[0].tests.length,10);assert.ok(r.records[0].tests.every(t=>t.pass));
}
const rows=[];
for(const t of plan.trials){
 const file=dir+'/'+t.id+'.json',r=json(file);bound(r);
 assert.equal(r.mode,'full-siqs-opt-measurement');assert.equal(r.variant,t.engine);assert.equal(r.caseId,t.case);assert.equal(r.seed,t.seed);assert.equal(r.budgetMs,t.budgetMs);assert.equal(r.measuredHead,run.measuredHead);
 assert.equal(r.records.length,1);const rec=r.records[0],o=rec.outcome,s=o.diagnostics;
 assert.equal(o.workers,1);assert.equal(o.wasmBytes,268435456);assert.equal(r.limits.saveCapBytes,16777216);assert.equal(o.allWorkersDisposed,true);
 assert.equal(o.limits.operationBudget,1000000000000);assert.equal(s.nativeMode,0);assert.equal(s.nativeScope,'last-split');assert.equal(s.splitCount,1);
 assert.equal(s.phaseWork.reduce((a,b)=>a+b,0),s.nativeWork);
 assert.equal(s.notifications.periodic,Math.floor(s.nativeWork/s.stride));assert.equal(s.notifications.deliveries,s.notifications.periodic+s.notifications.flush);
 assert.ok(o.requestWallMs<=t.budgetMs+250);assert.equal(rec.knownFactorsUsed,false);
 if(t.stage==='control'){
  assert.equal(rec.oracleCheckedAfterRetirement,true);assert.equal(o.kind,'probable');assert.equal(o.result.remaining,'1');
  assert.ok(s.nnz>0&&s.phaseWork.slice(4).every(n=>n>0));let product=1n;
  for(const f of o.result.factors){const factor=BigInt(f.value??f.factor??f),power=BigInt(f.exponent??1);assert.ok(factor>1n);product*=factor**power;}assert.equal(product,BigInt(rec.input));
 }else{assert.ok(['timeout','incomplete'].includes(o.kind));assert.equal(s.nnz,0);assert.ok(s.phaseWork.slice(4).every(n=>n===0));assert.equal(o.result.factors.length,0);assert.equal(o.result.remaining,rec.input);}
 rows.push({id:t.id,engine:t.engine,case:t.case,budgetMs:t.budgetMs,kind:o.kind,reason:o.reason,requestWallMs:o.requestWallMs,initializationMs:o.initializationMs,computeWallMs:o.computeWallMs,diagnostics:s,sampledRam:r.sampledRam,file,sha256:sha(read(file)),logSha256:sha(read(dir+'/'+t.id+'.log'))});
}
for(const digits of [40,64]){const [a,b]=rows.filter(r=>r.id.startsWith('control-'+digits));assert.equal(a.diagnostics.nativeWork,b.diagnostics.nativeWork);assert.deepEqual(a.diagnostics.phaseWork,b.diagnostics.phaseWork);assert.deepEqual(a.diagnostics.relations,b.diagnostics.relations);}
assert.deepEqual(readdirSync(join(root,dir)).filter(p=>p.endsWith('.json')&&p!=='run-all.json').sort(),plan.trials.map(t=>t.id+'.json').sort());
const d=json(diag+'/rsa100-counts.json'),inv=json(diag+'/invocation.json');bound(d);
assert.equal(d.measuredHead,inv.measuredHead);assert.equal(inv.planSha256,sha(read('bench/staged-full-diagnostic-plan.json')));
const dc=d.records[0].outcome,ds=dc.diagnostics;
assert.equal(dc.reason,'algorithm-resource');assert.equal(ds.reason,3);assert.equal(ds.line,49);
assert.deepEqual(ds.resourceCounters,{sieveBlocks:4000000,basePolynomials:28,derivedPolynomials:111112});
assert.equal(ds.wasmLinearBytes,268435456);assert.equal(ds.saveCapacityBytes,16777216);assert.equal(ds.saveBytes,3228260);
assert.match(read('native/siqs-lab/runtime.c').toString(),/2000000,65536,1000000,4000000/);
assert.equal(ds.nativeWork,rows.find(r=>r.id==='rsa100-600s-lto').diagnostics.nativeWork);
const summary={plan:plan.id,measuredHead:run.measuredHead,rawTrials:6,completeRsa100:false,rows,diagnostic:{head:d.measuredHead,file:diag+'/rsa100-counts.json',sha256:sha(read(diag+'/rsa100-counts.json')),logSha256:sha(read(diag+'/rsa100-counts.log')),requestWallMs:dc.requestWallMs,diagnostics:ds}};
const output=(p,x)=>{const s=typeof x==='string'?x:JSON.stringify(x,null,2)+'\n';if(process.argv.includes('--check'))assert.equal(read(p).toString(),s);else writeFileSync(join(root,p),s);};
output('docs/benchmarks/llm01-full-opt-summary.json',summary);
const fmt=n=>(n/1000).toFixed(3),table=rows.map(r=>`| ${r.id} | ${fmt(r.requestWallMs)} | ${r.kind}/${r.reason??'—'} | ${r.diagnostics.nativeWork} | ${r.diagnostics.relations?.total??'—'} | ${r.diagnostics.nnz} |`).join('\n');
output('docs/benchmarks/llm01-full-opt.md',`# Full SIQS: LTOと監視間隔の実測

固定順序の6試行は、40桁・64桁の完全な因数積検算に成功しました。RSA-100は両条件とも未完了です。64桁では同じnative work・phase別workで20.517秒から14.246秒へ短縮しました。1回ずつの探索測定であり、コンパイラ単独の効果や一般的な速度保証ではありません。

| 試行 | request wall秒 | 結果 | native work | 有効関係式 | 行列nnz |
| --- | ---: | --- | ---: | ---: | ---: |
${table}

計測headは \`${run.measuredHead}\`。baseはstride1024、候補はLTO＋stride16384です。双方1 Worker、固定256MiB WASM、保存容量16MiB、有限1T work、初期化5秒、配送猶予250msを共用します。request wallは初期化・計算・配送・因数検算を含み、CPU時間ではありません。元のStage13の512MiB／保存128MiB条件とは直接の同条件比較ではありません。

RSA-100候補の停止はOOMではありません。独立診断head \`${d.measuredHead}\` で、既存のsieveBlocks上限4,000,000、basePolynomials28、derivedPolynomials111,112を確認しました。停止箇所runtime.c:49、reason3、native work126,787,236,244も一致します。診断は524.143秒、元試行は522.613秒でした。診断を新しい速度比較の反復として扱いません。保存実データ3,228,260 bytesと保存容量16MiB、線形メモリ256MiBは異なる量です。allocator使用量・JSコピー・Chrome全体の瞬間最大RAMは未測定です。

RSA-100 baseは599.753秒で有効487（full478＋cycle9）、partial34,989。候補は有効612（full596＋cycle16）、partial43,176で停止しました。必要数97,743に届かず、両条件ともfilter／Lanczos／平方根段階へ進んでいません。partialを有効関係式へ加算せず、完了時刻を外挿しません。上限引上げを最適化として採用していません。

40／64桁は実際のmode0 full経路でphase4–6と非零nnzを通過し、独立oracleは全Worker退役後に照合しました。結果の素数判定はprobableのままです。Stage14/15のmode2輸入R行証明と同一の検証を行ったという主張はしません。

各測定は初回asset取得後、HTTPサーバ停止・CDP offline・cache無効の条件で通信0、検出器の正例も通過しました。線形メモリ上限はChrome全体RAMの上限ではありません。Chrome155、i7-9700K、WSL2の同一PC上の固定順序で、少数観測・共有ホストの制約があります。

全6 raw/logは[固定試行](staged-full-opt-stage16/run-all.json)、追加診断は[raw](staged-full-diagnostic-stage16/rsa100-counts.json)、契約10件ずつと実際のRED/GREENは[証拠目録](archive/validation-logs/staged-full-opt-stage16/manifest.json)に保存しました。[集計JSON](llm01-full-opt-summary.json)と生成scriptは各raw/logのSHA、計測commitと現在source、phase／通知数、因数積、通信・退役契約を照合します。

最終headのCIはprivate Actions枠の確認待ちで未実行です。公開・release・site統合を行っていません。
`);
console.log('Stage16: 6 trials + resource diagnostic/source/log evidence verified');

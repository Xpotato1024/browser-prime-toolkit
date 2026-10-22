// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {validateGuardManifest} from './source-guard.mjs';
import {historicalHashes} from './git-source-blobs.mjs';
import {validateStreamRecord} from './graph-multicore-proof.mjs';
import {validateWideQuotaTelemetry} from '../src/wide-window/budget.js';
import {validateResourcePlan} from '../src/wide-window/policy.js';
import {assessPrime} from '../src/engine/arithmetic.js';
const base='docs/benchmarks/staged-wide-window-stage38/completed',sha=b=>createHash('sha256').update(b).digest('hex');
const measuredHead='d1e0b865d14b702bd633fd739e05b2d3c772a1c1';
const historical=path=>execFileSync('git',['show',measuredHead+':'+path],{maxBuffer:16777216});
const run=JSON.parse(readFileSync(join(base,'run.json'))),index=JSON.parse(readFileSync(join(base,'evidence-index.json')));
assert.equal(run.head,measuredHead);assert.equal(index.head,measuredHead);validateGuardManifest(run);
assert.equal(run.plan,'llm01-wide-window-stage38');assert.equal(run.nodeVersion,'v24.19.0');assert.ok(run.completedAt&&!run.stoppedAt&&!run.error);
assert.ok(Date.parse(run.completedAt)>Date.parse(run.startedAt));
assert.equal(index.encoding,'gzip+canonical-base64-lines76');
const planBytes=historical('bench/staged-wide-window-plan.json'),plan=JSON.parse(planBytes);
assert.equal(sha(planBytes),run.planSha256);assert.equal(sha(historical('scripts/benchmark-wide-window.mjs')),run.driverSha256);
assert.equal(run.trials.length,2);assert.equal(plan.trials.length,2);
assert.equal(plan.trials.reduce((n,t)=>n+t.budgetMs+120000,0),3870000);assert.equal(plan.limits.totalCampaignMs,3870000);
assert.ok(Date.parse(run.completedAt)-Date.parse(run.startedAt)<=plan.limits.totalCampaignMs);
const ci=JSON.parse(readFileSync(join(base,'ci-before-measure.json')));
assert.equal(ci.headRefOid,measuredHead);assert.equal(ci.isDraft,true);assert.equal(ci.statusCheckRollup.length,36);assert.ok(ci.statusCheckRollup.every(c=>c.conclusion==='SUCCESS'));
function unpack(dir,entries,name,expected,max){
 const e=entries[name];assert.ok(e);assert.equal(e.file,name+'.gz.base64');assert.ok(e.encodedBytes<=2097152);
 const text=readFileSync(join(dir,e.file),'utf8');assert.equal(Buffer.byteLength(text),e.encodedBytes);
 const packed=Buffer.from(text.replaceAll('\n',''),'base64');
 assert.equal(packed.toString('base64').match(/.{1,76}/g).join('\n')+'\n',text);
 assert.equal(packed.length,e.compressedBytes);assert.equal(sha(packed),e.compressedSha256);
 const bytes=gunzipSync(packed,{maxOutputLength:max});assert.equal(bytes.length,e.originalBytes);assert.equal(sha(bytes),e.originalSha256);assert.equal(e.originalSha256,expected);return bytes;
}
assert.deepEqual(Object.keys(index.files).sort(),['contracts-wide.json','contracts-wide.log','wide-1024.json','wide-1024.log']);
const maps=new Map(),rows=[];
for(const [i,row]of run.trials.entries()){
 for(const[k,v]of Object.entries(plan.trials[i]))assert.deepEqual(row[k],v);
 assert.equal(row.state,'completed');assert.equal(row.exitCode,0);assert.ok(row.availableMiB>=8192);
 const wBytes=readFileSync(join(base,row.id+'.windows.json')),w=JSON.parse(wBytes),age=Date.parse(row.startedAt)-Date.parse(w.checkedAt);
 assert.equal(sha(wBytes),row.windowsMemorySha256);assert.deepEqual(w,row.windowsMemory);
 assert.equal(Object.keys(w).sort().join(','),'availableMiB,checkedAt,host,source,totalMiB');
 assert.equal(w.host,'LLM-01');assert.equal(w.source,'Win32_OperatingSystem');assert.ok(w.availableMiB>=8192&&w.totalMiB>=w.availableMiB&&age>=0&&age<=30000);
 const log=unpack(base,index.files,row.id+'.log',row.logSha256,4194304);assert.equal(log.length,row.logBytes);
 const bytes=unpack(base,index.files,row.id+'.json',row.sha256,16777216);assert.equal(bytes.length,row.bytes);const r=JSON.parse(bytes);
 assert.equal(r.measuredHead,measuredHead);assert.equal(r.graphVariant,'wide');assert.equal(r.budgetMs,row.budgetMs);assert.equal(r.variant,row.engine);assert.equal(r.slots,8);assert.equal(r.selectedMemoryMiB,1536);
 assert.deepEqual(r.quiet,{networkRequests:0,httpRequests:0,badEvents:0,assetServerStopped:true,cacheDisabled:true});
 assert.deepEqual(r.detectorSelfTest,{blockedPageFetchCsp:true,pageCdpAndHttp:true,workerCdpAndHttp:true});
 assert.equal(r.ownership.live,0);assert.equal(r.ownership.liveSources,0);assert.ok(r.ownership.maxLive<=5&&r.ownership.maxLiveSources<=5);
 for(const map of [r.sourceFiles,r.graphSourceFiles])for(const[p,h]of Object.entries(map)){if(maps.has(p))assert.equal(maps.get(p),h);maps.set(p,h);}
 for(const a of r.initialAssets)assert.equal(maps.get(a.path.slice(1)),a.sha256);
 assert.equal(r.records.length,1);const record=r.records[0],o=record.outcome,m=r.sampledRam;
 assert.ok(m.samples>0&&m.samples<=8000);assert.equal(m.sampleLimit,8000);assert.equal(m.intervalMs,500);assert.equal(m.observerFailure,null);
 assert.ok(m.minAvailableMiB>=4096&&m.minWindowsAvailableMiB>=4096&&m.maxWindowsReceiptAgeMs<=30000&&m.peakPssBytes<3072*1048576);
 if(!o){assert.equal(record.tests.length,22);assert.ok(record.tests.every(t=>t.pass));}
 else{
  validateStreamRecord(record);validateResourcePlan(o.resourcePlan);assert.equal(record.knownFactorsUsed,false);assert.equal(record.resourceStop,null);
  assert.equal(o.workers,5);assert.equal(o.maximumWasmBytes,1280*1048576);assert.deepEqual(o.resourcePlan.ownerCapsMiB,[1024,64,64,64,64]);
  assert.ok(o.peakTransportBytes<=64*1048576&&o.creditState.peakOutstanding<=8&&record.eventCount<=16416);
  assert.ok(o.familiesSubmitted<=4096&&record.graphSnapshots.length<=512&&record.progressTimeline.length<=4096);
  assert.ok(o.allWorkersDisposed&&o.allWorkerSourcesReleased);assert.deepEqual(o.retirementErrors,[]);
  for(const m of o.memoryByOwner){assert.equal(m.last.allocationFailures,0);assert.ok(m.peakLinearBytes<=o.resourcePlan.ownerCapsMiB[m.owner]*1048576&&m.peakRequestedBytes<=m.peakLinearBytes);}
  assert.equal(o.kind,'probable');assert.equal(o.certainty,'probable');assert.equal(o.remaining,'1');assert.equal(o.reason,null);assert.equal(o.extractionStatus,1);
  assert.equal(o.input,record.input);assert.equal(record.id,'RSA-100');assert.equal(o.input.length,100);assert.equal(BigInt(o.input).toString(2).length,330);
  assert.equal(o.factors.length,2);let product=1n;
  for(const f of o.factors){const n=BigInt(f.value);assert.ok(n>1n&&n<BigInt(o.input)&&BigInt(o.input)%n===0n);assert.equal(f.certainty,'probable');assert.equal(f.method,'independent-mr-fixed7');let ticks=0;assert.equal(assessPrime(n,{tick(){assert.ok(++ticks<=100000);}}),'probable');product*=n;}
  assert.equal(product,BigInt(o.input));assert.ok(o.requestWallMs>0&&o.requestWallMs<=3600000);
  assert.ok(r.ramTimeline.length<=256);
  const q=validateWideQuotaTelemetry(o.nativeQuota);assert.equal(q.extracting,true);assert.equal(q.active,0);assert.equal(q.refusals,0);assert.equal(q.preflightRefused,0);
  assert.deepEqual(q.stages.map(s=>s[0]),[0,1,2,3,4,5,6,7]);assert.ok(q.stages.some(s=>s[1]===116449&&s[2]===117853&&s[3]===8592687));
  assert.ok(record.graphPhases.some(p=>p[0]===4)&&record.graphPhases.some(p=>p[0]===5));
 }
 rows.push({row,r,record,o});
}
const hashes=historicalHashes(measuredHead,[...maps.keys()]);for(const[p,h]of maps)assert.equal(hashes.get(p),h,'Measured historical source '+p);
const result=rows.find(x=>x.row.id==='wide-1024'),{o,record,r}=result;
assert.equal(result.row.commonPrefix572Matched,true);
const oldDir='docs/benchmarks/staged-long-window-stage37/completed',oldRun=JSON.parse(readFileSync(join(oldDir,'run.json'))),oldIndex=JSON.parse(readFileSync(join(oldDir,'evidence-index.json'))),oldRow=oldRun.trials.find(t=>t.id==='long-256');
assert.equal(oldRun.head,'f27dd7caab2f15e25c3191503ba646a8dd5b2344');
const old=JSON.parse(unpack(oldDir,oldIndex.files,'long-256.json',oldRow.sha256,16777216)).records[0];
assert.deepEqual(record.familyDigests.filter(x=>x.family<572).map(x=>[x.family,x.sha256]),old.familyDigests.filter(x=>x.family<572).map(x=>[x.family,x.sha256]));
assert.deepEqual(record.progressTimeline.filter(x=>x.families<=572).map(x=>[x.families,x.collectorStats]),old.progressTimeline.filter(x=>x.families<=572).map(x=>[x.families,x.collectorStats]));
assert.equal(record.graphColumns.find(x=>x.family===128).sha256,old.graphColumns.find(x=>x.family===128).sha256);
const mib=n=>(n/1048576).toFixed(2),seconds=n=>(n/1000).toFixed(3),timings=o.wrapperTimingByOwner[0].timings;
let text='# LLM-01 明示大メモリ枠でのRSA-100実測\n\n';
text+='固定headでRSA-100から2つのproper divisorを返し、独立BigIntの積・割切り検算と固定7基底の素数性検査を通過した。結果は **probable / remaining=1** で、素数証明ではない。1台・1回の実測であり、他端末の速度や完了時間を保証しない。\n\n';
text+='## 固定条件と原本\n\n測定head `'+measuredHead+'`、campaign '+run.startedAt+'〜'+run.completedAt+'。測定前の同head CI36件・573 tests/check・独立レビューを通過した。\n\n';
text+='明示manual1536MiB、co1024＋helper64×4、WASM hardmax合計1280MiB、5 owner、8global枠、transport64MiB、owner credit2。RSA100は最大3600秒の1回だけ実行し、このcampaignの追加試行は行わない。通常600秒・自動設定・選定ESM入口・サイト本番は変更していない。\n\n';
text+='実設定: `'+JSON.stringify(o.configuration)+'`。Native1024は439917bytes、SHA256 `9db5ac2f3d70ae61c6a277ddbfbe6386775f575f29e8c1312298d0be7e269037`、固定source/compilerの2clean build一致。初期memoryは2MiB未満で、巨大割当による空きRAM探索はしていない。\n\n';
text+='## 結果\n\n| 結果 | request秒 | accepted / usable / target | co peak requested / linear MiB | Chrome tree RSS / PSS MiB |\n| --- | ---: | ---: | ---: | ---: |\n';
text+='| '+o.kind+' / remaining='+o.remaining+' | '+seconds(o.requestWallMs)+' | '+o.familiesSubmitted+' / '+o.relations+' / '+o.target+' | '+mib(o.memoryByOwner[0].peakRequestedBytes)+' / '+mib(o.memoryByOwner[0].peakLinearBytes)+' | '+mib(r.sampledRam.peakRssBytes)+' / '+mib(r.sampledRam.peakPssBytes)+' |\n\n';
text+='入力: `'+o.input+'`。\n\n返却因子:\n\n';for(const f of o.factors)text+='- `'+f.value+'`（'+f.certainty+'）\n';
text+='\n既知因子の計算利用はfalse。因子値は計算結果から報告し、engineへ答えを埋め込んでいない。Stage37と共通する572familyの全packet SHA・各prefix counter、prefix128のcolumn SHAが一致した。終了prefixの異なるメモリ量を削減率や速度比にしない。\n\n';
text+='最終counter: `'+JSON.stringify(o.collectorStats)+'`。\n\n';
text+='## 行列・GCDとメモリ\n\nNative抽出status1。抽出前telemetryは116449 rows / 117853 columns / 8592687 nnz、後続telemetryのrow/columnは88561 / 90471となった。段階ごとにnnzの対象が変わるため、異なる段階のnnzを同一行列の減少率に使わない。solver/GCDのphaseと返却因子・積検算を合わせて通し成立を確認した。\n\n';
text+='| Native phase marker | live requested MiB | peak requested MiB | linear MiB |\n| --- | ---: | ---: | ---: |\n';for(const p of record.graphPhases)text+='| '+p[0]+' | '+mib(p[1])+' | '+mib(p[2])+' | '+mib(p[3])+' |\n';
text+='\n抽出quota640MiB／linear事前閾値832MiB。preflight拒否0、quota拒否0、全ownerのallocator失敗0。linearは解放後も縮まらず、co終了liveは'+o.memoryByOwner[0].last.liveRequested+'bytes。requested・linear・WASM hardmax・Chrome RSS/PSSは別指標であり、1280MiBはJS/Node/ブラウザ全体の上限ではない。\n\n';
text+='RAM観測'+r.sampledRam.samples+'件のsummary（500ms間隔、最大8000）。保存時系列は'+r.ramTimeline.length+'点へ間引き、全標本peakを間引き列から再計算した値とは扱わない。最小availableはWSL '+r.sampledRam.minAvailableMiB.toFixed(2)+'MiB／Windows '+r.sampledRam.minWindowsAvailableMiB.toFixed(2)+'MiB、Windows最大鮮度差'+r.sampledRam.maxWindowsReceiptAgeMs+'ms、observerFailure=null。開始8192MiB・実行中4096MiB停止、Chrome PSS3072MiB停止の枠を維持した。OSによるtab強制終了を防げるとは主張しない。\n\n';
text+='## 呼出時間と停止判断\n\ncoordinatorのwrapper計時はsieve '+seconds(timings.sieveMs)+'秒、submit '+seconds(timings.submitMs)+'秒、observe '+seconds(timings.observeMs)+'秒、extract '+seconds(timings.extractMs)+'秒。これは呼出しの経過時間で、OS CPU時間ではない。owner間は並列に重なるため合計を実行時間へ換算しない。Native sieve呼出が中心で、graph観測や集約の削減で大きな改善が得られるという根拠は今回得ていない。\n\n';
text+='採用・不採用の局所候補は[保持・並列・hot path比較](llm01-graph-optimization.md)と[LP map固定対照](llm01-lp-map.md)に保持した。今回でメモリ容量という未解決点を有限枠で検証し、RSA100の収集→行列→GCD→独立検算まで到達した。Native peakはgraph marker22→23、縮約行列構築とfilter配列解放の間に現れ、Native quotaのsolver stage5→6では増えていない。不要filter配列の早期解放が具体的な残候補であり、別plan/headの有限比較でのみ評価する。現時点では全主要候補の枯渇やmerge条件成立とは扱わない。さらなる篩kernel設計やパラメータ再探索は別仮説・別予算とし、追加の巨大メモリや長時間試行を無制限に拡大しない。\n\n';
text+='## 退役・検証と限界\n\n通信0・asset server停止・cache無効、page/Worker検出器の陽性対照、source/HEAD guard、全Worker/source退役、ownership live/source=0を確認した。時間上限/取消/fatal/fresh recoveryは実Workerと22契約で確認し、本試行は正常終了した。大きい保持状態からの明示取消は本試行で実施していない。\n\n';
text+='実機スマホ/Safari/Firefox、サイトReact island/manifest v1受入、本番統合は未実施。選定版600秒でRSA100を完了したという主張ではない。測定headと最終報告headのCI/レビューは分け、最終結果は[PR22](https://github.com/Xpotato1024/browser-prime-toolkit/pull/22)へ記録する。\n\n';
text+='[成功manifest](staged-wide-window-stage38/completed/run.json)、[証跡索引](staged-wide-window-stage38/completed/evidence-index.json)、[測定前CI](staged-wide-window-stage38/completed/ci-before-measure.json)、[事前契約](../contracts/wide-window.md)。原本JSON/logとWindows全immutableサンプルはLLM-01内に保持し、repoは各2MiB以下の可逆gzip/base64とSHAで照合する。\n';
const path='docs/benchmarks/llm01-wide-window.md';if(process.argv.includes('--check'))assert.equal(readFileSync(path,'utf8'),text);else writeFileSync(path,text);
console.log(JSON.stringify({measuredHead,kind:o.kind,wallSeconds:o.requestWallMs/1000,families:o.familiesSubmitted,usable:o.relations,sourceFiles:maps.size,commonPrefix572:true}));

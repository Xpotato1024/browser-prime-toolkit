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
import {validateQuotaTelemetry} from '../src/long-window/budget.js';
const base='docs/benchmarks/staged-long-window-stage37',sha=b=>createHash('sha256').update(b).digest('hex');
const historical=(head,path)=>execFileSync('git',['show',head+':'+path],{maxBuffer:16777216});
function campaign(label,complete){
 const dir=join(base,label),run=JSON.parse(readFileSync(join(dir,'run.json'))),index=JSON.parse(readFileSync(join(dir,'evidence-index.json')));
 assert.equal(index.encoding,'gzip+canonical-base64-lines76');assert.equal(index.head,run.head);validateGuardManifest(run);
 assert.equal(run.plan,'llm01-long-window-stage37');assert.equal(run.nodeVersion,'v24.19.0');
 const planBytes=historical(run.head,'bench/staged-long-window-plan.json'),plan=JSON.parse(planBytes);
 assert.equal(sha(planBytes),run.planSha256);assert.equal(sha(historical(run.head,'scripts/benchmark-long-window.mjs')),run.driverSha256);
 assert.ok(run.trials.length<=4);assert.equal(!!run.completedAt,complete);assert.equal(!!run.stoppedAt,!complete);
 if(complete)assert.equal(run.trials.length,4);else assert.ok(run.error);
 const maps=new Map(),rows=[];
 function unpack(name,expected,max){
  const e=index.files[name];assert.ok(e);assert.equal(e.file,name+'.gz.base64');assert.ok(e.encodedBytes<=2097152);
  const text=readFileSync(join(dir,e.file),'utf8');assert.equal(Buffer.byteLength(text),e.encodedBytes);
  const packed=Buffer.from(text.replaceAll('\n',''),'base64');
  assert.equal(packed.toString('base64').match(/.{1,76}/g).join('\n')+'\n',text);
  assert.equal(packed.length,e.compressedBytes);assert.equal(sha(packed),e.compressedSha256);
  const bytes=gunzipSync(packed,{maxOutputLength:max});assert.equal(bytes.length,e.originalBytes);assert.equal(sha(bytes),e.originalSha256);assert.equal(e.originalSha256,expected);return bytes;
 }
 for(const [i,row]of run.trials.entries()){
  const planned=plan.trials[i];for(const [k,v]of Object.entries(planned))assert.deepEqual(row[k],v);
  assert.ok(row.availableMiB>=4096);const wBytes=readFileSync(join(dir,row.id+'.windows.json')),w=JSON.parse(wBytes);
  assert.equal(sha(wBytes),row.windowsMemorySha256);assert.deepEqual(w,row.windowsMemory);assert.equal(w.host,'LLM-01');assert.equal(w.source,'Win32_OperatingSystem');assert.ok(w.availableMiB>=4096);
  const age=Date.parse(row.startedAt)-Date.parse(w.checkedAt);assert.ok(age>=0&&age<=30000);
  const log=unpack(row.id+'.log',row.logSha256,4194304);assert.equal(log.length,row.logBytes);
  if(row.failureSha256){const b=unpack(row.id+'.json.failed.json',row.failureSha256,16777216);assert.equal(b.length,row.failureBytes);}
  if(row.state!=='completed'){assert.ok(!complete);assert.notEqual(row.exitCode,0);assert.ok(!row.sha256);continue;}
  assert.equal(row.exitCode,0);const bytes=unpack(row.id+'.json',row.sha256,16777216);assert.equal(bytes.length,row.bytes);const receipt=JSON.parse(bytes);
  assert.equal(receipt.measuredHead,run.head);assert.equal(receipt.graphVariant,'long');assert.equal(receipt.budgetMs,row.budgetMs);assert.equal(receipt.variant,row.engine);assert.equal(receipt.slots,row.slots);assert.equal(receipt.selectedMemoryMiB,512);
  assert.deepEqual(receipt.quiet,{networkRequests:0,httpRequests:0,badEvents:0,assetServerStopped:true,cacheDisabled:true});
  assert.deepEqual(receipt.detectorSelfTest,{blockedPageFetchCsp:true,pageCdpAndHttp:true,workerCdpAndHttp:true});
  for(const map of [receipt.sourceFiles,receipt.graphSourceFiles])for(const [p,h]of Object.entries(map)){if(maps.has(p))assert.equal(maps.get(p),h);maps.set(p,h);}
  for(const a of receipt.initialAssets)assert.equal(maps.get(a.path.slice(1)),a.sha256);
  assert.equal(receipt.records.length,1);const record=receipt.records[0],o=record.outcome;
  assert.ok(receipt.sampledRam.samples<=5000);assert.equal(receipt.sampledRam.intervalMs,500);assert.ok(receipt.sampledRam.maxWindowsReceiptAgeMs<=30000);
  if(complete)assert.equal(receipt.sampledRam.observerFailure,null);
  if(!o){assert.equal(record.tests.length,22);assert.ok(record.tests.every(t=>t.pass));}
  else{
   validateStreamRecord(record);assert.equal(record.knownFactorsUsed,false);assert.equal(o.workers,5);assert.equal(o.maximumWasmBytes,512*1048576);assert.deepEqual(o.resourcePlan.ownerCapsMiB,[256,64,64,64,64]);
   assert.ok(o.peakTransportBytes<=64*1048576&&o.creditState.peakOutstanding<=8);assert.ok(o.familiesSubmitted<=4096);assert.ok(record.eventCount<=12288);assert.ok(record.graphSnapshots.length<=512&&record.progressTimeline.length<=4096);
   if(o.nativeQuota)validateQuotaTelemetry(o.nativeQuota);
   if(row.fixedFamilies){assert.equal(o.reason,'fixed-family-bound');assert.equal(o.familiesSubmitted,16);}
   if(row.cancelAfterMs){assert.equal(o.kind,'cancelled');assert.ok(record.cancelRequestedAtMs!==null&&record.cancelToRetirementMs>=0&&record.cancelToRetirementMs<=5000);}
   const old=JSON.parse(readFileSync('docs/benchmarks/staged-lp-map-stage36/2-lpmap.json')).records[0];
   if(o.familiesSubmitted>=16){
    assert.deepEqual(record.familyDigests.filter(x=>x.family<16).map(x=>[x.family,x.sha256]),old.familyDigests.filter(x=>x.family<16).map(x=>[x.family,x.sha256]));
    assert.equal(record.graphColumns.find(x=>x.family===16).sha256,old.graphColumns.find(x=>x.family===16).sha256);
    assert.deepEqual(record.progressTimeline.find(x=>x.families===16).collectorStats,old.progressTimeline.find(x=>x.families===16).collectorStats);
   }
  }
  rows.push({row,receipt,record});
 }
 const hashes=historicalHashes(run.head,[...maps.keys()]);for(const[p,h]of maps)assert.equal(hashes.get(p),h,'Measured historical source '+p);
 assert.equal(plan.trials.reduce((n,t)=>n+t.budgetMs+120000,0),2550000);
 return {run,rows};
}
const failed=campaign('failed-monitor',false),good=campaign('completed',true);
const long=good.rows.find(x=>x.row.id==='long-256'),cancel=good.rows.find(x=>x.row.id==='grown-cancel'),o=long.record.outcome;
const mib=n=>(n/1048576).toFixed(2);
let text='# LLM-01 有限長枠とLP map選定反映\n\n';
text+='選定128/256 roleへLP mapを反映した。Stage36の同一64 family対照でlive要求量8.66%減という採否は維持し、旧baselineは歴史headと元Nativeに固定した。今回の長枠を速度比較や完了時間の推定には使わない。\n\n';
text+='## 固定試行\n\n測定head `'+good.run.head+'`、'+good.run.startedAt+'〜'+good.run.completedAt+'。5 owner、co256＋helper64×4、WASM合計512MiB、global8枠/transport64MiB、family4096、events12288、graph512、progress4096。通常入口の600秒は変更していない。\n\n';
text+='| 試行 | 結果 | accepted / usable / target | request秒 | co last / peak requested / linear MiB | Chrome RSS / PSS MiB |\n| --- | --- | ---: | ---: | --- | --- |\n';
for(const x of good.rows){
 if(!x.record.outcome){text+='| '+x.row.id+' | 22契約成功 | — | — | — | — |\n';continue;}
 const v=x.record.outcome,m=v.memoryByOwner[0].last;
 text+='| '+[x.row.id,v.kind+'/'+(x.record.resourceStop??v.reason),v.familiesSubmitted+' / '+v.relations+' / '+v.target,(v.requestWallMs/1000).toFixed(3),mib(m.liveRequested)+' / '+mib(m.peakRequested)+' / '+mib(m.linearBytes),mib(x.receipt.sampledRam.peakRssBytes)+' / '+mib(x.receipt.sampledRam.peakPssBytes)].join(' | ')+' |\n';
}
text+='\nlong試行の最小availableはWSL '+long.receipt.sampledRam.minAvailableMiB.toFixed(2)+'MiB、Windows '+long.receipt.sampledRam.minWindowsAvailableMiB.toFixed(2)+'MiB。live160MiBは呼出し間のsoft thresholdで、batch途中のpeak requestedとは分ける。WASM256MiBがco roleの厳密上限である。\n';
text+='\n全packet digest・受理prefix・counterを保存し、16 familyのpacket/列/counterはStage36と一致。通信0、検出器自己試験、source/HEAD guard、全Worker/source退役が成立した。120秒後取消から退役まで '+cancel.record.cancelToRetirementMs.toFixed(3)+'ms。requested/linear/Chrome RSS・PSSは別の指標であり、WASM512MiBはJS/転送/ブラウザ全体の上限ではない。\n\n';
text+='## 収集と抽出\n\n最終counter: `'+JSON.stringify(o.collectorStats)+'`。\n\n';
if(o.nativeQuota){text+='抽出quota scalar: `'+JSON.stringify(o.nativeQuota)+'`。段階rowはNative marker・rows/cols/nnz・live/peak/linear・quotaを含む。\n\n';}
else text+='この試行では抽出quota telemetryを受信していない。RSA100の大行列・Block Lanczos・GCD完了を、小さい対照の成功で代替しない。\n\n';
text+='最終結果は '+o.kind+'/'+(long.record.resourceStop??o.reason)+'。usable/targetを全工程進捗や所要時間に換算しない。追加のco1024候補は、この実停止理由とホスト余力を確認して別plan/headでのみ判断する。\n\n';
text+='## 失敗原本と監視修正\n\n最初のhead `'+failed.run.head+'` は22契約とprefix16の後、'+failed.run.stoppedAt+'に監視読取ENOENTで失敗した。Windows置換更新の同時刻にWSL側のcurrent path読取が失敗し、892.8365秒の計算は取消された。旧harnessのmemory.stop例外で終了receiptは残らず、終了時のfamily/メモリ/全退役を成功計測として主張しない。原本log/manifestとWindows98行はローカル保持した。\n\n';
text+='修正版は最大271個のimmutable連番JSONだけを読む。未完成tmpと置換pointerを読まず、欠落・不正・30秒超は停止する。停止要求は独立1000ms期限で囲み、失敗時は所有Chrome群を退役する。監視失敗はobserverFailureと直前までのRAMへ残し、driverは採用しない。1-owner/4096 familyのsnapshot境界もlong専用32呼出samplingで512件以下に収めた。実Chromeの期限切れ負例で取消・全退役・通信0・失敗情報保存を確認した。\n\n';
text+='## 残件\n\n実機スマホ/Safari/Firefox、サイトReact island/manifest v1受入、本番統合は未実施。OSによるタブ強制終了の防止は保証しない。主な採否は[既存改善](llm01-graph-optimization.md)と[LP map対照](llm01-lp-map.md)へ保全し、このDraftだけを理由に改善候補の枯渇やmerge/release条件成立とは扱わない。\n\n';
text+='[成功manifest](staged-long-window-stage37/completed/run.json)、[失敗manifest](staged-long-window-stage37/failed-monitor/run.json)、[契約](../contracts/long-window.md)。原本JSON/logはローカル保持し、repo証跡は各2MiB以下の可逆gzip/base64とSHAで照合する。\n';
const path='docs/benchmarks/llm01-long-window.md';if(process.argv.includes('--check'))assert.equal(readFileSync(path,'utf8'),text);else writeFileSync(path,text);
console.log(JSON.stringify({measuredHead:good.run.head,kind:o.kind,reason:o.reason,families:o.familiesSubmitted,usable:o.relations,target:o.target,cancelMs:cancel.record.cancelToRetirementMs}));

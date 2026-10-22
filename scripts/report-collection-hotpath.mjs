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
import {COLLECTION_PHASES} from '../src/collection-profile/phases.js';
const base='docs/benchmarks/staged-collection-stage40',sha=b=>createHash('sha256').update(b).digest('hex');
if(process.argv.includes('--pack')){
 const from=process.argv[process.argv.indexOf('--pack')+1];assert.ok(from&&!existsSync(base));
 const items={
  'profile-run.json':'campaign2-profile/run.json','hotpath-run.json':'campaign3-hotpath/run.json',
  'negative-driver-run.json':'campaign1-profile/run.json','negative-driver.log':'campaign1-profile-driver.log',
  'negative-import.log':'contracts-instrumented-1.log',
  'native-profile.json':'native-equality-fixed.json','native-hotpath.json':'hotpath-native-fixed.json',
  'oracles.json':'hotpath-oracles.json',
  'contracts-instrumented.json':'contracts-instrumented-2.json','contracts-resieve4.json':'contracts-resieve4-1.json','contracts-sparse.json':'contracts-sparse-1.json'
 };
 for(const [prefix,dir]of [['profile','campaign2-profile'],['hotpath','campaign3-hotpath']]){
  const run=JSON.parse(readFileSync(join(from,dir,'run.json')));
  for(const t of run.trials)for(const ext of ['json','log'])items[prefix+'-'+t.id+'.'+ext]=dir+'/'+t.id+'.'+ext;
 }
 mkdirSync(base,{recursive:true});const index={encoding:'gzip+canonical-base64-lines76',files:{}};let total=0;
 for(const [name,path]of Object.entries(items)){
  const raw=readFileSync(join(from,path));assert.ok(raw.length<=2097152);
  const packed=gzipSync(raw,{level:9,mtime:0}),text=packed.toString('base64').match(/.{1,76}/g).join('\n')+'\n';total+=Buffer.byteLength(text);
  index.files[name]={file:name+'.gz.base64',originalBytes:raw.length,originalSha256:sha(raw),compressedBytes:packed.length,compressedSha256:sha(packed),encodedBytes:Buffer.byteLength(text)};
  writeFileSync(join(base,name+'.gz.base64'),text,{flag:'wx'});
 }
 assert.ok(total<=4194304);index.totalEncodedBytes=total;writeFileSync(join(base,'evidence-index.json'),JSON.stringify(index,null,2)+'\n',{flag:'wx'});
}
const index=JSON.parse(readFileSync(join(base,'evidence-index.json')));assert.equal(index.encoding,'gzip+canonical-base64-lines76');assert.ok(index.totalEncodedBytes<=4194304);
let encodedTotal=0;
function unpack(name){
 const e=index.files[name];assert.equal(e.file,name+'.gz.base64');const text=readFileSync(join(base,e.file),'utf8');encodedTotal+=Buffer.byteLength(text);
 assert.equal(Buffer.byteLength(text),e.encodedBytes);const packed=Buffer.from(text.replaceAll('\n',''),'base64');
 assert.equal(packed.toString('base64').match(/.{1,76}/g).join('\n')+'\n',text);assert.equal(packed.length,e.compressedBytes);assert.equal(sha(packed),e.compressedSha256);
 const raw=gunzipSync(packed,{maxOutputLength:2097152});assert.equal(raw.length,e.originalBytes);assert.equal(sha(raw),e.originalSha256);return raw;
}
const originals=new Map(Object.keys(index.files).map(k=>[k,unpack(k)]));assert.equal(encodedTotal,index.totalEncodedBytes);
const json=k=>JSON.parse(originals.get(k)),historical=(head,p)=>execFileSync('git',['show',head+':'+p],{maxBuffer:16777216});
const oldBase='docs/benchmarks/staged-wide-window-stage38/completed',oldRun=JSON.parse(readFileSync(join(oldBase,'run.json'))),oldIndex=JSON.parse(readFileSync(join(oldBase,'evidence-index.json'))),oe=oldIndex.files['wide-1024.json'];
const oldRaw=gunzipSync(Buffer.from(readFileSync(join(oldBase,oe.file),'utf8').replaceAll('\n',''),'base64'),{maxOutputLength:16777216});assert.equal(sha(oldRaw),oe.originalSha256);
const old=JSON.parse(oldRaw).records[0],profile=json('profile-run.json'),hotpath=json('hotpath-run.json'),all=[];
for(const [prefix,run]of [['profile',profile],['hotpath',hotpath]]){
 validateGuardManifest(run);assert.ok(run.completedAt&&!run.error);
 const planBytes=historical(run.head,prefix==='profile'?'bench/staged-collection-profile-plan.json':'bench/staged-collection-hotpath-plan.json'),plan=JSON.parse(planBytes);
 assert.equal(sha(planBytes),run.planSha256);assert.equal(sha(historical(run.head,prefix==='profile'?'scripts/benchmark-collection-profile.mjs':'scripts/benchmark-collection-hotpath.mjs')),run.driverSha256);
 assert.ok(Date.parse(run.completedAt)-Date.parse(run.startedAt)<=plan.limits.totalCampaignMs);assert.equal(run.trials.length,plan.trials.length);
 for(const [i,t]of run.trials.entries()){
  for(const[k,v]of Object.entries(plan.trials[i]))assert.deepEqual(t[k],v);
  assert.equal(t.state,'completed');assert.equal(t.exitCode,0);assert.equal(t.signal,null);assert.ok(t.availableMiB>=4096);
  const bytes=originals.get(prefix+'-'+t.id+'.json'),log=originals.get(prefix+'-'+t.id+'.log');
  assert.equal(sha(bytes),t.sha256);assert.equal(bytes.length,t.bytes);assert.equal(sha(log),t.logSha256);assert.equal(log.length,t.logBytes);
  const r=JSON.parse(bytes);assert.equal(r.measuredHead,run.head);assert.equal(r.graphVariant,t.graph);assert.equal(r.records.length,1);
  const paths=[...new Set([...Object.keys(r.sourceFiles??{}),...Object.keys(r.graphSourceFiles??{})])],hashes=historicalHashes(run.head,paths);
  validateCollectionSources(r,hashes);
  assert.deepEqual(r.quiet,{networkRequests:0,httpRequests:0,badEvents:0,assetServerStopped:true,cacheDisabled:true});
  assert.deepEqual(r.detectorSelfTest,{blockedPageFetchCsp:true,pageCdpAndHttp:true,workerCdpAndHttp:true});
  assert.equal(r.sampledRam.observerFailure,null);assert.ok(r.sampledRam.minAvailableMiB>=4096&&r.sampledRam.peakPssBytes<1536*1048576);
  const a=r.records[0],o=a.outcome;validateStreamRecord(a);assert.equal(a.knownFactorsUsed,false);assert.equal(a.resourceStop,null);
  assert.equal(o.workers,1);assert.equal(o.fixedFamilies,4);assert.equal(o.familiesSubmitted,4);assert.equal(o.polynomialsSubmitted,8192);
  assert.ok(o.allWorkersDisposed&&o.allWorkerSourcesReleased);assert.deepEqual(o.retirementErrors,[]);
  assert.deepEqual(o.configuration,old.outcome.configuration);
  assert.deepEqual(a.familyDigests,old.familyDigests.filter(d=>d.family<4));
  assert.equal(a.graphColumns.find(x=>x.family===4).sha256,old.graphColumns.find(x=>x.family===4).sha256);
  for(let k=1;k<=4;k++)assert.deepEqual(a.progressTimeline.find(x=>x.families===k).collectorStats,old.progressTimeline.find(x=>x.families===k).collectorStats);
  const d=r.collectionDiagnostics;assert.equal(d.failure,null);assert.equal(d.livePorts,0);assert.equal(d.channels.length,1);
  assert.ok(d.channels[0].closed&&d.channels[0].terminated);assert.equal(d.channels[0].failure,null);validateCollectionFinal(d.channels[0].last,t.graph);
  assert.equal(t.summary.requestWallMs,o.requestWallMs);assert.equal(t.summary.peakPssBytes,r.sampledRam.peakPssBytes);
  all.push({prefix,id:t.id,graph:t.graph,candidate:t.candidate,ms:o.requestWallMs,pss:r.sampledRam.peakPssBytes,frame:d.channels[0].last});
 }
}
const median=a=>{assert.equal(a.length,2);return(a[0]+a[1])/2;};
const p=all.filter(r=>r.prefix==='profile'),pi=p.filter(r=>r.graph==='instrumented'),pb=p.filter(r=>r.graph==='baseline'),overhead=median(pi.map(r=>r.ms))/median(pb.map(r=>r.ms));
assert.equal(profile.diagnosticOverheadRatio,overhead);assert.equal(profile.diagnosticGatePassed,overhead<=1.10);assert.ok(profile.diagnosticGatePassed);
const phase=COLLECTION_PHASES.map((label,i)=>({label,ms:median(pi.map(r=>r.frame.rows[i][1])),count:pi[0].frame.rows[i][2]})),wall=median(pi.map(r=>r.ms));
const decisions=['resieve4','sparse'].map(kind=>{
 const a=all.filter(r=>r.candidate===kind),old=a.filter(r=>r.graph==='baseline'),next=a.filter(r=>r.graph===kind);
 const timeRatio=median(next.map(r=>r.ms))/median(old.map(r=>r.ms)),pssRatio=median(next.map(r=>r.pss))/median(old.map(r=>r.pss));
 const d={timeRatio,pssRatio,allPrefixesMatched:true,initialGatePassed:timeRatio<=0.95&&pssRatio<=1.10};assert.deepEqual(hotpath.comparisons[kind],d);return{kind,...d};
});
for(const[name,head,variants]of [
 ['native-profile.json','8ea62fd90f678afed933f7eef2fda746a9504076',['baseline','instrumented']],
 ['native-hotpath.json',hotpath.head,['baseline','resieve4','sparse']]
]){
 const r=json(name);validateGuardManifest({head:r.measuredHead,sourceGuard:r.sourceGuard});
 validateNativeCollection(r,{head,variants});
}
const oracles=json('oracles.json');assert.equal(oracles.rows.length,2);assert.ok(oracles.rows.every(r=>r.cases===435&&r.pass));
for(const kind of ['instrumented','resieve4','sparse']){
 const r=json('contracts-'+kind+'.json'),head=kind==='instrumented'?'367b14f2be86cc27b2b1afd018e863b244c9fca2':hotpath.head;
 validateCollectionContracts(r,{head,graph:kind});
 const paths=[...new Set([...Object.keys(r.sourceFiles??{}),...Object.keys(r.graphSourceFiles??{})])];
 validateCollectionSources(r,historicalHashes(head,paths));
}
const fmt=(n,d=3)=>n.toFixed(d),pct=n=>fmt((n-1)*100,2)+'%';
const report=`# LLM-01 現行の関係式収集profileと有限改善比較

固定診断head \`${profile.head}\`、候補head \`${hotpath.head}\`。LLM-01 i7-9700K、WSL2 / 実Headless Chrome155、申告6論理CPU・deviceMemory8。combined Worker 1、RSA-100先頭4family（8192多項式）を同じ順で処理した。5Worker・37分成功時の全工程CPU比率ではない。

診断は${profile.startedAt}〜${profile.completedAt}、baseline / instrumented / instrumented / baseline。
計測版の時間比${fmt(overhead,6)}（${pct(overhead)}）は事前10%以内。
時計importのみの別artifactで数学を変えず、時計394,760回・深さ2、異常0、実測最小step約0.1ms。
短いphaseの割合は時計の量子化・観測費用の影響を受ける。exclusiveは重複しない経過時間で、CPU sampleではない。

| phase | exclusive秒（2回平均） | request比 | calls/試行 |
| --- | ---: | ---: | ---: |
${phase.map(r=>`| ${r.label} | ${fmt(r.ms/1000)} | ${fmt(r.ms/wall*100,2)}% | ${r.count} |`).join('\n')}
| 未分類（JS/転送/待ち等を含む） | ${fmt((wall-phase.reduce((s,r)=>s+r.ms,0))/1000)} | ${fmt((wall-phase.reduce((s,r)=>s+r.ms,0))/wall*100,2)}% | — |

resieveとscore加算を優先し、A選択・候補走査・根更新だけで全体の大幅短縮を期待しない。
既存SIMDは上流由来。resieveには候補の因子回収が含まれ、関係式収集を純粋なふるい加算と同一視しない。

候補は別々の時計なしartifact。upstream commit・compiler・SIMD・memory capを固定、engine.rsだけ変更し2clean一致。
resieve4はcandidate-major/prime-major境界2→4、sparseは範囲外rootへのsentinel書込み省略。
各候補ABBA4回、各90秒＋退役予備、合計最大960秒。実行期間${hotpath.startedAt}〜${hotpath.completedAt}。
各requestはNative初期化・収集・packet検証・集約を含み、ページasset準備・親guard・ビルド・CIは含まない。

| 試行 | request秒 | Chrome tree PSS MiB |
| --- | ---: | ---: |
${all.map(r=>`| ${r.prefix}/${r.id} | ${fmt(r.ms/1000)} | ${fmt(r.pss/1048576)} |`).join('\n')}

| 独立候補 | 時間変化（中央値） | PSS変化（中央値） | 初回gate |
| --- | ---: | ---: | --- |
${decisions.map(d=>`| ${d.kind} | ${pct(d.timeRatio)} | ${pct(d.pssRatio)} | ${d.initialGatePassed?'成立・別prefixで再確認が必要':'不成立・不採用'} |`).join('\n')}

全12試行でpacket・4family列・各prefix counterがStage38成功原本と一致。
別probeは旧実関数と新実関数435ケースずつ（870）一致、probe exportは性能artifactから除外。
Native40/64全工程のpacket・列・counter・canonical因子も同一。実Chrome24契約は計測版と両候補で成功。
通信検出の正対照を維持し、asset取得後の計算中通信0、全Worker/source/port退役、RAM observer異常0だった。
PSSはWASM requested/linear hardcapと別指標。手動1536MiB・Native最大1024MiB・輸送64MiB・8slots・available4096MiBの有限制限を維持した。

計算前のclock import guard拒否と、基準計算終了後のdriver変数衝突はharness不具合として修正し原本保存。
初期oracleの型不一致と非整列synthetic rootによるtrapもローカルへ保持し、正規化root条件へ修正した。
不成功を方式不採用の速度根拠にしていない。旧filter早期解放の不採用、u32剰余-9.27%採用、
resieve skip-0.29%／dense16+4.85%不採用は別対照の結果であり、改善率を掛け合わせない。

この小規模比較からRSA-100の全工程時間を外挿しない。新しい長時間RSA試行はここでは0回。
改善枯渇・merge条件成立とは扱わず、成立候補の再現確認と、残るhotpath候補を費用対効果で判断する。

[事前契約](../contracts/collection-profile.md)、[候補契約](../contracts/collection-candidates.md)、
[固定plan](../../bench/staged-collection-hotpath-plan.json)、[可逆原本索引](staged-collection-stage40/evidence-index.json)。
証跡はgzip+base64可逆形式、合計${index.totalEncodedBytes.toLocaleString('en-US')} bytes（上限4MiB）。stdoutと負の原本もLLM-01内に保持する。
`;
const output='docs/benchmarks/llm01-collection-hotpath.md';
if(process.argv.includes('--check'))assert.equal(readFileSync(output,'utf8'),report);else writeFileSync(output,report);
console.log(JSON.stringify({overhead,decisions,phasePercent:phase.map(r=>[r.label,r.ms/wall*100]),trials:all.length,evidenceBytes:index.totalEncodedBytes}));

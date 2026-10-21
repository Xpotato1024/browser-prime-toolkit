// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {validateGuardManifest} from './source-guard.mjs';
import {historicalHashes} from './git-source-blobs.mjs';
import {validateStreamRecord} from './graph-multicore-proof.mjs';
import {validateCollectionFinal} from '../src/collection-profile/bridge.js';
import {validateCollectionSources,validateCollectionContracts,validateNativeCollection} from './collection-receipt-proof.mjs';
import {analyzeRepeat,REPEAT_GATES} from './hotpath-repeat-stats.mjs';
const base='docs/benchmarks/staged-hotpath-repeat-stage44',measuredHead='b45b554df737646cc2731e9e69979d6e85cebbb8';
const sha=b=>createHash('sha256').update(b).digest('hex'),cache=new Map();
const historical=(head,p)=>{const k=head+':'+p;if(!cache.has(k))cache.set(k,execFileSync('git',['show',k],{maxBuffer:16777216}));return cache.get(k);};
if(process.argv.includes('--pack')){
 const from=process.argv[process.argv.indexOf('--pack')+1];assert.ok(from&&!existsSync(base));
 const items={'run.json':'campaign2-repeat/run.json','driver.log':'campaign2-repeat-driver.log','setup-run.json':'campaign1-repeat/run.json','setup-log.txt':'campaign1-repeat/b01-s1-baseline.log','setup-driver.log':'campaign1-repeat-driver.log','stats-red.log':'stats-red.log','stats-green.log':'stats-revision.log'};
 const run=JSON.parse(readFileSync(join(from,items['run.json'])));
 for(const t of run.trials)for(const ext of ['json','log'])items[t.id+'.'+ext]='campaign2-repeat/'+t.id+'.'+ext;
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
const run=json('run.json');assert.equal(run.head,measuredHead);validateGuardManifest(run);assert.equal(run.nodeVersion,'v24.19.0');
const planBytes=historical(run.head,'bench/staged-hotpath-repeat-plan.json'),plan=JSON.parse(planBytes);
assert.equal(run.plan,plan.id);assert.equal(plan.id,'llm01-hotpath-repeat-stage44');assert.equal(sha(planBytes),run.planSha256);
assert.equal(sha(historical(run.head,'scripts/benchmark-hotpath-repeat.mjs')),run.driverSha256);
assert.equal(sha(readFileSync('scripts/hotpath-repeat-stats.mjs')),sha(historical(run.head,'scripts/hotpath-repeat-stats.mjs')),'No post-data gate/statistics change');
assert.deepEqual(plan.gates,REPEAT_GATES);
assert.ok(run.completedAt&&!run.error);assert.ok(Date.parse(run.completedAt)-Date.parse(run.startedAt)<=2880000);assert.equal(run.trials.length,32);
assert.match(run.environment.chromeVersion,/155\./);assert.equal(run.environment.logicalCpu,6);assert.equal(run.environment.platform,'linux');assert.equal(run.environment.arch,'x64');
const setup=json('setup-run.json'),correction=plan.preMeasurementCorrection;
assert.equal(setup.head,correction.head);validateGuardManifest(setup);
assert.equal(sha(originals.get('setup-run.json')),correction.runSha256);assert.equal(sha(originals.get('setup-log.txt')),correction.logSha256);
assert.equal(setup.trials.length,1);assert.equal(setup.trials[0].exitCode,1);assert.equal(setup.trials[0].state,'failed');
assert.ok(!('summary'in setup.trials[0])&&!('bytes'in setup.trials[0])&&!('failureBytes'in setup.trials[0]));
assert.match(originals.get('setup-log.txt').toString(),/60000 !== 90000/);
const setupPlan=historical(setup.head,'bench/staged-hotpath-repeat-plan.json');
assert.equal(sha(setupPlan),setup.planSha256);assert.equal(JSON.parse(setupPlan).trials[0].budgetMs,60000);
assert.equal(sha(historical(setup.head,'scripts/benchmark-hotpath-repeat.mjs')),setup.driverSha256);
const setupVerifier=historical(setup.head,'scripts/verify-resieve-followup.mjs').toString();
assert.ok(setupVerifier.indexOf('assert.equal(budgetMs,90000);')<setupVerifier.indexOf('const temporary = await mkdtemp'));
assert.equal(correction.nativeFamilies,0);assert.equal(correction.browserStarted,false);
assert.match(originals.get('stats-red.log').toString(),/ERR_MODULE_NOT_FOUND/);
assert.match(originals.get('stats-green.log').toString(),/pass 7/);
const oldBase='docs/benchmarks/staged-wide-window-stage38/completed';
const oldRun=JSON.parse(historical(run.head,oldBase+'/run.json'));assert.equal(oldRun.head,plan.successfulReferenceHead);
const oldIndex=JSON.parse(historical(run.head,oldBase+'/evidence-index.json')),entry=oldIndex.files['wide-1024.json'];
const oldPacked=Buffer.from(historical(run.head,oldBase+'/'+entry.file).toString().replaceAll('\n',''),'base64');
assert.equal(sha(oldPacked),entry.compressedSha256);
const oldRaw=gunzipSync(oldPacked,{maxOutputLength:16777216});assert.equal(sha(oldRaw),entry.originalSha256);
const reference=JSON.parse(oldRaw).records[0],receipts=run.trials.map(t=>json(t.id+'.json')),rows=[];
const paths=[...new Set(receipts.flatMap(r=>[...Object.keys(r.sourceFiles??{}),...Object.keys(r.graphSourceFiles??{})]))],hashes=historicalHashes(run.head,paths);
const nativeHashes=Object.fromEntries(Object.entries(plan.artifacts).map(([k,a])=>{
 const match=/export const RUSQSIEVE_BASE64=("[^"]+");/.exec(historical(run.head,a.path).toString());assert.ok(match);
 const h=sha(Buffer.from(JSON.parse(match[1]),'base64'));assert.equal(h,a.sha256);return[k,h];
}));
for(const[i,t]of run.trials.entries()){
 for(const[k,v]of Object.entries(plan.trials[i]))assert.deepEqual(t[k],v);
 assert.equal(t.state,'completed');assert.equal(t.exitCode,0);assert.equal(t.signal,null);assert.ok(t.availableMiB>=4096);
 const bytes=originals.get(t.id+'.json'),log=originals.get(t.id+'.log');assert.equal(sha(bytes),t.sha256);assert.equal(bytes.length,t.bytes);assert.equal(sha(log),t.logSha256);assert.equal(log.length,t.logBytes);
 const r=receipts[i];assert.equal(r.measuredHead,run.head);assert.equal(r.graphVariant,t.graph);validateCollectionSources(r,hashes);
 assert.deepEqual(r.quiet,{networkRequests:0,httpRequests:0,badEvents:0,assetServerStopped:true,cacheDisabled:true});
 assert.deepEqual(r.detectorSelfTest,{blockedPageFetchCsp:true,pageCdpAndHttp:true,workerCdpAndHttp:true});
 assert.equal(r.sampledRam.observerFailure,null);assert.ok(r.sampledRam.minAvailableMiB>=4096&&r.sampledRam.peakPssBytes<1536*1048576);
 assert.equal(r.records.length,1);const a=r.records[0],o=a.outcome;validateStreamRecord(a);assert.equal(a.knownFactorsUsed,false);assert.equal(a.resourceStop,null);
 assert.equal(o.workers,1);assert.equal(o.maximumWasmBytes,1073741824);assert.equal(o.fixedFamilies,4);assert.equal(o.familiesSubmitted,4);assert.equal(o.polynomialsSubmitted,8192);
 assert.ok(o.allWorkersDisposed&&o.allWorkerSourcesReleased);assert.deepEqual(o.retirementErrors,[]);assert.ok(o.peakTransportBytes<=64*1048576&&o.creditState.peakOutstanding<=8);
 assert.deepEqual(o.configuration,reference.outcome.configuration);assert.deepEqual(a.familyDigests,reference.familyDigests.filter(d=>d.family<4));
 assert.equal(a.graphColumns.find(c=>c.family===4).sha256,reference.graphColumns.find(c=>c.family===4).sha256);
 for(let k=1;k<=4;k++)assert.deepEqual(a.progressTimeline.find(p=>p.families===k).collectorStats,reference.progressTimeline.find(p=>p.families===k).collectorStats);
 const d=r.collectionDiagnostics;assert.equal(d.failure,null);assert.equal(d.livePorts,0);assert.equal(d.channels.length,1);
 const c=d.channels[0];assert.ok(c.closed&&c.terminated);assert.equal(c.failure,null);validateCollectionFinal(c.last,t.graph);assert.equal(c.last.instrumented,false);
 assert.equal(t.summary.requestWallMs,o.requestWallMs);assert.equal(t.summary.peakPssBytes,r.sampledRam.peakPssBytes);assert.equal(t.summary.referencePrefix4Matched,true);
 rows.push({id:t.id,block:t.block,order:t.order,graph:t.graph,ms:o.requestWallMs,pss:r.sampledRam.peakPssBytes});
}
function reusedRaw(reuse,key){
 const indexBytes=historical(run.head,reuse.index);assert.equal(sha(indexBytes),reuse.indexSha256);
 const idx=JSON.parse(indexBytes),e=idx.files[key];assert.equal(e.originalSha256,reuse.entries[key]);
 const packed=Buffer.from(historical(run.head,dirname(reuse.index)+'/'+e.file).toString().replaceAll('\n',''),'base64');
 assert.equal(sha(packed),e.compressedSha256);const raw=gunzipSync(packed,{maxOutputLength:2097152});assert.equal(sha(raw),e.originalSha256);return JSON.parse(raw);
}
for(const[k,reuse]of Object.entries(plan.reusedValidation)){
 const native=reusedRaw(reuse,'native.json'),variants=k==='resieve1'?['baseline','resieve1','rank']:['baseline','prefix'];
 validateGuardManifest({head:native.measuredHead,sourceGuard:native.sourceGuard});validateNativeCollection(native,{head:reuse.head,variants});
 assert.equal(native.artifacts.baseline,nativeHashes.baseline);assert.equal(native.artifacts[k],nativeHashes[k]);
 const r=reusedRaw(reuse,'contracts-'+k+'.json');validateCollectionContracts(r,{head:reuse.head,graph:k});
 validateCollectionSources(r,historicalHashes(reuse.head,[...new Set([...Object.keys(r.sourceFiles),...Object.keys(r.graphSourceFiles)])]));
 const oracle=reusedRaw(reuse,'oracles.json').rows.find(x=>x.kind===k);assert.ok(oracle?.pass);assert.equal(oracle.cases,k==='resieve1'?443:446);
}
const analysis=analyzeRepeat(plan,run.trials);assert.deepEqual(run.analysis,analysis);
const fmt=(x,d=3)=>x.toFixed(d),pct=x=>fmt((x-1)*100,2)+'%',sec=a=>a.map(x=>fmt(x/1000,4)).join('/');
const results=analysis.results,blockRows=Object.entries(results).flatMap(([kind,r])=>r.blocks.map(b=>({kind,...b}))).sort((a,b)=>a.id-b.id);
const lines=['# 小幅改善2候補の均衡反復比較','',
'固定head '+run.head+'。LLM-01 i7-9700K / WSL2 / '+run.environment.chromeVersion+'、Node24.19.0、1 combined Worker。',
'RSA100先頭4family（8192多項式）、各候補ABBA/BAABを各2回、計8ブロック32試行。',
'期間 '+run.startedAt+' 〜 '+run.completedAt+'。全体48分、各90秒・child112秒・退役予備込み120秒を事前固定。',
'旧探索の2点ずつを今回の推定へ混ぜず、入力・artifact・実行順を途中で変更しなかった。別build/性能試験との並行負荷はない。','',
'| 候補 | 幾何平均の時間変化 | 参考上側変化 | PSS変化 | arm内CV A/B | 改善ブロック | 事前条件 |',
'| --- | ---: | ---: | ---: | --- | ---: | --- |',
...Object.entries(results).map(([k,r])=>'| '+k+' | '+pct(r.timeRatio)+' | '+pct(r.referenceUpper)+' | '+pct(r.pssRatio)+' | '+fmt(r.baseline.sampleCvPct,2)+'%/'+fmt(r.candidate.sampleCvPct,2)+'% | '+r.fasterBlocks+'/4 | '+(r.eligible?'費用評価へ':'未達・未採用')+' |'),
'',
'| ブロック | 候補 | 順序 | A1/A2秒 | B1/B2秒 | 時間変化 | PSS変化 |',
'| --- | --- | --- | --- | --- | ---: | ---: |',
...blockRows.map(b=>'| '+b.id+' | '+b.kind+' | '+b.order+' | '+sec(b.baselineMs)+' | '+sec(b.candidateMs)+' | '+pct(b.timeRatio)+' | '+pct(b.pssRatio)+' |'),
'',
'| 候補 | ABBA変化 | BAAB変化 | 最小効果 / 上側参考 / 両順序 / 3of4 / PSS |',
'| --- | ---: | ---: | --- |',
...Object.entries(results).map(([k,r])=>'| '+k+' | '+pct(r.orientationRatios.ABBA)+' | '+pct(r.orientationRatios.BAAB)+' | '+Object.values(r.passes).map(x=>x?'合格':'未達').join(' / ')+' |'),
'',
'選定規則による候補: '+(analysis.selection??'なし')+'。これは費用評価へ進む候補の選定で、通常入口への反映を自動で宣言するものではない。',
'今回は0.5%以上の時間改善・参考上側比<1・両順序<1・3/4ブロック改善・PSS比<=1.02を事前固定した。',
'旧5%も今回0.5%も工学的な判断幅であり、ユーザーが小改善を不要と指定したものではない。',
'上側t参考値は4ブロックlog比・df3、各候補上側97.5%相当（2候補の多重比較を考慮）だが、独立性・正規近似を仮定する。',
'ABBA/BAABで線形driftを緩和しても、非線形変動・背景負荷・自己相関・順序の影響を完全には識別できず、真の信頼水準や因果的速度優位を保証しない。',
'PSSとWASM requested/linear、Chrome RSSは別指標。今回のrequestは初期化・収集・packet検証・集約を含み、asset準備・親guard・build/CIは含まない。','',
'全32試行でpacket・4family列・prefix counterはStage38成功原本と一致。通信0、全Worker/source/port退役、資源停止なし。',
'既存の2clean artifact・Native40/64・旧新oracle443/446・各共通22Chrome契約をhash指定で再利用した。時計専用2件は対象外（記録は各24エントリ）。',
'Native最大1024MiB、手動1536MiB、slots8、輸送64MiB、credit2、available>=4096MiB、Chrome PSS<1536MiBを維持。',
'最初の60000ms起動は既存90000ms固定の事前assertで拒否された。計測Chrome/一時profile/Native要求の開始前だった。Chromeのversion照会は別途行った。',
'そのrun/log/driverも保全し、データ取得前に90秒へ計画を整合した。前提拒否1件＋本試行32件でharness起動は計33件。失敗を性能データへ混ぜたり、取得した外れ値を除外していない。','',
'この結果の範囲は同じLLM-01・Chrome・入力・先頭4family・1Workerである。別入力/端末、5Worker、warmな後半familyやRSA100全工程の短縮は未測定。',
'追加RSA100完走試行は0回、2候補の合成や新方式探索は行っていない。改善枯渇・merge/release条件成立とは扱わない。',
'[事前契約](../contracts/hotpath-repeat.md)、[固定plan](../../bench/staged-hotpath-repeat-plan.json)、[可逆原本索引](staged-hotpath-repeat-stage44/evidence-index.json)。',
'全'+Object.keys(index.files).length+'原本、可逆圧縮'+index.totalEncodedBytes.toLocaleString('en-US')+' bytes（上限4MiB）。通常入口・公開の変更判断は別の選定記録へ残す。',''];
const output='docs/benchmarks/llm01-hotpath-repeat.md',text=lines.join('\n');
if(process.argv.includes('--check'))assert.equal(readFileSync(output,'utf8'),text);else writeFileSync(output,text);
console.log(JSON.stringify({head:run.head,trials:32,selection:analysis.selection,results:Object.fromEntries(Object.entries(results).map(([k,r])=>[k,{timeRatio:r.timeRatio,referenceUpper:r.referenceUpper,pssRatio:r.pssRatio,eligible:r.eligible}])),evidenceBytes:index.totalEncodedBytes}));

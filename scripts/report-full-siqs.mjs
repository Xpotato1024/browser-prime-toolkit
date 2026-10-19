import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {verifyRsaWorkerResult,verifyRsaSnapshot,classifyRsaResult} from '../src/full-siqs/result.js';
const root=resolve(import.meta.dirname,'..'),directory=join(root,'docs/benchmarks');
const read=p=>readFileSync(join(root,p)),sha=b=>createHash('sha256').update(b).digest('hex');
const catalog=JSON.parse(read('bench/staged-full/catalog.json')).cases;
const oracle=JSON.parse(read('bench/staged-full/oracle.json')).cases;
const official=JSON.parse(read('bench/staged-rsa/catalog.json'));
const paths=readdirSync(directory).filter(p=>p.startsWith('llm01-staged-full-')&&p.endsWith('.json')&&!p.endsWith('-summary.json')).sort();
assert.ok(paths.length>1);
const records=[],contractReceipts=[],heads=new Set(),identities=new Set();let contracts=0;
for(const name of paths){
 const r=JSON.parse(readFileSync(join(directory,name)));
 assert.match(r.measuredHead,/^[a-f0-9]{40}$/);heads.add(r.measuredHead);
 assert.equal(r.variant,'full-siqs');assert.equal(r.quiet.networkRequests,0);assert.equal(r.quiet.httpRequests,0);
 assert.equal(r.quiet.badEvents,0);assert.equal(r.quiet.assetServerStopped,true);assert.equal(r.quiet.cacheDisabled,true);
 assert.deepEqual(r.detectorSelfTest,{blockedPageFetchCsp:true,pageCdpAndHttp:true,workerCdpAndHttp:true});
 assert.equal(r.ownership.live,0);assert.equal(r.ownership.maxLive,1);assert.equal(r.limits.operationBudget,1000000000000);
 for(const [p,h]of Object.entries(r.sourceFiles))assert.equal(sha(read(p)),h,'Measurement source '+p);
 for(const a of r.initialAssets){assert.ok(!/oracle|manifest/.test(a.path));const b=read(a.path.slice(1));assert.equal(b.length,a.bytes);assert.equal(sha(b),a.sha256);}
 assert.equal(r.assetBoundarySelfTest.length,6);assert.ok(r.assetBoundarySelfTest.every(a=>a.status===404));
 assert.ok(r.sampledRam.samples>0&&r.sampledRam.peakRssBytes>0&&r.sampledRam.peakPssBytes>0);
 if(r.mode==='full-siqs-contracts'){
  assert.equal(r.records.length,1);const c=r.records[0];assert.equal(c.tests.length,10);
  assert.ok(c.tests.every(t=>t.pass));assert.equal(c.acceleratedClockIsPerformanceMeasurement,false);contractReceipts.push({file:name,sha256:sha(readFileSync(join(directory,name)))});contracts++;continue;
 }
 assert.equal(r.mode,'full-siqs-measurement');assert.equal(r.records.length,1);
 const record=r.records[0],o=record.outcome;
 const identity=[...catalog,...official].find(c=>c.id===r.caseId);assert.ok(identity);
 assert.equal(record.input,identity.input);assert.equal(record.digits,identity.digits);assert.equal(record.bits,identity.bits);
 assert.equal(record.digits,record.input.length);assert.equal(record.bits,BigInt(record.input).toString(2).length);
 assert.equal(record.id,r.caseId);assert.equal(record.seed,r.seed);assert.equal(record.knownFactorsUsed,false);
 assert.equal(o.input,record.input);assert.equal(o.allWorkersDisposed,true);assert.equal(o.workers,1);
 assert.equal(o.wasmBytes,536870912);assert.ok(o.requestWallMs>=0&&o.requestWallMs<r.budgetMs+1000);
 const id=[r.caseId,r.seed,r.budgetMs].join('/');assert.ok(!identities.has(id));identities.add(id);
 if(o.result)assert.equal(classifyRsaResult(verifyRsaWorkerResult(o.result,o.input)),o.kind);
 else if(o.snapshot)verifyRsaSnapshot(o.snapshot,o.input);
 const complete=['factorized','probable'].includes(o.kind)&&o.result?.remaining==='1';
 if(complete)assert.ok(o.requestWallMs<r.budgetMs);
 const c=catalog.find(x=>x.id===r.caseId);
 if(c){
  assert.equal(c.input,record.input);assert.equal(record.oracleCheckedAfterRetirement,true);
  const expected=oracle.find(x=>x.id===c.id);assert.ok(expected);
  if(complete)assert.deepEqual(o.result.factors.map(f=>f.value),[expected.p,expected.q].sort((a,b)=>BigInt(a)<BigInt(b)?-1:1));
 }else assert.equal(r.caseId,'RSA-100');
 const last=o.diagnostics??o.telemetry?.at(-1)??null;
 records.push({file:name,sha256:sha(readFileSync(join(directory,name))),caseId:r.caseId,digits:record.digits,bits:record.bits,seed:r.seed,budgetMs:r.budgetMs,kind:o.kind,reason:o.reason,complete,requestWallMs:o.requestWallMs,initializationMs:o.initializationMs,operations:o.result?.operations??o.snapshot?.operations??null,phase:last?.phase??null,relations:last?.relations??null,saveBytes:last?.saveBytes??null,nnz:last?.nnz??null,peakRssBytes:r.sampledRam.peakRssBytes,peakPssBytes:r.sampledRam.peakPssBytes});
}
assert.equal(contracts,1);assert.equal(heads.size,1);
const evidence=JSON.parse(read('docs/benchmarks/archive/validation-logs/staged-full-manifest.json'));
assert.equal(evidence.coreHead,[...heads][0]);
for(const [p,h]of Object.entries(evidence.files))assert.equal(sha(read('docs/benchmarks/archive/validation-logs/'+p)),h,'TDD evidence '+p);
const stats=values=>{if(!values.length)return null;const v=[...values].sort((a,b)=>a-b),m=Math.floor(v.length/2);return{count:v.length,min:v[0],median:v.length%2?v[m]:(v[m-1]+v[m])/2,max:v.at(-1)};};
const tiers=[...new Set(records.filter(r=>r.caseId.startsWith('full-balanced-')).map(r=>r.digits))].sort((a,b)=>a-b).map(digits=>{
 const inputs=catalog.filter(c=>c.digits===digits);assert.equal(inputs.length,2);
 const rs=records.filter(r=>r.digits===digits&&r.caseId.startsWith('full-balanced-'));
 return{digits,inputs:inputs.map(c=>c.id),rawTrials:rs.length,denominator:4,budgets:[3000,30000,180000].map(budgetMs=>{
  const groups=inputs.flatMap(c=>[1,11].map(seed=>rs.filter(r=>r.caseId===c.id&&r.seed===seed&&r.budgetMs<=budgetMs)));
  const success=groups.map(g=>g.find(r=>r.complete)).filter(Boolean);
  return{budgetMs,successes:success.length,observedGroups:groups.filter(g=>g.some(r=>r.complete||r.budgetMs===budgetMs)).length,successWallMs:stats(success.map(r=>r.requestWallMs))};
 })};
});
const summary={measuredHead:[...heads][0],contracts,contractReceipts,rawTrials:records.length,completeTrials:records.filter(r=>r.complete).length,largestObservedCompleteDigits:Math.max(0,...records.filter(r=>r.complete).map(r=>r.digits)),largestAllFourObservedByBudget:[3000,30000,180000].map(budgetMs=>({budgetMs,digits:Math.max(0,...tiers.filter(t=>t.budgets.find(b=>b.budgetMs===budgetMs).successes===4).map(t=>t.digits))})),tiers,rsa100:records.filter(r=>r.caseId==='RSA-100'),stopCounts:Object.fromEntries([...new Set(records.map(r=>r.kind+'/'+r.reason))].sort().map(k=>[k,records.filter(r=>r.kind+'/'+r.reason===k).length])),records};
const out=join(directory,'llm01-staged-full-summary.json'),text=JSON.stringify(summary,null,2)+'\n';
if(process.argv.includes('--check'))assert.equal(readFileSync(out,'utf8'),text);else writeFileSync(out,text);
console.log(JSON.stringify({rawTrials:summary.rawTrials,completeTrials:summary.completeTrials,largestAllFourObservedByBudget:summary.largestAllFourObservedByBudget,rsa100:summary.rsa100.map(r=>({budgetMs:r.budgetMs,kind:r.kind,phase:r.phase,relations:r.relations}))}));

const show=x=>(x/1000).toFixed(3);
const rows=tiers.map(t=>{
 const successes=records.filter(r=>r.digits===t.digits&&r.caseId.startsWith('full-balanced-')&&r.complete);
 return '| '+t.digits+' | '+t.budgets.map(b=>b.successes+'/4'+(b.observedGroups<4?' (観測'+b.observedGroups+'/4)':'')).join(' | ')+' | '+(successes.length?show(Math.min(...successes.map(r=>r.requestWallMs)))+'–'+show(Math.max(...successes.map(r=>r.requestWallMs))):'—')+' |';
});
const rsaRows=summary.rsa100.map(r=>'| '+r.seed+' | '+r.budgetMs/1000+' | '+r.kind+'/'+r.reason+' | '+show(r.requestWallMs)+' | '+r.phase+' | '+(r.relations?JSON.stringify(r.relations):'未取得')+' |');
const md=[
 '# LLM-01 full SIQS の有限評価',
 '測定head: '+summary.measuredHead+'。固定WASM 136328 bytes、SHA256 950ab7e0bbcb585d8db13ea105265c4fdb4d4ea838e6b19db02e04b1a0cc32f5。最終headでは同じ計算・harness source hashを全rawから再検査します。',
 '',
 'msieve1.53の独立full SIQSです。既存UI/Brent/旧128bit SIQSを変更していません。計算前にserverを停止し、全試行で通信0・Worker最大1・退役をCDP/HTTP/CSPと正対照で確認しました。WASM固定512MiB、stack4MiB、save128MiB、growth/pthreadsなし、有限1兆checkpointです。',
 '',
 '## 均衡半素数',
 '| 桁 | 3秒内完了 | 30秒内完了 | 180秒内完了 | 成功時の実待ち秒 min–max |',
 '| --- | --- | --- | --- | --- |',
 ...rows,
 '',
 '各桁2入力×seed1/11の4組です。短枠成功を長枠の到達にも含め、未完了の組だけ最初から延長試行します。観測4/4に満たない枠は未測定を含みます。成功時間にはtimeoutを入れず、再試行の待ち時間は加算していません。これは測ったtierの小標本であり、一般的な最大桁数ではありません。',
 '',
 'runtimeの判定はprobableを維持します。因数の積・固定MRに加え、退役後のNodeで事前固定Pocklington証明付きoracleと一致を確認しています。62入力/124素因数は測定前に固定し、実行assetはNだけです。再帰証明用の大きなp−1因子を持つ構成なので、一様な半素数標本ではありません。未記載の桁は未測定です。',
 '',
 '## RSA100',
 '| seed | 枠(秒) | 結果/理由 | 初期化込み実待ち秒 | 最終phase | 関係式の最終観測 |',
 '| --- | --- | --- | --- | --- | --- |',
 ...rsaRows,
 '',
 'phaseは1=base、2=poly、3=sieve、4=relation、5=matrix、6=sqrtです。full/combinedとpartialは同じ件数として加算しません。未完了から成功時間を推定しません。既知因数をWorkerへ渡していません。',
 '',
 '## 証跡と限界',
 '全'+summary.rawTrials+'性能rawと10契約の1rawを[summary](llm01-staged-full-summary.json)でhash照合します。10契約には実OOM/trap、poison後再利用拒否、fresh要求回復、取消、加速host deadline、対象外のWorker割当拒否があります。加速時計試験は性能値へ混ぜません。',
 '',
 '端末・Chrome版・source/asset hash・初期化時間・checkpoint・停止理由・Chrome process treeの標本RSS/PSSは各rawにあります。RSSは共有pageを重複計上し得て、PSSも標本です。瞬間peakやChrome全体hard capとは扱いません。旧Brent600秒timeoutとpartial matrixは[途中記録](../operations/minute-evaluation.md)へ保存し、別方式・別corpusの時間を同一入力の速度比へ変換しません。',
 '',
 '公開license採用、製品UI/site統合、Ready、merge、deployは未実施です。Alpertronは別候補として保全し、未計測の速さで除外しません。'
].join('\n')+'\n';
const mdPath=join(directory,'llm01-staged-full.md');
if(process.argv.includes('--check'))assert.equal(readFileSync(mdPath,'utf8'),md);else writeFileSync(mdPath,md);

import {summarizeTier} from './practical-stats.mjs';
import assert from 'node:assert/strict';
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {verifyLongReceipt} from './long-receipt.mjs';
import {historicalRsa100} from './check-long-history.mjs';
const read=async p=>JSON.parse(await readFile(p,'utf8')),prefix='docs/benchmarks/';
const catalog=await read('bench/staged-practical/catalog.json'),oracle=await read('bench/staged-practical/oracle.json'),manifest=await read('bench/staged-practical/manifest.json');
const contract=await read(prefix+'llm01-staged-long-contract.json');await verifyLongReceipt(contract);
const schedule=await read(prefix+'llm01-staged-practical-schedule.json');assert.equal(schedule.schema,2);assert.deepEqual(schedule.frozenManifest,manifest);assert.equal(schedule.measuredHead,contract.measuredHead);
const trials=[],evidence=[],keys=new Set(),budgets=[3000,30000,180000];
for(const e of schedule.evidence){
 const c=catalog.cases.find(c=>c.id===e.id),o=oracle.cases.find(o=>o.id===e.id);assert.ok(c&&o);
 assert.ok(manifest.seeds.includes(e.seed)&&budgets.includes(e.budgetMs));
 const path=prefix+'llm01-staged-practical-'+c.id.slice('balanced-'.length)+'-seed'+e.seed+'-'+e.budgetMs+'.json';assert.equal(e.path,path);
 const key=[e.id,e.seed,e.budgetMs].join('/');assert.ok(!keys.has(key));keys.add(key);
 const bytes=await readFile(path),r=JSON.parse(bytes),v=await verifyLongReceipt(r,{expected:c,baseline:contract,oracle:o});
 assert.ok(['factorized','timeout'].includes(v.kind));assert.equal(r.seed,e.seed);assert.equal(r.budgetMs,e.budgetMs);
 for(const k of ['kind','reason','requestWallMs'])assert.equal(e[k],v[k]);
 trials.push({...e,digits:c.digits,outcome:v,sampledRam:r.sampledRam});
 evidence.push({path,sha256:createHash('sha256').update(bytes).digest('hex')});
}
assert.equal(new Set(schedule.executedTiers.map(t=>t.digits)).size,schedule.executedTiers.length);
 const allRaw=(await readdir(prefix)).filter(p=>/^llm01-staged-practical-\d+-\d+-seed\d+-\d+\.json$/.test(p)).map(p=>prefix+p).sort();
 assert.deepEqual(evidence.map(e=>e.path).sort(),allRaw,'Every current raw trial is included');
 assert.ok(trials.every(t=>schedule.executedTiers.some(row=>row.digits===t.digits)));
const tiers=[];
for(const tier of schedule.executedTiers){
 const row=summarizeTier({digits:tier.digits,cases:catalog.cases.filter(c=>c.digits===tier.digits),seeds:manifest.seeds,trials});
 assert.equal(tier.pairs,4);assert.equal(tier.solvedWithin180s,4-row.terminalUnsolvedPairs);
 tiers.push(row);
}
tiers.sort((a,b)=>a.digits-b.digits);
const largestFull=budget=>Math.max(0,...tiers.filter(t=>t.cumulativeSolvedByBudget.find(b=>b.budgetMs===budget).solved===4).map(t=>t.digits))||null;
const old=historicalRsa100.records[0].outcome;
assert.deepEqual(historicalRsa100.browser,contract.browser);assert.deepEqual(historicalRsa100.host,contract.host);
const summary={schema:1,profile:'long-native-brent-v1',measuredHead:contract.measuredHead,preRoutingFixMeasuredHead:historicalRsa100.measuredHead,
 browser:contract.browser.product,host:contract.host,workers:1,wasmBytes:0,operationBudget:10000000000,
 corpusManifestSha256:createHash('sha256').update(await readFile('bench/staged-practical/manifest.json')).digest('hex'),
 oracleNeverRuntimeAsset:true,knownFactorsInjected:false,independentBalancedInputs:true,allFoundFactorsProven:true,
 rsa100:{digits:100,bits:330,trials:1,seed:1,budgetMs:600000,kind:old.kind,reason:old.reason,requestWallMs:old.requestWallMs,
  operations:old.snapshot.operations,factorsFound:old.snapshot.factors.length,remainingEqualsInput:old.snapshot.remaining===old.input,
  completionTimeMeasured:old.kind==='factorized',historicalReceipt:'docs/benchmarks/archive/staged-long-router-v1/llm01-staged-long-rsa100-seed1-600000.json'},
 largestObservedAllFourByBudget:budgets.map(b=>({budgetMs:b,digits:largestFull(b)})),tiers,rawTrials:trials.length,
 timeouts:trials.filter(t=>t.kind==='timeout').length,initialExpansionStopDigits:schedule.boundaryAllFourUnsolvedAt180s,
 smallestObservedAllFourUnsolvedDigits:tiers.some(t=>t.terminalUnsolvedPairs===4)?Math.min(...tiers.filter(t=>t.terminalUnsolvedPairs===4).map(t=>t.digits)):null,
 stopReason:schedule.stopReason,sampledRam:{peakChromeRssBytes:Math.max(historicalRsa100.sampledRam.peakRssBytes,...trials.map(t=>t.sampledRam.peakRssBytes)),
  peakChromePssBytes:Math.max(historicalRsa100.sampledRam.peakPssBytes,...trials.map(t=>t.sampledRam.peakPssBytes))},
 limitations:['Two independent inputs per tier, two seeds each; seeds are not independent input samples','Only native BigInt Brent tested',
  'Success counts use four fixed input-seed pairs; retries are not extra samples','Earlier success counts toward larger budgets; successful median excludes all timeouts',
  'Success request time is the last fresh one-shot trial; retry-inclusive effort is separate','No official RSA challenge below RSA-100; generated cases are not official RSA',
  'Unmeasured sizes and universal capability limits are not inferred','JS heap has no hard cap; Chrome tree RAM is sampled, including startup'],evidence};
const rows=tiers.map(t=>{const counts=t.cumulativeSolvedByBudget.map(x=>x.solved+'/4'),st=t.successfulRequestWallMs,seconds=x=>(x/1000).toFixed(3);
 return '|'+[t.digits,...counts,st?seconds(st.median)+' ('+seconds(st.min)+'–'+seconds(st.max)+')':'—',t.terminalUnsolvedPairs,t.timedOutAttempts].join('|')+'|';});
const md='# LLM-01: 分単位と均衡半素数の実用域\n\nRSA-100（100桁/330bit）はnative BigInt Brent・1 Worker・seed1で599.977秒（約10分）まで実行し、time-budget未完了でした。有限100億checkpointの上限には達せず、因数は0、余因子はNです。完了時間は未測定であり、推定の成功時間は提示しません。\n\n'+
 '生成半素数は各桁2入力×seed1/11の4組です。以下の到達率はこの固定4組が分母で、短い予算での成功を長い予算にも含みます。retry行を独立標本へ数えません。成功時間は最後の単一試行の初期化込み時間で、timeoutを除外します。\n\n'+
 '|十進桁|3秒内|30秒内|180秒内|成功中央値秒 (範囲)|180秒未完了組|timeout試行数|\n|---|---:|---:|---:|---|---:|---:|\n'+rows.join('\n')+'\n\n'+
 '端末は'+summary.host.cpu+'、WSL '+summary.host.release+'、Chrome '+summary.browser+'。各回fresh browser/profile、1 Worker、WASM0、最大2048bit/617桁、有限100億checkpoint、毎checkpoint時計確認です。計時は入力検査・Worker compile/初期化・計算・積/確度検査・退役を含み、初回asset取得とChrome起動は別欄です。\n\n'+
 '独立Python生成とMR64で52の異なる素因数を確認し、各Nは指定桁・因子比2以内/bit長差1以内です。catalog/oracle/generatorを初回前にhash固定し、成績を見た入力差替えはしていません。browser/WorkerへはNだけを配信し、oracleは退役後CLIの照合だけに使います。全成功因数はproven、積一致、全試行で通信0/maxLive1/live0、正の通信検出対照成功です。\n\n'+
 'これはnative Brentの小標本による観測範囲です。公式RSA-100未満の問題はなく、生成例を公式RSAの能力へ読み替えません。未測定値、普遍的最大、大SIQSやGMP/ECMでの能力は未評価です。新SIQSに必要なinput/整数/prime/relation/filter/疎行列/資源/取消の改修は[実上限](../architecture/rsa-backend-limits.md)へ戻します。\n\n'+
 '10分測定は配信router修正前の固定CLIを[歴史sourceとraw](archive/staged-long-router-v1/README.md)で保全し、実配信assetと全計算source hashを照合しています。修正は計算前のallowlistと拒否selftestだけで、計算中部分は不変です。小桁matrixは修正後CLI/contractへ統一しました。\n\n'+
 'RAMは全Chrome treeの標本で、最大RSS '+summary.sampledRam.peakChromeRssBytes+' bytes/PSS '+summary.sampledRam.peakChromePssBytes+' bytes。共有領域・起動を含み、瞬間peak/JS heap hard capではありません。\n\n'+
 '[集計JSON](llm01-staged-practical-summary.json)は各組・再試行込み努力時間・全raw hashを保持します。[schedule](llm01-staged-practical-schedule.json)と[生成manifest](../../bench/staged-practical/manifest.json)を保存し、npm run report:practical -- --checkで全入力・積/確度・停止分類・source・到達率を再検算できます。\n';
for(const[path,text]of [[prefix+'llm01-staged-practical-summary.json',JSON.stringify(summary,null,2)+'\n'],[prefix+'llm01-staged-practical.md',md]]){
 if(process.argv.includes('--check'))assert.equal(await readFile(path,'utf8'),text);else await writeFile(path,text);
}
console.log(JSON.stringify({rsa100:summary.rsa100,rawTrials:summary.rawTrials,tiers:summary.tiers.map(t=>({digits:t.digits,solved:t.cumulativeSolvedByBudget,successful:t.successfulRequestWallMs})),largest:summary.largestObservedAllFourByBudget}));

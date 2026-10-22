import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import { selectEnginePlan } from '../src/engine/selection.js';
import { verifyFactorResult, verifySnapshot } from '../src/engine/result.js';
const root=resolve(import.meta.dirname,'..'),path='docs/benchmarks/llm01-selection-holdout.json';
const read=p=>readFileSync(join(root,p)),sha=b=>createHash('sha256').update(b).digest('hex');
const raw=read(path),d=JSON.parse(raw),corpus=JSON.parse(read('bench/selection-holdout.json'));
assert.equal(d.quick,false);assert.equal(d.records.length,18);assert.deepEqual(d.corpus,corpus);
assert.deepEqual(d.holdoutProof,JSON.parse(read('bench/selection-holdout-proof.json')));
assert.deepEqual(d.wasmBuild,JSON.parse(read('native/gmp/build.json')));
for(const [path,hash] of Object.entries(d.sourceFiles))assert.equal(sha(read(path)),hash,'Holdout source changed: '+path);
const prior=new Set();
for(const name of ['llm01-baseline','llm01-wasm-mpqs','llm01-gmp-ecm','llm01-bounded-siqs'])
  for(const c of JSON.parse(read('docs/benchmarks/'+name+'.json')).corpus)prior.add(c.input);
assert.ok(corpus.every(c=>!prior.has(c.input)));
const unique=new Set(),cases=new Map(corpus.map(c=>[c.id,c]));
for(const r of d.records) {
  const c=cases.get(r.case);assert.ok(c);
  assert.equal(r.freshPerTrial,true);assert.equal(r.timeBudgetMs,1000);assert.equal(r.seed,23);
  assert.equal(r.operationBudget,50000000);
  const expected=selectEnginePlan(c.input,{seed:23,timeBudgetMs:1000,operationBudget:50000000});
  assert.deepEqual(r.selection,expected);
  assert.equal(r.algorithm,r.requestedAlgorithm==='selector'?expected.algorithm:r.requestedAlgorithm);
  const key=r.case+':'+r.requestedAlgorithm;assert.ok(!unique.has(key));unique.add(key);
  assert.ok(['selector','brent','gmp-ecm'].includes(r.requestedAlgorithm));
  if(r.reason==='host-timeout')verifySnapshot(r,c.input);else verifyFactorResult(r,c.input);
  if(['complete','probable'].includes(r.status))assert.deepEqual(r.factors.map(f=>f.value),c.factors);
  assert.ok(r.sampledRam.samples>0);
}
assert.equal(unique.size,18);assert.equal(d.ownership.maxLive,1);
assert.deepEqual([d.quiet.networkRequests,d.quiet.httpRequests,d.quiet.badEvents],[0,0,0]);
const rows=mode=>d.records.filter(r=>r.requestedAlgorithm===mode),ok=r=>['complete','probable'].includes(r.status);
const median=values=>{const v=values.toSorted((a,b)=>a-b),i=v.length>>1;return (v.length%2?v[i]:(v[i-1]+v[i])/2).toFixed(2);};
const mib=n=>(n/1048576).toFixed(2);
const cell=r=>r.status+(r.reason?' ('+r.reason+')':'')+' / '+r.requestWallMs.toFixed(2);
let text='# LLM-01: 保守的selectorの固定holdout\n\n';
text+='[採否・公開前判断](../architecture/engine-selection-closeout.md)に沿った実装確認です。最適閾値・一般成功確率・任意桁性能の証明ではありません。policy/seedは結果を見て変更していません。\n\n';
text+='測定code '+d.measuredHead+'、日時 '+d.measuredAt+'。\n[raw](llm01-selection-holdout.json) SHA256 '+sha(raw)+'。\n\n';
text+='## 6問・18計算\n\n事前のADR0006後に生成した新6入力で、過去の全corpusと非重複です。各方式1回、seed23、計算1秒/50M checkpoint、毎回fresh Worker。小さい因子11個は計測外の独立exhaustive uint64 trialで証明し、M127だけruntime probableを維持します。\n\n';
text+='各cellはstatus / 初期化を含むrequest wall msです。初回asset取得は含みません。\n\n';
text+='| 問題 | bit | selector方式 | native-only | ECM | selector |\n| --- | ---: | --- | ---: | ---: | ---: |\n';
for(const c of corpus) {const get=mode=>d.records.find(r=>r.case===c.id&&r.requestedAlgorithm===mode);
 text+='| '+c.id+' | '+c.bits+' | '+get('selector').algorithm+' | '+['brent','gmp-ecm','selector'].map(m=>cell(get(m))).join(' | ')+' |\n';}
text+='\nselectorは5 complete＋1 probable、nativeは4 complete＋1 probable＋1 time-budget、ECMは5 complete＋1 probableでした。112bitの新問はECMが完了し、nativeは未完了です。大入力×小因子ではnativeが速く、入力bit数だけのpolicyが最速とは限りません。64bit入力も2^64未満なのでnative側です。平方や小因子/MRは既存共通工程で処理し、全結果を元入力と検算しています。\n\n';
text+='## 初期化と計算・RAM\n\n| mode | 初期化中央値ms | 完了時ready後中央値ms | 完了時request中央値ms |\n| --- | ---: | ---: | ---: |\n';
for(const mode of ['selector','brent','gmp-ecm']) {const rr=rows(mode),success=rr.filter(ok);text+='| '+mode+' | '+median(rr.map(r=>r.initializationMs))+' | '+median(success.map(r=>r.wallMs))+' | '+median(success.map(r=>r.requestWallMs))+' |\n';}
text+='\nselectorの全体中央値は異なるbackendの混合で、backend単体の初期化費ではありません。6問の単発・順序を巡回した局所結果で、統計的優位・一般speedupを推定しません。\n\n';
text+='初回local取得からnative readyは'+d.coldReadyMs.toFixed(2)+'ms、初期source asset合計'+d.initialAssets.reduce((n,a)=>n+a.bytes,0)+' bytes（圧縮やHTTP headerを含むwire量ではない）です。native-only Worker assetは'+d.artifact.bytes+' bytes / SHA256 '+d.artifact.sha256+'。controllerの通常sourceやECM sourceも初期取得する評価page全体の費用とは区別します。\n\n';
text+='native-onlyはWASM線形0、ECMはhard64MiB/stack1MiB。同時所有max1で、nativeのJS/browser RAMが0ではありません。専用Chrome process treeの全taskを標本化し、'+d.sampledRam.samples+'標本でRSS peak '+mib(d.sampledRam.peakRssBytes)+'MiB / PSS peak '+mib(d.sampledRam.peakPssBytes)+'MiBでした。最初の比較直前標本はRSS '+mib(d.records[0].sampledRam.first.rssBytes)+'MiB / PSS '+mib(d.records[0].sampledRam.first.pssBytes)+'MiBです。shared RSS重複、GC待ち、25ms目標の標本間ピーク未捕捉を含み、厳密RAM上限でも各方式への帰属値でもありません。2 WorkerのRAMは再測定していません。\n\n';
text+='名目の初期化deadline5秒＋計算枠＋配送猶予100msは、初回取得/parse/proof検証/OS遅延まで含む実時間上限ではありません。既定selectorは計算1M checkpointで、今回50Mの確認結果を既定予算の保証にはしません。\n\n';
text+='## 境界と終了\n\n135 tests/checkに加え、WebAssembly無効の独立native Workerでready/exact divisor/非対応algorithm拒否を確認しました。通信監視はready後HTTP/CDP/CSP/例外0、cache無効・server停止offlineで両経路の計算、取消、再初期化を確認。検出器の正例も通過しています。Worker targetのoffline emulation非対応はserver停止で補完しました。\n\n';
text+='PR3〜5の長い測定は履歴として再利用し、新方式port・追加seed探索・閾値調整は行いません。site/UI/CSP/公開license/配布/Ready/merge/deployは変更していません。公開受付範囲、全request待ち時間/RAM、probable表示、ECM配布条文/再リンク材料、site long-compute profileは本人判断を残します。\n';
const destination=join(root,'docs/benchmarks/llm01-selection-holdout.md');
if(process.argv.includes('--check'))assert.equal(readFileSync(destination,'utf8'),text,'Selection report stale');else writeFileSync(destination,text);
console.log('Verified 18 fresh holdout trials, fixed selection policy, proofs/source binding and report');

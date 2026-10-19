import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {verifySnapshot} from '../src/engine/result.js';
const root=new URL('../',import.meta.url),read=p=>readFileSync(new URL(p,root)),sha=b=>createHash('sha256').update(b).digest('hex');
const path='docs/benchmarks/',names=['long','pm1','pool'];
const [long,pm1,pool]=names.map(n=>JSON.parse(read(path+'llm01-supplement-'+n+'.json')));
const reference=JSON.parse(read(path+'llm01-msieve-reference.json'));
assert.equal(long.records.length,16);assert.equal(pm1.records.length,18);assert.equal(pool.trials.length,20);
assert.equal(pool.freshChromePerTrial,true);
assert.equal(pool.runnerSha256,sha(read('scripts/run-supplement-matrix.mjs')));
const receipts=[long,pm1,...pool.trials],heads=new Set(receipts.map(r=>r.measuredHead));
assert.equal(heads.size,1);assert.match([...heads][0],/^[a-f0-9]{40}$/);
for(const receipt of receipts){
 for(const [p,h] of Object.entries(receipt.sourceFiles))assert.equal(sha(read(p)),h,p);
 for(const k of ['networkRequests','httpRequests','badEvents'])assert.equal(receipt.quiet[k],0);
 assert.equal(receipt.quiet.assetServerStopped,true);assert.equal(receipt.ownership.live,0);
 assert.ok(receipt.ownership.maxLive<=2);
 for(const r of receipt.records){
  verifySnapshot(r.result,r.input);assert.equal(r.result.allLanesDisposed,true);
  assert.ok(r.result.linearMemoryBytes<=134217728);assert.ok(r.result.allocatedOperations<=50000000);
  if(['complete','probable'].includes(r.result.status))assert.deepEqual(r.result.factors.map(f=>f.value),r.expectedFactors);
  const observed=r.result.audits.filter(Boolean);
  if(r.options.kind==='ecm')for(const a of observed){
   assert.equal(new Set(a.sigma).size,32);assert.equal(a.sigma.length,32);
   assert.ok(a.curves<=32/r.result.workers);assert.equal(a.curves,a.usedMask.toString(2).replaceAll('0','').length);
   for(let i=0;i<32;i++)if(a.usedMask>>>i&1)assert.equal(i%a.workers,a.lane);
  }
  if(observed.length===2)assert.equal((observed[0].usedMask&observed[1].usedMask)>>>0,0);
 }
}
for(const [p,h] of Object.entries(reference.sourceHashes))assert.equal(sha(read(p)),h,p);
const rows=pool.trials.map(t=>t.records[0]),ms=x=>x===null?'—':x.toFixed(2),mib=x=>(x/1048576).toFixed(2);
const median=a=>{a=a.filter(v=>v!==null).sort((a,b)=>a-b);return a.length?(a[(a.length-1)>>1]+a[a.length>>1])/2:null;};
const out=['# LLM-01: SIQS・fresh 1/2 Worker・p−1再評価','',
 '非公開・固定少数問。主測定HEAD: '+[...heads][0]+'。',
 '生データのSHA256: '+names.map(n=>n+'='+sha(read(path+'llm01-supplement-'+n+'.json'))).join(' / ')+'。',
 '',
 '## SIQS（無計装の主測定）','| 入力 | 計算枠ms | status/reason | request ms | operations |','| --- | ---: | --- | ---: | ---: |'];
for(const r of long.records.filter(r=>r.options.kind==='siqs'))out.push('| '+[r.case,r.options.computeMs,r.result.status+'/'+(r.result.reason??'—'),ms(r.result.requestWallMs),r.result.operations].join(' | ')+' |');
out.push('','50M操作枠が先なら30秒枠を使い切った結果ではありません。smoke成功を一般群へ外挿しません。',
 '旧WASMのままであり、独自dense GF(2)を使います。上流Lanczosは未使用です。','',
 '## 別profile（最後のsplitのcallback間wall近似）','| 入力 | phase mask | callback数 | phase別ms（base/poly/sieve/relation/matrix/sqrt） | 管理peak bytes |','| --- | ---: | ---: | --- | ---: |');
for(const r of long.records.filter(r=>r.options.kind==='profile')){
 const a=r.result.audits.find(Boolean);assert.ok(a?.profile);
 out.push('| '+[r.case,a.phaseMask,a.profile.calls.reduce((a,b)=>a+b,0),a.profile.wallMs.slice(1).map(ms).join('/'),a.peakBytes].join(' | ')+' |');
}
out.push('','追加時計読み、JS import/Budget/出力検証費を含み、純C時間・全job profileではありません。',
 'relation/A/block途中カウンタは旧ABIにないため取得不能です。logはrawのauditに保存しています。','',
 '## fresh Chrome・同じ32曲線総数','| 入力 | 本数 | complete/probable | request中央値ms | 初期化中央値ms | 全体peak PSS中央値MiB | 全体peak RSS中央値MiB |','| --- | ---: | ---: | ---: | ---: | ---: | ---: |');
for(const id of new Set(rows.map(r=>r.case)))for(const workers of [1,2]){
 const g=rows.filter(r=>r.case===id&&r.options.workers===workers);
 out.push('| '+[id,workers,g.filter(r=>['complete','probable'].includes(r.result.status)).length+'/'+g.length,ms(median(g.map(r=>r.result.requestWallMs))),ms(median(g.map(r=>r.result.initializationMs))),mib(median(g.map(r=>r.sampledRam.peakPssBytes))),mib(median(g.map(r=>r.sampledRam.peakRssBytes)))].join(' | ')+' |');
}
out.push('','各trialはfresh Chrome/fresh Worker、初期化込み総1000ms・総50M操作。cold asset取得は別記録です。',
 '線形は1本64MiB/2本128MiB。PSS/RSSはChrome全treeの標本で、hard上限や瞬間peak保証ではありません。',
 'auditは返却時の観測で、破棄した敗者の最終曲線数は未観測になり得ます。計画σとlane indexは構造で分離します。','',
 '## p−1 stage1-only','| 入力 | base | status/reason | request ms |','| --- | ---: | --- | ---: |');
for(const r of pm1.records)out.push('| '+[r.case,r.options.base,r.result.status+'/'+(r.result.reason??'—'),ms(r.result.requestWallMs)].join(' | ')+' |');
out.push('','B1=2000、B2=1<B2min=2000。合同式の対照は[固定controls](../../bench/pm1-controls.json)。',
 '有利な位数・gcd=n・非適合例を分けます。一般入力に効く保証はなく、p+1/SQUFOF等は未測定です。','',
 '## 固定full msieveのnative参考','| 入力 | elapsed ms | exit/timeout | 観測因子 |','| --- | ---: | --- | --- |');
for(const r of reference.records){
 const factors=[...r.stdout.matchAll(/REFERENCE_FACTOR ([0-9]+)/g)].map(m=>m[1]);
 for(const f of factors)assert.equal(BigInt(r.input)%BigInt(f),0n);
 out.push('| '+[r.case,ms(r.elapsedMs),String(r.returncode)+'/'+r.timeout,factors.join(' × ')||'—'].join(' | ')+' |');
}
out.push('','固定原本のQSを直接実行し、CPU dispatchをgeneric C sieveに接続したnative参考です。',
 '512MiB address space・30秒host timeout・1thread。browserの同条件速度比でもLanczos単独比較でもありません。',
 '同一relation/cycleを使ったdense対Lanczos比較・browser portは残ります。','',
 '全54 browser計算で初回asset取得後はserver停止・cache無効・通信0、全lane破棄を確認しました。',
 '主計測前後の検証と取消は別のquick検証です。Alpertron独立review/buildは自動承認レビュー拒否のため保留です。',
 '[設計境界と一次資料](../architecture/supplementary-evaluation.md)を参照してください。','');
const destination=new URL(path+'llm01-supplement.md',root),text=out.join('\n');
if(process.argv.includes('--check'))assert.equal(readFileSync(destination,'utf8'),text);else writeFileSync(destination,text);
console.log('Verified supplementary report, fixed receipts and current source bindings');

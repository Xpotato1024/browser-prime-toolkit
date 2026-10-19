import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { verifySnapshot, verifyFactorResult } from '../src/engine/result.js';
const root=resolve(import.meta.dirname,'..'), source='docs/benchmarks/llm01-gmp-ecm.json';
const raw=readFileSync(join(root,source)), d=JSON.parse(raw), cases=new Map(d.corpus.map(c=>[c.id,c]));
const success=r=>['complete','probable'].includes(r.status);
for(const r of [...d.records,...d.poolRecords]) {
  const c=cases.get(r.case); assert.ok(c);
  if(r.reason==='host-timeout') verifySnapshot(r,c.input); else verifyFactorResult(r,c.input);
  if(success(r)) assert.deepEqual(r.factors.map(f=>f.value),c.factors);
}
assert.equal(d.records.length,204); assert.equal(d.poolRecords.length,32);
assert.deepEqual([d.quiet.networkRequests,d.quiet.httpRequests,d.quiet.badEvents],[0,0,0]);
assert.ok(d.poolRecords.every(r=>r.allLanesDisposed&&r.idleControllerDisposedDuringPool&&r.ownedLinearMemoryBytes<=134217728));
const median=rows=>{ if(!rows.length)return '—'; const v=rows.slice().sort((a,b)=>a-b),i=v.length>>1;
  return (v.length%2?v[i]:(v[i-1]+v[i])/2).toFixed(2); };
const stat=rows=>{const ok=rows.filter(success);return ok.length+'/'+rows.length+' / '+median(ok.map(r=>r.wallMs));};
const rows=(id,ms,alg)=>d.records.filter(r=>r.algorithm===alg&&r.timeBudgetMs===ms&&id(cases.get(r.case)));
const primary=[['10桁因数×2',c=>c.id.startsWith('balanced-10-')],['13桁因数×2',c=>c.id.startsWith('balanced-13-')],
 ['96bit入力',c=>c.id.startsWith('balanced-96bit-')],['112bit入力',c=>c.id.startsWith('balanced-112bit-')]];
const controls=[['101×13桁',c=>c.id==='unbalanced-101-13'],['13桁平方',c=>c.id==='square-13'],
 ['近接13桁因数',c=>c.id==='close-13'],['10桁×M127',c=>c.id==='unbalanced-10digit-m127'],['13桁×M127',c=>c.id==='unbalanced-13digit-m127']];
let text='# LLM-01: 低位GMP Brent・ECMの比較\n\n';
text+='測定日: '+d.measuredAt+'。測定コード: '+d.measuredHead+'。\n';
text+='[raw JSON](llm01-gmp-ecm.json) SHA256: '+createHash('sha256').update(raw).digest('hex')+'。\n\n';
text+='低位GMP Brentは今回のbridgeでnative Brentを上回りませんでした。ECMは大きい因数で有望ですが、112bitでは失敗が残り、最終engineの選定ではありません。\n\n';
text+='## 同一入力・予算の結果\n\n各セルは完了数/試行数 / 完了時warm中央値msです。失敗を除いた中央値だけで方式を評価しません。\n\n';
text+='| 入力群 | 予算ms | native Brent | GMP Brent | ECM |\n| --- | ---: | ---: | ---: | ---: |\n';
for(const [name,id] of primary) for(const ms of [100,1000]) text+='| '+name+' | '+ms+' | '+['brent','gmp-brent','gmp-ecm'].map(a=>stat(rows(id,ms,a))).join(' | ')+' |\n';
text+='\ncontrolの1秒結果も示します。M127は2^127−1で、runtimeのMR-fixed7に通ったprobable余因子です。M127の素数証明・誤り確率上限は付けません。\n\n';
text+='| control | native Brent | GMP Brent | ECM |\n| --- | ---: | ---: | ---: |\n';
for(const [name,id] of controls) text+='| '+name+' | '+['brent','gmp-brent','gmp-ecm'].map(a=>stat(rows(id,1000,a))).join(' | ')+' |\n';
text+='\nM127の行は全成功がprobable、他の完了はcompleteです。112bit ECMの1秒未完了2件は32曲線のalgorithm-exhausted、100msの未完了はtime-budgetです。予算延長だけで曲線数は増えません。\n\n';
text+='GMP Brentは固定scratch・mpz_mod・mpz_gcdを使いますが、各stepのJS checkpointもあります。遅さの原因をCPU profileで分離しておらず、GMP自体の性能限界とは扱いません。checkpoint batchingは操作上限・停止粒度の契約を再検証する次候補です。\n\n';
text+='PR3の限定MPQS結果は[以前の記録](llm01-wasm-mpqs.md)を再利用します。13桁群はMPQSも速い一方、10桁群には多項式数上限で失敗する入力がありました。ECMの有利な行だけでMPQS/真SIQSの代替と判断しません。\n\n';
text+='## 独立Workerの費用\n\n対象はbalanced-13-0とunbalanced-10digit-m127、seed開始1/11です。各行4試行、曲線/seedはlaneごとに分けます。\n\n';
text+='| 方式 | 本数 | 予算ms | 完了/試行 / warm中央値ms | 初期化中央値ms | 待機再生成中央値ms |\n| --- | ---: | ---: | ---: | ---: | ---: |\n';
for(const algorithm of ['gmp-brent','gmp-ecm']) for(const workers of [1,2]) for(const ms of [100,1000]) {
 const rr=d.poolRecords.filter(r=>r.algorithm===algorithm&&r.workers===workers&&r.timeBudgetMs===ms);
 text+='| '+algorithm+' | '+workers+' | '+ms+' | '+stat(rr)+' | '+median(rr.map(r=>r.initializationMs))+' | '+median(rr.map(r=>r.idleRecoveryMs))+' |\n';
}
text+='\n初期化と再生成はwarm欄に含みません。現在のharnessはpool前に単体Workerをdisposeし、全lane終了後に再生成します。総操作枠50Mを分配し、共有壁時計予算+100ms猶予、全終了経路でdisposeします。1/2本の線形メモリは64/128MiB、3本以上はこの候補profileで拒否します。終了済みWorkerのGC、JS heap、browser全体のpeak RAMは未測定です。2本を製品の既定値にはしません。\n\n';
text+='## 条件と検証範囲\n\n';
text+='- 旧PR3の11問・検証済み因数をそのまま再利用。新balanced96/112bitを各2問、新unbalancedを2問追加しました。新balancedの8因数は独立C uint64総当たりで計測外に証明しました。\n';
text+='- 全17問×3方式×2予算×2seed(1/11)=204単体計算、pool32計算です。旧342単体+72poolの長時間試験は再実行していません。\n';
text+='- warmはready後の入力受付・共通前処理・計算・配送・検算を含み、C arithmeticだけのmicrobenchmarkではありません。操作checkpoint数は方式間で同じCPU仕事量を意味しません。\n';
text+='- '+d.browser.product+' / V8 '+d.browser.jsVersion+'、WSL2 '+d.host.cpu+'、logical CPU '+d.host.logicalCpus+'、RAM '+d.host.memoryBytes+' bytes。電源状態・peak heap・mobileは未測定です。方式順はbrent→gmp-brent→gmp-ecmで無作為化しておらず、少数ケース・2seedの局所比較です。\n';
text+='- localhostの初回asset取得からreadyまで '+d.coldReadyMs.toFixed(2)+'ms。候補WorkerのJS asset '+d.artifact.bytes+' bytes、SHA256 '+d.artifact.sha256+'。通常Workerのsource JSもcontroller依存として初期importされます。全転送量の測定ではありません。\n';
text+='- 候補の3方式は同じ64MiB WASMを初期化します。通常Workerの16MiB設定・以前のcold値と混同しません。WASM '+d.wasmBuild.bytes+' bytes、SHA256 '+d.wasmBuild.sha256+'、新規container2回一致、実memory.grow拒否を確認しました。\n';
text+='- ready後HTTP/CDP/CSP/例外は0件。asset server停止・cache無効で両候補の計算と取消・再初期化を検証しました。Worker target自身のoffline emulationは非対応なので、page offlineとserver停止で補完します。検出器はCSP fetch・Worker CSP audit・navigation・Worker HTTPの正例でも確認しました。\n';
text+='- ECM取消テストのhost側cancel応答は '+d.cancelled.cancelMs.toFixed(2)+'ms、main timerは'+d.cancelled.heartbeat+'回動きました。回数は再初期化待ちも含み、nativeのどのstageにいたか、callback最大間隔の証明ではありません。\n';
text+='- ASan/UBSan400停止はstage2専用検証ではありません。OOM/trapを正常なincompleteへ必ず変換できるとは主張しません。詳細は[原本・配布境界](../architecture/gmp-ecm-source-review.md)を参照してください。\n\n';
text+='真SIQSは8objectのコンパイルのみで、リンク・実行・速度測定はしていません。有界relation/matrix/savefile・checked allocation・段階別取消のadapterが次の必要作業です。GNFSは[既存判断](../architecture/advanced-factorization-candidates.md#gnfs-の採否)を維持します。\n\n';
text+='この結果は非公開の評価用Draftに限定し、公開license・site capability・CSP・製品UI・merge・deployは変更しません。\n';
const destination=join(root,'docs/benchmarks/llm01-gmp-ecm.md');
if(process.argv.includes('--check')) assert.equal(readFileSync(destination,'utf8'),text,'Candidate report is stale');
else writeFileSync(destination,text);
console.log('Verified 204 individual + 32 pool receipts and derived report');

import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import { verifyFactorResult, verifySnapshot } from '../src/engine/result.js';
const root=resolve(import.meta.dirname,'..'),path='docs/benchmarks/llm01-bounded-siqs.json';
const raw=readFileSync(join(root,path)),d=JSON.parse(raw),cases=new Map(d.corpus.map(c=>[c.id,c]));
const sha=b=>createHash('sha256').update(b).digest('hex'),ok=r=>['complete','probable'].includes(r.status);
assert.equal(d.quick,false);assert.equal(d.records.length,136);assert.equal(d.corpus.length,17);
assert.deepEqual(d.corpus,JSON.parse(readFileSync(join(root,'docs/benchmarks/llm01-gmp-ecm.json'))).corpus);
for(const [path,hash] of Object.entries(d.sourceFiles)) assert.equal(sha(readFileSync(join(root,path))),hash,'Measurement source changed: '+path);
assert.deepEqual(d.siqsBuild,JSON.parse(readFileSync(join(root,'native/siqs/build.json'))));
assert.deepEqual(d.wasmBuild,JSON.parse(readFileSync(join(root,'native/gmp/build.json'))));
for(const r of d.records) {
  const c=cases.get(r.case);assert.ok(c);assert.equal(r.freshPerTrial,true,'Every comparison trial creates a fresh Worker');
  if(r.reason==='host-timeout') verifySnapshot(r,c.input);else verifyFactorResult(r,c.input);
  if(ok(r)) assert.deepEqual(r.factors.map(f=>f.value),c.factors);
  assert.ok(r.sampledRam.samples>0&&r.sampledRam.peakRssBytes>0&&r.sampledRam.peakPssBytes>0);
  if(r.audit?.liveBytes!==undefined)assert.equal(r.audit.liveBytes,0);
}
for(const point of [1,5,11,12,13])assert.ok(d.stage2Stop.details.mask&(1<<point));
assert.equal(d.faults.length,5);
for(const r of d.faults)assert.ok(r.details.injected&&r.details.poisoned&&r.retiredOld&&r.staleIgnored&&r.recovered.status==='complete');
assert.deepEqual([d.quiet.networkRequests,d.quiet.httpRequests,d.quiet.badEvents],[0,0,0]);
assert.equal(d.ownership.maxLive,1);
const median=values=>{if(!values.length)return '—';const v=values.toSorted((a,b)=>a-b),i=v.length>>1;return (v.length%2?v[i]:(v[i-1]+v[i])/2).toFixed(2);};
const stat=rows=>{const success=rows.filter(ok);return success.length+'/'+rows.length+' / '+median(success.map(r=>r.wallMs));};
const mib=n=>(n/1048576).toFixed(2);
const rows=(predicate,ms,alg)=>d.records.filter(r=>r.algorithm===alg&&r.timeBudgetMs===ms&&predicate(cases.get(r.case)));
const groups=[['64bit 10桁因数（1問）',c=>c.id.startsWith('balanced-10-')&&c.bits>=64],
 ['13桁因数×2（4問）',c=>c.id.startsWith('balanced-13-')],['96bit（2問）',c=>c.id.startsWith('balanced-96bit-')],
 ['112bit（2問）',c=>c.id.startsWith('balanced-112bit-')],['近接13桁因数（1問）',c=>c.id==='close-13']];
let text='# LLM-01: 有界SIQSとECM stage2の評価\n\n';
text+='有界SIQSの最小実行・停止・回復は成立しましたが、この実装は1秒枠の一般半素数を完了できず、性能上の採用根拠にはなりません。ECMは同じ比較で優勢ですが、112bitの未完了が残ります。最終engineの決定ではありません。\n\n';
text+='測定コード: '+d.measuredHead+'、日時: '+d.measuredAt+'。\n[raw JSON](llm01-bounded-siqs.json) SHA256 '+sha(raw)+'。\n\n';
text+='## 同じ対応域・予算の比較\n\n固定17問×2方式×2予算×2seed(1/11)=136試行です。各cellは完了数/試行数 / 完了時のready後中央値msです。失敗の時間を中央値から外すので、完了率と併記します。\n\n';
text+='| 入力群 | 予算ms | 有界SIQS+dense GF(2) | ECM |\n| --- | ---: | ---: | ---: |\n';
for(const [name,predicate] of groups)for(const ms of [100,1000])text+='| '+name+' | '+ms+' | '+['siqs','gmp-ecm'].map(a=>stat(rows(predicate,ms,a))).join(' | ')+' |\n';
text+='\nSIQSの64bit行は原本の多項式選択不可によるalgorithm-resource、他の上表の未完了はtime-budgetです。ECMの112bit/1秒の未完了2件は32曲線のalgorithm-exhaustedです。SIQSのbudget checkpointはループ内のclock確認も含み、性能要因をCPU profileで分離していません。上流msieve全体・Lanczosの性能限界とは扱いません。\n\n';
text+='## 範囲外と共通前処理のcontrol\n\n| control | SIQS 1秒 | ECM 1秒 |\n| --- | ---: | ---: |\n';
for(const [name,predicate] of [['61〜63bit（3問）',c=>c.id.startsWith('balanced-10-')&&c.bits<64],
 ['101×13桁（1問）',c=>c.id==='unbalanced-101-13'],['13桁平方（1問）',c=>c.id==='square-13'],
 ['10/13桁×M127（2問）',c=>c.id.endsWith('digit-m127')]])text+='| '+name+' | '+['siqs','gmp-ecm'].map(a=>stat(rows(predicate,1000,a))).join(' | ')+' |\n';
text+='\n61〜63bit・101 control・M127のSIQSはalgorithm-rangeです。平方は共通前処理で解け、SIQS本体の成功には数えません。M127を含む完了はprobableで、素数証明や確率上限を付けません。\n\n';
text+='[PR4のnative/GMP Brent比較](llm01-gmp-ecm.md)と[PR3の限定MPQS](llm01-wasm-mpqs.md)は固定済み履歴を再利用し、今回と同時測定とは扱いません。旧342+72試行を再実行していません。\n\n';
text+='## 初期化・資源の実測\n\n方式順を試行ごとに交互にし、全136比較で毎回旧Workerをdisposeして新しいWorkerを生成します。同時所有の最大は'+d.ownership.maxLive+' Workerです。各試行のready後時間は生成・compile/instantiateを含まず、初期化は別欄です。rawの全比較行でfreshPerTrial=trueを検証します。再利用時のほぼ0msを初期化中央値へ混ぜません。長期間反復したJIT warm測定ではなく、交互順は無作為化でもありません。\n\n';
text+='| 方式 | 初期化中央値ms | 試行標本の最大RSS MiB | 最大PSS MiB |\n| --- | ---: | ---: | ---: |\n';
for(const alg of ['siqs','gmp-ecm']) {const rr=d.records.filter(r=>r.algorithm===alg);text+='| '+alg+' | '+median(rr.map(r=>r.initializationMs))+' | '+mib(Math.max(...rr.map(r=>r.sampledRam.peakRssBytes)))+' | '+mib(Math.max(...rr.map(r=>r.sampledRam.peakPssBytes)))+' |\n';}
text+='\n初回localhost取得からSIQS readyまで '+d.coldReadyMs.toFixed(2)+'ms、取得した全source assetの実bytes合計 '+d.initialAssets.reduce((n,a)=>n+a.bytes,0)+' bytesです。圧縮/HTTP headerを含むnetwork wire量ではありません。通常Worker依存・両候補・診断bundleも初期取得に含み、rawで一覧化しています。\n\n';
text+='- SIQS WASM '+d.siqsBuild.bytes+' bytes / '+d.siqsBuild.sha256+'。ECM WASM '+d.wasmBuild.bytes+' bytes / '+d.wasmBuild.sha256+'。双方2回clean build一致、実memory.grow拒否。\n';
text+='- 各WASMのhard線形上限64MiB、stack1MiB。SIQSの管理heap上限32MiB、今回比較での実測管理peak '+mib(Math.max(...d.records.map(r=>r.audit?.peakBytes??0)))+'MiB。管理割当の正常/停止後liveは0でした。これらはbrowser全体RAMではありません。\n';
text+='- 専用Chromeの全taskのchildrenを集約したprocess treeを目標25ms間隔で標本化。全評価（起動・計算・取消・fatal回復を含む）'+d.sampledRam.samples+'標本、最大'+d.sampledRam.maxProcesses+' process、標本RSS peak '+mib(d.sampledRam.peakRssBytes)+'MiB、PSS peak '+mib(d.sampledRam.peakPssBytes)+'MiBです。\n';
text+='- ready後最初の比較直前の標本はRSS '+mib(d.records[0].sampledRam.first.rssBytes)+'MiB / PSS '+mib(d.records[0].sampledRam.first.pssBytes)+'MiB。RSS合算はshared pageを重複計数し、PSSは共有割合を配分します。終了済みWorkerのGC待ちやbrowser自体も含みます。短命process・標本間の瞬間ピークは捕捉できず、厳密RAM上限ではありません。\n';
text+='- '+d.browser.product+' / V8 '+d.browser.jsVersion+'、WSL2 '+d.host.cpu+'、logical CPU '+d.host.logicalCpus+'。電源・mobile・CPU profileは未測定です。proc読取の負荷も同じ比較条件に含みます。\n\n';
text+='## 段階停止・異常終了・通信\n\n';
text+='SIQSはnative ASan/UBSanで6段階停止、代表jobの全2528割当失敗、13境界probe、ABI・選択不可・後続exact回復を検証しました。WASMでも代表割当失敗と出力直前停止を検証しています。\n\n';
text+='ECMは実stage2を計装し、nativeで10候補中9地点の停止・正常exit・ecm_clear後・再利用を確認しました。point3は未到達です。実Chromeではpoint5で停止し、入口/出口/返却/cleanupが記録されました。dF='+d.stage2Stop.details.parameters.dF+'、k='+d.stage2Stop.details.parameters.k+'、S='+d.stage2Stop.details.parameters.S+'、NTT='+d.stage2Stop.details.parameters.ntt+'の通った経路だけの証拠です。無callback区間の最大時間証明ではありません。\n\n';
text+='実Chromeでtrap、GMP内部raw割当失敗1、ECM直接割当失敗3/4/5の計5種類を注入。全てpoison→controller error→Worker terminate、旧世代無視、明示restartの新Workerで101×103を確認しました。GMP OOMをlongjmpで回復したとは扱いません。通常の予算停止とfatal退役を分け、上流OOM全経路を改修したとは主張しません。\n\n';
text+='ready後HTTP/CDP/CSP/例外0件。cache無効・page offline・asset server停止下で両候補計算、取消と再初期化を確認しました。SIQSの別の正常完了smokeのみ10秒枠を使い、上表の1秒成功へ混ぜません。CDP/HTTP/CSP監視は通信の正例でも確認しました。Worker targetのoffline emulation非対応はserver停止で補完します。\n\n';
text+='このPRはprivate評価Draftです。次の候補はcheckpoint頻度のprofileと予算契約を保ったbatch化、または既に比較したECM/限定MPQSの明示的選択です。無制限SIQS/Lanczos/GNFS port、製品UI・site統合・公開license・配布・Ready/merge/deployは行いません。\n';
const destination=join(root,'docs/benchmarks/llm01-bounded-siqs.md');
if(process.argv.includes('--check'))assert.equal(readFileSync(destination,'utf8'),text,'SIQS report stale');else writeFileSync(destination,text);
console.log('Verified 136 comparison receipts, actual faults, source binding and sampled RAM report');

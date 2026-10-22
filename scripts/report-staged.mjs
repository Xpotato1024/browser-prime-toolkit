import {readFile} from 'node:fs/promises';
import {writeGenerated} from './generated-file.mjs';
const read=async p=>JSON.parse(await readFile(p,'utf8'));
const policy=await read('bench/staged-selected-policy.json'),train=await read('docs/benchmarks/llm01-staged-training.json'),holdout=await read('docs/benchmarks/llm01-staged-holdout.json'),life=await read('docs/benchmarks/llm01-staged-lifecycle.json');
const rows=data=>data.trials.map(t=>({...t.receipt.records[0],receipt:t.receipt,mode:t.receipt.variant}));
const ok=r=>['complete','probable'].includes(r.result.status),f=x=>Number.isFinite(x)?x.toFixed(2):'—';
function q(values,p){if(!values.length)return NaN;const a=values.toSorted((a,b)=>a-b),i=(a.length-1)*p,l=Math.floor(i);return a[l]+(a[Math.ceil(i)]-a[l])*(i-l);}
const dist=values=>values.length?f(q(values,.5))+' ['+f(q(values,.25))+'–'+f(q(values,.75))+']; '+f(Math.min(...values))+'–'+f(Math.max(...values)):'—';
const summary=r=>[r.filter(ok).length+'/'+r.length,r.filter(x=>x.result.status==='probable').length,dist(r.map(x=>x.result.requestWallMs)),dist(r.filter(ok).map(x=>x.result.requestWallMs))];
let lines=['# 初期化込み反復比較と段階選択',
'',
'一般群90試行だけで暫定'+policy.mode+'を選び、commit bc44bd7 で固定した後、別の未使用6入力×5seed×4方式＝120試行を実行しました。holdoutを見た調整はありません。小標本・単一PCでの暫定選択です。',
'',
'一般群コードhead: '+train.measuredHead+'。holdout head: '+holdout.measuredHead+'。',
'[一般群raw](llm01-staged-training.json)・[holdout raw](llm01-staged-holdout.json)・[取消/fatal raw](llm01-staged-lifecycle.json)・[方針](../../bench/staged-selected-policy.json)・[設計](../adr/0009-staged-selector.md)。',
'',
'各試行はfresh Chromeとfresh 1 Worker。asset取得はcoldReadyMsとして別記録し、取得後はサーバー停止・CDP offline・connect-src noneで計算します。requestはWorker生成前から1000ms、全体50000000 checkpoint操作。compile/初期化・prework・段階間・結果の配送と証明検査を含み、coreへ残時間から25msを差し引いて渡します。独立した操作枠の再付与はしません。',
'',
'表はresolved（completeまたはprobable）/全試行、うちprobable件数、全試行時間、resolvedだけの時間です。ms、中央値 [Q1–Q3]; min–max。四分位は(n−1)pの線形補間。未完了を捨てず、打切りを含む全試行列を方針選択に使用しました。',
''];
for(const [label,data]of [['一般群',train],['未使用holdout',holdout]]){
 const all=rows(data);
 lines.push('## '+label,'','| 方式 | resolved | probable | 全試行request ms | resolved request ms |','| --- | --- | --- | --- | --- |');
 for(const mode of data.variants)lines.push('| '+[mode,...summary(all.filter(r=>r.mode===mode))].join(' | ')+' |');
 lines.push('','| 入力 | 方式 | resolved | probable | 全試行request ms | resolved request ms |','| --- | --- | --- | --- | --- | --- |');
 for(const id of new Set(all.map(r=>r.case)))for(const mode of data.variants)lines.push('| '+[id,mode,...summary(all.filter(r=>r.case===id&&r.mode===mode))].join(' | ')+' |');
 lines.push('','終了状態: '+JSON.stringify(Object.fromEntries(data.variants.map(mode=>[mode,Object.fromEntries([...new Set(all.filter(r=>r.mode===mode).map(r=>r.result.status+'/'+r.result.reason))].map(key=>[key,all.filter(r=>r.mode===mode&&r.result.status+'/'+r.result.reason===key).length]))])))+'。','');
}
lines.push('## 初期化と資源','',
'固定WASM線形メモリ上限はnative 0、ECM/SIQS 64MiB、複合段階128MiB（固定2moduleの合計）。Workerは同時1、全試行で退役済み。RAMは25ms間隔のChrome子孫tree RSS/PSSの標本であり、瞬間最大やhard boundではありません。',
'',
'| 群/方式 | 初期化ms中央値 | cold asset ms中央値 | 標本peak RSS MiB 中央値/最大 | 標本peak PSS MiB 中央値/最大 | request >1000ms 件数/最大ms |',
'| --- | --- | --- | --- | --- | --- |');
for(const [label,data]of [['一般',train],['holdout',holdout]])for(const mode of data.variants){
 const r=rows(data).filter(r=>r.mode===mode),rss=r.map(x=>x.sampledRam.peakRssBytes/2**20),pss=r.map(x=>x.sampledRam.peakPssBytes/2**20),walls=r.map(x=>x.result.requestWallMs);
 lines.push('| '+[label+'/'+mode,f(q(r.map(x=>x.result.initializationMs).filter(x=>x!==null),.5)),f(q(r.map(x=>x.receipt.coldReadyMs),.5)),f(q(rss,.5))+'/'+f(Math.max(...rss)),f(q(pss,.5))+'/'+f(Math.max(...pss)),walls.filter(x=>x>1000).length+'/'+f(Math.max(...walls))].join(' | ')+' |');
}
const first=train.trials[0].receipt;
lines.push('','初回asset合計 '+first.initialAssets.reduce((n,a)=>n+a.bytes,0)+' bytes。比較harnessは全方式の固定bundleを共通に取得し、実行時に選択profileだけをcompileします。この転送量は製品の配信構成ではありません。coldはローカルHTTPの取得時間で、インターネット配信性能を示しません。','',
'時間はcheckpointとhost taskで検査するため、要求1000msと観測壁時計の一致を保証しません。上表に超過も含めます。各方式のcheckpoint操作は異なる算術仕事を表すため、同じ操作上限は同じCPU命令数を意味しません。','',
'## 取消・fatal・意味の保持','',
'| profile | loading取消応答ms | running取消応答ms | fatal |','| --- | --- | --- | --- |');
for(const r of life.receipts)lines.push('| '+[r.variant,f(r.lifecycle.loading.abortResponseMs),f(r.lifecycle.running.abortResponseMs),r.lifecycle.fatal?'実ECM trap→退役→次request回復':'対象外'].join(' | ')+' |');
lines.push('','4profileすべてloading/runningのaborted=trueを確認し、計算先行終了を取消実証へ混ぜていません。取消はhostが1 Workerをterminateし、未取得の最終native traceはnull/traceAvailable:falseです。fatalのstaged profileはSIQS nativeLogical=0のままrejectし、失敗を別方式へのfallbackで隠しません。lifecycleは主測定前に同じsource hashで実行し、測定HEAD自体は記録していないためsourceMatchingCommitとして保存しています。','',
'段階の通常予算切れだけ次へ進み、global予算切れ・資源不足は残余を保持します。probableは証明済み素数へ昇格しません。128bit未満を事前検証し、SIQS residualは64〜128bitに限ります。旧raw、未採用方式、原本pinと再現情報は[保全目録](comparison-catalog.md)で保持します。','',
'再現: scripts/experiment-staged.mjs --group train|holdout --directory <新保存先>。holdoutは一般群の選択を先に固定した現行commit用で、再測定を学習用に戻しません。既存outの上書きを拒否します。scripts/check-staged.mjsは全直積・順序・exact product/確度・source hash・資源・通信・lifecycleを検査します。','',
'公開前の本人判断は[短い判断リスト](../architecture/staged-publication-decisions.md)へ戻します。UI、site/CSP、license、配布、公開はこの段階に含みません。');
await writeGenerated(new URL('../docs/benchmarks/llm01-staged.md',import.meta.url),lines.join('\n')+'\n');
console.log('Verified generated staged repeated-measurement report');

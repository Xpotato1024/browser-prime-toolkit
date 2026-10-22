// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';import{readFileSync,writeFileSync,existsSync}from'node:fs';import{execFileSync}from'node:child_process';import{createHash}from'node:crypto';
import{sameFamilies}from'./scheduler-packets.mjs';import{validateStreamRecord}from'./sustained-proof.mjs';import{pairedDecision,extensionGate,grownCancelSafe}from'./sustained-decision.mjs';import{knownDetachedSetup}from'./resource-ui-cdp-lifecycle.mjs';
import{validateCampaign,OLD_HEAD,CURRENT}from'./sustained-continuation-proof.mjs';
const read=p=>readFileSync(p),run=JSON.parse(read(CURRENT+'/run.json')),target='docs/benchmarks/llm01-sustained.md';const{all,groups,complete}=validateCampaign(run);
const MiB=1048576,n=x=>Number(x).toFixed(1),maximum=(rows,key)=>Math.max(0,...rows.map(x=>x[key]??0));
let out='# LLM-01 集約方式・持続計測\n\n測定core `'+run.measuredHead+'`、旧core `'+OLD_HEAD+'`。plan `'+run.plan+'`。'+run.startedAt+' → '+(run.completedAt??run.stoppedAt)+'。PR17と旧Stage22の原本は保持。\n\n';
out+='Stage23は4集約試行の取得後、入力IDが試行IDを上書きした集計不具合で停止しました。旧manifest/raw/log/計算sourceは保持し、Stage24は識別子を分離して残予定だけ実行しました。旧系列を完了扱いにせず、両headのsource/hashを検証しています。\n\n';
out+=complete?'事前登録した条件付き系列が完了しました。\n\n':'系列は停止しました: '+run.stopReason+'。未実施を成功や方式不採用として扱いません。\n\n';
out+='数値kernel/WASM/Worker/設定/credit/役割capはPR17と同じです。変更は開始前ナビゲーションの30秒上限と配信trace、有限のstreaming SHA256監査とhost event保持です。hashのCPU/JSコストを含む同条件比較で、旧60秒系列との速度差を直接因果推定しません。\n\n';
out+='| 試行 | Worker | 予算秒 | 結果 | usable | full | SLP | DLP | cycle | polys |\n| --- | ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |\n';
for(const r of all){const o=r.outcome,c=o.collectorStats;out+='| '+[r.id,r.workers,r.budgetMs/1000,o.kind+'/'+o.reason,o.relations,c.full,c.slp,c.dlp,c.cycles,o.polynomialsSubmitted].join(' | ')+' |\n';}
out+='\n| 試行 | coord peak linear MiB | coord peak requested MiB | Chrome peak RSS/PSS MiB | audit peak input MiB | 累積packet MiB | max返却→受理ms | owner/global待ちms |\n| --- | ---: | ---: | --- | ---: | ---: | ---: | --- |\n';
for(const r of all){const m=r.outcome.memoryByOwner.find(x=>x.owner===0);out+='| '+[r.id,n(m.peakLinearBytes/MiB),n(m.peakRequestedBytes/MiB),n(r.sampledRam.peakRssBytes/MiB)+'/'+n(r.sampledRam.peakPssBytes/MiB),n(r.streamAudit.peakPendingBytes/MiB),n(r.streamAudit.totalPacketBytes/MiB),n(r.handoff.maxAcceptedWaitMs),n(r.handoff.blockedIdleMs)+'/'+n(r.handoff.globalCapacityIdleMs)].join(' | ')+' |\n';}
out+='\n| 持続/取消試行 | coord requested最初→最後 MiB | coord linear最初→最後 MiB | Chrome PSS開始窓→終了窓 MiB | cancel要求→退役API ms |\n| --- | --- | --- | --- | ---: |\n';
for(const r of [...groups.sustained,...groups.cancels,...groups.extension]){
 const t=r.progressTimeline,first=t[0]?.memory,last=t.at(-1)?.memory;
 const span=r.outcome.requestWallMs,ram=r.ramTimeline.map(x=>({...x,relativeMs:x.atMs-r.ramOriginMs}));
 const mean=a=>a.length?n(a.reduce((v,x)=>v+x.pssBytes,0)/a.length/MiB):'未観測';
 const begin=mean(ram.filter(x=>x.relativeMs>=5000&&x.relativeMs<15000)),end=mean(ram.filter(x=>x.relativeMs>=span-10000&&x.relativeMs<=span));
 out+='| '+[r.id,first&&last?n(first.liveRequested/MiB)+'→'+n(last.liveRequested/MiB):'未観測',first&&last?n(first.linearBytes/MiB)+'→'+n(last.linearBytes/MiB):'未観測',begin+'→'+end,r.cancelToRetirementMs===null?'—':n(r.cancelToRetirementMs)].join(' | ')+' |\n';
}
out+='\nRAM時系列は各rawのramTimeline（Node単調時計、ramOriginMsがCDP測定呼出直前）です。progressTimelineはbrowser request開始からの時計で、厳密な同時計とは扱いません。250ms sampleのRSS/PSSは観測でOS/全tabの上限保証ではありません。coordinator requested/linearはgraphとcontextを含み、hash/JS/輸送/ブラウザoverheadとは別です。host assigned wall occupancyをCPU使用率とは呼びません。hashFlushMsはWorker退役後の監査完了待ちです。\n\n';
out+='集約方式判定: `'+JSON.stringify(run.coordinatorDecision??null)+'`。\n\n300秒判定: `'+JSON.stringify(run.sustainedDecision??null)+'`。\n\n600秒開始gate: `'+JSON.stringify(run.extensionGate??null)+'`。\n\n600秒判定: `'+JSON.stringify(run.extensionDecision??null)+'`。\n\n';
const maxCoord=Math.max(0,...all.map(r=>r.outcome.memoryByOwner.find(m=>m.owner===0)?.peakLinearBytes??0)),oom=all.filter(r=>r.outcome.reason==='wasm-oom'&&r.outcome.fatal?.memory?.allocationFailures>0).map(r=>r.id);
out+='## メモリ予算の判断\n\n現在の手動選択肢は128/256/384/512MiBです。以下は予算内で選ばれるcompiled hardcap合計（MiB）で、予約/初期割当量ではありません。\n\n| 手動予算 | 1 Worker | 2 | 3 | 4 |\n| ---: | ---: | ---: | ---: | ---: |\n| 128 | 128 | 不可 | 不可 | 不可 |\n| 256 | 256 | 192 | 256 | 不可 |\n| 384 | 256 | 320 | 384 | 320 |\n| 512 | 256 | 320 | 384 | 448 |\n\n';
out+='観測最大coordinator linearは'+n(maxCoord/MiB)+'MiB、実WASM OOM証拠は'+JSON.stringify(oom)+'です。追加検討gate（256MiBの90%以上または記録付きOOM）は'+(maxCoord>=256*MiB*.9||oom.length?'成立':'不成立')+'。'+(maxCoord>=256*MiB*.9||oom.length?'有限768MiB/512MiB coordinator案の別検証が必要で、自動増量はしません。':'現時点で上限を増やす実測上の必要性がなく、512MiB総予算・既存artifactを維持します。')+'deviceMemoryは空きRAMではなく、予算数値だけ増やしてもartifactの実上限は変わりません。\n\n';
out+='RSA100完了や全工程所要時間を収量から外挿しません。自動最大2や既存UIを変更せず、本番統合・公開・deployも行いません。物理スマホ/Safari/Firefoxは未検証です。\n\n## 全raw・負の結果\n\n';
for(const phase of ['preflight','controls','coordinator','sustained','cancels','extension'])for(const r of run[phase]){const dir=r.evidenceDir;out+='- '+r.id+': '+(r.rawSha256?'[raw]('+dir.slice('docs/benchmarks/'.length)+'/'+r.id+'.json), ':'')+'[log]('+dir.slice('docs/benchmarks/'.length)+'/'+r.id+'.log)\n';}
out+='\n[旧manifest](staged-sustained-stage23/run.json) と [継続manifest](staged-sustained-stage24/run.json) が全hash・測定head・開始前後RAMと判定を固定します。試行の上書き/自動retryはありません。\n';
if(process.argv.includes('--check'))assert.equal(read(target).toString(),out);else writeFileSync(target,out);
console.log('Verified sustained source/commit/raw/log/quiet/family/cap/time and exact paired decisions');

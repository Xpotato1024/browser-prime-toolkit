// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';import{readFileSync,writeFileSync,existsSync}from'node:fs';import{execFileSync}from'node:child_process';import{createHash}from'node:crypto';
import{sameFamilies}from'./scheduler-packets.mjs';import{validateStreamRecord}from'./sustained-proof.mjs';import{pairedDecision,extensionGate,grownCancelSafe}from'./sustained-decision.mjs';import{knownDetachedSetup}from'./resource-ui-cdp-lifecycle.mjs';
const dir='docs/benchmarks/staged-sustained-stage23',target='docs/benchmarks/llm01-sustained.md',read=p=>readFileSync(p),sha=b=>createHash('sha256').update(b).digest('hex'),run=JSON.parse(read(dir+'/run.json')),plan=JSON.parse(read('bench/staged-sustained-plan.json')),cache=new Map();
assert.equal(run.plan,plan.id);assert.equal(run.planSha256,sha(read('bench/staged-sustained-plan.json')));assert.match(run.measuredHead,/^[a-f0-9]{40}$/);
for(const[phase,key]of [['coordinator','coordinatorTrials'],['sustained','sustainedTrials'],['cancels','cancelControls'],['extension','extensionTrials']]){
 const actual=run[phase].map(({id,coordinator,workers,repeat,budgetMs,cancelAfterMs})=>({id,coordinator,workers,...(repeat===undefined?{}:{repeat}),budgetMs,...(cancelAfterMs===undefined?{}:{cancelAfterMs})}));
 assert.deepEqual(actual,plan[key].slice(0,actual.length),'Predeclared ordered phase '+phase);
}
const all=[],groups={};let complete=Boolean(run.completedAt);assert.notEqual(complete,Boolean(run.stoppedAt));const ids=new Set();
for(const phase of ['preflight','controls','coordinator','sustained','cancels','extension']){
 groups[phase]=[];
 for(const row of run[phase]){
  assert.ok(!ids.has(row.id));ids.add(row.id);assert.equal(sha(read(dir+'/'+row.id+'.log')),row.logSha256);
  if(row.exitCode!==0||row.signal||row.error){assert.ok(!complete&&run.stopReason);if(row.rawSha256)assert.equal(sha(read(dir+'/'+row.id+'.json')),row.rawSha256);else assert.equal(existsSync(dir+'/'+row.id+'.json'),false);continue;}
  const raw=read(dir+'/'+row.id+'.json');assert.equal(sha(raw),row.rawSha256);const r=JSON.parse(raw);assert.equal(r.measuredHead,run.measuredHead);assert.equal(r.coordinator,row.coordinator);assert.equal(r.budgetMs,row.budgetMs);assert.equal(r.caseId,phase==='preflight'?null:plan.case);
  assert.deepEqual(r.quiet,{networkRequests:0,httpRequests:0,badEvents:0,assetServerStopped:true,cacheDisabled:true});assert.deepEqual(r.detectorSelfTest,{blockedPageFetchCsp:true,pageCdpAndHttp:true,workerCdpAndHttp:true});
  assert.equal(r.ownership.live,0);assert.equal(r.ownership.liveSources,0);assert.ok(r.ownership.maxLive<=row.workers);
  for(const[p,h]of Object.entries(r.sourceFiles)){if(!cache.has(p)){const actual=sha(read(p));assert.equal(actual,sha(execFileSync('git',['show',run.measuredHead+':'+p],{maxBuffer:16*1024*1024})),p);cache.set(p,actual);}assert.equal(cache.get(p),h,'Every receipt source '+p);}
  const proof=r.detachedSetupProof;for(const d of r.detachedBeforeResume)assert.ok(knownDetachedSetup(d,{detached:new Set(proof.detached),active:new Set(proof.active),workers:new Set(proof.workers)}));
  assert.ok(r.ramTimeline.length>0&&r.ramTimeline.length<=4000);assert.equal(r.sampledRam.samples,r.ramTimeline.length);assert.deepEqual(r.sampledRam.first,r.ramTimeline[0]);assert.equal(r.sampledRam.peakRssBytes,Math.max(...r.ramTimeline.map(x=>x.rssBytes)));assert.equal(r.sampledRam.peakPssBytes,Math.max(...r.ramTimeline.map(x=>x.pssBytes)));assert.ok(r.ramTimeline.every((x,i,a)=>Number.isFinite(x.atMs)&&x.rssBytes>=0&&x.pssBytes>=0&&(!i||x.atMs>=a[i-1].atMs)));
  const nav=r.startupTrace.filter(x=>x.event==='navigate-start')[0],returned=r.startupTrace.filter(x=>x.event==='navigate-returned')[0];assert.ok(nav&&returned&&returned.atMs>=nav.atMs&&returned.atMs-nav.atMs<=30100);
  if(phase==='preflight'){assert.equal(r.records[0].tests.length,16);assert.ok(r.records[0].tests.every(t=>t.pass));continue;}
  const record={...row,...r.records[0],sampledRam:r.sampledRam,ramTimeline:r.ramTimeline,ramOriginMs:r.ramOriginMs};validateStreamRecord(record);assert.equal(record.cancelAfterMs,row.cancelAfterMs??null);
  const o=record.outcome;assert.equal(o.workers,row.workers);assert.equal(o.coordinatorCompute,row.coordinator==='combined');assert.equal(o.maximumWasmBytes,(256+64*(row.workers-1))*1048576);
  assert.ok(o.memoryByOwner.every(m=>m.peakLinearBytes<=o.resourcePlan.ownerCapsMiB[m.owner]*1048576));assert.ok(o.peakTransportBytes<=33554432);assert.ok(o.creditState.peakOutstanding<=4&&o.creditState.peakReservedBytes<=33554432);
  if(phase==='cancels')assert.ok(grownCancelSafe(record),'Native graph grew before cancel');groups[phase].push(record);all.push(record);
 }
}
if(all.length)assert.deepEqual(sameFamilies(all),run.familyProof);
if(run.fixedFamilyProof){const reference=JSON.parse(read('docs/benchmarks/staged-resources-stage21/fixed-w4.json')).records[0];assert.deepEqual(sameFamilies([...groups.controls,reference],{fixed:true}),run.fixedFamilyProof);}
if(run.coordinatorDecision)assert.deepEqual(pairedDecision(groups.coordinator,{baseline:'combined',candidate:'dedicated',label:r=>r.coordinator}),run.coordinatorDecision);
if(run.sustainedDecision)assert.deepEqual(pairedDecision(groups.sustained,{baseline:'2',candidate:'4',label:r=>String(r.workers)}),run.sustainedDecision);
if(run.extensionGate)assert.deepEqual(extensionGate({records:groups.sustained,cancels:groups.cancels,availableMiB:run.extensionGate.availableMiB,now:run.extensionGate.checkedAt}),run.extensionGate);
if(run.extensionDecision)assert.deepEqual(pairedDecision(groups.extension,{baseline:'2',candidate:'4',label:r=>String(r.workers)}),run.extensionDecision);
if(complete){assert.equal(run.preflight.length,5);assert.equal(groups.controls.length,3);assert.equal(groups.coordinator.length,4);assert.equal(groups.sustained.length,4);assert.equal(groups.cancels.length,2);assert.equal(groups.extension.length,run.extensionGate.eligible?4:0);assert.ok(run.fixedFamilyProof);}
const MiB=1048576,n=x=>Number(x).toFixed(1),maximum=(rows,key)=>Math.max(0,...rows.map(x=>x[key]??0));
let out='# LLM-01 集約方式・持続計測\n\n測定core `'+run.measuredHead+'`。plan `'+run.plan+'`。'+run.startedAt+' → '+(run.completedAt??run.stoppedAt)+'。PR17と旧Stage22の原本は保持。\n\n';
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
for(const phase of ['preflight','controls','coordinator','sustained','cancels','extension'])for(const r of run[phase])out+='- '+r.id+': '+(r.rawSha256?'[raw](staged-sustained-stage23/'+r.id+'.json), ':'')+'[log](staged-sustained-stage23/'+r.id+'.log)\n';
out+='\n[manifest](staged-sustained-stage23/run.json) が全hash・測定head・開始前後RAMと判定を固定します。試行の上書き/自動retryはありません。\n';
if(process.argv.includes('--check'))assert.equal(read(target).toString(),out);else writeFileSync(target,out);
console.log('Verified sustained source/commit/raw/log/quiet/family/cap/time and exact paired decisions');

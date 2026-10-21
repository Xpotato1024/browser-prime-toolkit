// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {validateCampaign,compareAccepted,median,sha} from './graph-evidence.mjs';
const base='docs/benchmarks/staged-lp-map-stage36',campaign=validateCampaign(base);
// Windows CIM emitted no final newline. Preserve its exact bytes as base64,
// and keep the readable JSON copy consistent with the original receipt.
const encoded=readFileSync(base+'/windows-memory.original.base64','utf8');
assert.match(encoded,/^[A-Za-z0-9+/]+={0,2}\n$/);
const w=Buffer.from(encoded.trimEnd(),'base64');
assert.equal(w.toString('base64')+'\n',encoded);
assert.equal(sha(w),campaign.run.windowsMemorySha256);assert.deepEqual(JSON.parse(w),campaign.run.windowsMemory);
assert.equal(readFileSync(base+'/windows-memory.json','utf8'),w.toString('utf8')+'\n');
assert.ok(campaign.run.windowsMemory.availableMiB>=4096);
assert.ok(Date.parse(campaign.run.startedAt)-Date.parse(campaign.run.windowsMemory.checkedAt)>=0&&Date.parse(campaign.run.startedAt)-Date.parse(campaign.run.windowsMemory.checkedAt)<=300000);
const rows=campaign.records.filter(x=>x.row.fixedFamilies===64);
assert.equal(rows.length,4);compareAccepted(rows,64);
const owner=x=>x.record.outcome.memoryByOwner[0],by=g=>rows.filter(x=>x.row.graph===g);
for(const x of rows){
 const o=x.record.outcome;
 assert.equal(o.kind,'incomplete');assert.equal(o.reason,'fixed-family-bound');assert.equal(o.familiesSubmitted,64);
 assert.equal(o.workers,4);assert.equal(o.maximumWasmBytes,448*1048576);
 assert.deepEqual(o.resourcePlan.ownerCapsMiB,[256,64,64,64]);assert.ok(o.creditState.peakOutstanding<=8);
 assert.equal(o.collectorStats.usable,1706);assert.equal(owner(x).last.allocationFailures,0);
 const p=x.record.graphSnapshots.find(s=>s.prefix===64).profile;assert.equal(p.length,19);
 assert.equal(p[11],p[10]*(x.row.graph==='lpmap'?8:16));
}
const med=(g,f)=>median(by(g).map(f));
const live=med('lpmap',x=>owner(x).last.liveRequested)/med('baseline',x=>owner(x).last.liveRequested);
const wall=med('lpmap',x=>x.record.outcome.requestWallMs)/med('baseline',x=>x.record.outcome.requestWallMs);
const pss=med('lpmap',x=>x.receipt.sampledRam.peakPssBytes)/med('baseline',x=>x.receipt.sampledRam.peakPssBytes);
const accepted=live<=.95&&wall<=1.05&&pss<=1.10;
const pct=n=>(100*(n-1)).toFixed(2)+'%',mi=n=>(n/1048576).toFixed(2);
let out='# LLM-01 LP map幅縮小の固定対照\n\n';
out+='PR19 head3826a590を保持し、測定head '+campaign.run.head+'、同じ4Worker/8枠・64familyのABBAを実行した。全packet/共通列/counterが一致し、全試行のusableは1706。wire/LP設定/数学条件は変更していない。\n\n';
out+='| 試行 | request秒 | coordinator live/linear MiB | Chrome peak PSS MiB |\n| --- | ---: | --- | ---: |\n';
for(const x of rows)out+='| '+[x.row.id,(x.record.outcome.requestWallMs/1000).toFixed(3),mi(owner(x).last.liveRequested)+' / '+mi(owner(x).last.linearBytes),mi(x.receipt.sampledRam.peakPssBytes)].join(' | ')+' |\n';
out+='\nlive中央値 '+pct(live)+'、時間 '+pct(wall)+'、PSS '+pct(pss)+'。事前のlive5%以上減/時間1.05倍/PSS1.10倍gateは'+(accepted?'成立し、LP map分離を採用する':'不成立で不採用')+'。速度向上の主張はしない。\n\n';
out+='数値gateの判断と実反映は別で、選定入口はPR19 Nativeのまま。入口反映と長枠用Worker/host実装は自動承認レビューの拒否で保留している。長枠は未実施。\n\n';
out+='profileのkey/value容量下限は3,670,016→1,835,008bytes。allocator総liveは24,217,635→22,120,547bytesで、control/容量丸め/structの影響も含むため差を同じ指標と呼ばない。u32外のキーはu64 fallbackに保持し、境界/同一下位32bit/混在cycle/置換をNative probeで確認した。40/64桁の全packet/列/counter/因子とterminal後のfresh recoveryも成功した。\n\n';
out+='開始前Windows空きRAM '+campaign.run.windowsMemory.availableMiB+'MiB、各試行前WSL空きRAM4096MiB以上。計算前のCIM呼出し失敗は旧runのローカルlogに保存し、Windows側の正規Desktop Commander読取証跡へ修正した。最初の失敗では計算試行0。成功campaignは '+campaign.run.startedAt+'〜'+campaign.run.completedAt+'。各試行前後のHEAD/bytes guard、原本/log SHA、plan/driver/sourceの歴史結合、offline/検出器自己試験/全退役、事前契約16件が成功した。\n\n';
out+='[run原本](staged-lp-map-stage36/run.json)、[事前契約](../contracts/lp-map.md)。この結果はRSA100完了や全工程所要時間を示さない。長時間・大行列の資源検証は別の有限planへ進める。\n';
const path='docs/benchmarks/llm01-lp-map.md';
if(process.argv.includes('--check'))assert.equal(readFileSync(path,'utf8'),out);else writeFileSync(path,out);
console.log(JSON.stringify({accepted,liveRatio:live,wallRatio:wall,pssRatio:pss,measuredHead:campaign.run.head,completedAt:campaign.run.completedAt}));

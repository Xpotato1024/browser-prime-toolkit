// SPDX-License-Identifier: AGPL-3.0-only
import test from 'node:test';import assert from 'node:assert/strict';import{pairedDecision,extensionGate}from'../scripts/sustained-decision.mjs';
const row=(id,workers,repeat,relations)=>({id,workers,repeat,outcome:{workers,relations,kind:'timeout',reason:'time-budget',allWorkersDisposed:true,allWorkerSourcesReleased:true,peakTransportBytes:0,maximumWasmBytes:(256+64*(workers-1))*1048576,collectorStats:{usable:relations},memoryByOwner:[{owner:0,peakLinearBytes:100*1048576}]}});
test('both exact paired gains are necessary and abnormal or duplicate baselines fail closed',()=>{
 const a=[row('2r1',2,1,100),row('4r1',4,1,110),row('4r2',4,2,110),row('2r2',2,2,100)];
 assert.equal(pairedDecision(a,{baseline:'2',candidate:'4',label:r=>String(r.workers)}).qualifies,true);
 a[2].outcome.relations=109;a[2].outcome.collectorStats.usable=109;assert.equal(pairedDecision(a,{baseline:'2',candidate:'4',label:r=>String(r.workers)}).qualifies,false);
 assert.throws(()=>pairedDecision([...a,a[0]],{baseline:'2',candidate:'4',label:r=>String(r.workers)}));
 const b=structuredClone(a);b[0].outcome.relations=0;b[0].outcome.collectorStats.usable=0;assert.throws(()=>pairedDecision(b,{baseline:'2',candidate:'4',label:r=>String(r.workers)}));
});
test('600s extension requires measured safety, grown cancels, RAM, cap and time gates',()=>{
 const records=[row('a',2,1,100),row('b',4,1,120),row('c',4,2,120),row('d',2,2,100)];
 const cancels=[2,4].map(workers=>({workers,cancelAfterMs:120000,cancelRequestedAtMs:120000,cancelToRetirementMs:10,outcome:{...row('x',workers,1,30).outcome,kind:'cancelled',reason:'user-cancel',requestWallMs:120010,familiesSubmitted:20,collectorStats:{usable:30,ingested:100,vertices:20,treeEdges:10,cycles:1}},progressTimeline:[{collectorStats:{ingested:10,vertices:1,treeEdges:1,cycles:0}},{collectorStats:{ingested:100,vertices:20,treeEdges:10,cycles:1}}]}));
 const options={records,cancels,availableMiB:8192,now:'2026-10-20T19:00:00Z'};
 assert.equal(extensionGate(options).eligible,true);
 const noGrowth=cancels.map(r=>({...r,progressTimeline:[{collectorStats:r.outcome.collectorStats},{collectorStats:r.outcome.collectorStats}]}));assert.equal(extensionGate({...options,cancels:noGrowth}).eligible,false);
 const emptyGraph=cancels.map(r=>({...r,outcome:{...r.outcome,collectorStats:{usable:0,ingested:0,vertices:0,treeEdges:0,cycles:0}},progressTimeline:[{collectorStats:{ingested:0,vertices:0,treeEdges:0,cycles:0}},{collectorStats:{ingested:0,vertices:0,treeEdges:0,cycles:0}}]}));assert.equal(extensionGate({...options,cancels:emptyGraph}).eligible,false);
 for(const change of [{availableMiB:4095},{now:'2026-10-20T20:30:00Z'},{cancels:[]},{records:records.map(r=>({...r,outcome:{...r.outcome,memoryByOwner:[{owner:0,peakLinearBytes:200*1048576}]}}))}])assert.equal(extensionGate({...options,...change}).eligible,false);
});

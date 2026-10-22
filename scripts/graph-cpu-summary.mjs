// SPDX-License-Identifier: AGPL-3.0-only
import assert from'node:assert/strict';
export function summarizeCpuProfile(profile){
 assert.ok(profile&&Array.isArray(profile.nodes)&&profile.nodes.length<=20000&&Array.isArray(profile.samples)&&profile.samples.length>0&&profile.samples.length<=100000);
 assert.ok(Number.isFinite(profile.startTime)&&Number.isFinite(profile.endTime)&&profile.endTime>profile.startTime&&profile.endTime-profile.startTime<=25000000,'Finite actual CPU capture <=25s');
 const nodes=new Map(profile.nodes.map(n=>[n.id,n]));assert.equal(nodes.size,profile.nodes.length);
 const parent=new Map();for(const n of nodes.values())for(const id of n.children??[]){assert.ok(nodes.has(id)&&!parent.has(id));parent.set(id,n.id);}
 const self=new Map(),inclusive=new Map();
 for(const id of profile.samples){assert.ok(nodes.has(id));self.set(id,(self.get(id)??0)+1);let at=id;const seen=new Set();while(at!==undefined){assert.ok(!seen.has(at)&&seen.size<512);seen.add(at);inclusive.set(at,(inclusive.get(at)??0)+1);at=parent.get(at);}}
 const top=(counts,n)=>[...counts].sort((a,b)=>b[1]-a[1]||a[0]-b[0]).slice(0,n).map(([id])=>id);
 const ids=[...new Set([...top(self,32),...top(inclusive,32)])];
 return{sampleCount:profile.samples.length,startTime:profile.startTime,endTime:profile.endTime,durationUs:profile.endTime-profile.startTime,top:ids.map(id=>({id,functionName:nodes.get(id).callFrame.functionName,url:nodes.get(id).callFrame.url,selfSamples:self.get(id)??0,inclusiveSamples:inclusive.get(id)??0,selfPercent:100*(self.get(id)??0)/profile.samples.length,inclusivePercent:100*(inclusive.get(id)??0)/profile.samples.length})),scope:'sampling diagnostic including prepare and wrapper; not hardware utilization or an end-to-end forecast'};
}

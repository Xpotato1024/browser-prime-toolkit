// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Xpotato.net / Xpotato1024
import assert from 'node:assert/strict';
export function geometryDecision(rows){
 const names=['b325-m524','b250-m524','b325-m262','b250-m262'],seen=new Set();assert.equal(rows.length,8);
 for(const r of rows){assert.ok(names.includes(r.profile)&&[1,2].includes(r.repeat));const k=r.profile+':'+r.repeat;assert.ok(!seen.has(k));seen.add(k);const o=r.outcome;assert.equal(o.kind,'timeout');assert.equal(o.reason,'time-budget');assert.equal(o.allWorkersDisposed,true);assert.equal(o.allWorkerSourcesReleased,true);for(const key of ['relations','target'])assert.ok(Number.isSafeInteger(o[key])&&o[key]>0&&o[key]<=1000000);}
 const get=(name,r)=>rows.find(x=>x.profile===name&&x.repeat===r).outcome;
 const compare=(a,b)=>{const x=BigInt(a.numerator)*BigInt(b.denominator),y=BigInt(b.numerator)*BigInt(a.denominator);return x===y?0:x>y?1:-1;};
 const candidates=names.slice(1).map(profile=>{
  const pairs=[1,2].map(repeat=>{const a=get(profile,repeat),b=get(names[0],repeat),ratio={numerator:a.relations*b.target,denominator:b.relations*a.target};assert.ok(Number.isSafeInteger(ratio.numerator)&&Number.isSafeInteger(ratio.denominator));return{repeat,usable:a.relations,target:a.target,baselineUsable:b.relations,baselineTarget:b.target,ratio,pass:BigInt(ratio.numerator)*100n>=BigInt(ratio.denominator)*115n};});
  const worst=compare(pairs[0].ratio,pairs[1].ratio)<=0?pairs[0].ratio:pairs[1].ratio;
  return{profile,pass:pairs.every(x=>x.pass),minimumNormalizedRatio:worst,pairs};
 });
 const passing=candidates.filter(c=>c.pass).sort((a,b)=>-compare(a.minimumNormalizedRatio,b.minimumNormalizedRatio));
 const tie=passing.length>1&&compare(passing[0].minimumNormalizedRatio,passing[1].minimumNormalizedRatio)===0;
 return{candidate:tie?null:passing[0]?.profile??null,tiedTop:tie,candidates,interpretation:'Provisional collection-progress candidate only; no default or completion-time claim'};
}

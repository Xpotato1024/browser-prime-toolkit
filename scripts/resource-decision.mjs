// SPDX-License-Identifier: AGPL-3.0-only
export function resourceDecision(records){
 if(!Array.isArray(records)||records.length!==8)throw Error('Exactly two rounds of four owner counts required');
 const get=(n,r)=>{const rows=records.filter(x=>x.workers===n&&x.repeat===r);if(rows.length!==1)throw Error('Unique paired trial');const v=rows[0].outcome;if(!v||!Number.isSafeInteger(v.relations)||v.relations<=0||v.relations>1000000||v.allWorkersDisposed!==true||v.allWorkerSourcesReleased!==true||!Number.isSafeInteger(v.maximumWasmBytes)||v.maximumWasmBytes<1||v.maximumWasmBytes>536870912||!Number.isSafeInteger(v.peakTransportBytes)||v.peakTransportBytes<0||v.peakTransportBytes>33554432)throw Error('Invalid trial');return v.relations;};
 for(const n of [1,2,3,4])for(const r of [1,2])get(n,r);
 const baseline=[get(2,1),get(2,2)],candidates=[];
 for(const workers of [3,4]){const yields=[get(workers,1),get(workers,2)],pass=yields.every((v,i)=>BigInt(v)*100n>=BigInt(baseline[i])*110n);candidates.push({workers,yields,pass,pairedRatios:yields.map((v,i)=>({numerator:v,denominator:baseline[i]}))});}
 // Lower owner count wins a tie; compare worst paired ratio with exact integer products.
 const floor=c=>c.pairedRatios.reduce((a,b)=>BigInt(a.numerator)*BigInt(b.denominator)<=BigInt(b.numerator)*BigInt(a.denominator)?a:b);
 const eligible=candidates.filter(c=>c.pass).sort((a,b)=>{const x=floor(a),y=floor(b),d=BigInt(x.numerator)*BigInt(y.denominator)-BigInt(y.numerator)*BigInt(x.denominator);return d===0n?a.workers-b.workers:d>0n?-1:1;});
 return{baselineWorkers:2,baselineYields:baseline,candidates,candidate:eligible[0]?.workers??null,automaticDefaultChanged:false,scope:'one-host 60s collection screen; no completion-time or smartphone extrapolation'};
}

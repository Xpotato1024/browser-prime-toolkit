// SPDX-License-Identifier: AGPL-3.0-only
export function coordinatorDecision(records){
 if(!Array.isArray(records)||records.length!==4)throw Error('Exactly two paired rounds required');
 const get=(coordinator,repeat)=>{
  const rows=records.filter(x=>x.coordinator===coordinator&&x.repeat===repeat);if(rows.length!==1)throw Error('Unique paired coordinator trial');
  const v=rows[0].outcome;if(!v||v.coordinatorCompute!==(coordinator==='combined')||v.workers!==4||!Number.isSafeInteger(v.relations)||v.relations<1||v.relations>1000000||v.allWorkersDisposed!==true||v.allWorkerSourcesReleased!==true||v.maximumWasmBytes!==469762048||!Number.isSafeInteger(v.peakTransportBytes)||v.peakTransportBytes<0||v.peakTransportBytes>33554432)throw Error('Invalid coordinator trial');
  return v.relations;
 };
 const combined=[get('combined',1),get('combined',2)],dedicated=[get('dedicated',1),get('dedicated',2)];
 return{combined,dedicated,pairedRatios:dedicated.map((v,i)=>({numerator:v,denominator:combined[i]})),candidate:dedicated.every((v,i)=>BigInt(v)*100n>=BigInt(combined[i])*110n)?'dedicated':null,defaultChanged:false,scope:'four total owners on one host; collection yield only; no completion/phone extrapolation'};
}

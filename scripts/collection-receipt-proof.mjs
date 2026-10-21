// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';
export function validateCollectionSources(receipt,hashes){
 for(const map of [receipt.sourceFiles,receipt.graphSourceFiles]){
  assert.ok(map&&typeof map==='object'&&!Array.isArray(map)&&Object.keys(map).length>0,'Required source declaration map');
  for(const[p,h]of Object.entries(map)){assert.match(h,/^[a-f0-9]{64}$/);assert.equal(hashes.get(p),h,'Independent source declaration '+p);}
 }
}
export const COLLECTION_CONTRACT_NAMES=Object.freeze([
 'profile-before-worker','configuration-forgery-retired','counter-forgery-retired','unsupported-before-worker',
 'budget-before-worker','cancel-during-sieve','noncooperative-deadline','worker-cap-before-allocation',
 'bounded-known-allocator-refusal','unknown-trap-is-not-oom','forged-native-frame-retired','stale-generation-ignored',
 'proper-divisor-independent-check','noncooperative-extraction-deadline','collection-clock-cap-retired',
 'collection-reversing-clock-retired','native-preflight-budget-retired','native-abort-budget-retired',
 'unknown-extract-trap-retired','quota-evidence-missing-retired','quota-evidence-null-retired',
 'quota-evidence-zero-retired','fresh-full-64-path','fresh-full-path'
]);
export function validateCollectionContracts(r,{head,graph}){
 assert.equal(r.measuredHead,head);assert.equal(r.graphVariant,graph);assert.equal(r.caseId,null);
 assert.equal(r.records.length,1);const record=r.records[0];assert.equal(record.performanceMeasurement,false);
 assert.deepEqual(record.tests.map(t=>t.name),COLLECTION_CONTRACT_NAMES);
 assert.ok(record.tests.every(t=>t.pass===true&&!('error' in t)),'All 24 contracts must pass');
 assert.deepEqual(r.quiet,{networkRequests:0,httpRequests:0,badEvents:0,assetServerStopped:true,cacheDisabled:true});
 assert.deepEqual(r.detectorSelfTest,{blockedPageFetchCsp:true,pageCdpAndHttp:true,workerCdpAndHttp:true});
 assert.equal(r.ownership.live,0);assert.equal(r.ownership.liveSources,0);
 assert.equal(r.sampledRam.observerFailure,null);
 const d=r.collectionDiagnostics;assert.equal(d.variant,graph);assert.equal(d.failure,null);assert.equal(d.livePorts,0);
 assert.ok(d.channels.length>0&&d.channels.length<=64);
 for(const c of d.channels){assert.ok(c.closed&&c.terminated);assert.equal(c.failure,null);}
 return true;
}
export function validateNativeCollection(r,{head,variants}){
 assert.equal(r.measuredHead,head);assert.equal(r.nodeVersion,'v24.19.0');assert.equal(r.rows.length,2*variants.length);
 const inputs={digits40:'8156172677439289108635319830552518815109',digits64:'8505664162359734566676378490297194387200285122470917324701475577'};
 for(const[caseId,input]of Object.entries(inputs)){
  const rows=r.rows.filter(x=>x.caseId===caseId);assert.deepEqual(rows.map(x=>x.variant),variants);
  const math=x=>({input:x.input,packets:x.packets,counters:x.counters,columnBytes:x.columnBytes,columnSha256:x.columnSha256,profile:x.profile,pair:x.pair});
  for(const x of rows){
   assert.equal(x.input,input);assert.equal(x.knownFactorsUsed,false);assert.equal(x.disposed,true);
   assert.equal(x.before.failures,0);assert.equal(x.after.failures,0);
   assert.equal(x.pair.length,2);assert.ok(x.pair.every(s=>typeof s==='string'&&/^[1-9][0-9]*$/.test(s)));
   const n=BigInt(input),f=x.pair.map(BigInt);assert.ok(f[0]>1n&&f[1]>1n&&f[0]<n&&f[1]<n&&f[0]<=f[1]);assert.equal(f[0]*f[1],n);
   assert.ok(x.packets.length>0&&x.packets.length<=1024);assert.equal(x.counters.length,x.packets.length);
   x.packets.forEach((p,i)=>{assert.equal(p.family,i);assert.ok(p.bytes>0);assert.match(p.sha256,/^[a-f0-9]{64}$/);});
   assert.deepEqual(math(x),math(rows[0]));
   if(x.variant==='instrumented'){
    assert.equal(x.status[0],0);assert.equal(x.status[1],0);assert.ok(x.status[2]<=2000000&&x.status[3]<=16);
    assert.equal(x.phases.length,16);assert.ok(x.phases.every((p,i)=>p.id===i&&Number.isFinite(p.inclusiveMs)&&Number.isFinite(p.exclusiveMs)&&p.inclusiveMs>=p.exclusiveMs&&p.exclusiveMs>=0&&Number.isInteger(p.calls)&&p.calls>=0));
   }else {assert.equal(x.status,null);assert.equal(x.phases,null);}
  }
 }
 return true;
}

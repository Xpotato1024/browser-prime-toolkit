import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {verifyRsaSnapshot,verifyRsaWorkerResult,classifyRsaResult} from '../src/long-rsa/result.js';
const hashes=new Map();
const currentHash=async path=>{if(!hashes.has(path))hashes.set(path,createHash('sha256').update(await readFile(path)).digest('hex'));return hashes.get(path);};
export async function verifyLongReceipt(r,{expected,baseline,oracle,sourceOverrides={}}={}){
 assert.match(r.measuredHead,/^[a-f0-9]{40}$/);assert.ok([3000,30000,180000,600000].includes(r.budgetMs));
 assert.equal(r.variant,'native-brent');assert.equal(r.limits.operationBudget,10000000000);
 assert.deepEqual(r.ownership,{live:0,maxLive:1});
 assert.deepEqual(r.quiet,{networkRequests:0,httpRequests:0,badEvents:0,assetServerStopped:true,cacheDisabled:true});
 assert.deepEqual(r.detectorSelfTest,{blockedPageFetchCsp:true,pageCdpAndHttp:true,workerCdpAndHttp:true});
 assert.ok(r.initialAssets.every(a=>!a.path.includes('oracle')&&!a.path.includes('manifest')));
 for(const[path,hash]of Object.entries(r.sourceFiles))assert.equal(await currentHash(sourceOverrides[path]??path),hash,path);
 if(!sourceOverrides['scripts/verify-long-rsa.mjs']){assert.equal(r.assetBoundarySelfTest.length,4);assert.ok(r.assetBoundarySelfTest.every(t=>t.status===404));}
 if(baseline)for(const key of ['measuredHead','sourceFiles','browser','host','browserDevice'])assert.deepEqual(r[key],baseline[key],key);
 if(r.mode==='long-rsa-contracts'){
  assert.equal(r.records.length,1);const c=r.records[0];assert.equal(c.tests.length,8);assert.ok(c.tests.every(t=>t.pass));
  assert.equal(c.acceleratedClockIsPerformanceMeasurement,false);return null;
 }
 assert.equal(r.mode,'long-rsa-measurement');assert.equal(r.records.length,1);const c=r.records[0],v=c.outcome;
 assert.equal(c.knownFactorsUsed,false);assert.equal(c.seed,r.seed);assert.equal(c.id,r.caseId);
 if(expected)for(const key of ['id','input','bits','digits'])assert.equal(c[key],expected[key],key);
 assert.equal(v.input,c.input);assert.equal(v.profile,'long-native-brent-v1');assert.equal(v.backend,'brent');
 assert.equal(v.workers,1);assert.equal(v.wasmBytes,0);assert.equal(v.allWorkersDisposed,true);
 assert.equal(v.limits.operationBudget,10000000000);assert.equal(v.limits.timeBudgetMs,r.budgetMs);
 assert.ok(Number.isFinite(v.requestWallMs)&&v.requestWallMs>=0);assert.ok(v.initializationMs>=0&&v.initializationMs<5000);
 if(v.result){const checked=verifyRsaWorkerResult(v.result,c.input);assert.equal(classifyRsaResult(checked),v.kind);assert.equal(checked.seed,r.seed);}
 if(v.snapshot)verifyRsaSnapshot(v.snapshot,c.input);
 if(['factorized','prime','probable'].includes(v.kind))assert.ok(v.requestWallMs<r.budgetMs);
 if(oracle){
  assert.equal(c.oracleCheckedAfterRetirement,true);assert.equal((BigInt(oracle.p)*BigInt(oracle.q)).toString(),c.input);
  const values=[oracle.p,oracle.q].sort((a,b)=>BigInt(a)<BigInt(b)?-1:1);
  for(const f of v.snapshot?.factors??[])assert.ok(values.includes(f.value));
  if(v.kind==='factorized'){assert.deepEqual(v.result.factors.map(f=>f.value),values);assert.ok(v.result.factors.every(f=>f.certainty==='proven'));}
 }
 return v;
}

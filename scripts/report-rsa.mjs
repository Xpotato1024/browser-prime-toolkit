import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {verifyRsaWorkerResult,verifyRsaSnapshot,classifyRsaResult} from '../src/rsa/result.js';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const catalog=JSON.parse(await readFile('bench/staged-rsa/catalog.json','utf8'));
const official=catalog.find(c=>c.id==='RSA-100'),seeds=[1,11,23,41,67],raws=[],evidence=[];
for(const seed of seeds){
 const path='docs/benchmarks/llm01-staged-rsa100-seed'+seed+'.json',bytes=await readFile(path),r=JSON.parse(bytes);
 assert.equal(r.mode,'rsa-measurement');assert.match(r.measuredHead,/^[a-f0-9]{40}$/);assert.equal(r.caseId,official.id);
 assert.equal(r.budgetMs,30000);assert.equal(r.seed,seed);assert.equal(r.records.length,1);
 const record=r.records[0],v=record.outcome;assert.equal(record.seed,seed);assert.equal(record.knownFactorsUsed,false);
 for(const key of ['id','input','bits','digits'])assert.equal(record[key],official[key],key);
 assert.equal(v.input,official.input);assert.equal(v.backend,'brent');assert.equal(v.profile,'rsa-native-brent-v2');
 assert.equal(v.workers,1);assert.equal(v.wasmBytes,0);assert.equal(v.allWorkersDisposed,true);
 assert.equal(v.limits.timeBudgetMs,30000);assert.equal(v.limits.operationBudget,200000000);assert.equal(v.limits.workers,1);
 assert.ok(Number.isFinite(v.requestWallMs)&&v.requestWallMs>=0);assert.ok(v.initializationMs>=0&&v.initializationMs<5000);
 if(v.result){assert.equal(classifyRsaResult(verifyRsaWorkerResult(v.result,official.input)),v.kind);assert.equal(v.result.seed,seed);}
 if(v.snapshot){verifyRsaSnapshot(v.snapshot,official.input);assert.ok(v.snapshot.operations<=200000000);}
 if(['factorized','prime','probable'].includes(v.kind))assert.ok(v.requestWallMs<30000);
 assert.deepEqual(r.ownership,{live:0,maxLive:1});
 assert.deepEqual(r.quiet,{networkRequests:0,httpRequests:0,badEvents:0,assetServerStopped:true,cacheDisabled:true});
 assert.deepEqual(r.detectorSelfTest,{blockedPageFetchCsp:true,pageCdpAndHttp:true,workerCdpAndHttp:true});
 for(const[path,sha]of Object.entries(r.sourceFiles))assert.equal(hash(await readFile(path)),sha,path);
 if(raws.length)for(const key of ['measuredHead','browser','host','browserDevice','sourceFiles','limits'])assert.deepEqual(r[key],raws[0][key],key);
 raws.push(r);evidence.push({path,sha256:hash(bytes)});
}
const values=raws.map(r=>r.records[0].outcome),times=values.map(v=>v.requestWallMs).sort((a,b)=>a-b);
const successes=values.filter(v=>v.kind==='factorized'&&v.requestWallMs<30000),stopCounts={};
for(const v of values){const key=v.kind+'/'+(v.reason??'none');stopCounts[key]=(stopCounts[key]??0)+1;}
const summary={
 profile:'rsa-native-brent-v2',measuredHead:raws[0].measuredHead,
 browser:raws[0].browser.product,host:raws[0].host,workers:1,wasmBytes:0,timeBudgetMs:30000,operationBudget:200000000,
 officialCasesMeasured:[{id:official.id,digits:official.digits,bits:official.bits}],seeds,trials:values.length,
 factorizedCount:successes.length,successRate:successes.length/values.length,
 largestObservedSuccess:successes.length?official.id:null,
 requestWallMs:{median:times[2],min:times[0],max:times.at(-1)},
 successfulRequestWallMs:successes.length?successes.map(v=>v.requestWallMs):null,stopCounts,
 checkpoints:{min:Math.min(...values.map(v=>v.snapshot?.operations??0)),max:Math.max(...values.map(v=>v.snapshot?.operations??0)),allPastLegacyCap:values.every(v=>(v.snapshot?.operations??0)>50000000)},
 factorsFound:values.reduce((n,v)=>n+(v.snapshot?.factors.length??0),0),
 integrity:{knownFactorsUsed:false,allProductsReconstructed:values.every(v=>!!(v.result||v.snapshot)),allWorkersDisposed:true,postAssetNetworkRequests:0,
  factorCertainties:[...new Set(values.flatMap(v=>(v.result?.factors??v.snapshot?.factors??[]).map(f=>f.certainty)))]},
 sampledRam:{peakRssBytes:Math.max(...raws.map(r=>r.sampledRam.peakRssBytes)),peakPssBytes:Math.max(...raws.map(r=>r.sampledRam.peakPssBytes)),
  description:'Sampled whole Chrome process tree, including startup and pre-audit runtime; not a hard cap or instantaneous peak'},
 limitations:['Only RSA-100 measured; other official moduli unmeasured','Native Brent baseline only; GMP/ECM/SIQS unsupported here',
  'No universal maximum or large-SIQS performance claim','No proven prime factors if factorCertainties is empty'],evidence
};
const path='docs/benchmarks/llm01-staged-rsa100-summary.json',text=JSON.stringify(summary,null,2)+'\n';
if(process.argv.includes('--check'))assert.equal(await readFile(path,'utf8'),text);
else await writeFile(path,text);
console.log(JSON.stringify({trials:summary.trials,successes:summary.factorizedCount,largestObservedSuccess:summary.largestObservedSuccess,requestWallMs:summary.requestWallMs,stopCounts}));

// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';
import {verifyReceiptSources} from './source-receipt-proof.mjs';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const dir='docs/benchmarks/staged-coordinator-stage22',target='docs/benchmarks/llm01-coordinator.md';
const read=p=>readFileSync(p),sha=b=>createHash('sha256').update(b).digest('hex');
const run=JSON.parse(read(dir+'/run.json')),plan=JSON.parse(read('bench/staged-coordinator-plan.json'));
assert.equal(run.plan,plan.id);assert.equal(run.planSha256,sha(read('bench/staged-coordinator-plan.json')));
assert.equal(run.measuredHead,'4203aab1703e9129fd3e86343c485c334bbccc4a');
assert.equal(run.completedAt,undefined);assert.equal(run.decision,undefined);assert.deepEqual(run.trials,[]);
assert.deepEqual(run.preflight.map(r=>[r.coordinator,r.workers]),[['combined',4],['dedicated',2],['dedicated',3],['dedicated',4]]);
const checked=new Map();
for(const row of run.preflight){
 assert.equal(row.exitCode,0);assert.equal(row.signal,null);assert.equal(row.error,null);
 assert.equal(sha(read(dir+'/'+row.id+'.json')),row.rawSha256);assert.equal(sha(read(dir+'/'+row.id+'.log')),row.logSha256);
 const r=JSON.parse(read(dir+'/'+row.id+'.json'));assert.equal(r.measuredHead,run.measuredHead);
 assert.equal(r.coordinator,row.coordinator);assert.deepEqual(r.quiet,{networkRequests:0,httpRequests:0,badEvents:0,assetServerStopped:true,cacheDisabled:true});
 assert.deepEqual(r.detectorSelfTest,{blockedPageFetchCsp:true,pageCdpAndHttp:true,workerCdpAndHttp:true});
 assert.equal(r.ownership.live,0);assert.equal(r.ownership.liveSources,0);assert.ok(r.ownership.maxLive<=row.workers);
 assert.equal(r.records.length,1);assert.equal(r.records[0].tests.length,16);assert.ok(r.records[0].tests.every(t=>t.pass));
 verifyReceiptSources(r.sourceFiles,checked,p=>{
  const actual=sha(read(p));
  assert.equal(sha(execFileSync('git',['show',run.measuredHead+':'+p],{maxBuffer:8*1024*1024})),actual,'Measured source '+p);
  return actual;
 });
}
assert.equal(run.controls.length,1);const failure=run.controls[0];
assert.equal(failure.id,'fixed-combined');assert.equal(failure.exitCode,1);assert.equal(failure.signal,null);assert.equal(failure.error,null);assert.equal(failure.rawSha256,null);
assert.equal(existsSync(dir+'/fixed-combined.json'),false);
const log=read(dir+'/fixed-combined.log');assert.equal(sha(log),failure.logSha256);assert.match(log.toString(),/CDP timeout: Page.navigate/);
const first=JSON.parse(log.toString().split('\n')[0]);assert.deepEqual(first.fatal,[]);assert.deepEqual(first.badEvents,[]);
assert.deepEqual(first.requests.map(x=>new URL(x.url).pathname),['/bench/coordinator.html','/bench/coordinator.js']);
assert.ok(first.attached.every(x=>x.type==='page'));assert.equal(run.familyProof,undefined);assert.equal(run.fixedFamilyProof,undefined);
let out='# LLM-01: dedicated coordinator screen stopped before performance trials\n\n';
out+='Measured source core `'+run.measuredHead+'`; plan `'+run.plan+'`; started '+run.startedAt+'.\n\n';
out+='Combined4 and dedicated2/3/4 each passed16 actual Chrome contract checks, including offline positive network detectors and owner/source retirement. The first fixed-family control then failed during Page.navigate after the existing5s CDP deadline. Its diagnostic contains only the page and its entry-module requests, no attached Worker and no runtime error. No fixed-family receipt or timed trial was produced. This is a harness navigation failure, not an engine performance result.\n\n';
out+='The predeclared no-retry rule was followed. Original failed output remains intact; there was no second series, overwrite, parameter tuning or adoption. Dedicated versus combined performance and family equality are untested by this stage. The independently reviewed experimental runner remains isolated from the private UI and automatic policy. Stage21 completed results remain the basis for manual1..4 controls; automatic count remains<=2.\n\n';
out+='No RSA-100 completion, completion-time estimate, phone behavior or portable speedup is established. A future comparison needs a separately reviewed harness startup policy and a new predeclared study; do not silently resume this series.\n\n';
for(const row of run.preflight)out+='- '+row.id+': [raw](staged-coordinator-stage22/'+row.id+'.json), [log](staged-coordinator-stage22/'+row.id+'.log)\n';
out+='- fixed-combined: [failure log](staged-coordinator-stage22/fixed-combined.log)\n\n[Original incomplete manifest](staged-coordinator-stage22/run.json) binds all hashes and explicitly has zero timed trials. The separate aborted-report verifier checks this state, current/measured source hashes and the failure diagnostic. The original complete-series reporter deliberately continues to reject this incomplete study.\n';
if(process.argv.includes('--check'))assert.equal(read(target).toString(),out);else writeFileSync(target,out);
console.log('Verified stopped study: four preflights, navigation failure, zero performance trials, no decision');

// SPDX-License-Identifier: AGPL-3.0-only
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {executionIdentity} from '../scripts/ci-execution-identity.mjs';
const a='a'.repeat(40),b='b'.repeat(40);
const base={event:'push',workflowSha:a,checkoutSha:a,eventHeadSha:a,node:'24.22.1',requiredNode:'24.22.1',dirty:false,runId:'1',attempt:2};
test('push and PR merge execution identities remain distinct',()=>{
 assert.deepEqual(executionIdentity(base),{...base,schema:1});
 const pr=executionIdentity({...base,event:'pull_request',workflowSha:b,checkoutSha:b});
 assert.equal(pr.eventHeadSha,a);assert.equal(pr.checkoutSha,b);assert.equal(pr.attempt,2);
});
test('wrong checkout, wrong Node or tracked dirty CI checkout fails',()=>{
 assert.throws(()=>executionIdentity({...base,checkoutSha:b}),/checkout/);
 assert.throws(()=>executionIdentity({...base,node:'24.19.0'}),/Node/);
 assert.throws(()=>executionIdentity({...base,dirty:true}),/dirty/);
 assert.equal(executionIdentity({...base,event:'local',dirty:true,runId:null}).event,'local');
});
test('every workflow setup-node uses project file and records its actual checkout',()=>{
 for(const name of readdirSync('.github/workflows').filter(n=>/\.ya?ml$/.test(n))){
  const text=readFileSync('.github/workflows/'+name,'utf8');
  const setups=[...text.matchAll(/uses: actions\/setup-node@/g)];
  if(!setups.length)continue;
  assert.equal((text.match(/node-version-file: .node-version/g)??[]).length,setups.length,name);
  assert.equal((text.match(/run: node scripts\/ci-execution-identity.mjs/g)??[]).length,setups.length,name);
  assert.ok(!/node-version:/.test(text),name);
 }
});
test('current functional proof helpers retain an exact project Node precondition',()=>{
 const names=['collection-native','collection-hotpath-native','resieve-followup-native','resieve-prefix-native','score-unroll-native','selected-wide-helper'];
 for(const name of names){
  const source=readFileSync('scripts/verify-'+name+'.mjs','utf8');
  assert.ok(source.includes("assert.equal(process.version,'v'+readFileSync(new URL('../.node-version',import.meta.url),'utf8').trim())"),name);
  assert.ok(!source.includes("assert.equal(process.version,'v24.19.0')"),name);
 }
 // Immutable historical evidence and its benchmark entry remain on their measured runtime.
 assert.ok(readFileSync('scripts/report-hotpath-repeat.mjs','utf8').includes("assert.equal(run.nodeVersion,'v24.19.0')"));
 assert.ok(readFileSync('scripts/benchmark-hotpath-repeat.mjs','utf8').includes("assert.equal(process.version,'v24.19.0')"));
});

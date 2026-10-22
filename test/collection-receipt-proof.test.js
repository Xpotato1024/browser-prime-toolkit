// SPDX-License-Identifier: AGPL-3.0-only
import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';import {gunzipSync} from 'node:zlib';
import {validateCollectionSources,validateCollectionContracts,validateNativeCollection} from '../scripts/collection-receipt-proof.mjs';
const base='docs/benchmarks/staged-collection-stage40/';
const receipt=name=>JSON.parse(gunzipSync(Buffer.from(readFileSync(base+name+'.gz.base64','utf8').replaceAll('\n',''),'base64'),{maxOutputLength:2097152}));
test('source proof rejects either conflicting declaration instead of hiding one map',()=>{
 const h='a'.repeat(64),wrong='b'.repeat(64),hashes=new Map([['src/a.js',h]]);
 const good={sourceFiles:{'src/a.js':h},graphSourceFiles:{'src/a.js':h}};
 validateCollectionSources(good,hashes);
 for(const key of ['sourceFiles','graphSourceFiles']){
  const bad=structuredClone(good);bad[key]['src/a.js']=wrong;assert.throws(()=>validateCollectionSources(bad,hashes));
  const missing=structuredClone(good);delete missing[key];assert.throws(()=>validateCollectionSources(missing,hashes));
 }
});
test('stored Chrome contract proof rejects missing/failing tests and lifecycle/source substitutions',()=>{
 const good=receipt('contracts-instrumented.json'),expected={head:good.measuredHead,graph:'instrumented'};
 assert.equal(validateCollectionContracts(good,expected),true);
 for(const mutate of [
  r=>r.records[0].tests[0].pass=false,r=>r.records[0].tests.pop(),r=>r.records[0].tests[0].name='other',
  r=>r.records[0].performanceMeasurement=true,r=>r.measuredHead='0'.repeat(40),r=>r.graphVariant='baseline',
  r=>r.quiet.networkRequests=1,r=>r.detectorSelfTest.workerCdpAndHttp=false,r=>r.ownership.live=1,
  r=>r.ownership.liveSources=1,r=>r.collectionDiagnostics.channels[0].terminated=false,
  r=>r.collectionDiagnostics.channels[0].closed=false,r=>r.sampledRam.observerFailure='failed'
 ]){
  const bad=structuredClone(good);mutate(bad);assert.throws(()=>validateCollectionContracts(bad,expected));
 }
});
test('stored Native proof requires proper canonical factors and instrumented phase health',()=>{
 const good=receipt('native-profile.json'),expected={head:good.measuredHead,variants:['baseline','instrumented']};
 assert.equal(validateNativeCollection(good,expected),true);
 for(const mutate of [
  r=>r.rows[0].pair=['1',r.rows[0].input],r=>r.rows[0].pair.reverse(),
  r=>r.rows[0].pair.push('1'),r=>r.rows[0].disposed=false,r=>r.rows[0].before.failures=1,
  r=>r.rows[1].status[0]=1,r=>r.rows[1].phases[0].exclusiveMs=-1,r=>r.rows[1].packets[0].sha256='0'.repeat(64)
 ]){
  const bad=structuredClone(good);mutate(bad);assert.throws(()=>validateNativeCollection(bad,expected));
 }
});

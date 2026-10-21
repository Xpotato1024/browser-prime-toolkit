// SPDX-License-Identifier: AGPL-3.0-only
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {collectionWorkerSource} from '../src/collection-profile/worker-source.js';
import {validateCollectionFrame,validateCollectionFinal} from '../src/collection-profile/bridge.js';
test('diagnostic frame capacity supports full 64-digit collection and stays finite',()=>{
 const f=n=>({version:1,sequence:n,type:'batch',instrumented:false,rows:null,status:null});
 assert.equal(validateCollectionFrame(f(2048),'baseline',f(2047)),true);
 assert.equal(validateCollectionFinal(f(2048),'baseline'),true);
 assert.throws(()=>validateCollectionFrame(f(2049),'baseline',f(2048)));
 assert.throws(()=>validateCollectionFinal(f(2049),'baseline'));
});
test('Worker rejects unhealthy clock before either normal or side message is sent',()=>{
 for(const status of [[1,0,32,2,0.1,2000000],[0,1,32,2,0.1,2000000],[0,0,2000001,2,0.1,2000000]]){
  const messages=[],side=[];
  const s=collectionWorkerSource(1024,'instrumented');
  const prefix=s.slice(0,s.indexOf('// SPDX-License-Identifier:',1));
  assert.ok(prefix.length>100);
  const c=vm.createContext({addEventListener(){},postMessage:m=>messages.push(m)});
  vm.runInContext(prefix,c);
  c.status=status;c.side=side;
  vm.runInContext("collectionPort={postMessage:m=>side.push(m)};collectionApi={codex_collection_status:i=>status[i],codex_collection_field:()=>0};",c);
  assert.throws(()=>vm.runInContext("collectionSend({type:'batch'},[])",c),/Diagnostic clock\/scope failure/);
  assert.equal(messages.length,0);assert.equal(side.length,0);
 }
});

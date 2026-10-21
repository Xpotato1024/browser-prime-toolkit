// SPDX-License-Identifier: AGPL-3.0-only
import test from 'node:test';
import assert from 'node:assert/strict';
import {attachCollectionPort} from '../src/collection-profile/bridge.js';
test('diagnostic port owns retirement, rejects invalid frames and stops changing after close',async()=>{
 let childPort,calls=0,failure=null;
 const worker={postMessage(d,ports){assert.deepEqual(d,{type:'codex-collection-port-v1'});assert.equal(ports.length,1);childPort=ports[0];},terminate(){calls++;}};
 const bridge=attachCollectionPort(worker,'baseline',m=>failure=m);
 try{
  childPort.postMessage({version:1,sequence:1,type:'ready',instrumented:false,rows:null,status:null});
  await new Promise(r=>setTimeout(r,20));assert.equal(bridge.snapshot().last.sequence,1);
  childPort.postMessage({version:1,sequence:3,type:'batch',instrumented:false,rows:null,status:null});
  await new Promise(r=>setTimeout(r,20));assert.match(failure,/identity/);assert.equal(bridge.snapshot().last.sequence,1);
  worker.terminate();worker.terminate();await new Promise(r=>setTimeout(r,75));
  assert.equal(calls,1);assert.equal(bridge.closed,true);assert.equal(bridge.snapshot().terminated,true);
  childPort.postMessage({version:1,sequence:2,type:'submitted',instrumented:false,rows:null,status:null});
  await new Promise(r=>setTimeout(r,20));assert.equal(bridge.snapshot().last.sequence,1);
 }finally{bridge.close();childPort.close();}
});

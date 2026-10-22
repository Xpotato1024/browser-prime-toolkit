// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {selectedWideWorkerSource} from '../src/selected-wide/worker-source.js';
import {wideWorkerSource} from '../src/wide-window/worker-source.js';
const pattern=/const RUSQSIEVE_BASE64="[^"]+";/g;
test('selected wide preserves role protocol and rejects all other caps',()=>{
 for(const cap of [64,1024]){
  const source=selectedWideWorkerSource(cap),previous=wideWorkerSource(cap);
  assert.equal([...source.matchAll(pattern)].length,1);
  assert.equal(source.replace(pattern,''),previous.replace(pattern,''));
  assert.notEqual(source,previous);
 }
 for(const cap of [0,128,256,512,'64',null,Infinity])assert.throws(()=>selectedWideWorkerSource(cap));
});
test('selected runner differs only in injected worker factory import',()=>{
 const read=p=>readFileSync(p,'utf8');
 let expected=read('src/wide-window/runner.js').replace("import{wideWorkerSource as workerSourceForCap}from'./worker-source.js';","import{selectedWideWorkerSource as workerSourceForCap}from'./worker-source.js';");
 for(const p of ["./budget.js","./memory.js"])expected=expected.replaceAll(p,"../wide-window/"+p.slice(2));
 assert.equal(read('src/selected-wide/runner.js'),expected);
});

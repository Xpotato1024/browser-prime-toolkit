// SPDX-License-Identifier: AGPL-3.0-only
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {siqs400WorkerSource} from '../src/siqs400/worker-source.js';
import {selectedWideWorkerSource} from '../src/selected-wide/worker-source.js';
import {validateInput} from '../src/rusqsieve/contracts.js';
import {validateDlpConfiguration} from '../src/rusqsieve-dlp/contracts.js';
import {validateSiqs400Input,validateSiqs400Configuration} from '../src/siqs400/contracts.js';
test('400 wrapper changes only boundary/configuration checks, never the native bytes or protocol',()=>{
 for(const cap of [64,1024]){
  const before=selectedWideWorkerSource(cap),after=siqs400WorkerSource(cap);
  const native=/const RUSQSIEVE_BASE64="[^"]+";/g;
  assert.deepEqual(after.match(native),before.match(native));
  let expected=before.replace(validateInput.toString(),validateSiqs400Input.toString().replace('validateSiqs400Input','validateInput'));
  expected=expected.replace(validateDlpConfiguration.toString(),validateDlpConfiguration.toString()+'\n'+validateSiqs400Configuration.toString().replace('validateSiqs400Configuration','validateDlpConfiguration400'));
  expected=expected.replace('validateDlpConfiguration(c,profile,BigInt(input).toString(2).length);','validateDlpConfiguration400(c,profile,BigInt(input).toString(2).length);');
  assert.equal(after,expected);assert.equal(siqs400WorkerSource(cap),after);
  const context=vm.createContext({performance:{now:()=>0},postMessage(){throw Error('Unexpected message');}});
  new vm.Script(after).runInContext(context,{timeout:1000});
  assert.equal(vm.runInContext('validateInput("'+((1n<<400n)-1n)+'").bits',context),400);
  assert.throws(()=>vm.runInContext('validateInput("'+(1n<<400n)+'")',context));
 }
 for(const cap of [0,128,256,512,'64',NaN])assert.throws(()=>siqs400WorkerSource(cap));
});

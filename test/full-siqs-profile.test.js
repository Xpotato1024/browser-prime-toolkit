import test from 'node:test';
import assert from 'node:assert/strict';
import {RSA_PROFILE,selectRsaPlan} from '../src/full-siqs/profile.js';
test('large SIQS exposes a finite independent backend and exact boundary',()=>{
 assert.equal(RSA_PROFILE.wasmBytes,536870912);
 assert.equal(selectRsaPlan(((1n<<332n)-1n).toString()).supported,true);
 assert.equal(selectRsaPlan(((1n<<332n)+1n).toString()).supported,false);
 assert.equal(selectRsaPlan('32',{backend:'brent'}).supported,false);
 assert.equal(selectRsaPlan('1').workers,0);
});

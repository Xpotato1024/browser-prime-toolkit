import test from 'node:test';
import assert from 'node:assert/strict';
import {classifySavedPrefix} from '../src/siqs-lab/contracts.js';
const meta={input:'77',multiplier:1};
const bytes=s=>new TextEncoder().encode(s);
test('budget stop between header and newline preserves an ineligible prefix',()=>{
 assert.deepEqual(classifySavedPrefix(bytes('4d'),meta,false),{mergeEligible:false,incompleteHeader:true});
 assert.throws(()=>classifySavedPrefix(bytes('4d'),meta,true));
 assert.equal(classifySavedPrefix(bytes('4d\n'),meta,false).mergeEligible,true);
 for(const s of ['4','4e','4d\nA 2','4d\nR 1'])assert.throws(()=>classifySavedPrefix(bytes(s),meta,false));
});

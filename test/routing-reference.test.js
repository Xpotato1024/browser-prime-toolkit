// SPDX-License-Identifier: AGPL-3.0-only
import test from 'node:test';import assert from 'node:assert/strict';
import {auditReferenceSplit} from '../scripts/routing-reference.mjs';
const f={input:'91',reference:[{value:'7'},{value:'13'}]};
test('reference audit is after-return exact pair checking, never a factor oracle in the engine',()=>{
 assert.deepEqual(auditReferenceSplit(f,{factors:[],remaining:'91'}),{properFactorFound:false,referencePairRecovered:false,matchedPrimeTerms:0});
 assert.equal(auditReferenceSplit(f,{factors:[{value:'7',exponent:1}],remaining:'13'}).referencePairRecovered,true);
 assert.throws(()=>auditReferenceSplit(f,{factors:[{value:'7',exponent:2}],remaining:'1'}));
 assert.throws(()=>auditReferenceSplit({...f,input:'92'},{factors:[],remaining:'92'}));
});
test('reference audit retains square multiplicity and rejects a wrong but multiplicative reference',()=>{
 const sq={input:'49',reference:[{value:'7'},{value:'7'}]};
 assert.equal(auditReferenceSplit(sq,{factors:[{value:'7',exponent:2}],remaining:'1'}).referencePairRecovered,true);
 assert.equal(auditReferenceSplit(sq,{factors:[{value:'7',exponent:1}],remaining:'7'}).referencePairRecovered,true);
 assert.throws(()=>auditReferenceSplit({input:'45',reference:[{value:'3'},{value:'15'}]},{factors:[{value:'5',exponent:1}],remaining:'9'}));
});

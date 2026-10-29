// SPDX-License-Identifier: AGPL-3.0-only
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {makeCandidateCorpus} from '../bench/candidate-corpus.mjs';
import {reconstructStagedPrior} from '../scripts/staged-prior-inventory.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url));
const bytes=read('bench/staged-prior-inputs.json'),frozen=JSON.parse(bytes);
const corpus=[...makeCandidateCorpus(false),...JSON.parse(read('bench/selection-holdout.json'))];
test('historical prior corpus reconstructs exactly from its original pinned inventory',()=>{
 const seen=[];
 const actual=reconstructStagedPrior(corpus,bytes,p=>{seen.push(p);return read(p);});
 assert.deepEqual(actual,frozen);assert.deepEqual(seen,Object.keys(frozen.sources));
 assert.ok(!seen.includes('bench/routing-micro-fixtures.json'));
});
test('changing the inventory itself is rejected before any source read',()=>{
 let calls=0;
 assert.throws(()=>reconstructStagedPrior(corpus,Buffer.from(bytes.toString()+' '),()=>{calls++;}),/inventory pin/);
 assert.equal(calls,0);
});
test('missing or changed original source never passes a historical check',()=>{
 const first=Object.keys(frozen.sources)[0];
 assert.throws(()=>reconstructStagedPrior(corpus,bytes,p=>p===first?Buffer.from('{}'):read(p)),/source changed/);
 assert.throws(()=>reconstructStagedPrior(corpus,bytes,()=>{throw Error('missing source');}),/missing source/);
});
test('extra future inputs cannot silently become part of the old cohort',()=>{
 assert.throws(()=>reconstructStagedPrior([...corpus,{input:'9'.repeat(1000)}],bytes,read),/input reconstruction/);
});

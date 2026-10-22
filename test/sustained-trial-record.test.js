// SPDX-License-Identifier: AGPL-3.0-only
import test from 'node:test';import assert from 'node:assert/strict';
import {trialRecord,uniqueTrials,verifyBytes,exclusiveOutput} from '../scripts/sustained-trial-record.mjs';
import{mkdtempSync,mkdirSync,rmSync}from'node:fs';import{tmpdir}from'node:os';import{join}from'node:path';
const input='1522605027922533360535618378132637429718068114961380688657908494580122963258952897654000350692006139';
test('Same RSA input cannot overwrite distinct trial identities',()=>{
 const rows=['a','b','c','d'].map((id,i)=>trialRecord({id,repeat:i%2+1},{id:'RSA-100',input,outcome:{}},input));
 uniqueTrials(rows);assert.deepEqual(rows.map(r=>r.id),['a','b','c','d']);assert.ok(rows.every(r=>r.caseId==='RSA-100'&&r.trialId===r.id));
 assert.throws(()=>uniqueTrials([...rows,rows[0]]));
 assert.throws(()=>trialRecord({id:'a'},{id:'other',input},input));
 assert.throws(()=>trialRecord({id:'a'},{id:'RSA-100',input:'7'},input));
 assert.throws(()=>trialRecord({id:'../escape'},{id:'RSA-100',input},input));
});
test('Historical bytes and exclusive continuation directory fail closed',()=>{
 assert.throws(()=>verifyBytes(Buffer.from('changed'),'0'.repeat(64)));
 const d=mkdtempSync(join(tmpdir(),'sustained-meta-'));
 try{const p=join(d,'new');exclusiveOutput(p);assert.throws(()=>exclusiveOutput(p));assert.throws(()=>exclusiveOutput(d));}finally{rmSync(d,{recursive:true,force:true});}
});

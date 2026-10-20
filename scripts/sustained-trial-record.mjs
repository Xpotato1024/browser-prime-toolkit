// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';import{mkdirSync}from'node:fs';import{createHash}from'node:crypto';
export const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
export function verifyBytes(bytes,expected){assert.match(expected,/^[a-f0-9]{64}$/);assert.equal(sha(bytes),expected,'Preserved evidence SHA256');}
export function exclusiveOutput(dir){mkdirSync(dir);}
export function trialRecord(trial,raw,expectedInput){
 assert.match(trial.id,/^[a-z0-9]+(?:-[a-z0-9]+)*$/);assert.equal(raw.id,'RSA-100');assert.equal(raw.input,expectedInput);
 const {id:caseId,input,...measurement}=raw;
 return{...measurement,...trial,id:trial.id,trialId:trial.id,caseId,input};
}
export function uniqueTrials(rows){const ids=new Set();for(const r of rows){assert.ok(!ids.has(r.id),'Duplicate trial ID');ids.add(r.id);assert.equal(r.trialId,r.id);}}

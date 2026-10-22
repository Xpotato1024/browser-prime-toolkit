import test from 'node:test';import assert from 'node:assert/strict';import {knownDetachedSetup,retireSetupCalls} from '../scripts/resource-ui-cdp-lifecycle.mjs';
test('only proven detached Worker setup session races are classified as retired',()=>{
 const row={sessionId:'a',error:'Network.setCacheDisabled: Session with given id not found.'},sets={workers:new Set(['a']),detached:new Set(['a']),active:new Set()};
 assert.equal(knownDetachedSetup(row,sets),true);
 for(const change of [{active:new Set(['a'])},{detached:new Set()},{workers:new Set()}])assert.equal(knownDetachedSetup(row,{...sets,...change}),false);
 for(const error of ['Network.setCacheDisabled: Other error','Runtime.exceptionThrown: Session with given id not found.','Worker execution failed'])assert.equal(knownDetachedSetup({...row,error},sets),false);
});

test('detach settles only that Workers pending setup, never page evaluation or other sessions',()=>{
 const errors=[],call=(sessionId,method)=>({sessionId,method,reject:e=>errors.push(e.message)});
 const pending=new Map([[1,call('a','Network.setCacheDisabled')],[2,call('b','Network.enable')],[3,call('a','Runtime.evaluate')]]);
 retireSetupCalls(pending,'a');assert.equal(pending.has(1),false);assert.equal(pending.has(2),true);assert.equal(pending.has(3),true);assert.deepEqual(errors,['Network.setCacheDisabled: Session with given id not found.']);
});

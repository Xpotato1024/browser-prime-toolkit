// SPDX-License-Identifier: AGPL-3.0-only
import test from 'node:test';import assert from 'node:assert/strict';import {knownDetachedSetup} from '../scripts/resource-ui-cdp-lifecycle.mjs';
test('recorded CI debugger-resume race needs observed detached nonactive Worker proof',()=>{
 const row={sessionId:'cancelled-worker',error:'Runtime.runIfWaitingForDebugger: Session with given id not found.'};
 const sets={workers:new Set(['cancelled-worker']),detached:new Set(['cancelled-worker']),active:new Set()};
 assert.equal(knownDetachedSetup(row,sets),true);
 for(const change of [{workers:new Set()},{detached:new Set()},{active:new Set(['cancelled-worker'])}])assert.equal(knownDetachedSetup(row,{...sets,...change}),false);
 for(const error of ['CDP timeout: Runtime.runIfWaitingForDebugger','Runtime.runIfWaitingForDebugger: Other error','Runtime.evaluate: Session with given id not found.'])assert.equal(knownDetachedSetup({...row,error},sets),false);
});

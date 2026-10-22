// SPDX-License-Identifier: AGPL-3.0-only
import test from 'node:test';
import assert from 'node:assert/strict';
import {stopForMemoryGuard} from '../scripts/long-window-memory-stop.mjs';
test('unresponsive stop request retires the owned Chrome group within an independent deadline',async()=>{
 let retired=0;const started=performance.now();
 await stopForMemoryGuard({requestStop:()=>new Promise(()=>{}),retireChrome:async()=>{retired++;},timeoutMs:20});
 assert.equal(retired,1);assert.ok(performance.now()-started<1000);
});
test('rejected stop request falls back to retirement and propagates retirement failure',async()=>{
 await assert.rejects(stopForMemoryGuard({requestStop:async()=>{throw Error('CDP closed');},retireChrome:async()=>{throw Error('Retirement failed');}}),/Retirement failed/);
});
test('responsive guarded cancellation keeps the page alive for terminal evidence',async()=>{
 let retired=0;await stopForMemoryGuard({requestStop:async()=>{},retireChrome:async()=>{retired++;}});
 assert.equal(retired,0);
});

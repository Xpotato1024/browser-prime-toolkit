// SPDX-License-Identifier: AGPL-3.0-only
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {hardenChromeHarness} from '../scripts/harden-chrome-harness.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('diagnostic startup observation begins before the asynchronous memory sampler',()=>{
 const source=hardenChromeHarness(read('scripts/verify-collection-profile.mjs'));
 assert.ok(source.indexOf('startup=observeChromeStartup')<source.indexOf('await memory.start()'));
 assert.ok(source.includes('await startup.ready'));
 assert.ok(source.includes('remainingMs:startup.remainingMs'));
 assert.ok(!source.includes('const debuggingUrl = await new Promise('));
 assert.ok(source.includes('if(socket?.readyState===WebSocket.OPEN&&pageSession)'));
 assert.ok(source.includes('startup?.dispose();'));
 // Calculation watchdog and offline assertions remain, with no timeout increase.
 assert.ok(source.includes('},budgetMs+20000);'));
 assert.ok(source.includes("connect-src 'none'"));
 assert.ok(source.includes("assert.equal(requests.length,0)"));
 assert.ok(source.includes("assert.equal(http.length,0)"));
});
test('unexpected or already hardened input fails before any generated artifact can be accepted',()=>{
 const source=read('scripts/verify-collection-profile.mjs');
 assert.throws(()=>hardenChromeHarness(source.replace('  hardTimer=setTimeout(','  changedTimer=setTimeout(')),/Chrome harness anchor/);
 assert.throws(()=>hardenChromeHarness(hardenChromeHarness(source)),/Chrome harness anchor/);
});

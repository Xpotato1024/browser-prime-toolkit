// SPDX-License-Identifier: AGPL-3.0-only
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {deriveStagedCi} from '../scripts/generate-staged-ci.mjs';
test('staged ownership observation precedes memory setup within the original deadline',async()=>{
 const original=await readFile(new URL('../scripts/benchmark-staged.mjs',import.meta.url),'utf8');
 const source=await readFile(new URL('../scripts/verify-staged-ci.mjs',import.meta.url),'utf8');
 assert.equal(source,deriveStagedCi(original),'Exact reviewed derivation from immutable measurement driver');
 const observe=source.indexOf('ciChrome.observe({timeoutMs:15000})'),memory=source.indexOf('ciChrome.setup(()=>memory.start())');
 assert.ok(observe>=0&&observe<memory,'Observe owned process before asynchronous setup');
 assert.match(source,/ciChrome.connect\(socket\)/);
 assert.match(source,/await ciChrome.cleanup\(\)/);
 assert.ok(!source.includes('DevTools listening on'));
});

// SPDX-License-Identifier: AGPL-3.0-only
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {deriveStagedCi} from '../scripts/generate-staged-ci.mjs';

test('staged Chrome ownership observation starts before awaiting the memory sampler',async()=>{
 const original=await readFile(new URL('../scripts/benchmark-staged.mjs',import.meta.url),'utf8');
 const source=await readFile(new URL('../scripts/verify-staged-ci.mjs',import.meta.url),'utf8');
 assert.equal(source,deriveStagedCi(original),'Only the reviewed CI startup substitutions may differ from the immutable measurement driver');
 const observe=source.indexOf('startup = observeChromeStartup('),memory=source.indexOf('await memory.start()');
 assert.ok(observe>=0&&observe<memory,'Chrome readiness must be observed before memory.start can yield and lose the stderr notification');
 assert.match(source,/observeChromeStartup\(chrome, temporary, \{timeoutMs: startupTimeoutMs\}\)/);
 assert.match(source,/const startupTimeoutMs = 15000/u,'Keep the original finite startup deadline');
 assert.match(source,/startup\?\.dispose\(\)/u,'Retire the owned startup observer on every exit');
 assert.doesNotMatch(source,/DevTools listening on \(ws:/u,'Do not depend on stderr as the readiness authority');
});

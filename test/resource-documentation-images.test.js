// SPDX-License-Identifier: AGPL-3.0-only
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {documentationImage} from '../scripts/documentation-image.mjs';
const image=readFileSync(new URL('../docs/benchmarks/staged-resources-stage21/ui-mobile.png',import.meta.url));
test('real documentation screenshot passes typed image hygiene',()=>assert.equal(documentationImage('docs/benchmarks/ui.png',image),true));
test('corrupt or truncated documentation screenshots fail hygiene',()=>{
 const bad=Buffer.from(image);bad[0]=0;
 assert.throws(()=>documentationImage('docs/benchmarks/ui.png',bad),/signature/);
 assert.throws(()=>documentationImage('docs/benchmarks/ui.png',image.subarray(0,-1)),/end/);
});
test('image exception does not apply to executable or ordinary text paths',()=>{
 assert.equal(documentationImage('src/file.png',image),false);assert.equal(documentationImage('docs/benchmarks/note.md',image),false);
});

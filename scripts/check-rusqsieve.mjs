// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Xpotato.net / Xpotato1024
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {RUSQSIEVE_BASE64} from '../src/rusqsieve/wasm-bytes.js';
import {memoryContract} from '../native/rusqsieve/memory-contract.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url)),sha=b=>createHash('sha256').update(b).digest('hex');
const r=JSON.parse(read('native/rusqsieve/staged-build.json')),u=JSON.parse(read('native/rusqsieve/staged-upstream.json')),b=Buffer.from(RUSQSIEVE_BASE64,'base64');
assert.equal(r.version,'0.5.0');assert.equal(r.commit,'4b150834b57636f6ebc350a81321a15c1cd901d2');assert.equal(r.upstreamSha256,u.sha256);assert.equal(r.cleanBuilds,2);assert.equal(r.bytes,b.length);assert.equal(r.sha256,sha(b));assert.deepEqual(memoryContract(b),r.memory);
for(const[p,h]of Object.entries(r.sourceHashes))assert.equal(sha(read(p)),h,'Artifact source '+p);
assert.equal(sha(read('native/rusqsieve/LICENSE-APACHE')),u.files['LICENSE-APACHE']);assert.equal(sha(read('native/rusqsieve/LICENSE-MPL')),u.files['LICENSE-MPL']);
const notices=JSON.parse(read('native/rusqsieve/toolchain-notices/staged-manifest.json'));
for(const[p,e]of Object.entries(notices)){const b=read('native/rusqsieve/toolchain-notices/'+p);assert.equal(b.length,e.bytes);assert.equal(sha(b),e.sha256);}
console.log('Verified rusqsieve source/compiler notices, bounded SIMD artifact and two-clean-build receipt');

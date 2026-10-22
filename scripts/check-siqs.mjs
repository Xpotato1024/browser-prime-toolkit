import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { SIQS_BASE64 } from '../src/engine/siqs-bytes.js';
import { patchSiqs } from './patch-siqs.mjs';
const root=resolve(import.meta.dirname,'..');
const read=p=>readFileSync(resolve(root,p)),sha=b=>createHash('sha256').update(b).digest('hex');
const receipt=JSON.parse(read('native/siqs/build.json'));
for(const [path,hash] of Object.entries(receipt.sourceHashes)) assert.equal(sha(read(path)),hash,'Stale SIQS source '+path);
assert.deepEqual(receipt.upstreams,JSON.parse(read('native/siqs/sources.json')));
for(const entry of receipt.upstreams) {
  assert.equal(sha(read(entry.source)),entry.sha256);
  const {sha256,changes}=patchSiqs(entry.destination,read(entry.source).toString());
  assert.deepEqual({sha256,changes},receipt.patched[entry.destination]);
}
const bytes=Buffer.from(SIQS_BASE64,'base64'),module=new WebAssembly.Module(bytes);
assert.equal(bytes.length,receipt.bytes);assert.equal(sha(bytes),receipt.sha256);
assert.deepEqual(WebAssembly.Module.imports(module),receipt.imports);
assert.deepEqual(WebAssembly.Module.exports(module),receipt.exports);
assert.equal(receipt.cleanBuilds,2);
const imports={env:{budget_tick:()=>1},wasi_snapshot_preview1:{}};
for(const name of ['fd_write','fd_close','fd_seek','proc_exit']) imports.wasi_snapshot_preview1[name]=()=>{throw Error('Unexpected SIQS I/O');};
const instance=new WebAssembly.Instance(module,imports);
assert.equal(instance.exports.memory.buffer.byteLength,67108864);
assert.throws(()=>instance.exports.memory.grow(1),RangeError);
console.log('Verified SIQS pins, source hashes, exact artifact and 64MiB hard maximum');

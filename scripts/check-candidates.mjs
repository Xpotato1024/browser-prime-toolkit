import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import { GMP_BASE64 } from '../src/engine/gmp-bytes.js';
const root = resolve(import.meta.dirname, '..');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const receipt = JSON.parse(readFileSync(join(root, 'native/gmp/build.json')));
for (const [path, hash] of Object.entries(receipt.sourceHashes)) {
  assert.equal(sha(readFileSync(join(root, path))), hash, 'Stale candidate source: ' + path);
}
assert.deepEqual(receipt.upstreams, JSON.parse(readFileSync(join(root, 'native/gmp/upstreams.json'))));
const bytes = Buffer.from(GMP_BASE64, 'base64');
assert.equal(bytes.length, receipt.bytes); assert.equal(sha(bytes), receipt.sha256);
const module = new WebAssembly.Module(bytes);
assert.deepEqual(WebAssembly.Module.imports(module), receipt.imports);
assert.deepEqual(WebAssembly.Module.exports(module), receipt.exports);
const allowed = new Set(['env.budget_tick', 'env.__syscall_unlinkat',
  ...['proc_exit', 'fd_write', 'fd_read', 'fd_close', 'fd_seek', 'clock_time_get'].map(n => 'wasi_snapshot_preview1.' + n)]);
assert.ok(receipt.imports.every(i => i.kind === 'function' && allowed.has(i.module + '.' + i.name)));
assert.equal(receipt.cleanBuilds, 2);
assert.equal(receipt.memoryLimitBytes, 67108864);
assert.equal(receipt.siqsObjects.length, 8);
assert.ok(receipt.siqsObjects.every(line => /^[a-f0-9]{64}  \/work\/siqs-objects\/[a-z0-9_]+\.o$/.test(line)));
console.log('Verified private GMP/ECM artifact, pins, source hashes and 8 compile-only SIQS objects');

for (const name of ['gmp', 'gmp-ecm']) {
  const metadata = JSON.parse(readFileSync(join(root, 'vendor', name, 'provenance.json')));
  for (const [file, recorded] of Object.entries(metadata.noticeCopies)) {
    const expected = typeof recorded === 'string' ? recorded : recorded.sha256;
    assert.equal(sha(readFileSync(join(root, 'vendor', name, file))), expected, 'Notice changed: ' + name + '/' + file);
  }
  const archive = receipt.upstreams.find(entry => entry.file === (name === 'gmp' ? 'gmp-6.3.0.tar.xz' : 'gmp-ecm.tar.gz'));
  assert.equal(metadata.sha256 ?? metadata.archiveSha256, archive.sha256);
}

const deniedImports = {};
for (const entry of receipt.imports) {
  deniedImports[entry.module] ??= {};
  deniedImports[entry.module][entry.name] = () => { throw Error('Unexpected artifact probe call'); };
}
const probe = new WebAssembly.Instance(module, deniedImports);
assert.equal(probe.exports.memory.buffer.byteLength, 67108864);
assert.throws(() => probe.exports.memory.grow(1), RangeError, 'WASM hard maximum must reject growth');
console.log('Verified actual 64MiB WASM hard maximum');

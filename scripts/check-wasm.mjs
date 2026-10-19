import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { TINYQS_BASE64 } from '../src/engine/tinyqs-bytes.js';

const root = resolve(import.meta.dirname, '..');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const receipt = JSON.parse(readFileSync(resolve(root, 'native/tinyqs/build.json')));
const provenance = JSON.parse(readFileSync(resolve(root, 'vendor/msieve/provenance.json')));
for (const file of provenance.files) {
  const data = readFileSync(resolve(root, 'vendor/msieve', file.path));
  assert.equal(hash(data), file.sha256); assert.equal(data.length, file.bytes);
}
for (const [path, expected] of Object.entries(receipt.sourceHashes)) {
  assert.equal(hash(readFileSync(resolve(root, path))), expected, 'Stale WASM source: ' + path);
}
const bytes = Buffer.from(TINYQS_BASE64, 'base64');
assert.equal(bytes.length, receipt.bytes); assert.equal(hash(bytes), receipt.sha256);
const module = new WebAssembly.Module(bytes);
assert.deepEqual(WebAssembly.Module.imports(module), receipt.imports);
assert.deepEqual(WebAssembly.Module.exports(module), receipt.exports);
assert.equal(receipt.cleanBuilds, 2);
console.log('Verified WASM source pins, artifact hash, imports and exports');

// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';
export function verifyReceiptSources(files, cache, actualSourceHash) {
 for(const [path, expected] of Object.entries(files)) {
  if(!cache.has(path))cache.set(path,actualSourceHash(path));
  assert.equal(cache.get(path),expected,'Receipt source '+path);
 }
}

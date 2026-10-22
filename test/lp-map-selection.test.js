// SPDX-License-Identifier: AGPL-3.0-only
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {optimizedWorkerSource} from '../src/optimized/worker-source.js';
import {lpMapWorkerSource} from '../src/lp-map/worker-source.js';
const sha=s=>createHash('sha256').update(s).digest('hex');
const native=s=>Buffer.from(JSON.parse([...s.matchAll(/const RUSQSIEVE_BASE64=("[^"]+");/g)][0][1]),'base64');
for(const cap of [128,256])test('selected role adopts measured LP map Native: '+cap,async()=>{
 const source=optimizedWorkerSource(cap),b=native(source);
 const r=JSON.parse(readFileSync('native/lp-map/build-lpmap-'+cap+'.json'));
 assert.equal(sha(b),r.sha256);
 assert.equal(source,lpMapWorkerSource(cap,'lpmap'));
 const {instance}=await WebAssembly.instantiate(b,{});
 assert.equal(instance.exports.codex_lpmap_selftest(),1);
});
test('frozen ABBA baseline and selected protocol remain unchanged',()=>{
 const r=JSON.parse(readFileSync('native/lp-map/baseline-selected.json'));
 for(const cap of [64,128,256]){
  const source=lpMapWorkerSource(cap,'baseline');
  assert.equal(sha(source),r.roles[cap].sourceSha256);
  const normalize=s=>s.replace(/const RUSQSIEVE_BASE64="[^"]+";/g,'const RUSQSIEVE_BASE64="SELECTED_NATIVE";');
  assert.equal(normalize(optimizedWorkerSource(cap)),normalize(source));
 }
 assert.equal(optimizedWorkerSource(64),lpMapWorkerSource(64,'baseline'));
});

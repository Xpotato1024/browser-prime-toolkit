import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const manifest=JSON.parse(await readFile('docs/benchmarks/comparison-preservation.json'));
assert.equal(manifest.historicalBase,'82f1c3e4215bf990da142e82e8bc33fa55846b07');
assert.ok(manifest.files.length>=208);assert.equal(manifest.validationLogs.length,21);
for(const item of manifest.files){
 const bytes=await readFile(item.path);assert.equal(bytes.length,item.bytes,item.path);
 assert.equal(createHash('sha256').update(bytes).digest('hex'),item.sha256,item.path);
}
const old=manifest.files.find(f=>f.path.includes('staged-preservation-stage5-pre-fresh/'));
assert.equal(old.sha256,'82e8107ec38f66c87284d892c327bd360c80ff4b0ab5b7a25693d00a3b2e6708');
const alpertron=JSON.parse(await readFile('docs/legacy/alpertron-source-manifest.json'));
assert.equal(alpertron.commit,'4854656a050f280397d7908efa42fca8114c8297');assert.equal(alpertron.files.length,8);
for(const f of alpertron.files){assert.equal(f.url,'https://raw.githubusercontent.com/alpertron/calculators/'+alpertron.commit+'/'+f.path);assert.match(f.sha256,/^[0-9a-f]{64}$/);assert.match(f.gitBlob,/^[0-9a-f]{40}$/);}
console.log('Verified immutable historical methods, raw/source/build hashes, archived corrections and 21 original validation logs');

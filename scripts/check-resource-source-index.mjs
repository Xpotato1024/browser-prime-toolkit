// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const index=JSON.parse(readFileSync('native/resources/source-index.json'));
assert.equal(index.version,1);assert.equal(index.sourceCommit,'4203aab1703e9129fd3e86343c485c334bbccc4a');
assert.equal(index.repository,'https://github.com/Xpotato1024/browser-prime-toolkit');
const sha=b=>createHash('sha256').update(b).digest('hex'),seen=new Set();
for(const f of index.files){
 assert.match(f.path,/^[a-zA-Z0-9._/-]+$/);assert.ok(!f.path.split('/').includes('..'));assert.ok(!seen.has(f.path));seen.add(f.path);
 assert.equal(f.url,index.repository+'/blob/'+index.sourceCommit+'/'+f.path);
 const b=execFileSync('git',['show',index.sourceCommit+':'+f.path],{maxBuffer:16*1024*1024});assert.equal(b.length,f.bytes);assert.equal(sha(b),f.sha256);
 assert.equal(sha(readFileSync(f.path)),f.sha256,'Indexed current source '+f.path);
}
for(const p of ['src/resources/session.js','src/resources/policy.js','src/coordinator/runner.js','native/resources/build-64.json','native/resources/build-128.json','native/rusqsieve/staged-upstream.json','native/rusqsieve/RustDockerfile','LICENSE','NOTICE'])assert.ok(seen.has(p),'Required source/license '+p);
console.log('Verified '+seen.size+' immutable source/license/build mappings');

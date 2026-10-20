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

const screenshots=JSON.parse(readFileSync('docs/benchmarks/staged-resources-stage21/screenshots.json'));
assert.deepEqual(screenshots.map(x=>x.originalName),['ui-desktop.png','ui-mobile.png']);
for(const row of screenshots){
 assert.equal(row.base64File,row.originalName+'.base64');
 const text=readFileSync('docs/benchmarks/staged-resources-stage21/'+row.base64File,'utf8');
 assert.match(text,/^[A-Za-z0-9+/]+={0,2}\n$/);
 const b=Buffer.from(text.trim(),'base64');assert.equal(b.toString('base64')+'\n',text);
 assert.equal(b.length,row.bytes);assert.equal(sha(b),row.sha256);
 assert.equal(row.immutableOriginal,index.repository+'/blob/'+index.sourceCommit+'/docs/benchmarks/staged-resources-stage21/'+row.originalName);
 assert.ok(b.equals(execFileSync('git',['show',index.sourceCommit+':docs/benchmarks/staged-resources-stage21/'+row.originalName],{maxBuffer:8*1024*1024})));
}
console.log('Verified lossless screenshot encoding against immutable original PNG bytes');

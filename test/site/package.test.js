// SPDX-License-Identifier: AGPL-3.0-only
import test from 'node:test';
import {SITE_CAPABILITIES} from '../../src/site/capabilities.js';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,readdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
test('release generator has a fixed exact-set, license/source files and reproducible bytes',async()=>{
 const parent=await mkdtemp(join(tmpdir(),'prime-release-test-'));
 try{
  const outputs=['a','b'].map(name=>join(parent,name));
  const results=outputs.map(out=>JSON.parse(execFileSync(process.execPath,['scripts/build-site-release.mjs',out],{encoding:'utf8'})));
  assert.equal(results[0].artifactSha256,results[1].artifactSha256);
  const m=JSON.parse(await readFile(join(outputs[0],'browser-tool.json'),'utf8'));
  assert.ok((await readFile(join(outputs[0],m.integration.entry),'utf8')).includes("'data-prime-tool-version':'"+m.version+"'"),'runtime label matches release version');
  assert.equal(m.runtime.profile,'bounded-browser-v2');
  assert.deepEqual(m.uiCapabilities,SITE_CAPABILITIES,'shipped metadata and runtime policy share one definition');
  const distributed=await import(pathToFileURL(join(outputs[0],'src/site/capabilities.mjs')).href);assert.deepEqual(distributed.SITE_CAPABILITIES,m.uiCapabilities);
  assert.equal(m.runtime.capabilities.clipboard,true);
  assert.equal(m.runtime.clipboardPolicy,'user-gesture-write-only');assert.equal(m.runtime.assetMode,'fixed-bundled');
  for(const f of m.files){
   const b=await readFile(join(outputs[0],f.path));
   assert.equal(b.length,f.bytes);assert.equal(createHash('sha256').update(b).digest('hex'),f.sha256);
   assert.ok(b.length<=2000000);assert.ok(!f.path.includes('bench/'));
  }
  for(const p of ['SOURCE_OFFER.md','THIRD_PARTY_NOTICES.md','licensing/site-release-v0.1.0.json','licensing/artifact-index.json','vendor/emscripten/MUSL-COPYRIGHT.txt'])assert.ok(m.license.additional.includes(p));
  const pkg=JSON.parse(await readFile(join(outputs[0],'package.json'),'utf8'));assert.equal(pkg.scripts,undefined);assert.equal(pkg.dependencies,undefined);
  assert.throws(()=>execFileSync(process.execPath,['scripts/build-site-release.mjs',outputs[0]],{stdio:'pipe'}));
 }finally{await rm(parent,{recursive:true,force:true});}
});

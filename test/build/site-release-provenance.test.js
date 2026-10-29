// SPDX-License-Identifier: AGPL-3.0-only
// Execute the production packaging script with a closed, inert virtual filesystem.
// No actual release tree, engine module, artifact or child process can be accessed.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,relative,dirname,isAbsolute,sep} from 'node:path';
import vm from 'node:vm';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const builder=await readFile(new URL('../../scripts/build-site-release.mjs',import.meta.url),'utf8');
const helper=await readFile(new URL('../../scripts/artifact-provenance.mjs',import.meta.url),'utf8');
const b=s=>Buffer.from(s);
test('real packager hashes provenance into manifest using only closed byte fixtures',async()=>{
 if(typeof vm.SourceTextModule!=='function'){
  const child=spawnSync(process.execPath,['--experimental-vm-modules','--test',fileURLToPath(import.meta.url)],{encoding:'utf8',timeout:10000});
  assert.ifError(child.error);assert.equal(child.status,0,child.stdout+child.stderr);return;
 }
 const writes=new Map(),reads=[],gitCalls=[],fixtureRoot=resolve('/fixture'),fixtureOut=resolve('/artifact');
 const licenses=new Set(['LICENSE','NOTICE','LICENSING.md','SOURCE_OFFER.md','THIRD_PARTY_NOTICES.md',
  'licensing/artifact-index.json','licensing/site-release-v0.1.0.json','licensing/site-release-candidate.json',
  'vendor/emscripten/MUSL-COPYRIGHT.txt','vendor/emscripten/COMPILER-RT-LICENSE.txt','vendor/emscripten/EMSCRIPTEN-LICENSE.txt','vendor/emscripten/NOTICE.md',
  'vendor/gmp/COPYING','vendor/gmp/COPYING.LESSERv3','vendor/gmp/COPYINGv2','vendor/gmp/COPYINGv3',
  'vendor/gmp-ecm/COPYING','vendor/gmp-ecm/COPYING.LIB','native/rusqsieve/LICENSE-APACHE','native/rusqsieve/LICENSE-MPL',
  'native/rusqsieve/toolchain-notices/rustc-LICENSE-APACHE','native/rusqsieve/toolchain-notices/rustc-LICENSE-MIT',
  'native/rusqsieve/toolchain-notices/wasm-std-LICENSE-APACHE','native/rusqsieve/toolchain-notices/wasm-std-LICENSE-MIT']);
 const source=new Map([
  ['src/site/index.js',b("import {value} from './value.js'; export {value};")],
  ['src/site/value.js',b("import {BYTES} from './wasm-bytes.js'; export const WORKER_SOURCE=\"use strict;\"+BYTES; export const value=7;")],
  ['src/site/wasm-bytes.js',b('export const BYTES="AGFzbQE="; // inert fixture, never loaded or instantiated')],
  ['src/site/font-text.js',b('// fixture font')],
  ['src/site/tool.css',b('.fixture { color: black; }')],
  ['src/site/capabilities.js',b('// fixture capabilities')],
  ['package.json',b(JSON.stringify({name:'fixture-only',version:'0.0.0',license:'AGPL-3.0-only'}))],
  ['scripts/build-site-release.mjs',b(builder)],['scripts/artifact-provenance.mjs',b(helper)],
  ['scripts/site-font-text.mjs',b('// fixture font recipe')]
 ]);
 const fileSystem={
  async readFile(path,encoding){
   const key=relative(fixtureRoot,path).replaceAll('\\','/');reads.push(key);
   let value=source.get(key);
   if(!value){
    assert.ok(!key.startsWith('src/')&&!key.startsWith('scripts/')&&!key.includes('..'),'Forbidden fixture read: '+key);
    assert.ok(licenses.has(key),'Unknown license fixture read: '+key);
    value=b('inert license fixture: '+key);
   }
   return encoding?value.toString(encoding):Buffer.from(value);
  },
  async stat(path){assert.equal(path,fixtureOut);throw Object.assign(Error('absent'),{code:'ENOENT'});},
  async mkdir(){},
  async writeFile(path,bytes,options){
   assert.equal(options.flag,'wx');assert.ok(path.startsWith(fixtureOut+sep));assert.ok(!writes.has(path));
   writes.set(path,Buffer.from(bytes));
  }
 };
 const context=vm.createContext({Buffer,process:{argv:['node','build-site-release.mjs',fixtureOut],version:'v24.22.1'},console:{log(){}}});
 const synthetic=exports=>new vm.SyntheticModule(Object.keys(exports),function(){for(const[k,v]of Object.entries(exports))this.setExport(k,v);},{context});
 const modules=new Map([
  ['node:fs/promises',synthetic(fileSystem)],
  ['node:path',synthetic({resolve,relative,dirname,isAbsolute,sep})],
  ['node:crypto',synthetic({createHash})],
  ['node:child_process',synthetic({execFileSync(command,args,options){
   gitCalls.push({command,args});assert.equal(command,'git');assert.deepEqual(Array.from(args),['rev-parse','--verify','HEAD^{commit}']);
   assert.equal(options.cwd,fixtureRoot);return 'a'.repeat(40)+'\n';
  }})],
  ['../src/site/capabilities.js',synthetic({SITE_CAPABILITIES:{fixtureOnly:true}})],
  ['./site-font-text.mjs',synthetic({siteFontModule:async()=> '// fixture font'})]
 ]);
 const auditedHelper=new vm.SourceTextModule(helper,{context});
 modules.set('./artifact-provenance.mjs',auditedHelper);
 const entry=new vm.SourceTextModule(builder,{context,initializeImportMeta(meta){meta.dirname=resolve(fixtureRoot,'scripts');}});
 await entry.link(specifier=>{assert.ok(modules.has(specifier),'Unexpected import: '+specifier);return modules.get(specifier);});
 await entry.evaluate();
 assert.equal(gitCalls.length,1);
 assert.ok(reads.every(p=>source.has(p)||licenses.has(p)));
 assert.ok(!reads.some(p=>p.endsWith('.wasm')||p.startsWith('src/engine/')||p.startsWith('src/optimized/')));
 const provenance=JSON.parse(writes.get(resolve(fixtureOut,'artifact-provenance.json')));
 const manifest=JSON.parse(writes.get(resolve(fixtureOut,'browser-tool.json')));
 assert.equal(provenance.source.revision,'a'.repeat(40));assert.equal(provenance.source.cleanTree,'not-asserted');
 assert.equal(provenance.outputs.length,writes.size-2);
 assert.ok(!provenance.outputs.some(o=>['browser-tool.json','artifact-provenance.json'].includes(o.path)));
 const entryHash=manifest.files.find(f=>f.path==='artifact-provenance.json');
 assert.equal(entryHash.sha256,sha(writes.get(resolve(fixtureOut,'artifact-provenance.json'))));
 for(const o of provenance.outputs){assert.equal(o.sha256,sha(writes.get(resolve(fixtureOut,o.path))));assert.equal(o.bytes,writes.get(resolve(fixtureOut,o.path)).length);}
 assert.equal(writes.get(resolve(fixtureOut,'src/site/index.mjs')).toString(),"import {value} from './value.mjs'; export {value};");
 assert.equal(manifest.runtime.maxWasmBytes,1610612736);assert.equal(manifest.runtime.maxWorkers,6);
 assert.equal(manifest.runtime.network,'none-after-ready');
 assert.ok(manifest.runtime.embeddedWorkerModules.includes('src/site/value.mjs'));
 assert.ok(!manifest.runtime.embeddedWorkerModules.includes('src/site/wasm-bytes.mjs'));
 assert.ok(manifest.runtime.embeddedWasmModules.includes('src/site/wasm-bytes.mjs'),'Imported WASM bytes must be inventoried independently of worker assembly');
});

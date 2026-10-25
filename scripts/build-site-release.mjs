// SPDX-License-Identifier: AGPL-3.0-only
import {readFile,mkdir,writeFile,stat} from 'node:fs/promises';
import {resolve,relative,dirname,isAbsolute,sep} from 'node:path';
import {createHash} from 'node:crypto';
import {SITE_CAPABILITIES} from '../src/site/capabilities.js';
import {siteFontModule} from './site-font-text.mjs';
const root=resolve(import.meta.dirname,'..'),out=resolve(process.argv[2]??'');
if(await readFile(resolve(root,'src/site/font-text.js'),'utf8')!==await siteFontModule(root))throw Error('UI font corpus is stale');
const inside=relative(root,out);
if(process.argv.length!==3||inside===''||(!isAbsolute(inside)&&inside!=='..'&&!inside.startsWith('..'+sep)))throw Error('Fresh external output directory required');
try{await stat(out);throw Error('Output already exists');}catch(e){if(e.code!=='ENOENT')throw e;}
const files=new Map(),hash=b=>createHash('sha256').update(b).digest('hex');
async function visit(path){
 if(files.has(path.replace(/\.js$/u,'.mjs')))return;
 if(!path.startsWith('src/')||path.includes('..'))throw Error('Local source graph required');
 let source=await readFile(resolve(root,path),'utf8');
 const refs=new Set([...source.matchAll(/(?:from\s*|import\s*\()(['"])(\.[^'"]+\.js)\1/gu)].map(m=>m[2]));
 for(const ref of refs){
  const target=relative(root,resolve(root,dirname(path),ref)).replaceAll('\\','/');
  if(!target.startsWith('src/'))throw Error('Source graph escape');
  await visit(target);source=source.replaceAll(ref,ref.replace(/\.js$/u,'.mjs'));
 }
 files.set(path.replace(/\.js$/u,'.mjs'),Buffer.from(source));
}
await visit('src/site/index.js');
files.set('tool.css',await readFile(resolve(root,'src/site/tool.css')));
for(const path of ['LICENSE','NOTICE'])files.set(path,await readFile(resolve(root,path)));
const extraLicenseFiles=['licensing/artifact-index.json','licensing/site-release-v0.1.0.json','licensing/site-release-candidate.json','LICENSING.md','SOURCE_OFFER.md','THIRD_PARTY_NOTICES.md',
 'vendor/emscripten/MUSL-COPYRIGHT.txt','vendor/emscripten/COMPILER-RT-LICENSE.txt','vendor/emscripten/EMSCRIPTEN-LICENSE.txt','vendor/emscripten/NOTICE.md',
 'vendor/gmp/COPYING','vendor/gmp/COPYING.LESSERv3','vendor/gmp/COPYINGv2','vendor/gmp/COPYINGv3',
 'vendor/gmp-ecm/COPYING','vendor/gmp-ecm/COPYING.LIB',
 'native/rusqsieve/LICENSE-APACHE','native/rusqsieve/LICENSE-MPL',
 'native/rusqsieve/toolchain-notices/rustc-LICENSE-APACHE','native/rusqsieve/toolchain-notices/rustc-LICENSE-MIT',
 'native/rusqsieve/toolchain-notices/wasm-std-LICENSE-APACHE','native/rusqsieve/toolchain-notices/wasm-std-LICENSE-MIT'];
for(const path of extraLicenseFiles)files.set(path,await readFile(resolve(root,path)));
const pkg=JSON.parse(await readFile(resolve(root,'package.json'),'utf8'));
files.set('package.json',Buffer.from(JSON.stringify({name:pkg.name,version:pkg.version,type:'module',license:pkg.license,main:'./src/site/index.mjs',exports:{'.':'./src/site/index.mjs'},peerDependencies:pkg.peerDependencies},null,2)+'\n'));
const embeddedWorkerModules=[...files].filter(([p,b])=>p.endsWith('.mjs')&&/(?:STAGED_SOURCE|[A-Z_]*WORKER_SOURCE)\s*=\s*"/u.test(b.toString())).map(([p])=>p).sort();
const embeddedWasmModules=embeddedWorkerModules.filter(p=>files.get(p).toString().includes('AGFzbQE'));
const manifest={schemaVersion:1,toolId:'prime-factorizer',version:pkg.version,uiCapabilities:SITE_CAPABILITIES,integration:{kind:'react-island',apiVersion:1,entry:'src/site/index.mjs',styles:['tool.css']},
 runtime:{profile:'bounded-browser-v2',network:'none-after-ready',storage:'memory',clipboardPolicy:'user-gesture-write-only',assetMode:'fixed-bundled',embeddedWorkerModules,embeddedWasmModules,workerLoaderModules:['src/worker/source-factory.mjs'],capabilities:{fileInput:false,download:false,clipboard:true,worker:true,wasm:true},maxInputBytes:16384,maxOutputBytes:262144,maxComputeMs:100,jobMaxMs:3600000,maxWorkers:6,maxWasmBytes:1610612736,maxTransportBytes:67108864},
 license:{spdx:pkg.license,file:'LICENSE',notice:'NOTICE',additional:extraLicenseFiles},files:[...files].sort(([a],[b])=>a.localeCompare(b,'en')).map(([path,b])=>({path,bytes:b.length,sha256:hash(b)}))};
files.set('browser-tool.json',Buffer.from(JSON.stringify(manifest,null,2)+'\n'));
await mkdir(out,{recursive:true});
for(const[path,b]of files){await mkdir(dirname(resolve(out,path)),{recursive:true});await writeFile(resolve(out,path),b,{flag:'wx'});}
const treeHash=hash(JSON.stringify([...files].sort(([a],[b])=>a.localeCompare(b,'en')).map(([path,b])=>[path,b.length,hash(b)])));
console.log(JSON.stringify({files:files.size,bytes:[...files.values()].reduce((n,b)=>n+b.length,0),artifactSha256:treeHash}));

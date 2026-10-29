// SPDX-License-Identifier: AGPL-3.0-only
import {readFile,mkdir,writeFile,stat} from 'node:fs/promises';
import {resolve,relative,dirname,isAbsolute,sep} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createArtifactProvenance,localReferences,rewriteLocalReferences,releasePackage} from './artifact-provenance.mjs';
import {SITE_CAPABILITIES} from '../src/site/capabilities.js';
import {siteFontModule} from './site-font-text.mjs';
const root=resolve(import.meta.dirname,'..'),out=resolve(process.argv[2]??'');
if(await readFile(resolve(root,'src/site/font-text.js'),'utf8')!==await siteFontModule(root))throw Error('UI font corpus is stale');
const inside=relative(root,out);
if(process.argv.length!==3||inside===''||(!isAbsolute(inside)&&inside!=='..'&&!inside.startsWith('..'+sep)))throw Error('Fresh external output directory required');
try{await stat(out);throw Error('Output already exists');}catch(e){if(e.code!=='ENOENT')throw e;}
const files=new Map(),inputs=new Map(),origins=new Map(),hash=b=>createHash('sha256').update(b).digest('hex');
async function readInput(path){const bytes=await readFile(resolve(root,path));inputs.set(path,bytes);return bytes;}
async function copy(path,sourcePath=path){files.set(path,await readInput(sourcePath));origins.set(path,{sourcePath,transform:'copy'});}
async function visit(path){
 if(files.has(path.replace(/\.js$/u,'.mjs')))return;
 if(!path.startsWith('src/')||path.includes('..'))throw Error('Local source graph required');
 const source=(await readInput(path)).toString('utf8');
 const refs=localReferences(source);
 for(const ref of refs){
  const target=relative(root,resolve(root,dirname(path),ref)).replaceAll('\\','/');
  if(!target.startsWith('src/'))throw Error('Source graph escape');
  await visit(target);
 }
 const outputPath=path.replace(/\.js$/u,'.mjs');
 files.set(outputPath,Buffer.from(rewriteLocalReferences(source)));origins.set(outputPath,{sourcePath:path,transform:'local-esm-extension'});
}
await visit('src/site/index.js');
await copy('tool.css','src/site/tool.css');
for(const path of ['LICENSE','NOTICE'])await copy(path);
const extraLicenseFiles=['licensing/artifact-index.json','licensing/site-release-v0.1.0.json','licensing/site-release-candidate.json','LICENSING.md','SOURCE_OFFER.md','THIRD_PARTY_NOTICES.md',
 'vendor/emscripten/MUSL-COPYRIGHT.txt','vendor/emscripten/COMPILER-RT-LICENSE.txt','vendor/emscripten/EMSCRIPTEN-LICENSE.txt','vendor/emscripten/NOTICE.md',
 'vendor/gmp/COPYING','vendor/gmp/COPYING.LESSERv3','vendor/gmp/COPYINGv2','vendor/gmp/COPYINGv3',
 'vendor/gmp-ecm/COPYING','vendor/gmp-ecm/COPYING.LIB',
 'native/rusqsieve/LICENSE-APACHE','native/rusqsieve/LICENSE-MPL',
 'native/rusqsieve/toolchain-notices/rustc-LICENSE-APACHE','native/rusqsieve/toolchain-notices/rustc-LICENSE-MIT',
 'native/rusqsieve/toolchain-notices/wasm-std-LICENSE-APACHE','native/rusqsieve/toolchain-notices/wasm-std-LICENSE-MIT'];
for(const path of extraLicenseFiles)await copy(path);
const packageBytes=await readInput('package.json'),pkg=JSON.parse(packageBytes.toString('utf8'));
files.set('package.json',releasePackage(packageBytes));origins.set('package.json',{sourcePath:'package.json',transform:'release-package'});
const recipes=['scripts/build-site-release.mjs','scripts/artifact-provenance.mjs','scripts/site-font-text.mjs','src/site/capabilities.js'];
for(const path of recipes)await readInput(path);
const sourceRevision=execFileSync('git',['rev-parse','--verify','HEAD^{commit}'],{cwd:root,encoding:'utf8',timeout:5000}).trim();
const provenance=createArtifactProvenance({sourceRevision,nodeVersion:process.version,inputs,files,origins,recipes,sourceOffer:['SOURCE_OFFER.md','THIRD_PARTY_NOTICES.md','LICENSING.md']});
files.set('artifact-provenance.json',Buffer.from(JSON.stringify(provenance,null,2)+'\n'));
const embeddedWorkerModules=[...files].filter(([p,b])=>p.endsWith('.mjs')&&/(?:STAGED_SOURCE|[A-Z_]*WORKER_SOURCE)\s*=\s*"/u.test(b.toString())).map(([p])=>p).sort();
// Literal WASM containers can be separate imports used to assemble a Worker (e.g. ECM).
const embeddedWasmModules=[...files].filter(([p,b])=>p.endsWith('.mjs')&&b.toString().includes('AGFzbQE')).map(([p])=>p).sort();
const manifest={schemaVersion:1,toolId:'prime-factorizer',version:pkg.version,uiCapabilities:SITE_CAPABILITIES,integration:{kind:'react-island',apiVersion:1,entry:'src/site/index.mjs',styles:['tool.css']},
 runtime:{profile:'bounded-browser-v2',network:'none-after-ready',storage:'memory',clipboardPolicy:'user-gesture-write-only',assetMode:'fixed-bundled',embeddedWorkerModules,embeddedWasmModules,workerLoaderModules:['src/worker/source-factory.mjs'],capabilities:{fileInput:false,download:false,clipboard:true,worker:true,wasm:true},maxInputBytes:16384,maxOutputBytes:262144,maxComputeMs:100,jobMaxMs:3600000,maxWorkers:6,maxWasmBytes:1610612736,maxTransportBytes:67108864},
 license:{spdx:pkg.license,file:'LICENSE',notice:'NOTICE',additional:extraLicenseFiles},files:[...files].sort(([a],[b])=>a.localeCompare(b,'en')).map(([path,b])=>({path,bytes:b.length,sha256:hash(b)}))};
files.set('browser-tool.json',Buffer.from(JSON.stringify(manifest,null,2)+'\n'));
await mkdir(out,{recursive:true});
for(const[path,b]of files){await mkdir(dirname(resolve(out,path)),{recursive:true});await writeFile(resolve(out,path),b,{flag:'wx'});}
const treeHash=hash(JSON.stringify([...files].sort(([a],[b])=>a.localeCompare(b,'en')).map(([path,b])=>[path,b.length,hash(b)])));
console.log(JSON.stringify({files:files.size,bytes:[...files.values()].reduce((n,b)=>n+b.length,0),artifactSha256:treeHash}));

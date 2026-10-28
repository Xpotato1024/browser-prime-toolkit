// SPDX-License-Identifier: AGPL-3.0-only
// Byte-only release provenance. Never imports, decodes or executes packaged modules.
import {createHash} from 'node:crypto';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const reserved=new Set(['artifact-provenance.json','browser-tool.json']);
function localPath(path){
 if(typeof path!=='string'||path.length>240||!/^[A-Za-z0-9_./-]+$/u.test(path)||path.split('/').some(p=>!p||p==='.'||p==='..'))throw Error('Portable local path required');
 return path;
}
export function localReferences(source){
 return [...new Set([...source.matchAll(/(?:from\s*|import\s*\()(['"])(\.[^'"]+\.js)\1/gu)].map(m=>m[2]))];
}
export function rewriteLocalReferences(source){
 for(const ref of localReferences(source))source=source.replaceAll(ref,ref.replace(/\.js$/u,'.mjs'));
 return source;
}
export function releasePackage(bytes){
 const pkg=JSON.parse(bytes.toString('utf8'));
 return Buffer.from(JSON.stringify({name:pkg.name,version:pkg.version,type:'module',license:pkg.license,main:'./src/site/index.mjs',exports:{'.':'./src/site/index.mjs'},peerDependencies:pkg.peerDependencies},null,2)+'\n');
}
const describe=(path,bytes)=>({path,bytes:bytes.length,sha256:hash(bytes)});
const sorted=values=>[...values].sort((a,b)=>a<b?-1:a>b?1:0);
function byteMap(value,label){
 if(!(value instanceof Map)||value.size===0||value.size>10000)throw Error('Finite '+label+' map required');
 const aliases=new Set();let total=0;
 for(const[path,bytes]of value){
  localPath(path);const alias=path.toLowerCase();
  if(aliases.has(alias))throw Error('Path collision');aliases.add(alias);
  if(!Buffer.isBuffer(bytes))throw Error('Buffer required');
  total+=bytes.length;if(total>64*1024*1024)throw Error('Byte budget exceeded');
 }
}
export function createArtifactProvenance({sourceRevision,nodeVersion,inputs,files,origins,recipes,sourceOffer}){
 if(typeof sourceRevision!=='string'||!(/^[a-f0-9]{40}$/u).test(sourceRevision))throw Error('Fixed source revision required');
 if(typeof nodeVersion!=='string'||!(/^v\d+\.\d+\.\d+$/u).test(nodeVersion))throw Error('Exact Node version required');
 byteMap(inputs,'input');byteMap(files,'output');
 if(!(origins instanceof Map)||origins.size!==files.size)throw Error('Origin count mismatch');
 if(!Array.isArray(recipes)||recipes.length===0||recipes.length>100||new Set(recipes).size!==recipes.length)throw Error('Recipe list required');
 if(!Array.isArray(sourceOffer)||sourceOffer.length===0||sourceOffer.length>100||new Set(sourceOffer).size!==sourceOffer.length)throw Error('Source offer list required');
 const used=new Set();
 const recipeEntries=sorted(recipes).map(path=>{
  localPath(path);const bytes=inputs.get(path);if(!bytes)throw Error('Missing recipe input');
  used.add(path);return describe(path,bytes);
 });
 const outputs=sorted(files.keys()).map(path=>{
  if(reserved.has(path.toLowerCase()))throw Error('Reserved output in receipt');
  const origin=origins.get(path);
  if(!origin||Object.keys(origin).sort().join(',')!=='sourcePath,transform')throw Error('Origin shape mismatch');
  const sourcePath=localPath(origin.sourcePath),source=inputs.get(sourcePath);
  if(!source)throw Error('Missing source input');used.add(sourcePath);
  const output=files.get(path);let expected;
  if(origin.transform==='copy')expected=source;
  else if(origin.transform==='local-esm-extension'){
   if(!sourcePath.startsWith('src/')||!sourcePath.endsWith('.js')||path!==sourcePath.replace(/\.js$/u,'.mjs'))throw Error('ESM path mismatch');
   expected=Buffer.from(rewriteLocalReferences(source.toString('utf8')));
  }else if(origin.transform==='release-package'){
   if(sourcePath!=='package.json'||path!=='package.json')throw Error('Package path mismatch');
   expected=releasePackage(source);
  }else throw Error('Unknown transformation');
  if(!output.equals(expected))throw Error('Transformation mismatch: '+path);
  return{...describe(path,output),kind:path.endsWith('.mjs')?'javascript-container':path.endsWith('.json')?'json':path.endsWith('.css')?'stylesheet':'text',
   source:describe(sourcePath,source),transformation:origin.transform};
 });
 for(const path of sourceOffer){localPath(path);if(!files.has(path))throw Error('Source offer file missing');}
 for(const path of inputs.keys())if(!used.has(path))throw Error('Unused input: '+path);
 return{schemaVersion:1,purpose:'site-release-provenance',
  source:{repository:'https://github.com/Xpotato1024/browser-prime-toolkit',revision:sourceRevision,revisionRole:'repository-head-context',cleanTree:'not-asserted'},
  toolchain:{node:nodeVersion},recipes:recipeEntries,outputs,sourceOffer:sorted(sourceOffer),
  limits:{internalWasmInspected:false,cleanRebuildCompared:false,authenticityVerified:false,securityVerdict:'not-assessed'}};
}

import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {writeGenerated} from './generated-file.mjs';
const outputs=[];
for(const engine of ['base','lto']){
 const path=engine==='base'?'siqs-lab':'siqs-tuned';
 const receipt=JSON.parse(readFileSync(new URL('../native/'+path+'/staged-build.json',import.meta.url)));
 let module=readFileSync(new URL('../src/'+path+'/module.js',import.meta.url),'utf8');
 if(!module.endsWith('export default Module;\n'))throw Error('Tuned module export');
 module=module.replaceAll('import.meta.url',JSON.stringify('blob:siqs-tuned-'+engine)).replace('export default Module;','return Module;');
 const paths=['src/siqs-tuned/contracts.js','src/'+path+'/bytes.js','src/siqs-tuned/worker.js'];
 const chunks=paths.map(p=>{
  let code=readFileSync(new URL('../'+p,import.meta.url),'utf8');
  code=code.replace(/^import .+ from '[^']+';\n/gm,'').replace(/^export (?=(?:async )?(const|class|function) )/gm,'');
  if(/^(import|export) /m.test(code)||/\bimport\s*\(/.test(code))throw Error('Tuned module syntax '+p);
  return '// '+p+'\n'+code;
 });
 const prefix="'use strict';\nconst LAB_BUILD="+JSON.stringify(receipt.wasmSha256)+";\nconst createLabModule=(()=>{"+module+"})();\n"+chunks.join('\n');
 const code=prefix+'\ninstallLabWorker().catch(error=>self.postMessage({type:"error",version:15,code:"lab-initialization",message:String(error?.message).slice(0,256)}));\n';
 const checked=spawnSync(process.execPath,['--check','--input-type=module'],{input:code,encoding:'utf8'});
 if(checked.status!==0)throw Error(checked.stderr);
 outputs.push('export const '+(engine==='base'?'BASE_WORKER_SOURCE':'TUNED_WORKER_SOURCE')+'='+JSON.stringify(code)+';\n');
 console.log(engine,Buffer.byteLength(code),createHash('sha256').update(code).digest('hex'));
}
writeGenerated(new URL('../src/siqs-tuned/worker-source.js',import.meta.url),'// Private generated fixed-profile Workers.\n'+outputs.join(''));

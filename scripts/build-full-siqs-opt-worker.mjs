import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {writeGenerated} from './generated-file.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const paths=['src/core/integer-input.js','src/engine/options.js','src/engine/arithmetic.js','src/full-siqs-opt/core-result.js','src/full-siqs-opt/options.js','src/full-siqs-opt/factor.js','src/full-siqs-opt/profile.js','src/full-siqs-opt/failure.js','src/full-siqs-opt/kernel.js','src/full-siqs-opt/install.js'];
let output='// Generated fixed-source full SIQS experiment Workers.\n';
for(const engine of ['base','lto']){
 const dir=engine==='base'?'siqs-lab':'siqs-tuned';let module=read('src/'+dir+'/module.js');
 if(!module.endsWith('export default Module;\n'))throw Error('Full optimized module export');
 module=module.replaceAll('import.meta.url',JSON.stringify('blob:full-siqs-opt-local')).replace('export default Module;','return Module;');
 const bytes=read('src/'+dir+'/bytes.js').replaceAll('LAB_SIQS_BASE64','FULL_SIQS_BASE64').replace('export const','const');
 const settings={engine,stride:engine==='base'?1024:16384};
 const chunks=paths.map(path=>{let code=read(path);code=code.replace(/^import .+ from '[^']+';\n/gm,'').replace(/^export (?=(?:async )?(const|class|function) )/gm,'');
  if(/^(import|export) /m.test(code)||/\bimport\s*\(/.test(code))throw Error('Unexpected module syntax '+path);
  if(path==='src/core/integer-input.js')code=code.replace(/\bfail\b/g,'rsaInputFail');return '// '+path+'\n'+code;});
 const code="'use strict';\nconst createFullModule=(()=>{"+module+'})();\nconst FULL_SETTINGS='+JSON.stringify(settings)+';\n'+bytes+'\n'+chunks.join('\n')+'\ninstallRsaWorker().catch(error=>self.postMessage({protocolVersion:3,profile:RSA_PROFILE.id,type:"error",jobId:1,code:"full-siqs-opt-initialization",message:String(error?.message).slice(0,256)}));\n';
 const checked=spawnSync(process.execPath,['--check','--input-type=module'],{input:code,encoding:'utf8'});if(checked.status!==0)throw Error(checked.stderr);
 output+='export const '+(engine==='base'?'BASE':'TUNED')+'_FULL_WORKER_SOURCE='+JSON.stringify(code)+';\n';console.log(engine,Buffer.byteLength(code));
}
writeGenerated(new URL('../src/full-siqs-opt/worker-source.js',import.meta.url),output);

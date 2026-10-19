import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {writeGenerated} from './generated-file.mjs';
const paths=['src/core/integer-input.js','src/engine/options.js','src/engine/arithmetic.js','src/full-siqs/core-result.js',
 'src/full-siqs/options.js','src/full-siqs/factor.js','src/full-siqs/profile.js','src/full-siqs/bytes.js','src/full-siqs/failure.js','src/full-siqs/kernel.js','src/full-siqs/install.js'];
let module=readFileSync(new URL('../src/full-siqs/module.js',import.meta.url),'utf8');
if(!module.endsWith('export default Module;\n'))throw Error('Full SIQS generated module export');
module=module.replaceAll('import.meta.url',JSON.stringify('blob:full-siqs-local')).replace('export default Module;','return Module;');
const chunks=paths.map(path=>{
 let code=readFileSync(new URL('../'+path,import.meta.url),'utf8');
 code=code.replace(/^import .+ from '[^']+';\n/gm,'').replace(/^export (?=(?:async )?(const|class|function) )/gm,'');
 if(/^(import|export) /m.test(code)||/\bimport\s*\(/.test(code))throw Error('Full SIQS unsupported module syntax '+path);
 if(path==='src/core/integer-input.js')code=code.replace(/\bfail\b/g,'rsaInputFail');
 return '// '+path+'\n'+code;
});
const code="'use strict';\nconst createFullModule=(()=>{"+module+"})();\n"+chunks.join('\n')+'\ninstallRsaWorker().catch(error=>self.postMessage({protocolVersion:3,profile:RSA_PROFILE.id,type:"error",jobId:1,code:"full-siqs-initialization",message:String(error?.message).slice(0,256)}));\n';
const checked=spawnSync(process.execPath,['--check','--input-type=module'],{input:code,encoding:'utf8'});
if(checked.status!==0)throw Error(checked.stderr);
writeGenerated(new URL('../src/full-siqs/worker-source.js',import.meta.url),'// Generated full SIQS Worker; no runtime imports.\nexport const RSA_WORKER_SOURCE='+JSON.stringify(code)+';\n');
console.log('Full SIQS Worker bytes',Buffer.byteLength(code));

import {WORKER_SOURCE} from './siqs-worker-source.js';
import {EVALUATION_SOURCE as LEGACY_PROFILE} from './siqs-profile-source.js';
import {COUNTED_SOURCE as CLOCK} from './counted-clock-gated-source.js';
import {COUNTED_SOURCE as DENSE} from './counted-dense-source.js';
import {COUNTED_SOURCE as LANCZOS} from './counted-lanczos-source.js';
import {makeWorkerFromSource} from './source-factory.js';
export function makeCountedWorker({variant='legacy',capture=false,profile=false,fault=false}={},dependencies) {
  if(!['legacy','clock-gated','dense','lanczos'].includes(variant)||[capture,profile,fault].some(x=>typeof x!=='boolean'))throw TypeError('Counted Worker config');
  if(variant==='legacy')return makeWorkerFromSource(profile?LEGACY_PROFILE+'\ncreateSiqsProfile().then(split=>installFactorWorker(split,["siqs"],()=>split.stats())).catch(()=>self.postMessage({protocolVersion:1,type:"error",jobId:null,code:"initialization-error"}));':WORKER_SOURCE,dependencies);
  const core=variant==='clock-gated'?CLOCK:variant==='dense'?DENSE:LANCZOS;
  const boot='\ncreateCountedSiqsSplit('+JSON.stringify(variant)+','+JSON.stringify({capture,profile})+').then(split=>{'+
    (fault?'const crash=new WebAssembly.Instance(new WebAssembly.Module(Uint8Array.from([0,97,115,109,1,0,0,0,1,4,1,96,0,0,3,2,1,0,7,9,1,5,99,114,97,115,104,0,0,10,5,1,3,0,0,11]))).exports.crash; const broken=()=>crash();broken.stats=split.stats;broken.audit=split.audit;installCountedWorker(broken);':'installCountedWorker(split);')+
    '}).catch(()=>self.postMessage({protocolVersion:1,type:"error",jobId:null,code:"initialization-error"}));';
  return makeWorkerFromSource(core+boot,dependencies);
}

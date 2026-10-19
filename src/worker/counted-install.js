import {factorInteger} from '../engine/factor.js';
export function installCountedWorker(split) {
  let lastJobId=0,busy=false;
  self.addEventListener('securitypolicyviolation',()=>self.postMessage({protocolVersion:1,type:'audit-csp'}));
  self.onmessage=async({data})=>{
    const jobId=data?.jobId;
    try {
      if(busy||!data||data.protocolVersion!==1||data.type!=='run'||!Number.isSafeInteger(jobId)||jobId<=lastJobId||
        typeof data.input!=='string'||data.input.length>1024||!/^(0|[1-9][0-9]*)$/.test(data.input)||data.options?.algorithm!=='siqs')throw TypeError('Invalid request');
      busy=true;lastJobId=jobId;
      const result=factorInteger(BigInt(data.input),data.options,{splitAdvanced:split,
        onProgress:snapshot=>self.postMessage({protocolVersion:1,type:'progress',jobId,snapshot})});
      const audit=await split.audit();
      self.postMessage({protocolVersion:1,type:'result',jobId,result,audit});
    }catch{
      self.postMessage({protocolVersion:1,type:'error',jobId,code:'computation-error',audit:split.stats()});
    }finally{busy=false;}
  };
  self.postMessage({protocolVersion:1,type:'ready'});
}

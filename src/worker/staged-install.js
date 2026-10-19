import {factorStaged} from '../engine/staged-factor.js';
import {selectStagedPlan} from '../engine/staged-plan.js';
export function installStagedWorker(backends,mode) {
 let busy=false,lastJobId=0;
 const post=data=>{if(new TextEncoder().encode(JSON.stringify(data)).length>262144)throw RangeError('Output bytes');self.postMessage(data);};
 self.addEventListener('securitypolicyviolation',()=>post({protocolVersion:2,type:'audit-csp'}));
 self.onmessage=({data})=>{
  const jobId=data?.jobId;
  if(busy){post({protocolVersion:2,type:'error',jobId,code:'busy'});return;}
  try{
   if(!data||data.protocolVersion!==2||data.type!=='run'||!Number.isSafeInteger(jobId)||jobId<=lastJobId)throw TypeError('Request');
   const plan=selectStagedPlan(data.input,{...data.options,mode});
   if(plan.engineMode!==backends.engineMode)throw TypeError('Backend input profile');
   lastJobId=jobId;busy=true;
   const result=factorStaged(BigInt(data.input),{...data.options,mode},{
    splitEcm:backends.splitEcm,splitSiqs:backends.splitSiqs,
    onProgress:snapshot=>post({protocolVersion:2,type:'progress',jobId,snapshot})
   });
   post({protocolVersion:2,type:'result',jobId,result,audit:backends.inspect()});
  }catch{post({protocolVersion:2,type:'error',jobId,code:'computation-error',audit:backends.inspect()});}
  finally{busy=false;}
 };
 post({protocolVersion:2,type:'ready',mode,engineMode:backends.engineMode,linearMemoryBytes:backends.linearMemoryBytes});
}

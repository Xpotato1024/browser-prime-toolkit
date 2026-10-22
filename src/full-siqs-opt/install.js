import {createFullSiqsSplit} from './kernel.js';
import {factorRsaInteger} from './factor.js';
import {RSA_PROFILE,selectRsaPlan} from './profile.js';
export async function installRsaWorker(){
 const post=data=>self.postMessage({protocolVersion:3,profile:RSA_PROFILE.id,...data});
 let used=false,telemetryInput=null;
 const split=await createFullSiqsSplit({onTelemetry:telemetry=>post({type:'algorithm-progress',jobId:1,telemetry})});
 self.addEventListener('securitypolicyviolation',()=>post({type:'audit-csp'}));
 self.onmessage=({data})=>{
  try{
   if(used||!data||new TextEncoder().encode(JSON.stringify(data)).length>RSA_PROFILE.packetBytes)throw Error('Full SIQS packet size');
   if(Object.keys(data).some(k=>!['protocolVersion','profile','type','jobId','input','options'].includes(k))||data.protocolVersion!==3||data.profile!==RSA_PROFILE.id||data.type!=='run'||data.jobId!==1)throw Error('Full SIQS packet identity');
   const plan=selectRsaPlan(data.input,{seed:data.options?.seed});
   const options=data.options;
   if(!plan.supported||!options||Object.keys(options).some(k=>!['algorithm','seed','timeBudgetMs','operationBudget'].includes(k))||options.algorithm!=='full-siqs'||options.operationBudget!==RSA_PROFILE.operationBudget||!Number.isSafeInteger(options.timeBudgetMs)||options.timeBudgetMs<0||options.timeBudgetMs>600000)throw Error('Full SIQS delegated limits');
   used=true;telemetryInput=data.input;
   const result=factorRsaInteger(BigInt(data.input),options,{splitAdvanced:split,onProgress:snapshot=>post({type:'progress',jobId:1,snapshot})});
   post({type:'result',jobId:1,result,diagnostics:split.stats()});
  }catch(error){post({type:'error',jobId:1,code:'full-siqs-computation',diagnostics:split.stats(),message:String(error?.message).slice(0,256)});}
 };
 post({type:'ready',backend:'full-siqs',maxBits:332,wasmBytes:268435456});
}

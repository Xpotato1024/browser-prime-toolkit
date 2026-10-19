import {factorInteger} from '../engine/factor.js';
import {RSA_PROFILE,selectRsaPlan} from './profile.js';
function readRequest(data){
 if(!data||typeof data!=='object'||Array.isArray(data)||Object.keys(data).some(k=>!['protocolVersion','profile','type','jobId','input','options'].includes(k))||
  data.protocolVersion!==3||data.profile!==RSA_PROFILE.id||data.type!=='run'||data.jobId!==1||
  typeof data.input!=='string'||data.input.length>RSA_PROFILE.maxDigits)throw TypeError('RSA packet');
 const options=data.options;
 if(!options||typeof options!=='object'||Array.isArray(options)||Object.keys(options).some(k=>!['algorithm','seed','timeBudgetMs','operationBudget'].includes(k))||
  options.algorithm!=='brent'||!Number.isSafeInteger(options.timeBudgetMs)||options.timeBudgetMs<0||options.timeBudgetMs>30000||
  options.operationBudget!==50000000)throw TypeError('RSA delegated options');
 const plan=selectRsaPlan(data.input,{seed:options.seed});
 if(!plan.supported)throw TypeError('RSA unsupported input');
 return{input:plan.input,options:{algorithm:'brent',seed:plan.options.seed,timeBudgetMs:options.timeBudgetMs,operationBudget:50000000}};
}
export function installRsaWorker(){
 let used=false;
 const post=data=>{
  const message={protocolVersion:3,profile:RSA_PROFILE.id,...data};
  if(new TextEncoder().encode(JSON.stringify(message)).length>RSA_PROFILE.packetBytes)throw RangeError('RSA packet bytes');
  self.postMessage(message);
 };
 self.addEventListener('securitypolicyviolation',()=>post({type:'audit-csp'}));
 self.onmessage=({data})=>{
  const jobId=data?.jobId;
  try{
   if(used||new TextEncoder().encode(JSON.stringify(data)).length>RSA_PROFILE.packetBytes)throw TypeError('RSA one-shot packet');
   used=true;const request=readRequest(data);
   const result=factorInteger(BigInt(request.input),request.options,{onProgress:snapshot=>post({type:'progress',jobId:1,snapshot})});
   post({type:'result',jobId:1,result});
  }catch{post({type:'error',jobId,code:'invalid-rsa-request'});}
 };
 post({type:'ready',backend:'brent',maxBits:2048,wasmBytes:0});
}

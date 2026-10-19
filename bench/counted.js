import {makeCountedWorker} from '../src/worker/counted-factory.js';
import {runCounted} from './counted-runner.js';
const violations=[],errors=[],rejections=[];
addEventListener('securitypolicyviolation',e=>violations.push({directive:e.violatedDirective,blocked:e.blockedURI}));
addEventListener('error',e=>errors.push(e.message));
addEventListener('unhandledrejection',e=>rejections.push(String(e.reason)));
let live=0,maxLive=0,runningAbort=null;
function tracked(config){
  const worker=makeCountedWorker(config);live++;maxLive=Math.max(maxLive,live);let dead=false;
  const terminate=worker.terminate.bind(worker),post=worker.postMessage.bind(worker);
  worker.terminate=()=>{if(!dead){dead=true;live--;}terminate();};
  worker.postMessage=data=>{post(data);if(data?.type==='run')runningAbort?.();};
  return worker;
}
globalThis.evaluationHarness={
 run:(input,options)=>runCounted(input,options,{createWorker:tracked}),
 cancel:async(input,options,when)=>{
  const control=new AbortController();runningAbort=when==='running'?()=>setTimeout(()=>control.abort(),30):null;
  const run=runCounted(input,{...options,signal:control.signal},{createWorker:tracked});
  if(when==='loading')control.abort();
  try{return await run;}finally{runningAbort=null;}
 },
 fatalRecovery:async(input,options)=>{
  let rejected=false;try{await runCounted(input,{...options,fault:true},{createWorker:tracked});}catch{rejected=true;}
  if(!rejected)throw Error('Fault did not reject');return {rejected,recovered:await runCounted(input,options,{createWorker:tracked})};
 },
 ownership:()=>({live,maxLive}),violations,errors,rejections
};

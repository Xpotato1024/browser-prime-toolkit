import {makeStagedWorker} from '../src/worker/staged-factory.js';
import {runStagedRequest} from '../src/worker/staged-controller.js';
const violations=[],errors=[],rejections=[];
addEventListener('securitypolicyviolation',e=>violations.push({directive:e.violatedDirective,blocked:e.blockedURI}));
addEventListener('error',e=>errors.push(e.message));
addEventListener('unhandledrejection',e=>rejections.push(String(e.reason)));
let live=0,maxLive=0,runningAbort=null,fault=false;
function tracked(plan){
 const worker=makeStagedWorker(plan,{fault});live++;maxLive=Math.max(maxLive,live);let dead=false;
 const terminate=worker.terminate.bind(worker),post=worker.postMessage.bind(worker);
 worker.terminate=()=>{terminate();if(!dead){dead=true;live--;}};
 worker.postMessage=data=>{post(data);if(data?.type==='run')runningAbort?.();};
 return worker;
}
globalThis.evaluationHarness={
 run:(input,options)=>runStagedRequest(input,options,{createWorker:tracked}),
 cancel:async(input,options,when)=>{
  const control=new AbortController();let abortedAt=null;
  const abort=()=>{abortedAt=performance.now();control.abort();};
  runningAbort=when==='running'?()=>setTimeout(abort,30):null;
  const run=runStagedRequest(input,options,{signal:control.signal,createWorker:tracked});
  if(when==='loading')abort();
  try{const result=await run;return{result,aborted:abortedAt!==null,abortResponseMs:abortedAt===null?null:performance.now()-abortedAt};}
  finally{runningAbort=null;}
 },
 fatalRecovery:async(input,options)=>{
  let failure=null;fault=true;
  try{await runStagedRequest(input,options,{createWorker:tracked});}
  catch(e){failure={message:e.message,audit:e.audit,allWorkersDisposed:e.allWorkersDisposed,requestWallMs:e.requestWallMs};}
  finally{fault=false;}
  if(!failure)throw Error('Fault did not reject');
  return{failure,recovered:await runStagedRequest(input,options,{createWorker:tracked})};
 },
 ownership:()=>({live,maxLive}),violations,errors,rejections
};

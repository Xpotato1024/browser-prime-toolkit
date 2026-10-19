import {makeEvaluationWorker} from '../src/worker/evaluation-factory.js';
import {makeSiqsWorker} from '../src/worker/siqs-factory.js';
import {runEvaluation} from './evaluation-runner.js';
const violations=[],errors=[],rejections=[];
addEventListener('securitypolicyviolation',e=>violations.push({directive:e.violatedDirective,blocked:e.blockedURI}));
addEventListener('error',e=>errors.push(e.message));
addEventListener('unhandledrejection',e=>rejections.push(String(e.reason)));
let live=0,maxLive=0;
function tracked(config){
  const worker=config.kind==='siqs'?makeSiqsWorker():makeEvaluationWorker(config);
  live++;maxLive=Math.max(maxLive,live);let dead=false;
  const terminate=worker.terminate.bind(worker);
  worker.terminate=()=>{if(!dead){dead=true;live--;}terminate();};
  return worker;
}
globalThis.evaluationHarness={
 run:(input,options)=>runEvaluation(input,options,{createWorker:tracked}),
 cancel:async(input,options)=>{const control=new AbortController();const run=runEvaluation(input,{...options,signal:control.signal},{createWorker:tracked});setTimeout(()=>control.abort(),30);return run;},
 ownership:()=>({live,maxLive}),violations,errors,rejections
};

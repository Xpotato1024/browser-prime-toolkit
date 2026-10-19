import {EVALUATION_SOURCE as supplement} from './supplement-source.js';
import {EVALUATION_SOURCE as profile} from './siqs-profile-source.js';
import {makeWorkerFromSource} from './source-factory.js';
// Private fixed variants. No caller-supplied code, URL, or runtime module import.
export function makeEvaluationWorker({kind='ecm',lane=0,workers=1,base=2}={}) {
  if(!['ecm','pm1','profile'].includes(kind)||![1,2].includes(workers)||
    !Number.isInteger(lane)||lane<0||lane>=workers||![2,3].includes(base)||
    kind!=='ecm'&&(workers!==1||lane!==0))throw RangeError('Invalid evaluation partition');
  const init=kind==='profile'?'createSiqsProfile()':
    'createSupplementSplit('+JSON.stringify({method:kind,lane,workers,base})+')';
  const footer='\n'+init+'.then(split=>installFactorWorker(split,['+
    JSON.stringify(kind==='profile'?'siqs':'gmp-ecm')+'],()=>split.stats()))'+
    '.catch(()=>self.postMessage({protocolVersion:1,type:"error",jobId:null,code:"initialization-error"}));\n';
  return makeWorkerFromSource((kind==='profile'?profile:supplement)+footer);
}

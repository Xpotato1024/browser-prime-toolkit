import {Budget,BudgetExceeded} from './options.js';
export function makeStagePool(root,name,{operations,timeMs}) {
 if(!root||typeof root.tick!=='function'||!Number.isSafeInteger(operations)||operations<0||operations>50000000||!Number.isFinite(timeMs)||timeMs<0||timeMs>60000)throw TypeError('Stage grant');
 let spent=0,elapsed=0,active=false,options=root.options,disabled=false;
 const view={
  get options(){return options;},get operations(){return root.operations;},
  set operations(value){if(!Number.isSafeInteger(value)||value<root.operations||value>options.operationBudget)throw TypeError('Stage operation update');root.operations=value;},
  get started(){return root.started;},get lastPulse(){return root.lastPulse;},set lastPulse(v){root.lastPulse=v;},
  now:()=>root.now(),pulse:()=>root.pulse(),tick(){return Budget.prototype.tick.call(view);},elapsed:()=>root.elapsed()
 };
 const available=()=>!disabled&&spent<operations&&elapsed<timeMs&&root.operations<root.options.operationBudget&&root.now()-root.started<root.options.timeBudgetMs;
 function run(fn){
  if(active)throw Error('Stage active');if(!available())throw new BudgetExceeded(root.operations>=root.options.operationBudget||spent>=operations?'operation-budget':'time-budget');
  const began=root.now(),before=root.operations;
  options={...root.options,operationBudget:Math.min(root.options.operationBudget,before+operations-spent),
   timeBudgetMs:Math.min(root.options.timeBudgetMs,began-root.started+timeMs-elapsed)};
  active=true;
  try{const out=fn(view);if(out&&typeof out.then==='function')throw TypeError('Synchronous stage required');return out;}
  finally{spent+=root.operations-before;elapsed+=Math.max(0,root.now()-began);active=false;}
 }
 return{run,available,disable(){disabled=true;},stats:()=>({name,operations:spent,elapsedMs:elapsed,operationLimit:operations,timeLimitMs:timeMs,disabled})};
}

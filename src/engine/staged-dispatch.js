import {BudgetExceeded} from './options.js';
import {findDivisor,seededRandom} from './arithmetic.js';
import {makeStagePool} from './staged-budget.js';
export function makeStagedDispatcher(root,plan,{splitBrent=(n,b,r)=>findDivisor(n,'brent',r,b),splitEcm,splitSiqs}={}) {
 const random=seededRandom(root.options.seed),trace=[];
 const native=makeStagePool(root,'brent-prefix',{operations:50000,timeMs:20});
 const ecm=makeStagePool(root,'ecm-prefix',{operations:500000,timeMs:80});
 const globalCheck=()=>{if(root.operations>=root.options.operationBudget)throw new BudgetExceeded('operation-budget');if(root.now()-root.started>=root.options.timeBudgetMs)throw new BudgetExceeded('time-budget');};
 const invoke=(stage,value,fn,budget)=>{
  if(trace.length>=384)throw Error('Staged trace bound');
  const row={index:trace.length,stage,input:value.toString(),startOps:root.operations,startMs:root.elapsed(),endOps:0,endMs:0,outcome:'fatal',reason:null};
  trace.push(row);
  try{const divisor=fn(budget);row.outcome=divisor===null?'exhausted':'split';row.reason=divisor===null?'algorithm-exhausted':null;return divisor;}
  catch(error){if(error instanceof BudgetExceeded){row.outcome=error.reason==='algorithm-resource'?'resource':'stopped';row.reason=error.reason;}throw error;}
  finally{row.endOps=root.operations;row.endMs=root.elapsed();}
 };
 const brent=(value,b)=>splitBrent(value,b,random);
 const advanced=(fn,value,b,algorithm)=>{if(typeof fn!=='function')throw Error('Uninitialized staged backend');return fn(value,b,{algorithm,seed:root.options.seed});};
 const dispatch=value=>{
  globalCheck();const bits=value.toString(2).length,staged=plan.mode==='p64'||plan.mode==='p80';
  if(plan.mode==='brent'||staged&&bits<=plan.cutoffBits||plan.mode==='siqs'&&bits<64)return invoke('brent-full',value,b=>brent(value,b),root);
  if(plan.mode==='ecm')return invoke('ecm',value,b=>advanced(splitEcm,value,b,'gmp-ecm'),root);
  if(staged){
   if(native.available()){
    try{const d=native.run(b=>invoke('brent-prefix',value,b=>brent(value,b),b));if(d!==null)return d;}
    catch(error){if(!(error instanceof BudgetExceeded)||!['time-budget','operation-budget'].includes(error.reason))throw error;globalCheck();}
   }
   if(ecm.available()){
    try{const d=ecm.run(b=>invoke('ecm-prefix',value,b=>advanced(splitEcm,value,b,'gmp-ecm'),b));if(d!==null)return d;ecm.disable();}
    catch(error){if(!(error instanceof BudgetExceeded)||!['time-budget','operation-budget'].includes(error.reason))throw error;globalCheck();}
   }
  }
  globalCheck();
  if(value<(1n<<63n)||value>=(1n<<128n))throw new BudgetExceeded('algorithm-range');
  return invoke('siqs',value,b=>advanced(splitSiqs,value,b,'siqs'),root);
 };
 dispatch.trace=()=>trace.map(r=>({...r}));dispatch.grants=()=>[native.stats(),ecm.stats()];return dispatch;
}

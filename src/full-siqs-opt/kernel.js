import {failFullNative} from './failure.js';
import createFullModule from '../siqs-tuned/module.js';
import {FULL_SETTINGS} from './settings.js';
import {LAB_SIQS_BASE64 as FULL_SIQS_BASE64} from '../siqs-tuned/bytes.js';
import {BudgetExceeded} from '../engine/options.js';
export async function createFullSiqsSplit({onTelemetry=()=>{}}={}){
 const bytes=Uint8Array.from(atob(FULL_SIQS_BASE64),c=>c.charCodeAt(0));
 let splitCount=0,deliveries=0;
 let budget=null,previous=0,poisoned=false,divisor=null,input=null,lastPost=0,phase=0,relations=null,abortReason=null;
 const charge=(native,next,clock=true)=>{
  if(typeof native!=='bigint'||native<0n||native>1000000000000n||!Number.isInteger(next)||next<0||next>6)throw Error('Full SIQS checkpoint ABI');
  const value=Number(native),delta=value-previous;
  if(!budget||delta<0||delta>FULL_SETTINGS.stride)throw Error('Full SIQS checkpoint tail');
  if(delta>budget.options.operationBudget-budget.operations)throw new BudgetExceeded('operation-budget');
  budget.operations+=delta;previous=value;phase=next;
  if(!clock)return;
  const time=budget.now();
  if(time-budget.started>=budget.options.timeBudgetMs)throw new BudgetExceeded('time-budget');
  if(time-budget.lastPulse>=100){budget.lastPulse=time;budget.pulse();}
  if(time-lastPost>=100){lastPost=time;onTelemetry({input:input.toString(),phase,work:value,relations});}
 };
 const logs=[];const log=s=>{if(logs.length<16)logs.push(String(s).slice(0,512));};
 const api=await createFullModule({wasmBinary:bytes,noInitialRun:true,print:log,printErr:log,onAbort(reason){abortReason=String(reason);},
  locateFile(name){if(name!=='msieve.wasm')throw Error('Unexpected full SIQS asset');return 'embedded:full-siqs';},
  largeTick(native,next){deliveries++;charge(native,next);},largePhase(next){phase=next;},
  publishFactor(type,text){
   if(typeof text!=='string'||!/^[1-9][0-9]{0,99}$/.test(text))throw Error('Full SIQS factor encoding');
   const factor=BigInt(text);
   if(!input||factor<=1n||factor>=input||input%factor!==0n)throw Error('Full SIQS forged divisor');
   divisor=factor;
  },
  publishState(total,full,combined,partial,target){
   const values=[total,full,combined,partial,target];
   if(values.some(n=>!Number.isSafeInteger(n)||n<0||n>2000000)||target>150000)throw Error('Full SIQS relation progress');
   relations={total,full,combined,partial,target};
  }
 });
 if(!(api.HEAPU8 instanceof Uint8Array)||api.HEAPU8.byteLength!==268435456)throw Error('Full SIQS memory profile');
 const split=(value,nextBudget,{seed})=>{
  if(poisoned||budget)throw Error('Full SIQS instance retired or busy');
  if(typeof value!=='bigint'||value<(1n<<63n)||value>=(1n<<332n)||value%2n!==1n)throw RangeError('Full SIQS exact range');
  input=value;budget=nextBudget;splitCount++;deliveries=0;previous=0;phase=0;relations=null;divisor=null;lastPost=0;
  try{
   const remaining=budget.options.operationBudget-budget.operations;
   if(!api._lab_configure(0,FULL_SETTINGS.stride,0,0,0,1))throw Error('Full SIQS mode0 configuration');
   if(!api._large_configure(BigInt(remaining)))throw Error('Full SIQS remaining budget');
   const ptr=api._large_input_ptr();
   if(!Number.isSafeInteger(ptr)||ptr<0||ptr+128>api.HEAPU8.length)throw Error('Full SIQS input pointer');
   api.HEAPU8.fill(0,ptr,ptr+128);api.HEAPU8.set(new TextEncoder().encode(value.toString()),ptr);
   let status;
   try{status=api._large_run(seed,(seed^0x9e3779b9)>>>0||1);}
   catch(error){
    poisoned=true;
    failFullNative(error,{reason:api._large_reason(),abortReason,account:()=>charge(api._large_work(),api._large_phase(),false)});
   }
   charge(api._large_work(),api._large_phase());
   if(status!==0&&status!==1)throw Error('Full SIQS status '+status);
   if(status===1&&!divisor)throw Error('Full SIQS success without divisor');
   return divisor;
  }catch(error){poisoned=true;throw error;}
  finally{budget=null;}
 };
 split.auditFailure=mode=>{
  if(poisoned||budget)throw Error('Full SIQS instance retired or busy');
  if(!['oom','trap'].includes(mode))throw TypeError('Full SIQS audit failure');
  try{if(mode==='oom')api._malloc(536870912);else api._abort();throw Error('Native failure did not trap');}
  finally{poisoned=true;}
 };
 split.stats=()=>({nativeScope:'last-split',splitCount,nativeMode:0,stride:FULL_SETTINGS.stride,nativeWork:Number(api._large_work()),phaseWork:Array.from({length:7},(_,i)=>Number(api._lab_stat(20+i))),notifications:{periodic:Number(api._lab_stat(0)),flush:Number(api._lab_stat(1)),deliveries},abortReason,phase,work:previous,relations,poisoned,saveBytes:api._large_saved(),nnz:api._large_nnz(),reason:api._large_reason(),line:api._large_line(),logs});
 return split;
}

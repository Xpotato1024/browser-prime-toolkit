import {BudgetExceeded} from './options.js';
import {makeCheckpointCharger} from './checkpoint-charge.js';
import {SIQS_BASE64} from './siqs-bytes.js';
import {SIQS_V2_BASE64 as DENSE} from './siqs-dense-bytes.js';
import {SIQS_V2_BASE64 as LANCZOS} from './siqs-lanczos-bytes.js';
export async function createCountedSiqsSplit(variant,{capture=false,profile=false}={}) {
  if(!['clock-gated','dense','lanczos'].includes(variant)||typeof capture!=='boolean'||typeof profile!=='boolean')throw TypeError('SIQS variant');
  const counted=variant!=='clock-gated',source=counted?(variant==='dense'?DENSE:LANCZOS):SIQS_BASE64;
  const bytes=Uint8Array.from(atob(source),c=>c.charCodeAt(0));
  let active=null,stopped=null,poisoned=false,lastBudget=null,charger=null,importCalls=0;
  let phaseIntervals={},phaseCounts={},phase=0,lastClock=0,splitLogicalStart=0;
  const module=await WebAssembly.compile(bytes);
  const allowed=new Set(['env.budget_tick','wasi_snapshot_preview1.fd_write','wasi_snapshot_preview1.fd_close','wasi_snapshot_preview1.fd_seek','wasi_snapshot_preview1.proc_exit']);
  if(WebAssembly.Module.imports(module).some(i=>i.kind!=='function'||!allowed.has(i.module+'.'+i.name)))throw TypeError('Unexpected SIQS imports');
  const rejectIO=()=>{throw Error('Unexpected SIQS I/O or exit');};
  const instance=await WebAssembly.instantiate(module,{
    env:{budget_tick(nextPhase,count=1){
      if(stopped)return 0;importCalls++;
      if(profile){if(nextPhase!==phase||(importCalls&1023)===0){const now=performance.now();if(phase)phaseIntervals[phase]=(phaseIntervals[phase]??0)+now-lastClock;lastClock=now;phase=nextPhase;}phaseCounts[nextPhase]=(phaseCounts[nextPhase]??0)+count;}
      try {
        // Short native phase-tail batches must check the clock before the next batch.
        charger.charge(count,nextPhase,true,counted);
        return 1;
      }catch(error){stopped=error;return 0;}
    }},wasi_snapshot_preview1:{fd_write:rejectIO,fd_close:rejectIO,fd_seek:rejectIO,proc_exit:rejectIO}
  });
  const api=instance.exports;api._initialize?.();
  const required=['input_ptr','factor_ptr','siqs_split','stat_live','stat_peak','stat_phases','stat_reason','configure_fault','stat_allocs','stat_line','log_ptr'];
  if(counted)required.push('configure_checkpoint_budget','stat_work','stat_imports','stat_operation_stop','stat_phase_work','stat_lanczos_attempts','stat_lanczos_iterations','configure_snapshot','stat_snapshot_ptr','stat_snapshot_bytes','stat_parity_ptr','stat_parity_bytes');
  if(!(api.memory instanceof WebAssembly.Memory)||api.memory.buffer.byteLength!==67108864||required.some(k=>typeof api[k]!=='function'))throw TypeError('SIQS exports');
  const split=(value,budget,{seed})=>{
    if(poisoned)throw Error('SIQS instance retired after trap');
    if(typeof value!=='bigint')throw TypeError('Expected bigint');
    if(value<(1n<<63n)||value>=(1n<<128n)||value%2n===0n)throw RangeError('SIQS range');
    if(!Number.isSafeInteger(seed)||seed<1||seed>4294967295)throw TypeError('SIQS seed');
    if(!budget||active)throw TypeError('SIQS budget');
    const newJob=lastBudget!==budget;
    if(newJob){charger=makeCheckpointCharger(budget);lastBudget=budget;importCalls=0;phaseIntervals={};phaseCounts={};}
    const remaining=budget.options.operationBudget-budget.operations;
    if(counted&&(!api.configure_checkpoint_budget(remaining,newJob?1:0)))throw TypeError('SIQS remaining budget');
    if(counted)api.configure_snapshot(capture?1:0);
    const memory=new Uint8Array(api.memory.buffer),ptr=api.input_ptr(),out=api.factor_ptr();
    if(ptr<0||out<0||ptr+80>memory.length||out+80>memory.length)throw TypeError('SIQS pointer');
    memory.fill(0,ptr,ptr+80);memory.set(new TextEncoder().encode(value.toString()),ptr);
    active=budget;stopped=null;phase=0;lastClock=profile?performance.now():0;splitLogicalStart=charger.stats().logical;
    try {
      let status;
      try {status=api.siqs_split(seed);}catch(error){poisoned=true;throw error;}
      if(profile){const now=performance.now();if(phase)phaseIntervals[phase]=(phaseIntervals[phase]??0)+now-lastClock;}
      if(api.stat_live()!==0){poisoned=true;throw Error('SIQS leaked job allocation');}
      if(counted){
        const tail=api.stat_work()-(charger.stats().logical-splitLogicalStart);
        if(!Number.isInteger(tail)||tail<0||tail>63){poisoned=true;throw Error('SIQS invalid uncharged tail');}
        if(tail)charger.charge(tail,phase||1,false);
      }
      if(stopped)throw stopped;
      if(counted&&api.stat_operation_stop())throw new BudgetExceeded('operation-budget');
      if(status===-3||status===-4)throw new BudgetExceeded('algorithm-resource');
      if(status===0)return null;
      if(status!==1){poisoned=true;throw Error('Invalid SIQS status '+status);}
      charger.finish();
      const view=memory.subarray(out,out+80),end=view.indexOf(0);
      if(end<=0)throw TypeError('SIQS output');
      const text=new TextDecoder('utf-8',{fatal:true}).decode(view.subarray(0,end));
      if(!/^[1-9][0-9]{0,38}$/.test(text))throw TypeError('SIQS divisor');
      const factor=BigInt(text);
      if(factor<=1n||factor>=value||value%factor!==0n)throw TypeError('Invalid SIQS divisor');
      return factor;
    }finally{active=null;stopped=null;}
  };
  split.stats=()=>({variant,liveBytes:api.stat_live(),peakBytes:api.stat_peak(),phaseMask:api.stat_phases(),allocations:api.stat_allocs(),reason:api.stat_reason(),line:api.stat_line(),poisoned,importCalls,
    ...(charger?.stats()??{}),phaseIntervals,phaseCounts,
    ...(counted?{nativeLogical:api.stat_work(),nativeImports:api.stat_imports(),phaseWork:Array.from({length:6},(_,i)=>api.stat_phase_work(i+1)),lanczosAttempts:api.stat_lanczos_attempts(),lanczosIterations:api.stat_lanczos_iterations()}: {})});
  split.configureFault=(phase=0,allocation=0)=>{
    if(active||poisoned)throw Error('SIQS busy or retired');
    if(!Number.isSafeInteger(phase)||phase<0||phase>6||!Number.isSafeInteger(allocation)||allocation<0||allocation>1000000)throw TypeError('SIQS fault');
    api.configure_fault(phase,allocation);
  };
  split.audit=async()=>{
    if(active||poisoned)throw Error('SIQS busy or retired');
    if(!counted||!capture)return split.stats();
    const digest=async(ptr,size)=>{
      if(!Number.isSafeInteger(ptr)||!Number.isSafeInteger(size)||ptr<0||size<0||ptr+size>api.memory.buffer.byteLength)throw Error('SIQS digest bounds');
      const hash=await crypto.subtle.digest('SHA-256',new Uint8Array(api.memory.buffer,ptr,size));
      return Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');
    };
    const descriptorBytes=api.stat_snapshot_bytes(),parityBytes=api.stat_parity_bytes();
    return {...split.stats(),descriptorBytes,parityBytes,matrixDescriptorSha256:await digest(api.stat_snapshot_ptr(),descriptorBytes),paritySha256:await digest(api.stat_parity_ptr(),parityBytes)};
  };
  return split;
}

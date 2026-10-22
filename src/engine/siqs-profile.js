import { BudgetExceeded } from './options.js';
import { SIQS_BASE64 } from './siqs-bytes.js';
export async function createSiqsProfile(bytes=Uint8Array.from(atob(SIQS_BASE64),c=>c.charCodeAt(0))) {
  let active=null,stopped=null,poisoned=false,profile;
  function sample(phase) {
    const t=performance.now();
    if(profile.last!==null)profile.wallMs[profile.phase]+=t-profile.last;
    profile.last=t;profile.phase=phase;
  }
  const module=await WebAssembly.compile(bytes);
  const allowed=new Set(['env.budget_tick','wasi_snapshot_preview1.fd_write','wasi_snapshot_preview1.fd_close','wasi_snapshot_preview1.fd_seek','wasi_snapshot_preview1.proc_exit']);
  if(WebAssembly.Module.imports(module).some(i=>i.kind!=='function'||!allowed.has(i.module+'.'+i.name))) throw new TypeError('Unexpected SIQS imports');
  const rejectIO=()=>{throw Error('Unexpected SIQS I/O or exit');};
  const instance=await WebAssembly.instantiate(module,{
    env:{budget_tick(phase) {
      if(!Number.isInteger(phase)||phase<0||phase>6)throw Error('Invalid profile phase');
      profile.calls[phase]++;
      if(phase!==profile.phase||(profile.calls[phase]&1023)===0)sample(phase);
      if(stopped) return 0;
      try {active.tick();return 1;} catch(error) {stopped=error;return 0;}
    }},
    wasi_snapshot_preview1:{fd_write:rejectIO,fd_close:rejectIO,fd_seek:rejectIO,proc_exit:rejectIO},
  });
  const api=instance.exports;api._initialize?.();
  if(!(api.memory instanceof WebAssembly.Memory)||api.memory.buffer.byteLength!==67108864||
    ['input_ptr','factor_ptr','siqs_split','stat_live','stat_peak','stat_phases','stat_reason','configure_fault','stat_allocs','stat_line','log_ptr'].some(k=>typeof api[k]!=='function')) throw new TypeError('Invalid SIQS exports');
  const split=(value,budget,{seed})=>{
    if(poisoned) throw Error('SIQS instance retired after trap');
    if(typeof value!=='bigint') throw new TypeError('Expected bigint');
    if(value<(1n<<63n)||value>=(1n<<128n)||value%2n===0n) throw new RangeError('SIQS range');
    if(!Number.isSafeInteger(seed)||seed<1||seed>4294967295) throw new TypeError('SIQS seed');
    if(!budget||typeof budget.tick!=='function'||active) throw new TypeError('SIQS budget');
    const memory=new Uint8Array(api.memory.buffer),ptr=api.input_ptr(),out=api.factor_ptr();
    if(ptr<0||out<0||ptr+80>memory.length||out+80>memory.length) throw new TypeError('SIQS pointer');
    memory.fill(0,ptr,ptr+80);memory.set(new TextEncoder().encode(value.toString()),ptr);
    profile={calls:Array(7).fill(0),wallMs:Array(7).fill(0),phase:0,last:performance.now()};
    active=budget;stopped=null;
    try {
      let status;
      try {status=api.siqs_split(seed);} catch(error) {poisoned=true;throw error;}
      if(api.stat_live()!==0) {poisoned=true;throw Error('SIQS leaked job allocation');}
      if(stopped) throw stopped;
      if(status===0) return null;
      if(status===-3||status===-4) {
        throw new BudgetExceeded('algorithm-resource');
      }
      if(status!==1) {poisoned=true;throw Error('Invalid SIQS status '+status);}
      const view=memory.subarray(out,out+80),end=view.indexOf(0);
      if(end<=0) throw new TypeError('SIQS output');
      const text=new TextDecoder('utf-8',{fatal:true}).decode(view.subarray(0,end));
      if(!/^[1-9][0-9]{0,38}$/.test(text)) throw new TypeError('SIQS divisor');
      const factor=BigInt(text);
      if(factor<=1n||factor>=value||value%factor!==0n) throw new TypeError('Invalid SIQS divisor');
      return factor;
    } finally {sample(profile.phase);active=null;stopped=null;}
  };
  split.log=()=>{const mem=new Uint8Array(api.memory.buffer),p=api.log_ptr(),v=mem.subarray(p,p+16384);return new TextDecoder().decode(v.subarray(0,v.indexOf(0)));};
  split.stats=()=>({profile:profile?{calls:profile.calls,wallMs:profile.wallMs,samplingEvery:1024}:null,log:split.log(),liveBytes:api.stat_live(),peakBytes:api.stat_peak(),phaseMask:api.stat_phases(),allocations:api.stat_allocs(),reason:api.stat_reason(),line:api.stat_line(),poisoned});
  split.configureFault=(phase=0,allocation=0)=>{
    if(active||poisoned)throw Error('SIQS busy or retired');
    if(!Number.isSafeInteger(phase)||phase<0||phase>6||!Number.isSafeInteger(allocation)||allocation<0||allocation>1000000)throw TypeError('Invalid SIQS fault');
    api.configure_fault(phase,allocation);
  };
  return split;
}

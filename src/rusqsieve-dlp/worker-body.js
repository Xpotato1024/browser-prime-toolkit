// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Xpotato.net / Xpotato1024
let api=null,input=null,role=null,generation=null,context=0,session=0,budget=0,target=0,previous=0,retained=false,factorBaseSize=0,profile='baseline';
const timings=Object.fromEntries(DLP_TIME_KEYS.map(k=>[k,0]));
const timed=(key,fn)=>{const t=performance.now();try{return fn();}finally{timings[key]+=performance.now()-t;}};
const memory=()=>({linearBytes:api.memory.buffer.byteLength,liveRequested:api.codex_mem_live(),peakRequested:api.codex_mem_peak(),allocationFailures:api.codex_mem_failures(),lastFailed:api.codex_mem_last_failed()});
const send=(type,data={},transfer=[])=>postMessage({version:18,generation,type,...data,timings:{...timings}},transfer);
function withBytes(bytes,fn){
 const p=api.qs_alloc(bytes.length,1);if(!p)throw Error('Allocation refused');
 try{new Uint8Array(api.memory.buffer,p,bytes.length).set(bytes);return fn(p,bytes.length);}
 finally{api.qs_dealloc(p,bytes.length,1);}
}
function take(handle){
 if(!handle)throw Error('Native buffer unavailable');const p=api.qs_buffer_pointer(handle),n=api.qs_buffer_length(handle);
 try{if(n<12||n>LIMITS.packetBytes||p+n>api.memory.buffer.byteLength)throw Error('Native buffer bounds');return new Uint8Array(api.memory.buffer.slice(p,p+n));}
 finally{api.qs_buffer_free(handle);}
}
function configuration(){
 const v=Array.from({length:8},(_,i)=>api.codex_dlp_worker_config(context,i));
 if(v.some((x,i)=>typeof x!=='bigint'||(i===6?(x< -128n||x>128n):x<0n)))throw Error('Native configuration unavailable');
 const c={version:api.codex_dlp_version(),profile,bits:Number(v[0]),factorBaseBound:Number(v[1]),intervalHalfWidth:Number(v[2]),singleLimit:v[3].toString(),doubleLimit:v[4].toString(),lpBits:Number(v[5]),thresholdAdjustment:Number(v[6]),factorBaseSize:Number(v[7])};
 validateDlpConfiguration(c,profile,BigInt(input).toString(2).length);
 if(role==='coord')for(let i=0;i<8;i++)if(api.codex_dlp_coord_config(session,i)!==v[i])throw Error('Local coordinator configuration mismatch');
 return c;
}
function snapshot(){
 return timed('observeMs',()=>({memory:memory(),...(role==='coord'&&session?{dlpStats:Object.fromEntries(DLP_STAT_KEYS.map((k,i)=>[k,Number(api.codex_dlp_stat(session,i))]))}:{})}));
}
onmessage=async({data:d})=>{
 try{
  if(!d||d.version!==18)throw Error('Protocol version');
  if(d.type==='init'){
   if(api)throw Error('Duplicate init');validateInput(d.input);profile=d.profile;const profileNumber=dlpProfile(profile),prep=performance.now();generation=d.generation;input=d.input;role=d.role;retained=d.retainLocal===true;
   let bytes=Uint8Array.from(atob(RUSQSIEVE_BASE64),c=>c.charCodeAt(0));memoryContract(bytes);
   const instance=await WebAssembly.instantiate(bytes,{});api=instance.instance.exports;bytes=null;
   if(api.qs_abi_version()!==6||api.qs_max_siqs_bits()!==400||api.qs_max_input_bits()!==1024||api.codex_dlp_version()!==1)throw Error('ABI mismatch');
   const text=new TextEncoder().encode(input);
   if(role==='coord'){
    session=withBytes(text,(p,n)=>api.codex_dlp_new(p,n,profileNumber));if(!session)throw Error('Coordinator preparation failed');
    target=api.qs_coord_target(session);factorBaseSize=api.codex_coord_fb_len(session);budget=api.qs_coord_family_budget(session);
    const bits=BigInt(input).toString(2).length,expected=bits<=288?100000:bits<=368?250000:750000;
    if(budget!==expected||!target||target>1000000)throw Error('Native limits mismatch');
   }else if(role!=='sieve')throw Error('Worker role');
   context=role==='coord'&&d.shareContext!==false?api.codex_coord_worker(session):withBytes(text,(p,n)=>api.codex_dlp_prepare(p,n,profileNumber));if(!context)throw Error('Sieve preparation failed');
   const config=configuration();timings.prepareMs=performance.now()-prep;
   send('ready',{role,target,factorBaseSize,familyBudget:budget,config,...snapshot()});return;
  }
  if(!api||d.generation!==generation)throw Error('Stale generation');
  if(d.type==='job'){
   const{first,count,jobId}=d;if(!context||!Number.isInteger(first)||first<0||!Number.isInteger(count)||count<1||count>2||first+count>d.familyBudget||d.familyBudget>750000)throw Error('Unbounded job');
   const handle=timed('sieveMs',()=>api.qs_worker_sieve(context,first,count)),bytes=timed('copyFreeMs',()=>take(handle));
   const stats=timed('framingMs',()=>validatePacket(bytes,{first,count,target:d.factorBaseSize}));
   send('batch',{jobId,first,count,stats,buffer:bytes.buffer,...snapshot()},[bytes.buffer]);return;
  }
  if(d.type==='submit'){
   if(role!=='coord'||!(d.buffer instanceof ArrayBuffer))throw Error('Submit role');
   const bytes=new Uint8Array(d.buffer);timed('framingMs',()=>validatePacket(bytes,{first:d.first,count:d.count,target:factorBaseSize}));
   const relations=timed('submitMs',()=>withBytes(bytes.subarray(12),(p,n)=>api.qs_coord_submit(session,p,n)));
   if(relations<previous||relations>1000000)throw Error('Relation count bounds');previous=relations;
   send('submitted',{jobId:d.jobId,relations,target,...snapshot()});return;
  }
  if(d.type==='release'){
   const before=memory();if(context&&!(retained&&role==='coord')){api.qs_worker_free(context);context=0;}
   const after=memory();api.codex_mem_reset_peak();send('released',{before,after,...snapshot()});return;
  }
  if(d.type==='extract'){
   if(role!=='coord'||(!retained&&context))throw Error('Extraction ownership');
   const snap=snapshot(),handle=timed('extractMs',()=>api.qs_coord_extract(session)),status=api.codex_extract_status();
   let divisor=null;if(handle)divisor=factorPacket(take(handle),input);
   if((status===1)!==Boolean(divisor)||status<1||status>9)throw Error('Extraction status mismatch');
   const before=memory();if(context){api.qs_worker_free(context);context=0;}api.qs_coord_free(session);session=0;
   send('extracted',{status,divisor,before,after:memory(),dlpStats:snap.dlpStats});return;
  }
  if(d.type==='oom-probe'){
   if(context){api.qs_worker_free(context);context=0;}if(session){api.qs_coord_free(session);session=0;}
   const p=api.qs_alloc(268435456,8);if(p)throw Error('OOM probe unexpectedly allocated');
   send('oom-probe',{memory:memory()});return;
  }
  throw Error('Unknown command');
 }catch(error){let stats=null;try{if(api)stats=memory();}catch{}
  send('fatal',{reason:stats?.allocationFailures>0?'wasm-oom':'fatal-unknown',message:String(error?.message??error).slice(0,160),memory:stats});
 }
};

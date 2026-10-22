import createLabModule from './module.js';
import {LAB_SIQS_BASE64} from './bytes.js';
import {mergeRelationStreams,notificationAccounting,classifySavedPrefix} from './contracts.js';
class LabStop extends Error{constructor(reason){super(reason);this.reason=reason;}}
const TIMER_NAMES=['sieving-inclusive','base-poly','next-small','next-large','plus-init','bucket','sieve-small','sieve-large','scan-inclusive','trial-inclusive','trial-small','trial-large','residual-split'];
export async function installLabWorker(){
 let job=null,previous=0,deliveries=0,clocks=0,gate=0,deadline=0,nativeLimit=0,divisor=null,relations=null,abortReason=null;
 const logs=[];const log=s=>{if(logs.length<16)logs.push(String(s).slice(0,512));};
 const bytes=Uint8Array.from(atob(LAB_SIQS_BASE64),c=>c.charCodeAt(0));
 const api=await createLabModule({wasmBinary:bytes,noInitialRun:true,print:log,printErr:log,
  locateFile:name=>{if(name!=='msieve.wasm')throw Error('Lab asset');return 'embedded:siqs-lab';},
  onAbort:reason=>{abortReason=String(reason);},
  largeTick(value,phase){
   if(!job||typeof value!=='bigint'||value<0n||value>1000000000000n||phase>6)throw Error('Lab checkpoint ABI');
   const work=Number(value),delta=work-previous;
   if(delta<0||delta>job.stride)throw Error('Lab checkpoint interval');previous=work;
   if(job.audit)deliveries++;
   if(work>=nativeLimit)throw new LabStop('operation-budget');
   if(++gate>=job.clockEvery){gate=0;if(job.audit)clocks++;if(performance.now()>=deadline)throw new LabStop('time-budget');}
  },
  largePhase(){},
  publishFactor(type,text){
   if(!job||typeof text!=='string'||!/^[1-9][0-9]{0,99}$/.test(text))throw Error('Lab divisor encoding');
   const factor=BigInt(text),input=BigInt(job.input);
   if(factor<=1n||factor>=input||input%factor)throw Error('Lab forged divisor');divisor=text;
  },
  publishState(total,full,combined,partial,target){
   if([total,full,combined,partial,target].some(x=>!Number.isSafeInteger(x)||x<0||x>2000000))throw Error('Lab relation status');
   relations={total,full,combined,partial,target};
  }
 });
 if(api.HEAPU8.byteLength!==268435456)throw Error('Lab memory profile');
 self.postMessage({type:'ready',version:15,wasmBytes:268435456});
 let used=false;
 self.onmessage=({data:m})=>{
  if(used)return;used=true;
  const transfers=[],returnedStreams=[];let graphWork=0;
  try{
   if(!m||m.type!=='run'||m.version!==15||!Number.isSafeInteger(m.id)||m.id<1||!['collect','merge'].includes(m.phase))throw Error('Lab protocol');
   if(!/^[1-9][0-9]{0,99}$/.test(m.input)||BigInt(m.input)<(1n<<63n)||BigInt(m.input)>=(1n<<332n)||(BigInt(m.input)&1n)===0n)throw Error('Lab input');
   if(![1024,16384].includes(m.stride)||![1,16].includes(m.clockEvery)||![0,1].includes(m.probes)||![0,1].includes(m.audit)||!Number.isInteger(m.parameter)||m.parameter<0||m.parameter>3)throw Error('Lab configuration');
   if(!Number.isSafeInteger(m.operationBudget)||m.operationBudget<1||m.operationBudget>1000000000000||!Number.isFinite(m.remainingMs)||m.remainingMs<=0||m.remainingMs>60000)throw Error('Lab budget');
   if(!Number.isInteger(m.blockQuota??0)||(m.blockQuota??0)<0||(m.blockQuota??0)>4096)throw Error('Lab block quota');
   if(!Number.isInteger(m.seed)||m.seed<1||m.seed>4294967295)throw Error('Lab seed');
   job=m;deadline=performance.now()+m.remainingMs;let graph=null;
   const checkGraph=()=>{if(++graphWork>=m.operationBudget)throw new LabStop('operation-budget');if((graphWork&1023)===0&&performance.now()>=deadline)throw new LabStop('time-budget');};
   if(m.phase==='merge'){
    if(!Array.isArray(m.streams)||!m.streams.length||m.streams.length>2)throw Error('Lab merge stream count');
    const streams=m.streams.map(s=>{
     if(!(s.buffer instanceof ArrayBuffer)||s.buffer.byteLength>16777216||s.meta?.build!==LAB_BUILD||s.meta?.input!==m.input||s.meta?.parameters!==String(m.parameter))throw Error('Lab stream binding');
     returnedStreams.push(s);transfers.push(s.buffer);return {meta:s.meta,bytes:new Uint8Array(s.buffer)};
    });
    graph=mergeRelationStreams(streams,streams[0].meta,{checkpoint:checkGraph});
    if(performance.now()>=deadline)throw new LabStop('time-budget');
   }
   nativeLimit=m.operationBudget-graphWork;
   if(nativeLimit<1)throw new LabStop('operation-budget');
   if(!api._lab_configure(m.phase==='merge'?2:1,m.stride,m.probes,m.parameter,m.blockQuota??0,m.audit)||!api._large_configure(BigInt(nativeLimit)))throw Error('Lab native configuration');
   const inputPtr=api._large_input_ptr();api.HEAPU8.fill(0,inputPtr,inputPtr+128);api.HEAPU8.set(new TextEncoder().encode(m.input),inputPtr);
   if(graph){
    const ptr=api._lab_import_ptr();
    if(ptr<0||ptr+graph.bytes.length>api.HEAPU8.length)throw Error('Lab import pointer');
    api.HEAPU8.set(graph.bytes,ptr);if(!api._lab_import(graph.bytes.length))throw Error('Lab import rejected');
   }
   let stop='collected',normal=false;
   try{api._large_run(m.seed,(m.seed^0x9e3779b9)>>>0||1);normal=true;}
   catch(error){
    if(!(error instanceof LabStop)||api._large_reason()>2||abortReason)throw error;
    stop=error.reason;
   }
   const stats={work:Number(api._large_work()),phase:api._large_phase(),saveBytes:api._large_saved(),nnz:api._large_nnz(),reason:api._large_reason(),
    blocks:Number(api._lab_stat(3)),basePolynomials:Number(api._lab_stat(4)),derivedPolynomials:Number(api._lab_stat(5)),
    verifiedRelations:Number(api._lab_stat(9)),probeClockCalls:Number(api._lab_stat(2)),headerWork:Number(api._lab_stat(17)),phaseWork:Array.from({length:7},(_,i)=>Number(api._lab_stat(20+i))),logs,abortReason,
    timers:TIMER_NAMES.map((name,i)=>({name,ms:api._lab_timer(i),throughSnapshotMs:api._lab_timer_elapsed(i),calls:api._lab_timer_calls(i),open:!!api._lab_timer_open(i)}))};
   stats.probeClockCalls=Number(api._lab_stat(2));
   if(stats.work>nativeLimit||stats.saveBytes>16777216||stats.timers.some(t=>!Number.isFinite(t.ms)||t.ms<0))throw Error('Lab statistics');
   stats.notifications=m.audit?notificationAccounting({work:stats.work,stride:m.stride,periodic:Number(api._lab_stat(0)),flush:Number(api._lab_stat(1)),deliveries,clockCalls:clocks,probeClockCalls:stats.probeClockCalls}):{derivedPeriodic:Math.floor(stats.work/m.stride),observedDeliveries:null};
   const meta={input:m.input,multiplier:Number(api._lab_stat(8)),fbSize:Number(api._lab_stat(7)),parameters:String(m.parameter),build:LAB_BUILD};
   let buffer=null,headerPrefix=null;
   if(stats.saveBytes){
    const ptr=api._lab_save_ptr();if(ptr<0||ptr+stats.saveBytes>api.HEAPU8.length)throw Error('Lab save pointer');
    buffer=api.HEAPU8.slice(ptr,ptr+stats.saveBytes).buffer;transfers.push(buffer);
    const prefix=classifySavedPrefix(new Uint8Array(buffer),meta,normal);
    if(!prefix.mergeEligible){headerPrefix=buffer;buffer=null;stats.incompleteHeaderBytes=stats.saveBytes;}
   }
   if(graph){
    const expected=m.streams[0].meta;
    if(meta.multiplier!==expected.multiplier||meta.fbSize!==expected.fbSize)throw Error('Lab native base mismatch');
    if(normal&&stats.verifiedRelations!==graph.uniqueRelations)throw Error('Lab native relation verification count');
    if(normal&&relations&&(relations.total!==graph.total||relations.partial!==graph.partial))throw Error('Lab shared graph mismatch');
    graph={...graph,bytes:undefined,verified:normal&&stats.verifiedRelations===graph.uniqueRelations};
   }
   self.postMessage({type:'done',version:15,id:m.id,phase:m.phase,stop,normal,stats,meta,buffer,headerPrefix,streams:returnedStreams,graph,
    graphWork,operations:stats.work+graphWork,relations,divisor:normal?divisor:null},transfers);
  }catch(error){
   if(error instanceof LabStop){
    self.postMessage({type:'done',version:15,id:m.id,phase:m.phase,stop:error.reason,normal:false,stats:{work:0},meta:m.streams?.[0]?.meta??{input:m.input,parameters:String(m.parameter)},buffer:null,streams:[],graph:null,graphWork,operations:Math.min(graphWork,m.operationBudget),relations:null,divisor:null});return;
   }
   self.postMessage({type:'error',version:15,id:m?.id,code:'lab-fatal',message:String(error?.message).slice(0,256),abortReason});
  }
 };
}

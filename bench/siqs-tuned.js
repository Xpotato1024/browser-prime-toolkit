import {BASE_WORKER_SOURCE,TUNED_WORKER_SOURCE} from '../src/siqs-tuned/worker-source.js';
let LAB_WORKER_SOURCE=TUNED_WORKER_SOURCE,busy=false;
async function withEngine(engine,fn){if(busy||!['base','lto'].includes(engine))throw Error('Tuned engine/busy');busy=true;LAB_WORKER_SOURCE=engine==='base'?BASE_WORKER_SOURCE:TUNED_WORKER_SOURCE;try{return await fn();}finally{busy=false;}}
import {createLabRunner} from '../src/siqs-tuned/runner.js';
import {makeWorkerFromSource} from '../src/worker/source-factory.js';
import {RSA_CASES} from './staged-rsa/cases.js';
import {FULL_CASES} from './staged-full/cases.js';
const cases=[...RSA_CASES,...FULL_CASES],probe='1427247692705959880439315947500961989719490561';
const violations=[],errors=[],rejections=[];
addEventListener('securitypolicyviolation',e=>violations.push({directive:e.violatedDirective,blocked:e.blockedURI}));
addEventListener('error',e=>errors.push(e.message));
addEventListener('unhandledrejection',e=>rejections.push(String(e.reason)));
const assert=(x,s)=>{if(!x)throw Error(s);},tick=ms=>new Promise(yes=>setTimeout(yes,ms));
let live=0,maxLive=0,created=0,posted=false;
function track(w){
 live++;created++;maxLive=Math.max(maxLive,live);let ended=false;
 const terminate=w.terminate.bind(w),post=w.postMessage.bind(w);
 w.terminate=()=>{terminate();if(!ended){ended=true;live--;}};
 w.postMessage=(data,transfers)=>{posted=true;post(data,transfers);};return w;
}
const real=()=>track(makeWorkerFromSource(LAB_WORKER_SOURCE));
const withRun=async(input,options={},deps={})=>{
 const runner=createLabRunner({createWorker:real,...deps});
 try{return await runner.run(input,options);}finally{runner.dispose();}
};
const rsa100=cases.find(c=>c.id==='RSA-100').input;
async function oneShot(phase,input,extra={}){
 const w=real();
 try{return await new Promise((yes,no)=>{
  const timer=setTimeout(()=>no(Error('One-shot deadline')),3000);
  w.onmessage=({data})=>{
   if(data.type==='ready')w.postMessage({type:'run',version:15,id:1,input,phase,seed:1,operationBudget:1000000000,remainingMs:2300,
    stride:1024,clockEvery:1,probes:0,audit:1,parameter:0,blockQuota:64,...extra},extra.streams?.map(s=>s.buffer)??[]);
   else{clearTimeout(timer);yes(data);}
  };w.onerror=e=>{clearTimeout(timer);no(Error(e.message));};
 });}finally{w.terminate();w.releaseSource?.();}
}
const encode=buffer=>{
 const bytes=new Uint8Array(buffer);let text='';
 for(let i=0;i<bytes.length;i+=8192)text+=String.fromCharCode(...bytes.subarray(i,i+8192));
 return {base64:btoa(text),bytes:bytes.length};
};
function serial(value){
 if(value instanceof ArrayBuffer)return encode(value);
 if(Array.isArray(value))return value.map(serial);
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,serial(v)]));
 return value;
}
async function run(){
 const tests=[],diagnostics=[];
 const check=async(name,fn)=>{try{await fn();tests.push({name,pass:true});}catch(e){tests.push({name,pass:false,error:e.message});}};
 await check('all collected relations pass native polynomial verification',async()=>{
  const r=await withRun(probe,{blockQuota:64,variant:'probes'});diagnostics.push(serial(r));
  assert(r.kind==='verified'&&r.merged.graph.uniqueRelations>0&&r.merged.stats.verifiedRelations===r.merged.graph.uniqueRelations,'Native validation');
 });
 await check('two collectors rebuild one graph within the total budgets',async()=>{
  const r=await withRun(probe,{workers:2,streams:2,blockQuota:64});diagnostics.push(serial(r));
  assert(r.kind==='verified'&&r.peakWorkers===2&&r.peakWasmBytes<=536870912&&r.chargedOperations<=r.plan.operationBudget,'Two-lane budget');
  const collectors=r.records.filter(x=>x.phase==='collect');
  const local=collectors.reduce((s,x)=>s+(x.packet.relations?.combined??0),0);
  assert(collectors.length===2&&r.merged.graph.combined>=local&&r.allWorkersDisposed,'Common graph');
 });
 await check('both notification strides preserve the native work ceiling',async()=>{
  for(const variant of ['base','stride16k']){
   const r=await withRun(rsa100,{variant,operationBudget:4096});diagnostics.push(serial(r));
   assert(r.kind==='incomplete'&&r.chargedOperations<=4096&&r.allWorkersDisposed,'Finite native work');
  }
 });
 await check('loading and running cancellation retire all owners; fresh job recovers',async()=>{
  for(const phase of ['loading','running']){
   posted=false;const r=createLabRunner({createWorker:real}),p=r.run(rsa100);
   if(phase==='running'){for(let i=0;i<1000&&!posted;i++)await tick(1);assert(posted,'Run posted');await tick(20);}
   r.cancel();const out=await p;r.dispose();assert(out.kind==='cancelled'&&out.allWorkersDisposed&&live===0,'Cancel');
  }
  assert((await withRun(probe,{blockQuota:64})).kind==='verified','Fresh recovery');
 });
 await check('host deadline terminates a worker with no cooperative clock',async()=>{
  const source='self.postMessage({type:"ready",version:15,wasmBytes:268435456});self.onmessage=()=>{while(true){}};';
  const r=await withRun(rsa100,{timeBudgetMs:1000},{createWorker:()=>track(makeWorkerFromSource(source))});
  assert(r.kind==='incomplete'&&r.hostStops.some(x=>x.reason==='host-phase-deadline'&&x.posted)&&r.allWorkersDisposed&&r.elapsedMs<1300,'Independent termination');
 });
 await check('wrong ready memory fails closed before posting',async()=>{
  posted=false;const source='self.postMessage({type:"ready",version:15,wasmBytes:536870912});';
  const r=await withRun(probe,{}, {createWorker:()=>track(makeWorkerFromSource(source))});
  assert(r.kind==='fatal'&&!posted&&r.allWorkersDisposed,'Ready memory');
 });
 await check('unsupported inputs allocate no Worker',async()=>{
  const before=created;
  for(const n of ['0','1','09',(1n<<332n).toString()])assert((await withRun(n)).kind==='unsupported','Range');
  assert(created===before,'No allocation');
 });
 await check('graph budget is a known incomplete result; forged native relation is fatal',async()=>{
  const c=await oneShot('collect',probe);assert(c.type==='done'&&c.buffer.byteLength>100,'Actual source relations');
  const limited=await oneShot('merge',probe,{operationBudget:1,streams:[{meta:c.meta,buffer:c.buffer.slice(0)}]});
  assert(limited.type==='done'&&limited.stop==='operation-budget'&&limited.operations===1&&limited.stats.work===0&&!limited.graph,'Graph budget');
  let text=new TextDecoder().decode(c.buffer);assert(text.includes(' L 1 1\n'),'Full relation fixture');
  text=text.replace(' L 1 1\n',' L 1 3\n');
  const bad=await oneShot('merge',probe,{streams:[{meta:c.meta,buffer:new TextEncoder().encode(text).buffer}]});
  assert(bad.type==='error'&&bad.code==='lab-fatal','Forged relation');
 });
 await check('actual partials from different streams form a shared native cycle',async()=>{
  const c=await oneShot('collect',probe,{blockQuota:4096});
  assert(c.type==='done'&&c.buffer?.byteLength,'Collected source');
  const lines=new TextDecoder().decode(c.buffer).trimEnd().split('\n'),header=lines.shift(),byPrime=new Map();
  let a=null,pair=null;
  for(const line of lines){
   if(line.startsWith('A '))a=line;
   else if(line.startsWith('R ')){
    const lp=line.split(' L ')[1]?.split(' ');
    if(lp?.[0]!=='1'||lp[1]==='1')continue;
    const previous=byPrime.get(lp[1]);
    if(previous&&previous.a+'|'+previous.line!==a+'|'+line){pair=[previous,{a,line}];break;}
    byPrime.set(lp[1],{a,line});
   }
  }
  assert(pair,'Matching partial large prime fixture');
  const streams=pair.map((x,i)=>({meta:c.meta,buffer:new TextEncoder().encode(header+'\n'+x.a+'\n'+x.line+'\n'+(i===0?x.line+'\n':'')).buffer}));
  const merged=await oneShot('merge',probe,{streams});
  assert(merged.type==='done'&&merged.graph?.verified&&merged.graph.combined===1&&merged.graph.duplicates===1&&merged.stats.verifiedRelations===2,'Cross-stream cycle and replay deduplication');
  diagnostics.push(serial({actualCrossStreamFixture:merged}));
 });
 await check('known stop between native header and newline stays incomplete',async()=>{
  const c=await oneShot('collect',probe),work=c.stats.headerWork;
  assert(Number.isSafeInteger(work)&&work>0,'Native header boundary');
  const stopped=await oneShot('collect',probe,{operationBudget:work});
  assert(stopped.type==='done'&&stopped.stop==='operation-budget'&&stopped.buffer===null&&stopped.headerPrefix?.byteLength>0,'Header snapshot eligibility');
  diagnostics.push(serial({nativeHeaderStop:stopped}));
 });
 await check('actual fixed-memory OOM and unknown trap retire; fresh request recovers',async()=>{
  const end=LAB_WORKER_SOURCE.lastIndexOf('\ninstallLabWorker().catch(');assert(end>0,'Audit source boundary');
  for(const kind of ['oom','trap']){
   const source=LAB_WORKER_SOURCE.slice(0,end)+'\n(async()=>{let reason=null;const api=await createLabModule({wasmBinary:Uint8Array.from(atob(LAB_SIQS_BASE64),c=>c.charCodeAt(0)),noInitialRun:true,print:()=>{},printErr:()=>{},onAbort:r=>reason=String(r),locateFile:()=>"embedded:siqs-lab",largeTick:()=>{},largePhase:()=>{},publishFactor:()=>{},publishState:()=>{}});self.postMessage({type:"ready",version:15,wasmBytes:268435456});self.onmessage=({data:m})=>{try{'+(kind==='oom'?'api._malloc(268435456);':'api._abort();')+'self.postMessage({type:"error",version:15,id:m.id,code:"audit-no-trap",message:"missing trap"});}catch(e){self.postMessage({type:"error",version:15,id:m.id,code:e instanceof WebAssembly.RuntimeError?"audit-'+kind+'-native":"audit-unexpected",message:String(reason)});}};})().catch(e=>self.postMessage({type:"error",version:15,message:String(e.message)}));';
   const r=await withRun(probe,{}, {createWorker:()=>track(makeWorkerFromSource(source))});
   assert(r.kind==='fatal'&&r.error.includes('audit-'+kind+'-native')&&r.allWorkersDisposed,'Real native fault retirement');
   assert((await withRun(probe,{blockQuota:64})).kind==='verified','Fresh native recovery');
  }
 });
 await check('actual worker rejects wall horizons beyond 60 seconds',async()=>{
  const bad=await oneShot('collect',probe,{remainingMs:60001});assert(bad.type==='error'&&bad.code==='lab-fatal'&&live===0,'Worker long-horizon bound');
 });
 return {tests,diagnostics,created,maxLive,allWorkersDisposed:live===0,performanceMeasurement:false};
}
globalThis.evaluationHarness={
 run:(engine)=>withEngine(engine,run),
 async measure({id,options,engine}){return withEngine(engine,async()=>{const c=cases.find(c=>c.id===id);assert(c,'Unknown case');const outcome=await withRun(c.input,options);
  return {engine,id:c.id,input:c.input,bits:c.bits,digits:c.digits,options,outcome:serial(outcome),knownFactorsUsed:false};});},
 ownership:()=>({live,maxLive}),violations,errors,rejections
};

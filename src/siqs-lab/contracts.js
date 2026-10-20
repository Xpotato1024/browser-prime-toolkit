const WASM=268435456, MAX_WORK=1000000000000;
const integer=(x,min,max,label)=>{if(!Number.isSafeInteger(x)||x<min||x>max)throw RangeError(label);return x;};
export function planLanes({workers,operationBudget,timeBudgetMs}){
 if(![1,2].includes(workers))throw RangeError('Lab workers');
 integer(operationBudget,2,MAX_WORK,'Lab operation budget');integer(timeBudgetMs,1000,15000,'Lab wall budget');
 const first=Math.ceil(operationBudget/2);
 return {workers,timeBudgetMs,operationBudget,concurrentWasmBytes:workers*WASM,
  lanes:[{seed:1,operationBudget:first},{seed:11,operationBudget:operationBudget-first}]};
}
export function notificationAccounting({work,stride,periodic,flush,deliveries,clockCalls,probeClockCalls}){
 integer(work,0,MAX_WORK,'work');if(![1024,16384].includes(stride))throw RangeError('stride');
 for(const x of [periodic,flush,deliveries,clockCalls,probeClockCalls])integer(x,0,MAX_WORK,'counter');
 const derivedPeriodic=Math.floor(work/stride);
 if(periodic!==derivedPeriodic||deliveries!==periodic+flush||clockCalls>deliveries)throw Error('Notification accounting mismatch');
 return {derivedPeriodic,observedPeriodic:periodic,observedFlush:flush,observedDeliveries:deliveries,clockCalls,probeClockCalls};
}
const keys=['input','multiplier','fbSize','parameters','build'];
function validateMeta(meta){
 if(!meta||Object.keys(meta).sort().join()!==[...keys].sort().join())throw Error('Lab metadata fields');
 if(!/^[1-9][0-9]{0,99}$/.test(meta.input))throw Error('Lab input');
 integer(meta.multiplier,1,255,'multiplier');integer(meta.fbSize,2,100000,'factor base');
 for(const x of [meta.parameters,meta.build])if(typeof x!=='string'||!x||x.length>128)throw Error('Lab metadata version');
}
export function mergeRelationStreams(streams,expected,{maxBytes=16777216,checkpoint=()=>{}}={}){
 validateMeta(expected);integer(maxBytes,1,16777216,'save bytes');
 if(!Array.isArray(streams)||!streams.length||streams.length>8)throw Error('Lab streams');
 let inputBytes=0,rawRelations=0,uniqueRelations=0,duplicates=0,full=0,partial=0,components=0;
 const groups=new Map(),parent=new Map(),seen=new Map();
 const find=x=>{let r=x;while(parent.get(r)!==r){checkpoint();r=parent.get(r);}while(x!==r){checkpoint();const next=parent.get(x);parent.set(x,r);x=next;}return r;};
 const edge=(a,b)=>{
  for(const x of [a,b])if(!parent.has(x)){parent.set(x,x);components++;}
  const ra=find(a),rb=find(b);if(ra!==rb){parent.set(ra,rb);components--;}
 };
 const fromHex=(s,max)=>{if(!/^(0|[1-9a-f][0-9a-f]*)$/.test(s))throw Error('Lab canonical hex');const x=Number.parseInt(s,16);return integer(x,0,max,'hex bound');};
 for(const stream of streams){
  validateMeta(stream?.meta);
  if(keys.some(k=>stream.meta[k]!==expected[k]))throw Error('Incompatible SIQS stream');
  if(!(stream.bytes instanceof Uint8Array)||(inputBytes+=stream.bytes.byteLength)>maxBytes)throw Error('Lab stream byte bound');
  if(stream.bytes.some(x=>x>127||x===13||x===0))throw Error('Lab stream ASCII');
  const text=new TextDecoder('utf-8',{fatal:true}).decode(stream.bytes);
  if(!text.endsWith('\n'))throw Error('Truncated lab record');
  const lines=text.slice(0,-1).split('\n'),header=lines.shift();
  if(!/^[1-9a-f][0-9a-f]*$/.test(header)||BigInt('0x'+header)!==BigInt(expected.input)*BigInt(expected.multiplier))throw Error('Lab stream input header');
  let current=null,derived=0;
  for(const line of lines){
   checkpoint();
   if(line.length>1023)throw Error('Lab line bound');
   if(line.startsWith('A ')){
    const parts=line.slice(2).split(' ');if(parts.length<2||parts.length>16)throw Error('Lab A factors');
    let prev=1;for(const p of parts){const v=fromHex(p,expected.fbSize-1);if(v<=prev)throw Error('Lab A order');prev=v;}
    current=parts.join(' ');derived=2**(parts.length-1);
    if(!groups.has(current))groups.set(current,[]);
   }else if(line.startsWith('R ')){
    if(current===null)throw Error('Relation without polynomial');
    if(++rawRelations>200000)throw Error('Lab relation bound');
    const parts=line.slice(2).split(' '),lp=parts.indexOf('L');
    if(lp<2||lp>66||parts.length!==lp+3)throw Error('Lab relation fields');
    const offset=parts[0];if(offset.startsWith('-')){if(!fromHex(offset.slice(1),0x7fffffff))throw Error('negative zero');}else fromHex(offset,0x7fffffff);
    fromHex(parts[1],derived-1);
    let prev=0;for(const p of parts.slice(2,lp)){const v=fromHex(p,expected.fbSize-1);if(v<prev)throw Error('Lab factor order');prev=v;}
    const a=fromHex(parts[lp+1],0xffffffff),b=fromHex(parts[lp+2],0xffffffff);
    if(!a||a>b)throw Error('Lab large prime order');
    if(a!==b&&a!==1&&(a>0x7fffffff||b>0x7fffffff))throw Error('Lab DLP width');
    const id=current+'|'+parts[0]+'|'+parts[1];
    if(seen.has(id)){if(seen.get(id)!==line)throw Error('Conflicting relation identity');duplicates++;continue;}
    seen.set(id,line);uniqueRelations++;groups.get(current).push(line);
    if(a===b)full++;else{partial++;edge(a,b);}
   }else throw Error('Unknown lab record');
  }
 }
 const combined=partial+components-parent.size;
 if(combined<0)throw Error('Lab graph invariant');
 const header=(BigInt(expected.input)*BigInt(expected.multiplier)).toString(16);
 const text=header+'\n'+[...groups].flatMap(([a,rs])=>rs.length?['A '+a,...rs]:[]).join('\n')+'\n';
 const bytes=new TextEncoder().encode(text);if(bytes.byteLength>maxBytes)throw Error('Lab merged byte bound');
 return {bytes,rawRelations,uniqueRelations,duplicates,full,partial,combined,total:full+combined,polynomials:groups.size,
  vertices:parent.size,components,verified:false};
}
export function classifySavedPrefix(bytes,meta,normal){
 if(!(bytes instanceof Uint8Array)||!bytes.length||bytes.length>16777216)throw Error('Lab saved prefix bound');
 if(bytes.at(-1)===10)return {mergeEligible:true,incompleteHeader:false};
 const header=(BigInt(meta.input)*BigInt(meta.multiplier)).toString(16);
 if(normal||bytes.length!==header.length||bytes.some((x,i)=>x!==header.charCodeAt(i)))throw Error('Unexpected truncated lab snapshot');
 return {mergeEligible:false,incompleteHeader:true};
}

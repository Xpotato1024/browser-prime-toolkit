// SPDX-License-Identifier: AGPL-3.0-only
import {optimizedWorkerSource} from '../optimized/worker-source.js';
import {RUSQSIEVE_BASE64} from './wasm-long-256.js';
const replace=(s,a,b)=>{if(s.split(a).length!==2)throw Error('Long Worker anchor '+a.slice(0,80));return s.replace(a,b);};
export function longWorkerSource(cap){
 if(![64,256].includes(cap))throw Error('Long role cap');
 let s=optimizedWorkerSource(cap);
 const pattern=/const RUSQSIEVE_BASE64="[^"]+";/g;
 if([...s.matchAll(pattern)].length!==1)throw Error('Long artifact anchor');
 if(cap===256)s=s.replace(pattern,()=> 'const RUSQSIEVE_BASE64='+JSON.stringify(RUSQSIEVE_BASE64)+';');
 s=replace(s,'t[k]>600000','t[k]>1800000');
 s=replace(s,'if(sum>610000)','if(sum>1810000)');
 s=replace(s,'maxMs:600000','maxMs:1800000');
 if(cap===64)return s;
 s=replace(s,'onmessage=async({data:d})=>{',`let longExtracting=false,longTerminal=false;
function quotaTelemetry(){
 if(role!=='coord'||!api||typeof api.codex_la_count!=='function')return null;
 const count=api.codex_la_count();if(count>24)throw Error('Native quota row cap');
 return {extracting:longExtracting,active:api.codex_la_active(),refusals:api.codex_la_refusals(),preflightRefused:api.codex_la_preflight_refused(),stages:Array.from({length:count},(_,i)=>Array.from({length:12},(_,j)=>api.codex_la_field(i,j)))};
}
onmessage=async({data:d})=>{
 if(longTerminal)return;`);
 s=replace(s,"if(d.type==='extract'){","if(d.type==='extract'){longExtracting=true;");
 s=replace(s,'const before=memory();if(context){api.qs_worker_free(context);context=0;}api.qs_coord_free(session);session=0;',
 'const nativeQuota=quotaTelemetry();longExtracting=false;const before=memory();if(context){api.qs_worker_free(context);context=0;}api.qs_coord_free(session);session=0;');
 s=replace(s,"send('extracted',{graphPhases:","send('extracted',{nativeQuota,graphPhases:");
 s=replace(s,` }catch(error){let stats=null;try{if(api)stats=memory();}catch{}
  send('fatal',{reason:stats?.allocationFailures>0?'wasm-oom':'fatal-unknown',message:String(error?.message??error).slice(0,160),memory:stats});`,
 ` }catch(error){let stats=null,nativeQuota=null;try{if(api)stats=memory();}catch{}try{nativeQuota=quotaTelemetry();}catch{}
  longTerminal=true;
  const quota=role==='coord'&&nativeQuota?.extracting&&nativeQuota.active===1&&nativeQuota.refusals>0&&stats?.allocationFailures>0;
  send('fatal',{reason:quota?'native-memory-budget':stats?.allocationFailures>0?'wasm-oom':'fatal-unknown',message:String(error?.message??error).slice(0,160),memory:stats,nativeQuota});`);
 return s;
}

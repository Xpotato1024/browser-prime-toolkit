// SPDX-License-Identifier: AGPL-3.0-only
import {open} from 'node:fs/promises';
import {join} from 'node:path';

// One owned Chrome, one deadline: the fresh profile and a live loopback CDP
// response must agree. A stderr notification is diagnostic, never authorization.
export function observeChromeStartup(child,profile,{timeoutMs=30000,pollMs=50}={}){
 if(!Number.isFinite(timeoutMs)||timeoutMs<=0||!Number.isFinite(pollMs)||pollMs<=0)throw Error('Invalid startup deadline');
 const started=performance.now(),deadline=started+timeoutMs,trace=[];
 let settledAt=null,state='starting',stderr='',stderrLine='',stderrOverflow=false,bannerSeen=false,lastProbeError=null,polls=0,disposed=false,pollTimer,deadlineTimer,controller,resolveReady,rejectReady;
 const redact=text=>text.replace(/wss?:\/\/[^\s]+|\/devtools\/browser\/[^\s]+/g,'<redacted-cdp-endpoint>');
 const record=event=>{if(trace.length<32)trace.push({event,elapsedMs:Math.round(performance.now()-started)});};
 const diagnostics=()=>({state,elapsedMs:Math.round((settledAt??performance.now())-started),polls,bannerSeen,lastProbeError,stderr:(stderr+(stderrLine||stderrOverflow?'<incomplete stderr line>':'')).slice(-10000),trace:[...trace]});
 const alive=()=>child.exitCode===null&&child.signalCode===null;
 const stopTimers=()=>{clearTimeout(pollTimer);clearTimeout(deadlineTimer);controller?.abort();};
 const finish=(next,error,url)=>{
  if(state!=='starting')return;
  state=next;settledAt=performance.now();record(next);stopTimers();if(error)rejectReady(error);else resolveReady(url);
 };
 const onError=error=>finish('spawn-error',Error('Chrome spawn failed: '+error.message));
 const onExit=(code,signal)=>finish('exited',Error('Chrome exited before readiness: '+String(code)+' '+String(signal)));
 const onStderr=data=>{
  // Do not expose partial lines: a capability URL can cross any chunk boundary.
  // Overlong unfinished lines are discarded through the next newline, not tailed.
  const parts=data.toString().split('\n');
  for(let i=0;i<parts.length;i++){
   if(!stderrOverflow){
    stderrLine+=parts[i];if(stderrLine.includes('DevTools listening on'))bannerSeen=true;
    if(stderrLine.length>10000){stderrLine='';stderrOverflow=true;}
   }
   if(i<parts.length-1){stderr=(stderr+(stderrOverflow?'<oversized stderr line>':redact(stderrLine))+'\n').slice(-10000);stderrLine='';stderrOverflow=false;}
  }
 };
 const ready=new Promise((res,rej)=>{resolveReady=res;rejectReady=rej;});
 // The caller may still be starting its memory observer when Chrome exits.
 void ready.catch(()=>{});
 child.on('error',onError);child.on('exit',onExit);child.stderr.on('data',onStderr);
 record('observing');
 deadlineTimer=setTimeout(()=>finish('timeout',Error('Chrome startup timed out after '+timeoutMs+'ms; '+(lastProbeError??'no owned DevToolsActivePort'))),timeoutMs);
 async function poll(){
  if(disposed||state!=='starting')return;
  if(!alive()){onExit(child.exitCode,child.signalCode);return;}
  polls++;
  try{
   // Bound reads even if Chrome writes a malformed file; tolerate partial writes.
   const file=await open(join(profile,'DevToolsActivePort'),'r');let data;
   try{const buffer=Buffer.alloc(1025);const {bytesRead}=await file.read(buffer,0,buffer.length,0);if(bytesRead>1024)throw Error('Oversized owned port file');data=buffer.subarray(0,bytesRead).toString('utf8');}finally{await file.close();}
   const [portText,path]=data.split(/\r?\n/);
   if(!/^[1-9][0-9]{0,4}$/.test(portText)||Number(portText)>65535||!/^\/devtools\/browser\/[A-Za-z0-9-]{8,128}$/.test(path??''))throw Error('Incomplete owned port file');
   if(!trace.some(e=>e.event==='owned-port-visible'))record('owned-port-visible');
   const remaining=deadline-performance.now();if(remaining<=0)return;
   controller=new AbortController();const probeTimer=setTimeout(()=>controller.abort(),Math.min(500,remaining));
   try{
    const response=await fetch('http://127.0.0.1:'+portText+'/json/version',{signal:controller.signal,redirect:'error'});
    if(!response.ok)throw Error('CDP version status '+response.status);
    const reader=response.body.getReader();let bytes=0,chunks=[];
    try{for(;;){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>16384)throw Error('Oversized CDP version response');chunks.push(Buffer.from(value));}}finally{await reader.cancel();}
    const url=new URL(JSON.parse(Buffer.concat(chunks).toString('utf8')).webSocketDebuggerUrl);
    if(url.protocol!=='ws:'||!['127.0.0.1','localhost'].includes(url.hostname)||url.port!==portText||url.pathname!==path||url.username||url.password||url.search||url.hash)throw Error('CDP response differs from owned endpoint');
    if(!alive()){onExit(child.exitCode,child.signalCode);return;}
    if(performance.now()>=deadline)return;
    finish('ready',null,url.href);
   }finally{clearTimeout(probeTimer);controller=null;}
  }catch(error){
   // Do not retain response text or capability-bearing websocket paths.
   if(error.name!=='AbortError'||lastProbeError===null)lastProbeError=error.code==='ENOENT'?'owned port file not yet present':redact(String(error.message)).slice(0,240);
  }
  if(!disposed&&state==='starting')pollTimer=setTimeout(poll,Math.min(pollMs,Math.max(0,deadline-performance.now())));
 }
 void poll();
 return {ready,diagnostics,remainingMs:()=>disposed?0:Math.max(0,deadline-performance.now()),dispose(){
  if(disposed)return;disposed=true;
  if(state==='starting')finish('disposed',Error('Chrome startup observer disposed'));
  stopTimers();child.removeListener('error',onError);child.removeListener('exit',onExit);child.stderr.removeListener('data',onStderr);
 }};
}

export function createCdpSender({getSocket,pending,nextId,timeoutForMethod}){
 return (method,params={},sessionId)=>new Promise((resolve,reject)=>{
  const socket=getSocket();
  if(!socket||socket.readyState!==1){reject(Error('CDP transport is not open: '+method));return;}
  const id=nextId();
  const timer=setTimeout(()=>{pending.delete(id);reject(Error('CDP timeout: '+method));},timeoutForMethod(method));
  pending.set(id,{sessionId,method,resolve,reject,timer});
  try{socket.send(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})}));}
  catch(error){clearTimeout(timer);pending.delete(id);reject(error);}
 });
}

// Transport opening uses only the remainder of the original startup deadline.
export function openChromeTransport(socket,{timeoutMs,remainingMs}){
 return new Promise((resolve,reject)=>{
  const deadline=performance.now()+timeoutMs;
  const remaining=remainingMs??(()=>deadline-performance.now());
  let timer;
  const cleanup=()=>{clearTimeout(timer);socket.removeEventListener('open',opened);socket.removeEventListener('error',failed);socket.removeEventListener('close',closed);};
  const timedOut=()=>{cleanup();try{socket.close();}catch{}reject(Error('Chrome CDP transport startup timed out'));};
  const readRemaining=()=>{const left=remaining();if(!Number.isFinite(left))throw Error('Invalid startup remaining time');return left;};
  const opened=()=>{try{if(readRemaining()<=0){timedOut();return;}}catch(error){cleanup();reject(error);return;}cleanup();resolve();};
  const failed=()=>{cleanup();reject(Error('Chrome CDP transport failed before open'));};
  const closed=()=>{cleanup();reject(Error('Chrome CDP transport closed before open'));};
  let left;try{left=readRemaining();}catch(error){reject(error);return;}
  if(left<=0){timedOut();return;}
  socket.addEventListener('open',opened,{once:true});socket.addEventListener('error',failed,{once:true});socket.addEventListener('close',closed,{once:true});
  timer=setTimeout(timedOut,left);
  if(socket.readyState===1)opened();else if(socket.readyState>=2)closed();
 });
}

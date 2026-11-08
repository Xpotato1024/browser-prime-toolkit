// SPDX-License-Identifier: AGPL-3.0-only
import {readFileSync} from 'node:fs';
import {rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname,join,resolve,sep} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {observeChromeStartup,openChromeTransport,createCdpSender} from './chrome-startup.mjs';
import {createChromeRetirement} from './long-window-cleanup.mjs';

export function ciHarnessIdentity(url,original,originalSha256,producer='scripts/generate-chrome-ci.mjs'){
 const root=resolve(dirname(fileURLToPath(url)),'..');
 const entry='scripts/'+fileURLToPath(url).split(/[\\/]/).at(-1);
 const files=[...new Set([entry,original,producer,'scripts/chrome-ci-lifecycle.mjs','scripts/chrome-startup.mjs',
  'scripts/long-window-cleanup.mjs','scripts/chrome-ci-transform.mjs','scripts/chrome-ci-entries.json'].filter(Boolean))];
 const sourceFiles=Object.fromEntries(files.map(p=>[p,createHash('sha256').update(readFileSync(join(root,p))).digest('hex')]));
 if(original&&sourceFiles[original]!==originalSha256)throw Error('Historical CI driver changed: '+original);
 return {kind:'ci-contract-only',performanceMeasurement:false,entry,original,originalSha256,producer,sourceFiles};
}

export function rejectCdpPending(pending,message){
 for(const[id,call]of pending){clearTimeout(call.timer);pending.delete(id);(call.reject??call.no)(Error(message));}
}
export function trackCdpTransport(socket,pending){
 let failed=false;
 const fail=event=>{failed=true;rejectCdpPending(pending,'CDP transport '+event.type);};
 socket.addEventListener('error',fail);socket.addEventListener('close',fail);
 return {isOpen:()=>!failed&&socket.readyState===1,dispose(){socket.removeEventListener('error',fail);socket.removeEventListener('close',fail);}};
}
export async function boundedStep(task,timeoutMs,label){
 let timer;try{return await Promise.race([Promise.resolve().then(task),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error(label+' timed out')),timeoutMs);})]);}
 finally{clearTimeout(timer);}
}
export function createCiBrowserLifecycle({getChrome,getSocket,getMemory=()=>null,getServer,getSession=()=>null,pending,nextId,timeoutForMethod,profile,getWatchdog=()=>null,retire}){
 let startup,transport,cleanupTask,primaryFailure;
 const socket=()=>transport?.isOpen()?getSocket():undefined;
 const send=createCdpSender({getSocket:socket,pending,nextId,timeoutForMethod});
 const retireOwned=retire??createChromeRetirement(()=>Number.isSafeInteger(getChrome()?.pid)?getChrome():null);
 return {
  send,
  noteFailure(error){primaryFailure=error;},
  observe({timeoutMs}){if(startup)throw Error('Chrome startup observed twice');startup=observeChromeStartup(getChrome(),profile,{timeoutMs});},
  ready(){if(!startup)throw Error('Chrome must be observed immediately after spawn');return startup.ready;},
  async setup(task){
   const left=startup.remainingMs();if(left<=0)throw Error('Chrome startup setup timed out');
   let timer;try{
    await Promise.race([Promise.resolve().then(task),startup.ready.then(()=>new Promise(()=>{})),
     new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Chrome startup setup timed out')),left);})]);
   }finally{clearTimeout(timer);}
  },
  async connect(ws){transport=trackCdpTransport(ws,pending);await openChromeTransport(ws,{remainingMs:startup.remainingMs});},
  get connected(){return !!transport?.isOpen();},
  diagnostics(){return startup?.diagnostics()??{state:'not-spawned'};},
  async diagnostic(expression){
   if(!transport?.isOpen()||!getSession())return null;
   const diagnosticSend=createCdpSender({getSocket:socket,pending,nextId,timeoutForMethod:()=>1000});
   const value=await diagnosticSend('Runtime.evaluate',{expression,returnByValue:true,timeout:1000},getSession());
   return value.result?.value;
  },
  cleanup(){return cleanupTask??=(async()=>{
   const failures=[];
   const step=async(label,ms,task)=>{try{await boundedStep(task,ms,label);}catch(error){failures.push(error);}};
   clearTimeout(getWatchdog());
   if(transport?.isOpen())await step('Browser close',1200,()=>createCdpSender({getSocket:socket,pending,nextId,timeoutForMethod:()=>1000})('Browser.close'));
   await step('Owned Chrome retirement',4500,retireOwned);
   startup?.dispose();
   try{getSocket()?.close();}catch{}
   rejectCdpPending(pending,'Browser closed');transport?.dispose();
   await step('Memory observer stop',2000,async()=>{const memory=getMemory();if(memory?.running)await memory.stop();});
   await step('Asset server close',1000,async()=>{const server=getServer();if(server){server.closeAllConnections();if(server.listening)await new Promise((yes,no)=>server.close(e=>e?no(e):yes()));}});
   await step('Owned profile removal',3000,async()=>{
    const path=resolve(profile),prefix=resolve(tmpdir())+sep;
    if(!path.startsWith(prefix)||!/^prime-(browser|progress)-[^/\\]+$/.test(path.slice(prefix.length)))throw Error('Owned Chrome profile required');
    await rm(path,{recursive:true,force:true,maxRetries:5,retryDelay:100});
   });
   if(failures.length){
    const cleanupFailure=new AggregateError(failures,'Chrome CI cleanup failed');
    if(primaryFailure){primaryFailure.cleanupErrors=failures;console.error('Chrome CI cleanup failures: '+failures.map(e=>e.message).join('; '));}
    else throw cleanupFailure;
   }
  })();}
 };
}

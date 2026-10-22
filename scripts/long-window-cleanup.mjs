// SPDX-License-Identifier: AGPL-3.0-only
// Only the detached process group created by this harness is addressed.
export function createChromeRetirement(getChrome,{platform=process.platform,kill=process.kill.bind(process),now=()=>performance.now(),wait=ms=>new Promise(r=>setTimeout(r,ms)),beforeClose=async()=>{}}={}){
 let task;
 return ()=>task??=(async()=>{
  const chrome=getChrome();if(!chrome)return;
  if(!Number.isSafeInteger(chrome.pid)||chrome.pid<=0)throw Error('Owned Chrome PID required');
  try{await beforeClose();}catch{}
  if(platform==='linux'){
   const signal=s=>{try{kill(-chrome.pid,s);return true;}catch(error){if(error.code==='ESRCH')return false;throw error;}};
   if(!signal('SIGTERM'))return;
   const gone=async()=>{const start=now();while(signal(0)&&now()-start<2000)await wait(25);return !signal(0);};
   if(await gone())return;
   signal('SIGKILL');if(!await gone())throw Error('Owned Chrome group did not retire');
  }else{
   chrome.kill();const start=now();while(chrome.exitCode===null&&now()-start<2000)await wait(25);
   if(chrome.exitCode===null)chrome.kill('SIGKILL');
  }
 })();
}
export async function cleanupLongHarness({retireChrome,clearWatchdog,stopMemory,closeTransport}){
 try{await retireChrome();}
 finally{clearWatchdog();try{await stopMemory();}finally{await closeTransport();}}
}

// SPDX-License-Identifier: AGPL-3.0-only
// Real Chrome regression: remove only its stderr banner from the observer input.
// This proves readiness does not depend on logging; port and live endpoint checks
// are unchanged. No engine, Worker, oracle or external navigation is involved.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {PassThrough} from 'node:stream';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {observeChromeStartup,openChromeTransport} from './chrome-startup.mjs';
import {createChromeRetirement} from './long-window-cleanup.mjs';
const profile=await mkdtemp(join(tmpdir(),'prime-startup-regression-'));
let chrome,observer,socket;
const retire=createChromeRetirement(()=>chrome);
try{
 chrome=spawn(process.env.CHROME_BIN??'google-chrome',['--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-background-networking','--no-first-run','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{detached:true,stdio:['ignore','ignore','pipe'],windowsHide:true});
 const filtered=new PassThrough();let remainder='',removed=0;
 chrome.stderr.on('data',chunk=>{
  remainder=(remainder+chunk.toString()).slice(-10000);
  for(;;){const end=remainder.indexOf('\n');if(end<0)break;const line=remainder.slice(0,end+1);remainder=remainder.slice(end+1);if(line.includes('DevTools listening on'))removed++;else filtered.write(line);}
 });
 const owned={
  get exitCode(){return chrome.exitCode;},get signalCode(){return chrome.signalCode;},
  on:chrome.on.bind(chrome),removeListener:chrome.removeListener.bind(chrome),stderr:filtered
 };
 observer=observeChromeStartup(owned,profile);
 const url=await observer.ready;
 socket=new WebSocket(url);await openChromeTransport(socket,{timeoutMs:Math.max(0,30000-observer.diagnostics().elapsedMs)});
 const version=await new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(Error('Browser version timeout')),5000);
  socket.addEventListener('message',({data})=>{const m=JSON.parse(String(data));if(m.id===1){clearTimeout(timer);if(m.error)reject(Error(m.error.message));else resolve(m.result);}});
  socket.send(JSON.stringify({id:1,method:'Browser.getVersion'}));
 });
 assert.equal(observer.diagnostics().bannerSeen,false);
 assert.match(version.product,/Chrome/);
 const receipt={kind:'real-chrome-no-stderr-banner',node:process.version,bannerLinesRemoved:removed,startup:observer.diagnostics(),browser:version.product};
 const output=process.argv[2];if(output)await writeFile(output,JSON.stringify(receipt)+'\n',{flag:'wx'});
 console.log(JSON.stringify(receipt));
}finally{
 try{try{socket?.close();}finally{await retire();}}finally{observer?.dispose();await rm(profile,{recursive:true,force:true,maxRetries:5,retryDelay:100});}
}

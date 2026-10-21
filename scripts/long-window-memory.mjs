// SPDX-License-Identifier: AGPL-3.0-only
import {readFile} from 'node:fs/promises';
import {BrowserMemorySampler} from './browser-memory.mjs';
import {readWindowsMemory} from './windows-memory-receipt.mjs';
export class LongMemorySampler extends BrowserMemorySampler{
 constructor(pid,{read=readFile,list,windowsDirectory=process.env.PRIME_WINDOWS_MEMORY_DIRECTORY,windowsRead=readWindowsMemory,sampleLimit=5000,onFailure=async()=>{}}={}){super(pid,500,{read,...(list?{list}:{})});if(![5000,8000].includes(sampleLimit))throw Error("Named RAM sample limit");this.sampleLimit=sampleLimit;this.windowsDirectory=windowsDirectory;this.windowsRead=windowsRead;this.onFailure=onFailure;this.observerFailure=null;}
 async sample(){
  try{
   if(this.samples.length>=this.sampleLimit)throw Error('Long RAM sample retention cap');
   const row=await super.sample(),text=await this.read('/proc/meminfo','utf8');
   const match=/^MemAvailable:\s+(\d+)/m.exec(text);if(!match)throw Error('Host RAM unavailable');
   row.availableMiB=Number(match[1])/1024;if(!Number.isFinite(row.availableMiB)||row.availableMiB<0)throw Error('Invalid host RAM observation');
   if(row.availableMiB<4096)row.stopReason='wsl-available-memory';
   if(this.windowsDirectory){
    const {value:w,age}=await this.windowsRead(this.windowsDirectory);
    row.windowsAvailableMiB=w.availableMiB;row.windowsReceiptAt=w.checkedAt;row.windowsReceiptAgeMs=age;
    if(w.availableMiB<4096)row.stopReason='windows-available-memory';
   }
   return row;
  }catch(error){this.observerFailure={message:String(error.message??error).slice(0,200),code:typeof error.code==='string'?error.code:null};try{await this.onFailure(error);}catch(stopError){this.observerFailure.stopError=String(stopError.message??stopError).slice(0,200);throw new AggregateError([error,stopError],'Memory observation and retirement failed');}throw error;}
 }
 async stop(){this.running=false;try{await this.loop;}catch(error){this.error??=error;}}
 summary(mark=0){
  const rows=this.samples.slice(mark);if(!rows.length)throw Error('Missing browser RAM samples');
  const available=rows.filter(r=>Number.isFinite(r.availableMiB)),windows=rows.filter(r=>Number.isFinite(r.windowsAvailableMiB));
  return {samples:rows.length,first:rows[0],peakRssBytes:Math.max(...rows.map(r=>r.rssBytes)),peakPssBytes:Math.max(...rows.map(r=>r.pssBytes)),maxProcesses:Math.max(...rows.map(r=>r.processes)),intervalMs:500,sampleLimit:this.sampleLimit,minAvailableMiB:available.length?Math.min(...available.map(r=>r.availableMiB)):null,minWindowsAvailableMiB:windows.length?Math.min(...windows.map(r=>r.windowsAvailableMiB)):null,maxWindowsReceiptAgeMs:windows.length?Math.max(...windows.map(r=>r.windowsReceiptAgeMs)):null,observerFailure:this.observerFailure};
 }
}

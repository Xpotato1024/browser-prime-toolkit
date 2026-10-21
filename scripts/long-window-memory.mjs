// SPDX-License-Identifier: AGPL-3.0-only
import {readFile} from 'node:fs/promises';
import {BrowserMemorySampler} from './browser-memory.mjs';
export class LongMemorySampler extends BrowserMemorySampler{
 constructor(pid,{read=readFile,list,windowsPath=process.env.PRIME_WINDOWS_MEMORY_RECEIPT,onFailure=async()=>{}}={}){super(pid,500,{read,...(list?{list}:{})});this.windowsPath=windowsPath;this.onFailure=onFailure;}
 async sample(){
  try{
   if(this.samples.length>=5000)throw Error('Long RAM sample retention cap');
   const row=await super.sample(),text=await this.read('/proc/meminfo','utf8');
   const match=/^MemAvailable:\s+(\d+)/m.exec(text);if(!match)throw Error('Host RAM unavailable');
   row.availableMiB=Number(match[1])/1024;if(!Number.isFinite(row.availableMiB)||row.availableMiB<0)throw Error('Invalid host RAM observation');
   if(row.availableMiB<4096)row.stopReason='wsl-available-memory';
   const path=this.windowsPath;
   if(path){
    const w=JSON.parse(await this.read(path,'utf8')),age=Date.now()-Date.parse(w.checkedAt);
    if(w.host!=='LLM-01'||!Number.isFinite(w.availableMiB)||w.availableMiB<0||!Number.isFinite(age)||age<0||age>30000)throw Error('Fresh Windows memory monitor required');
    row.windowsAvailableMiB=w.availableMiB;row.windowsReceiptAt=w.checkedAt;row.windowsReceiptAgeMs=age;
    if(w.availableMiB<4096)row.stopReason='windows-available-memory';
   }
   return row;
  }catch(error){try{await this.onFailure(error);}catch{}throw error;}
 }
 summary(mark=0){
  const result=super.summary(mark),rows=this.samples.slice(mark),windows=rows.filter(r=>r.windowsAvailableMiB!==undefined);
  return {...result,intervalMs:500,sampleLimit:5000,minAvailableMiB:Math.min(...rows.map(r=>r.availableMiB)),minWindowsAvailableMiB:windows.length?Math.min(...windows.map(r=>r.windowsAvailableMiB)):null,maxWindowsReceiptAgeMs:windows.length?Math.max(...windows.map(r=>r.windowsReceiptAgeMs)):null};
 }
}

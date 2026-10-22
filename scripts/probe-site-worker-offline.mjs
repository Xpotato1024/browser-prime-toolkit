// SPDX-License-Identifier: AGPL-3.0-only
// App-independent diagnostic for a Playwright WebKit Windows offline/Blob issue.
import {createServer} from 'node:http';
import {writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
if(!process.env.PLAYWRIGHT_MODULE||!process.argv[2])throw Error('Set PLAYWRIGHT_MODULE and pass an output JSON path');
const {webkit}=await import(pathToFileURL(resolve(process.env.PLAYWRIGHT_MODULE)));
const server=createServer((req,res)=>{res.setHeader('Content-Security-Policy',"default-src 'none'; worker-src blob:; connect-src 'none'");res.end('<!doctype html><title>Worker probe</title>');});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await webkit.launch({headless:true,timeout:15000}),report={version:browser.version(),appCodeLoaded:false,probes:[]};
try{
 for(const offline of [false,true]){
  const context=await browser.newContext(),page=await context.newPage();
  await page.goto('http://127.0.0.1:'+server.address().port);await context.setOffline(offline);
  const outcome=await page.evaluate(async()=>{
   const url=URL.createObjectURL(new Blob(["self.onmessage=()=>self.postMessage('ok')"],{type:'text/javascript'}));
   const worker=new Worker(url);
   try{return await new Promise(resolve=>{
    const timer=setTimeout(()=>resolve('timeout'),1500);
    worker.onmessage=e=>{clearTimeout(timer);resolve(e.data);};
    worker.onerror=e=>{clearTimeout(timer);resolve('error: '+e.message);};worker.postMessage('ping');
   });}finally{worker.terminate();URL.revokeObjectURL(url);}
  });
  report.probes.push({offline,outcome});await context.close();
 }
}finally{await browser.close();server.close();await writeFile(resolve(process.argv[2]),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));}

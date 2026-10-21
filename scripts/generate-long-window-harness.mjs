// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
const read=p=>readFileSync(p,'utf8'),write=(p,s)=>{if(process.argv.includes('--check'))assert.equal(read(p),s,p);else writeFileSync(p,s);};
const rep=(s,a,b)=>{assert.equal(s.split(a).length,2,'Long harness anchor '+a.slice(0,100));return s.replace(a,b);};
let h=read('bench/optimized-entry.js');
h=rep(h,"from '../src/optimized/index.js'","from '../src/long-window/index.js'");
h=rep(h,"import {optimizedWorkerSource as graphWorkerSource} from '../src/optimized/worker-source.js';","import {longWorkerSource as graphWorkerSource} from '../src/long-window/worker-source.js';");
h=rep(h,"from '../src/graph-multicore/policy.js'","from '../src/long-window/policy.js'");
h=rep(h,"['optimized']","['long']");
h=h.replaceAll("['one-drop','two-drop','three-drop','four-drop','five-drop','six-drop']","['one-drop','two-drop','three-drop','four-drop','five-drop']");
h=h.replaceAll('graphSnapshots.length>=256','graphSnapshots.length>=512').replaceAll('graphColumns.length>=256','graphColumns.length>=512');
h=rep(h,'timeBudgetMs:600001','timeBudgetMs:1800001');
h=rep(h,"assert(cancelAfterMs===null||cancelAfterMs===120000&&budgetMs===300000,'Fixed cancel control');","assert(cancelAfterMs===null||Number.isInteger(cancelAfterMs)&&cancelAfterMs>=1&&cancelAfterMs<budgetMs&&budgetMs<=1800000,'Finite cancel control');");
h=rep(h,'[128,256,384,512,768].includes(n)','n===512');
const extra=`
tests.splice(tests.length-2,0,
 ['native-preflight-budget-retired',async()=>{const transform=source=>source.replace("if(d.type==='extract'){","if(d.type==='extract'){api.codex_la_lower_limits(1,208*1048576);");const r=await runRusqsieve(FULL_CASES.find(c=>c.id==='full-balanced-40-1').input,{...settings(),timeBudgetMs:30000,createWorker:(i,cap)=>createWorker(transform(workerSourceForCap(cap)))});assert(r.reason==='native-memory-budget'&&r.extractionStatus===5&&r.nativeQuota.preflightRefused===1&&r.allWorkersDisposed&&live===0,'Actual preflight quota');}],
 ['native-abort-budget-retired',async()=>{const transform=source=>source.replace('api.qs_coord_extract(session)','(api.codex_la_abort_probe(),0)');const r=await runRusqsieve(FULL_CASES.find(c=>c.id==='full-balanced-40-1').input,{...settings(),timeBudgetMs:30000,createWorker:(i,cap)=>createWorker(transform(workerSourceForCap(cap)))});assert(r.reason==='native-memory-budget'&&r.nativeQuota.active===1&&r.nativeQuota.refusals===1&&r.fatal.memory.allocationFailures===1&&r.allWorkersDisposed&&live===0,'Actual 64-byte abort and scalar retirement');}],
 ['unknown-extract-trap-retired',async()=>{const transform=source=>source.replace("if(d.type==='extract'){","if(d.type==='extract'){throw new WebAssembly.RuntimeError('unknown-extract-probe');");const r=await runRusqsieve(FULL_CASES.find(c=>c.id==='full-balanced-40-1').input,{...settings(),timeBudgetMs:30000,createWorker:(i,cap)=>createWorker(transform(workerSourceForCap(cap)))});assert(r.reason==='fatal-unknown'&&r.allWorkersDisposed&&live===0,'Unknown extract trap');}],
 ...[['missing','nativeQuota'],['null','memory:null,nativeQuota'],['zero','memory:{...stats,allocationFailures:0},nativeQuota']].map(([name,replacement])=>['quota-evidence-'+name+'-retired',async()=>{const transform=source=>source.replace('api.qs_coord_extract(session)','(api.codex_la_abort_probe(),0)').replace('memory:stats,nativeQuota',replacement);const r=await runRusqsieve(FULL_CASES.find(c=>c.id==='full-balanced-40-1').input,{...settings(),timeBudgetMs:30000,createWorker:(i,cap)=>createWorker(transform(workerSourceForCap(cap)))});assert(r.reason==='protocol-failure'&&r.allWorkersDisposed&&live===0,'Missing allocation evidence');}])
);
`;
h=rep(h,'globalThis.evaluationHarness=',extra+'globalThis.evaluationHarness=');
write('bench/long-window.js',h);
write('bench/long-window.html',read('bench/optimized-entry.html').replace('./optimized-entry.js','./long-window.js'));
let route=read('scripts/optimized-entry-asset-route.mjs');
route=rep(route,'const assets=new Set([','const assets=new Set(["bench/long-window.html","bench/long-window.js","src/long-window/index.js","src/long-window/runner.js","src/long-window/policy.js","src/long-window/budget.js","src/long-window/worker-source.js","src/long-window/wasm-long-256.js",');
route=route.replace('entryAsset','longAsset');write('scripts/long-window-asset-route.mjs',route);
let v=read('scripts/verify-optimized-entry.mjs');
v=rep(v,"from'../src/graph-multicore/policy.js'","from'../src/long-window/policy.js'");
v=rep(v,"import { SustainedMemorySampler as BrowserMemorySampler } from './sustained-memory.mjs';","import { LongMemorySampler as BrowserMemorySampler } from './long-window-memory.mjs';");
v=rep(v,"import {entryAsset as coordinatorAsset} from './optimized-entry-asset-route.mjs';","import {longAsset as coordinatorAsset} from './long-window-asset-route.mjs';");
v=rep(v,"arg('--slots','4')","arg('--slots','8')");
v=rep(v,"arg('--graph','optimized')","arg('--graph','long')");
v=rep(v,"['optimized']","['long']");
v=v.replaceAll("['one-drop','two-drop','three-drop','four-drop','five-drop','six-drop']","['one-drop','two-drop','three-drop','four-drop','five-drop']");
v=rep(v,"arg('--engine','four-drop')","arg('--engine','five-drop')");
v=rep(v,"variant==='six-drop'?'768':'512'","'512'");
v=rep(v,'[128,256,384,512,768].includes(selectedMemory)','selectedMemory===512');
v=rep(v,'fixedFamilies<=128','fixedFamilies<=4096');
v=rep(v,'if(!caseId)assert.equal(budgetMs,30000);','if(!caseId)assert.equal(budgetMs,30000);if(budgetMs>600000)assert.ok(process.env.PRIME_WINDOWS_MEMORY_DIRECTORY,\"Live Windows monitor required\");');
v=rep(v,'[3000,30000,60000,120000,180000,300000,600000].includes(budgetMs)','[3000,30000,60000,120000,180000,300000,600000,1800000].includes(budgetMs)');
v=rep(v,"caseId==='RSA-100'&&budgetMs===300000&&cancelAfterMs===120000","caseId==='RSA-100'&&Number.isInteger(cancelAfterMs)&&cancelAfterMs>=1&&cancelAfterMs<budgetMs");
v=v.replaceAll('/bench/optimized-entry.html','/bench/long-window.html');
v=rep(v,'let hostMemoryStopped=false;memory.sample=',`let hostMemoryStopped=false;memory.onFailure=async()=>{if(nodeMeasurementStart!==null)await stopForMemoryGuard({requestStop:()=>evaluate('evaluationHarness.stop("memory-observer-failed")'),retireChrome});else chrome?.kill();};memory.sample=`);
v=rep(v,'row.pssBytes>=1536*1048576','(row.pssBytes>=1536*1048576||row.stopReason)');
v=rep(v,`await evaluate('evaluationHarness.stop("chrome-pss-soft-stop")');`,`await stopForMemoryGuard({requestStop:()=>evaluate('evaluationHarness.stop('+JSON.stringify(row.stopReason??"chrome-pss-soft-stop")+')'),retireChrome});`);
v=rep(v,'nodeMeasurementStart=performance.now();','const preflightRam=await memory.sample();assert.ok(!preflightRam.stopReason,"Available RAM before calculation");\n  nodeMeasurementStart=performance.now();');
v=rep(v,'for(let i=0;i<16;i++)','for(let i=0;i<22;i++)');
v=rep(v,'assert.equal(checks.tests.length,16)','assert.equal(checks.tests.length,22)');
v=rep(v,'value.peakOwners<=6','value.peakOwners<=5');
v=rep(v,'value.maximumWasmBytes<=576*1048576','value.maximumWasmBytes<=512*1048576');
v=rep(v,'ownership.maxLive<=6','ownership.maxLive<=5');
v=rep(v,'ownership.maxLiveSources<=6','ownership.maxLiveSources<=5');
v=rep(v,'totalWasmBytes:576*1048576,maxOwners:6','totalWasmBytes:512*1048576,maxOwners:5');
v=rep(v,'coldReadyMs,initialAssets','coldReadyMs,preflightRam,initialAssets');
v=rep(v,'receipt.graphSourceFiles={};',`receipt.graphSourceFiles={};
  for(const p of ["scripts/verify-long-window.mjs","scripts/generate-long-window-harness.mjs","scripts/generate-long-window.mjs","scripts/long-window-memory.mjs","scripts/windows-memory-receipt.mjs","scripts/long-window-cleanup.mjs","scripts/long-window-memory-stop.mjs","scripts/watch-windows-memory.ps1","scripts/long-window-asset-route.mjs","src/long-window/policy.js","src/long-window/budget.js","src/long-window/worker-source.js","src/long-window/runner.js","scripts/build-long-window.mjs","native/long-window/quota.rs","native/long-window/patch-source.mjs","native/long-window/memory-contract.mjs","native/long-window/build-long-256.json","docs/contracts/long-window.md"])receipt.graphSourceFiles[p]=createHash("sha256").update(await readFile(join(root,p))).digest("hex");`);
v=rep(v,"receipt.graphProfileSchema=graphVariant==='optimized'?2:1","receipt.graphProfileSchema=2");
v=rep(v,'pssBytes:s.pssBytes,processes:s.processes','pssBytes:s.pssBytes,processes:s.processes,availableMiB:s.availableMiB,windowsAvailableMiB:s.windowsAvailableMiB,windowsReceiptAt:s.windowsReceiptAt');
v=rep(v,"Buffer.byteLength(text)<=1048576,'Bounded evidence <=1MiB'","Buffer.byteLength(text)<=16777216,'Bounded long evidence <=16MiB'");
v=rep(v,"import { LongMemorySampler as BrowserMemorySampler } from './long-window-memory.mjs';","import { LongMemorySampler as BrowserMemorySampler } from './long-window-memory.mjs';\nimport{createChromeRetirement,cleanupLongHarness}from'./long-window-cleanup.mjs';\nimport{stopForMemoryGuard}from'./long-window-memory-stop.mjs';");
v=rep(v,'let chrome, socket, server, pageSession, memory, sequence = 0;',`let chrome, socket, server, pageSession, memory, hardTimer, sequence = 0;
const retireChrome=createChromeRetirement(()=>chrome,{beforeClose:async()=>{if(socket?.readyState===WebSocket.OPEN)try{await send('Browser.close');}catch{}}});`);
v=rep(v,"{ stdio: ['ignore', 'ignore', 'pipe'], env: process.env, windowsHide: true }","{ detached:true, stdio: ['ignore', 'ignore', 'pipe'], env: process.env, windowsHide: true }");
v=rep(v,'  memory = new BrowserMemorySampler(chrome.pid);',`  hardTimer=setTimeout(()=>{const error=Error('Long harness total watchdog');for(const call of pending.values()){clearTimeout(call.timer);call.reject(error);}pending.clear();void retireChrome().catch(error=>fatal.push(error.message));socket?.close();},budgetMs+90000);
  memory = new BrowserMemorySampler(chrome.pid);`);
v=rep(v,'else chrome?.kill();','else await retireChrome();');
v=rep(v,'  let diagnostic;',`  try{
    let sampledRam=null;try{sampledRam=memory?.summary();}catch{}
    const failure={kind:'harness-failure',measuredHead:process.env.PRIME_MEASURED_HEAD??null,failedAt:new Date().toISOString(),error:String(error.stack??error).slice(0,4000),sampledRam,ramTimeline:memory?.samples??[]};
    const text=JSON.stringify(failure)+'\\n';assert.ok(Buffer.byteLength(text)<=16777216);await writeFile(output+'.failed.json',text,{flag:'wx'});
  }catch(writeError){console.error('Failure receipt write: '+String(writeError));}
  let diagnostic;`);
const finalStart=v.lastIndexOf('} finally {');
assert.ok(v.slice(finalStart).startsWith('} finally {\n  if (memory?.running) await memory.stop();'));
v=v.slice(0,finalStart)+`} finally {
  await cleanupLongHarness({
    retireChrome,clearWatchdog:()=>clearTimeout(hardTimer),
    stopMemory:async()=>{if(memory?.running)await memory.stop();},
    closeTransport:async()=>{
      if(socket?.readyState===WebSocket.OPEN)socket.close();
      for(const call of pending.values()){clearTimeout(call.timer);call.reject(Error('Browser closed'));}
      pending.clear();
      if(chrome&&chrome.exitCode===null)await new Promise(resolveExit=>{const timer=setTimeout(resolveExit,2000);chrome.once('exit',()=>{clearTimeout(timer);resolveExit();});});
      if(server){server.closeAllConnections();await new Promise(resolveClose=>server.close(resolveClose));}
      if(temporary.startsWith(join(tmpdir(),'prime-browser-')))await rm(temporary,{recursive:true,force:true,maxRetries:5,retryDelay:100});
    }
  });
}
`;
write('scripts/verify-long-window.mjs',v);
console.log('Derived offline long harness, 22 contracts and bounded host memory monitoring');

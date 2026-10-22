// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Xpotato.net / Xpotato1024
import assert from 'node:assert/strict';
import{selectResourcePlan}from'../src/wide-window/policy.js';
import { createServer } from 'node:http';
import { readFile, writeFile, access, mkdtemp, rm } from 'node:fs/promises';
import { resolve, join, extname, sep } from 'node:path';
import { tmpdir, cpus, totalmem, platform, release } from 'node:os';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { WideMemorySampler as BrowserMemorySampler } from './wide-window-memory.mjs';
import{createChromeRetirement,cleanupLongHarness}from'./long-window-cleanup.mjs';
import{stopForMemoryGuard}from'./long-window-memory-stop.mjs';
import {resieveAsset as coordinatorAsset} from './score-unroll-asset-route.mjs';
import {validateStreamRecord} from './graph-multicore-proof.mjs';
import {knownDetachedSetup,retireSetupCalls} from './resource-ui-cdp-lifecycle.mjs';

const root = resolve(import.meta.dirname, '..');
const arg=(key,fallback)=>process.argv.includes(key)?process.argv[process.argv.indexOf(key)+1]:fallback;
const output=resolve(arg('--out',join(tmpdir(),'rsa-profile-receipt.json')));
try{await access(output);throw Error('Refusing to overwrite '+output);}catch(e){if(e.code!=='ENOENT')throw e;}
const slots=Number(arg('--slots','8'));assert.ok([4,8].includes(slots));const transportBytes=slots*8388608;
const graphVariant=arg('--graph','baseline');assert.ok(['baseline','unroll4'].includes(graphVariant));
const coordinator=arg('--coordinator','combined');assert.ok(['combined','dedicated'].includes(coordinator));
const profile='baseline',scheduler=arg('--scheduler','credit1');assert.ok(['credit1'].includes(scheduler));
const fixedFamilies=arg('--fixed-families',null)===null?null:Number(arg('--fixed-families'));assert.ok(fixedFamilies===null||Number.isInteger(fixedFamilies)&&fixedFamilies>=4&&fixedFamilies<=4096);
const cancelAfterMs=arg('--cancel-after-ms',null)===null?null:Number(arg('--cancel-after-ms'));
const caseId=arg('--case',null),seed=Number(arg('--seed','1')),mode=caseId?'coordinator-measurement':'coordinator-contracts',variant=arg('--engine','one-drop'),group='rsa',budgetMs=Number(arg('--budget-ms','30000'));
assert.equal(variant,'one-drop');
const selectedMemory=Number(arg('--memory-mib','1536'));assert.ok(selectedMemory===1536);
assert.ok([3000,30000,60000,90000].includes(budgetMs));if(caseId==='RSA-100'&&cancelAfterMs===null){assert.equal(fixedFamilies,4);assert.equal(budgetMs,90000);}
if(!caseId)assert.equal(budgetMs,30000);if(budgetMs>600000)assert.ok(process.env.PRIME_WINDOWS_MEMORY_DIRECTORY,"Live Windows monitor required");
assert.ok(cancelAfterMs===null||caseId==='RSA-100'&&Number.isInteger(cancelAfterMs)&&cancelAfterMs>=1&&cancelAfterMs<budgetMs);
assert.ok(Number.isSafeInteger(seed)&&seed>=1&&seed<=4294967295);
const catalog=[...JSON.parse(await readFile(join(root,'bench/staged-rsa/catalog.json'),'utf8')),...JSON.parse(await readFile(join(root,'bench/staged-practical/catalog.json'),'utf8')).cases,...JSON.parse(await readFile(join(root,'bench/staged-full/catalog.json'),'utf8')).cases];
const temporary = await mkdtemp(join(tmpdir(), 'prime-browser-'));
const http = [], requests = [], badEvents = [], localBlobs = [], sessions = new Set(), fatal = [];
const startupTrace=[];let startupTraceOpen=true,chromeStderr='',nodeMeasurementStart=null;
const setupFailures=[],setupTasks=[],detached=new Set();
let chrome, socket, server, pageSession, memory, hardTimer, sequence = 0;
const retireChrome=createChromeRetirement(()=>chrome,{beforeClose:async()=>{if(socket?.readyState===WebSocket.OPEN)try{await send('Browser.close');}catch{}}});
const pending = new Map(), attached = [];
process.once('SIGTERM',()=>{const error=Error('Owned profile trial timeout');for(const p of pending.values()){clearTimeout(p.timer);p.reject(error);}pending.clear();socket?.close();void retireChrome().catch(e=>fatal.push(e.message));setTimeout(()=>{try{if(chrome&&Number.isSafeInteger(chrome.pid)&&chrome.pid>0)process.kill(-chrome.pid,'SIGKILL');}catch(e){if(e.code!=='ESRCH')fatal.push(e.message);}process.exit(143);},8000).unref();});
const send = (method, params = {}, sessionId) => new Promise((resolveCall, rejectCall) => {
  const id = ++sequence;
  const timer = setTimeout(() => { pending.delete(id); rejectCall(Error('CDP timeout: ' + method)); }, method==='Page.navigate'?30000:method === 'Runtime.evaluate' ? budgetMs+20000 : 5000);
  pending.set(id, { sessionId, method, resolve: resolveCall, reject: rejectCall, timer });
  socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
});
const evaluate = async expression => {
  const value = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, timeout: budgetMs+15000 }, pageSession);
  if (value.exceptionDetails) throw Error(JSON.stringify(value.exceptionDetails));
  return value.result.value;
};
function handoffMetrics(value){
 const pending=new Map(),packets=[];
 for(const e of value.events){
  if(e.type==='batch')pending.set(e.first,{first:e.first,count:e.count,owner:e.owner,returnedMs:e.elapsedMs});
  if(e.type==='submitted')for(const[first,p]of pending)if(first+p.count<=e.families){packets.push({...p,acceptedMs:e.elapsedMs,waitMs:e.elapsedMs-p.returnedMs});pending.delete(first);}
 }
 const a=value.ownerActivity;assert.ok(a&&a.owners.length===value.workers);
 for(const row of a.owners){const states=Object.values(row.states);assert.ok(states.every(n=>Number.isFinite(n)&&n>=0));assert.ok(Math.abs(states.reduce((x,y)=>x+y,0)-a.collectionWindowMs)<0.01);}
 return{globalCapacityIdleMs:a.owners.reduce((n,r)=>n+r.states.globalCapacityIdleMs,0),packets,returnedNotAccepted:[...pending.values()],maxAcceptedWaitMs:Math.max(0,...packets.map(p=>p.waitMs)),blockedIdleMs:a.owners.reduce((n,r)=>n+r.states.blockedIdleMs,0),assignedTimeIsCpuUtilization:false,deliveredSieveTimesAreLowerBounds:value.activeAtStop.some(o=>o.command==='job')};
}
async function enableNetwork(session) {
  sessions.add(session);
  await send('Network.enable', {}, session);
  await send('Network.setCacheDisabled', { cacheDisabled: true }, session);
  await send('Network.setBypassServiceWorker', { bypass: true }, session);
  await send('Runtime.enable', {}, session);

}
async function networkOffline(value) {
  const offline = value;
  await send('Network.emulateNetworkConditions', {
    offline, latency: 0, downloadThroughput: offline ? 0 : -1, uploadThroughput: offline ? 0 : -1 }, pageSession);
}

try {
  const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript' };
  server = createServer(async (req, res) => {
    http.push(req.url);
    const trace={url:req.url,startedAtMs:performance.now()};if(startupTraceOpen)startupTrace.push(trace);res.once('finish',()=>{trace.status=res.statusCode;trace.finishedAtMs=performance.now();});
    try {
      const url = new URL(req.url, 'http://localhost');
      if (url.pathname === '/probe') { res.writeHead(200, { 'Content-Type': 'text/plain' }); res.end('detector probe'); return; }
      const relative=coordinatorAsset(url.pathname);if(relative===null)throw Error('Not a runtime asset');
      const path = resolve(root, relative);
      if (!path.startsWith(root + sep)) throw Error('Path escape');
      res.writeHead(200, { 'Content-Type': mime[extname(path)] ?? 'application/octet-stream', 'Cache-Control': 'no-store',
        'Content-Security-Policy': "default-src 'none'; script-src 'self' 'wasm-unsafe-eval'; worker-src blob:; connect-src 'none'; img-src data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'" });
      const body=await readFile(path);trace.bytes=body.length;res.end(body);
    } catch (error) { trace.error=error.message;res.writeHead(404); res.end(); }
  });
  await new Promise(resolveListen => server.listen(0, '127.0.0.1', resolveListen));
  const port = server.address().port;
  const origin = 'http://127.0.0.1:' + port;
  const assetBoundarySelfTest=[];
  for(const path of ['/bench/staged-full/%6fracle.json','/bench/staged-full/%6danifest.json','/bench/staged-practical/%6fracle.json','/bench/staged-practical/%256fracle.json','/bench/staged-practical/%6danifest.json','/src/%2e%2e/bench/staged-practical/oracle.json']){
    const response=await fetch(origin+path);assert.equal(response.status,404);assert.equal(await response.text(),'');assetBoundarySelfTest.push({path,status:404});
  }
  chrome = spawn(process.env.CHROME_BIN || 'google-chrome', ['--headless=new', '--no-sandbox', '--disable-dev-shm-usage',
    '--disable-background-networking', '--disable-component-update', '--disable-default-apps', '--no-first-run',
    '--disable-background-timer-throttling', '--remote-debugging-port=0', '--user-data-dir=' + temporary, 'about:blank'],
    { detached:true, stdio: ['ignore', 'ignore', 'pipe'], env: process.env, windowsHide: true });
  hardTimer=setTimeout(()=>{const error=Error('Long harness total watchdog');for(const call of pending.values()){clearTimeout(call.timer);call.reject(error);}pending.clear();void retireChrome().catch(error=>fatal.push(error.message));socket?.close();},budgetMs+20000);
  memory = new BrowserMemorySampler(chrome.pid);const originalSample=memory.sample.bind(memory);let hostMemoryStopped=false;memory.onFailure=async()=>{if(nodeMeasurementStart!==null)await stopForMemoryGuard({requestStop:()=>evaluate('evaluationHarness.stop("memory-observer-failed")'),retireChrome});else await retireChrome();};memory.sample=async()=>{const row=await originalSample();if(nodeMeasurementStart!==null&&(row.pssBytes>=1536*1048576||row.stopReason)&&!hostMemoryStopped){hostMemoryStopped=true;await stopForMemoryGuard({requestStop:()=>evaluate('evaluationHarness.stop('+JSON.stringify(row.stopReason??"chrome-pss-soft-stop")+')'),retireChrome});}return row;}; await memory.start();
  const debuggingUrl = await new Promise((resolveUrl, rejectUrl) => {
    let stderr = '';
    const timer = setTimeout(() => rejectUrl(Error('Chrome startup timed out: ' + stderr.slice(-1000))), 30000);
    chrome.once('error', error => { clearTimeout(timer); rejectUrl(error); });
    chrome.once('exit', code => { clearTimeout(timer); rejectUrl(Error('Chrome exited: ' + code + ' ' + stderr.slice(-1000))); });
    chrome.stderr.on('data', data => {
      stderr = (stderr + data.toString()).slice(-10000);chromeStderr=stderr;
      const match = /DevTools listening on (ws:\/\/\S+)/.exec(stderr);
      if (match) { clearTimeout(timer); resolveUrl(match[1]); }
    });
  });
  socket = new WebSocket(debuggingUrl);
  await new Promise((resolveOpen, rejectOpen) => { socket.addEventListener('open', resolveOpen, { once: true });
    socket.addEventListener('error', rejectOpen, { once: true }); });
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(String(data));
    if (message.id) {
      const call = pending.get(message.id);
      if (call) { clearTimeout(call.timer); pending.delete(message.id);
        if (message.error) call.reject(Error(call.method + ': ' + message.error.message)); else call.resolve(message.result); }
      return;
    }
    if (message.method === 'Target.attachedToTarget') {
      const { sessionId, targetInfo } = message.params;
      attached.push({sessionId,type:targetInfo.type,url:targetInfo.url});
      if (targetInfo.type === 'worker') {
        setupTasks.push(enableNetwork(sessionId).then(() => send('Runtime.runIfWaitingForDebugger', {}, sessionId)).catch(error => setupFailures.push({sessionId,error:error.message})));
      }
    }
    if (message.method === 'Target.detachedFromTarget'){sessions.delete(message.params.sessionId);detached.add(message.params.sessionId);retireSetupCalls(pending,message.params.sessionId);}
    if (message.method === 'Network.requestWillBeSent') {
      const item = { url: message.params.request.url, sessionId: message.sessionId };
      if (item.url.startsWith('blob:') || item.url.startsWith('data:')) localBlobs.push(item);
      else requests.push(item);
    }
    if (['Network.loadingFailed', 'Network.webSocketCreated', 'Network.webTransportCreated', 'Runtime.exceptionThrown',
      'Page.windowOpen', 'Page.frameRequestedNavigation', 'Page.navigatedWithinDocument'].includes(message.method)) {
      badEvents.push({ method: message.method, details: message.params, sessionId: message.sessionId });
    }
  });
  const browser = await send('Browser.getVersion');
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  ({ sessionId: pageSession } = await send('Target.attachToTarget', { targetId, flatten: true }));
  await enableNetwork(pageSession);
  await send('Page.enable', {}, pageSession);
  await send('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: true, flatten: true }, pageSession);
  const coldStarted = performance.now();startupTrace.push({event:'navigate-start',atMs:coldStarted});
  await send('Page.navigate', { url: origin + '/bench/score-unroll.html' }, pageSession);
  startupTrace.push({event:'navigate-returned',atMs:performance.now()});
  for (let i = 0; i < 200; i++) {
    if (await evaluate('!!globalThis.evaluationHarness')) break;
    await new Promise(resolveWait => setTimeout(resolveWait, 25));
  }
  await evaluate('evaluationHarness.selectScheduler('+JSON.stringify(scheduler)+')');
  await evaluate('evaluationHarness.selectProfile('+JSON.stringify(profile)+')');
  await evaluate('evaluationHarness.selectMemory('+selectedMemory+')');
  await evaluate('evaluationHarness.selectSlots('+slots+')');
  await evaluate('evaluationHarness.selectGraph('+JSON.stringify(graphVariant)+')');
  await evaluate('evaluationHarness.selectEngine('+JSON.stringify(variant)+')');
  await evaluate('evaluationHarness.selectCoordinator('+JSON.stringify(coordinator)+')');
  await evaluate('evaluationHarness.ownership()');
  const coldReadyMs = performance.now() - coldStarted;
  const browserDevice = await evaluate('({userAgent:navigator.userAgent,cores:navigator.hardwareConcurrency,memoryGiB:navigator.deviceMemory})');
  assert.ok(requests.length > 3, 'Actual local source assets loaded');
  assert.ok(requests.every(r => r.url.startsWith(origin + '/')), 'Only same-origin initial assets');
  assert.equal(fatal.length, 0);
  assert.ok(requests.every(r=>!r.url.includes('oracle')&&!r.url.includes('manifest')),'No factor oracle delivered');
  const initialAssets = [];
  for (const path of new Set(requests.map(r=>new URL(r.url).pathname))) {
    const bytes = await readFile(join(root,path.slice(1)));
    initialAssets.push({path,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
  }
  startupTraceOpen=false;
  requests.length = 0; http.length = 0; badEvents.length = 0; localBlobs.length = 0;
  const records=[];
  // Stop the asset server before all timed calculations; Blob sources are already local.
  await networkOffline(true);server.closeAllConnections();
  await new Promise(r=>server.close(r));
  const preflightRam=await memory.sample();assert.ok(!preflightRam.stopReason,"Available RAM before calculation");
  nodeMeasurementStart=performance.now();
  if(caseId){
    const c=catalog.find(c=>c.id===caseId);assert.ok(c,'Official case exists');
    const record=await evaluate('evaluationHarness.measure('+JSON.stringify({id:caseId,seed,budgetMs,fixedFamilies,cancelAfterMs})+')');
    assert.equal(record.input,c.input);assert.equal(record.bits,c.bits);assert.equal(record.digits,c.digits);assert.equal(record.knownFactorsUsed,false);
    const value=record.outcome;record.handoff=handoffMetrics(value);validateStreamRecord(record);
    const expectedOwners=({'one-drop':1,'two-drop':2,'three-drop':3,'four-drop':4,'five-drop':5,'six-drop':6})[variant];assert.equal(value.workers,expectedOwners);assert.deepEqual(value.resourcePlan,selectResourcePlan({mode:'manual',workers:expectedOwners,memoryMiB:selectedMemory,outstandingSlots:slots,timeBudgetMs:budgetMs}));
    assert.equal(value.coordinatorCompute,coordinator!=='dedicated');assert.equal(value.scheduler,scheduler);assert.equal(value.fixedFamilies,fixedFamilies);assert.ok(value.auditBytes<=8388608);assert.ok(value.creditState.peakOutstanding<=slots);assert.ok(value.creditState.peakReservedBytes<=transportBytes);assert.equal(value.input,c.input);assert.equal(value.allWorkersDisposed,true);assert.equal(value.allWorkerSourcesReleased,true);
    assert.ok(value.peakOwners<=5);assert.ok(value.maximumWasmBytes<=1280*1048576);assert.ok(value.peakTransportBytes<=transportBytes);
    if(value.factors.length){let product=BigInt(value.remaining);for(const f of value.factors)product*=BigInt(f.value);assert.equal(product,BigInt(c.input));}
    if(['factorized','prime','probable'].includes(value.kind))assert.ok(value.requestWallMs<budgetMs);
    if(caseId.startsWith('balanced-')||caseId.startsWith('full-balanced-')){
      const oracle=JSON.parse(await readFile(join(root,caseId?.startsWith('full-balanced-')?'bench/staged-full/oracle.json':'bench/staged-practical/oracle.json'),'utf8')).cases.find(x=>x.id===caseId);
      assert.ok(oracle);assert.equal((BigInt(oracle.p)*BigInt(oracle.q)).toString(),c.input);
      const expected=[oracle.p,oracle.q].sort((a,b)=>BigInt(a)<BigInt(b)?-1:1);
      if(value.factors?.length)assert.ok(value.factors.every(f=>expected.includes(f.value)));
      if(['factorized','probable'].includes(value.kind)&&value.remaining==='1')assert.deepEqual(value.factors.map(f=>f.value),expected);
      record.oracleCheckedAfterRetirement=true;
    }
    records.push(record);console.log(JSON.stringify({id:caseId,seed,kind:value.kind,reason:value.reason,requestWallMs:value.requestWallMs}));
  }else{
    const checks={tests:[],performanceMeasurement:false};for(let i=0;i<24;i++){const part=await evaluate('evaluationHarness.run('+i+')');checks.tests.push(...part.tests);console.log(JSON.stringify(part));}console.log(JSON.stringify(checks));assert.equal(checks.tests.length,24);assert.ok(checks.tests.every(t=>t.pass),JSON.stringify(checks.tests.filter(t=>!t.pass)));
    assert.equal(checks.performanceMeasurement,false);records.push(checks);
  }
  const lifecycle=null;
  const collectionDiagnostics=await evaluate('evaluationHarness.collectionStatus()');
  assert.equal(collectionDiagnostics.failure,null);assert.equal(collectionDiagnostics.livePorts,0);assert.ok(collectionDiagnostics.channels.length<=64);
  if(caseId){assert.equal(collectionDiagnostics.channels.length,1);assert.ok(collectionDiagnostics.channels[0].last);}
  const ownership=await evaluate('evaluationHarness.ownership()');assert.equal(ownership.live,0);assert.ok(ownership.maxLive<=5);assert.equal(ownership.liveSources,0);assert.ok(ownership.maxLiveSources<=5);
  assert.deepEqual(await evaluate('evaluationHarness.violations'),[]);
  assert.deepEqual(await evaluate('evaluationHarness.errors'),[]);
  assert.deepEqual(await evaluate('evaluationHarness.rejections'),[]);
  await Promise.all(setupTasks);for(const row of setupFailures)if(!knownDetachedSetup(row,{detached,active:sessions,workers:new Set(attached.filter(a=>a.type==='worker').map(a=>a.sessionId))}))fatal.push(row.error);
  assert.equal(requests.length,0);assert.equal(http.length,0);assert.deepEqual(badEvents,[]);assert.deepEqual(fatal,[]);
  await memory.stop();
  const sourceFiles={};
  for(const p of ['scripts/verify-sustained.mjs','scripts/generate-sustained-harness.mjs','scripts/generate-sustained-runner.mjs','scripts/sustained-proof.mjs','scripts/sustained-memory.mjs','scripts/sustained-asset-route.mjs','scripts/check-sustained.mjs','src/sustained/packet-audit.js','bench/staged-sustained-plan.json','scripts/sustained-decision.mjs','scripts/benchmark-sustained.mjs','scripts/report-sustained.mjs','docs/contracts/sustained-evaluation.md','scripts/verify-coordinator-ci.mjs','scripts/generate-coordinator-ci.mjs','scripts/resource-ui-cdp-lifecycle.mjs','scripts/verify-coordinator.mjs','scripts/benchmark-coordinator.mjs','scripts/report-coordinator.mjs','scripts/coordinator-decision.mjs','scripts/check-coordinator.mjs','scripts/generate-coordinator-runner.mjs','scripts/coordinator-asset-route.mjs','bench/staged-coordinator-plan.json','scripts/benchmark-resources.mjs','scripts/resource-decision.mjs','scripts/report-resources.mjs','bench/staged-resource-plan.json','scripts/generate-resource-runner.mjs','scripts/build-resource-worker.mjs','scripts/build-resource-wasm.mjs','scripts/verify-resources.mjs','scripts/resource-asset-route.mjs','native/resources/memory-contract.mjs','native/resources/build-64.json','native/resources/build-128.json','src/resources/worker-body.js','src/resources/policy.js'])sourceFiles[p]=createHash('sha256').update(await readFile(join(root,p))).digest('hex');
  for(const path of ['scripts/verify-scheduler.mjs','scripts/benchmark-scheduler.mjs','scripts/check-scheduler.mjs','scripts/report-scheduler.mjs','scripts/scheduler-decision.mjs','scripts/scheduler-packets.mjs','scripts/scheduler-asset-route.mjs','scripts/generate-scheduler-runner.mjs','scripts/build-scheduler-worker.mjs','src/rusqsieve-scheduler/worker-body.js','bench/staged-scheduler-plan.json','scripts/verify-dlp.mjs','scripts/benchmark-dlp.mjs','scripts/dlp-decision.mjs','scripts/dlp-series-contract.mjs','bench/staged-dlp-plan.json','scripts/browser-memory.mjs','scripts/dlp-asset-route.mjs','scripts/build-dlp-worker.mjs','scripts/build-rusqsieve-dlp.mjs','native/rusqsieve-dlp/staged-build.json','native/rusqsieve/staged-upstream.json','native/rusqsieve/patch-source.mjs','native/rusqsieve-dlp/patch-source.mjs','scripts/generate-dlp-runner.mjs','native/rusqsieve/codex_observer.rs','native/rusqsieve/memory-contract.mjs','src/rusqsieve-dlp/worker-body.js','bench/staged-rsa/catalog.json','bench/staged-full/catalog.json','bench/staged-full/oracle.json','bench/staged-full/manifest.json',...initialAssets.map(a=>a.path.slice(1))])sourceFiles[path]=createHash('sha256').update(await readFile(join(root,path))).digest('hex');
  const receipt={selectedMemoryMiB:selectedMemory,slots,graphVariant,coordinator,mode,variant,profile,scheduler,fixedFamilies,caseId,group,seed,budgetMs,lifecycle,measuredHead:process.env.PRIME_MEASURED_HEAD??null,measuredAt:new Date().toISOString(),browser,browserDevice,
    host:{platform:platform(),release:release(),cpu:cpus()[0]?.model,logicalCpus:cpus().length,memoryBytes:totalmem(),headless:true},
    collectionDiagnostics,startupTrace,ramOriginMs:nodeMeasurementStart,ramTimeline:memory.samples,assetBoundarySelfTest,detachedBeforeResume:setupFailures,detachedSetupProof:{detached:[...detached],active:[...sessions],workers:attached.filter(a=>a.type==='worker').map(a=>a.sessionId)},coldReadyMs,preflightRam,initialAssets,sourceFiles,records,ownership,sampledRam:memory.summary(),
    quiet:{networkRequests:0,httpRequests:0,badEvents:0,assetServerStopped:true,cacheDisabled:true},
    limits:{wasmBytesPerOwner:1073741824,totalWasmBytes:1280*1048576,maxOwners:5,packetBytes:8388608,transportBytes,initializationMs:10000,wallMs:budgetMs,extractAttempts:1,workUnit:'input-dependent finite SIQS families, not C checkpoint work',wholeRam:'sampled Chrome tree RSS/PSS; requested allocation sizes exclude metadata/fragmentation/stack/static; not a hard total RAM cap'}};
  // Positive audit controls after quiet counters were asserted.
  await networkOffline(false);await new Promise(r=>server.listen(port,'127.0.0.1',r));
  await evaluate('fetch("/blocked-probe").catch(()=>null)');
  assert.ok((await evaluate('evaluationHarness.violations')).some(v=>v.directive==='connect-src'));
  await send('Page.navigate',{url:origin+'/probe'},pageSession);
  for(let i=0;i<100&&!http.includes('/probe');i++)await new Promise(r=>setTimeout(r,10));
  assert.ok(http.includes('/probe'));assert.ok(requests.some(r=>r.url===origin+'/probe'));
  const probe='fetch('+JSON.stringify(origin+'/worker-probe')+').then(()=>self.postMessage("observed")).catch(()=>self.postMessage("failed"));';
  await evaluate('new Promise((yes,no)=>{const url=URL.createObjectURL(new Blob(['+JSON.stringify(probe)+'],{type:"text/javascript"}));const w=new Worker(url);w.onmessage=e=>{URL.revokeObjectURL(url);w.terminate();e.data==="observed"?yes(true):no(Error("probe"));};w.onerror=e=>no(Error(e.message));})');
  assert.ok(http.includes('/worker-probe'));assert.ok(requests.some(r=>r.url===origin+'/worker-probe'&&r.sessionId!==pageSession));
  receipt.detectorSelfTest={blockedPageFetchCsp:true,pageCdpAndHttp:true,workerCdpAndHttp:true};
  receipt.graphSourceFiles={};
  for(const p of ["scripts/generate-score-unroll.mjs","scripts/verify-score-unroll.mjs","scripts/score-unroll-asset-route.mjs","scripts/build-score-unroll.mjs","native/score-unroll/patch-source.mjs","native/score-unroll/oracle.rs","native/score-unroll/build-unroll4-1024.json","src/score-unroll/worker-source.js","docs/contracts/score-unroll.md"])receipt.graphSourceFiles[p]=createHash("sha256").update(await readFile(join(root,p))).digest("hex");
  for(const p of ["scripts/generate-collection-harness.mjs","scripts/verify-collection-profile.mjs","scripts/collection-profile-asset-route.mjs","scripts/build-collection-profile.mjs","native/collection-profile/patch-source.mjs","native/collection-profile/timing.rs","native/collection-profile/memory-contract.mjs","native/collection-profile/build-phase-1024.json","src/collection-profile/worker-source.js","src/collection-profile/bridge.js","docs/contracts/collection-profile.md","docs/contracts/collection-candidates.md","scripts/build-collection-hotpath.mjs","native/collection-hotpath/patch-source.mjs","native/collection-hotpath/build-resieve4-1024.json","native/collection-hotpath/build-sparse-1024.json"])receipt.graphSourceFiles[p]=createHash("sha256").update(await readFile(join(root,p))).digest("hex");
  for(const p of ["scripts/generate-wide-window.mjs","scripts/generate-wide-window-harness.mjs","scripts/verify-wide-window.mjs","scripts/wide-window-asset-route.mjs","scripts/wide-window-memory.mjs","scripts/windows-memory-receipt.mjs","src/wide-window/policy.js","src/wide-window/budget.js","src/wide-window/memory.js","src/wide-window/worker-source.js","src/wide-window/runner.js","src/wide-window/index.js","native/long-window/build-long-1024.json","docs/contracts/wide-window.md"])receipt.graphSourceFiles[p]=createHash("sha256").update(await readFile(join(root,p))).digest("hex");
  for(const p of ["scripts/verify-long-window.mjs","scripts/generate-long-window-harness.mjs","scripts/generate-long-window.mjs","scripts/long-window-memory.mjs","scripts/windows-memory-receipt.mjs","scripts/long-window-cleanup.mjs","scripts/long-window-memory-stop.mjs","scripts/watch-windows-memory.ps1","scripts/long-window-asset-route.mjs","src/long-window/policy.js","src/long-window/budget.js","src/long-window/worker-source.js","src/long-window/runner.js","scripts/build-long-window.mjs","native/long-window/quota.rs","native/long-window/patch-source.mjs","native/long-window/memory-contract.mjs","native/long-window/build-long-256.json","docs/contracts/long-window.md"])receipt.graphSourceFiles[p]=createHash("sha256").update(await readFile(join(root,p))).digest("hex");
  for(const p of ["scripts/verify-optimized-entry.mjs","scripts/generate-optimized-entry.mjs","scripts/optimized-entry-asset-route.mjs","scripts/build-optimized-workers.mjs","native/optimized/worker-recipe.mjs","native/optimized/selected-worker-sources.json"])receipt.graphSourceFiles[p]=createHash("sha256").update(await readFile(join(root,p))).digest("hex");
  for(const p of ["scripts/verify-graph-integrated.mjs","scripts/generate-graph-integrated.mjs","scripts/graph-integrated-asset-route.mjs","src/graph-integrated/worker-source.js","docs/contracts/graph-dedicated-followup.md","docs/contracts/graph-integrated-sustained.md","scripts/generate-optimized.mjs","scripts/build-optimized-lowcap.mjs","native/optimized/build-optimized-128.json","docs/contracts/optimized-engine.md","native/graph-varint/retained-relation.rs","native/graph-varint/patch-source.mjs","scripts/build-graph-varint.mjs","native/graph-varint/build-varint-128.json","native/graph-varint/build-varint-256.json","docs/contracts/graph-varint.md"])receipt.graphSourceFiles[p]=createHash("sha256").update(await readFile(join(root,p))).digest("hex");
  for(const p of ["scripts/verify-graph-builtin.mjs","scripts/generate-graph-builtin.mjs","scripts/graph-builtin-asset-route.mjs","scripts/build-graph-builtin.mjs","native/graph-builtin/patch-source.mjs","native/graph-builtin/build-builtin-64.json","native/graph-builtin/build-builtin-256.json","docs/contracts/graph-builtin-remainder.md"])receipt.graphSourceFiles[p]=createHash("sha256").update(await readFile(join(root,p))).digest("hex");
  for(const p of ["scripts/verify-graph-multicore.mjs","scripts/generate-graph-multicore.mjs","scripts/graph-multicore-asset-route.mjs","scripts/graph-multicore-proof.mjs","docs/contracts/graph-multicore.md"])receipt.graphSourceFiles[p]=createHash("sha256").update(await readFile(join(root,p))).digest("hex");
  receipt.baselineStorage='stage25-observed-uncompressed';receipt.graphProfileSchema=2;
  for(const p of ['scripts/verify-graph-arena.mjs','scripts/generate-graph-arena.mjs','scripts/graph-arena-asset-route.mjs','scripts/build-graph-arena.mjs','native/graph-arena/patch-source.mjs','native/graph-arena/packed-relation.rs','native/graph-arena/build-packed.json','src/graph-arena/worker-source.js','docs/contracts/graph-arena.md'])receipt.graphSourceFiles[p]=createHash('sha256').update(await readFile(join(root,p))).digest('hex');
  for(const p of ['scripts/verify-graph-release.mjs','scripts/generate-graph-release.mjs','scripts/graph-release-asset-route.mjs','scripts/build-graph-release.mjs','native/graph-release/patch-source.mjs','native/graph-release/session-stop.rs','native/graph-release/build-release.json','src/graph-release/worker-source.js','src/graph-release/runner.js','docs/contracts/graph-release.md'])receipt.graphSourceFiles[p]=createHash('sha256').update(await readFile(join(root,p))).digest('hex');
  for(const p of ['scripts/verify-graph-profile.mjs','scripts/generate-graph-profile.mjs','scripts/graph-asset-route.mjs','src/graph-profile/worker-source.js','src/graph-profile/runner.js','native/graph-profile/build-baseline.json','native/graph-profile/build-compact.json','native/graph-profile/patch-source.mjs','native/graph-profile/engine-profile.rs','native/graph-profile/compact-root.rs','native/graph-profile/phase.rs','docs/contracts/graph-profile.md'])receipt.graphSourceFiles[p]=createHash('sha256').update(await readFile(join(root,p))).digest('hex');
  // Store compact evidence directly. Every original packet digest and numeric counter remains.
  receipt.ramTimeline=receipt.ramTimeline.filter((_,i,a)=>i%Math.max(1,Math.ceil(a.length/255))===0||i===a.length-1).map(s=>({atMs:s.atMs,rssBytes:s.rssBytes,pssBytes:s.pssBytes,processes:s.processes,availableMiB:s.availableMiB,windowsAvailableMiB:s.windowsAvailableMiB,windowsReceiptAt:s.windowsReceiptAt}));
  for(const r of records){if(!r.outcome)continue;r.eventCount=r.outcome.events.length;delete r.outcome.events;r.handoff.packets=r.handoff.packets.map(p=>[p.first,p.returnedMs,p.acceptedMs,p.waitMs]);}
  const text=JSON.stringify(receipt)+'\n';assert.ok(Buffer.byteLength(text)<=16777216,'Bounded long evidence <=16MiB');
  await writeFile(output,text);console.log('Receipt '+output);
} catch (error) {
  try{
    let sampledRam=null;try{sampledRam=memory?.summary();}catch{}
    const failure={kind:'harness-failure',measuredHead:process.env.PRIME_MEASURED_HEAD??null,failedAt:new Date().toISOString(),error:String(error.stack??error).slice(0,4000),sampledRam,ramTimeline:memory?.samples??[]};
    const text=JSON.stringify(failure)+'\n';assert.ok(Buffer.byteLength(text)<=16777216);await writeFile(output+'.failed.json',text,{flag:'wx'});
  }catch(writeError){console.error('Failure receipt write: '+String(writeError));}
  let diagnostic;
  try { diagnostic = await evaluate('({phase:globalThis.evaluationHarness?.state,violations:globalThis.evaluationHarness?.violations,errors:globalThis.evaluationHarness?.errors})'); } catch {}
  console.error(JSON.stringify({startupTrace,chromeStderr,fatal,badEvents,requests,diagnostic,attached,pending:[...pending.values()].map(v=>v.method)}));
  throw error;
} finally {
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

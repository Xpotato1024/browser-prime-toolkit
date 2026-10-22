// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Xpotato.net / Xpotato1024
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, writeFile, access, mkdtemp, rm } from 'node:fs/promises';
import { resolve, join, extname, sep } from 'node:path';
import { tmpdir, cpus, totalmem, platform, release } from 'node:os';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { BrowserMemorySampler } from './browser-memory.mjs';
import {resourceUiAsset as resourceAsset} from './resource-ui-asset-route.mjs';
import {observer} from './resource-ui-observer.mjs';
import {knownDetachedSetup,retireSetupCalls} from './resource-ui-cdp-lifecycle.mjs';
import {digestPackets} from './scheduler-packets.mjs';

const root = resolve(import.meta.dirname, '..');
const arg=(key,fallback)=>process.argv.includes(key)?process.argv[process.argv.indexOf(key)+1]:fallback;
const output=resolve(arg('--out',join(tmpdir(),'rsa-profile-receipt.json')));
try{await access(output);throw Error('Refusing to overwrite '+output);}catch(e){if(e.code!=='ENOENT')throw e;}
const profile='baseline',scheduler=arg('--scheduler','credit1');assert.ok(['credit1'].includes(scheduler));
const fixedFamilies=arg('--fixed-families',null)===null?null:Number(arg('--fixed-families'));assert.ok(fixedFamilies===null||fixedFamilies===4);
const caseId=arg('--case',null),seed=Number(arg('--seed','1')),mode=caseId?'resource-ui-contracts':'resource-ui-contracts',variant=arg('--engine','one-drop'),group='rsa',budgetMs=Number(arg('--budget-ms','30000'));
assert.ok(['one-drop','two-drop','three-drop','four-drop'].includes(variant));
assert.ok([3000,30000,60000,180000,600000].includes(budgetMs));
if(!caseId)assert.equal(budgetMs,30000);
assert.ok(Number.isSafeInteger(seed)&&seed>=1&&seed<=4294967295);
const catalog=[...JSON.parse(await readFile(join(root,'bench/staged-rsa/catalog.json'),'utf8')),...JSON.parse(await readFile(join(root,'bench/staged-practical/catalog.json'),'utf8')).cases,...JSON.parse(await readFile(join(root,'bench/staged-full/catalog.json'),'utf8')).cases];
const temporary = await mkdtemp(join(tmpdir(), 'prime-browser-'));
const http = [], requests = [], badEvents = [], localBlobs = [], sessions = new Set(), fatal = [];
const setupFailures=[],setupTasks=[],detached=new Set();
let chrome, socket, server, pageSession, memory, sequence = 0;
const pending = new Map(), attached = [];
const send = (method, params = {}, sessionId) => new Promise((resolveCall, rejectCall) => {
  const id = ++sequence;
  const timer = setTimeout(() => { pending.delete(id); rejectCall(Error('CDP timeout: ' + method)); }, method === 'Runtime.evaluate' ? budgetMs+20000 : 5000);
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
  const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css':'text/css' };
  server = createServer(async (req, res) => {
    http.push(req.url);
    try {
      const url = new URL(req.url, 'http://localhost');
      if (url.pathname === '/probe') { res.writeHead(200, { 'Content-Type': 'text/plain' }); res.end('detector probe'); return; }
      const relative=resourceAsset(url.pathname);if(relative===null)throw Error('Not a runtime asset');
      const path = resolve(root, relative);
      if (!path.startsWith(root + sep)) throw Error('Path escape');
      res.writeHead(200, { 'Content-Type': mime[extname(path)] ?? 'application/octet-stream', 'Cache-Control': 'no-store',
        'Content-Security-Policy': "default-src 'none'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self'; worker-src blob:; connect-src 'none'; img-src data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'" });
      res.end(await readFile(path));
    } catch { res.writeHead(404); res.end(); }
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
    { stdio: ['ignore', 'ignore', 'pipe'], env: process.env, windowsHide: true });
  memory = new BrowserMemorySampler(chrome.pid); await memory.start();
  const debuggingUrl = await new Promise((resolveUrl, rejectUrl) => {
    let stderr = '';
    const timer = setTimeout(() => rejectUrl(Error('Chrome startup timed out: ' + stderr.slice(-1000))), 30000);
    chrome.once('error', error => { clearTimeout(timer); rejectUrl(error); });
    chrome.once('exit', code => { clearTimeout(timer); rejectUrl(Error('Chrome exited: ' + code + ' ' + stderr.slice(-1000))); });
    chrome.stderr.on('data', data => {
      stderr = (stderr + data.toString()).slice(-10000);
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
  await send('Page.addScriptToEvaluateOnNewDocument',{source:observer},pageSession);
  const coldStarted = performance.now();
  await send('Page.navigate', { url: origin + '/app/resources.html' }, pageSession);
  for (let i = 0; i < 200; i++) {
    if (await evaluate('!!document.getElementById("start-computation")&&!document.getElementById("start-computation").disabled')) break;
    await new Promise(resolveWait => setTimeout(resolveWait, 25));
  }
  await evaluate('(async()=>{globalThis.resourcePage=await import("/app/resources-main.js")})()');
  const standardInitialAssets=requests.map(r=>new URL(r.url).pathname);
  assert.ok(!standardInitialAssets.some(p=>p.startsWith('/src/resources/worker-')),'Experimental engine is not fetched for the ordinary entry');
  await evaluate('document.getElementById("calculation-mode").value="experimental";document.getElementById("calculation-mode").dispatchEvent(new Event("change"))');
  for(let i=0;i<500;i++){if(await evaluate('resourcePage.getApp().getState().phase==="ready"'))break;await new Promise(r=>setTimeout(r,10));}
  assert.equal(await evaluate('resourcePage.getApp().getState().engine'),'experimental');
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
  requests.length = 0; http.length = 0; badEvents.length = 0; localBlobs.length = 0;
  const records=[];
  // Stop the asset server before all timed calculations; Blob sources are already local.
  await networkOffline(true);server.closeAllConnections();
  await new Promise(r=>server.close(r));
  const checks=[];
  const wait=async(expression,max=20000)=>{const end=performance.now()+max;while(performance.now()<end){if(await evaluate(expression))return;await new Promise(r=>setTimeout(r,10));}throw Error('UI condition: '+expression);};
  const set=(id,value)=>evaluate('document.getElementById('+JSON.stringify(id)+').value='+JSON.stringify(String(value))+';document.getElementById('+JSON.stringify(id)+').dispatchEvent(new Event("change",{bubbles:true}))');
  const submit=async input=>{await evaluate('document.getElementById("integer-input").value='+JSON.stringify(input)+';document.getElementById("start-computation").click()');await wait('["result","invalid","error"].includes(resourcePage.getApp().getState().phase)');return evaluate('resourcePage.getApp().getState()');};
  const check=(name,pass)=>{assert.ok(pass,name);checks.push({name,pass:true});};
  for(const [input,label]of [['0','zero'],['1','one'],['32','small-factor'],['97','prime'],['10201','square'],['1000036000099','balanced-small'],['9007199254740991','safe-number-boundary'],['9007199254740993','above-safe-number'],['18446744073709551615','64bit-minus-one'],['18446744073709551616','64bit-boundary']]){
   const state=await submit(input);check(label,state.phase==='result'&&state.input===input&&state.resources.actualWorkers===(BigInt(input)<2n?0:1)&&state.resources.actualWasmBytes===(BigInt(input)<(1n<<64n)?0:134217728));
   if(input==='32')check('exact-power-output',state.view.copyText.startsWith('32 = 2^5'));
  }
  await set('calculation-mode','standard');await wait('resourcePage.getApp().getState().phase==="ready"');
  const createdBefore=await evaluate('evaluationHarness.ownership().created');const invalid=await submit((1n<<128n).toString());check('experimental-opt-in',invalid.phase==='invalid'&&await evaluate('evaluationHarness.ownership().created')===createdBefore);
  await evaluate('document.getElementById("integer-input").value="";document.getElementById("integer-input").focus()');
  await send('Input.insertText',{text:'0'.repeat(4095)+'123'},pageSession);check('native-input-never-truncates',await evaluate('document.getElementById("integer-input").value.length')===4098);
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r'},pageSession);await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13},pageSession);
  await wait('resourcePage.getApp().getState().phase==="invalid"');check('overlong-input-rejected',await evaluate('evaluationHarness.ownership().created')===createdBefore);
  await evaluate('document.getElementById("integer-input").value="32";document.getElementById("integer-input").focus()');
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r'},pageSession);await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13},pageSession);
  await wait('resourcePage.getApp().getState().phase==="result"');check('keyboard-submit',await evaluate('resourcePage.getApp().getState().view.copyText.startsWith("32 = 2^5")'));
  const ax=await send('Accessibility.getFullAXTree',{},pageSession);check('accessible-input-and-mode',ax.nodes.some(n=>n.role?.value==='textbox'&&n.name?.value==='0以上の整数')&&ax.nodes.some(n=>n.role?.value==='combobox'&&n.name?.value==='資源設定'));
  await set('calculation-mode','experimental');await wait('resourcePage.getApp().getState().phase==="ready"');await set('resource-mode','manual');check('manual-controls-open',await evaluate('document.getElementById("resource-details").open'));await set('worker-count',4);await set('wasm-budget',128);
  const prior=await evaluate('evaluationHarness.ownership().created');check('infeasible-combination-before-workers',(await submit('32')).phase==='invalid'&&await evaluate('evaluationHarness.ownership().created')===prior);
  await set('wasm-budget',512);await set('time-budget',15000);
  const forty=JSON.parse(await readFile(join(root,'bench/staged-full/catalog.json'),'utf8')).cases.find(c=>c.id==='full-balanced-40-1').input;
  const factored=await submit(forty);check('real-four-owner-factor-and-retirement',factored.phase==='result'&&factored.resources.actualWorkers===4&&factored.resources.actualWasmBytes===448*1048576&&factored.view.copyText.includes('未証明')&&await evaluate('evaluationHarness.ownership().live')===0);
  const rsa=catalog.find(c=>c.id==='RSA-100').input;
  await evaluate('document.getElementById("integer-input").value='+JSON.stringify(rsa)+';document.getElementById("start-computation").click()');
  check('running-settings-locked',await evaluate('document.getElementById("worker-count").disabled&&document.getElementById("calculation-mode").disabled'));
  await evaluate('document.getElementById("cancel-computation").click()');await wait('resourcePage.getApp().getState().phase==="result"');check('cancel-all-owners',await evaluate('resourcePage.getApp().getState().view.copyText.includes("中止")&&evaluationHarness.ownership().live===0&&evaluationHarness.ownership().liveSources===0'));
  await set('time-budget',1000);const timed=await submit(rsa);check('whole-deadline-is-incomplete',timed.phase==='result'&&timed.view.copyText.includes('未完了')&&await evaluate('evaluationHarness.ownership().live')===0);
  if(process.env.PRIME_UI_SCREENSHOTS){const png=await send('Page.captureScreenshot',{captureBeyondViewport:true},pageSession);await writeFile(process.env.PRIME_UI_SCREENSHOTS+'-desktop.png',Buffer.from(png.data,'base64'));}
  await send('Emulation.setDeviceMetricsOverride',{width:320,height:812,deviceScaleFactor:1,mobile:true},pageSession);check('viewport320-no-horizontal-overflow',await evaluate('document.documentElement.scrollWidth<=innerWidth'));
  if(process.env.PRIME_UI_SCREENSHOTS){const png=await send('Page.captureScreenshot',{captureBeyondViewport:true},pageSession);await writeFile(process.env.PRIME_UI_SCREENSHOTS+'-mobile.png',Buffer.from(png.data,'base64'));}
  await evaluate('document.getElementById("start-computation").click();dispatchEvent(new PageTransitionEvent("pagehide"))');await wait('evaluationHarness.ownership().live===0');check('pagehide-disposes',await evaluate('resourcePage.getApp().getState().phase==="disposed"&&document.getElementById("resource-app").children.length===0'));
  await evaluate('dispatchEvent(new PageTransitionEvent("pageshow",{persisted:true}))');await wait('resourcePage.getApp().getState().phase==="ready"');check('bfcache-draft-only',await evaluate('document.getElementById("integer-input").value')===rsa&&await evaluate('evaluationHarness.ownership().live')===0);
  records.push({checks,realSmartphoneTest:false,viewportEmulationOnly:true});
  const lifecycle=null;
  const ownership=await evaluate('evaluationHarness.ownership()');assert.equal(ownership.live,0);assert.ok(ownership.maxLive<=4);assert.equal(ownership.liveSources,0);assert.ok(ownership.maxLiveSources<=4);
  assert.deepEqual(await evaluate('evaluationHarness.violations'),[]);
  assert.deepEqual(await evaluate('evaluationHarness.errors'),[]);
  assert.deepEqual(await evaluate('evaluationHarness.rejections'),[]);
  await Promise.all(setupTasks);for(const row of setupFailures)if(!knownDetachedSetup(row,{detached,active:sessions,workers:new Set(attached.filter(a=>a.type==='worker').map(a=>a.sessionId))}))fatal.push(row.error);
  assert.equal(requests.length,0);assert.equal(http.length,0);assert.deepEqual(badEvents,[]);assert.deepEqual(fatal,[]);
  await memory.stop();
  const sourceFiles={};
  for(const p of ['scripts/verify-resource-ui.mjs','scripts/generate-resource-ui.mjs','scripts/resource-ui-actions.mjs','scripts/resource-ui-observer.mjs','scripts/resource-ui-cdp-lifecycle.mjs','scripts/resource-ui-asset-route.mjs','scripts/benchmark-resources.mjs','scripts/resource-decision.mjs','scripts/report-resources.mjs','bench/staged-resource-plan.json','scripts/generate-resource-runner.mjs','scripts/build-resource-worker.mjs','scripts/build-resource-wasm.mjs','scripts/verify-resources.mjs','scripts/resource-asset-route.mjs','native/resources/memory-contract.mjs','native/resources/build-64.json','native/resources/build-128.json','src/resources/worker-body.js','src/resources/policy.js'])sourceFiles[p]=createHash('sha256').update(await readFile(join(root,p))).digest('hex');
  for(const path of ['scripts/verify-scheduler.mjs','scripts/benchmark-scheduler.mjs','scripts/check-scheduler.mjs','scripts/report-scheduler.mjs','scripts/scheduler-decision.mjs','scripts/scheduler-packets.mjs','scripts/scheduler-asset-route.mjs','scripts/generate-scheduler-runner.mjs','scripts/build-scheduler-worker.mjs','src/rusqsieve-scheduler/worker-body.js','bench/staged-scheduler-plan.json','scripts/verify-dlp.mjs','scripts/benchmark-dlp.mjs','scripts/dlp-decision.mjs','scripts/dlp-series-contract.mjs','bench/staged-dlp-plan.json','scripts/browser-memory.mjs','scripts/dlp-asset-route.mjs','scripts/build-dlp-worker.mjs','scripts/build-rusqsieve-dlp.mjs','native/rusqsieve-dlp/staged-build.json','native/rusqsieve/staged-upstream.json','native/rusqsieve/patch-source.mjs','native/rusqsieve-dlp/patch-source.mjs','scripts/generate-dlp-runner.mjs','native/rusqsieve/codex_observer.rs','native/rusqsieve/memory-contract.mjs','src/rusqsieve-dlp/worker-body.js','bench/staged-rsa/catalog.json','bench/staged-full/catalog.json','bench/staged-full/oracle.json','bench/staged-full/manifest.json',...initialAssets.map(a=>a.path.slice(1))])sourceFiles[path]=createHash('sha256').update(await readFile(join(root,path))).digest('hex');
  const receipt={mode,variant,profile,scheduler,fixedFamilies,caseId,group,seed,budgetMs,lifecycle,measuredHead:process.env.PRIME_MEASURED_HEAD??null,measuredAt:new Date().toISOString(),browser,browserDevice,
    host:{platform:platform(),release:release(),cpu:cpus()[0]?.model,logicalCpus:cpus().length,memoryBytes:totalmem(),headless:true},
    assetBoundarySelfTest,standardInitialAssets,detachedBeforeResume:setupFailures,detachedSetupProof:{detached:[...detached],active:[...sessions],workers:attached.filter(a=>a.type==='worker').map(a=>a.sessionId)},coldReadyMs,initialAssets,sourceFiles,records,ownership,sampledRam:memory.summary(),
    quiet:{networkRequests:0,httpRequests:0,badEvents:0,assetServerStopped:true,cacheDisabled:true},
    limits:{wasmBytesPerOwner:268435456,totalWasmBytes:536870912,maxOwners:4,packetBytes:8388608,transportBytes:33554432,initializationMs:10000,wallMs:budgetMs,extractAttempts:1,workUnit:'input-dependent finite SIQS families, not C checkpoint work',wholeRam:'sampled Chrome tree RSS/PSS; requested allocation sizes exclude metadata/fragmentation/stack/static; not a hard total RAM cap'}};
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
  await writeFile(output,JSON.stringify(receipt,null,2)+'\n');console.log('Receipt '+output);
} catch (error) {
  let diagnostic;
  try { diagnostic = await evaluate('({phase:globalThis.evaluationHarness?.state,violations:globalThis.evaluationHarness?.violations,errors:globalThis.evaluationHarness?.errors})'); } catch {}
  console.error(JSON.stringify({fatal,badEvents,requests,diagnostic,attached,pending:[...pending.values()].map(v=>v.method)}));
  throw error;
} finally {
  if (memory?.running) await memory.stop();
  if (socket?.readyState === WebSocket.OPEN) { try { await send('Browser.close'); } catch {} socket.close(); }
  for (const call of pending.values()) { clearTimeout(call.timer); call.reject(Error('Browser closed')); }
  chrome?.kill();
  if (chrome && chrome.exitCode === null) await new Promise(resolveExit => { const timer=setTimeout(resolveExit,2000); chrome.once('exit',()=>{clearTimeout(timer);resolveExit();}); });
  if (server) await new Promise(resolveClose => server.close(resolveClose));
  if (temporary.startsWith(join(tmpdir(), 'prime-browser-'))) await rm(temporary, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}

// Generated CI-only lifecycle adapter; original benchmark/raw source remains frozen.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, writeFile, access, mkdtemp, rm } from 'node:fs/promises';
import { resolve, join, extname, sep } from 'node:path';
import { tmpdir, cpus, totalmem, platform, release } from 'node:os';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { makeCorpus } from '../bench/corpus.mjs';
import { makeCandidateCorpus } from '../bench/candidate-corpus.mjs';
import { makeAdvancedCorpus } from '../bench/advanced-corpus.mjs';
import { BrowserMemorySampler } from './browser-memory.mjs';
import {observeChromeStartup,openChromeTransport} from './chrome-startup.mjs';
import { verifyStagedOutcome } from '../src/engine/staged-result.js';

const root = resolve(import.meta.dirname, '..');
const arg=(key,fallback)=>process.argv.includes(key)?process.argv[process.argv.indexOf(key)+1]:fallback;
const output=resolve(arg('--out',join(tmpdir(),'staged-receipt.json')));
try{await access(output);throw Error('Refusing to overwrite '+output);}catch(e){if(e.code!=='ENOENT')throw e;}
assert.equal(arg('--mode','primary'),'lifecycle','CI contracts only; historical performance driver is frozen');
const mode=arg('--mode','primary'),variant=arg('--variant','p64'),caseId=arg('--case','balanced-112bit-0');
const group=arg('--group','train'),seed=Number(arg('--seed','1')),budgetMs=1000;
if(!['brent','ecm','siqs','p64','p80'].includes(variant)||!['train','holdout'].includes(group)||!Number.isSafeInteger(seed))throw Error('Fixed experiment');
const selected=JSON.parse(await readFile(join(root,'bench/staged-'+group+'.json')));
const temporary = await mkdtemp(join(tmpdir(), 'prime-browser-'));
const http = [], requests = [], badEvents = [], localBlobs = [], sessions = new Set(), fatal = [];
let chrome, socket, server, pageSession, memory, startup, sequence = 0;
const pending = new Map(), attached = [];
const send = (method, params = {}, sessionId) => new Promise((resolveCall, rejectCall) => {
  const id = ++sequence;
  const timer = setTimeout(() => { pending.delete(id); rejectCall(Error('CDP timeout: ' + method)); }, method === 'Runtime.evaluate' ? 65000 : 5000);
  pending.set(id, { method, resolve: resolveCall, reject: rejectCall, timer });
  socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
});
const evaluate = async expression => {
  const value = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, timeout: 65000 }, pageSession);
  if (value.exceptionDetails) throw Error(JSON.stringify(value.exceptionDetails));
  return value.result.value;
};
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
    try {
      const url = new URL(req.url, 'http://localhost');
      if (url.pathname === '/probe') { res.writeHead(200, { 'Content-Type': 'text/plain' }); res.end('detector probe'); return; }
      if (!url.pathname.startsWith('/src/') && !url.pathname.startsWith('/bench/')) throw Error('Not an asset');
      const path = resolve(root, '.' + decodeURIComponent(url.pathname));
      if (!path.startsWith(root + sep)) throw Error('Path escape');
      res.writeHead(200, { 'Content-Type': mime[extname(path)] ?? 'application/octet-stream', 'Cache-Control': 'no-store',
        'Content-Security-Policy': "default-src 'none'; script-src 'self' 'wasm-unsafe-eval'; worker-src blob:; connect-src 'none'; img-src data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'" });
      res.end(await readFile(path));
    } catch { res.writeHead(404); res.end(); }
  });
  await new Promise(resolveListen => server.listen(0, '127.0.0.1', resolveListen));
  const port = server.address().port;
  const origin = 'http://127.0.0.1:' + port;
  chrome = spawn(process.env.CHROME_BIN || 'google-chrome', ['--headless=new', '--no-sandbox', '--disable-dev-shm-usage',
    '--disable-background-networking', '--disable-component-update', '--disable-default-apps', '--no-first-run',
    '--disable-background-timer-throttling', '--remote-debugging-port=0', '--user-data-dir=' + temporary, 'about:blank'],
    { stdio: ['ignore', 'ignore', 'pipe'], env: process.env, windowsHide: true });
  // Observe ownership before the asynchronous memory sampler can yield.
  const startupTimeoutMs = 15000, startupDeadline = performance.now() + startupTimeoutMs;
  startup = observeChromeStartup(chrome, temporary, {timeoutMs: startupTimeoutMs});
  memory = new BrowserMemorySampler(chrome.pid); await memory.start();
  const debuggingUrl = await startup.ready;
  socket = new WebSocket(debuggingUrl);
  await openChromeTransport(socket,{timeoutMs:Math.max(1,startupDeadline-performance.now())});
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
        enableNetwork(sessionId).then(() => send('Runtime.runIfWaitingForDebugger', {}, sessionId)).catch(error => fatal.push(error.message));
      }
    }
    if (message.method === 'Target.detachedFromTarget') sessions.delete(message.params.sessionId);
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
  const coldStarted = performance.now();
  await send('Page.navigate', { url: origin + '/bench/staged.html' }, pageSession);
  for (let i = 0; i < 200; i++) {
    if (await evaluate('!!globalThis.evaluationHarness')) break;
    await new Promise(resolveWait => setTimeout(resolveWait, 25));
  }
  await evaluate('evaluationHarness.ownership()');
  const coldReadyMs = performance.now() - coldStarted;
  const browserDevice = await evaluate('({userAgent:navigator.userAgent,cores:navigator.hardwareConcurrency,memoryGiB:navigator.deviceMemory})');
  assert.ok(requests.length > 3, 'Actual local source assets loaded');
  assert.ok(requests.every(r => r.url.startsWith(origin + '/')), 'Only same-origin initial assets');
  assert.equal(fatal.length, 0);
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
  const measure=async(c,options)=>{
    const mark=memory.mark();await memory.sample();
    const result=await evaluate('evaluationHarness.run('+JSON.stringify(c.input)+','+JSON.stringify(options)+')');
    await memory.sample();verifyStagedOutcome(result,c.input);
    if(['complete','probable'].includes(result.status))assert.deepEqual(result.factors.map(f=>f.value),c.factors);
    assert.equal(result.allWorkersDisposed,true);
    records.push({case:c.id,input:c.input,expectedFactors:c.factors,options,result,sampledRam:memory.summary(mark)});
    console.log('Measured '+c.id+' '+JSON.stringify(options)+' '+result.status+' '+result.reason);
  };
  const c=selected.find(c=>c.id===caseId);if(!c)throw Error('Fixed case');
  const options={mode:variant,timeBudgetMs:budgetMs,operationBudget:50000000,seed};
  let lifecycle=null;
  if(mode==='primary')await measure(c,options);
  else if(mode==='lifecycle'){
    lifecycle={};
    for(const when of ['loading','running']){
      const value=await evaluate('evaluationHarness.cancel('+JSON.stringify(c.input)+','+JSON.stringify(options)+','+JSON.stringify(when)+')');
      verifyStagedOutcome(value.result,c.input);assert.equal(value.result.allWorkersDisposed,true);
      if(value.aborted)assert.equal(value.result.status,'cancelled');else assert.ok(['complete','probable','incomplete'].includes(value.result.status));
      lifecycle[when]=value;
    }
    if(['ecm','p64','p80'].includes(variant)){
      const value=await evaluate('evaluationHarness.fatalRecovery('+JSON.stringify(c.input)+','+JSON.stringify(options)+')');
      assert.equal(value.failure.message,'computation-error');assert.equal(value.failure.allWorkersDisposed,true);
      assert.equal(value.failure.audit.siqs?.nativeLogical??0,0);verifyStagedOutcome(value.recovered,c.input);lifecycle.fatal=value;
    }
    await measure(c,options);
  }else throw Error('Mode');
  const ownership=await evaluate('evaluationHarness.ownership()');assert.equal(ownership.live,0);assert.ok(ownership.maxLive<=1);
  assert.deepEqual(await evaluate('evaluationHarness.violations'),[]);
  assert.deepEqual(await evaluate('evaluationHarness.errors'),[]);
  assert.deepEqual(await evaluate('evaluationHarness.rejections'),[]);
  assert.equal(requests.length,0);assert.equal(http.length,0);assert.deepEqual(badEvents,[]);assert.deepEqual(fatal,[]);
  await memory.stop();
  const sourceFiles={};
  for(const path of ['scripts/benchmark-staged.mjs','bench/staged-'+group+'.json','scripts/browser-memory.mjs','native/siqs-v2/build-dense.json','native/siqs-v2/build-lanczos.json',...initialAssets.map(a=>a.path.slice(1))])
    sourceFiles[path]=createHash('sha256').update(await readFile(join(root,path))).digest('hex');
  for(const path of ['scripts/verify-staged-ci.mjs','scripts/generate-staged-ci.mjs','scripts/chrome-startup.mjs'])sourceFiles[path]=createHash('sha256').update(await readFile(join(root,path))).digest('hex');
  const receipt={ciHarness:{source:'scripts/verify-staged-ci.mjs',originalSha256:"8fd69abba55c4826c434fec512650cf8e4578772ab3e6e97b774e72bd63a47dd",chromeStartup:startup.diagnostics()},mode,variant,caseId,group,seed,budgetMs,lifecycle,measuredHead:process.env.PRIME_MEASURED_HEAD??null,measuredAt:new Date().toISOString(),browser,browserDevice,
    host:{platform:platform(),release:release(),cpu:cpus()[0]?.model,logicalCpus:cpus().length,memoryBytes:totalmem(),headless:true},
    coldReadyMs,initialAssets,sourceFiles,records,ownership,sampledRam:memory.summary(),
    quiet:{networkRequests:0,httpRequests:0,badEvents:0,assetServerStopped:true,cacheDisabled:true},
    limits:{operationBudget:50000000,wholeRam:'sampled Chrome tree RSS/PSS, not a hard bound or instantaneous peak',
      workerAudit:'terminal observations; cancelled worker has no terminal native audit',profile:'request includes Worker compile/init, computation, delivery and proof; one host deadline; unavailable terminated trace is null'}};
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
  try { if(socket?.readyState===WebSocket.OPEN&&pageSession)diagnostic = await evaluate('({phase:globalThis.evaluationHarness?.controller.phase,violations:globalThis.evaluationHarness?.violations,errors:globalThis.evaluationHarness?.errors})'); } catch {}
  console.error(JSON.stringify({startup:startup?.diagnostics(),fatal,badEvents,requests,diagnostic,attached,pending:[...pending.values()].map(v=>v.method)}));
  throw error;
} finally {
  startup?.dispose();
  if (memory?.running) await memory.stop();
  if (socket?.readyState === WebSocket.OPEN) { try { await send('Browser.close'); } catch {} socket.close(); }
  for (const call of pending.values()) { clearTimeout(call.timer); call.reject(Error('Browser closed')); }
  chrome?.kill();
  if (chrome && chrome.exitCode === null) await new Promise(resolveExit => { const timer=setTimeout(resolveExit,2000); chrome.once('exit',()=>{clearTimeout(timer);resolveExit();}); });
  if (server) await new Promise(resolveClose => server.close(resolveClose));
  if (temporary.startsWith(join(tmpdir(), 'prime-browser-'))) await rm(temporary, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}

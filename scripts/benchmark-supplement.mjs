import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { resolve, join, extname, sep } from 'node:path';
import { tmpdir, cpus, totalmem, platform, release } from 'node:os';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { makeCorpus } from '../bench/corpus.mjs';
import { makeCandidateCorpus } from '../bench/candidate-corpus.mjs';
import { makeAdvancedCorpus } from '../bench/advanced-corpus.mjs';
import { BrowserMemorySampler } from './browser-memory.mjs';
import { verifySnapshot } from '../src/engine/result.js';

const root = resolve(import.meta.dirname, '..');
const quick = process.argv.includes('--quick');
const outIndex = process.argv.indexOf('--out');
const output = outIndex >= 0 ? resolve(process.argv[outIndex + 1]) : join(tmpdir(), 'prime-browser-receipt.json');
const advanced = process.argv.includes('--advanced');
const candidates = true, siqs = true;
if (candidates && advanced) throw Error('Choose one comparison mode');
const mode=process.argv.includes('--mode')?process.argv[process.argv.indexOf('--mode')+1]:'quick';
const corpus=[...makeCandidateCorpus(false),...JSON.parse(await readFile(join(root,'bench/selection-holdout.json')))];
const ids=['balanced-13-0','balanced-96bit-0','balanced-112bit-0','holdout-balanced-80','holdout-balanced-112'];
const selected=ids.map(id=>{const c=corpus.find(c=>c.id===id);if(!c)throw Error(id);return c;});
const temporary = await mkdtemp(join(tmpdir(), 'prime-browser-'));
const http = [], requests = [], badEvents = [], localBlobs = [], sessions = new Set(), fatal = [];
let chrome, socket, server, pageSession, memory, sequence = 0;
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
  memory = new BrowserMemorySampler(chrome.pid); await memory.start();
  const debuggingUrl = await new Promise((resolveUrl, rejectUrl) => {
    let stderr = '';
    const timer = setTimeout(() => rejectUrl(Error('Chrome startup timed out: ' + stderr.slice(-1000))), 15000);
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
  await send('Page.navigate', { url: origin + '/bench/evaluation.html' }, pageSession);
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
    await memory.sample();verifySnapshot(result,c.input);
    if(['complete','probable'].includes(result.status))assert.deepEqual(result.factors.map(f=>f.value),c.factors);
    assert.equal(result.allLanesDisposed,true);
    records.push({case:c.id,input:c.input,expectedFactors:c.factors,options,result,sampledRam:memory.summary(mark)});
    console.log('Measured '+c.id+' '+JSON.stringify(options)+' '+result.status+' '+result.reason);
  };
  if(mode==='long'){
    await measure({id:'siqs-smoke',input:'1000000000100000000002379',factors:['1000000000039','1000000000061']},{kind:'siqs',computeMs:10000,totalMs:15100,seed:1});
    for(const c of selected)for(const computeMs of [10000,30000])
      await measure(c,{kind:'siqs',computeMs,totalMs:computeMs+5100,seed:c.id.startsWith('holdout')?23:1});
    for(const c of selected)await measure(c,{kind:'profile',computeMs:10000,totalMs:15100,seed:c.id.startsWith('holdout')?23:1});
  }else if(mode==='pool'){
    const id=process.argv[process.argv.indexOf('--case')+1],c=corpus.find(c=>c.id===id);
    if(!c||!['balanced-13-0','balanced-96bit-0','balanced-112bit-0','holdout-balanced-112','holdout-unbalanced-m127'].includes(id))throw Error('Fixed pool case');
    await measure(c,{kind:'ecm',workers:Number(process.argv[process.argv.indexOf('--workers')+1]),seed:Number(process.argv[process.argv.indexOf('--seed')+1]),totalMs:1000});
  }else if(mode==='pm1'){
    const controls=JSON.parse(await readFile(join(root,'bench/pm1-controls.json')));
    for(const c of [...controls,...selected,...corpus.filter(c=>c.id==='holdout-unbalanced-m127')])
      for(const base of [2,3])await measure(c,{kind:'pm1',base,totalMs:1000});
  }else if(mode==='quick'){
    const c={id:'control',input:'10403',factors:['101','103']};
    for(const workers of [1,2])await measure(c,{kind:'ecm',workers,totalMs:1000});
    await measure({id:'pm1-positive',input:'1009003027',factors:['1009','1000003']},{kind:'pm1',totalMs:1000});
    await measure({id:'siqs-smoke',input:'1000000000100000000002379',factors:['1000000000039','1000000000061']},{kind:'profile',computeMs:10000,totalMs:15100});
    const hard=selected[2].input;
    const cancelled=await evaluate('evaluationHarness.cancel('+JSON.stringify(hard)+',{kind:"ecm",workers:2,totalMs:10000})');
    assert.equal(cancelled.status,'cancelled');assert.equal(cancelled.allLanesDisposed,true);
    await measure(c,{kind:'ecm',workers:2,totalMs:1000});
  }else throw Error('Mode');
  const ownership=await evaluate('evaluationHarness.ownership()');assert.equal(ownership.live,0);assert.ok(ownership.maxLive<=2);
  assert.deepEqual(await evaluate('evaluationHarness.violations'),[]);
  assert.deepEqual(await evaluate('evaluationHarness.errors'),[]);
  assert.deepEqual(await evaluate('evaluationHarness.rejections'),[]);
  assert.equal(requests.length,0);assert.equal(http.length,0);assert.deepEqual(badEvents,[]);assert.deepEqual(fatal,[]);
  await memory.stop();
  const sourceFiles={};
  for(const path of ['scripts/benchmark-supplement.mjs','scripts/browser-memory.mjs','native/gmp/supplement-build.json',...initialAssets.map(a=>a.path.slice(1))])
    sourceFiles[path]=createHash('sha256').update(await readFile(join(root,path))).digest('hex');
  const receipt={mode,measuredHead:process.env.PRIME_MEASURED_HEAD??null,measuredAt:new Date().toISOString(),browser,browserDevice,
    host:{platform:platform(),release:release(),cpu:cpus()[0]?.model,logicalCpus:cpus().length,memoryBytes:totalmem(),headless:true},
    coldReadyMs,initialAssets,sourceFiles,records,ownership,sampledRam:memory.summary(),
    quiet:{networkRequests:0,httpRequests:0,badEvents:0,assetServerStopped:true,cacheDisabled:true},
    limits:{operationBudget:50000000,wholeRam:'sampled Chrome tree RSS/PSS, not a hard bound or instantaneous peak',
      workerAudit:'terminal/progress observations only; terminated loser may have unreported final curve',profile:'last split approximate callback interval wall including JS/import/budget/output validation; additional phase clock sampling, not primary timing'}};
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
  try { diagnostic = await evaluate('({phase:globalThis.evaluationHarness?.controller.phase,violations:globalThis.evaluationHarness?.violations,errors:globalThis.evaluationHarness?.errors})'); } catch {}
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

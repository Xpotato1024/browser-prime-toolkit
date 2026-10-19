import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { resolve, join, extname, sep } from 'node:path';
import { tmpdir, cpus, totalmem, platform, release } from 'node:os';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { makeCorpus } from '../bench/corpus.mjs';
import { verifySnapshot } from '../src/engine/result.js';

const root = resolve(import.meta.dirname, '..');
const quick = process.argv.includes('--quick');
const outIndex = process.argv.indexOf('--out');
const output = outIndex >= 0 ? resolve(process.argv[outIndex + 1]) : join(tmpdir(), 'prime-browser-receipt.json');
const corpus = makeCorpus(quick);
const temporary = await mkdtemp(join(tmpdir(), 'prime-browser-'));
const http = [], requests = [], badEvents = [], localBlobs = [], sessions = new Set(), fatal = [];
let chrome, socket, server, pageSession, sequence = 0;
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
        'Content-Security-Policy': "default-src 'none'; script-src 'self'; worker-src blob:; connect-src 'none'; img-src data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'" });
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
  await send('Page.navigate', { url: origin + '/bench/harness.html' }, pageSession);
  for (let i = 0; i < 200; i++) {
    if (await evaluate('!!globalThis.factorHarness')) break;
    await new Promise(resolveWait => setTimeout(resolveWait, 25));
  }
  await evaluate('factorHarness.ready()');
  const coldReadyMs = performance.now() - coldStarted;
  const browserDevice = await evaluate('({userAgent:navigator.userAgent,cores:navigator.hardwareConcurrency,memoryGiB:navigator.deviceMemory})');
  assert.ok(requests.length > 3, 'Actual local source assets loaded');
  assert.ok(requests.every(r => r.url.startsWith(origin + '/')), 'Only same-origin initial assets');
  assert.equal(fatal.length, 0);
  requests.length = 0; http.length = 0; badEvents.length = 0; localBlobs.length = 0;
  const records = [];
  for (const algorithm of ['brent', 'floyd']) for (const testCase of corpus) {
    for (const timeBudgetMs of quick ? [50] : [100, 1000]) for (const seed of quick ? [1] : [1, 2, 3]) {
      const options = { algorithm, seed, timeBudgetMs, operationBudget: 50000000 };
      const result = await evaluate('factorHarness.run(' + JSON.stringify(testCase.input) + ',' + JSON.stringify(options) + ')');
      verifySnapshot(result, testCase.input);
      if (result.status === 'complete') assert.deepEqual(result.factors.map(f => f.value), testCase.factors);
      else assert.equal(result.status, 'incomplete');
      records.push({ case: testCase.id, ...options, ...result });
    }
    console.log('Measured ' + algorithm + ' ' + testCase.id);
  }
  const online = await evaluate('factorHarness.run("1000036000099",{timeBudgetMs:1000})');
  console.log('Offline: apply page emulation');
  await networkOffline(true);
  server.closeAllConnections();
  await new Promise(resolveClose => server.close(resolveClose));
  console.log('Offline: asset server stopped');
  const offlineResult = await evaluate('factorHarness.run("1000036000099",{timeBudgetMs:1000})');
  assert.deepEqual(offlineResult.factors, online.factors);
  assert.equal(offlineResult.status, online.status);
  const hard = ((2n ** 127n - 1n) * (2n ** 107n - 1n)).toString();
  console.log('Offline: cancellation and restart');
  const cancelled = await evaluate('factorHarness.cancelRun(' + JSON.stringify(hard) + ')');
  assert.equal(cancelled.cancelled, true); assert.equal(cancelled.result.status, 'cancelled');
  verifySnapshot(cancelled.result, hard);
  assert.ok(cancelled.heartbeat > 0, 'Main thread timer remains responsive');
  const restarted = await evaluate('factorHarness.run("12",{timeBudgetMs:1000})');
  assert.equal(restarted.status, 'complete');
  assert.equal(requests.length, 0, 'No ready-after network requests, including cancelled worker restart');
  assert.equal(http.length, 0, 'HTTP server sees no ready-after request');
  assert.deepEqual(badEvents, []); assert.deepEqual(fatal, []);
  assert.deepEqual(await evaluate('factorHarness.violations'), []);
  assert.deepEqual(await evaluate('factorHarness.rejections'), []);
  assert.deepEqual(await evaluate('factorHarness.errors'), []);
  const quiet = { networkRequests: requests.length, httpRequests: http.length, badEvents: badEvents.length,
    localBlobEvents: localBlobs.length, observedWorkerSessions: attached.filter(t=>t.type==='worker').length,
    workerOfflineEmulation: 'unsupported by Worker target; page offline plus stopped asset server', assetServerStoppedDuringOffline: true, cacheDisabled: true,
    offlineSameFactors: true, cancelledAndRestartedOffline: true };
  console.log('Detector self-test');
  await networkOffline(false); console.log('Detector: page online');
  await new Promise(resolveListen => server.listen(port,'127.0.0.1',resolveListen)); console.log('Detector: server online');
  await evaluate('fetch("/blocked-probe").catch(()=>null)'); console.log("Detector: blocked fetch returned");
  assert.ok((await evaluate('factorHarness.violations')).some(v => v.directive === 'connect-src'));
  assert.equal(await evaluate('factorHarness.verifyCspAudit()'),true);
  assert.ok(!http.includes('/blocked-worker-probe'));
  await send('Page.navigate', { url: origin + '/probe' }, pageSession);
  for (let i = 0; i < 100 && !http.includes('/probe'); i++) await new Promise(resolveWait => setTimeout(resolveWait, 10));
  assert.ok(http.includes('/probe')); assert.ok(requests.some(r => r.url === origin + '/probe'));
  const probeCode = 'fetch(' + JSON.stringify(origin + '/worker-probe') + ').then(()=>self.postMessage("observed")).catch(e=>self.postMessage("failed:"+e));';
  await evaluate('new Promise((resolve,reject)=>{const url=URL.createObjectURL(new Blob(['+JSON.stringify(probeCode)+'],{type:"text/javascript"}));const worker=new Worker(url,{type:"module"});worker.onmessage=e=>{URL.revokeObjectURL(url);worker.terminate();e.data==="observed"?resolve(true):reject(Error(e.data));};worker.onerror=e=>reject(Error(e.message));})');
  assert.ok(http.includes('/worker-probe'));
  assert.ok(requests.some(r=>r.url===origin+'/worker-probe'&&r.sessionId!==pageSession));
  const artifact = await readFile(join(root, 'src/worker/worker-source.js'));
  const sourceFiles = {};
  for (const path of ['src/core/integer-input.js','src/engine/options.js','src/engine/arithmetic.js',
    'src/engine/result.js','src/engine/factor.js','src/worker/controller.js','src/worker/factory.js',
    'bench/corpus.mjs','bench/harness.js','scripts/benchmark-browser.mjs']) {
    sourceFiles[path] = createHash('sha256').update(await readFile(join(root,path))).digest('hex');
  }
  const receipt = { sourceFiles, measuredAt: new Date().toISOString(), quick, browser, browserDevice,
    host: { platform: platform(), release: release(), cpu: cpus()[0]?.model, logicalCpus: cpus().length,
      memoryBytes: totalmem(), powerState: 'not measured', peakWorkerHeapBytes: null, headless: true, nativeThreads: 1, wasm: false },
    coldReadyMs, artifact: { bytes: artifact.length, sha256: createHash('sha256').update(artifact).digest('hex') },
    generation: 'bench/corpus.mjs fixed offsets; independent trial division; outside timed region',
    corpus, records, quiet, cancelled: { wallMs: cancelled.result.wallMs, cancelMs: cancelled.cancelMs,
      heartbeat: cancelled.heartbeat, remaining: cancelled.result.remaining },
    detectorSelfTest: { blockedFetchCspObserved: true, workerCspAuditObserved: true, navigationCdpAndHttpObserved: true, workerCdpAndHttpObserved: true } };
  await writeFile(output, JSON.stringify(receipt, null, 2) + '\n');
  console.log('Browser verification passed; receipt: ' + output);
} catch (error) {
  let diagnostic;
  try { diagnostic = await evaluate('({phase:globalThis.factorHarness?.controller.phase,violations:globalThis.factorHarness?.violations,errors:globalThis.factorHarness?.errors})'); } catch {}
  console.error(JSON.stringify({fatal,badEvents,requests,diagnostic,attached,pending:[...pending.values()].map(v=>v.method)}));
  throw error;
} finally {
  if (socket?.readyState === WebSocket.OPEN) { try { await send('Browser.close'); } catch {} socket.close(); }
  for (const call of pending.values()) { clearTimeout(call.timer); call.reject(Error('Browser closed')); }
  chrome?.kill();
  if (chrome && chrome.exitCode === null) await new Promise(resolveExit => { const timer=setTimeout(resolveExit,2000); chrome.once('exit',()=>{clearTimeout(timer);resolveExit();}); });
  if (server) await new Promise(resolveClose => server.close(resolveClose));
  if (temporary.startsWith(join(tmpdir(), 'prime-browser-'))) await rm(temporary, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}

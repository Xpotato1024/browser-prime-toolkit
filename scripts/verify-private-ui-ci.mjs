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
import { verifyStagedOutcome } from '../src/engine/staged-result.js';

const root = resolve(import.meta.dirname, '..');
const arg=(key,fallback)=>process.argv.includes(key)?process.argv[process.argv.indexOf(key)+1]:fallback;
const output=resolve(arg('--out',join(tmpdir(),'staged-receipt.json')));
try{await access(output);throw Error('Refusing to overwrite '+output);}catch(e){if(e.code!=='ENOENT')throw e;}
const mode='private-ui',variant='p64',caseId='ui-contracts',group='ui',seed=1,budgetMs=1000;
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
      if (!url.pathname.startsWith('/src/') && !url.pathname.startsWith('/bench/') && !url.pathname.startsWith('/app/')) throw Error('Not an asset');
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
  await send('Page.navigate', { url: origin + '/bench/private-ui.html' }, pageSession);
  for (let i = 0; i < 200; i++) {
    if (await evaluate('!!globalThis.evaluationHarness')) break;
    await new Promise(resolveWait => setTimeout(resolveWait, 25));
  }
  await evaluate('evaluationHarness.ownership()');
  await send('Browser.grantPermissions',{origin,permissions:['clipboardReadWrite','clipboardSanitizedWrite']});
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
  await evaluate('document.getElementById("integer-input").value="";document.getElementById("integer-input").focus()');
  await send('Input.insertText',{text:'0'.repeat(4095)+'123'},pageSession);
  assert.equal(await evaluate('document.getElementById("integer-input").value.length'),4098,'Native insertion must never silently truncate an integer');
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r'},pageSession);
  await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13},pageSession);
  assert.equal(await evaluate('evaluationHarness.state().phase'),'invalid','Overlong input is rejected in full');
  const checks=await evaluate('evaluationHarness.run()');console.log(JSON.stringify(checks));
  assert.ok(checks.tests.every(t=>t.pass),JSON.stringify(checks.tests.filter(t=>!t.pass)));
  const expected=await evaluate('evaluationHarness.restore()');
  await evaluate('document.getElementById("copy-result").click()');
  for(let i=0;i<100;i++){if(await evaluate('document.getElementById("copy-status").textContent.includes("コピーしました")'))break;await new Promise(r=>setTimeout(r,10));}
  assert.equal(await evaluate('(async()=>await navigator.clipboard.readText()==='+JSON.stringify(expected)+')()'),true,'Isolated clipboard roundtrip');
  await evaluate('document.getElementById("integer-input").value="32";document.getElementById("integer-input").focus()');
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r'},pageSession);
  await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13},pageSession);
  for(let i=0;i<100;i++){if(await evaluate('evaluationHarness.state().view?.equation==="32 = 2^5"'))break;await new Promise(r=>setTimeout(r,10));}
  assert.equal(await evaluate('evaluationHarness.state().view?.equation'), '32 = 2^5','Enter submits exact input');
  await evaluate('document.getElementById("integer-input").focus()');
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9},pageSession);
  await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9},pageSession);
  assert.equal(await evaluate('document.activeElement.id'),'start-computation','Keyboard focus order');
  const ax=await send('Accessibility.getFullAXTree',{},pageSession);
  assert.ok(ax.nodes.some(n=>n.role?.value==='textbox'&&n.name?.value==='整数'));
  assert.ok(ax.nodes.some(n=>n.role?.value==='math'&&n.name?.value==='32 は 2の5乗'));
  if(process.env.PRIME_UI_SCREENSHOTS){const png=await send('Page.captureScreenshot',{captureBeyondViewport:true},pageSession);await writeFile(process.env.PRIME_UI_SCREENSHOTS+'-desktop.png',Buffer.from(png.data,'base64'));}
  await send('Emulation.setDeviceMetricsOverride',{width:320,height:812,deviceScaleFactor:1,mobile:true},pageSession);
  assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true,'320px has no horizontal overflow');
  if(process.env.PRIME_UI_SCREENSHOTS){const png=await send('Page.captureScreenshot',{captureBeyondViewport:true},pageSession);await writeFile(process.env.PRIME_UI_SCREENSHOTS+'-mobile.png',Buffer.from(png.data,'base64'));}
  records.push({checks:checks.tests,clipboardRoundtrip:true,keyboard:true,mathAccessibleName:true,mobile320:true,nativeOverlongRejected:true});const lifecycle=null;
  const ownership=await evaluate('evaluationHarness.ownership()');assert.equal(ownership.live,0);assert.ok(ownership.maxLive<=1);
  assert.deepEqual(await evaluate('evaluationHarness.violations'),[]);
  assert.deepEqual(await evaluate('evaluationHarness.errors'),[]);
  assert.deepEqual(await evaluate('evaluationHarness.rejections'),[]);
  assert.equal(requests.length,0);assert.equal(http.length,0);assert.deepEqual(badEvents,[]);assert.deepEqual(fatal,[]);
  await memory.stop();
  const sourceFiles={};
  for(const path of ['scripts/verify-private-ui-ci.mjs','scripts/verify-private-ui.mjs','scripts/browser-memory.mjs','native/siqs-v2/build-dense.json','native/siqs-v2/build-lanczos.json',...initialAssets.map(a=>a.path.slice(1))])
    sourceFiles[path]=createHash('sha256').update(await readFile(join(root,path))).digest('hex');
  const receipt={mode,variant,caseId,group,seed,budgetMs,lifecycle,measuredHead:process.env.PRIME_MEASURED_HEAD??null,measuredAt:new Date().toISOString(),browser,browserDevice,
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

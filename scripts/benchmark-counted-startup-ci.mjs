// Generated CI-only lifecycle adapter. Historical measurement source and receipts remain frozen.
import {createCiBrowserLifecycle,ciHarnessIdentity} from './chrome-ci-lifecycle.mjs';
import {assertCiArguments} from './chrome-ci-transform.mjs';
assertCiArguments(process.argv.slice(2),{"args":{"--out":"path","--mode":["lifecycle"],"--variant":["legacy","clock-gated","dense","lanczos"]},"required":{"--mode":"lifecycle"}});
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
const mode=process.argv.includes('--mode')?process.argv[process.argv.indexOf('--mode')+1]:'primary';
const arg=(key,fallback)=>process.argv.includes(key)?process.argv[process.argv.indexOf(key)+1]:fallback;
const variant=arg('--variant','dense'),caseId=arg('--case','balanced-13-0'),budgetMs=Number(arg('--budget','10000'));
if(!['legacy','clock-gated','dense','lanczos'].includes(variant)||![1000,10000].includes(budgetMs))throw Error('Fixed variant/budget');
const corpus=[...makeCandidateCorpus(false),...JSON.parse(await readFile(join(root,'bench/selection-holdout.json')))];
const ids=['balanced-13-0','balanced-96bit-0','balanced-112bit-0','holdout-balanced-80','holdout-balanced-112'];
const selected=ids.map(id=>{const c=corpus.find(c=>c.id===id);if(!c)throw Error(id);return c;});
const temporary = await mkdtemp(join(tmpdir(), 'prime-browser-'));
const http = [], requests = [], badEvents = [], localBlobs = [], sessions = new Set(), fatal = [];
let chrome, socket, server, pageSession, memory, sequence = 0;
const pending = new Map(), attached = [];
const ciHarness=ciHarnessIdentity(import.meta.url,"scripts/benchmark-counted.mjs","7222f66dde3ead7ac46d193367983f98053e8751da17151cf118443caffb7f9e","scripts/generate-chrome-ci.mjs");
const ciChrome=createCiBrowserLifecycle({getChrome:()=>chrome,getSocket:()=>socket,getMemory:()=>memory,getServer:()=>server,getSession:()=>pageSession,pending,nextId:()=>++sequence,timeoutForMethod:method=>method === 'Runtime.evaluate' ? 65000 : 5000,profile:temporary});
const send=(method,params={},sessionId)=>ciChrome.send(method,params,sessionId);
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
    { detached:true, stdio: ['ignore', 'ignore', 'pipe'], env: process.env, windowsHide: true });
  ciChrome.observe({timeoutMs:15000});
  memory = new BrowserMemorySampler(chrome.pid); await ciChrome.setup(()=>memory.start());
  socket=new WebSocket(await ciChrome.ready());
  await ciChrome.connect(socket);
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
  await send('Page.navigate', { url: origin + '/bench/counted.html' }, pageSession);
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
  const c=selected.find(c=>c.id===caseId);if(!c)throw Error('Fixed case');
  const options={variant,computeMs:budgetMs,totalMs:budgetMs+5100,seed:c.id.startsWith('holdout')?23:1};
  let lifecycle=null;
  if(mode==='primary')await measure(c,options);
  else if(mode==='diagnostic')await measure(c,{...options,computeMs:10000,totalMs:15100,profile:true,capture:variant==='dense'||variant==='lanczos'});
  else if(mode==='lifecycle'){
    lifecycle={};
    for(const when of ['loading','running']){
      const result=await evaluate('evaluationHarness.cancel('+JSON.stringify(c.input)+','+JSON.stringify({...options,computeMs:10000,totalMs:15100})+','+JSON.stringify(when)+')');
      assert.equal(result.status,'cancelled');assert.equal(result.allLanesDisposed,true);lifecycle[when]=result;
    }
    if(variant!=='legacy'){
      const recovered=await evaluate('evaluationHarness.fatalRecovery('+JSON.stringify(c.input)+','+JSON.stringify({...options,computeMs:10000,totalMs:15100})+')');
      assert.equal(recovered.rejected,true);assert.ok(['complete','probable'].includes(recovered.recovered.status));lifecycle.fatal=recovered;
    }
    await measure(c,{...options,computeMs:10000,totalMs:15100});
  }else throw Error('Mode');
  const ownership=await evaluate('evaluationHarness.ownership()');assert.equal(ownership.live,0);assert.ok(ownership.maxLive<=1);
  assert.deepEqual(await evaluate('evaluationHarness.violations'),[]);
  assert.deepEqual(await evaluate('evaluationHarness.errors'),[]);
  assert.deepEqual(await evaluate('evaluationHarness.rejections'),[]);
  assert.equal(requests.length,0);assert.equal(http.length,0);assert.deepEqual(badEvents,[]);assert.deepEqual(fatal,[]);
  await memory.stop();
  const sourceFiles={};
  for(const path of ['scripts/benchmark-counted.mjs','scripts/browser-memory.mjs','native/siqs-v2/build-dense.json','native/siqs-v2/build-lanczos.json',...initialAssets.map(a=>a.path.slice(1))])
    sourceFiles[path]=createHash('sha256').update(await readFile(join(root,path))).digest('hex');
  Object.assign(sourceFiles,ciHarness.sourceFiles);
  const receipt={ciExecution:{...ciHarness,chromeStartup:ciChrome.diagnostics()},mode,variant,caseId,budgetMs,lifecycle,measuredHead:process.env.PRIME_MEASURED_HEAD??null,measuredAt:new Date().toISOString(),browser,browserDevice,
    host:{platform:platform(),release:release(),cpu:cpus()[0]?.model,logicalCpus:cpus().length,memoryBytes:totalmem(),headless:true},
    coldReadyMs,initialAssets,sourceFiles,records,ownership,sampledRam:memory.summary(),
    quiet:{networkRequests:0,httpRequests:0,badEvents:0,assetServerStopped:true,cacheDisabled:true},
    limits:{operationBudget:50000000,wholeRam:'sampled Chrome tree RSS/PSS, not a hard bound or instantaneous peak',
      workerAudit:'terminal observations; cancelled worker has no terminal native audit',profile:'separate last-split callback-interval wall, includes JS/import/budget/output validation; not pure C or primary timing'}};
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
  ciChrome.noteFailure(error);
  console.error(JSON.stringify({chromeStartup:ciChrome.diagnostics(),ciExecution:ciHarness}));
  let diagnostic;
  try { diagnostic = await ciChrome.diagnostic('({phase:globalThis.evaluationHarness?.controller.phase,violations:globalThis.evaluationHarness?.violations,errors:globalThis.evaluationHarness?.errors})'); } catch {}
  console.error(JSON.stringify({fatal,badEvents,requests,diagnostic,attached,pending:[...pending.values()].map(v=>v.method)}));
  throw error;
} finally {
  await ciChrome.cleanup();
}

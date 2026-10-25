// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
const read=p=>readFileSync(p,'utf8'),write=(p,t)=>{if(process.argv.includes('--check'))assert.equal(read(p),t,p);else writeFileSync(p,t);};
const rep=(s,a,b)=>{assert.equal(s.split(a).length,2,'Resieve harness anchor '+a.slice(0,100));return s.replace(a,b);};
let h=read('bench/collection-profile.js');
h=rep(h,"import {collectionWorkerSource as graphWorkerSource} from '../src/collection-profile/worker-source.js';","import {resieveWorkerSource as graphWorkerSource} from '../src/resieve-followup/worker-source.js';");
h=rep(h,"import {attachCollectionPort} from '../src/collection-profile/bridge.js';","import {attachResievePort as attachCollectionPort} from '../src/resieve-followup/worker-source.js';");
h=rep(h,"['baseline','instrumented','resieve4','sparse'].includes(v)","['baseline','resieve1','rank'].includes(v)");
write('bench/resieve-followup.js',h);
write('bench/resieve-followup.html',read('bench/collection-profile.html').replace('./collection-profile.js','./resieve-followup.js'));
let a=read('scripts/collection-profile-asset-route.mjs');
a=rep(a,'const assets=new Set([','const assets=new Set(["bench/resieve-followup.html","bench/resieve-followup.js","src/resieve-followup/worker-source.js","src/resieve-followup/wasm-resieve1-1024.js","src/resieve-followup/wasm-rank-1024.js",');
a=a.replace('collectionAsset','resieveAsset');write('scripts/resieve-followup-asset-route.mjs',a);
let v=read('scripts/verify-collection-profile.mjs');
v=rep(v,"import {collectionAsset as coordinatorAsset} from './collection-profile-asset-route.mjs';","import {resieveAsset as coordinatorAsset} from './resieve-followup-asset-route.mjs';");
v=rep(v,"['baseline','instrumented','resieve4','sparse'].includes(graphVariant)","['baseline','resieve1','rank'].includes(graphVariant)");
v=v.replaceAll('/bench/collection-profile.html','/bench/resieve-followup.html');
v=rep(v,'  receipt.graphSourceFiles={};','  receipt.graphSourceFiles={};\n  for(const p of ["scripts/generate-resieve-followup.mjs","scripts/verify-resieve-followup.mjs","scripts/resieve-followup-asset-route.mjs","scripts/build-resieve-followup.mjs","native/resieve-followup/patch-source.mjs","native/resieve-followup/oracle.rs","native/resieve-followup/build-resieve1-1024.json","native/resieve-followup/build-rank-1024.json","src/resieve-followup/worker-source.js","docs/contracts/resieve-followup.md"])receipt.graphSourceFiles[p]=createHash("sha256").update(await readFile(join(root,p))).digest("hex");');

// Keep numeric/generated ancestors frozen; harden only this diagnostic consumer.
v=rep(v,"import { WideMemorySampler as BrowserMemorySampler } from './wide-window-memory.mjs';","import { WideMemorySampler as BrowserMemorySampler } from './wide-window-memory.mjs';\nimport {observeChromeStartup,openChromeTransport,createCdpSender} from './chrome-startup.mjs';");
v=rep(v,"let chrome, socket, server, pageSession, memory, hardTimer, sequence = 0;","let chrome, socket, server, pageSession, memory, hardTimer, startup, sequence = 0;");
const sendStart=v.indexOf('const send = (method, params = {}, sessionId) => new Promise('),sendEnd=v.indexOf('const evaluate = async expression =>',sendStart);
assert.ok(sendStart>=0&&sendEnd>sendStart);
v=v.slice(0,sendStart)+"const send=createCdpSender({getSocket:()=>socket,pending,nextId:()=>++sequence,timeoutForMethod:method=>method==='Page.navigate'?30000:method==='Runtime.evaluate'?budgetMs+20000:5000});\n"+v.slice(sendEnd);
v=rep(v,"  hardTimer=setTimeout(","  startup=observeChromeStartup(chrome,temporary);\n  hardTimer=setTimeout(");
const readyStart=v.indexOf('  const debuggingUrl = await new Promise('),readyEnd=v.indexOf("  socket.addEventListener('message'",readyStart);
assert.ok(readyStart>=0&&readyEnd>readyStart);
v=v.slice(0,readyStart)+"  const debuggingUrl=await startup.ready;\n  socket=new WebSocket(debuggingUrl);\n  await openChromeTransport(socket,{timeoutMs:Math.max(0,30000-startup.diagnostics().elapsedMs)});\n"+v.slice(readyEnd);
v=rep(v,"  receipt.graphSourceFiles={};","  receipt.chromeStartup=startup.diagnostics();\n  receipt.graphSourceFiles={};\n  receipt.graphSourceFiles['scripts/chrome-startup.mjs']=createHash('sha256').update(await readFile(join(root,'scripts/chrome-startup.mjs'))).digest('hex');");
v=rep(v,"const failure={kind:'harness-failure',","const failure={chromeStartup:startup?.diagnostics()??null,kind:'harness-failure',");
v=rep(v,"  try { diagnostic = await evaluate(","  try { if(socket?.readyState===WebSocket.OPEN&&pageSession)diagnostic = await evaluate(");
v=rep(v,"JSON.stringify({startupTrace,chromeStderr,fatal","JSON.stringify({chromeStartup:startup?.diagnostics()??null,startupTrace,chromeStderr,fatal");
v=rep(v,"    closeTransport:async()=>{","    closeTransport:async()=>{\n      startup?.dispose();");

write('scripts/verify-resieve-followup.mjs',v);
console.log('Derived uninstrumented resieve variants; source, resource, offline and retirement contracts preserved');

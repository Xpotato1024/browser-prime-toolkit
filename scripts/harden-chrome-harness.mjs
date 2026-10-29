// SPDX-License-Identifier: AGPL-3.0-only
// Harden a diagnostic consumer without modifying its numeric/frozen ancestors.
import assert from 'node:assert/strict';
export function hardenChromeHarness(source){
 let v=source;
 const rep=(s,a,b)=>{assert.equal(s.split(a).length,2,'Chrome harness anchor '+a.slice(0,100));return s.replace(a,b);};
// Keep numeric/generated ancestors frozen; harden only this diagnostic consumer.
v=rep(v,"import { WideMemorySampler as BrowserMemorySampler } from './wide-window-memory.mjs';","import { WideMemorySampler as BrowserMemorySampler } from './wide-window-memory.mjs';\nimport {observeChromeStartup,openChromeTransport,createCdpSender} from './chrome-startup.mjs';");
v=rep(v,"let chrome, socket, server, pageSession, memory, hardTimer, sequence = 0;","let chrome, socket, server, pageSession, memory, hardTimer, startup, sequence = 0;");
const sendStart=v.indexOf('const send = (method, params = {}, sessionId) => new Promise('),sendEnd=v.indexOf('const evaluate = async expression =>',sendStart);
assert.ok(sendStart>=0&&sendEnd>sendStart);
v=v.slice(0,sendStart)+"const send=createCdpSender({getSocket:()=>socket,pending,nextId:()=>++sequence,timeoutForMethod:method=>method==='Page.navigate'?30000:method==='Runtime.evaluate'?budgetMs+20000:5000});\n"+v.slice(sendEnd);
v=rep(v,"  hardTimer=setTimeout(","  startup=observeChromeStartup(chrome,temporary);\n  hardTimer=setTimeout(");
const readyStart=v.indexOf('  const debuggingUrl = await new Promise('),readyEnd=v.indexOf("  socket.addEventListener('message'",readyStart);
assert.ok(readyStart>=0&&readyEnd>readyStart);
v=v.slice(0,readyStart)+"  const debuggingUrl=await startup.ready;\n  socket=new WebSocket(debuggingUrl);\n  await openChromeTransport(socket,{remainingMs:startup.remainingMs});\n"+v.slice(readyEnd);
v=rep(v,"  receipt.graphSourceFiles={};","  receipt.chromeStartup=startup.diagnostics();\n  receipt.graphSourceFiles={};\n  receipt.graphSourceFiles['scripts/chrome-startup.mjs']=createHash('sha256').update(await readFile(join(root,'scripts/chrome-startup.mjs'))).digest('hex');");
v=rep(v,"const failure={kind:'harness-failure',","const failure={chromeStartup:startup?.diagnostics()??null,kind:'harness-failure',");
v=rep(v,"  try { diagnostic = await evaluate(","  try { if(socket?.readyState===WebSocket.OPEN&&pageSession)diagnostic = await evaluate(");
v=rep(v,"JSON.stringify({startupTrace,chromeStderr,fatal","JSON.stringify({chromeStartup:startup?.diagnostics()??null,startupTrace,chromeStderr,fatal");
v=rep(v,"    closeTransport:async()=>{","    closeTransport:async()=>{\n      startup?.dispose();");

 return v;
}

// SPDX-License-Identifier: AGPL-3.0-only
import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {PassThrough} from 'node:stream';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createServer} from 'node:http';
import {observeChromeStartup,createCdpSender} from '../scripts/chrome-startup.mjs';

const path='/devtools/browser/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
function child(){const c=new EventEmitter();c.stderr=new PassThrough();c.exitCode=null;c.signalCode=null;return c;}
async function fixture(t,reply){
 const profile=await mkdtemp(join(tmpdir(),'prime-startup-test-'));
 const c=child();let port;
 const server=createServer((req,res)=>{assert.equal(req.url,'/json/version');res.setHeader('Content-Type','application/json');res.end(JSON.stringify({webSocketDebuggerUrl:reply?.(port)??'ws://127.0.0.1:'+port+path}));});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));port=server.address().port;
 t.after(async()=>{await new Promise(r=>server.close(r));await rm(profile,{recursive:true,force:true});});
 return {profile,c,port};
}
test('live owned endpoint works without stderr banner; partial file is retried',async t=>{
 const {profile,c,port}=await fixture(t);
 const o=observeChromeStartup(c,profile,{timeoutMs:800,pollMs:5});t.after(()=>o.dispose());
 await writeFile(join(profile,'DevToolsActivePort'),String(port)+'\n');
 setTimeout(()=>void writeFile(join(profile,'DevToolsActivePort'),port+'\n'+path+'\n'),15);
 assert.equal(await o.ready,'ws://127.0.0.1:'+port+path);
 assert.equal(o.diagnostics().state,'ready');assert.equal(o.diagnostics().bannerSeen,false);
 const settled=o.diagnostics().elapsedMs;await new Promise(r=>setTimeout(r,15));assert.equal(o.diagnostics().elapsedMs,settled);
 assert.ok(!JSON.stringify(o.diagnostics()).includes('aaaaaaaa'));
});
test('foreign endpoint fails closed within the single deadline',async t=>{
 const {profile,c,port}=await fixture(t,port=>'ws://example.com:'+port+path);
 await writeFile(join(profile,'DevToolsActivePort'),port+'\n'+path);
 const o=observeChromeStartup(c,profile,{timeoutMs:300,pollMs:5});t.after(()=>o.dispose());
 await assert.rejects(o.ready,/startup timed out/);assert.match(o.diagnostics().lastProbeError,/owned endpoint/);
});
test('stderr alone does not authorize endpoint; child exit is immediate',async t=>{
 const {profile,c}=await fixture(t);
 const o=observeChromeStartup(c,profile,{timeoutMs:800,pollMs:5});t.after(()=>o.dispose());
 c.stderr.write('DevTools listening on ws://127.0.0.1:12345'+path);
 c.exitCode=9;c.emit('exit',9,null);
 await assert.rejects(o.ready,/exited before readiness/);
 assert.equal(o.diagnostics().state,'exited');assert.equal(o.diagnostics().bannerSeen,true);
 assert.ok(!JSON.stringify(o.diagnostics()).includes('aaaaaaaa'));
});
test('spawn failure rejects and removes listeners on disposal',async t=>{
 const {profile,c}=await fixture(t);
 const o=observeChromeStartup(c,profile,{timeoutMs:800});
 c.emit('error',Error('missing chrome'));await assert.rejects(o.ready,/missing chrome/);o.dispose();
 assert.equal(c.listenerCount('error'),0);assert.equal(c.listenerCount('exit'),0);assert.equal(c.stderr.listenerCount('data'),0);
});
test('missing owned port file times out, no stderr-only success or extra process',async t=>{
 const {profile,c}=await fixture(t);
 const o=observeChromeStartup(c,profile,{timeoutMs:40,pollMs:5});t.after(()=>o.dispose());
 await assert.rejects(o.ready,/startup timed out/);assert.equal(o.diagnostics().state,'timeout');
});
test('CDP sender rejects before connection without allocating pending calls',async()=>{
 const pending=new Map();let ids=0;
 const send=createCdpSender({getSocket:()=>undefined,pending,nextId:()=>++ids,timeoutForMethod:()=>20});
 await assert.rejects(send('Runtime.evaluate'),/not open/);assert.equal(ids,0);assert.equal(pending.size,0);
});
test('CDP send exception removes timer/map; live calls preserve wire payload and timeout',async()=>{
 const pending=new Map();let id=0,wire;
 let socket={readyState:1,send(){throw Error('transport gone');}};
 const send=createCdpSender({getSocket:()=>socket,pending,nextId:()=>++id,timeoutForMethod:()=>15});
 await assert.rejects(send('Runtime.evaluate'),/transport gone/);assert.equal(pending.size,0);
 socket={readyState:1,send(value){wire=JSON.parse(value);}};
 const result=send('Browser.getVersion',{x:1},'session');
 assert.deepEqual(wire,{id:2,method:'Browser.getVersion',params:{x:1},sessionId:'session'});
 const call=pending.get(2);clearTimeout(call.timer);pending.delete(2);call.resolve({ok:true});
 assert.deepEqual(await result,{ok:true});
 await assert.rejects(send('Page.navigate'),/CDP timeout/);assert.equal(pending.size,0);
});
test('unresponsive version endpoint is aborted at the same deadline',async t=>{
 const profile=await mkdtemp(join(tmpdir(),'prime-startup-test-'));
 const server=createServer(()=>{});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 t.after(async()=>{server.closeAllConnections();await new Promise(r=>server.close(r));await rm(profile,{recursive:true,force:true});});
 await writeFile(join(profile,'DevToolsActivePort'),server.address().port+'\n'+path);
 const o=observeChromeStartup(child(),profile,{timeoutMs:70,pollMs:5});t.after(()=>o.dispose());
 await assert.rejects(o.ready,/startup timed out/);assert.equal(o.diagnostics().state,'timeout');
});
test('CDP open wait rejects a close or absence of open within remaining startup time',async()=>{
 const {openChromeTransport}=await import('../scripts/chrome-startup.mjs');
 const socket=new EventTarget();socket.readyState=0;socket.close=()=>{};
 const waiting=openChromeTransport(socket,{timeoutMs:100});
 socket.dispatchEvent(new Event('close'));await assert.rejects(waiting,/closed before open/);
 await assert.rejects(openChromeTransport(socket,{timeoutMs:10}),/startup timed out/);
 const opening=openChromeTransport(socket,{timeoutMs:100});socket.dispatchEvent(new Event('open'));await opening;
});

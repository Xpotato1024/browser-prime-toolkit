// SPDX-License-Identifier: AGPL-3.0-only
import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {PassThrough} from 'node:stream';
import {mkdtemp,access} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createServer} from 'node:http';
import {createCiBrowserLifecycle,boundedStep} from '../scripts/chrome-ci-lifecycle.mjs';

async function fixture({retireFailure,timeoutMs=1000}={}){
 const profile=await mkdtemp(join(tmpdir(),'prime-browser-lifecycle-test-'));
 const child=new EventEmitter();child.stderr=new PassThrough();child.exitCode=null;child.signalCode=null;
 const socket=new EventTarget();socket.readyState=1;socket.send=()=>{};socket.close=()=>{socket.readyState=3;socket.dispatchEvent(new Event('close'));};
 let id=0,retired=0;
 const pending=new Map(),server=createServer((req,res)=>res.end('test'));
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const memory={running:true,async stop(){this.running=false;}};
 const life=createCiBrowserLifecycle({getChrome:()=>child,getSocket:()=>socket,getMemory:()=>memory,getServer:()=>server,pending,nextId:()=>++id,timeoutForMethod:()=>10000,profile,retire:async()=>{retired++;if(retireFailure)throw retireFailure;}});
 life.observe({timeoutMs});
 return{profile,child,socket,pending,server,memory,life,get retired(){return retired;}};
}
for(const event of ['close','error'])test('CDP '+event+' rejects every pending command and future sends immediately',async()=>{
 const f=await fixture();
 await f.life.connect(f.socket);
 const first=f.life.send('Runtime.evaluate'),second=f.life.send('Page.navigate');
 const rejects=Promise.all([assert.rejects(first,/transport/),assert.rejects(second,/transport/)]);
 assert.equal(f.pending.size,2);f.socket.dispatchEvent(new Event(event));
 await rejects;assert.equal(f.pending.size,0);
 await assert.rejects(f.life.send('Browser.getVersion'),/not open/);
 assert.equal(f.pending.size,0);await f.life.cleanup();
});
test('cleanup continues after sampler failure, is idempotent, and preserves the original error',async()=>{
 const f=await fixture(),primary=Error('original numerical assertion');
 f.memory.stop=async()=>{throw Error('sampler failure');};
 f.life.noteFailure(primary);
 await f.life.cleanup();await f.life.cleanup();
 assert.equal(f.retired,1);assert.equal(f.server.listening,false);
 await assert.rejects(access(f.profile),{code:'ENOENT'});
 assert.equal(primary.message,'original numerical assertion');
 assert.equal(primary.cleanupErrors.length,1);assert.match(primary.cleanupErrors[0].message,/sampler failure/);
 assert.equal(f.child.listenerCount('error'),0);assert.equal(f.child.stderr.listenerCount('data'),0);
});
test('cleanup-only failure fails the run after server and profile are removed',async()=>{
 const f=await fixture();f.memory.stop=async()=>{throw Error('sampler failure');};
 await assert.rejects(f.life.cleanup(),e=>e instanceof AggregateError&&e.errors[0].message==='sampler failure');
 assert.equal(f.server.listening,false);await assert.rejects(access(f.profile),{code:'ENOENT'});
});
test('bounded cleanup step does not wait forever for an unresponsive task',async()=>{
 await assert.rejects(boundedStep(()=>new Promise(()=>{}),25,'hung cleanup'),/hung cleanup timed out/);
});
test('preconnect diagnostic does not allocate commands or pending timers',async()=>{
 const f=await fixture();assert.equal(await f.life.diagnostic('1'),null);assert.equal(f.pending.size,0);
 await f.life.cleanup();
});

test('retirement failure does not prevent memory, server and profile cleanup',async()=>{
 const primary=Error('startup failure'),f=await fixture({retireFailure:Error('retirement failure')});
 f.life.noteFailure(primary);await f.life.cleanup();
 assert.equal(f.memory.running,false);assert.equal(f.server.listening,false);
 await assert.rejects(access(f.profile),{code:'ENOENT'});
 assert.match(primary.cleanupErrors[0].message,/retirement failure/);
});
test('hung asynchronous setup cannot exceed the original startup budget',async()=>{
 const f=await fixture({timeoutMs:40});
 await assert.rejects(f.life.setup(()=>new Promise(()=>{})),/startup .*timed out/);
 await f.life.cleanup();assert.equal(f.server.listening,false);
});
for(const event of ['error','exit'])test('process '+event+' rejects asynchronous startup setup immediately',async()=>{
 const f=await fixture();
 const waiting=f.life.setup(()=>new Promise(()=>{})),rejected=assert.rejects(waiting,/spawn failed|exited before/);
 if(event==='exit'){f.child.exitCode=7;f.child.emit('exit',7,null);}else f.child.emit('error',Error('spawn failed'));
 await rejected;await f.life.cleanup();assert.equal(f.server.listening,false);
});

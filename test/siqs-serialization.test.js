import {Worker} from 'node:worker_threads';
import assert from 'node:assert/strict';
import test from 'node:test';
test('late SIQS budget returns after decimal serialization', {timeout:10000}, async()=>{
const url=new URL('../src/engine/siqs.js',import.meta.url).href;
const code=`(async()=>{const {parentPort}=await import('node:worker_threads');const {createSiqsSplit}=await import(${JSON.stringify(url)});const s=await createSiqsSplit(),n=1000000000039n*1000000000061n;let ticks=0;s(n,{tick(){ticks++;}},{seed:1});const total=ticks;ticks=0;const stop=new Error('output budget');parentPort.postMessage({start:true,total});try{s(n,{tick(){if(++ticks>=total)throw stop;}},{seed:1});parentPort.postMessage({returned:true});}catch(e){parentPort.postMessage({stopped:e===stop,live:s.stats().liveBytes});}})().catch(e=>{throw e;});`;
const worker=new Worker(code,{eval:true});
try {
 const result=await new Promise((resolve,reject)=>{
  let timer=setTimeout(()=>reject(Error('Worker initialization deadline')),5000);
  worker.on('error',error=>{clearTimeout(timer);reject(error);});
  worker.on('message',m=>{
   if(m.start){clearTimeout(timer);timer=setTimeout(()=>reject(Error('Decimal serialization budget did not return')),3000);}
   else{clearTimeout(timer);resolve(m);}
  });
 });
 assert.equal(result.stopped,true);assert.equal(result.live,0);console.log('serialization budget returned and released');
} finally {await worker.terminate();}
});

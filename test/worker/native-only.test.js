import test from 'node:test';
import assert from 'node:assert/strict';
import { Worker } from 'node:worker_threads';
import { WORKER_SOURCE } from '../../src/worker/native-worker-source.js';
test('native-only Worker is ready and exact with WebAssembly unavailable',async()=>{
  const worker=new Worker(`const {parentPort,workerData}=require('node:worker_threads');
    globalThis.WebAssembly=undefined;
    globalThis.self={postMessage:data=>parentPort.postMessage(data),addEventListener(){}};
    parentPort.on('message',data=>self.onmessage?.({data}));
    eval(workerData);`,{eval:true,workerData:WORKER_SOURCE});
  const next=()=>new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{cleanup();reject(Error('Worker deadline'));},3000);
    const message=data=>{cleanup();resolve(data);},error=e=>{cleanup();reject(e);};
    const cleanup=()=>{clearTimeout(timer);worker.off('message',message);worker.off('error',error);};
    worker.once('message',message);worker.once('error',error);
  });
  try {
    assert.equal((await next()).type,'ready');
    const pending=next();worker.postMessage({protocolVersion:1,type:'run',jobId:1,input:'10403',options:{algorithm:'brent'}});
    const result=await pending;assert.equal(result.type,'result');
    assert.deepEqual(result.result.factors.map(f=>f.value),['101','103']);
    const denied=next();worker.postMessage({protocolVersion:1,type:'run',jobId:2,input:'10403',options:{algorithm:'gmp-ecm'}});
    assert.equal((await denied).type,'error');
  } finally {await worker.terminate();}
});

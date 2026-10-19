import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
test('an invalid message cannot release another job while its asynchronous audit is pending',async()=>{
 const messages=[];let calls=0,release;
 const pending=new Promise(yes=>release=yes),self={postMessage:m=>messages.push(m),addEventListener(){}};
 const split={audit:()=>calls===1?pending:Promise.resolve({}),stats:()=>({})};
 const source=readFileSync(new URL('../../src/worker/counted-install.js',import.meta.url),'utf8')
  .replace(/^import .+\n/,'').replace('export function','function');
 runInNewContext(source+'\ninstallCountedWorker(split);',{self,split,factorInteger:()=>{calls++;return{};}});
 const request=jobId=>({data:{protocolVersion:1,type:'run',jobId,input:'10403',options:{algorithm:'siqs'}}});
 const first=self.onmessage(request(1));
 try{
  await self.onmessage(request(2));
  const third=self.onmessage(request(3));void third;
  assert.equal(calls,1);
 }finally{release({});await first;}
 await self.onmessage(request(4));
 assert.equal(calls,2);assert.deepEqual(messages.filter(m=>m.type==='result').map(m=>m.jobId),[1,4]);
});

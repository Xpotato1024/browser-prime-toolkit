import test from 'node:test';
import assert from 'node:assert/strict';
import { BrowserMemorySampler } from '../scripts/browser-memory.mjs';
test('RAM sampler includes children created by a non-main task once',async()=>{
  const files=new Map([
    ['/proc/10/task/10/children',''],['/proc/10/task/11/children','20 20'],
    ['/proc/20/task/20/children','30'],['/proc/30/task/30/children',''],
    ...[10,20,30].map(pid=>['/proc/'+pid+'/smaps_rollup','Rss: '+pid+' kB\nPss: '+(pid/2)+' kB\n']),
  ]);
  const sampler=new BrowserMemorySampler(10,25,{
    read:async path=>{assert.ok(files.has(path),path);return files.get(path);},
    list:async path=>path==='/proc/10/task'?['10','11']:[path.split('/')[2]],
  });
  const row=await sampler.sample();
  assert.equal(row.rssBytes,60*1024);assert.equal(row.pssBytes,30*1024);
  assert.equal(row.processes,3);
});

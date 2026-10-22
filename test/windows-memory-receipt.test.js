// SPDX-License-Identifier: AGPL-3.0-only
import test from 'node:test';
import assert from 'node:assert/strict';
import {readWindowsMemory,readWindowsMemorySync} from '../scripts/windows-memory-receipt.mjs';
const now=Date.now(),bytes=Buffer.from(JSON.stringify({checkedAt:new Date(now).toISOString(),host:'LLM-01',source:'Win32_OperatingSystem',availableMiB:6000,totalMiB:16000})+'\n');
test('immutable Windows receipt survives an absent replacement pointer and ignores unfinished sample',async()=>{
 const names=['windows-memory-sample-0000.json','windows-memory-sample-0001.json','windows-memory-sample-0002.tmp','windows-memory.jsonl'];
 const read=p=>{assert.equal(p,'/watch/windows-memory-sample-0001.json');return bytes;};
 const sync=readWindowsMemorySync('/watch',{list:()=>names,read,now:()=>now});
 const asyncResult=await readWindowsMemory('/watch',{list:async()=>names,read:async p=>read(p),now:()=>now});
 assert.deepEqual(asyncResult,sync);assert.equal(sync.filename,'windows-memory-sample-0001.json');assert.equal(sync.value.availableMiB,6000);
});
test('missing, stale, malformed and unbounded Windows channels fail closed',async()=>{
 const list=()=>['windows-memory-sample-0000.json'];
 for(const options of [
  {list:()=>[]},
  {list:()=>Array(272).fill('windows-memory-sample-0000.json')},
  {list:()=>['windows-memory-sample-0271.json']},
  {read:()=>Buffer.alloc(4097)},
  {read:()=>Buffer.from('{}')},
  {now:()=>now+30001},
  {read:()=>{throw Object.assign(Error('Missing immutable sample'),{code:'ENOENT'});}}
 ]){
  const args={list,read:()=>bytes,now:()=>now,...options};
  assert.throws(()=>readWindowsMemorySync('/watch',args));
  await assert.rejects(readWindowsMemory('/watch',args));
 }
});

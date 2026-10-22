// SPDX-License-Identifier: AGPL-3.0-only
import test from 'node:test';
import assert from 'node:assert/strict';
import {readWindowsMemory,readWindowsMemorySync} from '../scripts/windows-memory-receipt.mjs';
const bytes=Buffer.from(JSON.stringify({checkedAt:new Date().toISOString(),host:'LLM-01',source:'Win32_OperatingSystem',availableMiB:9000,totalMiB:32000})+'\n');
test('only the named wide observer can read its finite 391-sample channel',async()=>{
 const list=()=>['windows-memory-sample-0390.json'],read=()=>bytes;
 assert.throws(()=>readWindowsMemorySync('/watch',{list,read}));
 assert.equal(readWindowsMemorySync('/watch',{list,read,maximumSamples:391}).filename,'windows-memory-sample-0390.json');
 assert.equal((await readWindowsMemory('/watch',{list,read,maximumSamples:391})).value.availableMiB,9000);
});
test('arbitrary observer retention enlargement is rejected',async()=>{
 for(const maximumSamples of [0,272,390,392,Infinity]){
  const o={maximumSamples,list:()=>['windows-memory-sample-0000.json'],read:()=>bytes};
  assert.throws(()=>readWindowsMemorySync('/watch',o));await assert.rejects(readWindowsMemory('/watch',o));
 }
});

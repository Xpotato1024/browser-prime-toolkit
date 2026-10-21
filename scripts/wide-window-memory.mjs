// SPDX-License-Identifier: AGPL-3.0-only
import {LongMemorySampler} from './long-window-memory.mjs';
import {readWindowsMemory} from './windows-memory-receipt.mjs';
export class WideMemorySampler extends LongMemorySampler{
 constructor(pid,{windowsRead=directory=>readWindowsMemory(directory,{maximumSamples:391}),...options}={}){
  super(pid,{...options,windowsRead,sampleLimit:8000});
 }
}

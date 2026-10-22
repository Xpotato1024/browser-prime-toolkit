// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Xpotato.net / Xpotato1024
export function resourceMemoryContract(bytes,capMiB){
 if(![64,128,256].includes(capMiB))throw Error('Named role cap required');
 let o=8;const u=()=>{let n=0,s=0,b;do{if(o>=bytes.length||s>28)throw Error('Invalid WASM LEB');b=bytes[o++];n+=(b&127)*2**s;s+=7;}while(b&128);return n;};
 if(bytes.length<8||Array.from(bytes.subarray(0,8)).join(',')!=='0,97,115,109,1,0,0,0')throw Error('Invalid WASM');
 let memory=null;
 while(o<bytes.length){const id=bytes[o++],size=u(),end=o+size;if(end>bytes.length)throw Error('WASM section bounds');
  if(id===8)throw Error('Unexpected WASM start');
  if(id===5){if(memory||u()!==1)throw Error('WASM memory count');const flags=u(),min=u(),max=flags&1?u():null;if(o!==end)throw Error('Memory section framing');memory={flags,minPages:min,maxPages:max,shared:Boolean(flags&2)};}
  o=end;
 }
 if(!memory||memory.flags!==1||memory.shared||memory.minPages<1||memory.minPages>capMiB*16||memory.maxPages!==capMiB*16)throw Error('Expected named unshared role memory');
 const module=new WebAssembly.Module(bytes);
 if(WebAssembly.Module.imports(module).length)throw Error('Unexpected WASM imports');
 return{...memory,initialBytes:memory.minPages*65536,maximumBytes:capMiB*1048576,exports:WebAssembly.Module.exports(module)};
}

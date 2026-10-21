// SPDX-License-Identifier: AGPL-3.0-only
export function collectionMemoryContract(bytes){
 let o=8;const u=()=>{let n=0,s=0,b;do{if(o>=bytes.length||s>28)throw Error('Invalid WASM LEB');b=bytes[o++];n+=(b&127)*2**s;s+=7;}while(b&128);return n;};
 if(bytes.length<8||Array.from(bytes.subarray(0,8)).join(',')!=='0,97,115,109,1,0,0,0')throw Error('Invalid WASM');
 let memory=null;
 while(o<bytes.length){const id=bytes[o++],size=u(),end=o+size;if(end>bytes.length)throw Error('WASM section bounds');
  if(id===8)throw Error('Unexpected WASM start');
  if(id===5){if(memory||u()!==1)throw Error('WASM memory count');const flags=u(),min=u(),max=flags&1?u():null;if(o!==end)throw Error('Memory framing');memory={flags,minPages:min,maxPages:max,shared:Boolean(flags&2)};}o=end;
 }
 if(!memory||memory.flags!==1||memory.shared||memory.minPages<1||memory.minPages>32||memory.maxPages!==16384)throw Error('Expected small initial/1024MiB hardmax');
 const module=new WebAssembly.Module(bytes),imports=WebAssembly.Module.imports(module);
 if(JSON.stringify(imports)!==JSON.stringify([{module:'codex_collection',name:'now_ms',kind:'function'}]))throw Error('Only diagnostic monotonic clock import allowed');
 return{...memory,initialBytes:memory.minPages*65536,maximumBytes:1073741824,imports,exports:WebAssembly.Module.exports(module)};
}

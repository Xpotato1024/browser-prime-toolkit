// SPDX-License-Identifier: AGPL-3.0-only
import{createHash}from'node:crypto';
export function semanticSections(bytes){
 if(bytes.length<8||!Buffer.from(bytes.subarray(0,8)).equals(Buffer.from([0,97,115,109,1,0,0,0])))throw Error('WASM header');
 const out=[];let p=8;
 const u32=()=>{let n=0,m=1;for(let k=0;k<5;k++){if(p>=bytes.length)throw Error('Section length');const x=bytes[p++];n+=(x&127)*m;if(!(x&128)){if(n>4294967295)throw Error('Section overflow');return n;}m*=128;}throw Error('Section width');};
 while(p<bytes.length){const id=bytes[p++],n=u32();if(p+n>bytes.length)throw Error('Section bounds');if(id!==0)out.push({id,bytes:n,sha256:createHash('sha256').update(bytes.subarray(p,p+n)).digest('hex')});p+=n;}
 return out;
}

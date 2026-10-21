// SPDX-License-Identifier: AGPL-3.0-only
import {longWorkerSource} from '../long-window/worker-source.js';
import {RUSQSIEVE_BASE64} from '../long-window/wasm-long-1024.js';
const replace=(s,a,b)=>{if(s.split(a).length!==2)throw Error('Wide Worker anchor '+a.slice(0,80));return s.replace(a,b);};
export function wideWorkerSource(cap){
 if(![64,1024].includes(cap))throw Error('Wide role cap');
 let s=longWorkerSource(cap===1024?256:64);
 s=replace(s,'t[k]>1800000','t[k]>3600000');
 s=replace(s,'if(sum>1810000)','if(sum>3610000)');
 s=replace(s,'maxMs:1800000','maxMs:3600000');
 if(cap===64)return s;
 const pattern=/const RUSQSIEVE_BASE64="[^"]+";/g;
 if([...s.matchAll(pattern)].length!==1)throw Error('Wide artifact anchor');
 s=s.replace(pattern,()=> 'const RUSQSIEVE_BASE64='+JSON.stringify(RUSQSIEVE_BASE64)+';');
 s=replace(s,'const OWNER_CAP_MIB=256;','const OWNER_CAP_MIB=1024;');
 s=replace(s,'[64,128,256].includes(capMiB)','[64,128,256,1024].includes(capMiB)');
 s=replace(s,'[128,256].includes(OWNER_CAP_MIB)','[1024].includes(OWNER_CAP_MIB)');
 return s;
}

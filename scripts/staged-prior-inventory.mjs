// SPDX-License-Identifier: AGPL-3.0-only
// Historical Stage9 inventory from 1c9c2b6946e667f0ace9a1a693224255f2609b56.
// Validate its pinned sources; future experiments must not retroactively enter it.
import {createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex');
export const STAGED_PRIOR_SHA256='28ba7a36ed26d9599241e446f55cff174ca98405c5ee800df3267acf60450721';
function inputs(value,out){
 if(!value||typeof value!=='object')return;
 for(const [k,v]of Object.entries(value)){
  if(k==='input'&&typeof v==='string'&&/^[0-9]+$/.test(v))out.add(v);
  else if(typeof v==='object')inputs(v,out);
 }
}
export function reconstructStagedPrior(corpus,snapshotBytes,readSource){
 if(sha(snapshotBytes)!==STAGED_PRIOR_SHA256)throw Error('Historical prior inventory pin');
 const frozen=JSON.parse(snapshotBytes),prior=new Set(corpus.map(c=>c.input)),sources={};
 for(const [path,hash]of Object.entries(frozen.sources)){
  const bytes=readSource(path);
  if(sha(bytes)!==hash)throw Error('Historical prior source changed '+path);
  const set=new Set();inputs(JSON.parse(bytes),set);
  sources[path]=sha(bytes);for(const value of set)prior.add(value);
 }
 const result={baseHead:frozen.baseHead,sources,inputs:[...prior].sort()};
 if(JSON.stringify(result,null,2)+'\n'!==snapshotBytes.toString())throw Error('Historical prior input reconstruction');
 return result;
}

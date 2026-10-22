// SPDX-License-Identifier: AGPL-3.0-only
import {collectionWorkerSource} from '../collection-profile/worker-source.js';
import {attachCollectionPort} from '../collection-profile/bridge.js';
import {RUSQSIEVE_BASE64 as PREFIX} from './wasm-prefix-1024.js';
const variants=['baseline','prefix'];
export function resieveWorkerSource(cap,variant){
 if(cap!==1024||!variants.includes(variant))throw Error('Named one-owner resieve role');
 let s=collectionWorkerSource(cap,'baseline');
 if(variant==='baseline')return s;
 const re=/const RUSQSIEVE_BASE64="[^"]+";/g;
 if([...s.matchAll(re)].length!==1)throw Error('One resieve artifact');
 return s.replace(re,()=> 'const RUSQSIEVE_BASE64='+JSON.stringify(PREFIX)+';');
}
export function attachResievePort(worker,variant,onFailure){
 if(!variants.includes(variant))throw Error('Named uninstrumented resieve variant');
 return attachCollectionPort(worker,'baseline',onFailure);
}

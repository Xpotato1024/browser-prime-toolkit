import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fetchVerifiedSource,assertExternalCache} from './verified-source-fetch.mjs';
const root=resolve(import.meta.dirname,'..'),directory=process.env.PRIME_UPSTREAM_DIR&&resolve(process.env.PRIME_UPSTREAM_DIR);
if(!directory)throw Error('Set PRIME_UPSTREAM_DIR outside repository');
assertExternalCache(root,directory);
const entries=JSON.parse(readFileSync(new URL('../native/gmp/upstreams.json',import.meta.url)));
const transport=JSON.parse(readFileSync(new URL('../native/siqs-fetch/staged-candidate-transports.json',import.meta.url)));
const receipts=[];
for(const e of entries){
 const plan=transport.find(p=>p.file===e.file);
 if(plan&&(plan.bytes!==e.bytes||plan.sha256!==e.sha256||plan.urls[0]!==e.url))throw Error('Transport artifact identity');
 const receipt=fetchVerifiedSource(e,{directory,urls:plan?.urls??[e.url,e.url]});receipts.push(receipt);
 console.log(JSON.stringify(receipt));
}
if(transport.some(p=>!entries.some(e=>e.file===p.file)))throw Error('Unknown transport artifact');
console.log('Verified all '+receipts.length+' fixed candidate sources');

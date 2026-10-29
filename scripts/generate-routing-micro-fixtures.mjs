// SPDX-License-Identifier: AGPL-3.0-only
// Fixture preparation only: never import this file into an engine or a measured browser job.
import fs from 'node:fs';
import {assessPrime} from '../src/engine/arithmetic.js';
import {SMALL_PRIMES} from '../src/engine/options.js';
const maxCandidates=1024,cache=new Map(),generated=[];
function prime(bits,skip=0){
 const key=bits+':'+skip;if(cache.has(key))return cache.get(key);let n=(1n<<BigInt(bits))-(skip?(1n<<BigInt(bits-2)):0n)-1n,found=0;
 for(let attempts=0;attempts<maxCandidates;attempts++,n-=2n){
  let ops=0;const budget={tick(){if(++ops>100000)throw Error('fixture proof cap');}};
  if(SMALL_PRIMES.some(p=>n!==p&&n%p===0n))continue;
  const certainty=assessPrime(n,budget);if(certainty==='composite')continue;if(found++<skip)continue;
  const row={value:n.toString(),bits,certainty,attempts:attempts+1};cache.set(key,row);generated.push(row);return row;
 }throw Error('bounded fixture search exhausted '+bits);
}
const specs=[['balanced64',31,33,0],['unbalanced96',17,79,0],['balanced96',48,48,1],['unbalanced193',24,169,0],['balanced192',96,96,1],['unbalanced255',48,207,0],['unbalanced333',17,316,0],['unbalanced400',17,383,0]];
const cases=specs.map(([id,a,b,skip])=>{const p=prime(a),q=prime(b,skip),n=BigInt(p.value)*BigInt(q.value);return{id,input:n.toString(),bits:n.toString(2).length,smallFactorBits:Math.min(a,b),shape:Math.abs(a-b)<=2?'balanced nonsquare':'unbalanced',reference:[p,q]};});
const known133=[{"base": "76512746975961690313", "exponent": 1, "certainty": "probable"}, {"base": "106598874041233232093", "exponent": 1, "certainty": "probable"}];
cases.splice(3,0,{id:'balanced133',input:'8156172677439289108635319830552518815109',bits:133,smallFactorBits:Math.min(...known133.map(g=>BigInt(g.base).toString(2).length)),shape:'balanced nonsquare',reference:known133.map(g=>({value:g.base,bits:BigInt(g.base).toString(2).length,certainty:g.certainty}))});
const p=prime(61);cases.push({id:'square122',input:(BigInt(p.value)**2n).toString(),bits:122,smallFactorBits:61,shape:'square control',reference:[p,p]});
for(const c of cases)if(c.reference.reduce((n,f)=>n*BigInt(f.value),1n)!==BigInt(c.input))throw Error('fixture product');
fs.writeFileSync('bench/routing-micro-fixtures.json',JSON.stringify({kind:'fixedKnownFactorFixtures',generatedWith:'existing assessPrime; no factors supplied to measured engines',generated,cases},null,2)+'\n');
console.log(JSON.stringify(cases.map(c=>({id:c.id,bits:c.bits,minFactorBits:c.smallFactorBits,shape:c.shape})),null,2));

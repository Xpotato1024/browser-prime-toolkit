// SPDX-License-Identifier: AGPL-3.0-only
// Post-return oracle only; not imported by browser engines.
import {inspectExtendedDecomposition} from '../src/core/extended-input-contract.js';
export function auditReferenceSplit(fixture,snapshot){
 if(!fixture||!Array.isArray(fixture.reference)||fixture.reference.length!==2)throw Error('Reference pair');
 const refs=fixture.reference.map(f=>{if(typeof f.value!=='string'||f.value.length>309||!/^[1-9][0-9]*$/.test(f.value))throw Error('Reference encoding');return BigInt(f.value);});
 const n=BigInt(fixture.input);if(refs.some(p=>p<2n||p>=n)||refs[0]*refs[1]!==n)throw Error('Reference product');
 const checked=inspectExtendedDecomposition(fixture.input,snapshot),available=new Map();for(const p of refs)available.set(p.toString(),(available.get(p.toString())??0)+1);
 let matched=0;
 for(const f of checked.factors){if(!available.has(f.value)||f.exponent>available.get(f.value))throw Error('Unexpected accepted factor');available.set(f.value,available.get(f.value)-f.exponent);matched+=f.exponent;}
 let pairRecovered=false;
 if(matched===2&&checked.remaining==='1')pairRecovered=true;
 else if(matched===1&&available.get(checked.remaining)===1)pairRecovered=true;
 return Object.freeze({properFactorFound:checked.factors.length>0,referencePairRecovered:pairRecovered,matchedPrimeTerms:matched});
}

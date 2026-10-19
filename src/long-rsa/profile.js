import {parseIntegerInput} from '../core/integer-input.js';
export const RSA_PROFILE=Object.freeze({id:'long-native-brent-v1',maxBits:2048,maxDigits:617,timeBudgetMs:600000,
 initializationDeadlineMs:5000,operationBudget:10000000000,workers:1,wasmBytes:0,packetBytes:262144,deliveryGraceMs:25});
const capabilities=Object.freeze({
 brent:Object.freeze({maxBits:2048,minBits:0,odd:false,enabled:true,wasmBytes:0}),
 'gmp-brent':Object.freeze({maxBits:256,minBits:3,odd:true,enabled:false,wasmBytes:67108864}),
 'gmp-ecm':Object.freeze({maxBits:256,minBits:3,odd:true,enabled:false,wasmBytes:67108864}),
 siqs:Object.freeze({maxBits:128,minBits:64,odd:true,enabled:false,wasmBytes:67108864})
});
export function selectRsaPlan(text,options={}){
 if(typeof text!=='string'||text.length>1024||!/^(0|[1-9][0-9]*)$/.test(text))throw TypeError('RSA canonical input');
 if(!options||typeof options!=='object'||Array.isArray(options)||Object.keys(options).some(k=>!['backend','seed','budgetMs'].includes(k)))throw TypeError('RSA options');
 const{backend='brent',seed=1,budgetMs=30000}=options;
 if(![3000,30000,180000,600000].includes(budgetMs))throw TypeError('Long RSA named budget');
 if(!Object.hasOwn(capabilities,backend)||!Number.isSafeInteger(seed)||seed<1||seed>4294967295)throw TypeError('RSA backend or seed');
 const{value,canonical}=parseIntegerInput(text),bits=value.toString(2).length,capability=capabilities[backend];
 if(canonical!==text)throw TypeError('RSA canonical identity');
 const reason=bits>RSA_PROFILE.maxBits?'profile-input-limit':bits>capability.maxBits||bits<capability.minBits||capability.odd&&value%2n===0n?
  'backend-input-limit':!capability.enabled?'backend-not-enabled':null;
 const supported=reason===null;
 return Object.freeze({profile:RSA_PROFILE.id,input:text,bits,backend,capability,supported,reason,
  workers:supported&&value>=2n?1:0,wasmBytes:0,
  options:Object.freeze({algorithm:backend,seed,timeBudgetMs:budgetMs,operationBudget:RSA_PROFILE.operationBudget})});
}

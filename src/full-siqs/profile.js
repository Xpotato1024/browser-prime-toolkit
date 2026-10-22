import {parseIntegerInput} from '../core/integer-input.js';
export const RSA_PROFILE=Object.freeze({id:'full-siqs-153-v1',maxBits:332,maxDigits:100,timeBudgetMs:600000,
 initializationDeadlineMs:5000,operationBudget:1000000000000,workers:1,wasmBytes:536870912,packetBytes:262144,deliveryGraceMs:250});
export function selectRsaPlan(text,options={}){
 if(typeof text!=='string'||text.length>1024||!/^(0|[1-9][0-9]*)$/.test(text))throw TypeError('Full SIQS canonical input');
 if(!options||typeof options!=='object'||Array.isArray(options)||Object.keys(options).some(k=>!['backend','seed','budgetMs'].includes(k)))throw TypeError('Full SIQS options');
 const{backend='full-siqs',seed=1,budgetMs=30000}=options;
 if(![3000,30000,180000,600000].includes(budgetMs)||!Number.isSafeInteger(seed)||seed<1||seed>4294967295||!['full-siqs','brent','siqs','gmp-ecm'].includes(backend))throw TypeError('Full SIQS limits');
 const{value,canonical}=parseIntegerInput(text),bits=value.toString(2).length;
 if(canonical!==text)throw TypeError('Full SIQS input identity');
 const reason=text.length>100||bits>332?'profile-input-limit':backend!=='full-siqs'?'backend-not-enabled':null;
 return Object.freeze({profile:RSA_PROFILE.id,input:text,bits,backend,supported:reason===null,reason,
 workers:reason===null&&value>=2n?1:0,wasmBytes:RSA_PROFILE.wasmBytes,
 options:Object.freeze({algorithm:backend,seed,timeBudgetMs:budgetMs,operationBudget:RSA_PROFILE.operationBudget})});
}

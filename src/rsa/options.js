import {RSA_PROFILE} from './profile.js';
export function normalizeRsaCoreOptions(options={}){
 if(!options||typeof options!=='object'||Array.isArray(options)||Object.keys(options).some(k=>!['algorithm','seed','timeBudgetMs','operationBudget'].includes(k)))throw TypeError('RSA core options');
 const out={algorithm:'brent',seed:1,timeBudgetMs:RSA_PROFILE.timeBudgetMs,operationBudget:RSA_PROFILE.operationBudget,...options};
 if(out.algorithm!=='brent')throw RangeError('RSA core backend');
 for(const[key,min,max]of [['seed',1,4294967295],['timeBudgetMs',0,RSA_PROFILE.timeBudgetMs],['operationBudget',0,RSA_PROFILE.operationBudget]])
  if(!Number.isSafeInteger(out[key])||out[key]<min||out[key]>max)throw RangeError('RSA core '+key);
 return Object.freeze(out);
}

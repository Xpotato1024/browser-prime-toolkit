import { parseIntegerInput } from '../core/integer-input.js';
import { normalizeOptions } from './options.js';
// A fixed eligibility/dispatch proposal, not a learned performance optimizer.
export function selectEnginePlan(text, options={}) {
  const {value,canonical}=parseIntegerInput(text);
  if(!options||typeof options!=='object'||Array.isArray(options)||
    Object.keys(options).some(k=>!['seed','timeBudgetMs','operationBudget'].includes(k))) throw TypeError('Invalid selector options');
  const algorithm=value<(1n<<64n)?'brent':'gmp-ecm';
  const config=normalizeOptions({...options,algorithm});
  if(value>=(1n<<256n)) return Object.freeze({
    policy:'conservative-v1',eligible:false,input:canonical,reason:'selector-range'});
  return Object.freeze({
    policy:'conservative-v1',eligible:true,input:canonical,algorithm,options:config,
    workers:1,wasmLinearMemoryBytes:algorithm==='brent'?0:67108864,
    initializationDeadlineMs:5000,deliveryGraceMs:100,
    requestEnvelopeMs:5000+config.timeBudgetMs+100,
  });
}

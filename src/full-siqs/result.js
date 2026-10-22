import {verifyFactorResult,verifySnapshot} from './core-result.js';
import {assessPrime} from '../engine/arithmetic.js';
import {SMALL_PRIMES} from '../engine/options.js';
import {selectRsaPlan,RSA_PROFILE} from './profile.js';
export class RsaProofDeadlineError extends Error {}
function guard(snapshot,input){
 const plan=selectRsaPlan(input);
 if(!plan.supported||input.length>RSA_PROFILE.maxDigits||!snapshot||!Array.isArray(snapshot.factors)||snapshot.factors.length>2048)throw TypeError('RSA snapshot bounds');
 if(typeof snapshot.remaining!=='string'||snapshot.remaining.length>617||snapshot.factors.some(f=>typeof f?.value!=='string'||f.value.length>617))throw TypeError('RSA factor bounds');
}
function checkProbables(result,tick,checked){
 for(const factor of result.factors){
  if(factor.certainty!=='probable'||checked.has(factor.value))continue;
  const n=BigInt(factor.value);
  for(const p of SMALL_PRIMES){tick();if(n%p===0n)throw TypeError('RSA probable factor composite');}
  if(assessPrime(n,{tick})!=='probable')throw TypeError('RSA probable factor composite');
  checked.add(factor.value);
 }
 return result;
}
export function verifyRsaSnapshot(snapshot,input,tick=()=>{},checked=new Set()){
 guard(snapshot,input);return checkProbables(verifySnapshot(snapshot,input),tick,checked);
}
export function verifyRsaWorkerResult(value,input,tick=()=>{},checked=new Set()){
 guard(value,input);const result=verifyFactorResult(value,input);
 if(result.algorithm!=='full-siqs')throw TypeError('RSA result backend');
 return checkProbables(result,tick,checked);
}
export function classifyRsaResult(result){
 if(result.status==='complete')return result.primality==='composite'?'factorized':'prime';
 if(result.status==='probable'||result.status==='neither')return result.status;
 if(result.status==='incomplete')return result.reason==='time-budget'?'timeout':'incomplete';
 throw TypeError('RSA result classification');
}

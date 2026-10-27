// SPDX-License-Identifier: AGPL-3.0-only
// Contract fixtures only: no factor search, primality claim, or engine benchmark.
import test from 'node:test';
import assert from 'node:assert/strict';
import {EXTENDED_INPUT_CANDIDATE,inspectExtendedInput,inspectExtendedDecomposition} from '../../src/core/extended-input-contract.js';
import {validateSiteInput,selectSitePlan} from '../../src/site/policy.js';
const dec=n=>n.toString();
const verify=(input,snapshot,options={})=>inspectExtendedDecomposition(String(input),snapshot,{now:()=>0,...options});
const empty=n=>({factors:[],remaining:String(n)});
const max=(1n<<1024n)-1n;
test('1024 bit acceptance is a dual bound, not a new public or executable capability',()=>{
 const a=inspectExtendedInput(dec(max));
 assert.equal(a.bits,1024);assert.equal(a.digits,309);assert.equal(a.executionEnabled,false);
 assert.equal(a.canonical,dec(max));assert.ok(Object.isFrozen(a));
 assert.throws(()=>inspectExtendedInput(dec(1n<<1024n)),{code:'CANDIDATE_INPUT_RANGE'});
 assert.throws(()=>inspectExtendedInput('1e309'),{code:'CANDIDATE_INPUT_RANGE'});
 assert.throws(()=>validateSiteInput(dec(max),'wide'));
 assert.equal(validateSiteInput(dec((1n<<332n)-1n),'wide'),dec((1n<<332n)-1n));
 assert.throws(()=>validateSiteInput(dec(1n<<332n),'wide'));
 assert.equal(selectSitePlan('optimized',{timeBudgetMs:600000}).timeBudgetMs,600000);
 assert.equal(selectSitePlan('wide',{mode:'manual',workers:1,memoryMiB:1536,timeBudgetMs:3600000}).timeBudgetMs,3600000);
 assert.equal(EXTENDED_INPUT_CANDIDATE.maxMultiplicity,1023);
});
test('frozen parser notation, leading zeros and precision are preserved',()=>{
 assert.equal(inspectExtendedInput('0'.repeat(4096)).canonical,'0');
 assert.equal(inspectExtendedInput('0'.repeat(4000)+'3.20e1').canonical,'32');
 assert.equal(inspectExtendedInput('9007199254740993').canonical,'9007199254740993');
 assert.throws(()=>inspectExtendedInput('0'.repeat(4097)),{code:'INPUT_TOO_LONG'});
 assert.throws(()=>inspectExtendedInput('1e10001'),{code:'EXPONENT_OUT_OF_RANGE'});
 assert.throws(()=>inspectExtendedInput('1e-1'),{code:'NOT_AN_INTEGER'});
 assert.throws(()=>inspectExtendedInput('1e1023'),{code:'CANDIDATE_INPUT_RANGE'});
});
test('400 bit residual gate differs from input acceptance and from the small route',()=>{
 for(const [residual,category] of [[(1n<<400n)-1n,'siqs-residual-candidate'],[1n<<400n,'outside-siqs-residual']]){
  const input=residual*3n,result=verify(input,{factors:[{value:'3',exponent:1}],remaining:dec(residual)});
  assert.equal(result.residualClass,category);assert.equal(result.executionEnabled,false);
  assert.equal(result.factorizationComplete,false);assert.equal(result.primalityVerified,false);
 }
 assert.equal(verify(max,empty(max)).residualClass,'outside-siqs-residual');
 assert.equal(verify(1n<<128n,empty(1n<<128n)).residualClass,'siqs-residual-candidate');
 assert.equal(verify((1n<<128n)-1n,empty((1n<<128n)-1n)).residualClass,'small-residual-candidate');
 assert.equal(verify(max,empty(max)).stopReason,'siqs-residual-range');
});
test('a large smooth fixture can have a small residual without doing any factor search',()=>{
 const input=(1n<<600n)*7n,source={factors:[{value:'2',exponent:600}],remaining:'7'};
 const before=structuredClone(source),r=verify(input,source);
 assert.equal(r.decompositionVerified,true);assert.equal(r.residualClass,'small-residual-candidate');
 assert.equal(r.checkedMultiplicity,600);assert.equal(r.remainingBits,3);assert.deepEqual(source,before);
});
test('maximal factor multiplicity is bounded and composite bases do not establish completion',()=>{
 const n=1n<<1023n,r=verify(n,{factors:[{value:'2',exponent:1023}],remaining:'1'});
 assert.equal(r.checkedMultiplicity,1023);assert.equal(r.residualClass,'no-residual');
 assert.equal(r.factorizationComplete,false);assert.equal(r.primalityVerified,false);
 const composite=verify('49',{factors:[{value:'49',exponent:1}],remaining:'1'});
 assert.equal(composite.decompositionVerified,true);assert.equal(composite.factorizationComplete,false);
 assert.throws(()=>verify(max,{factors:[{value:dec(1n<<1023n),exponent:1023}],remaining:'1'}),{code:'FACTOR_POWER_RANGE'});
});
test('zero and one remain neither prime nor composite and cannot invent factors',()=>{
 for(const input of ['0','1']){
  const r=verify(input,empty(input));assert.equal(r.residualClass,'not-applicable');assert.equal(r.factorizationComplete,false);
 }
 assert.equal(inspectExtendedInput('0').bits,0);assert.equal(inspectExtendedInput('1').bits,1);
 assert.throws(()=>verify('0',{factors:[{value:'2',exponent:1}],remaining:'0'}),{code:'ZERO_DECOMPOSITION'});
 assert.throws(()=>verify('1',{factors:[{value:'2',exponent:1}],remaining:'1'}));
});
test('ledger canonical form and arithmetic identity are checked before accepting a snapshot',()=>{
 const valid={factors:[{value:'2',exponent:2},{value:'3',exponent:1}],remaining:'1'};
 assert.equal(verify('12',valid).decompositionVerified,true);
 for(const snapshot of [
  {factors:[{value:'2',exponent:3}],remaining:'3'},
  {factors:[{value:'2',exponent:1},{value:'2',exponent:1}],remaining:'3'},
  {factors:[{value:'3',exponent:1},{value:'2',exponent:2}],remaining:'1'},
  {factors:[{value:'02',exponent:2}],remaining:'3'},
  {factors:[{value:'1',exponent:1}],remaining:'12'},
  {factors:[],remaining:'0'},{factors:[],remaining:'012'},
  {factors:[],remaining:'12',status:'complete'},
  {factors:[{value:'2',exponent:2,certainty:'proven'}],remaining:'3'}
 ])assert.throws(()=>verify('12',snapshot));
 assert.throws(()=>verify('0012',valid),{code:'CANONICAL_VALUE'});
 for(const exponent of [0,-1,1.5,NaN,Infinity,1024,1e9])assert.throws(()=>verify('12',{factors:[{value:'2',exponent}],remaining:'3'}));
 assert.throws(()=>verify('12',{factors:Array(1024).fill({value:'2',exponent:1}),remaining:'1'}),{code:'FACTOR_COUNT'});
 for(const length of [-1,1.5,Infinity]){const factors=new Proxy([],{get(target,key){return key==='length'?length:Reflect.get(target,key);}});assert.throws(()=>verify('12',{factors,remaining:'12'}),{code:'FACTOR_COUNT'});}
});
test('cancellation and finite validation deadlines never mutate a previously accepted prefix',()=>{
 const prefix={factors:[{value:'2',exponent:2}],remaining:'3'},accepted=verify('12',prefix),before=structuredClone(prefix);
 assert.throws(()=>verify('12',prefix,{signal:{aborted:true}}),{code:'VALIDATION_CANCELLED'});
 let tick=0;assert.throws(()=>verify('12',prefix,{now:()=>tick++===0?0:26,budgetMs:25}),{code:'VALIDATION_TIME_BUDGET'});
 let checks=0;assert.throws(()=>verify('12',prefix,{signal:{get aborted(){return ++checks>=3;}}}),{code:'VALIDATION_CANCELLED'});
 assert.deepEqual(prefix,before);assert.equal(accepted.remaining,'3');assert.equal(accepted.decompositionVerified,true);
});
test('invalid clocks and unlimited validation budgets are rejected',()=>{
 for(const budgetMs of [0,-1,101,Infinity,NaN])assert.throws(()=>verify('12',empty('12'),{budgetMs}),{code:'VALIDATION_OPTIONS'});
 assert.throws(()=>verify('12',empty('12'),{now:()=>NaN}),{code:'VALIDATION_CLOCK'});
 let t=0;assert.throws(()=>verify('12',empty('12'),{now:()=>++t===1?2:1}),{code:'VALIDATION_CLOCK'});
});
test('returned factor snapshots and candidate capabilities are immutable',()=>{
 const r=verify('12',{factors:[{value:'2',exponent:2}],remaining:'3'});
 assert.ok(Object.isFrozen(r));assert.ok(Object.isFrozen(r.factors));assert.ok(Object.isFrozen(r.factors[0]));
 assert.throws(()=>r.factors[0].value='3');assert.throws(()=>EXTENDED_INPUT_CANDIDATE.maxInputBits=2048);
});
test('a finite deterministic corpus checks identities without any factorization algorithm',()=>{
 for(let i=0;i<64;i++){
  const exponents=[i%17+1,(i*3)%11+1,(i*7)%9+1],bases=[2n,3n,5n],remaining=i%2?17n:1n;
  const input=bases.reduce((n,b,j)=>n*b**BigInt(exponents[j]),remaining);
  const factors=bases.map((b,j)=>({value:dec(b),exponent:exponents[j]}));
  const r=verify(input,{factors,remaining:dec(remaining)});
  assert.equal(r.decompositionVerified,true);assert.equal(r.factorizationComplete,false);
 }
});

test('callback mutation cannot change the values that a successful snapshot returns',()=>{
 const factor={value:'2',exponent:2},snapshot={factors:[factor],remaining:'3'};let calls=0;
 const r=inspectExtendedDecomposition('12',snapshot,{now:()=>{if(++calls===4){factor.value='7';snapshot.remaining='5';}return 0;}});
 assert.equal(r.remaining,'3');assert.deepEqual(r.factors,[{value:'2',exponent:2}]);
 assert.equal(r.decompositionVerified,true);
});
test('factor array iterators and accessor entries cannot bypass the fixed validation bound',()=>{
 const factors=[{value:'2',exponent:2}];factors[Symbol.iterator]=()=>{throw Error('Custom iterator must not run');};
 assert.equal(verify('12',{factors,remaining:'3'}).decompositionVerified,true);
 let getters=0;const accessors=[];Object.defineProperty(accessors,'0',{get(){getters++;return{value:'2',exponent:2};}});
 assert.throws(()=>verify('12',{factors:accessors,remaining:'3'}),{code:'FACTOR_SHAPE'});assert.equal(getters,0);
});

test('the originally bounded entry count cannot grow through validation callbacks',()=>{
 const snapshot={factors:[{value:'2',exponent:2}],remaining:'3'};let calls=0;
 const r=inspectExtendedDecomposition('12',snapshot,{now:()=>{if(++calls===4)snapshot.factors.push({value:'3',exponent:1});return 0;}});
 assert.deepEqual(r.factors,[{value:'2',exponent:2}]);assert.equal(r.remaining,'3');
});

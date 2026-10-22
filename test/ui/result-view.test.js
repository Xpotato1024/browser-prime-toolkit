import test from 'node:test';
import assert from 'node:assert/strict';
import {makeResultView} from '../../src/ui/result-view.js';
import {factorStaged} from '../../src/engine/staged-factor.js';
const result=n=>({...factorStaged(n),origin:'worker',traceAvailable:true});
test('exact decimals survive Number boundaries and large prime values',()=>{
 for(const n of [9007199254740991n,9007199254740992n,9007199254740993n,18446744073709551557n]){
  const v=makeResultView(result(n),n.toString());
  assert.ok(v.equation.startsWith(n+' = '));assert.ok(v.copyText.startsWith(n+' = '));assert.doesNotMatch(v.equation,/[eE][+-]?[0-9]/);
 }
});
test('perfect powers and duplicate factors have one structured exponent',()=>{
 const v=makeResultView(result(32n),'32');assert.equal(v.equation,'32 = 2^5');
 assert.deepEqual(v.groups,[{base:'2',exponent:5,certainty:'proven'}]);assert.equal(v.speech,'32 は 2の5乗');
 assert.equal(makeResultView(result(360n),'360').equation,'360 = 2^3 × 3^2 × 5');
 const n=3n**45n;assert.equal(makeResultView(result(n),n.toString()).equation,n+' = 3^45');
});
test('probable factors stay unproven in visible and copied descriptions',()=>{
 const n=2n*((1n<<89n)-1n),v=makeResultView(result(n),n.toString());
 assert.equal(v.groups[1].certainty,'probable');assert.match(v.statusText,/未証明/);assert.match(v.copyText,/未証明/);
});
test('partial and cancelled residuals never become prime factors',()=>{
 const base={input:'18',factors:[{value:'2',certainty:'proven',method:'small-prime'}],remaining:'9',operations:5,elapsedMs:1,
  status:'incomplete',reason:'host-timeout',primality:'composite',algorithm:'staged',seed:1,policy:'p64',origin:'host',traceAvailable:false,stages:null,grants:null};
 for(const r of [base,{...base,status:'cancelled',reason:'cancelled'}]){
  const v=makeResultView(r,'18');assert.equal(v.equation,'18 = 2 × [未解決: 9]');
  assert.equal(v.residual,'9');assert.match(v.copyText,/未解決/);assert.equal(v.groups.length,1);
 }
 assert.throws(()=>makeResultView({...base,remaining:'8'},'18'),TypeError);
});
test('zero/one retain neither and the submitted identity is checked',()=>{
 for(const n of [0n,1n]){const v=makeResultView(result(n),n.toString());assert.equal(v.equation,n+' = '+n);assert.match(v.statusText,/素数でも合成数でもありません/);}
 assert.throws(()=>makeResultView(result(32n),'33'),TypeError);
});

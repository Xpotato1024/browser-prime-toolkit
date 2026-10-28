// SPDX-License-Identifier: AGPL-3.0-only
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {factorPacket} from '../src/rusqsieve/contracts.js';
import {validateSiqs400Input,validateSiqs400Configuration} from '../src/siqs400/contracts.js';
import {validateInput} from '../src/rusqsieve/contracts.js';
test('400-bit SIQS acceptance is separate from the unchanged 332-bit profile',()=>{
 for(const bits of [128,332,333,368,369,399,400]){
  const input=((1n<<BigInt(bits))-1n).toString();
  assert.equal(validateSiqs400Input(input).bits,bits);
  if(bits>332)assert.throws(()=>validateInput(input));
 }
 for(const input of ['','0','1','01','+2',' 2','2.0','1e100','9'.repeat(122),(1n<<400n).toString()])assert.throws(()=>validateSiqs400Input(input));
 assert.equal(validateSiqs400Input(((1n<<400n)-1n).toString()).input,((1n<<400n)-1n).toString());
});
const config=(bits)=>{const bound=bits<=368?3000000:6000000;const double=BigInt(bound)**2n*1214n;return{version:1,profile:'baseline',bits,factorBaseBound:bound,intervalHalfWidth:bits<=368?262144:524288,singleLimit:String(bound*145),doubleLimit:String(double),lpBits:double.toString(2).length,thresholdAdjustment:-23,factorBaseSize:200000};};
test('new tiers validate actual geometry and exact u64 LP limits',()=>{
 for(const bits of [334,368,369,400]){
  const c=config(bits);validateSiqs400Configuration(c,'baseline',bits);
  for(const key of ['factorBaseBound','intervalHalfWidth','singleLimit','doubleLimit','lpBits','thresholdAdjustment']){
   const wrong={...c,[key]:typeof c[key]==='string'?String(BigInt(c[key])+1n):c[key]+1};
   assert.throws(()=>validateSiqs400Configuration(wrong,'baseline',bits),key);
  }
  assert.throws(()=>validateSiqs400Configuration(c,'half',bits));
 }
});

test('fixed preparation fixtures have exact products and no listed factor inside the largest base',()=>{
 const cases=JSON.parse(readFileSync(new URL('../scripts/fixtures/siqs400-cases.json',import.meta.url),'utf8')).cases;
 assert.deepEqual(cases.map(c=>c.bits),[333,334,368,369,400,121]);
 for(const c of cases){
  const n=BigInt(c.input);assert.equal(n.toString(2).length,c.bits);
  assert.equal(c.knownFactors.reduce((p,v)=>p*BigInt(v),1n),n);
  assert.ok(c.knownFactors.every(v=>BigInt(v)>6000000n));
 }
});
test('existing factor packet decodes a large proper divisor exactly without asserting primality',()=>{
 const d=(1n<<199n)-1n,n=d*((1n<<201n)-1n);
 assert.equal(n.toString(2).length,400);
 const packet=new Uint8Array(140),view=new DataView(packet.buffer);packet.set([81,83,86,49]);view.setUint16(4,11,true);view.setUint16(6,1,true);view.setUint32(8,128,true);
 let value=d;for(let i=12;i<140;i++){packet[i]=Number(value&255n);value>>=8n;}
 assert.equal(factorPacket(packet,n.toString()),d.toString());
 assert.throws(()=>factorPacket(packet,(n+1n).toString()));
});

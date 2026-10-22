import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {SMALL_PRIMES} from '../src/engine/options.js';
import {assessPrime} from '../src/engine/arithmetic.js';
const dir='bench/staged-practical/',read=async p=>JSON.parse(await readFile(p,'utf8'));
const catalog=await read(dir+'catalog.json'),oracle=await read(dir+'oracle.json'),manifest=await read(dir+'manifest.json');
assert.equal(catalog.cases.length,26);assert.equal(oracle.cases.length,26);assert.equal(oracle.notRuntimeAsset,true);
assert.equal(manifest.generatorSha256,createHash('sha256').update(await readFile('scripts/generate-practical.py')).digest('hex'));
for(const[p,sha]of Object.entries(manifest.files))assert.equal(createHash('sha256').update(await readFile(dir+p)).digest('hex'),sha,p);
const used=new Set();
for(const c of catalog.cases){
 assert.deepEqual(Object.keys(c).sort(),['bits','digits','id','input']);
 const o=oracle.cases.find(o=>o.id===c.id);assert.ok(o);const p=BigInt(o.p),q=BigInt(o.q),n=BigInt(c.input);
 assert.equal(p*q,n);assert.equal(n.toString().length,c.digits);assert.equal(n.toString(2).length,c.bits);
 assert.ok(p!==q&&q<=2n*p&&Math.abs(p.toString(2).length-q.toString(2).length)<=1);
 for(const prime of [p,q]){
  assert.ok(prime<(1n<<64n));assert.ok(!used.has(prime.toString()));used.add(prime.toString());
  for(const small of SMALL_PRIMES)assert.notEqual(prime%small,0n);
  assert.equal(assessPrime(prime,{tick(){}}),'proven','Independent generator cross-check');
 }
}
const browser=await readFile('bench/long-rsa.js','utf8'),bundle=await readFile('src/long-rsa/worker-source.js','utf8');
assert.doesNotMatch(browser,/oracle|generatorSeed/);assert.doesNotMatch(bundle,/oracle|PRACTICAL_CASES|generatorSeed/);
console.log('Verified 26 sealed blind inputs, 52 unique balanced proven primes, exact products and runtime/oracle separation');

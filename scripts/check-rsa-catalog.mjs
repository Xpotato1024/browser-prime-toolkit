import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url),bytes=await readFile(new URL('bench/staged-rsa/catalog.json',root));
const cases=JSON.parse(bytes),meta=JSON.parse(await readFile(new URL('bench/staged-rsa/provenance.json',root)));
assert.equal(createHash('sha256').update(bytes).digest('hex'),meta.catalogSha256);
assert.equal(meta.knownFactorsIncluded,false);assert.equal(cases.length,53);
assert.equal(new Set(cases.map(c=>c.id)).size,53);assert.equal(Object.keys(meta.publishedChecksums).length,53);
for(const c of cases){
 assert.deepEqual(Object.keys(c).sort(),['bits','digits','id','input','source']);assert.match(c.input,/^[1-9][0-9]*$/);
 const n=BigInt(c.input);assert.equal(n.toString(),c.input);assert.equal(c.input.length,c.digits);assert.equal(n.toString(2).length,c.bits);
 assert.ok(c.bits>=330&&c.bits<=2048);assert.ok(meta.sources.some(s=>s.id===c.source));
 const sum=meta.publishedChecksums[c.id];
 assert.equal(sum.kind,c.source==='rsa-admin-1997'?'mod-991889':'digit-sum');
 assert.equal(sum.kind==='mod-991889'?Number(n%991889n):[...c.input].reduce((s,d)=>s+Number(d),0),sum.value);
 assert.equal(Number(c.id.slice(4)),c.source==='rsa-admin-1997'?c.digits:c.bits);
}
for(const source of meta.sources){assert.match(source.sha256,/^[a-f0-9]{64}$/);assert.ok(source.bytes>0);assert.ok(source.url.startsWith('https://'));}
assert.equal(cases[0].id,'RSA-100');assert.ok(!cases.some(c=>c.id==='RSA-129'));
const generated='// Generated from catalog.json; no factors or answer hints.\nexport const RSA_CASES = Object.freeze('+JSON.stringify(cases,null,2)+');\n';
assert.equal(await readFile(new URL('bench/staged-rsa/cases.js',root),'utf8'),generated);
console.log('Verified 53 exact RSA moduli, primary-source hashes, published checksums, bits/digits and factor-free browser catalog');

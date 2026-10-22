import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {RUSQSIEVE_BASE64 as s256} from '../src/rusqsieve-dlp/wasm-bytes.js';
import {RUSQSIEVE_BASE64 as s64} from '../src/resources/wasm-64.js';
import {RUSQSIEVE_BASE64 as s128} from '../src/resources/wasm-128.js';
function code(b){let o=8;const u=()=>{let n=0,s=0,x;do{x=b[o++];n+=(x&127)*2**s;s+=7;}while(x&128);return n;};while(o<b.length){const id=b[o++],n=u(),start=o;o+=n;if(id===10)return b.subarray(start,o);}throw Error('Missing code');}
test('role hardcaps preserve byte-identical native code and complete compiled source set',()=>{
 const original=code(Buffer.from(s256,'base64')),baseline=JSON.parse(readFileSync(new URL('../native/rusqsieve-dlp/staged-build.json',import.meta.url)));
 for(const [cap,s] of [[64,s64],[128,s128]]){
  assert.deepEqual(code(Buffer.from(s,'base64')),original);
  const r=JSON.parse(readFileSync(new URL('../native/resources/build-'+cap+'.json',import.meta.url)));
  assert.deepEqual(r.compiledSources,baseline.compiledSources);assert.equal(r.cleanBuilds,2);assert.equal(r.memory.maximumBytes,cap*1048576);
 }
});

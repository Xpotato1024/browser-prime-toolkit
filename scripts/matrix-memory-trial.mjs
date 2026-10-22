// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync,realpathSync} from 'node:fs';
import {resolve,dirname,sep} from 'node:path';
import {createHash} from 'node:crypto';
import {graphApi} from '../src/graph-profile/session.js';
import {PackedSession} from '../src/graph-arena/profile.js';
import {longMemoryContract} from '../native/long-window/memory-contract.mjs';
const root=resolve(import.meta.dirname,'..'),[variant,caseId,output]=process.argv.slice(2),plan=JSON.parse(readFileSync(new URL('../bench/staged-matrix-memory-plan.json',import.meta.url)));
assert.equal(process.version,'v24.19.0');assert.ok(['baseline','candidate'].includes(variant));
const c=plan.cases.find(c=>c.id===caseId);assert.ok(c);assert.match(process.env.PRIME_MEASURED_HEAD??'',/^[a-f0-9]{40}$/);
const key=p=>{const r=realpathSync(p);return /^\/mnt\/[a-z]\//i.test(r)?r.toLowerCase():r;},parent=key(dirname(resolve(output))),rk=key(root);
assert.ok(parent!==rk&&!parent.startsWith(rk+sep));assert.ok(!existsSync(output)&&!existsSync(output+'.failed.json'));
const artifactPath=variant==='baseline'?'src/long-window/wasm-long-1024.js':'src/matrix-memory/wasm-1024.js';
const {RUSQSIEVE_BASE64}=await import(new URL('../'+artifactPath,import.meta.url)),binary=Buffer.from(RUSQSIEVE_BASE64,'base64'),sha=b=>createHash('sha256').update(b).digest('hex');
const contract=longMemoryContract(binary,1024);assert.ok(contract.initialBytes<=2*1048576);
const start=performance.now(),api=await graphApi(RUSQSIEVE_BASE64),instantiateMs=performance.now()-start;
let s=null,trapped=false;
try{
 const started=performance.now();s=new PackedSession(api,c.input);const packets=[],counters=[];
 let usable=0;
 for(let family=0;family<plan.limits.maxFamilies&&usable<s.target;family++){
  assert.ok(performance.now()-started<plan.limits.childMs);
  const p=s.packet(family);packets.push({family,bytes:p.length,sha256:sha(p)});usable=s.submit(p);counters.push(s.counters());
 }
 assert.ok(usable>=s.target);const column=s.columns(),columnSha256=sha(column),profile=s.profile(),before=s.memory(),extraction=s.extract();
 assert.equal(extraction.status,1);const n=BigInt(c.input),d=BigInt(extraction.divisor);assert.ok(d>1n&&d<n);assert.equal(n%d,0n);
 const after=s.memory();assert.equal(after.failures,0);assert.equal(api.codex_la_active(),0);assert.equal(api.codex_la_refusals(),0);
 const requestWallMs=performance.now()-started;assert.ok(requestWallMs<plan.limits.childMs);
 s.close();const disposed=s.closed;
 const receipt={plan:plan.id,measuredHead:process.env.PRIME_MEASURED_HEAD,runtime:process.version,variant,caseId,input:c.input,knownFactorsUsed:false,artifactPath,artifactSha256:sha(binary),memoryContract:contract,instantiateMs,requestWallMs,families:packets.length,target:s.target,usable,packets,counters,columnBytes:column.length,columnSha256,profile,before,after,extraction,disposed};
 const text=JSON.stringify(receipt,null,2)+'\n';assert.ok(Buffer.byteLength(text)<=plan.limits.maxReceiptBytes);writeFileSync(output,text,{flag:'wx'});
 console.log(JSON.stringify({caseId,variant,families:packets.length,wallMs:requestWallMs,peakRequested:after.peak,linear:after.linear}));
}catch(error){trapped=error instanceof WebAssembly.RuntimeError;writeFileSync(output+'.failed.json',JSON.stringify({plan:plan.id,measuredHead:process.env.PRIME_MEASURED_HEAD,variant,caseId,trapped,error:String(error.stack??error)},null,2)+'\n',{flag:'wx'});throw error;}
finally{if(s&&!trapped&&!s.closed)s.close();}

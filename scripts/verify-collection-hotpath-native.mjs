// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {graphApi} from '../src/graph-profile/session.js';
import {PackedSession} from '../src/graph-arena/profile.js';
import {RUSQSIEVE_BASE64 as baseline} from '../src/long-window/wasm-long-1024.js';
import {RUSQSIEVE_BASE64 as resieve4} from '../src/collection-hotpath/wasm-resieve4-1024.js';
import {RUSQSIEVE_BASE64 as sparse} from '../src/collection-hotpath/wasm-sparse-1024.js';
import {longMemoryContract} from '../native/long-window/memory-contract.mjs';
import {captureSourceGuard,checkSourceGuard} from './source-guard.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex'),rows=[];
assert.equal(process.version,'v24.19.0');
const guard=captureSourceGuard(process.cwd()),startedAt=new Date().toISOString();
for(const b of [resieve4,sparse])longMemoryContract(Buffer.from(b,'base64'),1024);
const cases=[['digits40','8156172677439289108635319830552518815109'],['digits64','8505664162359734566676378490297194387200285122470917324701475577']];
for(const[id,input]of cases){
 let proof=null;
 for(const variant of ['baseline','resieve4','sparse']){
  const started=performance.now(),api=await graphApi(({baseline,resieve4,sparse})[variant]);
  assert.equal(api.qs_abi_version(),6);assert.equal(api.codex_graph_roundtrip(),1);
  const s=new PackedSession(api,input),packets=[],counters=[];let usable=0,trapped=false;
  try{
   for(let family=0;family<1024&&usable<s.target;family++){
    assert.ok(performance.now()-started<60000);const p=s.packet(family);packets.push({family,bytes:p.length,sha256:sha(p)});usable=s.submit(p);counters.push(s.counters());
   }
   assert.ok(usable>=s.target);
   const columns=s.columns(),profile=s.profile(),before=s.memory(),result=s.extract(),after=s.memory();
   assert.equal(result.status,1);const n=BigInt(input),d=BigInt(result.divisor);assert.ok(d>1n&&d<n&&n%d===0n);
   const pair=[d,n/d].sort((a,b)=>a<b?-1:a>b?1:0).map(String),math={input,packets,counters,columnBytes:columns.length,columnSha256:sha(columns),profile,pair};
   if(proof)assert.deepEqual(math,proof);else proof=math;
   let phases=null,status=null;
   if(variant==='instrumented'){
    phases=Array.from({length:16},(_,id)=>({id,inclusiveMs:api.codex_collection_field(id,0),exclusiveMs:api.codex_collection_field(id,1),calls:api.codex_collection_field(id,2)}));
    status=Array.from({length:6},(_,i)=>api.codex_collection_status(i));
    assert.equal(status[0],0);assert.equal(status[1],0);assert.ok(status[2]<=2000000&&status[3]<=16);assert.ok(phases.every(p=>p.inclusiveMs>=p.exclusiveMs&&p.exclusiveMs>=0));
    assert.ok(phases[0].calls>=1&&phases[1].calls===packets.length&&phases[15].calls===packets.length,JSON.stringify({families:packets.length,phases,status}));
    assert.ok(phases[4].calls>0&&phases[10].calls>0&&phases[14].calls>0);
   }
   assert.equal(before.failures,0);assert.equal(after.failures,0);s.close();assert.equal(s.closed,true);
   rows.push({caseId:id,variant,knownFactorsUsed:false,requestWallMs:performance.now()-started,...math,before,after,phases,status,disposed:true});
  }catch(e){trapped=e instanceof WebAssembly.RuntimeError;throw e;}finally{if(!trapped&&!s.closed)s.close();}
 }
}
const output=process.argv[2];assert.ok(output);
checkSourceGuard(guard);
const text=JSON.stringify({kind:'Native WASM functional equality, not browser speed evidence',measuredHead:guard.head,startedAt,completedAt:new Date().toISOString(),nodeVersion:process.version,sourceGuard:{version:guard.version,files:guard.files,treeSha256:guard.treeSha256},artifacts:{baseline:sha(Buffer.from(baseline,'base64')),resieve4:sha(Buffer.from(resieve4,'base64')),sparse:sha(Buffer.from(sparse,'base64'))},rows},null,2)+'\n';assert.ok(Buffer.byteLength(text)<2097152);writeFileSync(output,text,{flag:'wx'});
for(const r of rows)console.log(JSON.stringify({caseId:r.caseId,variant:r.variant,ms:r.requestWallMs,families:r.packets.length,clockCalls:r.status?.[2],phaseMs:r.phases?.map(p=>[p.id,p.exclusiveMs])}));

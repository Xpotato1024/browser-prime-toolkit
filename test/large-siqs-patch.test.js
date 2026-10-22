import test from 'node:test';
import assert from 'node:assert/strict';
import {patchFullSiqs} from '../scripts/patch-full-siqs.mjs';
test('full SIQS validates cycle merge before addition and keeps packed implementation',()=>{
 const source='\tc0->cycle.list = (uint32 *)xrealloc(c0->cycle.list, \n';
 const r=patchFullSiqs('common/lanczos/lanczos_pre.c',source,{fixture:true});
 assert.match(r.text,/REQUIRE\(c0->cycle.num_relations<=8192/);
 assert.ok(r.text.indexOf('REQUIRE')<r.text.indexOf('xrealloc'));
});
test('full SIQS rejects changed source guard anchors',()=>{
 assert.throws(()=>patchFullSiqs('common/lanczos/lanczos_pre.c','changed',{fixture:true}),/patch/);
});

// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex'),rows=[];
for(const [kind,path]of [['unroll4',process.argv[2]]]){
 const b=readFileSync(path),receiptBytes=readFileSync(path+'.json'),r=JSON.parse(receiptBytes);
 assert.equal(sha(b),r.sha256);assert.equal(r.cleanBuilds,1);
 assert.equal(r.sourceHashes['native/score-unroll/oracle.rs'],sha(readFileSync('native/score-unroll/oracle.rs')));
 const a=(await WebAssembly.instantiate(b,{})).instance.exports;
 assert.equal(a.codex_score_unroll_oracle(),574);
 rows.push({kind,wasmSha256:r.sha256,receiptSha256:sha(receiptBytes),sourceHashes:r.sourceHashes,cases:574,pass:true});
}
const output=process.argv[3];assert.ok(output);
writeFileSync(output,JSON.stringify({kind:'Separate actual old/new Rust function oracles; no performance interpretation',rows},null,2)+'\n',{flag:'wx'});
console.log('574 score/resieve old-new cases including overflow and scratch reuse passed');

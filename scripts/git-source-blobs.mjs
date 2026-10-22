// SPDX-License-Identifier: AGPL-3.0-only
import assert from'node:assert/strict';import{execFileSync}from'node:child_process';import{createHash}from'node:crypto';const sha=b=>createHash('sha256').update(b).digest('hex');
export function historicalHashes(head,paths,root=process.cwd()){
 assert.match(head,/^[a-f0-9]{40}$/);
 const names=[...new Set(paths)];for(const p of names)assert.match(p,/^(?!.*(?:^|\/)\.\.(?:\/|$))[A-Za-z0-9_./-]+$/);
 const out=execFileSync('git',['cat-file','--batch'],{cwd:root,input:names.map(p=>head+':'+p+'\n').join(''),maxBuffer:64*1048576}),result=new Map();let offset=0;
 for(const p of names){const end=out.indexOf(10,offset);assert.ok(end>offset);const header=out.subarray(offset,end).toString();assert.match(header,/^[a-f0-9]{40} blob [0-9]+$/);const n=Number(header.split(' ')[2]);assert.ok(Number.isSafeInteger(n)&&n>=0&&end+2+n<=out.length);const b=out.subarray(end+1,end+1+n);assert.equal(out[end+1+n],10);result.set(p,sha(b));offset=end+2+n;}
 assert.equal(offset,out.length);return result;
}

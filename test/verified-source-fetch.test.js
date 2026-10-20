import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {fetchVerifiedSource,assertExternalCache} from '../scripts/verified-source-fetch.mjs';
const bytes=Buffer.from('fixed reviewed source'),entry={file:'fixed.tar.lz',url:'https://origin.invalid/fixed.tar.lz',bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};
const fixture=fn=>{const dir=mkdtempSync(join(tmpdir(),'prime-fetch-test-'));try{fn(dir);}finally{rmSync(dir,{recursive:true,force:true});}};
const mirror='https://official.invalid/fixed.tar.lz';
test('transport timeout falls back once and publishes only the exact pinned bytes',()=>fixture(directory=>{
 const seen=[];const curl=(_exe,args)=>{seen.push(args.at(-1));if(seen.length===1)return {status:28,stderr:'connect timeout',stdout:'000'};
  writeFileSync(args[args.indexOf('--output')+1],bytes);return {status:0,stdout:'200'};};
 const receipt=fetchVerifiedSource(entry,{directory,urls:[entry.url,mirror],curl});
 assert.deepEqual(seen,[entry.url,mirror]);assert.equal(receipt.url,mirror);assert.deepEqual(readFileSync(join(directory,entry.file)),bytes);
}));
test('a bad hash fails closed without trying a mirror or publishing',()=>fixture(directory=>{
 let calls=0;const curl=(_exe,args)=>{calls++;writeFileSync(args[args.indexOf('--output')+1],Buffer.alloc(bytes.length,1));return {status:0,stdout:'200'};};
 assert.throws(()=>fetchVerifiedSource(entry,{directory,urls:[entry.url,mirror],curl}),/hash mismatch/);
 assert.equal(calls,1);assert.equal(existsSync(join(directory,entry.file)),false);
}));
test('truncation, TLS refusal and exhausted transport never publish',()=>fixture(directory=>{
 for(const kind of ['short','tls','timeout']){let calls=0;const curl=(_exe,args)=>{calls++;
  if(kind==='short'){writeFileSync(args[args.indexOf('--output')+1],bytes.subarray(1));return {status:0,stdout:'200'};}
  return {status:kind==='tls'?60:28,stdout:'000',stderr:kind};};
  assert.throws(()=>fetchVerifiedSource(entry,{directory,urls:[entry.url,mirror],curl}));assert.equal(calls,kind==='timeout'?2:1);assert.equal(existsSync(join(directory,entry.file)),false);}
}));
test('cached mismatches and non-HTTPS candidates fail before network',()=>fixture(directory=>{
 let calls=0;const curl=()=>{calls++;throw Error('Unexpected network');};
 assert.throws(()=>fetchVerifiedSource(entry,{directory,urls:[entry.url,'http://official.invalid/file'],curl}));
 writeFileSync(join(directory,entry.file),Buffer.alloc(bytes.length,2));
 assert.throws(()=>fetchVerifiedSource(entry,{directory,urls:[entry.url,mirror],curl}),/hash mismatch/);assert.equal(calls,0);
}));

test('external cache guard rejects repo children including colon names',()=>{
 const root=join(tmpdir(),'prime-repo');
 for(const name of ['', 'child', 'cache:stage15'])assert.throws(()=>assertExternalCache(root,join(root,name)),/outside/);
 assert.equal(assertExternalCache(root,join(root,'..','outside')),join(tmpdir(),'outside'));
});

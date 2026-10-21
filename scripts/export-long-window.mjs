// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const root=resolve(import.meta.dirname,'..'),source=resolve(process.argv[2]??''),destination=join(root,'docs/benchmarks/staged-long-window-stage37');
assert.ok(source!==root&&!source.startsWith(root+'/'));assert.ok(!existsSync(destination),'Exclusive evidence directory');
const runBytes=readFileSync(join(source,'run.json')),run=JSON.parse(runBytes);
assert.ok(run.completedAt||run.stoppedAt);assert.ok(run.trials.length<=4);
const sha=b=>createHash('sha256').update(b).digest('hex'),files=new Map([['run.json',runBytes]]),index={encoding:'gzip+canonical-base64-lines76',head:run.head,files:{}};
for(const row of run.trials){
 for(const [suffix,expected,max]of [['json',row.sha256,16777216],['log',row.logSha256,4194304]]){
  if(!expected)continue;
  const original=readFileSync(join(source,row.id+'.'+suffix));assert.equal(sha(original),expected);assert.ok(original.length<=max);
  const packed=gzipSync(original,{level:9});assert.ok(gunzipSync(packed,{maxOutputLength:max}).equals(original));
  const text=packed.toString('base64').match(/.{1,76}/g).join('\n')+'\n',name=row.id+'.'+suffix+'.gz.base64';
  assert.ok(Buffer.byteLength(text)<=2097152,'Bounded repository evidence');
  files.set(name,Buffer.from(text));index.files[row.id+'.'+suffix]={file:name,originalBytes:original.length,originalSha256:sha(original),compressedBytes:packed.length,compressedSha256:sha(packed),encodedBytes:Buffer.byteLength(text)};
 }
 const w=readFileSync(join(source,row.id+'.windows.json'));assert.equal(sha(w),row.windowsMemorySha256);files.set(row.id+'.windows.json',w);
}
files.set('evidence-index.json',Buffer.from(JSON.stringify(index,null,2)+'\n'));
mkdirSync(destination);
for(const[name,b]of files)writeFileSync(join(destination,name),b,{flag:'wx'});
console.log('Originals retained locally; bounded reversible evidence exported '+destination);

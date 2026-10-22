import {readFileSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {compileInContainer} from './container-compile.mjs';
const root=new URL('../',import.meta.url),read=p=>readFileSync(new URL(p,root));
const cache=process.env.PRIME_MSIEVE_DIR,up=process.env.PRIME_UPSTREAM_DIR;
if(!cache||!up)throw Error('Set fixed source cache paths');
const git=(...args)=>{const p=spawnSync('git',['-C',cache,...args],{encoding:'utf8'});if(p.status!==0)throw Error(p.stderr);return p.stdout.trim();};
const commit='c8727d91305bdbe0972d160ef0ce61dd02ce9193';
if(git('rev-parse','HEAD')!==commit)throw Error('Source commit mismatch');
const files={},sources=[],sha=b=>createHash('sha256').update(b).digest('hex');
for(const line of git('ls-tree','-r',commit).split('\n')){
 const [meta,path]=line.split('\t'),[mode,type,id]=meta.split(' ');
 if(!['100644','100755'].includes(mode)||type!=='blob'||!/^[-A-Za-z0-9_./]+$/.test(path))throw Error('Unexpected upstream entry '+path);
 const b=readFileSync(cache+'/'+path),blob=createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
 if(blob!==id)throw Error('Changed upstream '+path);
 files['src/msieve/'+path]=b;sources.push({path,bytes:b.length,sha256:sha(b),gitBlob:id});
}
for(const e of JSON.parse(read('native/gmp/upstreams.json'))){const b=readFileSync(up+'/'+e.file);if(sha(b)!==e.sha256||b.length!==e.bytes)throw Error('Dependency pin');files['build/'+e.file]=b;}
const paths=['native/msieve-reference/main.c','native/msieve-reference/build.sh','native/msieve-reference/run.py'];
for(const p of paths)files['src/'+p]=read(p);
const corpus=[...JSON.parse(read('bench/candidate-corpus.json')),...JSON.parse(read('bench/selection-holdout.json'))];
files['src/build/cases.json']=Buffer.from(JSON.stringify(['balanced-96bit-0','balanced-112bit-0','holdout-balanced-112'].map(id=>{const c=corpus.find(c=>c.id===id);if(!c)throw Error(id);return c;})));
const image='emscripten/emsdk@sha256:27bc6267cb285223b8aebb7627bfebae7cb3ad2aaa0d5923b8aa5321793033e8';
const out=compileInContainer(image,files,['sh','/src/native/msieve-reference/build.sh'],'cat /work/reference.json',600000,'candidate');
writeFileSync(new URL('docs/benchmarks/llm01-msieve-reference.json',root),JSON.stringify({commit,image,sources,sourceHashes:Object.fromEntries([...paths,'scripts/evaluate-msieve-reference.mjs'].map(p=>[p,sha(read(p))])),...JSON.parse(out)},null,2)+'\n');
console.log('Full upstream native reference completed (not browser timing)');

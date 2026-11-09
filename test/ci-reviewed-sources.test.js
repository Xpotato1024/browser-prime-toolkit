import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,rmSync,readdirSync,mkdirSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {mergeReviewedSources,sourceKey,cachePolicy,assertArtifactId,loadReviewedSources,prepareSources} from '../scripts/ci-reviewed-sources.mjs';
import {fetchVerifiedSource} from '../scripts/verified-source-fetch.mjs';
const bytes=Buffer.from('reviewed raw archive'),entry={file:'one.tar.lz',url:'https://origin.invalid/one.tar.lz',bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};
const fixture=fn=>{const base=mkdtempSync(join(tmpdir(),'prime-union-'));try{return fn({root:join(base,'repo'),directory:join(base,'cache')});}finally{rmSync(base,{recursive:true,force:true});}};
test('source union deduplicates only matching pins and key binds exact archive identities',()=>{
 assert.equal(mergeReviewedSources([[entry],[entry]]).length,1);
 assert.throws(()=>mergeReviewedSources([[entry],[{...entry,bytes:entry.bytes+1}]]),/Conflicting source identity/);
 assert.throws(()=>mergeReviewedSources([[{...entry,file:'../escape'}]]),/Invalid pinned source/);
 assert.equal(sourceKey([entry]),sourceKey([{...entry,url:'https://other.invalid/one'}]));
 assert.notEqual(sourceKey([entry]),sourceKey([{...entry,sha256:'1'.repeat(64)}]));
 const second={...entry,file:'two.tar.lz'};assert.equal(sourceKey([entry,second]),sourceKey([second,entry]));
});
test('prefix cache matches and empty artifact IDs cannot select unverified data',()=>{
 const key=sourceKey([entry]);assert.equal(cachePolicy(key,''),'prepare');assert.equal(cachePolicy(key,key,'true'),'verify');
 assert.throws(()=>cachePolicy(key,'','maybe'),/Inconsistent/);
 assert.throws(()=>cachePolicy(key,'','true'),/Inconsistent/);assert.throws(()=>cachePolicy(key,key,'false'),/Inconsistent/);
 assert.throws(()=>cachePolicy(key,key+'-extra','true'),/Nonexact/);assert.throws(()=>cachePolicy('bad',''),/Invalid/);
 for(const id of ['',undefined,'0','1,2','-1'])assert.throws(()=>assertArtifactId(id),/One explicit/);assert.equal(assertArtifactId('123'),'123');
});

test('producer fetches each source once then consumers reverify without network',()=>fixture(({root,directory})=>{
 let calls=0;const curl=(_exe,args)=>{calls++;writeFileSync(args[args.indexOf('--output')+1],bytes);return {status:0,stdout:'200'};};
 const fetchSource=(e,options)=>fetchVerifiedSource(e,{...options,curl}),entries=[entry];
 const produced=prepareSources({root,directory,entries,mode:'prepare',fetchSource});assert.equal(calls,1);assert.equal(produced.files,1);assert.equal(produced.acquisition[0].source,'verified-download');
 for(let i=0;i<5;i++)assert.equal(prepareSources({root,directory,entries,mode:'verify',fetchSource}).receipts[0].source,'verified-cache');
 assert.equal(calls,1);assert.deepEqual(readdirSync(directory),[entry.file]);
}));
for(const failure of ['missing','short','hash','extra','symlink','directory'])test('restored '+failure+' cache is rejected rather than repaired',()=>fixture(({root,directory})=>{
 mkdirSync(directory);let entries=[entry],calls=0;
 if(failure!=='missing')writeFileSync(join(directory,entry.file),failure==='short'?bytes.subarray(1):failure==='hash'?Buffer.alloc(bytes.length):bytes);
 if(failure==='extra')writeFileSync(join(directory,'extra'),bytes);
 if(failure==='symlink'){rmSync(join(directory,entry.file));symlinkSync('missing',join(directory,entry.file));}
 if(failure==='directory'){rmSync(join(directory,entry.file));mkdirSync(join(directory,entry.file));}
 const fetchSource=(e,options)=>fetchVerifiedSource(e,{...options,curl:()=>{calls++;throw Error('Unexpected network');}});
 assert.throws(()=>prepareSources({root,directory,entries,mode:'verify',fetchSource}));assert.equal(calls,0);
}));
test('partial producer directories and source-cache symlinks fail closed',()=>fixture(({root,directory})=>{
 mkdirSync(directory);writeFileSync(join(directory,entry.file),bytes);const entries=[entry,{...entry,file:'two.tar.lz'}];
 assert.throws(()=>prepareSources({root,directory,entries,mode:'prepare'}),/Exact source archive set/);
 const linked=directory+'-link';symlinkSync(directory,linked);
 assert.throws(()=>prepareSources({root,directory:linked,entries:[entry]}),/Regular source cache directory/);
}));
test('repository source union is nine exact archives with independently hosted GMP fallback',()=>{
 const entries=loadReviewedSources(resolve('.'));assert.equal(entries.length,9);assert.equal(new Set(entries.map(e=>e.file)).size,9);
 for(const name of ['gmp-6.1.2.tar.lz','gmp-6.3.0.tar.xz'])assert.equal(entries.find(e=>e.file===name).urls[2],'https://mirrors.kernel.org/gnu/gmp/'+name);
});

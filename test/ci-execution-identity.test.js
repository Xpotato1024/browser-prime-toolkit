// SPDX-License-Identifier: AGPL-3.0-only
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {executionIdentity} from '../scripts/ci-execution-identity.mjs';
const a='a'.repeat(40),b='b'.repeat(40);
const base={event:'push',workflowSha:a,checkoutSha:a,eventHeadSha:a,node:'24.22.1',requiredNode:'24.22.1',dirty:false,runId:'1',attempt:2};

test('annotated tag identity binds raw ref object and peeled commit independently',()=>{
 const tag={...base,eventRef:'refs/tags/v0.1.4',workflowRef:'refs/tags/v0.1.4',eventHeadSha:b,eventRefSha:b,eventHeadType:'tag',eventCommitSha:a};
 assert.equal(executionIdentity(tag).eventHeadSha,b);
 for(const change of [{eventRefSha:a},{eventCommitSha:b},{workflowRef:'refs/tags/other'},{eventHeadType:'tree'},{eventRef:'refs/heads/main'},{eventRefSha:undefined},{eventCommitSha:undefined}])
  assert.throws(()=>executionIdentity({...tag,...change}));
 const lightweight={...tag,eventHeadSha:a,eventRefSha:a,eventHeadType:'commit'};
 assert.equal(executionIdentity(lightweight).checkoutSha,a);
 assert.throws(()=>executionIdentity({...lightweight,eventHeadSha:b,eventRefSha:b}));
});

test('CLI verifies real annotated and lightweight Git tags without changing checkout identity',()=>{
 const root=mkdtempSync(join(tmpdir(),'prime-ci-identity-')),script=resolve('scripts/ci-execution-identity.mjs');
 const git=(...args)=>execFileSync('git',['-c','user.name=Identity test','-c','user.email=identity-test@example.invalid','-c','commit.gpgSign=false','-c','tag.gpgSign=false',...args],{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
 try{
  git('init');writeFileSync(join(root,'.node-version'),process.versions.node+'\n');git('add','.node-version');git('commit','-m','fixture');
  const commit=git('rev-parse','HEAD');
  git('tag','-a','annotated','-m','fixture');git('tag','lightweight');
  for(const name of ['annotated','lightweight']){
   const ref='refs/tags/'+name,after=git('rev-parse',ref),path=join(root,'event.json');writeFileSync(path,JSON.stringify({ref,after}));
   const env={...process.env,GITHUB_ACTIONS:'true',GITHUB_EVENT_NAME:'push',GITHUB_SHA:commit,GITHUB_REF:ref,GITHUB_EVENT_PATH:path,GITHUB_STEP_SUMMARY:'',GITHUB_RUN_ID:'fixture',GITHUB_RUN_ATTEMPT:'1'};
   const output=execFileSync(process.execPath,[script],{cwd:root,env,encoding:'utf8'}),identity=JSON.parse(output.trim().slice('CI_EXECUTION_IDENTITY '.length));
   assert.equal(identity.checkoutSha,commit);assert.equal(identity.eventHeadSha,after);assert.equal(identity.eventRefSha,after);assert.equal(identity.eventCommitSha,commit);assert.equal(identity.eventHeadType,name==='annotated'?'tag':'commit');
   assert.throws(()=>execFileSync(process.execPath,[script],{cwd:root,env:{...env,GITHUB_REF:'refs/tags/unrelated'},stdio:'pipe'}));
  }
 }finally{rmSync(root,{recursive:true,force:true});}
});
test('push and PR merge execution identities remain distinct',()=>{
 assert.deepEqual(executionIdentity(base),{...base,schema:1});
 const pr=executionIdentity({...base,event:'pull_request',workflowSha:b,checkoutSha:b});
 assert.equal(pr.eventHeadSha,a);assert.equal(pr.checkoutSha,b);assert.equal(pr.attempt,2);
});
test('wrong checkout, wrong Node or tracked dirty CI checkout fails',()=>{
 assert.throws(()=>executionIdentity({...base,checkoutSha:b}),/checkout/);
 assert.throws(()=>executionIdentity({...base,node:'24.19.0'}),/Node/);
 assert.throws(()=>executionIdentity({...base,dirty:true}),/dirty/);
 assert.equal(executionIdentity({...base,event:'local',dirty:true,runId:null}).event,'local');
});
test('every workflow setup-node uses project file and records its actual checkout',()=>{
 for(const name of readdirSync('.github/workflows').filter(n=>/\.ya?ml$/.test(n))){
  const text=readFileSync('.github/workflows/'+name,'utf8');
  const setups=[...text.matchAll(/uses: actions\/setup-node@/g)];
  if(!setups.length)continue;
  assert.equal((text.match(/node-version-file: .node-version/g)??[]).length,setups.length,name);
  assert.equal((text.match(/run: node scripts\/ci-execution-identity.mjs/g)??[]).length,setups.length,name);
  assert.ok(!/node-version:/.test(text),name);
 }
});
test('current functional proof helpers retain an exact project Node precondition',()=>{
 const names=['collection-native','collection-hotpath-native','resieve-followup-native','resieve-prefix-native','score-unroll-native','selected-wide-helper'];
 for(const name of names){
  const source=readFileSync('scripts/verify-'+name+'.mjs','utf8');
  assert.ok(source.includes("assert.equal(process.version,'v'+readFileSync(new URL('../.node-version',import.meta.url),'utf8').trim())"),name);
  assert.ok(!source.includes("assert.equal(process.version,'v24.19.0')"),name);
 }
 // Immutable historical evidence and its benchmark entry remain on their measured runtime.
 assert.ok(readFileSync('scripts/report-hotpath-repeat.mjs','utf8').includes("assert.equal(run.nodeVersion,'v24.19.0')"));
 assert.ok(readFileSync('scripts/benchmark-hotpath-repeat.mjs','utf8').includes("assert.equal(process.version,'v24.19.0')"));
});

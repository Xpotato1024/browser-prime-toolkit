// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';
import {readFileSync,appendFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';

export function executionIdentity(value){
 const {event,node,requiredNode,workflowSha,checkoutSha,eventHeadSha,dirty}=value;
 let tagRefRepresentation;
 assert.equal(node,requiredNode,'Node must match .node-version');
 if(event!=='local'){
  assert.match(checkoutSha,/^[a-f0-9]{40}$/,'checkout SHA');
  assert.equal(checkoutSha,workflowSha,'actual checkout must match workflow SHA');
  if(event==='push'){
   const tag=String(value.eventRef).startsWith('refs/tags/')||String(value.workflowRef).startsWith('refs/tags/');
   if(tag){
    assert.match(value.eventRef,/^refs\/tags\/.+$/,'push tag ref');
    assert.equal(value.workflowRef,value.eventRef,'workflow ref must match pushed tag ref');
    assert.match(value.eventRefSha,/^[a-f0-9]{40}$/,'tag ref object SHA');
    assert.match(eventHeadSha,/^[a-f0-9]{40}$/,'raw event object SHA');
    assert.ok(['tag','commit'].includes(value.eventHeadType),'tag ref must resolve from a tag or commit object');
    assert.equal(value.eventCommitSha,checkoutSha,'peeled pushed tag must match checkout');
    assert.equal(value.eventRefCommitSha,checkoutSha,'local tag ref must peel to checkout');
    if(value.eventHeadType==='tag'){assert.equal(typeof value.eventTagName,'string','raw tag object name');assert.equal('refs/tags/'+value.eventTagName,value.eventRef,'raw tag object name must match event ref');}
    else {assert.equal(value.eventTagName,null,'lightweight tag has no tag-object name');assert.equal(eventHeadSha,checkoutSha,'lightweight tag must point directly to checkout');}
    const raw=value.eventRefSha===eventHeadSha;
    const normalized=value.eventHeadType==='tag'&&value.eventRefSha===checkoutSha&&value.eventRefType==='commit';
    assert.ok(raw||normalized,'local tag ref must be the raw event object or exact checkout-normalized commit');
    if(raw)assert.equal(value.eventRefType,value.eventHeadType,'raw local ref object type must match event object');
    tagRefRepresentation=raw?'raw-event-object':'checkout-normalized-commit';
   }else assert.equal(checkoutSha,eventHeadSha,'push checkout must match event head');
  }
  assert.equal(dirty,false,'CI checkout is tracked dirty');
 }
 return {...value,...(tagRefRepresentation?{tagRefRepresentation}:{}),schema:1};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const env=process.env,git=(...args)=>execFileSync('git',args,{encoding:'utf8',env:{...env,GIT_NO_REPLACE_OBJECTS:'1',GIT_OPTIONAL_LOCKS:'0'}}).trim();
 const event=env.GITHUB_ACTIONS==='true'?env.GITHUB_EVENT_NAME:'local';
 const payload=event==='local'?{}:JSON.parse(readFileSync(env.GITHUB_EVENT_PATH,'utf8'));
 const tagIdentity={};
 if(event==='push'&&(String(payload.ref).startsWith('refs/tags/')||String(env.GITHUB_REF).startsWith('refs/tags/'))){
  assert.equal(payload.ref,env.GITHUB_REF,'workflow ref must match pushed tag ref');
  assert.match(payload.after,/^[a-f0-9]{40}$/,'raw pushed tag object SHA');
  git('check-ref-format',payload.ref);
  tagIdentity.eventRef=payload.ref;tagIdentity.workflowRef=env.GITHUB_REF;
  tagIdentity.eventRefSha=git('rev-parse','--verify',payload.ref);
  tagIdentity.eventRefType=git('cat-file','-t',tagIdentity.eventRefSha);
  tagIdentity.eventRefCommitSha=git('rev-parse','--verify',payload.ref+'^{commit}');
  const probe=execFileSync('git',['cat-file','--batch-check'],{encoding:'utf8',input:payload.after+'\n',env:{...env,GIT_NO_REPLACE_OBJECTS:'1',GIT_OPTIONAL_LOCKS:'0'}}).trim().split(' ');
  assert.equal(probe[0],payload.after,'event object probe must retain exact SHA');
  tagIdentity.eventObjectFetched=probe[1]==='missing';
  if(tagIdentity.eventObjectFetched){
   assert.equal(probe.length,2,'missing event object probe');
   assert.equal(git('rev-parse','HEAD'),env.GITHUB_SHA,'metadata fetch requires exact workflow checkout');
   assert.equal(process.versions.node,readFileSync('.node-version','utf8').trim(),'metadata fetch requires pinned Node');
   assert.equal(git('status','--porcelain','--untracked-files=no'),'','metadata fetch requires tracked clean checkout');
   // Existing checkout origin, one immutable object, no ref/FETCH_HEAD update or submodules.
   execFileSync('git',['fetch','--no-tags','--no-recurse-submodules','--no-write-fetch-head','--depth=1','origin',payload.after],{encoding:'utf8',timeout:15000,stdio:['ignore','pipe','pipe'],env:{...env,GIT_NO_REPLACE_OBJECTS:'1',GIT_OPTIONAL_LOCKS:'0'}});
  }else {assert.equal(probe.length,3,'existing event object probe');assert.match(probe[2],/^\d+$/,'event object size');}
  tagIdentity.eventHeadType=git('cat-file','-t',payload.after);
  tagIdentity.eventCommitSha=git('rev-parse','--verify',payload.after+'^{commit}');
  tagIdentity.eventTagName=tagIdentity.eventHeadType==='tag'?git('cat-file','-p',payload.after).split('\n\n',1)[0].match(/^tag (.+)$/m)?.[1]??null:null;
 }
 const identity=executionIdentity({
  event,workflowSha:env.GITHUB_SHA??null,checkoutSha:git('rev-parse','HEAD'),
  eventHeadSha:payload.pull_request?.head?.sha??payload.after??env.GITHUB_SHA??null,
  node:process.versions.node,requiredNode:readFileSync('.node-version','utf8').trim(),
  dirty:git('status','--porcelain','--untracked-files=no')!=='',
  runId:event==='local'?null:env.GITHUB_RUN_ID,attempt:event==='local'?null:Number(env.GITHUB_RUN_ATTEMPT),...tagIdentity
 });
 console.log('CI_EXECUTION_IDENTITY '+JSON.stringify(identity));
 if(env.GITHUB_STEP_SUMMARY)appendFileSync(env.GITHUB_STEP_SUMMARY,'\nExecution identity\n\n\x60\x60\x60json\n'+JSON.stringify(identity,null,2)+'\n\x60\x60\x60\n');
}

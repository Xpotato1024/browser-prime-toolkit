// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';
import {readFileSync,appendFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';

export function executionIdentity(value){
 const {event,node,requiredNode,workflowSha,checkoutSha,eventHeadSha,dirty}=value;
 assert.equal(node,requiredNode,'Node must match .node-version');
 if(event!=='local'){
  assert.match(checkoutSha,/^[a-f0-9]{40}$/,'checkout SHA');
  assert.equal(checkoutSha,workflowSha,'actual checkout must match workflow SHA');
  if(event==='push')assert.equal(checkoutSha,eventHeadSha,'push checkout must match event head');
  assert.equal(dirty,false,'CI checkout is tracked dirty');
 }
 return {...value,schema:1};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const env=process.env,git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
 const event=env.GITHUB_ACTIONS==='true'?env.GITHUB_EVENT_NAME:'local';
 const payload=event==='local'?{}:JSON.parse(readFileSync(env.GITHUB_EVENT_PATH,'utf8'));
 const identity=executionIdentity({
  event,workflowSha:env.GITHUB_SHA??null,checkoutSha:git('rev-parse','HEAD'),
  eventHeadSha:payload.pull_request?.head?.sha??payload.after??env.GITHUB_SHA??null,
  node:process.versions.node,requiredNode:readFileSync('.node-version','utf8').trim(),
  dirty:git('status','--porcelain','--untracked-files=no')!=='',
  runId:event==='local'?null:env.GITHUB_RUN_ID,attempt:event==='local'?null:Number(env.GITHUB_RUN_ATTEMPT)
 });
 console.log('CI_EXECUTION_IDENTITY '+JSON.stringify(identity));
 if(env.GITHUB_STEP_SUMMARY)appendFileSync(env.GITHUB_STEP_SUMMARY,'\nExecution identity\n\n\x60\x60\x60json\n'+JSON.stringify(identity,null,2)+'\n\x60\x60\x60\n');
}

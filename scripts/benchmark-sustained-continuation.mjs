// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';import{readFileSync,writeFileSync,mkdirSync,existsSync,openSync,closeSync}from'node:fs';import{execFileSync,spawnSync}from'node:child_process';import{resolve,join}from'node:path';import{createHash}from'node:crypto';
import{sameFamilies}from'./scheduler-packets.mjs';import{pairedDecision,extensionGate,safeOutcome,grownCancelSafe}from'./sustained-decision.mjs';
import{trialRecord,exclusiveOutput}from'./sustained-trial-record.mjs';import{validateCampaign,historicalRun,LEGACY,CURRENT,OLD_HEAD,SOURCE_PATHS}from'./sustained-continuation-proof.mjs';
const root=resolve(import.meta.dirname,'..'),read=p=>readFileSync(join(root,p)),sha=b=>createHash('sha256').update(b).digest('hex'),plan=JSON.parse(read('bench/staged-sustained-plan.json'));
execFileSync(process.execPath,['scripts/check-sustained.mjs'],{cwd:root,stdio:'pipe'});
const head=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();assert.equal(execFileSync('git',['status','--porcelain','--untracked-files=no'],{cwd:root,encoding:'utf8'}).trim(),'','Freeze clean core first');
const dir=join(root,CURRENT);assert.ok(!existsSync(dir),'No overwrite/retry');
const snapshot=()=>{const text=readFileSync('/proc/meminfo','utf8');return{at:new Date().toISOString(),availableMiB:Number(/^MemAvailable:\s+(\d+)/m.exec(text)?.[1]??0)/1024,loadavg:readFileSync('/proc/loadavg','utf8').trim()};};
const{old,sha256}=historicalRun(),run={plan:plan.id,planSha256:sha(read('bench/staged-sustained-plan.json')),measuredHead:head,startedAt:new Date().toISOString(),sourceRun:{path:LEGACY+'/run.json',sha256,measuredHead:OLD_HEAD,stoppedAt:old.stoppedAt,stopReason:old.stopReason},continuationSourceFiles:Object.fromEntries(SOURCE_PATHS.map(p=>[p,sha(read(p))])),preflight:old.preflight.map(r=>({...r,evidenceDir:LEGACY,evidenceHead:OLD_HEAD})),controls:old.controls.map(r=>({...r,evidenceDir:LEGACY,evidenceHead:OLD_HEAD})),coordinator:old.coordinator.map(r=>({...r,evidenceDir:LEGACY,evidenceHead:OLD_HEAD})),sustained:[],cancels:[],extension:[],hostStart:snapshot(),familyProof:old.familyProof,fixedFamilyProof:old.fixedFamilyProof};
const historical=validateCampaign(run),all=[...historical.all],expectedInput=JSON.parse(read('bench/staged-rsa/catalog.json')).find(r=>r.id===plan.case).input;
run.coordinatorDecision=pairedDecision(historical.groups.coordinator,{baseline:'combined',candidate:'dedicated',label:r=>r.coordinator});exclusiveOutput(dir);
const save=()=>writeFileSync(join(dir,'run.json'),JSON.stringify(run,null,2)+'\n');
const variants={2:'two-drop',3:'three-drop',4:'four-drop'};
function trial(t,phase){
 assert.ok(Date.now()<Date.parse('2026-10-20T22:00:00Z'),'New exploration cutoff');
 assert.equal(execFileSync('git',['status','--porcelain','--untracked-files=no'],{cwd:root,encoding:'utf8'}).trim(),'');assert.equal(execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),head);
 const file=join(dir,t.id+'.json'),log=join(dir,t.id+'.log'),args=['scripts/verify-sustained.mjs','--coordinator',t.coordinator,'--engine',variants[t.workers],'--budget-ms',String(t.budgetMs),'--out',file];
 if(phase!=='preflight')args.push('--case',plan.case);if(t.fixedFamilies)args.push('--fixed-families','4');if(t.cancelAfterMs)args.push('--cancel-after-ms',String(t.cancelAfterMs));
 const hostBefore=snapshot(),fd=openSync(log,'wx');let result;
 try{result=spawnSync(process.execPath,args,{cwd:root,env:{...process.env,PRIME_MEASURED_HEAD:head},stdio:['ignore',fd,fd],timeout:(t.cancelAfterMs??t.budgetMs)+90000});}finally{closeSync(fd);}
 const row={...t,evidenceDir:CURRENT,evidenceHead:head,phase,args,hostBefore,hostAfter:snapshot(),exitCode:result.status,signal:result.signal,error:result.error?.message??null,rawSha256:existsSync(file)?sha(readFileSync(file)):null,logSha256:sha(readFileSync(log))};run[phase].push(row);save();console.log(JSON.stringify(row));
 if(result.status!==0||result.signal||result.error)throw Error('Harness failure: '+t.id);
 const receipt=JSON.parse(readFileSync(file));assert.equal(receipt.measuredHead,head);assert.deepEqual(receipt.quiet,{networkRequests:0,httpRequests:0,badEvents:0,assetServerStopped:true,cacheDisabled:true});assert.equal(receipt.ownership.live,0);assert.equal(receipt.ownership.liveSources,0);
 if(phase==='preflight'){assert.equal(receipt.records[0].tests.length,16);assert.ok(receipt.records[0].tests.every(c=>c.pass));return;}
 const record=trialRecord(t,receipt.records[0],expectedInput);assert.equal(record.outcome.workers,t.workers);assert.equal(record.outcome.coordinatorCompute,t.coordinator==='combined');all.push(record);run.familyProof=sameFamilies(all);save();
 if(phase==='controls'){assert.equal(record.outcome.reason,'fixed-family-bound');return record;}
 if(phase==='cancels'){assert.ok(grownCancelSafe(record),'Positive native graph growth before cancel');assert.equal(record.outcome.kind,'cancelled');assert.ok(record.outcome.familiesSubmitted>=4);assert.ok(record.outcome.requestWallMs>=119000&&record.outcome.requestWallMs<=122000);return record;}
 if(!safeOutcome(record.outcome))throw Error('Non-budget or unsafe outcome: '+t.id+' '+record.outcome.reason);
 return record;
}
try{
 save();
 const sustained=plan.sustainedTrials.map(t=>trial(t,'sustained'));run.sustainedDecision=pairedDecision(sustained,{baseline:'2',candidate:'4',label:r=>String(r.workers)});save();
 const cancels=plan.cancelControls.map(t=>trial(t,'cancels'));const host=snapshot();run.extensionGate=extensionGate({records:sustained,cancels,availableMiB:host.availableMiB,now:host.at});save();
 if(run.extensionGate.eligible){const ext=plan.extensionTrials.map(t=>trial(t,'extension'));run.extensionDecision=pairedDecision(ext,{baseline:'2',candidate:'4',label:r=>String(r.workers)});save();}
 run.completedAt=new Date().toISOString();run.hostEnd=snapshot();save();console.log('Completed predeclared bounded series');
}catch(error){run.stoppedAt=new Date().toISOString();run.stopReason=error.message;run.hostEnd=snapshot();save();console.error(error);process.exitCode=1;}

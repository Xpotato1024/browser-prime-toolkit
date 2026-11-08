// SPDX-License-Identifier: AGPL-3.0-only
import test from 'node:test';
import assert from 'node:assert/strict';
import {runDeadlineProbe,deadlineDetails} from '../bench/lab-deadline-probe.js';
import {createLabRunner} from '../src/siqs-lab/runner.js';
import {readFileSync} from 'node:fs';
import {deriveSiqsLabCi,originals} from '../scripts/generate-siqs-lab-ci.mjs';
import {labAsset} from '../scripts/siqs-lab-ci-asset-route.mjs';
const input='1427247692705959880439315947500961989719490561';
function clock(){let time=0,sequence=0;const timers=new Map();return{now:()=>time,schedule:(fn,ms)=>{const id=++sequence;timers.set(id,{fn,due:time+ms});return id;},unschedule:id=>timers.delete(id),size:()=>timers.size,jump:target=>{time=target;},fireAt:due=>{const entry=[...timers].find(([,t])=>t.due===due);assert.ok(entry);timers.delete(entry[0]);time=due;entry[1].fn();},async advance(target){for(;;){const next=[...timers].sort((a,b)=>a[1].due-b[1].due||a[0]-b[0])[0];if(!next||next[1].due>target)break;timers.delete(next[0]);time=Math.max(time,next[1].due);next[1].fn();for(let i=0;i<12;i++)await Promise.resolve();}time=target;for(let i=0;i<12;i++)await Promise.resolve();}};}
function factory(c,{readyAt=0,wrong=false}={}){const metrics={created:0,posted:0,killed:0,released:0};return{metrics,createWorker(){metrics.created++;let readyTimer;const w={terminate(){metrics.killed++;c.unschedule(readyTimer);},releaseSource(){metrics.released++;},postMessage(){metrics.posted++;}};if(readyAt!==null)readyTimer=c.schedule(()=>w.onmessage?.({data:{type:'ready',version:14,wasmBytes:wrong?1:268435456}}),readyAt);return w;}};}
test('bounded readiness is separate from the original posted-worker deadline',async()=>{
 const c=clock(),f=factory(c,{readyAt:700});const pending=runDeadlineProbe({input,createWorker:f.createWorker,...c});await c.advance(2000);const result=await pending;
 assert.equal(result.passed,true,JSON.stringify(result));assert.equal(result.setupElapsedMs,700);assert.ok(result.elapsedMs<1000);assert.equal(f.metrics.posted,1);assert.equal(f.metrics.killed,1);assert.equal(f.metrics.released,1);assert.equal(c.size(),0);
});

for(const options of [{readyAt:null},{readyAt:5001},{wrong:true}])test('setup failures remain failures and release owned resources '+JSON.stringify(options),async()=>{
 const c=clock(),f=factory(c,options),pending=runDeadlineProbe({input,createWorker:f.createWorker,...c});await c.advance(6000);const r=await pending;
 assert.equal(r.passed,false);assert.equal(r.phase,'prepare');assert.match(r.error,/ready profile|readiness deadline/);assert.equal(r.fixture.handed,false);assert.equal(r.fixture.setupLimitMs,5000);assert.equal(f.metrics.posted,0);assert.equal(f.metrics.killed,1);assert.equal(f.metrics.released,1);assert.equal(c.size(),0);
});
test('deadline diagnostics retain each original predicate rather than accepting another terminal outcome',()=>{
 const good={kind:'incomplete',hostStops:[{reason:'host-phase-deadline',posted:true,charged:8000000000}],elapsedMs:617,allWorkersDisposed:true,disposalErrors:[],chargedOperations:8000000000};
 assert.equal(deadlineDetails(good).passed,true);
 for(const [field,value,check]of [['kind','timeout','incomplete'],['hostStops',[{reason:'initialization-deadline',posted:false}],'postedPhaseDeadline'],['elapsedMs',1300,'withinWallLimit'],['allWorkersDisposed',false,'allWorkersDisposed']]){
  const d=deadlineDetails({...good,[field]:value});assert.equal(d.passed,false);assert.equal(d.checks[check],false);assert.deepEqual(d[field],value);
 }
});

for(const [label,readyAt,reason,posted]of [['ready',0,'host-phase-deadline',true],['never ready',null,'initialization-deadline',false],['cold readiness consumes the collection window',700,'initialization-deadline',false]])test('runner uses the requested phase and initialization deadlines: '+label,async()=>{
 const c=clock(),f=factory(c,{readyAt}),runner=createLabRunner({createWorker:f.createWorker,...c}),pending=runner.run(input,{timeBudgetMs:1000});
 await c.advance(1000);const r=await pending;runner.dispose();
 assert.equal(r.kind,'incomplete');assert.equal(r.elapsedMs,950-1000/3);assert.deepEqual(r.hostStops,[{phase:'collect',seed:1,reason,posted,charged:posted?8000000000:0}]);
 assert.equal(r.chargedOperations,posted?8000000000:0);assert.equal(r.allWorkersDisposed,true);assert.equal(f.metrics.posted,posted?1:0);assert.equal(f.metrics.killed,1);assert.equal(f.metrics.released,1);assert.equal(c.size(),0);
});
test('late ready is rejected even before an overdue initialization callback runs',async()=>{
 const c=clock(),f=factory(c,{readyAt:null});let worker;const runner=createLabRunner({...c,createWorker:()=>worker=f.createWorker()}),pending=runner.run(input,{timeBudgetMs:1000});
 c.jump(617);worker.onmessage({data:{type:'ready',version:14,wasmBytes:268435456}});await c.advance(1000);const r=await pending;runner.dispose();
 assert.equal(r.hostStops[0].reason,'late-ready');assert.equal(r.hostStops[0].posted,false);assert.equal(r.chargedOperations,0);assert.equal(f.metrics.killed,1);assert.equal(f.metrics.released,1);assert.equal(c.size(),0);
});
test('global deadline retires posted work independently of phase callbacks',async()=>{
 const c=clock(),f=factory(c),runner=createLabRunner({...c,createWorker:f.createWorker}),pending=runner.run(input,{timeBudgetMs:1000});
 await c.advance(0);c.fireAt(950);await c.advance(1000);const r=await pending;runner.dispose();
 assert.equal(r.kind,'timeout');assert.equal(r.hostStops[0].reason,'global-deadline');assert.equal(r.hostStops[0].posted,true);assert.equal(r.chargedOperations,8000000000);assert.equal(r.allWorkersDisposed,true);assert.equal(f.metrics.killed,1);assert.equal(f.metrics.released,1);assert.equal(c.size(),0);
});
test('a delayed host callback remains a failed deadline contract',async()=>{
 const c=clock(),f=factory(c),pending=runDeadlineProbe({input,createWorker:f.createWorker,...c});await c.advance(0);c.jump(1400);await c.advance(1400);const r=await pending;
 assert.equal(r.passed,false);assert.equal(r.kind,'timeout');assert.equal(r.elapsedMs,1400);assert.equal(r.checks.withinWallLimit,false);assert.equal(f.metrics.killed,1);assert.equal(f.metrics.released,1);assert.equal(c.size(),0);
});

test('CI adapter derives exactly from byte-fixed historical measurement sources',()=>{
 const inputs=Object.fromEntries(Object.keys(originals).map(p=>[p,readFileSync(p,'utf8')]));
 for(const [path,expected]of Object.entries(deriveSiqsLabCi(inputs)))assert.equal(readFileSync(path,'utf8'),expected,path);
 for(const path of Object.keys(originals))assert.throws(()=>deriveSiqsLabCi({...inputs,[path]:inputs[path]+'\n'}),/Historical source must remain byte-fixed/);
 const pkg=JSON.parse(readFileSync('package.json','utf8'));assert.equal(pkg.scripts['verify:siqs-lab'],'node scripts/verify-siqs-lab-ci.mjs');assert.match(pkg.scripts['check:siqs-lab'],/generate-siqs-lab-ci.mjs --check/);
 assert.match(readFileSync('scripts/benchmark-siqs-lab.mjs','utf8'),/scripts\/verify-siqs-lab\.mjs/);
});
test('CI route adds only local fixture modules and keeps private oracle paths blocked',()=>{
 for(const p of ['bench/siqs-lab-ci.html','bench/siqs-lab-ci.js','bench/lab-deadline-probe.js','src/siqs-lab/runner.js'])assert.equal(labAsset('/'+p),p);
 for(const p of ['/bench/siqs-lab-plan.json','/bench/staged-rsa/catalog.json','/bench/staged-full/catalog.json','/package.json','/../bench/lab-deadline-probe.js','/%2562ench/lab-deadline-probe.js','/%'])assert.equal(labAsset(p),null,p);
});

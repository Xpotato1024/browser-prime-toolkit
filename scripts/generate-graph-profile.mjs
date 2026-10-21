// SPDX-License-Identifier: AGPL-3.0-only
// Derive a new experiment namespace; historical measured sources remain byte-identical.
import assert from 'node:assert/strict';
import{readFileSync,writeFileSync}from'node:fs';
const read=p=>readFileSync(p,'utf8'),write=(p,s)=>{if(process.argv.includes('--check'))assert.equal(read(p),s,p);else writeFileSync(p,s);};
const rep=(s,a,b)=>{assert.equal(s.split(a).length,2,'Graph generator anchor '+a.slice(0,80));return s.replace(a,b);};
let runner=read('src/sustained/runner.js');
runner=rep(runner,"from './packet-audit.js'","from '../sustained/packet-audit.js'");
runner=rep(runner,"fixedFamilies!==null&&fixedFamilies!==4","fixedFamilies!==null&&(!Number.isInteger(fixedFamilies)||fixedFamilies<4||fixedFamilies>128)");
runner=rep(runner,"   if(d.type==='fatal'){","   if(owner.index===0&&[d.memory,d.before,d.after].filter(Boolean).some(m=>m.liveRequested>=160*1048576||m.linearBytes>=208*1048576)){record('resource-stop',{owner:0,memory:owner.memory});finish('incomplete','coordinator-memory-soft-stop');return;}\n   if(d.type==='fatal'){");
write('src/graph-profile/runner.js',runner);
let harness=read('bench/sustained.js');
harness=rep(harness,"from '../src/sustained/runner.js'","from '../src/graph-profile/runner.js'");
harness=rep(harness,"import {workerSourceForCap} from '../src/resources/worker-sources.js';","import {graphWorkerSource} from '../src/graph-profile/worker-source.js';\nlet graphVariant=null,graphSnapshots=[],graphPhases=[],graphColumns=[],resourceStop=null,activeController=null;\nconst workerSourceForCap=cap=>graphWorkerSource(cap,graphVariant);");
harness=rep(harness,"const worker=makeWorkerFromSource(source);","const worker=makeWorkerFromSource(source);worker.addEventListener('message',e=>{const d=e.data;if(d.graphProfile){if(graphSnapshots.length>=256)throw Error('Graph snapshot cap');graphSnapshots.push({atMs:performance.now(),prefix:d.graphPrefix,profile:d.graphProfile,memory:d.memory});}if(d.graphPhases)graphPhases=d.graphPhases;if(d.graphColumnSha){if(graphColumns.length>=256)throw Error('Graph digest cap');graphColumns.push({family:d.graphFamily,sha256:d.graphColumnSha,observeMs:d.graphObserveMs});}});");
harness=rep(harness,"const controller=new AbortController(),progressTimeline=[];","graphSnapshots=[];graphPhases=[];graphColumns=[];resourceStop=null;const controller=new AbortController(),progressTimeline=[];activeController=controller;");
harness=rep(harness,"  progressTimeline.push({atMs:performance.now()-measuredStart,...structuredClone(p)});","  progressTimeline.push({atMs:performance.now()-measuredStart,...structuredClone(p)});\n  if(p.memory.liveRequested>=160*1048576||p.memory.linearBytes>=208*1048576){resourceStop='coordinator-memory-soft-stop';controller.abort();}");
harness=rep(harness,"retiredAtMs=performance.now()-measuredStart;","activeController=null;retiredAtMs=performance.now()-measuredStart;");
harness=rep(harness,"return{id,input:c.input","return{graphVariant,graphSnapshots:graphSnapshots.map(s=>({...s,atMs:s.atMs-measuredStart})),graphPhases,graphColumns,resourceStop,id,input:c.input");
harness=rep(harness,"globalThis.evaluationHarness={","globalThis.evaluationHarness={stop(reason){resourceStop=reason;activeController?.abort();},selectGraph(v){assert(graphVariant===null&&['baseline','compact'].includes(v),'Immutable graph');graphVariant=v;},");
const counterOld=harness.split('\n').find(l=>l.includes("['counter-forgery-retired'"));assert.ok(counterOld);
const counterNew=" ['counter-forgery-retired',async()=>{const transform=source=>{const a='Number(api.codex_dlp_stat(session,i))';assert(source.split(a).length===2,'Counter forgery anchor');return source.replace(a,'(Number(api.codex_dlp_stat(session,i))+(i===0?1:0))');};const r=await runRusqsieve(FULL_CASES.find(c=>c.id==='full-balanced-40-1').input,{...settings(),timeBudgetMs:30000,createWorker:(i,cap)=>createWorker(transform(workerSourceForCap(cap)))});assert(r.reason==='protocol-failure'&&r.allWorkersDisposed&&live===0,'Counter forgery');}],";
harness=rep(harness,counterOld,counterNew);
write('bench/graph-profile.js',harness);
write('bench/graph-profile.html',read('bench/sustained.html').replace('./sustained.js','./graph-profile.js'));
let route=read('scripts/sustained-asset-route.mjs');
route=rep(route,'const assets=new Set([','const assets=new Set(["src/graph-profile/runner.js","src/graph-profile/worker-source.js","src/graph-profile/wasm-baseline.js","src/graph-profile/wasm-compact.js","bench/graph-profile.html","bench/graph-profile.js",');
route=route.replace('sustainedAsset','graphAsset');
write('scripts/graph-asset-route.mjs',route);
let verify=read('scripts/verify-sustained.mjs');
verify=rep(verify,"import {sustainedAsset as coordinatorAsset} from './sustained-asset-route.mjs';","import {graphAsset as coordinatorAsset} from './graph-asset-route.mjs';");
verify=rep(verify,"const coordinator=arg(","const graphVariant=arg('--graph','baseline');assert.ok(['baseline','compact'].includes(graphVariant));\nconst coordinator=arg(");
verify=rep(verify,'fixedFamilies===null||fixedFamilies===4','fixedFamilies===null||Number.isInteger(fixedFamilies)&&fixedFamilies>=4&&fixedFamilies<=128');
verify=verify.replaceAll('/bench/sustained.html','/bench/graph-profile.html');
verify=rep(verify,"  await evaluate('evaluationHarness.selectEngine('+JSON.stringify(variant)+')');","  await evaluate('evaluationHarness.selectGraph('+JSON.stringify(graphVariant)+')');\n  await evaluate('evaluationHarness.selectEngine('+JSON.stringify(variant)+')');");
verify=rep(verify,"const receipt={coordinator,","const receipt={graphVariant,coordinator,");
verify=rep(verify,"memory = new BrowserMemorySampler(chrome.pid); await memory.start();","memory = new BrowserMemorySampler(chrome.pid);const originalSample=memory.sample.bind(memory);let hostMemoryStopped=false;memory.sample=async()=>{const row=await originalSample();if(nodeMeasurementStart!==null&&row.pssBytes>=1536*1048576&&!hostMemoryStopped){hostMemoryStopped=true;await evaluate('evaluationHarness.stop(\"chrome-pss-soft-stop\")');}return row;}; await memory.start();");
verify=rep(verify,"  await writeFile(output,JSON.stringify(receipt,null,2)+'\\n');console.log('Receipt '+output);",`  receipt.graphSourceFiles={};
  for(const p of ['scripts/verify-graph-profile.mjs','scripts/generate-graph-profile.mjs','scripts/graph-asset-route.mjs','src/graph-profile/worker-source.js','src/graph-profile/runner.js','native/graph-profile/build-baseline.json','native/graph-profile/build-compact.json','native/graph-profile/patch-source.mjs','native/graph-profile/engine-profile.rs','native/graph-profile/compact-root.rs','native/graph-profile/phase.rs','docs/contracts/graph-profile.md'])receipt.graphSourceFiles[p]=createHash('sha256').update(await readFile(join(root,p))).digest('hex');
  // Store compact evidence directly. Every original packet digest and numeric counter remains.
  receipt.ramTimeline=receipt.ramTimeline.filter((_,i,a)=>i%Math.max(1,Math.ceil(a.length/255))===0||i===a.length-1).map(s=>({atMs:s.atMs,rssBytes:s.rssBytes,pssBytes:s.pssBytes,processes:s.processes}));
  for(const r of records){if(!r.outcome)continue;r.eventCount=r.outcome.events.length;delete r.outcome.events;r.handoff.packets=r.handoff.packets.map(p=>[p.first,p.returnedMs,p.acceptedMs,p.waitMs]);}
  const text=JSON.stringify(receipt)+'\\n';assert.ok(Buffer.byteLength(text)<=1048576,'Bounded evidence <=1MiB');
  await writeFile(output,text);console.log('Receipt '+output);`);
write('scripts/verify-graph-profile.mjs',verify);
console.log('Graph profiling namespace generated; historical files unchanged');

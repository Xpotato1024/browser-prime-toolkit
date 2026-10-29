// SPDX-License-Identifier: AGPL-3.0-only
// Limited real APIs. Canonical arithmetic.js is loaded under the explicit2026-10-28 approval.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,writeFile,access} from 'node:fs/promises';
import {resolve,join,dirname,relative} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const arg=k=>{const i=process.argv.indexOf(k);assert.ok(i>=0,k);return process.argv[i+1];};
const root=resolve(import.meta.dirname,'..'),out=resolve(arg('--out')),assets=new Map(),denied=[],http=[];
try{await access(out);throw Error('No evidence overwrite');}catch(e){if(e.code!=='ENOENT')throw e;}
const forbidden=new Set(['src/optimized/wasm-optimized-128.js']);
async function add(path){
 if(assets.has('/'+path))return;
 if(forbidden.has(path)||!path.startsWith('src/')&&!path.startsWith('native/')||!/[.]m?js$/.test(path))throw Error('Unapproved dependency '+path);
 const bytes=await readFile(join(root,path));assets.set('/'+path,bytes);
 const text=bytes.toString('utf8'),pattern=/\b(?:import|export)[^;\n]*?\bfrom\s*['"]([^'"]+)['"]/g;
 for(const match of text.matchAll(pattern)){
  const spec=match[1];if(!spec.startsWith('.'))throw Error('Unexpected bare dependency '+spec);
  const next=relative(root,resolve(root,dirname(path),spec));await add(next);
 }
}
for(const p of ['src/routing/index.js','src/routing/native-port.js','src/routing/ecm-port.js','src/routing/siqs-ports.js','src/routing/verification.js','src/routing/staged-port.js','src/site/document-scope.js'])await add(p);
assets.set('/',Buffer.from('<!doctype html><meta charset="utf-8"><link rel="icon" href="data:,"><title>Bounded routing integration</title>'));
const server=createServer((req,res)=>{http.push(req.url);const bytes=assets.get(req.url);if(!bytes){denied.push(req.url);res.writeHead(404).end();return;}res.setHeader('Content-Type',req.url==='/'?'text/html':'text/javascript');res.end(bytes);});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{
 const{chromium}=await import(pathToFileURL(arg('--playwright')));
 browser=await chromium.launch({executablePath:arg('--chrome'),headless:true,args:['--no-sandbox']});
 const page=await browser.newPage(),requests=[],errors=[];page.on('request',r=>requests.push(r.url()));page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+server.address().port+'/');
 await page.evaluate(async()=>{
  const metrics={created:0,terminated:0,active:0,peakActive:0,urlsCreated:0,urlsRevoked:0},urls=new Set(),closed=new Set(),plans=[];
  const OriginalWorker=Worker;globalThis.Worker=class extends OriginalWorker{
   constructor(...args){super(...args);metrics.created++;metrics.active++;metrics.peakActive=Math.max(metrics.peakActive,metrics.active);this.wasTerminated=false;}
   terminate(){super.terminate();if(!this.wasTerminated){this.wasTerminated=true;metrics.terminated++;metrics.active--;}}
  };
  const create=URL.createObjectURL.bind(URL),revoke=URL.revokeObjectURL.bind(URL);
  URL.createObjectURL=b=>{const u=create(b);urls.add(u);metrics.urlsCreated++;return u;};
  URL.revokeObjectURL=u=>{revoke(u);if(urls.has(u)&&!closed.has(u)){closed.add(u);metrics.urlsRevoked++;}};
  const[{createRoutingSession},{createNativePort},{createEcmPort},{createSiqsPort},{verifyRoutingResult,createVerifiedRoutingSession},{makeComputeScope},{createStagedPort}]=await Promise.all([
   import('/src/routing/index.js'),import('/src/routing/native-port.js'),import('/src/routing/ecm-port.js'),import('/src/routing/siqs-ports.js'),import('/src/routing/verification.js'),import('/src/site/document-scope.js'),import('/src/routing/staged-port.js')]);
  const registry={staged128:createStagedPort(),native:createNativePort(),ecm:createEcmPort(),siqs332:createSiqsPort('siqs332'),siqsWide332:createSiqsPort('siqsWide332'),siqs400:createSiqsPort('siqs400')},scope=makeComputeScope();
  window.routingTest={metrics,urls,async run(c){
   const events=[],before={...metrics};let session;
   session=(c.verified?createVerifiedRoutingSession:createRoutingSession)({ports:Object.fromEntries(c.ports.map(k=>[k,registry[k]])),scope});
   const raw=await session.run(c.input,{...c.options,onChange:e=>{events.push(e);if(c.cancelPrefix&&e.phase==='accepted-prefix'&&e.factors.length)session.cancel();}});
   const result=verifyRoutingResult(raw);
   return{id:c.id,input:c.input,raw,result,events,before,after:{...metrics},scopeQuarantined:scope.isQuarantined()};
  }};
 });
 await page.waitForLoadState('networkidle');const readyRequests=requests.length;
 const small=(1009n*((1n<<61n)-1n)).toString(),hard=(2n*((1n<<521n)-1n)*((1n<<127n)-1n)).toString(),all=['native','ecm','siqs332','siqsWide332','siqs400'];
 const cases=[
  {id:'staged-small',input:'91',ports:['staged128'],options:{jobTimeMs:1000,maxStages:1}},
  {id:'staged-100bit',input:((1n<<100n)-1n).toString(),ports:['staged128'],options:{jobTimeMs:1000,maxStages:1}},
  {id:'verified-prime-no-worker',input:'97',ports:all,verified:true,options:{jobTimeMs:1000}},
  {id:'verified-composite-divisor',input:((1n<<256n)-1n).toString(),ports:[...all,'staged128'],verified:true,options:{jobTimeMs:1000,maxStages:4,work:{native:1}}},
  {id:'native-small',input:'91',ports:all,options:{jobTimeMs:1000}},
  {id:'native-probable',input:((1n<<127n)-1n).toString(),ports:all,options:{jobTimeMs:1000}},
  {id:'native-101digits',input:'1'+'0'.repeat(100),ports:all,options:{jobTimeMs:1000}},
  {id:'native-to-ecm',input:small,ports:all,options:{jobTimeMs:1000,maxStages:2,work:{native:1}}},
  {id:'native-ecm-siqs',input:'8156172677439289108635319830552518815109',ports:all,options:{jobTimeMs:3000,maxStages:3,work:{native:1,ecm:1}}},
  {id:'native-cancel-prefix',input:hard,ports:all,cancelPrefix:true,options:{jobTimeMs:1000}},
  {id:'fresh-after-cancel',input:'91',ports:all,options:{jobTimeMs:1000}},
  {id:'wide332-small-control',input:'8156172677439289108635319830552518815109',ports:['siqsWide332'],options:{jobTimeMs:3000,maxStages:1,wasmMiB:1536}},
  {id:'siqs400-bounded',input:'2088215395251987988508198170866285429326513389712811066669121976156893154145354354068456327350848764053227833851662160699',ports:['siqs400'],options:{jobTimeMs:1500,maxStages:1,wasmMiB:1536,experimental400:true,work:{siqs:4}}}
 ];
 const rows=[];
 for(const c of cases){
  const row=await page.evaluate(c=>window.routingTest.run(c),c);rows.push(row);
  await writeFile(out+'.partial.json',JSON.stringify({rows,chrome:browser.version()},null,2)+'\n');
  console.log(JSON.stringify({case:c.id,status:row.result.status,reason:row.result.reason,trace:row.raw.trace.map(t=>({stage:t.stage,stop:t.stop,work:t.workChargedUpperBound})),factorCount:row.result.verifiedFactors.length,pending:row.result.pendingGroups.length}));
  assert.equal(row.raw.allStagesDisposed,true);assert.equal(row.scopeQuarantined,false);
  assert.equal(row.after.created,row.after.terminated);assert.equal(row.after.urlsCreated,row.after.urlsRevoked);
  if(c.id==='native-cancel-prefix'){assert.equal(row.raw.status,'cancelled');assert.ok(row.raw.snapshot.factors.some(f=>f.value==='2'));}
  if(['staged-small','staged-100bit','native-small','native-101digits','native-to-ecm','fresh-after-cancel'].includes(c.id))assert.equal(row.result.factorizationComplete,true);
  if(c.id==='native-probable'){assert.equal(row.result.status,'probable');assert.equal(row.result.factorizationComplete,false);assert.equal(row.result.decompositionComplete,true);}
  if(c.id==='verified-prime-no-worker'){assert.equal(row.result.factorizationComplete,true);assert.equal(row.raw.trace.length,0);}
  if(c.id==='verified-composite-divisor'){assert.ok(row.raw.trace.some(t=>t.stage==='staged128'&&t.input==='15'&&t.targetKind==='factor'));assert.ok(!row.result.pendingGroups.some(f=>f.value==='15'));}
  if(c.id.startsWith('staged-'))assert.equal(row.raw.trace[0].stage,'staged128');
  if(c.id==='native-to-ecm')assert.deepEqual(row.raw.trace.map(t=>t.stage),['native','ecm']);
  if(c.id==='native-ecm-siqs'){assert.deepEqual(row.raw.trace.map(t=>t.stage),['native','ecm','siqs332']);assert.equal(row.result.decompositionComplete,true);}
  if(c.id==='wide332-small-control'){assert.equal(row.raw.trace[0].stage,'siqsWide332');assert.equal(row.result.decompositionComplete,true);}
  if(c.id==='siqs400-bounded'){assert.equal(row.raw.trace[0].stage,'siqs400');assert.equal(row.result.factorizationComplete,false);assert.equal(row.result.executionReason,row.raw.reason);}
 }
 const metrics=await page.evaluate(()=>window.routingTest.metrics),urls=await page.evaluate(()=>[...window.routingTest.urls]);
 const after=requests.slice(readyRequests);assert.deepEqual(after.filter(u=>!urls.includes(u)),[]);assert.deepEqual(denied,[]);assert.deepEqual(errors,[]);assert.equal(metrics.active,0);
 const sourceHashes={};for(const[p,b]of assets)if(p!=='/')sourceHashes[p.slice(1)]=createHash('sha256').update(b).digest('hex');
 await writeFile(out,JSON.stringify({kind:'boundedRealRoutingApis',chrome:browser.version(),sourceHashes,cases,rows,metrics,http,postReadyNetworkRequests:after.filter(u=>!urls.includes(u)).length,localBlobRequests:after.filter(u=>urls.includes(u)).length,denied,errors,notMeasured:'400bit full collection/matrix/GCD; physical mobile; comparative speed'},null,2)+'\n');
 console.log('All bounded real routing cases passed',JSON.stringify(metrics));
}finally{await browser?.close();await new Promise(r=>server.close(r));}

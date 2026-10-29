// SPDX-License-Identifier: AGPL-3.0-only
// Limited real APIs. Canonical arithmetic.js is loaded under the explicit2026-10-28 approval.
import assert from 'node:assert/strict';
import {auditReferenceSplit} from './routing-reference.mjs';
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

const prefixMode=process.argv.includes('--prefix');
const prefixPlan=prefixMode?JSON.parse(await readFile(join(root,'bench/routing-prefix-plan.json'),'utf8')):null;
const plan=JSON.parse(await readFile(join(root,'bench/routing-micro-plan.json'),'utf8')),fixtures=JSON.parse(await readFile(join(root,'bench/routing-micro-fixtures.json'),'utf8'));
for(const p of ['src/routing/index.js','src/routing/native-port.js','src/routing/ecm-port.js','src/routing/siqs-ports.js','src/routing/verification.js','src/site/document-scope.js'])await add(p);
assets.set('/',Buffer.from('<!doctype html><meta charset="utf-8"><link rel="icon" href="data:,"><title>Bounded routing measurements</title>'));
const server=createServer((req,res)=>{http.push(req.url);const bytes=assets.get(req.url);if(!bytes){denied.push(req.url);res.writeHead(404).end();return;}res.setHeader('Content-Type',req.url==='/'?'text/html':'text/javascript');res.end(bytes);});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;const experimentStarted=Date.now(),rows=[];
try{
 const{chromium}=await import(pathToFileURL(arg('--playwright')));
 browser=await chromium.launch({executablePath:arg('--chrome'),headless:true,args:['--no-sandbox']});
 const page=await browser.newPage(),requests=[],errors=[];page.on('request',r=>requests.push(r.url()));page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+server.address().port+'/');
 await page.evaluate(async()=>{
  const metrics={created:0,terminated:0,active:0,urlsCreated:0,urlsRevoked:0},urls=new Set(),closed=new Set(),W=Worker,create=URL.createObjectURL.bind(URL),revoke=URL.revokeObjectURL.bind(URL);
  globalThis.Worker=class extends W{constructor(...a){super(...a);metrics.created++;metrics.active++;}terminate(){super.terminate();if(!this.closed){this.closed=true;metrics.terminated++;metrics.active--;}}};
  URL.createObjectURL=b=>{const u=create(b);urls.add(u);metrics.urlsCreated++;return u;};URL.revokeObjectURL=u=>{revoke(u);if(urls.has(u)&&!closed.has(u)){closed.add(u);metrics.urlsRevoked++;}};
  const[{createRoutingSession},{createNativePort},{createEcmPort},{createSiqsPort},{verifyRoutingResult,createVerifiedRoutingSession},{makeComputeScope}]=await Promise.all([import('/src/routing/index.js'),import('/src/routing/native-port.js'),import('/src/routing/ecm-port.js'),import('/src/routing/siqs-ports.js'),import('/src/routing/verification.js'),import('/src/site/document-scope.js')]);
  const ports={native:createNativePort(),ecm:createEcmPort(),siqs332:createSiqsPort('siqs332')};
  window.measure={metrics,urls,info:{hardwareConcurrency:navigator.hardwareConcurrency,deviceMemory:navigator.deviceMemory??null,userAgent:navigator.userAgent},async run({input,method,timeMs,work,policy=null}){
   const started=performance.now(),events=[],scope=makeComputeScope(),session=(policy?createVerifiedRoutingSession:createRoutingSession)({scope,ports:policy?ports:{[method]:ports[method]}});
   const raw=await session.run(input,{jobTimeMs:timeMs,maxStages:policy?32:1,...policy,wasmMiB:128,maxWorkers:1,work,onChange:e=>events.push({...e,atMs:performance.now()-started})});
   const beforeVerification=performance.now()-started,result=verifyRoutingResult(raw);
   return {raw,result,events,elapsedMs:beforeVerification,elapsedWithFinalProofMs:performance.now()-started,scopeQuarantined:scope.isQuarantined()};
  }};
 });
 await page.waitForLoadState('networkidle');const ready=requests.length;
 const jobs=prefixMode?prefixPlan.cases.flatMap(id=>prefixPlan.order.map((name,repeat)=>({c:fixtures.cases.find(c=>c.id===id),method:name,repeat,policy:prefixPlan.policies[name]}))):fixtures.cases.flatMap(c=>[0,1].flatMap(repeat=>(repeat?['siqs332','ecm','native']:['native','ecm','siqs332']).map(method=>({c,method,repeat,policy:null}))));
 for(const {c,method,repeat,policy}of jobs){
  if(Date.now()-experimentStarted>(prefixMode?prefixPlan.maximumWallSeconds:plan.maximumWholeExperimentWallSeconds)*1000)throw Error('Whole experiment budget');
  if(!prefixMode&&c.bits>(method==='ecm'?256:method==='siqs332'?332:1024)){
   rows.push({caseId:c.id,bits:c.bits,smallFactorBits:c.smallFactorBits,shape:c.shape,method,repeat,status:'unsupported',reason:'capability-range',elapsedMs:null});continue;
  }
  const result=await page.evaluate(args=>window.measure.run(args),{input:c.input,method,timeMs:prefixMode?prefixPlan.jobTimeMs:plan.stage1.jobTimeMs,work:plan.stage1.work,policy});
  const audit=auditReferenceSplit(c,result.raw.snapshot);assert.equal(result.raw.allStagesDisposed,true);assert.equal(result.scopeQuarantined,false);
  rows.push({caseId:c.id,bits:c.bits,smallFactorBits:c.smallFactorBits,shape:c.shape,method,repeat,status:'measured',...result,...audit});
  await writeFile(out+'.partial.json',JSON.stringify({rows},null,2)+'\n');
  console.log(JSON.stringify({id:c.id,method,repeat,elapsedMs:result.elapsedMs,reason:result.raw.reason,pairRecovered:audit.referencePairRecovered}));
 }
 const metrics=await page.evaluate(()=>window.measure.metrics),urls=await page.evaluate(()=>[...window.measure.urls]),environment=await page.evaluate(()=>window.measure.info),after=requests.slice(ready),sourceHashes={};
 for(const[p,b]of assets)if(p!=='/')sourceHashes[p.slice(1)]=createHash('sha256').update(b).digest('hex');
 assert.equal(metrics.active,0);assert.equal(metrics.created,metrics.terminated);assert.equal(metrics.urlsCreated,metrics.urlsRevoked);assert.deepEqual(after.filter(u=>!urls.includes(u)),[]);assert.deepEqual(errors,[]);assert.deepEqual(denied,[]);
 await writeFile(out,JSON.stringify({kind:prefixMode?'boundedRoutingPrefixAbba':'boundedRoutingAdapterComparison',plan,prefixPlan,fixtures,chrome:browser.version(),environment,sourceHashes,rows,metrics,postReadyNetworkRequests:after.filter(u=>!urls.includes(u)).length,errors,denied,experimentWallMs:Date.now()-experimentStarted},null,2)+'\n');
 console.log('Completed',JSON.stringify({rows:rows.length,metrics,wallMs:Date.now()-experimentStarted}));
}finally{await browser?.close();await new Promise(r=>server.close(r));}

// SPDX-License-Identifier: AGPL-3.0-only
// Existing low-level GMP API only; no arithmetic.js or replacement primality verifier.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir,access} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const arg=k=>{const i=process.argv.indexOf(k);assert.ok(i>=0,k);return process.argv[i+1];};
const root=resolve(import.meta.dirname,'..'),output=resolve(arg('--out'));
try{await access(output);throw Error('Refusing to overwrite evidence');}catch(e){if(e.code!=='ENOENT')throw e;}
const allowed=['src/routing/index.js','src/routing/plan.js','src/routing/session.js','src/routing/ecm-port.js','src/routing/ecm-source.js',
 'src/core/extended-input-contract.js','src/core/integer-input.js','src/site/document-scope.js','src/graph-multicore/policy.js','src/selected-wide/policy.js','src/wide-window/policy.js',
 'src/engine/gmp.js','src/engine/gmp-bytes.js','src/worker/source-factory.js'];
const assets=new Map(await Promise.all(allowed.map(async p=>['/'+p,await readFile(join(root,p))])));
assets.set('/',Buffer.from('<!doctype html><meta charset="utf-8"><link rel="icon" href="data:,"><title>Bounded existing GMP ECM integration</title>'));
const denied=[],http=[];
const server=createServer((req,res)=>{http.push(req.url);const b=assets.get(req.url);if(!b){denied.push(req.url);res.writeHead(404).end();return;}res.setHeader('Content-Type',req.url==='/'?'text/html':'text/javascript');res.end(b);});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{
 const{chromium}=await import(pathToFileURL(arg('--playwright')));
 browser=await chromium.launch({executablePath:arg('--chrome'),headless:true,args:['--no-sandbox']});
 const page=await browser.newPage(),requests=[],errors=[];page.on('request',r=>requests.push(r.url()));page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+server.address().port+'/');
 await page.evaluate(async()=>{
  const[{createEcmPort},{createRoutingSession},{makeWorkerFromSource},{ECM_WORKER_SOURCE}]=await Promise.all([
   import('/src/routing/ecm-port.js'),import('/src/routing/index.js'),import('/src/worker/source-factory.js'),import('/src/routing/ecm-source.js')]);
  const metrics={created:0,terminated:0,released:0,ready:0,active:0,peakActive:0},messages=[],urls=[];
  let caseId=0,cancelCase=false,session;
  const port=createEcmPort({createWorker(){
   const id=caseId,w=makeWorkerFromSource(ECM_WORKER_SOURCE);metrics.created++;metrics.active++;metrics.peakActive=Math.max(metrics.peakActive,metrics.active);
   w.addEventListener('message',({data:d})=>{messages.push({caseId:id,type:d.type,operations:d.operations??null,reason:d.reason??null,wasmBytes:d.wasmBytes??null,divisor:d.divisor??null});
    if(d.type==='ready'){metrics.ready++;if(cancelCase&&caseId===id)setTimeout(()=>{if(caseId===id)session.cancel();},1);}});
   const terminate=w.terminate.bind(w),release=w.releaseSource.bind(w);let retired=false,released=false;
   w.terminate=()=>{terminate();if(!retired){retired=true;metrics.terminated++;metrics.active--;}};
   w.releaseSource=()=>{release();if(!released){released=true;metrics.released++;}};
   return w;
  }});
  session=createRoutingSession({ports:{ecm:port}});
  window.ecmTest={metrics,messages,urls,async run(input,cancel=false){caseId++;cancelCase=cancel;return session.run(input,{jobTimeMs:1000,wasmMiB:128,maxStages:1});}};
 });
 await page.waitForLoadState('networkidle');const readyRequests=requests.length,small=(1009n*((1n<<61n)-1n)).toString(),wide=((1n<<256n)-1n).toString(),hard='72722788097098294654426481412876916395763188826481890337267507';
 const rows=[];
 for(const[id,input,cancel]of [['small-factor',small,false],['bits256',wide,false],['cancel206',hard,true],['fresh-after-cancel',small,false]]){
  const r=await page.evaluate(({input,cancel})=>window.ecmTest.run(input,cancel),{input,cancel});rows.push({id,input,result:r});
  assert.equal(r.factorizationComplete,false);assert.equal(r.primalityVerified,false);assert.equal(r.allStagesDisposed,true);
  if(cancel)assert.equal(r.status,'cancelled');
  else{
   assert.equal(r.trace[0].stage,'ecm');assert.ok(r.snapshot.factors.length>0,'real ECM must return a proper divisor on the fixed small-factor controls');
   let product=BigInt(r.snapshot.remaining);for(const f of r.snapshot.factors){const d=BigInt(f.value);assert.ok(d>1n&&d<BigInt(input)&&BigInt(input)%d===0n);product*=d**BigInt(f.exponent);}
   assert.equal(product,BigInt(input));assert.ok(r.trace[0].workObserved>0);
  }
 }
 const metrics=await page.evaluate(()=>window.ecmTest.metrics),messages=await page.evaluate(()=>window.ecmTest.messages);
 const after=requests.slice(readyRequests),blob=after.filter(u=>u.startsWith('blob:http://127.0.0.1:'));
 assert.deepEqual(after.filter(u=>!blob.includes(u)),[]);assert.equal(metrics.created,metrics.terminated);assert.equal(metrics.created,metrics.released);assert.equal(metrics.active,0);assert.equal(metrics.peakActive,1);
 assert.ok(metrics.ready>=4);assert.ok(messages.filter(m=>m.type==='ready').every(m=>m.wasmBytes===67108864));assert.deepEqual(denied,[]);assert.deepEqual(errors,[]);
 const sourceHashes={};for(const p of allowed)sourceHashes[p]=createHash('sha256').update(assets.get('/'+p)).digest('hex');
 await writeFile(output,JSON.stringify({kind:'realExistingGmpEcmSplitRouting',chrome:browser.version(),sourceHashes,rows,metrics,messages,http,postReadyNetworkRequests:after.length-blob.length,localBlobLoads:blob.length,denied,errors,notVerified:'primality, full factorization, native/staged/SIQS host integration'},null,2)+'\n');
 console.log(JSON.stringify({cases:rows.map(r=>({id:r.id,status:r.result.status,reason:r.result.reason,remaining:r.result.snapshot.remaining,trace:r.result.trace})),metrics,postReadyNetworkRequests:after.length-blob.length}));
}finally{await browser?.close();await new Promise(r=>server.close(r));}

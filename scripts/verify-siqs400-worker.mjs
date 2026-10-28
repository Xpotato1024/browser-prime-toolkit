// SPDX-License-Identifier: AGPL-3.0-only
// Bounded real-Worker/Native check. No arithmetic.js, public adapter or quarantined bundle is loaded.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {siqs400WorkerSource} from '../src/siqs400/worker-source.js';
import {validatePacket} from '../src/rusqsieve/contracts.js';
import {validateSiqs400Configuration} from '../src/siqs400/contracts.js';
const arg=k=>{const i=process.argv.indexOf(k);assert.ok(i>=0,k);return process.argv[i+1];};
const output=arg('--out'),executablePath=arg('--chrome');
assert.ok(!existsSync(output)&&!existsSync(output+'.raw.json'),'Refusing to overwrite prior evidence');
const {chromium}=await import(pathToFileURL(arg('--playwright')));
const source=siqs400WorkerSource(1024),helperSource=siqs400WorkerSource(64),requests=[];
const server=createServer((req,res)=>{requests.push(req.url);if(req.url!=='/'){res.writeHead(404).end();return;}res.setHeader('Content-Type','text/html');res.end('<!doctype html><meta charset="utf-8"><title>SIQS400 bounded Worker contract</title><link rel="icon" href="data:,">');});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
let browser;
try{
 browser=await chromium.launch({executablePath,headless:true,args:['--no-sandbox']});
 const page=await browser.newPage(),errors=[],networkRequests=[],websocketUrls=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>networkRequests.push(r.url()));page.on('websocket',s=>websocketUrls.push(s.url()));
 await page.goto('http://127.0.0.1:'+server.address().port+'/');await page.waitForLoadState('networkidle');const readyRequests=networkRequests.length;
 const cases=JSON.parse(readFileSync('scripts/fixtures/siqs400-cases.json','utf8')).cases;
 const result=await page.evaluate(async({source,helperSource,cases})=>{
  const rows=[],blobUrls=[],owners={created:0,terminated:0,urlsCreated:0,urlsRevoked:0};let sequence=0;
  async function trial(input,mode,cap=1024){
   const cancel=mode==='cancel';
   const id=++sequence,url=URL.createObjectURL(new Blob([cap===64?helperSource:source],{type:'text/javascript'}));owners.urlsCreated++;blobUrls.push(url);
   const worker=new Worker(url);owners.created++;const started=performance.now();let sourceReleased=false,closed=false,phase='init',ready=null,batch=null,timer,cancelTimer;
   const release=()=>{if(!sourceReleased){URL.revokeObjectURL(url);sourceReleased=true;owners.urlsRevoked++;}};
   return new Promise(resolve=>{
    const finish=(status,extra={})=>{if(closed)return;closed=true;clearTimeout(timer);clearTimeout(cancelTimer);release();worker.onmessage=null;worker.onerror=null;worker.onmessageerror=null;worker.terminate();owners.terminated++;resolve({status,cancel,wallMs:performance.now()-started,ready,batch,...extra});};
    const post=(type,data={},transfer=[])=>worker.postMessage({version:21,generation:id,type,...data},transfer);
    timer=setTimeout(()=>finish('harness-budget'),10000);
    worker.onerror=e=>{e.preventDefault();finish('worker-error',{error:e.message});};
    worker.onmessageerror=()=>finish('message-error');
    worker.onmessage=({data:d})=>{
     if(closed||d.generation!==id)return;
     if(d.type==='fatal'){finish('fatal',{fatal:d});return;}
     if(d.type==='ready'){
      if(phase!=='init'){finish('protocol-error');return;}ready=d;release();phase='job';
      if(mode==='helper-prepare'){finish('prepared-helper');}
      else if(mode==='prepare-only'){phase='release';post('release');}
      else {
       post('job',{first:0,count:1,jobId:0,factorBaseSize:d.factorBaseSize,target:d.target,familyBudget:d.familyBudget,packetBytes:8388608});
       if(cancel)cancelTimer=setTimeout(()=>finish('cancelled-by-owner'),25);
      }
     }else if(d.type==='batch'){
      if(phase!=='job'){finish('protocol-error');return;}
      if(cancel){finish('cancelled-after-fast-batch');return;}
      batch={bytes:Array.from(new Uint8Array(d.buffer)),memory:d.memory,first:d.first,count:d.count,jobId:d.jobId,stats:d.stats};
      phase='submit';post('submit',{first:d.first,count:d.count,jobId:d.jobId,buffer:d.buffer},[d.buffer]);
     }else if(d.type==='submitted'){
      phase='release';rows.push({type:'submitted',relations:d.relations,memory:d.memory});post('release');
     }else if(d.type==='released'){
      phase='extract';rows.push({type:'released',before:d.before,after:d.after});post('extract');
     }else if(d.type==='extracted')finish('extracted',{extracted:d});
     else finish('protocol-error',{type:d.type});
    };
    post('init',{input,profile:'baseline',scheduler:'credit1',maxMiB:cap,role:cap===1024?'coord':'sieve',retainLocal:false,shareContext:true});
   });
  }
  const prepared=[];for(const c of cases)prepared.push({...c,...await trial(c.input,c.mode)});
  const cancelled=await trial(cases.find(c=>c.bits===400).input,'cancel');
  const observed=prepared.find(c=>c.mode==='one-family');
  const helper=await trial(cases.find(c=>c.bits===400).input,'helper-prepare',64);
  // Second trial also proves a fresh preparation after the first Worker was retired.
  return {prepared,observed,cancelled,helper,rows,owners,blobUrls};
 },{source,helperSource,cases});
 const native=source.match(/const RUSQSIEVE_BASE64="([^"]+)";/)[1];
 const receipt=JSON.parse(readFileSync('native/resieve-followup/build-resieve1-1024.json','utf8'));
 assert.equal(createHash('sha256').update(Buffer.from(native,'base64')).digest('hex'),receipt.sha256);
 const summarize=r=>({...r,batch:r.batch?{...r.batch,bytes:r.batch.bytes.length,sha256:createHash('sha256').update(Uint8Array.from(r.batch.bytes)).digest('hex')}:null});
 const raw={...result,prepared:result.prepared.map(summarize),observed:summarize(result.observed)};
 const sourcePaths=['scripts/verify-siqs400-worker.mjs','scripts/fixtures/siqs400-cases.json','src/siqs400/contracts.js','src/siqs400/worker-source.js'];
 const sourceHashes=Object.fromEntries(sourcePaths.map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')]));
 writeFileSync(output+'.raw.json',JSON.stringify({chrome:browser.version(),sourceHashes,nativeSha256:receipt.sha256,networkRequests,readyRequests,websocketUrls,...raw},null,2)+'\n');
 for(const t of [...result.prepared,result.cancelled]){
  assert.ok(t.ready,'real native preparation must finish within the finite budget');
  const expectedBits=t.input?BigInt(t.input).toString(2).length:400;
  if(t.bits!==undefined)assert.equal(expectedBits,t.bits,'fixture/input identity');
  assert.equal(t.ready.config.bits,expectedBits,'Native/input bit identity');
  validateSiqs400Configuration(t.ready.config,'baseline',expectedBits);
  assert.equal(t.ready.familyBudget,t.ready.config.bits<=288?100000:t.ready.config.bits<=368?250000:750000);assert.equal(t.ready.target,t.ready.factorBaseSize+64);
  assert.ok(t.ready.memory.linearBytes<=1024*1048576);
 }
 for(const t of result.prepared){
  assert.equal(t.status,'extracted');
  if(t.mode==='prepare-only'){assert.equal(t.extracted.status,2);assert.equal(t.extracted.divisor,null);}
 }
 assert.equal(result.helper.status,'prepared-helper');
 assert.equal(result.helper.ready.config.bits,400);
 assert.equal(result.helper.ready.role,'sieve');assert.equal(result.helper.ready.maxMiB,64);
 assert.ok(result.helper.ready.memory.linearBytes<=64*1048576);
 validateSiqs400Configuration(result.helper.ready.config,'baseline',400);
 assert.deepEqual(result.helper.ready.config,result.prepared.find(c=>c.bits===400).ready.config);
 assert.ok([1,2].includes(result.observed.extracted.status));
 if(result.observed.extracted.divisor){const n=BigInt(result.observed.input),d=BigInt(result.observed.extracted.divisor);assert.ok(d>1n&&d<n&&n%d===0n);assert.ok(result.observed.knownFactors.includes(String(d)));}
 const bytes=Uint8Array.from(result.observed.batch.bytes);
 const packet=validatePacket(bytes,{first:0,count:1,target:result.observed.ready.factorBaseSize});
 raw.observed.batch={...raw.observed.batch,packet};
 assert.ok(['cancelled-by-owner','cancelled-after-fast-batch'].includes(result.cancelled.status));
 assert.equal(result.owners.created,result.owners.terminated);assert.equal(result.owners.urlsCreated,result.owners.urlsRevoked);
 assert.deepEqual(errors,[]);assert.deepEqual(websocketUrls,[]);
 const postReadyRequests=networkRequests.slice(readyRequests);
 const blobRequests=postReadyRequests.filter(url=>result.blobUrls.includes(url));
 assert.equal(blobRequests.length,result.owners.created,'only the owned local Blob scripts are expected');
 assert.deepEqual(postReadyRequests.filter(url=>!result.blobUrls.includes(url)),[],'no post-ready network or unknown-resource requests');

 writeFileSync(output,JSON.stringify({kind:'bounded400bitNativeWorker',bits:[333,334,368,369,400],sourceHashes,chrome:browser.version(),nativeSha256:receipt.sha256,sourceSha256:createHash('sha256').update(source).digest('hex'),helperSourceSha256:createHash('sha256').update(helperSource).digest('hex'),requests,networkRequests,localBlobRequests:blobRequests.length,readyAfterNetworkRequests:postReadyRequests.length-blobRequests.length,websocketUrls,errors,...raw},null,2)+'\n');
 console.log('333/334/368/369/400-bit prepare/empty extraction; control packet; 400-bit cancel/helper passed',result.prepared.map(r=>({bits:r.bits,ms:r.wallMs,status:r.extracted.status})));
}finally{await browser?.close();await new Promise(r=>server.close(r));}

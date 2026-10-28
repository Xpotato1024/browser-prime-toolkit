// SPDX-License-Identifier: AGPL-3.0-only
// Private actual-engine checks. No published-capability or performance claim.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve,sep} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=resolve(import.meta.dirname,'..'),out=process.argv[2];
if(!out||!process.env.PLAYWRIGHT_MODULE||!process.env.CHROME_BIN)throw Error('Explicit output, existing Playwright and Chrome required');
const pw=await import(pathToFileURL(resolve(process.env.PLAYWRIGHT_MODULE)));
const html='<!doctype html><html lang="ja"><meta charset="utf-8"><title>非公開・拡張入力の実エンジン試験</title><p>実計算の有界試験。公開入力上限や性能保証を示しません。</p><script type="module" src="/__harness.mjs"></script></html>';
const harness="import {runExtendedInput} from '/src/extended/runner.js'; import {mountSiteFactorizer} from '/src/site/mount.js'; window.runExtendedInput=runExtendedInput; window.mountLive=()=>{const host=document.createElement('div');host.id='live';document.body.append(host);window.live=mountSiteFactorizer(host,{hints:{hardwareConcurrency:2,deviceMemory:2}});};window.ready=true;";
const server=createServer(async(req,res)=>{
 try{
  const pathname=new URL(req.url,'http://localhost').pathname,path=resolve(root,'.'+pathname);
  if(pathname!=='/'&&pathname!=='/__harness.mjs'&&(!pathname.startsWith('/src/')||!pathname.endsWith('.js')||!path.startsWith(root+sep))){res.writeHead(403).end();return;}
  res.setHeader('Content-Security-Policy',"default-src 'none'; script-src 'self' 'wasm-unsafe-eval'; worker-src blob:; connect-src 'none'; base-uri 'none'; form-action 'none'");
  res.setHeader('Content-Type',pathname==='/'?'text/html; charset=utf-8':'text/javascript');
  res.end(pathname==='/'?html:pathname==='/__harness.mjs'?harness:await readFile(path));
 }catch{res.writeHead(404).end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const report={scope:'private actual native-only input checks and existing SIQS UI collection; no public update/benchmark',node:process.version,cases:[],errors:[],requestsAfterReady:[]};
let browser,page;
try{
 browser=await pw.chromium.launch({executablePath:resolve(process.env.CHROME_BIN),headless:true,timeout:15000});
 report.browser=browser.version();
 const context=await browser.newContext({serviceWorkers:'block'});
 await context.addInitScript(()=>{
  window.metrics={created:0,terminated:0,urlsCreated:0,urlsRevoked:0};
  const Native=Worker;
  window.Worker=class extends Native{constructor(...args){super(...args);metrics.created++;let done=false;const stop=this.terminate.bind(this);this.terminate=()=>{if(!done){done=true;metrics.terminated++;}return stop();};}};
  const create=URL.createObjectURL.bind(URL),revoke=URL.revokeObjectURL.bind(URL);
  URL.createObjectURL=(...args)=>{metrics.urlsCreated++;return create(...args);};URL.revokeObjectURL=(...args)=>{metrics.urlsRevoked++;return revoke(...args);};
 });
 page=await context.newPage();let ready=false;
 context.on('request',r=>{if(ready&&!r.url().startsWith('blob:'))report.requestsAfterReady.push(r.url());});
 page.on('pageerror',e=>report.errors.push(String(e)));
 await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.ready);ready=true;
 await context.setOffline(true);
 const check=async(id,input,options,expected,{cancelAfterMs=null,reject=false}={})=>{
  const observed=await page.evaluate(async({input,options,cancelAfterMs})=>{
   const before={...metrics},events=[],control=new AbortController();let timer;

   try{
    const result=await runExtendedInput(input,{...options,signal:control.signal,onProgress:e=>{if(events.length<256)events.push(e);if(cancelAfterMs!==null&&e.stage==='computing'&&timer===undefined)timer=setTimeout(()=>control.abort(),cancelAfterMs);}});
    return{result,events,delta:Object.fromEntries(Object.keys(metrics).map(k=>[k,metrics[k]-before[k]]))};
   }catch(error){return{rejected:true,error:String(error),delta:Object.fromEntries(Object.keys(metrics).map(k=>[k,metrics[k]-before[k]]))};}
   finally{clearTimeout(timer);}
  },{input,options,cancelAfterMs});
  if(reject){assert.equal(observed.rejected,true);assert.equal(observed.delta.created,0);}
  else{
   assert.ok(expected.includes(observed.result.status),id+': '+observed.result.status);
   let product=BigInt(observed.result.remaining);for(const f of observed.result.factors)product*=BigInt(f.value);
   assert.equal(product,BigInt(observed.result.input),id+' exact product');
   assert.equal(observed.result.allWorkersDisposed,true);assert.equal(observed.result.allWorkerSourcesReleased,true);
   assert.equal(observed.delta.created,observed.delta.terminated);assert.equal(observed.delta.urlsCreated,observed.delta.urlsRevoked);
   assert.equal(observed.result.wasmBytes,0);assert.ok(observed.events.every(e=>e.fraction===null));
  }
  report.cases.push({id,passed:true,rejected:!!observed.rejected,status:observed.result?.status,reason:observed.result?.reason,
   digits:observed.result?.input.length,bits:observed.result?BigInt(observed.result.input).toString(2).length:undefined,
   factors:observed.result?.factors.length,residualBits:observed.result?BigInt(observed.result.remaining).toString(2).length:undefined,
   requestWallMs:observed.result?.requestWallMs,delta:observed.delta,stages:observed.events?.map(e=>e.stage)});
 };
 if(process.env.TEST_LIVE_ONLY!=='1'){
 await check('1024-bit smooth actual completion',(1n<<1023n).toString(),{timeBudgetMs:1500},['complete']);
 await check('101-digit scientific actual completion','1e100',{timeBudgetMs:1500},['complete']);
 await check('521-bit probable is not proof',((1n<<521n)-1n).toString(),{timeBudgetMs:1500},['probable']);
 await check('1024-bit work-limited residual',((1n<<1024n)-1n).toString(),{timeBudgetMs:1500,operationBudget:100},['incomplete']);
 const hard=(((1n<<521n)-1n)*((1n<<127n)-1n)).toString();
 await check('cancel retires current Worker',hard,{timeBudgetMs:1000,operationBudget:1000000},['cancelled'],{cancelAfterMs:10});
 await check('fresh recovery after cancel','360',{timeBudgetMs:1000},['complete']);
 await check('1025-bit rejected before Worker',(1n<<1024n).toString(),{},[],{reject:true});
 await check('decimal digit overflow rejected before Worker','1e309',{},[],{reject:true});
 }
 // One additional finite 234-bit live-collection check, not a completion benchmark.
 await page.evaluate(()=>mountLive());
 const phase=async state=>page.waitForFunction(state=>live.getState().phase===state,state,{timeout:6000});
 await phase('ready');await page.locator('[data-action=settings]').click();
 await page.locator('select[id$="-engine"]').selectOption('optimized');
 await page.locator('select[id$="-time"]').selectOption('5000');
 await page.locator('[data-action=apply-settings]').click();await phase('ready');
 await page.getByLabel('0以上の整数',{exact:true}).fill((((1n<<127n)-1n)*((1n<<107n)-1n)).toString());
 await page.locator('[data-action=start]').click();
 await page.waitForFunction(()=>live.getState().progress?.stage==='collecting'&&live.getState().progress.relations>0,null,{timeout:3000});
 const collecting=await page.evaluate(()=>({progress:live.getState().progress,value:document.querySelector('#live progress').getAttribute('value')}));
 assert.equal(collecting.progress.value,collecting.progress.relations/collecting.progress.target);
 assert.ok(collecting.progress.value>0&&collecting.progress.value<1);assert.notEqual(collecting.value,null);
 await page.locator('[data-action=cancel]').click();await phase('result');
 assert.match(await page.locator('.bt-result-status').textContent(),/中止/);
 assert.equal(await page.locator('.bt-status').textContent(),'実行記録');
 await page.evaluate(()=>live.dispose());
 const liveMetrics=await page.evaluate(()=>metrics);
 assert.equal(liveMetrics.created,liveMetrics.terminated);assert.equal(liveMetrics.urlsCreated,liveMetrics.urlsRevoked);
 report.cases.push({id:'real 234-bit SIQS collection reaches native progress bar then cancels',passed:true,progress:collecting.progress,finalMetrics:liveMetrics,budgetMs:5000,waitForCollectionMs:3000,notCompletionBenchmark:true});
 assert.deepEqual(report.requestsAfterReady,[]);assert.deepEqual(report.errors,[]);
 report.metrics=await page.evaluate(()=>metrics);await context.close();
}catch(error){report.failure=String(error.stack??error);try{report.liveState=await page?.evaluate(()=>window.live?.getState()??null);}catch{}process.exitCode=1;}
finally{await browser?.close();await new Promise(r=>server.close(r));await writeFile(out,JSON.stringify(report,null,2)+'\n',{flag:'wx'});}
console.log(JSON.stringify({browser:report.browser,cases:report.cases.map(c=>[c.id,c.rejected?'rejected':c.status??'passed']),failure:report.failure}));

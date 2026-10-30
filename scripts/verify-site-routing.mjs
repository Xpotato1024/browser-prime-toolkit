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

for(const p of ['src/site/mount.js','src/site/routing.js'])await add(p);
assets.set('/tool.css',await readFile(join(root,'src/site/tool.css')));
assets.set('/',Buffer.from('<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="icon" href="data:,"><link rel="stylesheet" href="/tool.css"><style>body{margin:0;padding:24px;background:#fff;color:#202020}main{max-width:850px;margin:auto}</style><title>共通routing ローカル検証</title><main><h1>素因数分解</h1><div id="app" class="bt-prime-factorizer"></div></main>'));
const server=createServer((req,res)=>{http.push(req.url);const b=assets.get(req.url);if(!b){denied.push(req.url);res.writeHead(404).end();return;}res.setHeader('Content-Type',req.url==='/'?'text/html':req.url==='/tool.css'?'text/css':'text/javascript');res.end(b);});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{
 const{chromium}=await import(pathToFileURL(arg('--playwright')));
 browser=await chromium.launch({executablePath:arg('--chrome'),headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:390,height:844}}),requests=[],errors=[],rows=[];
 page.on('request',r=>requests.push(r.url()));page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+server.address().port);
 await page.evaluate(async()=>{
  const metrics={created:0,terminated:0,active:0,urlsCreated:0,urlsRevoked:0},urls=new Set(),revoked=new Set(),W=Worker,create=URL.createObjectURL.bind(URL),revoke=URL.revokeObjectURL.bind(URL);
  globalThis.Worker=class extends W{constructor(...a){super(...a);metrics.created++;metrics.active++;}terminate(){super.terminate();if(!this.retired){this.retired=true;metrics.terminated++;metrics.active--;}}};
  URL.createObjectURL=b=>{const u=create(b);urls.add(u);metrics.urlsCreated++;return u;};URL.revokeObjectURL=u=>{revoke(u);if(urls.has(u)&&!revoked.has(u)){revoked.add(u);metrics.urlsRevoked++;}};
  const[{mountSiteFactorizer},{createSiteRouter},{createVerifiedRoutingSession},{createSiqsPort},{createNativePort},{createEcmPort}]=await Promise.all([import('/src/site/mount.js'),import('/src/site/routing.js'),import('/src/routing/verification.js'),import('/src/routing/siqs-ports.js'),import('/src/routing/native-port.js'),import('/src/routing/ecm-port.js')]);
  window.events=[];window.snapshots=[];window.metrics=metrics;window.blobUrls=urls;window.onlySiqs=null;window.timeline=[];window.prefixHistory=[];window.cancelOnPrefix=false;
  window.app=mountSiteFactorizer(document.querySelector('#app'),{hints:{hardwareConcurrency:2,deviceMemory:2},sessionOptions:{createRouter:options=>{
   const isolated={native:()=>({native:createNativePort({api:options.extended,now:options.now})}),ecm:()=>({ecm:createEcmPort({now:options.now})}),'332':()=>({siqs332:createSiqsPort('siqs332')}),'400':()=>({siqs400:createSiqsPort('siqs400')})};
   const router=window.onlySiqs?createVerifiedRoutingSession({scope:options.scope,now:options.now,ports:isolated[window.onlySiqs]()}):createSiteRouter(options);
   return {cancel:()=>router.cancel(),run:(input,runOptions)=>router.run(input,{...runOptions,onChange:e=>{runOptions.onChange(e);window.events.push(e);
    const state=window.app.getState(),partial=document.querySelector('.bt-progress-partial'),candidate=document.querySelector('.bt-progress-partial-value');
    window.timeline.push({caseId:window.currentCase,event:e,atMs:performance.now(),elapsedText:document.querySelector('[data-elapsed]').textContent,label:document.querySelector('.bt-status').textContent,uiStage:state.progress?.stage,bar:document.querySelector('progress').getAttribute('value'),summary:document.querySelector('.bt-progress-summary').textContent,barMeaning:document.querySelector('progress').getAttribute('aria-valuetext'),partialVisible:!partial.hidden,partialText:candidate.textContent});
    if(e.phase==='accepted-prefix'&&e.factors.length){window.prefixHistory.push({callback:runOptions.onChange,event:e});if(window.cancelOnPrefix){window.cancelOnPrefix=false;window.cancelledHistory=window.prefixHistory.at(-1);document.querySelector('[data-action=cancel]').click();}}
if(e.phase==='collecting')window.snapshots.push({event:e,bar:document.querySelector('progress').getAttribute('value'),label:document.querySelector('.bt-status').textContent,inputRect:document.querySelector('input').getBoundingClientRect().toJSON(),documentY:document.querySelector('input').getBoundingClientRect().y+scrollY,scale:visualViewport?.scale??1});}})};
  }}});
 });
 await page.waitForFunction(()=>window.app?.getState().phase==='ready');await page.waitForLoadState('networkidle');const ready=requests.length;
 const state=()=>page.evaluate(()=>window.app.getState());
 async function choose(mode,time=1000){
  await page.locator('[data-action=settings]').click();await page.locator('select[id$="-engine"]').selectOption(mode);await page.locator('select[id$="-time"]').selectOption(String(time));
  if(mode==='wide')await page.locator('select[id$="-workers"]').selectOption('1');
  await page.locator('[data-action=apply-settings]').click();await page.waitForFunction(()=>window.app.getState().phase==='ready');
 }
 async function run(id,input,{mode,only=null,time=1000}={}){
  if(mode)await choose(mode,time);await page.evaluate(({only,id})=>{window.onlySiqs=only;window.currentCase=id;window.events=[];},{only,id});
  const before=await page.evaluate(()=>({...window.metrics}));await page.locator('input').fill(input);await page.locator('[data-action=start]').click();
  await page.waitForFunction(()=>['result','invalid','blocked','error'].includes(window.app.getState().phase),{},{timeout:10000});
  const s=await state(),after=await page.evaluate(()=>({...window.metrics})),events=await page.evaluate(()=>window.events);
  rows.push({id,input,state:s,before,after,events});await writeFile(out+'.partial.json',JSON.stringify(rows,null,2)+'\n');
  assert.equal(after.active,0);assert.equal(after.created,after.terminated);assert.equal(after.urlsCreated,after.urlsRevoked);return s;
 }
 const small=await run('small-staged','360');assert.equal(small.view.status,'complete');assert.ok(small.view.equation.includes('2^3'));assert.equal(small.resources.trace[0].stage,'staged128');
 const prime=await run('probable',((1n<<127n)-1n).toString());assert.equal(prime.view.status,'probable');assert.ok(prime.view.statusText.includes('未証明'));assert.equal(prime.resources.actualWorkers,0);
 const nativeSolo=await run('native-alone','1e100',{mode:'standard',only:'native'});assert.equal(nativeSolo.view.status,'complete');assert.equal(nativeSolo.resources.trace[0].stage,'native');
 const ecmSolo=await run('ecm-alone',"79227558051354530278947815491",{mode:'optimized',only:'ecm'});assert.equal(ecmSolo.view.status,'probable');assert.equal(ecmSolo.resources.trace[0].stage,'ecm');
 await choose('standard');
 const large=await run('smooth1024',((1n<<1023n)).toString());assert.equal(large.view.status,'complete');assert.ok(large.view.equation.includes('2^1023'));
 const invalid=await run('over1024',(1n<<1024n).toString());assert.equal(invalid.phase,'invalid');assert.equal(rows.at(-1).before.created,rows.at(-1).after.created);
 const high=await run('over332',(1n<<332n).toString(),{mode:'optimized'});assert.equal(high.phase,'invalid');
 const wideInvalid=await run('over400',(1n<<400n).toString(),{mode:'wide'});assert.equal(wideInvalid.phase,'invalid');assert.ok(wideInvalid.error.includes('400'));
 const shared=await run('default-shared133','8156172677439289108635319830552518815109',{mode:'optimized',time:5000});assert.equal(shared.phase,'result');assert.ok(shared.resources.trace.some(t=>t.stage==='native'));assert.ok(shared.resources.trace.some(t=>t.stage==='ecm'));assert.ok(shared.resources.actualWasmBytes<=shared.resources.configuredPlan.budgetBytes);
 const routeTimeline=await page.evaluate(()=>window.timeline.filter(x=>x.caseId==='default-shared133'));
 assert.ok(routeTimeline.some(x=>x.label.includes('Brent')));assert.ok(routeTimeline.some(x=>x.label.includes('ECM')));assert.ok(routeTimeline.some(x=>x.uiStage==='collecting'&&x.bar!==null));
 const elapsedValue=s=>s.startsWith('<1')?0.5:s.endsWith('ms')?Number.parseFloat(s):Number.parseFloat(s)*1000;const samples=routeTimeline.map(x=>elapsedValue(x.elapsedText));assert.ok(samples.every((n,i)=>Number.isFinite(n)&&(i===0||n>=samples[i-1])));assert.ok(Math.max(...samples)>0);
 assert.ok(routeTimeline.filter(x=>x.bar!==null&&x.uiStage==='collecting').every(x=>x.summary.includes('この工程')&&x.barMeaning.includes('計算全体の完了率ではありません')));assert.ok(routeTimeline.filter(x=>x.bar!==null&&x.uiStage!=='collecting').every(x=>x.bar==='0'&&!x.barMeaning.includes('%')));
 await page.evaluate(()=>window.cancelOnPrefix=true);
 const prefixCancel=await run('native-partial-cancel',(2n*((1n<<521n)-1n)*((1n<<127n)-1n)).toString(),{mode:'standard',only:'native'});
 assert.equal(prefixCancel.view.status,'cancelled');assert.ok(prefixCancel.view.equation.includes('2'));assert.ok(prefixCancel.view.copyText.includes('中止'));
 const partialTrace=await page.evaluate(()=>window.timeline.filter(x=>x.caseId==='native-partial-cancel'));assert.ok(partialTrace.some(x=>x.partialVisible&&x.partialText.includes('2')&&x.partialText.includes('最終確認')));
 await choose('optimized');await page.evaluate(()=>{window.onlySiqs='ecm';window.currentCase='stale-active-cancel';});
 await page.locator('input').fill("4707826301540010572876842048886166824367477670857127497389");await page.locator('[data-action=start]').click();await page.waitForFunction(()=>window.metrics.active>0);
 const stale=await page.evaluate(()=>{const before=window.app.getState();window.cancelledHistory.callback(window.cancelledHistory.event);const after=window.app.getState();return{before:before.progress,after:after.progress};});assert.deepEqual(stale.before,stale.after);
 await page.screenshot({path:out+'.ecm-active.png',fullPage:true});
 await page.locator('[data-action=cancel]').click();await page.waitForFunction(()=>window.app.getState().phase==='result');rows.push({id:'stale-active-cancel',state:await state(),staleReplayIgnored:true});
 const control=await run('real-siqs-gui','8156172677439289108635319830552518815109',{mode:'optimized',only:'332'});
 assert.ok(control.resources.trace.some(t=>t.stage==='siqs332'));assert.ok((await page.evaluate(()=>window.snapshots)).length>0);
 const measured=await page.evaluate(()=>window.snapshots);assert.ok(measured.some(x=>x.bar!==null));assert.ok(measured.every(x=>x.documentY===measured[0].documentY&&x.inputRect.width===measured[0].inputRect.width&&x.scale===1));assert.equal(control.progress.value,null);
 const n400='2088215395251987988508198170866285429326513389712811066669121976156893154145354354068456327350848764053227833851662160699';
 const stopped=await run('400-bounded',n400,{mode:'wide',only:'400'});assert.equal(stopped.resources.experimental400,true);assert.equal(stopped.resources.actualTimeBudgetMs,1000);assert.equal(stopped.resources.plan.ownerCapsMiB[0],1024);assert.equal(stopped.view.status,'incomplete');assert.equal(stopped.resources.trace[0].stage,'siqs400');
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.ok(Number.parseFloat(await page.locator('input').evaluate(n=>getComputedStyle(n).fontSize))>=16);await page.screenshot({path:out+'.mobile.png',fullPage:true});
 await page.locator('input').fill(n400);await page.locator('[data-action=start]').click();await page.waitForFunction(()=>window.metrics.active>0);await page.locator('[data-action=cancel]').click();await page.waitForFunction(()=>window.app.getState().phase==='result');
 const cancelled=await state();assert.equal(cancelled.view.status,'cancelled');assert.ok(cancelled.view.copyText.includes('中止'));rows.push({id:'cancel-real400',state:cancelled});
 await page.locator('[data-action=copy]').click();await page.waitForFunction(()=>document.querySelector('.bt-copy-status').textContent.length>0);
 await page.evaluate(()=>window.onlySiqs=null);await choose('standard');const fresh=await run('fresh-after-cancel','32');assert.equal(fresh.view.status,'complete');
 await page.setViewportSize({width:1280,height:900});await page.screenshot({path:out+'.desktop.png',fullPage:true});
 await choose('wide');await page.evaluate(()=>window.onlySiqs='400');await page.locator('input').fill(n400);await page.locator('[data-action=start]').click();await page.waitForFunction(()=>window.metrics.active>0);await page.evaluate(()=>window.app.dispose());await page.waitForFunction(()=>window.metrics.active===0);assert.equal(await page.locator('#app').textContent(),'');rows.push({id:'unmount-real400',disposed:true});
 const metrics=await page.evaluate(()=>window.metrics),urls=await page.evaluate(()=>[...window.blobUrls]),after=requests.slice(ready),sourceHashes={};for(const[p,b]of assets)if(p!=='/')sourceHashes[p.slice(1)]=createHash('sha256').update(b).digest('hex');
 assert.equal(metrics.created,metrics.terminated);assert.equal(metrics.urlsCreated,metrics.urlsRevoked);assert.deepEqual(after.filter(u=>!urls.includes(u)),[]);assert.deepEqual(errors,[]);assert.deepEqual(denied,[]);
 await writeFile(out,JSON.stringify({kind:'boundedRealGuiRouting',chrome:browser.version(),rows,measured,timeline:await page.evaluate(()=>window.timeline),metrics,postReadyNetworkRequests:after.filter(u=>!urls.includes(u)).length,errors,denied,sourceHashes,capabilityIsolatedControls:['native-alone','ecm-alone','native-partial-cancel','stale-active-cancel','real-siqs-gui','400-bounded','cancel-real400','unmount-real400'],notMeasured:['physical mobile','400bit complete factorization','comparative speed']},null,2)+'\n');
 console.log(JSON.stringify({cases:rows.length,metrics,network:0,errors}));
}finally{await browser?.close();await new Promise(r=>server.close(r));}

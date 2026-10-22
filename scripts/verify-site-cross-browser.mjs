// SPDX-License-Identifier: AGPL-3.0-only
// Optional runner: use a separately installed, pinned playwright-core. No app dependency.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
const arg=name=>{const i=process.argv.indexOf(name);if(i<0||!process.argv[i+1])throw Error('Required: '+name);return process.argv[i+1];};
const dist=resolve(arg('--dist')),out=resolve(arg('--out'));
if(!process.env.PLAYWRIGHT_MODULE)throw Error('Set PLAYWRIGHT_MODULE to the separately installed playwright-core/index.mjs');
const pw=await import(pathToFileURL(resolve(process.env.PLAYWRIGHT_MODULE)));
const manifest=JSON.parse(await readFile(resolve(dist,'browser-tool.json'),'utf8'));
await mkdir(dirname(out),{recursive:true});
const html='<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Local release acceptance</title><link rel="stylesheet" href="/tool.css"><div id="tool" class="bt-prime-factorizer"></div><script type="module" src="/__harness.mjs"></script></html>';
const harness=`
import {mountSiteFactorizer} from '/src/site/mount.mjs';
window.app=mountSiteFactorizer(document.querySelector('#tool'),{hints:{hardwareConcurrency:2}});
`;
const server=createServer(async(req,res)=>{
 try{
  res.setHeader('Content-Security-Policy',"default-src 'none'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self'; worker-src blob:; connect-src 'none'; img-src 'none'; base-uri 'none'; form-action 'none'");
  const url=new URL(req.url,'http://localhost');
  const path=resolve(dist,'.'+url.pathname);
  if(path!==dist&&!path.startsWith(dist+sep)){res.writeHead(403);res.end();return;}
  const body=url.pathname==='/'?html:url.pathname==='/__harness.mjs'?harness:await readFile(path);
  res.setHeader('Content-Type',url.pathname==='/'?'text/html; charset=utf-8':extname(path)==='.css'?'text/css':'text/javascript');res.end(body);
 }catch{res.writeHead(404);res.end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base='http://127.0.0.1:'+server.address().port;
const report={generatedAt:new Date().toISOString(),platform:process.platform,node:process.version,playwright:JSON.parse(await readFile(new URL('./package.json',pathToFileURL(resolve(process.env.PLAYWRIGHT_MODULE))))).version,toolVersion:manifest.version,engines:[]};
const instrumentation=()=>{
 const metric=window.metric={created:0,terminated:0,urlsCreated:0,urlsRevoked:0,network:[],storage:[],focus:[]};
 const NativeWorker=window.Worker;
 window.Worker=class extends NativeWorker{constructor(...args){super(...args);metric.created++;let done=false;const stop=this.terminate.bind(this);this.terminate=()=>{if(!done){done=true;metric.terminated++;}return stop();};}};
 const create=URL.createObjectURL.bind(URL),revoke=URL.revokeObjectURL.bind(URL);
 URL.createObjectURL=(...a)=>{metric.urlsCreated++;return create(...a);};URL.revokeObjectURL=(...a)=>{metric.urlsRevoked++;return revoke(...a);};
 for(const key of ['fetch','WebSocket','EventSource']){const fn=window[key];if(fn)window[key]=new Proxy(fn,{apply(t,v,a){metric.network.push(key);return Reflect.apply(t,v,a);},construct(t,a){metric.network.push(key);return Reflect.construct(t,a);}});}
 const open=XMLHttpRequest.prototype.open;XMLHttpRequest.prototype.open=function(...a){metric.network.push('XHR');return open.apply(this,a);};
 const beacon=navigator.sendBeacon?.bind(navigator);if(beacon)navigator.sendBeacon=(...a)=>{metric.network.push('beacon');return beacon(...a);};
 for(const method of ['setItem','getItem','removeItem','clear']){const fn=Storage.prototype[method];Storage.prototype[method]=function(...a){metric.storage.push(method);return fn.apply(this,a);};}
 addEventListener('focusin',()=>metric.focus.push(document.activeElement?.getAttribute('data-action')??document.activeElement?.getAttribute('aria-label')??document.activeElement?.tagName));
};
try{
 for(const name of (process.env.TEST_BROWSERS??'firefox,webkit').split(',')){
  const result={name,cases:[],errors:[],requestsAfterReady:[],failures:[]};report.engines.push(result);
  let browser;
  try{
   console.log(name+': launch');browser=await pw[name].launch({headless:true,timeout:15000});result.version=browser.version();
   const context=await browser.newContext({viewport:{width:1000,height:850},serviceWorkers:'block'});
   await context.addInitScript(instrumentation);
   console.log(name+': new page');const page=await context.newPage();page.setDefaultTimeout(8000);let ready=false;
   context.on('request',r=>{if(ready&&!r.url().startsWith('blob:'))result.requestsAfterReady.push(r.url());});
   page.on('pageerror',e=>result.errors.push(String(e)));
   console.log(name+': load');await page.goto(base);await page.waitForFunction(()=>document.querySelector('#tool').dataset.phase==='ready');ready=true;
   result.offlineEmulation=name==='firefox'||process.env.TEST_OFFLINE==='1';
   if(result.offlineEmulation){console.log(name+': offline');await context.setOffline(true);}
   const input=page.getByLabel('0以上の整数',{exact:true}),start=page.locator('[data-action=start]');
   const phase=async p=>page.waitForFunction(p=>document.querySelector('#tool').dataset.phase===p,p,{timeout:8000});
   const metrics=()=>page.evaluate(()=>structuredClone(metric));
   const equation=()=>page.locator('textarea[id$="output"]').inputValue();
   const run=async value=>{await input.fill(value);await input.press('Enter');await phase('result');return equation();};
   const test=async(label,fn)=>{console.log(name+': '+label);try{const evidence=await fn();result.cases.push({label,passed:true,...evidence});}catch(e){result.cases.push({label,passed:false,error:String(e)});result.failures.push(label);}};
   await test('sample changes only input and restores focus',async()=>{
    const before=await metrics();await page.getByLabel('入力例と用途').selectOption('360');
    assert.equal(await input.inputValue(),'360');assert.equal(await page.locator('#tool').getAttribute('data-phase'),'ready');
    assert.equal((await metrics()).created,before.created);assert.equal(await input.evaluate(n=>n===document.activeElement),true);
    return{workersCreated:0};
   });
   await test('invalid decimal, negative, oversized exponent are rejected without Workers',async()=>{
    const before=await metrics();for(const value of ['2.5','-1','1e10000']){await input.fill(value);await start.click();await phase('invalid');assert.equal(await input.getAttribute('aria-invalid'),'true');assert.equal(await page.getByRole('alert').isVisible(),true);}
    assert.equal((await metrics()).created,before.created);return{workersCreated:0};
   });
   await test('scientific input, exact integer, zero and subsecond display',async()=>{
    assert.equal(await run('3.2e1'),'32 = 2^5');const elapsed=await page.locator('p.bt-help').filter({hasText:'実経過:'}).textContent();assert.match(elapsed,/実経過: (?:<1|\d+) ms/);
    assert.match(await run('9007199254740993'),/^9007199254740993 = /);assert.equal(await run('0'),'0 = 0');assert.match(await page.locator('.bt-status').textContent(),/素数でも合成数でもありません/);
    return{elapsed};
   });
   await test('native user-gesture copy outcome',async()=>{
    await run('360');await page.locator('[data-action=copy]').click();
    await page.waitForFunction(()=>[...document.querySelectorAll('[role=status]')].some(x=>x.textContent.includes('コピーしました')||x.textContent.includes('手動でコピー')));
    return{outcome:await page.locator('.bt-result [role=status]').textContent(),api:await page.evaluate(()=>typeof navigator.clipboard?.writeText)};
   });
   for(const mode of ['success','denied','unavailable'])await test('controlled clipboard '+mode,async()=>{
    await page.evaluate(mode=>{window.copyWrites=[];Object.defineProperty(navigator,'clipboard',{configurable:true,value:mode==='unavailable'?undefined:{writeText:async text=>{copyWrites.push(text);if(mode==='denied')throw new DOMException('Denied for acceptance test','NotAllowedError');}}});},mode);
    await page.locator('[data-action=copy]').click();const manual=page.getByLabel('手動コピー用（計算状態を含む）');
    if(mode==='success'){await page.waitForFunction(()=>document.querySelector('.bt-result [role=status]').textContent.includes('コピーしました'));assert.equal(await manual.isVisible(),false);}
    else{await manual.waitFor({state:'visible'});assert.equal(await manual.evaluate(n=>n===document.activeElement&&n.selectionStart===0&&n.selectionEnd===n.value.length),true);assert.match(await manual.inputValue(),/360 = 2\^3 × 3\^2 × 5\n分解完了/);}
    return{writes:await page.evaluate(()=>copyWrites)};
   });
   await test('finite WASM calculation and release',async()=>{
    const value=await run('1050809297549059047257');const state=await page.evaluate(()=>app.getState());
    assert.equal(state.resources.actualWasmBytes,134217728);assert.match(value,/^1050809297549059047257 = /);
    const after=await metrics();assert.equal(after.created,after.terminated);assert.equal(after.urlsCreated,after.urlsRevoked);
    return{equation:value,elapsedMs:state.resources.elapsedMs,wasmBytes:state.resources.actualWasmBytes};
   });
   await test('keyboard start/cancel, release and fresh rerun',async()=>{
    await page.locator('.bt-settings summary').click();await page.getByLabel('計算時間（初期化を含む）').selectOption('5000');
    await input.fill('1050809297549059047257');await input.press('Enter');await phase('running');
    const focused=await page.evaluate(()=>document.activeElement?.dataset.action);assert.equal(focused,'cancel');await page.keyboard.press('Enter');await phase('result');
    assert.match(await page.locator('.bt-status').textContent(),/中止/);assert.equal(await page.locator('.bt-status').evaluate(n=>n===document.activeElement),true);
    const after=await metrics();assert.equal(after.created,after.terminated);assert.equal(after.urlsCreated,after.urlsRevoked);
    assert.equal(await run('360'),'360 = 2^3 × 3^2 × 5');return{focus:focused,afterCancel:after};
   });
   await test('reset and keyboard tab order',async()=>{
    await page.locator('[data-action=reset]').click();await phase('ready');assert.equal(await input.inputValue(),'');assert.equal(await input.evaluate(n=>n===document.activeElement),true);
    await input.press('Tab');assert.equal(await page.getByLabel('入力例と用途').evaluate(n=>n===document.activeElement),true);
    return{};
   });
   await test('390px viewport has no horizontal overflow',async()=>{await page.setViewportSize({width:390,height:844});await run('9007199254740993');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:out+'.'+name+'.png',fullPage:true});return{viewport:'390x844 (desktop engine, no physical iPhone)'};});
   await test('unmount during work retires Workers and Blob URLs',async()=>{
    await input.fill('1050809297549059047257');await input.press('Enter');await phase('running');await page.evaluate(()=>app.dispose());
    await page.waitForFunction(()=>metric.created===metric.terminated&&metric.urlsCreated===metric.urlsRevoked,null,{timeout:4000});return{metrics:await metrics()};
   });
   result.finalMetrics=await metrics();assert.equal(result.requestsAfterReady.length,0);assert.equal(result.finalMetrics.network.length,0);assert.equal(result.finalMetrics.storage.length,0);assert.deepEqual(result.errors,[]);
   await context.close();
  }catch(e){result.fatal=String(e);process.exitCode=1;}finally{await browser?.close();}
  if(result.failures.length)process.exitCode=1;
  console.log(JSON.stringify({name,version:result.version,cases:result.cases.map(x=>[x.label,x.passed]),fatal:result.fatal}));
 }
}finally{server.close();await writeFile(out,JSON.stringify(report,null,2)+'\n');}

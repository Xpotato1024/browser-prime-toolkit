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
   const equation=()=>page.locator('.bt-equation').textContent();
   const run=async value=>{await input.fill(value);await input.press('Enter');await phase('result');return equation();};
   const test=async(label,fn)=>{console.log(name+': '+label);try{const evidence=await fn();result.cases.push({label,passed:true,...evidence});}catch(e){result.cases.push({label,passed:false,error:String(e)});result.failures.push(label);}};
   await test('all examples fill only, collapse and focus the common execution action',async()=>{
    assert.equal(await page.locator('[data-action=quick-example]').count(),0);const before=await metrics();
    for(const value of ['360','104729','9007199254740993','1000036000099']){await page.locator('.bt-samples').evaluate(n=>n.open=true);const sample=page.locator('[data-sample-value="'+value+'"]');await sample.focus();await sample.press('Enter');assert.equal(await input.inputValue(),value);assert.equal(await page.locator('#tool').getAttribute('data-phase'),'ready');assert.equal(await page.locator('.bt-samples').evaluate(n=>n.open),false);assert.equal(await start.evaluate(n=>n===document.activeElement),true);}
    assert.equal((await metrics()).created,before.created);return{workersCreated:0,examples:4,focus:'common start button'};
   });
   await test('persistent numeric limits and bulk input are exact and never silently truncated',async()=>{
    const limit=page.locator('.bt-input-limit');assert.match(await limit.textContent(),/39.*2\^128/);assert.equal(await input.getAttribute('maxlength'),null);assert.ok((await input.getAttribute('aria-describedby')).includes(await limit.getAttribute('id')));
    const before=await metrics();await input.fill('');await input.focus();await page.keyboard.insertText('0'.repeat(4097));assert.equal((await input.inputValue()).length,4097);await start.click();await phase('invalid');assert.match(await page.getByRole('alert').textContent(),/4096/);assert.equal((await input.inputValue()).length,4097);
    await input.fill((1n<<128n).toString());await start.click();await phase('invalid');assert.match(await page.getByRole('alert').textContent(),/2\^128/);
    await page.locator('.bt-settings').evaluate(n=>n.open=true);await page.locator('select[id$="-engine"]').selectOption('optimized');await phase('ready');assert.match(await limit.textContent(),/100.*332/);await input.fill((1n<<332n).toString());await start.click();await phase('invalid');assert.match(await page.getByRole('alert').textContent(),/332/);
    await page.locator('select[id$="-engine"]').selectOption('standard');await phase('ready');assert.equal((await metrics()).created,before.created);await page.locator('.bt-settings').evaluate(n=>n.open=false);assert.equal(await run('000032'),'32 = 2^5');assert.equal(await input.inputValue(),'000032');
    return{rawTextLength:4097,rawTextRetained:true,modeDigits:[39,100],scientificAndExactBounds:'also covered by pure parser tests; boundary-sized factorization not run',insertion:'keyboard.insertText bulk insertion; OS clipboard paste not claimed'};
   });
   await test('editing input and settings labels the previous result without changing its copy identity',async()=>{
    await run('104729');await input.fill('32');assert.match(await page.locator('.bt-result-title').textContent(),/前回.*104729/);assert.match(await page.locator('.bt-draft-note').textContent(),/未実行/);assert.equal(await equation(),'104729 = 104729');
    await input.press('Enter');await phase('result');assert.equal(await page.locator('.bt-result-title').textContent(),'32 の結果');assert.equal(await equation(),'32 = 2^5');
    await page.locator('.bt-settings').evaluate(n=>n.open=true);await page.locator('select[id$="-time"]').selectOption('5000');assert.match(await page.locator('.bt-result-title').textContent(),/前回.*32/);await page.locator('select[id$="-time"]').selectOption('1000');await page.locator('.bt-settings').evaluate(n=>n.open=false);
    await page.locator('[data-action=result]').focus();await page.keyboard.press('Enter');assert.equal(await page.locator('.bt-result-title').evaluate(n=>n===document.activeElement),true);return{previousInput:'104729',draft:'32',currentResult:'32',explicitResultAccess:true};
   });
   await test('one vertical flow, saved hidden settings and composition-aware Enter',async()=>{
    const structure=await page.evaluate(()=>{const form=document.querySelector('#tool form'),work=form.querySelector('.bt-work'),settings=form.querySelector('.bt-settings');return {workBeforeSettings:!!(work.compareDocumentPosition(settings)&Node.DOCUMENT_POSITION_FOLLOWING),textareas:form.querySelectorAll('textarea').length,layout:getComputedStyle(document.querySelector('.bt-layout')).display,liveBusyAncestor:document.querySelector('.bt-status').closest('[aria-busy=true]')!==null};});assert.equal(structure.workBeforeSettings,true);assert.equal(structure.textareas,0);assert.equal(structure.layout,'block');assert.equal(structure.liveBusyAncestor,false);
    await page.locator('.bt-settings').evaluate(n=>n.open=true);const engine=page.locator('select[id$="-engine"]'),mode=page.locator('select[id$="-mode"]'),workers=page.locator('select[id$="-workers"]'),memory=page.locator('select[id$="-memory"]');assert.equal(await workers.isVisible(),false);
    await engine.selectOption('optimized');await phase('ready');await mode.selectOption('manual');await memory.selectOption('512');await workers.selectOption('3');await mode.selectOption('auto');assert.equal(await workers.isVisible(),false);await mode.selectOption('manual');assert.equal(await workers.inputValue(),'3');await engine.selectOption('standard');await phase('ready');await engine.selectOption('optimized');await phase('ready');assert.equal(await workers.inputValue(),'3');assert.equal(await memory.inputValue(),'512');await engine.selectOption('standard');await phase('ready');await page.locator('.bt-settings').evaluate(n=>n.open=false);
    await input.fill('32');const before=await metrics();await input.dispatchEvent('compositionstart');await input.dispatchEvent('keydown',{key:'Enter',isComposing:true});await page.locator('form').evaluate(n=>n.requestSubmit());assert.equal((await metrics()).created,before.created);await input.evaluate(n=>{n.dispatchEvent(new CompositionEvent('compositionend'));n.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));n.form.requestSubmit();});assert.equal((await metrics()).created,before.created);await input.dispatchEvent('keyup',{key:'Enter'});await input.dispatchEvent('keydown',{key:'Enter',repeat:true});await page.locator('form').evaluate(n=>n.requestSubmit());assert.equal((await metrics()).created,before.created);await input.dispatchEvent('keyup',{key:'Enter'});await input.dispatchEvent('compositionstart');await input.dispatchEvent('compositionend');await page.waitForTimeout(20);assert.equal(await run('32'),'32 = 2^5');return{...structure,composition:'synthetic event-order/229/repeat guards; physical IME unverified'};
   });
   await test('invalid decimal, negative, oversized exponent are rejected without Workers',async()=>{
    const before=await metrics();for(const value of ['2.5','-1','1e10000']){await input.fill(value);await start.click();await phase('invalid');assert.equal(await input.getAttribute('aria-invalid'),'true');assert.equal(await page.getByRole('alert').isVisible(),true);}
    assert.equal((await metrics()).created,before.created);return{workersCreated:0};
   });
   await test('scientific input, exact integer, zero and subsecond display',async()=>{
    assert.equal(await run('3.2e1'),'32 = 2^5');const elapsed=await page.locator('[data-elapsed]').textContent();assert.match(elapsed,/^(?:<1|\d+) ms$/);assert.doesNotMatch(elapsed,/上限|Worker|WASM/);
    assert.equal(await page.locator('.bt-execution-limits div').filter({hasText:'時間上限'}).locator('dd').textContent(),'1秒');
    assert.match(await run('9007199254740993'),/^9007199254740993 = /);assert.equal(await run('0'),'0 = 0');assert.match(await page.locator('.bt-result-status').textContent(),/素数でも合成数でもありません/);
    return{elapsed};
   });
   await test('one semantic row per factor preserves a many-factor result',async()=>{
    const primes=[2n,3n,5n,7n,11n,13n,17n,19n,23n,29n],n=primes.reduce((a,b)=>a*b,1n).toString();await run(n);
    const rows=page.locator('.bt-factor-list li');assert.equal(await rows.count(),10);for(let i=0;i<primes.length;i++)assert.equal(await rows.nth(i).locator('span').textContent(),primes[i]+': 確定判定');
    await page.locator('.bt-proof summary').click();
    const tree=await page.locator('.bt-factor-list').ariaSnapshot();assert.match(tree,/listitem/);return{rows:10,equation:await equation(),semantics:'native ul/li; no physical screen-reader claim'};
   });
   await test('native user-gesture copy outcome',async()=>{
    await run('360');await page.locator('[data-action=copy]').click();
    await page.waitForFunction(()=>[...document.querySelectorAll('[role=status]')].some(x=>x.textContent.includes('コピーしました')||x.textContent.includes('手動でコピー')));
    return{outcome:await page.locator('.bt-result [role=status]').textContent(),api:await page.evaluate(()=>typeof navigator.clipboard?.writeText)};
   });
   for(const mode of ['success','denied','unavailable'])await test('controlled clipboard '+mode,async()=>{
    await page.evaluate(mode=>{window.copyWrites=[];Object.defineProperty(navigator,'clipboard',{configurable:true,value:mode==='unavailable'?undefined:{writeText:async text=>{copyWrites.push(text);if(mode==='denied')throw new DOMException('Denied for acceptance test','NotAllowedError');}}});},mode);
    await page.locator('[data-action=copy]').click();const body=page.locator('.bt-result-body');
    if(mode==='success'){await page.waitForFunction(()=>document.querySelector('.bt-result [role=status]').textContent.includes('コピーしました'));assert.equal(await page.locator('textarea').count(),0);}
    else{await page.waitForFunction(()=>document.activeElement?.classList.contains('bt-result-body'));assert.equal(await body.evaluate(n=>n===document.activeElement),true);const selected=await page.evaluate(()=>getSelection().toString());assert.match(selected,/360 = 2\^3 × 3\^2 × 5/);assert.match(selected,/分解完了/);assert.match(selected,/64bit/);assert.equal(await page.locator('textarea').count(),0);}
    return{writes:await page.evaluate(()=>copyWrites)};
   });
   await test('finite WASM calculation and release',async()=>{
    const value=await run('1050809297549059047257');const state=await page.evaluate(()=>app.getState());
    assert.equal(state.resources.actualWasmBytes,134217728);assert.match(value,/^1050809297549059047257 = /);
    const after=await metrics();assert.equal(after.created,after.terminated);assert.equal(after.urlsCreated,after.urlsRevoked);
    return{equation:value,elapsedMs:state.resources.elapsedMs,wasmBytes:state.resources.actualWasmBytes};
   });
   await test('keyboard start/cancel, release and fresh rerun',async()=>{
    await page.locator('.bt-settings summary').click();await page.locator('select[id$=\"-time\"]').selectOption('5000');
    await input.fill('1050809297549059047257');await input.press('Enter');await phase('running');assert.equal(await input.isEditable(),false);
    const focused=await page.evaluate(()=>document.activeElement?.className);assert.equal(focused,'bt-status');assert.equal(await page.locator('[data-elapsed]').isVisible(),true);await page.keyboard.press('Enter');assert.equal(await page.locator('#tool').getAttribute('data-phase'),'running');await page.locator('[data-action=cancel]').focus();await page.keyboard.press('Enter');await phase('result');
    assert.match(await page.locator('.bt-result-status').textContent(),/中止/);assert.equal(await page.locator('.bt-status').evaluate(n=>n===document.activeElement),true);
    const after=await metrics();assert.equal(after.created,after.terminated);assert.equal(after.urlsCreated,after.urlsRevoked);
    assert.equal(await run('360'),'360 = 2^3 × 3^2 × 5');return{focus:focused,afterCancel:after};
   });
   await test('reset and keyboard tab order',async()=>{
    const reset=page.locator('[data-action=reset]');await reset.click();await phase('ready');assert.equal(await input.inputValue(),'');
    await page.waitForFunction(()=>document.activeElement?.dataset.action==='reset');assert.equal(await reset.evaluate(n=>n===document.activeElement),true);
    await page.locator('.bt-samples').evaluate(n=>n.open=false);await input.focus();await input.press('Tab');assert.equal(await page.locator('.bt-samples summary').evaluate(n=>n===document.activeElement),true);
    await page.locator('.bt-samples summary').focus();
    await page.keyboard.press('Enter');await page.keyboard.press('Tab');assert.equal(await page.locator('[data-sample-value="360"]').evaluate(n=>n===document.activeElement),true);await page.keyboard.press('Enter');assert.equal(await start.evaluate(n=>n===document.activeElement),true);
    return{focusAfterReset:'reset',tabFromInput:'primary start action; optional sample disclosure follows result area'};
   });
   await test('double clicking execute keeps the distinct stop target unactivated',async()=>{
    await input.fill('1050809297549059047257');await start.scrollIntoViewIfNeeded();const box=await start.boundingBox();await page.mouse.dblclick(box.x+box.width/2,box.y+box.height/2);await phase('running');assert.equal(await start.isDisabled(),true);assert.equal(await page.locator('[data-action=cancel]').isEnabled(),true);const focusAfterSecondPointer=await page.evaluate(()=>document.activeElement?.className);await page.locator('[data-action=cancel]').focus();await page.keyboard.press('Enter');await phase('result');assert.match(await page.locator('.bt-result-status').textContent(),/中止/);return{distinctTargets:true,focusAfterSecondPointer};
   });
   await test('narrow widths and 200 percent text resize keep choices and results inside DOM bounds',async()=>{
    const observations=[];await run('9007199254740993');await page.locator('.bt-samples').evaluate(n=>n.open=true);
    await page.locator('.bt-sample-choice').first().evaluate(n=>{const extra=document.createElement('span');extra.textContent='9'.repeat(100)+' 長い選択肢の説明'.repeat(8);n.append(extra);});
    for(const width of [280,320,393])for(const textZoom of [1,2]){
     await page.setViewportSize({width,height:844});await page.evaluate(z=>document.documentElement.style.fontSize=z*100+'%',textZoom);
     await input.fill('9'.repeat(100));await input.blur();await page.locator('.bt-samples button').first().focus();
     const m=await page.evaluate(()=>{const r=document.querySelector('#tool');return {documentWidth:document.documentElement.clientWidth,documentScroll:document.documentElement.scrollWidth,pluginWidth:r.clientWidth,pluginScroll:r.scrollWidth,scale:visualViewport?.scale,font:parseFloat(getComputedStyle(r.querySelector('input')).fontSize)};});
     assert.ok(m.documentScroll<=m.documentWidth+1,JSON.stringify(m));assert.ok(m.pluginScroll<=m.pluginWidth+1,JSON.stringify(m));assert.ok(m.font>=16);observations.push({width,textZoom,...m});
    }
    await page.evaluate(()=>{document.documentElement.style.fontSize='100%';document.querySelector('.bt-samples').open=false;document.querySelector('.bt-settings').open=false;});await page.setViewportSize({width:390,height:844});await run('9007199254740993');await page.screenshot({path:out+'.'+name+'.png',fullPage:true});return{observations,scope:'desktop engine text resize; no OS picker geometry or physical iOS zoom guarantee'};
   });
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

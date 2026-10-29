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
   console.log(name+': launch');browser=await pw[name].launch({headless:true,timeout:15000,...(name==='chromium'&&process.env.CHROME_BIN?{executablePath:resolve(process.env.CHROME_BIN)}:{})});result.version=browser.version();
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
   const test=async(label,fn)=>{if(process.env.TEST_CASE_FILTER&&!label.includes(process.env.TEST_CASE_FILTER))return;console.log(name+': '+label);try{const evidence=await fn();result.cases.push({label,passed:true,...evidence});}catch(e){result.cases.push({label,passed:false,error:String(e)});result.failures.push(label);}};
   const escape=async()=>{await page.keyboard.press('Escape');await page.waitForFunction(()=>document.querySelectorAll('#tool dialog[open]').length===0);};
   const config=async values=>{await page.locator('[data-action=settings]').click();for(const[key,value]of Object.entries(values))await page.locator('select[id$="-'+key+'"]').selectOption(String(value));await page.locator('[data-action=apply-settings]').click();await phase('ready');};
   await test('examples use one native modal, fill only, close and focus common start',async()=>{const before=await metrics();for(const value of ['360','104729','9007199254740993','1000036000099']){await page.locator('[data-action=examples]').click();assert.equal(await page.locator('.bt-samples').evaluate(n=>n.matches(':modal')),true);assert.equal(await page.locator('.bt-samples h2').evaluate(n=>n===document.activeElement),true);await page.locator('[data-sample-value="'+value+'"]').click();assert.equal(await input.inputValue(),value);assert.equal(await page.locator('.bt-samples').evaluate(n=>n.open),false);assert.equal(await start.evaluate(n=>n===document.activeElement),true);}assert.equal((await metrics()).created,before.created);return{examples:4,workersCreated:0};});
   await test('modal Escape and close restore focus and scroll; background is inert',async()=>{for(const action of ['examples','settings'])for(let i=0;i<3;i++){const trigger=page.locator('[data-action='+action+']');await trigger.scrollIntoViewIfNeeded();const y=await page.evaluate(()=>scrollY);await trigger.click();const dialog=page.locator(action==='examples'?'.bt-samples':'.bt-settings');await input.focus();assert.equal(await dialog.evaluate(n=>n.contains(document.activeElement)),true,'background focus '+action);for(let j=0;j<15;j++){await page.keyboard.press(j%2?'Tab':'Shift+Tab');assert.equal(await dialog.evaluate(n=>n.contains(document.activeElement)),true,'tab boundary '+action+' '+j);}await escape();await page.waitForFunction(selector=>!document.querySelector(selector).open,action==='examples'?'.bt-samples':'.bt-settings');assert.equal(await trigger.evaluate(n=>n===document.activeElement),true,'restored focus '+action);assert.ok(Math.abs((await page.evaluate(()=>scrollY))-y)<=1);}return{repeatedOpens:6,nativeContainment:true};});
   await test('settings draft and cancel never change execution or input ceiling',async()=>{await page.locator('[data-action=settings]').click();await page.locator('select[id$="-engine"]').selectOption('optimized');assert.match(await page.locator('.bt-input-limit').textContent(),/309/);assert.equal((await page.evaluate(()=>app.getState())).engine,'standard');await page.locator('[data-action=cancel-settings]').click();await page.locator('[data-action=settings]').click();assert.equal(await page.locator('select[id$="-engine"]').inputValue(),'standard');await page.locator('[data-action=close-settings]').click();});
   await test('invalid settings remain a draft and valid apply preserves manual values',async()=>{await page.locator('[data-action=settings]').click();await page.locator('select[id$="-engine"]').selectOption('optimized');await page.locator('select[id$="-mode"]').selectOption('manual');await page.locator('select[id$="-workers"]').selectOption('6');await page.locator('[data-action=apply-settings]').click();assert.equal(await page.locator('.bt-settings').evaluate(n=>n.open),true);assert.match(await page.locator('.bt-settings [role=alert]').textContent(),/まだ適用していません/);await page.locator('select[id$="-workers"]').selectOption('3');await page.locator('select[id$="-memory"]').selectOption('512');await page.locator('select[id$="-mode"]').selectOption('auto');await page.locator('select[id$="-mode"]').selectOption('manual');assert.equal(await page.locator('select[id$="-workers"]').inputValue(),'3');await page.locator('[data-action=apply-settings]').click();await phase('ready');assert.match(await page.locator('.bt-input-limit').textContent(),/100.*332/);assert.equal(await run('32'),'32 = 2^5');await page.locator('.bt-execution').evaluate(n=>n.open=true);const limits=await page.locator('.bt-execution-limits').textContent();assert.match(limits,/選択したWASM予算512 MiB/);assert.match(limits,/この計算では使わない/);await config({engine:'standard'});});
   await test('exact bounds, bulk insertion and input rejection create no Workers',async()=>{const before=await metrics();for(const value of ['2.5','-1','1e10000',(1n<<1024n).toString(),'0'.repeat(4097)]){await input.fill(value);await start.click();await phase('invalid');assert.equal(await input.getAttribute('aria-invalid'),'true');assert.equal(await page.getByRole('alert').isVisible(),true);assert.equal(await input.inputValue(),value);}assert.equal((await metrics()).created,before.created);await config({engine:'optimized'});await input.fill((1n<<332n).toString());await start.click();await phase('invalid');assert.match(await page.getByRole('alert').textContent(),/332/);await config({engine:'standard'});});
   await test('scientific notation, leading zeros, precision, zero and elapsed time',async()=>{assert.equal(await run('000032'),'32 = 2^5');assert.equal(await run('3.2e1'),'32 = 2^5');assert.match(await run('9007199254740993'),/^9007199254740993 = /);assert.match(await page.locator('[data-elapsed]').textContent(),/^(?:<1|\d+) ms$/);assert.equal(await run('0'),'0 = 0');assert.match(await page.locator('.bt-result-status').textContent(),/素数でも合成数でもありません/);});
   await test('draft input and applied settings leave prior result and copy identity explicit',async()=>{await run('104729');await input.fill('32');assert.match(await page.locator('.bt-result-title').textContent(),/前回.*104729/);assert.match(await page.locator('.bt-draft-note').textContent(),/未実行/);assert.equal(await equation(),'104729 = 104729');await input.press('Enter');await phase('result');await config({time:'5000'});assert.match(await page.locator('.bt-result-title').textContent(),/前回.*32/);assert.equal(await equation(),'32 = 2^5');await config({time:'1000'});});
   await test('factor reasons stay semantic and each factor has its own row',async()=>{const primes=[2n,3n,5n,7n,11n,13n,17n,19n,23n,29n];await run(primes.reduce((a,b)=>a*b,1n).toString());const rows=page.locator('.bt-factor-list li');assert.equal(await rows.count(),10);await page.locator('.bt-proof').evaluate(n=>n.open=true);assert.match(await page.locator('.bt-factor-list').ariaSnapshot(),/listitem/);for(let i=0;i<10;i++)assert.equal(await rows.nth(i).locator('span').textContent(),primes[i]+': 確定判定');});
   for(const mode of ['success','denied','unavailable'])await test('same-display clipboard '+mode,async()=>{await run('360');await page.evaluate(mode=>{window.copyWrites=[];Object.defineProperty(navigator,'clipboard',{configurable:true,value:mode==='unavailable'?undefined:{writeText:async text=>{copyWrites.push(text);if(mode==='denied')throw new DOMException('Denied','NotAllowedError');}}});},mode);await page.locator('[data-action=copy]').click();await page.waitForFunction(()=>document.querySelector('.bt-copy-status').textContent.length>0);if(mode==='success')assert.match(await page.locator('.bt-copy-status').textContent(),/コピーしました/);else{assert.equal(await page.locator('.bt-result-body').evaluate(n=>n===document.activeElement),true);assert.match(await page.evaluate(()=>getSelection().toString()),/360 = 2\^3/);}assert.equal(await page.locator('textarea').count(),0);return{writes:await page.evaluate(()=>copyWrites)};});
   await test('IME confirmation, delayed deliberate Enter, repeat and 229 are distinguished',async()=>{await input.fill('32');const before=await metrics();await input.evaluate(n=>{n.dispatchEvent(new CompositionEvent('compositionstart'));n.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',isComposing:true,bubbles:true,cancelable:true}));n.form.requestSubmit();n.dispatchEvent(new CompositionEvent('compositionend'));n.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));n.form.requestSubmit();n.dispatchEvent(new KeyboardEvent('keyup',{key:'Enter',bubbles:true}));});assert.equal((await metrics()).created,before.created);for(const props of [{repeat:true},{keyCode:229}])await input.evaluate((n,props)=>{n.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true,...props}));n.form.requestSubmit();n.dispatchEvent(new KeyboardEvent('keyup',{key:'Enter',bubbles:true}));},props);assert.equal((await metrics()).created,before.created);await page.waitForTimeout(20);assert.equal(await run('32'),'32 = 2^5');return{physicalIME:false};});
   await test('real WASM request, cancel, release and next run',async()=>{await config({time:'5000'});await input.fill('1050809297549059047257');await input.press('Enter');await phase('running');assert.equal(await input.isEditable(),false);assert.equal(await page.locator('[data-action=settings]').isDisabled(),true);assert.equal(await page.locator('[data-action=examples]').isDisabled(),true);assert.equal(await page.locator('[data-elapsed]').isVisible(),true);assert.equal(await page.locator('.bt-status').evaluate(n=>n===document.activeElement),true);await page.locator('[data-action=cancel]').focus();await page.keyboard.press('Enter');await phase('result');assert.match(await page.locator('.bt-result-status').textContent(),/中止/);const state=await page.evaluate(()=>app.getState());assert.equal(state.resources.actualWasmBytes,134217728);const m=await metrics();assert.equal(m.created,m.terminated);assert.equal(m.urlsCreated,m.urlsRevoked);assert.equal(await run('32'),'32 = 2^5');});
   await test('double click cannot toggle execute into cancel',async()=>{await input.fill('1050809297549059047257');await start.scrollIntoViewIfNeeded();const b=await start.boundingBox();await page.mouse.dblclick(b.x+b.width/2,b.y+b.height/2);await phase('running');assert.equal(await start.isDisabled(),true);assert.equal(await page.locator('[data-action=cancel]').isEnabled(),true);await page.locator('[data-action=cancel]').focus();await page.keyboard.press('Enter');await phase('result');});
   await test('narrow and short viewports with 200 percent text scroll rather than clip dialogs',async()=>{const observations=[];for(const width of [280,320,393])for(const height of [240,844])for(const textZoom of [1,2]){await page.setViewportSize({width,height});await page.evaluate(z=>document.documentElement.style.fontSize=z*100+'%',textZoom);for(const action of ['examples','settings']){await page.locator('[data-action='+action+']').click();const d=page.locator(action==='examples'?'.bt-samples':'.bt-settings');const m=await d.evaluate(n=>{const r=n.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,client:n.clientHeight,scroll:n.scrollHeight,overflow:getComputedStyle(n).overflowY,document:document.documentElement.scrollWidth,viewport:innerWidth};});assert.ok(m.x>=0&&m.y>=0&&m.x+m.width<=width+1&&m.y+m.height<=height+1,JSON.stringify(m));assert.ok(m.document<=width+1);assert.equal(m.overflow,'auto');await escape();observations.push({action,width,height,textZoom,...m});}}await page.setViewportSize({width:393,height:852});await page.evaluate(()=>document.documentElement.style.fontSize='100%');return{observations,physicalIOS:false};});
   await test('reset, input menu keyboard order and clean repeated opening',async()=>{await page.locator('[data-action=reset]').click();await phase('ready');assert.equal(await input.inputValue(),'');await input.focus();await page.keyboard.press('Tab');assert.equal(await page.locator('[data-action=examples]').evaluate(n=>n===document.activeElement),true);await page.keyboard.press('Enter');await page.waitForFunction(()=>document.querySelector('.bt-samples').open);assert.equal(await page.locator('.bt-samples').evaluate(n=>n.matches(':modal')),true);await escape();await page.keyboard.press('Tab');assert.equal(await page.locator('[data-action=settings]').evaluate(n=>n===document.activeElement),true);});

   await test('sample-run-repeat-reset has one qualified live result and no stale redundant instructions',async()=>{assert.match(await page.locator('#tool').evaluate(n=>getComputedStyle(n).fontFamily),/system-ui/);assert.equal(await page.locator('.bt-status').textContent(),'');const space=await page.locator('.bt-status').evaluate(n=>({height:n.getBoundingClientRect().height,top:getComputedStyle(n).marginTop,bottom:getComputedStyle(n).marginBottom}));assert.deepEqual(space,{height:0,top:'0px',bottom:'0px'});await page.locator('[data-action=examples]').click();await page.locator('[data-sample-value="9007199254740993"]').click();assert.equal(await input.inputValue(),'9007199254740993');assert.equal(await page.locator('#tool').getAttribute('data-phase'),'ready');assert.doesNotMatch(await page.locator('#tool').innerText(),/を入力しました|まだ実行していません|入力を用意して|入力・結果を保存・送信しません/);await input.press('Enter');await phase('result');assert.match(await page.locator('.bt-result-status').textContent(),/分解完了/);assert.equal(await page.locator('.bt-result-status').getAttribute('aria-live'),'polite');assert.equal(await page.locator('.bt-status').textContent(),'実行記録');assert.equal(await page.locator('.bt-status').getAttribute('aria-live'),'off');assert.doesNotMatch(await page.locator('#tool').innerText(),/を入力しました|まだ実行していません|計算が終了しました/);await run('32');assert.equal(await page.locator('.bt-status').textContent(),'実行記録');assert.match(await page.locator('.bt-result-status').textContent(),/分解完了/);await input.fill('2.5');await input.press('Enter');await phase('invalid');assert.match(await page.locator('.bt-status').textContent(),/入力を修正/);assert.equal(await page.locator('.bt-result-status').getAttribute('aria-live'),'off');await page.locator('[data-action=reset]').click();await phase('ready');assert.equal(await page.locator('.bt-status').textContent(),'');assert.equal(await page.locator('.bt-result').isVisible(),false);return{emptyStatusSpace:space,physicalScreenReader:false};});
   await test('extended acceptance, probable result, copy and actual finite route',async()=>{
    await config({engine:'standard',time:'60000'});assert.match(await page.locator('.bt-input-limit').textContent(),/309.*1024/);
    assert.match(await run('1e100'),/2\^100 × 5\^100/);
    let state=await page.evaluate(()=>app.getState());assert.equal(state.resources.actualTimeBudgetMs,60000);assert.equal(state.resources.route,'共通ルーティング');
    assert.equal(state.resources.trace[0].stage,'native');assert.equal(state.resources.trace[0].timeBudgetMs,5000);assert.equal(state.resources.trace[0].workKey,'native');
    assert.ok(state.resources.trace[0].workChargedUpperBound<=1000000);assert.ok(state.resources.workRemaining.native>=0&&state.resources.workRemaining.native<=1000000);
    assert.equal(state.resources.configuredPlan.timeBudgetMs,60000);assert.equal(state.resources.actualWasmBytes,0);assert.equal(state.resources.actualWorkers,1);
    await page.locator('.bt-execution').evaluate(n=>n.open=true);assert.match(await page.locator('.bt-execution-limits').textContent(),/共通ルーティング/);
    const prime=((1n<<521n)-1n).toString();await run(prime);assert.match(await page.locator('.bt-result-status').textContent(),/未証明/);
    state=await page.evaluate(()=>app.getState());assert.equal(state.view.groups[0].certainty,'probable');
    await page.evaluate(()=>{window.extendedCopyWrites=[];Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>extendedCopyWrites.push(text)}});});
    await page.locator('[data-action=copy]').click();await page.waitForFunction(()=>extendedCopyWrites.length===1);
    assert.match(await page.evaluate(()=>extendedCopyWrites[0]),/未証明/);assert.ok((await page.evaluate(()=>extendedCopyWrites[0])).includes(prime));
    await page.setViewportSize({width:320,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    assert.equal(await page.locator('progress').getAttribute('value'),null);
    await page.screenshot({path:resolve(dirname(out),'extended-mobile.png'),fullPage:true});
    await page.setViewportSize({width:1000,height:850});await config({engine:'standard',time:'1000'});
    return{inputDigits:101,probableBits:521,actualBudgetMs:5000,physicalMobile:false};
   });
   await test('extended cancellation retains status and permits a fresh small run',async()=>{
    const hard=(((1n<<521n)-1n)*((1n<<127n)-1n)).toString();const before=await metrics();
    await input.fill(hard);await page.evaluate(()=>{document.querySelector('#tool form').requestSubmit();document.querySelector('[data-action=cancel]').click();});
    await phase('result');assert.match(await page.locator('.bt-result-status').textContent(),/中止/);
    const state=await page.evaluate(()=>app.getState());assert.ok(state.view.pendingGroups.some(g=>g.value===hard&&g.exponent===1));assert.equal(state.view.groups.length,0);assert.match(state.view.copyText,/中止/);assert.match(state.view.copyText,/未分解・未確認/);assert.ok(state.view.copyText.includes(hard));
    assert.equal(state.resources.actualWasmBytes,0);const after=await metrics();assert.ok(after.created-before.created<=1);assert.equal(after.created,after.terminated);assert.equal(after.urlsCreated,after.urlsRevoked);
    assert.equal(await run('32'),'32 = 2^5');
   });
   await test('active common-route cancellation retires exactly one native Worker',async()=>{
    await config({engine:'standard',time:'60000'});
    const hard=(((1n<<521n)-1n)*((1n<<127n)-1n)).toString(),before=await metrics();
    await input.fill(hard);await start.click();await page.waitForFunction(n=>metric.created>n,before.created);
    await page.locator('[data-action=cancel]').click();await phase('result');
    const s=await page.evaluate(()=>app.getState()),after=await metrics();
    assert.equal(s.view.status,'cancelled');assert.equal(after.created-before.created,1);
    assert.equal(after.created,after.terminated);assert.equal(after.urlsCreated,after.urlsRevoked);
    assert.ok(s.view.copyText.includes(hard));assert.match(s.view.copyText,/中止/);assert.match(s.view.copyText,/未分解・未確認/);
    assert.equal(await run('32'),'32 = 2^5');
   });
   await test('extended unmount holds retirement boundary before a fresh mount',async()=>{
    await input.fill('1e100');await page.evaluate(()=>{document.querySelector('#tool form').requestSubmit();app.dispose();});
    await page.waitForFunction(()=>metric.created===metric.terminated&&metric.urlsCreated===metric.urlsRevoked);
    await page.evaluate(async()=>{const{mountSiteFactorizer}=await import('/src/site/mount.mjs');window.app=mountSiteFactorizer(document.querySelector('#tool'));});
    await phase('ready');assert.equal(await run('32'),'32 = 2^5');
   });

   await test('unmount closes an open modal, and running Worker resources retire',async()=>{await input.fill('1050809297549059047257');await input.press('Enter');await phase('running');await page.evaluate(()=>app.dispose());await page.waitForFunction(()=>metric.created===metric.terminated&&metric.urlsCreated===metric.urlsRevoked);await page.evaluate(async()=>{const{mountSiteFactorizer}=await import('/src/site/mount.mjs');window.app=mountSiteFactorizer(document.querySelector('#tool'));});await phase('ready');await page.locator('[data-action=examples]').click();assert.equal(await page.locator('dialog:modal').count(),1);await page.evaluate(()=>app.dispose());assert.equal(await page.locator('dialog:modal').count(),0);return{metrics:await metrics(),openModalDisposed:true};});

   result.finalMetrics=await metrics();assert.equal(result.requestsAfterReady.length,0);assert.equal(result.finalMetrics.network.length,0);assert.equal(result.finalMetrics.storage.length,0);assert.deepEqual(result.errors,[]);
   await context.close();
  }catch(e){result.fatal=String(e);process.exitCode=1;}finally{await browser?.close();}
  if(result.failures.length)process.exitCode=1;
  console.log(JSON.stringify({name,version:result.version,cases:result.cases.map(x=>[x.label,x.passed]),fatal:result.fatal}));
 }
}finally{server.close();await writeFile(out,JSON.stringify(report,null,2)+'\n');}

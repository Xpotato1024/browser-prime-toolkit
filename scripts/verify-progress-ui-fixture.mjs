// SPDX-License-Identifier: AGPL-3.0-only
// UI fixture only. No production engine source may be read or served.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
const arg=name=>{const i=process.argv.indexOf(name);if(i<0)throw Error('Required '+name);return process.argv[i+1];};
const repo=resolve(import.meta.dirname,'..'),out=resolve(arg('--out'));
process.env.PLAYWRIGHT_BROWSERS_PATH=resolve(arg('--browsers'));
const pw=await import(pathToFileURL(resolve(arg('--playwright'))));await mkdir(out,{recursive:true});
const sourcePaths=['src/site/mount.js','src/site/session.js','src/site/progress.js','src/site/progress-view.js',
 'src/site/presentation.js','src/site/document-scope.js','src/site/capabilities.js','src/site/policy.js',
 'src/site/settings-state.js','src/site/modal.js','src/site/guidance.js','src/site/fonts.js','src/site/font-text.js',
 'src/site/tool.css','src/extended/policy.js','src/extended/result-view.js','src/core/extended-input-contract.js','src/core/integer-input.js','src/graph-multicore/policy.js','src/selected-wide/policy.js','src/wide-window/policy.js'];
const routes=new Map(await Promise.all(sourcePaths.map(async p=>['/'+p,await readFile(join(repo,p))])));
routes.set('/fixtures/provider.mjs',await readFile(join(repo,'scripts/fixtures/progress-ui-provider.mjs')));
routes.set('/fixtures/no-arithmetic.mjs',Buffer.from("export function assessPrime(){uiFixture.mathCalls++;throw Error('Arithmetic forbidden in UI fixture');}"));
routes.set('/fixtures/constants.mjs',Buffer.from('export const UINT64_CEILING=18446744073709551616n;'));
routes.set('/fixtures/view.mjs',Buffer.from("export function makeResultView(result,input){if(result.input!==input||!result.fixtureView)throw Error('UI fixture view required');return result.fixtureView;}"));
const imports=Object.fromEntries([
 ['/src/resources/light-adapter.js','/fixtures/provider.mjs'],['/src/optimized/index.js','/fixtures/provider.mjs'],
 ['/src/extended/runner.js','/fixtures/provider.mjs'],['/src/selected-wide/index.js','/fixtures/provider.mjs'],['/src/engine/arithmetic.js','/fixtures/no-arithmetic.mjs'],
 ['/src/engine/options.js','/fixtures/constants.mjs'],['/src/ui/result-view.js','/fixtures/view.mjs']]);
routes.set('/fixture.mjs',Buffer.from([
 "import {mountSiteFactorizer} from '/src/site/mount.js';",
 "import {createSiteSession} from '/src/site/session.js';",
 "import {makeComputeScope} from '/src/site/document-scope.js';",
 "import * as provider from '/fixtures/provider.mjs';",
 "window.fixtureApi={createSiteSession,makeComputeScope,provider,mount(){window.app?.dispose();window.app=mountSiteFactorizer(document.querySelector('#tool'),{hints:{hardwareConcurrency:2,deviceMemory:2},sessionOptions:{loadLight:provider.loadFixtureLight,loadHeavy:async()=>provider}});}};",
 "fixtureApi.mount();"].join('\n')));
const html='<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>UI fixture — 実計算なし</title><link rel="stylesheet" href="/host.css"><link rel="stylesheet" href="/src/site/tool.css"><body><header><strong>UI検証用 fixture — 実計算・性能測定ではありません</strong><p>表示・状態遷移だけを検証します。因子は固定サンプルです。</p></header><main><div id="tool" class="bt-prime-factorizer"></div><footer id="anchor">UI fixtureの末尾（配置計測用）</footer></main><script type="importmap" nonce="ui-fixture">'+JSON.stringify({imports})+'</script><script type="module" src="/fixture.mjs"></script></body></html>';
routes.set('/',Buffer.from(html));routes.set('/host.css',Buffer.from('html{font:16px/1.6 system-ui,sans-serif;color:#24212b;background:#fff}body{margin:0;padding:1rem}header,main{max-width:48rem;margin:auto}header{border-bottom:1px solid #736a7b;margin-bottom:1rem}header p{margin:.3rem 0 1rem}footer{margin-top:1rem;border-top:1px solid #736a7b}'));
const requests=[],denied=[];
const server=createServer((req,res)=>{
 const path=new URL(req.url,'http://127.0.0.1').pathname;requests.push(path);
 if(!routes.has(path)){denied.push(path);res.writeHead(403);res.end('UI fixture allowlist only');return;}
 res.writeHead(200,{'Content-Type':path==='/'?'text/html; charset=utf-8':path.endsWith('.css')?'text/css':'text/javascript',
 'Content-Security-Policy':"default-src 'none'; script-src 'self' 'nonce-ui-fixture'; style-src 'self'; worker-src 'none'; connect-src 'none'; font-src 'none'; img-src 'none'; base-uri 'none'; form-action 'none'"});res.end(routes.get(path));
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
const report={scope:'UI fixture only; no engine, arithmetic, Worker, WASM or performance claim',node:process.version,checkedAt:new Date().toISOString(),sourcePaths,cases:[],browsers:[]};
const check=async(name,fn)=>{console.log(name);try{report.cases.push({name,pass:true,evidence:await fn()});}catch(e){report.cases.push({name,pass:false,error:String(e.stack??e)});process.exitCode=1;}};
let browser;
try{
 for(const name of ['firefox','webkit']){
  console.log('launch '+name);browser=await pw[name].launch({headless:true,timeout:20000});
  const record={name,version:browser.version(),pageErrors:[],engineAttempts:0};report.browsers.push(record);
  const context=await browser.newContext({viewport:{width:1280,height:900},serviceWorkers:'block'});
  await context.route('**/*',route=>route.request().url().startsWith(base)?route.continue():route.abort());
  await context.addInitScript(()=>{window.fixtureEngineAttempts=0;window.Worker=class{constructor(){fixtureEngineAttempts++;throw Error('No Worker in UI fixture');}};WebAssembly.instantiate=WebAssembly.compile=()=>{fixtureEngineAttempts++;throw Error('No WASM in UI fixture');};});
  const page=await context.newPage();page.setDefaultTimeout(5000);page.on('pageerror',e=>record.pageErrors.push(String(e)));
  const ready=async()=>page.waitForFunction(()=>app.getState().phase==='ready');
  const phase=async p=>page.waitForFunction(p=>app.getState().phase===p,p);
  await page.goto(base);await ready();
  await check(name+' session lifecycle',async()=>page.evaluate(async()=>{
   const {createSiteSession,makeComputeScope,provider}=fixtureApi,events=[];
   const session=createSiteSession({scope:makeComputeScope(),loadLight:async()=>provider,loadHeavy:async()=>provider,onChange:s=>events.push(s)});
   await session.prepare('optimized');const pending=session.start('9'.repeat(99),{timeBudgetMs:1000});
   uiFixture.progress({families:1,relations:2,target:10});const run=uiFixture.current,measured=session.getState();
   session.cancel();uiFixture.progress({families:2,relations:5,target:10},run);const cancelling=session.getState();
   uiFixture.finish({},run);await pending;const terminal=session.getState();session.dispose();const disposed=session.getState(),count=events.length;
   uiFixture.progress({families:3,relations:9,target:10},run);
   if(measured.progress.value!==.2||cancelling.progress.stage!=='cancelling'||cancelling.progress.relations!==2||terminal.phase!=='result'||disposed.progress!==null||events.length!==count)throw Error('Session lifecycle mismatch');
   return{stages:events.map(e=>[e.phase,e.progress?.stage]),disposedProgress:disposed.progress,mathCalls:uiFixture.mathCalls};
  }));
  const input=page.getByLabel('0以上の整数',{exact:true}),start=page.locator('[data-action=start]');
  const begin=async value=>{await input.fill(value);await start.focus();await page.keyboard.press('Enter');await phase('running');};
  const configure=async()=>{await page.locator('[data-action=settings]').click();await page.locator('select[id$="-engine"]').selectOption('optimized');await page.locator('[data-action=apply-settings]').click();await ready();};
  await check(name+' keyboard complete/copy/live result',async()=>{
   await begin('35');await page.evaluate(()=>uiFixture.finish());await phase('result');
   assert.equal(await page.locator('.bt-equation').textContent(),'35 = 5 × 7');
   assert.equal(await page.locator('.bt-result-status').getAttribute('aria-live'),'polite');
   assert.equal(await page.locator('.bt-status').getAttribute('aria-live'),'off');
   assert.equal(await page.locator('.bt-progress progress').getAttribute('data-terminal'),'true');
   assert.equal(await page.locator('.bt-status').textContent(),'実行記録');
   await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>window.fixtureCopied=text}}));
   await page.locator('[data-action=copy]').click();await page.waitForFunction(()=>!!window.fixtureCopied);assert.match(await page.evaluate(()=>fixtureCopied),/35 = 5 × 7/);return{fixtureComplete:true};
  });
  await page.evaluate(()=>{const node=document.querySelector('.bt-status'),d=Object.getOwnPropertyDescriptor(Node.prototype,'textContent');window.fixtureNotices=[];Object.defineProperty(node,'textContent',{configurable:true,get(){return d.get.call(this);},set(value){if(value)fixtureNotices.push({value,live:this.getAttribute('aria-live')});d.set.call(this,value);}});});
  await configure();assert.equal(await page.locator('.bt-status').getAttribute('aria-live'),'polite');
  assert.ok((await page.evaluate(()=>fixtureNotices)).some(n=>n.value.includes('必要なファイル')&&n.live==='polite'));
  for(const width of [1280,393,320]){
   await check(name+' progress layout '+width,async()=>{
    await page.setViewportSize({width,height:900});await begin('9'.repeat(99));
    await page.evaluate(()=>uiFixture.progress({families:1,relations:25,target:100}));
    const measure=()=>page.evaluate(()=>{const box=s=>{const r=document.querySelector(s).getBoundingClientRect();return{y:r.y+scrollY,height:r.height,width:r.width};};return{progress:box('.bt-progress'),metrics:box('.bt-metrics'),footer:box('#anchor'),scroll:scrollY,viewport:visualViewport?.scale,overflow:document.documentElement.scrollWidth>innerWidth,focus:document.activeElement?.className};});
    await page.evaluate(()=>{window.fixtureStageMutations=0;window.fixtureStageObserver=new MutationObserver(r=>fixtureStageMutations+=r.length);fixtureStageObserver.observe(document.querySelector('.bt-status'),{childList:true,characterData:true,subtree:true});});
    await page.waitForTimeout(220);await page.evaluate(()=>uiFixture.progress({families:2,relations:30,target:100}));
    assert.equal(await page.evaluate(()=>fixtureStageMutations),0);await page.evaluate(()=>fixtureStageObserver.disconnect());
    const before=await measure();await page.screenshot({path:join(out,name+'-'+width+'-collecting.png'),fullPage:true});
    await page.evaluate(()=>uiFixture.progress({families:999999,relations:100,target:100}));const after=await measure();
    assert.equal(after.overflow,false);assert.equal(after.scroll,before.scroll);assert.equal(after.viewport,before.viewport);assert.equal(after.focus,before.focus);
    assert.ok(Math.abs(after.metrics.y-before.metrics.y)<=1,JSON.stringify({before,after}));
    assert.equal(await page.locator('.bt-progress progress').getAttribute('value'),null);
    await page.locator('[data-action=cancel]').focus();await page.keyboard.press('Enter');await phase('cancelling');
    const cancel=await measure();assert.equal(await page.locator('.bt-status').getAttribute('aria-live'),'polite');assert.ok(Math.abs(cancel.metrics.y-before.metrics.y)<=1,JSON.stringify({before,cancel}));
    await page.evaluate(()=>uiFixture.finish());await phase('result');assert.match(await page.locator('.bt-result-status').textContent(),/中止/);
    const terminal=await measure();assert.ok(Math.abs(terminal.metrics.y-before.metrics.y)<=1,JSON.stringify({before,terminal}));assert.equal(terminal.scroll,before.scroll);
    await page.screenshot({path:join(out,name+'-'+width+'-cancelled.png'),fullPage:true});return{before,after,cancel,terminal,physicalDevice:false};
   });
   if(await page.evaluate(()=>['running','cancelling'].includes(app.getState().phase))){await page.evaluate(()=>uiFixture.finish());await phase('result');}
  }
  await check(name+' all stopping categories/residual/copy',async()=>{
   const reasons=['time-budget','initialization-timeout','coordinator-memory-soft-stop','native-memory-budget','wasm-oom','fatal-unknown','native-unknown','missing-session','composite-divisor','operation-budget','algorithm-resource','worker-error','worker-creation','message-error','protocol-failure','verification-failed','unknown-reason'],observations=[];
   for(const reason of reasons){await begin('9'.repeat(99));await page.evaluate(reason=>uiFixture.finish({reason}),reason);await phase('result');
    const text=await page.locator('.bt-stop-reason').textContent();assert.ok(text);assert.ok((await page.locator('.bt-residual').textContent()).includes('9'.repeat(99)));
    await page.locator('[data-action=copy]').click();await page.waitForFunction(text=>fixtureCopied.includes(text),text);
    if(['worker-error','worker-creation','unknown-reason'].includes(reason))assert.doesNotMatch(text,/メモリ上限に達しました/);observations.push({reason,text});
   }
   await page.screenshot({path:join(out,name+'-320-long-reason.png'),fullPage:true});return observations;
  });
  await check(name+' verification error retry and cleanup failure block',async()=>{
   await begin('9'.repeat(99));await page.evaluate(()=>uiFixture.finish({malformed:true}));await phase('error');assert.equal(await start.isEnabled(),true);
   await begin('9'.repeat(99));await page.evaluate(()=>uiFixture.finish({reason:'native-memory-budget'}));await phase('result');
   await begin('9'.repeat(99));await page.evaluate(()=>uiFixture.finish({cleanup:true}));await phase('blocked');assert.equal(await start.isDisabled(),true);
   await page.evaluate(()=>app.dispose());assert.equal(await page.locator('#tool').evaluate(n=>n.children.length),0);assert.equal(await page.evaluate(()=>app.getState().progress),null);
  });
  await page.reload();await ready();
  await check(name+' preparation retry and pending unmount',async()=>{
   await page.evaluate(()=>{uiFixture.loadFailures=1;fixtureApi.mount();});await phase('error');
   await page.locator('[data-action=retry]').click();await ready();await configure();await begin('9'.repeat(99));
   await page.evaluate(()=>{const run=uiFixture.current;app.dispose();uiFixture.progress({families:1,relations:1,target:10},run);uiFixture.finish({},run);});
   await page.waitForFunction(()=>app.getState().phase==='disposed');assert.equal(await page.locator('#tool').evaluate(n=>n.children.length),0);return{disposeProgress:await page.evaluate(()=>app.getState().progress)};
  });
  record.engineAttempts=await page.evaluate(()=>fixtureEngineAttempts+uiFixture.mathCalls);assert.equal(record.engineAttempts,0);assert.deepEqual(record.pageErrors,[]);
  await context.close();await browser.close();browser=null;
 }
}catch(e){report.fatal=String(e.stack??e);process.exitCode=1;}
finally{
 await browser?.close();await new Promise(r=>server.close(r));report.requests=requests;report.deniedRoutes=denied;
 report.forbiddenSourceRequests=requests.filter(p=>p.startsWith('/src/engine/')||p.startsWith('/src/optimized/')||p.startsWith('/src/resources/')||p.includes('wasm'));
 await writeFile(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({passed:report.cases.filter(x=>x.pass).length,total:report.cases.length,fatal:report.fatal,forbiddenSourceRequests:report.forbiddenSourceRequests}));
}

// SPDX-License-Identifier: AGPL-3.0-only
// Optional host-minification regression; tools are supplied separately, never app dependencies.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,access} from 'node:fs/promises';
import {resolve,join,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createServer} from 'node:http';
import {createHash} from 'node:crypto';
const arg=k=>{const i=process.argv.indexOf(k);assert.ok(i>=0,k);return resolve(process.argv[i+1]);};
const dist=arg('--dist'),out=arg('--out'),hash=b=>createHash('sha256').update(b).digest('hex');
try{await access(out);throw Error('No evidence overwrite');}catch(e){if(e.code!=='ENOENT')throw e;}
assert.ok(process.env.ESBUILD_MODULE&&process.env.PLAYWRIGHT_MODULE&&process.env.CHROME_BIN,'Set existing pinned tool paths');
const minifier=await import(pathToFileURL(resolve(process.env.ESBUILD_MODULE))),pw=await import(pathToFileURL(resolve(process.env.PLAYWRIGHT_MODULE)));
const tool=JSON.parse(await readFile(resolve(dirname(process.env.ESBUILD_MODULE),'../package.json')));
assert.equal(tool.version,'0.28.2');assert.equal(tool.license,'MIT');
const manifest=JSON.parse(await readFile(join(dist,'browser-tool.json')));
const provenance=JSON.parse(await readFile(join(dist,'artifact-provenance.json')));
const {ECM_WORKER_SOURCE}=await import(pathToFileURL(join(dist,'src/routing/ecm-source.mjs')));
const built=await minifier.build({entryPoints:[join(dist,'src/site/mount.mjs')],bundle:true,minify:true,format:'esm',platform:'browser',target:'es2022',write:false,logLevel:'silent'});
const bundle=built.outputFiles[0].contents,css=await readFile(join(dist,'tool.css'));
const html='<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="data:,"><link rel="stylesheet" href="/tool.css"><title>Local minified plugin regression</title><main><h1>素因数分解 ローカル検証</h1><div id="tool" class="bt-prime-factorizer"></div></main><script type="module" src="/boot.mjs"></script></html>';
const boot="import{mountSiteFactorizer}from'/tool.mjs';window.mount=()=>window.app=mountSiteFactorizer(document.querySelector('#tool'),{hints:{hardwareConcurrency:2,deviceMemory:2}});mount();";
const files=new Map([['/',html],['/boot.mjs',boot],['/tool.mjs',bundle],['/tool.css',css]]);
const server=createServer((req,res)=>{const b=files.get(req.url);if(!b){res.writeHead(404).end();return;}res.setHeader('Content-Security-Policy',"default-src 'none'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self'; worker-src blob:; connect-src 'none'; img-src data:; base-uri 'none'; form-action 'none'");res.setHeader('Content-Type',req.url==='/'?'text/html':req.url==='/tool.css'?'text/css':'text/javascript');res.end(b);});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
let browser,page;const cases=[],errors=[],network=[],input='11451419198101448524859159549219459514145142112';
const expected=[['2',5],['3',2],['19',1],['1051',1],['240677',1],['9082579814087837',1],['910891597356395779',1]];
const result={sourceRevisionContext:provenance.source.revision,manifestSha256:hash(await readFile(join(dist,'browser-tool.json'))),version:manifest.version,minifier:{name:tool.name,version:tool.version,license:tool.license},minifiedBundleSha256:hash(bundle),cases,errors,network};
await mkdir(dirname(out),{recursive:true});
try{
 browser=await pw.chromium.launch({headless:true,executablePath:resolve(process.env.CHROME_BIN),args:['--no-sandbox']});result.browser=browser.version();
 page=await browser.newPage({viewport:{width:390,height:844}});
 await page.addInitScript(()=>{
  window.m={created:0,terminated:0,active:0,urls:0,revoked:0,cancelTriggers:0,disposeTriggers:0};window.ecmPayloads=[];
  const W=Worker,C=URL.createObjectURL.bind(URL),R=URL.revokeObjectURL.bind(URL),seen=new Set();
  URL.createObjectURL=b=>{m.urls++;b.text().then(t=>{if(t.includes('ECM range/budget'))ecmPayloads.push(t);});return C(b);};
  URL.revokeObjectURL=u=>{if(!seen.has(u)){seen.add(u);m.revoked++;}return R(u);};
  window.Worker=class extends W{constructor(...a){super(...a);m.created++;m.active++;let retired=false;const term=this.terminate.bind(this),post=this.postMessage.bind(this);this.terminate=()=>{if(!retired){m.terminated++;m.active--;retired=true;}return term();};this.postMessage=(...a)=>{const r=post(...a);if(a[0]?.type==='start'&&window.interruptEcm){const action=window.interruptEcm;window.interruptEcm=null;queueMicrotask(()=>{if(action==='cancel'){m.cancelTriggers++;document.querySelector('[data-action=cancel]').click();}else{m.disposeTriggers++;window.app.dispose();}});}return r;};}};
 });
 page.on('pageerror',e=>errors.push(e.message));let ready=false;
 page.on('request',r=>{if(ready&&!r.url().startsWith('blob:'))network.push(r.url());});
 await page.goto('http://127.0.0.1:'+server.address().port);
 const phase=async value=>page.waitForFunction(v=>document.querySelector('#tool').dataset.phase===v,value,{timeout:6000});
 await phase('ready');ready=true;
 const run=async value=>{await page.getByLabel('0以上の整数',{exact:true}).fill(value);await page.locator('[data-action=start]').click();await phase('result');return page.evaluate(()=>app.getState());};
 const check=(s,value,factors)=>{
  assert.equal(s.view.status,'complete',s.view.reasonText||s.view.statusText);
  assert.equal(s.view.input,value);assert.deepEqual(s.view.groups.map(g=>[g.base,g.exponent]),factors);
  assert.ok(s.view.groups.every(g=>g.certainty==='proven'));
  assert.equal(s.view.groups.reduce((n,g)=>n*BigInt(g.base)**BigInt(g.exponent),1n),BigInt(value));
  assert.equal(s.resources.configuredPlan.timeBudgetMs,1000,'The actual default job cap stays1s');
 };
 for(const width of [390,1280]){
  await page.setViewportSize({width,height:844});
  const s=await run(input);check(s,input,expected);
  cases.push({id:'reported-input-'+width,status:s.view.status,trace:s.resources.trace,elapsedMs:s.resources.elapsedMs});
 }
 let s=await run('360');check(s,'360',[['2',3],['3',2],['5',1]]);cases.push({id:'small-control'});
 await page.evaluate(()=>{window.interruptEcm='cancel';});
 s=await run(input);assert.equal(s.view.status,'cancelled');assert.equal(await page.evaluate(()=>m.cancelTriggers),1);assert.equal(await page.evaluate(()=>m.active),0);cases.push({id:'cancel-active-ecm',status:s.view.status});
 s=await run(input);check(s,input,expected);cases.push({id:'fresh-after-cancel',status:s.view.status});
 await page.evaluate(()=>{window.interruptEcm='dispose';});
 await page.getByLabel('0以上の整数',{exact:true}).fill(input);await page.locator('[data-action=start]').click();
 await page.waitForFunction(()=>m.disposeTriggers===1&&m.active===0&&document.querySelector('#tool').textContent==='',undefined,{timeout:6000});cases.push({id:'unmount-active-ecm'});
 await page.evaluate(()=>window.mount());await phase('ready');s=await run('360');check(s,'360',[['2',3],['3',2],['5',1]]);cases.push({id:'fresh-mount'});
 const metrics=await page.evaluate(()=>m),sources=await page.evaluate(()=>ecmPayloads);
 assert.ok(sources.length>=4);
 result.workerPayloadSha256=[...new Set(sources.map(hash))];assert.deepEqual(result.workerPayloadSha256,[hash(ECM_WORKER_SOURCE)],'Host minification must preserve the exact ECM Worker payload');
 assert.equal(metrics.active,0);assert.equal(metrics.created,metrics.terminated);assert.equal(metrics.urls,metrics.revoked);assert.deepEqual(errors,[]);assert.deepEqual(network,[]);
 result.metrics=metrics;result.passed=true;
 await page.screenshot({path:out+'.png',fullPage:true});
}catch(error){result.passed=false;result.failure=String(error);if(page){result.state=await page.evaluate(()=>window.app?.getState()).catch(()=>null);result.metrics=await page.evaluate(()=>m).catch(()=>null);}throw error;
}finally{
 await writeFile(out,JSON.stringify(result,null,2)+'\n');await browser?.close();await new Promise(r=>server.close(r));
 console.log(JSON.stringify({passed:result.passed,cases:cases.length,source:result.sourceRevisionContext,metrics:result.metrics,failure:result.failure}));
}

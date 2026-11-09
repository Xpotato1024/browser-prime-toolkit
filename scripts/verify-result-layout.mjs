// SPDX-License-Identifier: AGPL-3.0-only
// Uses separately supplied browser tooling; it is not an application dependency.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,join,extname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createServer} from 'node:http';
const arg=k=>resolve(process.argv[process.argv.indexOf(k)+1]);
assert.ok(process.argv.includes('--dist')&&process.argv.includes('--out'));
assert.ok(process.env.PLAYWRIGHT_MODULE&&process.env.CHROME_BIN);
const dist=arg('--dist'),out=arg('--out'),pw=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE));
await mkdir(out,{recursive:true});
const html='<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="data:,"><link rel="stylesheet" href="/tool.css"><style>*{box-sizing:border-box;border:0 solid}body{margin:0;padding:16px;background:#faf9f6;color:#24212b}main{max-width:760px;margin:auto}h1{font:600 1.5rem system-ui}</style><title>素因数分解 表示検証</title><main><h1>素因数分解</h1><div id="tool" class="bt-prime-factorizer"></div></main><script type="module">import{mountSiteFactorizer}from"/src/site/mount.mjs";window.app=mountSiteFactorizer(document.querySelector("#tool"));</script></html>';
const server=createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost');if(url.pathname==='/'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);return;}const p=resolve(dist,'.'+decodeURIComponent(url.pathname));if(!p.startsWith(dist+'/'))throw Error('path');res.setHeader('Content-Type',extname(p)==='.css'?'text/css':'text/javascript');res.end(await readFile(p));}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
let browser;const report={passed:false,cases:[],errors:[],source:JSON.parse(await readFile(join(dist,'artifact-provenance.json'))).source.revision};
try{
 browser=await pw.chromium.launch({headless:true,executablePath:process.env.CHROME_BIN,args:['--no-sandbox']});report.browser=browser.version();
 const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true});page.on('pageerror',e=>report.errors.push(e.message));
 await page.addInitScript(()=>{Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async t=>{window.copied=t;}}});});
 await page.goto('http://127.0.0.1:'+server.address().port);
 const phase=value=>page.waitForFunction(v=>document.querySelector('#tool').dataset.phase===v,value,{timeout:10000});await phase('ready');
 const run=async value=>{await page.getByLabel('0以上の整数',{exact:true}).fill(value);await page.getByRole('button',{name:'分解する',exact:true}).click();await phase('result');};
 const copy=page.getByRole('button',{name:'結果をコピー',exact:true});
 for(const width of [320,390,1280]){
  await page.setViewportSize({width,height:900});await run('1e308');
  const layout=await page.evaluate(()=>{const b=document.querySelector('[data-action=copy]'),e=document.querySelector('.bt-equation'),f=document.querySelector('.bt-equation-frame'),br=b.getBoundingClientRect(),er=e.getBoundingClientRect(),fr=f.getBoundingClientRect();return{buttonCount:document.querySelectorAll('[data-action=copy]').length,width:br.width,height:br.height,contained:br.left>=fr.left&&br.right<=fr.right,overlap:er.right>br.left,overflow:document.documentElement.scrollWidth>innerWidth,text:b.textContent,title:b.title};});
  assert.equal(layout.buttonCount,1);assert.ok(layout.width>=44&&layout.height>=44);assert.ok(layout.contained);assert.equal(layout.overlap,false);assert.equal(layout.overflow,false);assert.equal(layout.text,'');assert.equal(layout.title,'結果をコピー');
  await copy.tap();assert.match(await page.locator('.bt-copy-status').innerText(),/コピーしました/);assert.match(await page.evaluate(()=>copied),/2\^308.*5\^308/);report.cases.push({id:'long-result-'+width,layout});
  await page.screenshot({path:join(out,'result-'+width+'.png'),fullPage:true});
 }
 await page.setViewportSize({width:640,height:1200});await page.evaluate(()=>document.documentElement.style.zoom='2');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await copy.focus();await page.keyboard.press('Enter');assert.match(await page.locator('.bt-copy-status').innerText(),/コピーしました/);
 assert.ok(await copy.evaluate(n=>getComputedStyle(n).outlineStyle!=='none'));report.cases.push({id:'200-percent-reflow-keyboard'});
 await page.screenshot({path:join(out,'result-200-percent.png'),fullPage:true});await page.evaluate(()=>document.documentElement.style.zoom='');
 await page.setViewportSize({width:390,height:844});await run('360');
 await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{value:{writeText:async()=>{throw Error('test denial');}}}));
 await copy.click();assert.match(await page.locator('.bt-copy-status').innerText(),/手動でコピー/);
 assert.ok(await page.locator('.bt-proof').evaluate(n=>n.open));assert.equal(await page.evaluate(()=>document.activeElement.className),'bt-result-body');
 assert.match(await page.evaluate(()=>getSelection().toString()),/360 = 2\^3.*3\^2.*5/s);report.cases.push({id:'copy-denial-selects-full-result'});
 await page.locator('.bt-execution summary').click();assert.ok(await page.locator('.bt-execution').evaluate(n=>n.open));
 await page.locator('.bt-limits summary').click();await page.locator('.bt-result-help summary').click();
 assert.equal(await page.locator('.bt-help-area details[open]').count(),2);assert.equal(await page.locator('.bt-result-details > details').count(),2);
 assert.match(await page.locator('.bt-result-help').innerText(),/最初からの計算/);report.cases.push({id:'independent-result-and-help-disclosures'});
 await page.screenshot({path:join(out,'expanded-mobile.png'),fullPage:true});
 await run('64');assert.equal(await page.locator('.bt-copy-status').isVisible(),false);assert.equal(await copy.count(),1);
 assert.equal(await page.locator('.bt-equation').innerText(),'64 = 2^6');report.cases.push({id:'new-result-clears-copy-status'});
 assert.deepEqual(report.errors,[]);report.passed=true;
}finally{await writeFile(join(out,'acceptance.json'),JSON.stringify(report,null,2)+'\n');await browser?.close();await new Promise(r=>server.close(r));console.log(JSON.stringify(report));}

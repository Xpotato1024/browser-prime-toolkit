// SPDX-License-Identifier: AGPL-3.0-only
// CSS API browser fixture, not an engine integration test.
import assert from 'node:assert/strict';
import {assertCiArguments} from './chrome-ci-transform.mjs';
assertCiArguments(process.argv.slice(2),{args:{'--out':'path'}});
import {readFile,writeFile,mkdir,mkdtemp} from 'node:fs/promises';
import {resolve,dirname,join} from 'node:path';
import {tmpdir} from 'node:os';
import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {createCiBrowserLifecycle} from './chrome-ci-lifecycle.mjs';
const output=resolve(process.argv[process.argv.indexOf('--out')+1]);
await mkdir(dirname(output),{recursive:true});
const css=await readFile(new URL('../src/site/tool.css',import.meta.url),'utf8');
let child,socket,server,session,sequence=0; const pending=new Map();
const profile=await mkdtemp(join(tmpdir(),'prime-progress-'));
const ciChrome=createCiBrowserLifecycle({getChrome:()=>child,getSocket:()=>socket,getServer:()=>server,getSession:()=>session,pending,nextId:()=>++sequence,timeoutForMethod:()=>10000,profile});
const send=(method,params={},sid=session)=>ciChrome.send(method,params,sid);
async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});assert.ok(!r.exceptionDetails,JSON.stringify(r.exceptionDetails));return r.result.value;}
const luminance=rgb=>rgb.match(/\d+/g).map(Number).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
const report={scope:'Actual source CSS with semantic fixture; no engine, release or real iOS validation',cases:[]};
try{
 server=createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><style>body{margin:16px}*{box-sizing:border-box} ${css}</style><main class="bt-prime-factorizer"><div class="bt-field"><label for="number">整数</label><div class="bt-input-area"><input id="number"></div></div><div class="bt-field"><label for="mode">モード</label><select id="mode"><option>通常</option></select></div><button type="button">設定</button><details><summary>入力の説明と計算結果の読み方</summary><p>展開した説明。長い文章も折り返します。</p></details><div class="bt-help-area">説明</div></main>`);});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 child=spawn(process.env.CHROME_BIN||'google-chrome',['--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-background-networking','--no-first-run','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{detached:true,stdio:['ignore','ignore','pipe'],windowsHide:true});
 ciChrome.observe({timeoutMs:15000});socket=new WebSocket(await ciChrome.ready());await ciChrome.connect(socket);
 socket.addEventListener('message',({data})=>{const m=JSON.parse(String(data)),p=pending.get(m.id);if(p){clearTimeout(p.timer);pending.delete(m.id);m.error?p.reject(Error(m.error.message)):p.resolve(m.result);}});
 report.browser=await send('Browser.getVersion',{},null);
 const {targetId}=await send('Target.createTarget',{url:'about:blank'},null);session=(await send('Target.attachToTarget',{targetId,flatten:true},null)).sessionId;
 await send('Page.enable');await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/'});
 for(let n=0;n<100&&!await evaluate('!!document.querySelector("summary")');n++) await new Promise(r=>setTimeout(r,50));
 for(const width of [320,1440]) for(const scale of [1,2]) for(const mode of ['standalone','legacy','roles']){
  await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});
  await evaluate(`document.documentElement.style.fontSize='${16*scale}px';document.querySelector('main').style.cssText=${JSON.stringify(mode==='legacy'?'--bt-border:#334455':mode==='roles'?'--bt-border:#334455;--bt-border-control:#625e6e;--bt-border-divider:#d8d4dc;--bt-summary-padding-block:.7rem':'')};document.querySelector('details').open=false;document.querySelector('summary').focus()`);
  const actual=await evaluate(`(()=>{const s=document.querySelector('summary'),c=getComputedStyle(s),control=getComputedStyle(document.querySelector('.bt-input-area')),divider=getComputedStyle(document.querySelector('details'));return{control:control.borderTopColor,divider:divider.borderTopColor,padding:parseFloat(c.paddingTop),height:s.getBoundingClientRect().height,overflow:document.documentElement.scrollWidth>innerWidth+1}})()`);
  assert.equal(actual.control,mode==='roles'?'rgb(98, 94, 110)':mode==='legacy'?'rgb(51, 68, 85)':'rgb(115, 106, 123)');
  assert.equal(actual.divider,mode==='roles'?'rgb(216, 212, 220)':mode==='legacy'?'rgb(51, 68, 85)':'rgb(115, 106, 123)');
  assert.ok(Math.abs(actual.padding-(mode==='roles'?.7:.55)*16*scale)<.02);assert.ok(actual.height>=44);assert.equal(actual.overflow,false);actual.controlContrast=1.05/(luminance(actual.control)+.05);assert.ok(actual.controlContrast>=3);assert.equal(await evaluate('getComputedStyle(document.querySelector("summary")).outlineStyle'),'solid');
  for(const open of [true,false]){await send('Input.dispatchKeyEvent',{type:'keyDown',text:'\r',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});for(let n=0;n<20&&await evaluate('document.querySelector("details").open')!==open;n++) await new Promise(r=>setTimeout(r,25));assert.equal(await evaluate('document.querySelector("details").open'),open);}
  const {data}=await send('Page.captureScreenshot',{format:'png'});await writeFile(join(dirname(output),`${mode}-${width}-${scale}.png`),Buffer.from(data,'base64'));
  report.cases.push({mode,width,scale,...actual});
 }
 await send('Emulation.setEmulatedMedia',{features:[{name:'forced-colors',value:'active'}]});assert.equal(await evaluate('getComputedStyle(document.querySelector("summary")).forcedColorAdjust'),'auto');
 report.pass=true;
}catch(error){ciChrome.noteFailure(error);report.pass=false;report.failure=String(error.stack);process.exitCode=1;}
finally{try{await ciChrome.cleanup();}catch(error){report.pass=false;report.failure=String(error.stack);process.exitCode=1;}await writeFile(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));}

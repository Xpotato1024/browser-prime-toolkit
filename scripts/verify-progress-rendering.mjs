// SPDX-License-Identifier: AGPL-3.0-only
// Real Chromium/Edge pixels: no runtime or test dependencies are added.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir,mkdtemp,rm} from 'node:fs/promises';
import {resolve,join,dirname,sep} from 'node:path';
import {tmpdir} from 'node:os';
import {spawn} from 'node:child_process';
import {inflateSync} from 'node:zlib';
import {createHash} from 'node:crypto';

const root=resolve(import.meta.dirname,'..');
const at=process.argv.indexOf('--out');
assert.ok(at>=0&&process.argv[at+1],'Supply --out <new report.json>');
const output=resolve(process.argv[at+1]);
await mkdir(dirname(output),{recursive:true});
const profile=await mkdtemp(join(tmpdir(),'prime-progress-'));
const report={scope:'Actual createProgressView and CSS; synthetic state snapshots, not engine integration',cases:[]};
let child,socket,server,session,sequence=0;
const pending=new Map();
function send(method,params={},sessionId=session){return new Promise((yes,no)=>{
 const id=++sequence,timer=setTimeout(()=>{pending.delete(id);no(Error('CDP timeout: '+method));},10000);
 pending.set(id,{yes,no,timer});socket.send(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})}));
});}
async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});assert.ok(!r.exceptionDetails,JSON.stringify(r.exceptionDetails));return r.result.value;}
// Decode only the browser's bounded 8-bit RGB/RGBA screenshot; reject other formats.
function centerPixel(bytes){
 assert.deepEqual([...bytes.subarray(0,8)],[137,80,78,71,13,10,26,10]);
 let pos=8,width,height,channels;const data=[];
 while(pos<bytes.length){const len=bytes.readUInt32BE(pos),type=bytes.toString('ascii',pos+4,pos+8),d=bytes.subarray(pos+8,pos+8+len);
  if(type==='IHDR'){width=d.readUInt32BE(0);height=d.readUInt32BE(4);assert.equal(d[8],8);assert.equal(d[12],0);channels=d[9]===2?3:d[9]===6?4:0;assert.ok(channels);}
  if(type==='IDAT')data.push(d);pos+=len+12;
 }
 assert.ok(width>0&&height>0&&width<=4096&&height<=256);
 const stride=width*channels,raw=inflateSync(Buffer.concat(data),{maxOutputLength:(stride+1)*height});
 assert.equal(raw.length,(stride+1)*height);const pixels=Buffer.alloc(stride*height);
 for(let y=0;y<height;y++){const filter=raw[y*(stride+1)];assert.ok(filter<=4);
  for(let x=0;x<stride;x++){const left=x>=channels?pixels[y*stride+x-channels]:0,up=y?pixels[(y-1)*stride+x]:0,ul=y&&x>=channels?pixels[(y-1)*stride+x-channels]:0;
   let predictor=0;if(filter===1)predictor=left;if(filter===2)predictor=up;if(filter===3)predictor=Math.floor((left+up)/2);
   if(filter===4){const p=left+up-ul,a=Math.abs(p-left),b=Math.abs(p-up),c=Math.abs(p-ul);predictor=a<=b&&a<=c?left:b<=c?up:ul;}
   pixels[y*stride+x]=(raw[y*(stride+1)+x+1]+predictor)&255;
  }
 }
 const start=(Math.floor(height/2)*width+Math.floor(width/4))*channels;
 return [...pixels.subarray(start,start+3)];
}
try{
 const css=await readFile(join(root,'src/site/tool.css'),'utf8');
 report.cssSha256=createHash('sha256').update(css).digest('hex');
 const fixture=`import {createProgressView} from '/progress-view.js';
 const v=createProgressView(document,'pixel-');document.querySelector('#tool').append(v.root);
 window.draw=(snapshot)=>{v.update(snapshot);return true;};window.ready=true;`;
 server=createServer(async(req,res)=>{try{
  const p=new URL(req.url,'http://localhost').pathname;let body,type;
  if(p==='/'){body='<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="/host.css"><link rel="stylesheet" href="/tool.css"><div id="tool" class="bt-prime-factorizer"></div><progress id="reference" max="1" value="1" style="border:revert;display:block;width:100%;height:.65rem"></progress><script type="module" src="/fixture.mjs"></script>';type='text/html';}
  else if(p==='/tool.css'){body=css;type='text/css';}
  else if(p==='/host.css'){body='body{margin:16px}html[data-reset] *,html[data-reset] ::before,html[data-reset] ::after{box-sizing:border-box;border:0 solid;margin:0;padding:0}html[data-reset] #tool{--bt-accent:#745399}';type='text/css';}
  else if(p==='/fixture.mjs'){body=fixture;type='text/javascript';}
  else if(p==='/progress-view.js'){body=await readFile(join(root,'src/site/progress-view.js'));type='text/javascript';}
  else{res.writeHead(404).end();return;}
  res.writeHead(200,{'Content-Type':type+'; charset=utf-8','Cache-Control':'no-store'});res.end(body);
 }catch(e){res.writeHead(500).end(String(e));}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 child=spawn(process.env.CHROME_BIN||'google-chrome',['--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-background-networking','--no-first-run','--force-color-profile=srgb','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{stdio:['ignore','ignore','pipe'],windowsHide:true});
 const url=await new Promise((yes,no)=>{let text='';const timer=setTimeout(()=>no(Error('Browser startup timeout: '+text.slice(-1000))),15000);
  child.once('error',e=>{clearTimeout(timer);no(e);});child.once('exit',c=>{clearTimeout(timer);no(Error('Browser exited '+c));});
  child.stderr.on('data',b=>{text=(text+b).slice(-10000);const m=/DevTools listening on (ws:\/\/\S+)/.exec(text);if(m){clearTimeout(timer);yes(m[1]);}});
 });
 socket=new WebSocket(url);await new Promise((yes,no)=>{socket.addEventListener('open',yes,{once:true});socket.addEventListener('error',no,{once:true});});
 socket.addEventListener('message',({data})=>{const m=JSON.parse(String(data)),p=pending.get(m.id);if(p){clearTimeout(p.timer);pending.delete(m.id);m.error?p.no(Error(m.error.message)):p.yes(m.result);}});
 report.browser=await send('Browser.getVersion',{},null);
 const {targetId}=await send('Target.createTarget',{url:'about:blank'},null);session=(await send('Target.attachToTarget',{targetId,flatten:true},null)).sessionId;
 await send('Page.enable');await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/'});
 for(let n=0;n<100&&!await evaluate('!!window.ready');n++)await new Promise(r=>setTimeout(r,50));
 assert.equal(await evaluate('!!window.ready'),true);
 async function capture(name,selector='progress'){
  const info=await evaluate(`(()=>{const n=document.querySelector(${JSON.stringify(selector)}),c=getComputedStyle(n),r=n.getBoundingClientRect();return{tag:n.tagName,value:n.value,complete:n.dataset.complete,accent:c.accentColor,appearance:c.appearance,forcedColorAdjust:c.forcedColorAdjust,forced:matchMedia('(forced-colors:active)').matches,label:n.getAttribute('aria-label')||n.getAttribute('aria-labelledby'),clip:{x:r.x,y:r.y,width:r.width,height:r.height,scale:1}}})()`);
  const {data}=await send('Page.captureScreenshot',{format:'png',clip:info.clip});const bytes=Buffer.from(data,'base64');
  await writeFile(join(dirname(output),name+'.png'),bytes);delete info.clip;info.pixel=centerPixel(bytes);const record={name,...info};report.cases.push(record);return record;
 }
 const complete={stage:'settled',completedNormally:true,resultStatus:'complete'},probable={...complete,resultStatus:'probable'};
 for(const width of [320,1200]){
  await send('Emulation.setDeviceMetricsOverride',{width,height:600,deviceScaleFactor:1,mobile:false});
  for(const reset of [false,true]){
   await evaluate(`document.documentElement.toggleAttribute('data-reset',${reset})`);
   const expected=reset?[116,83,153]:[98,65,139],prefix=(reset?'host':'standalone')+'-'+width;
   for(const [name,snapshot] of [['complete',complete],['probable',probable]]){
    await evaluate('draw('+JSON.stringify(snapshot)+')');const c=await capture(prefix+'-'+name);assert.deepEqual(c.pixel,expected,c.name+' must paint purple');assert.equal(c.value,1);assert.equal(c.complete,'true');assert.equal(c.tag,'PROGRESS');assert.ok(c.label);
   }
   for(const [name,snapshot] of [['cancelled',{stage:'settled',completedNormally:false,resultStatus:'cancelled'}],['timeout',{stage:'settled',completedNormally:false,resultStatus:'incomplete'}],['new-input',null]]){
    await evaluate('draw('+JSON.stringify(snapshot)+')');const c=await capture(prefix+'-'+name);assert.equal(c.value,0);assert.equal(c.complete,'false');assert.notDeepEqual(c.pixel,expected,'Empty track must not look complete');
   }
  }
 }
 await evaluate('document.documentElement.setAttribute("data-reset","");draw('+JSON.stringify(complete)+')');
 await send('Emulation.setEmulatedMedia',{features:[{name:'forced-colors',value:'active'}]});
 const reference=await capture('forced-native-reference','#reference'),forced=await capture('forced-complete');
 assert.equal(forced.forced,true);assert.equal(forced.forcedColorAdjust,'auto');assert.deepEqual(forced.pixel,reference.pixel,'Forced colors must match an unbranded native progress control');assert.notDeepEqual(forced.pixel,[116,83,153]);
 report.pass=true;
}catch(e){report.pass=false;report.failure=String(e.stack);process.exitCode=1;}
finally{
 if(socket?.readyState===WebSocket.OPEN){await send('Browser.close',{},null).catch(()=>{});socket.close();}
 if(child&&child.exitCode===null)await new Promise(r=>{const timer=setTimeout(()=>{child.kill();r();},3000);child.once('exit',()=>{clearTimeout(timer);r();});});
 for(const p of pending.values()){clearTimeout(p.timer);p.no(Error('Browser closed'));}pending.clear();
 if(server)await new Promise(r=>server.close(r));
 assert.ok(profile.startsWith(resolve(tmpdir())+sep+'prime-progress-'));await rm(profile,{recursive:true,force:true});
 await writeFile(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({pass:report.pass,browser:report.browser?.product,cases:report.cases.length,failure:report.failure}));
}

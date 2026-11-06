// SPDX-License-Identifier: AGPL-3.0-only
import test from 'node:test';
import assert from 'node:assert/strict';
import childProcess from 'node:child_process';
import {syncBuiltinESMExports} from 'node:module';
import {createServer} from 'node:http';
import {mkdtemp,writeFile,readFile,rm,access} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

import {deriveBrowserCi,browserOriginalSha256} from '../scripts/generate-browser-ci.mjs';
import {createHash} from 'node:crypto';
const self=fileURLToPath(import.meta.url),mode=process.env.PRIME_BROWSER_FIXTURE_MODE;
const role=process.env.PRIME_BROWSER_FIXTURE_ROLE;
if(role==='chrome'){
 const profile=process.argv.find(a=>a.startsWith('--user-data-dir=')).slice('--user-data-dir='.length);
 await writeFile(process.env.PRIME_BROWSER_FIXTURE_RECORD,JSON.stringify({pid:process.pid,profile}));
 if(mode==='exit')process.exit(7);
 const path='/devtools/browser/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
 const server=createServer((req,res)=>res.end(JSON.stringify({webSocketDebuggerUrl:'ws://127.0.0.1:'+server.address().port+path})));
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 if(mode!=='no-port'){
  if(mode==='slow')await new Promise(r=>setTimeout(r,150));
  await writeFile(join(profile,'DevToolsActivePort'),server.address().port+'\n'+path+'\n');
  // Split capability-bearing stderr to exercise redaction in the consumer.
  if(mode!=='bannerless'){process.stderr.write('DevTools listening on ws://127.0.0.1:');process.stderr.write(server.address().port+path+'\n');}
 }
}else if(role==='preload'){
 const spawn=childProcess.spawn;
 childProcess.spawn=(command,args,options)=>spawn(mode==='spawn-error'?'/missing/prime-fixture-chrome':process.execPath,
  mode==='spawn-error'?args:[self,...args],{...options,env:{...options.env,PRIME_BROWSER_FIXTURE_ROLE:'chrome'}});
 syncBuiltinESMExports();
 globalThis.WebSocket=class extends EventTarget{
  static OPEN=1;readyState=0;
  constructor(){
   super();
   setImmediate(()=>{
    if(mode==='never-open')return;
    if(mode==='open-error'){this.dispatchEvent(new Event('error'));return;}
    this.readyState=1;this.dispatchEvent(new Event('open'));
   });
  }
  send(value){
   const {id,method}=JSON.parse(value);
   if(mode==='send-error')throw Error('fixture send failed');
   if(mode==='transport-error'||mode==='transport-close'){
    queueMicrotask(()=>{if(mode==='transport-close')this.readyState=3;this.dispatchEvent(new Event(mode==='transport-error'?'error':'close'));});
    return;
   }
   if(mode==='diagnostic-stall'&&method==='Runtime.evaluate')return;
   const result=method==='Browser.getVersion'?{product:'Fixture Chrome'}:
    method==='Target.createTarget'?{targetId:'target'}:method==='Target.attachToTarget'?{sessionId:'page'}:
    method==='Runtime.evaluate'?{result:{value:{phase:'fixture'}}}:{};
   const message=method==='Page.navigate'?{id,error:{message:'fixture stopped after attach'}}:{id,result};
   queueMicrotask(()=>this.dispatchEvent(new MessageEvent('message',{data:JSON.stringify(message)})));
  }
  close(){this.readyState=3;this.dispatchEvent(new Event('close'));}
 };
}else{
 async function run(t,fixtureMode){
  const directory=await mkdtemp(join(tmpdir(),'prime-browser-consumer-test-')),record=join(directory,'owned.json');
  const started=performance.now();let fixture,output='';
  const child=childProcess.spawn(process.execPath,['--import',self,resolve('scripts/verify-browser-ci.mjs'),'--quick','--advanced'],
   {env:{...process.env,PRIME_BROWSER_FIXTURE_ROLE:'preload',PRIME_BROWSER_FIXTURE_MODE:fixtureMode,PRIME_BROWSER_FIXTURE_RECORD:record},stdio:['ignore','pipe','pipe']});
  const cleanup=async()=>{
   try{fixture=JSON.parse(await readFile(record,'utf8'));}catch{}
   if(fixture){try{process.kill(fixture.pid,'SIGKILL');}catch{}}
   if(child.exitCode===null)child.kill('SIGKILL');
   if(fixture)await rm(fixture.profile,{recursive:true,force:true});
   await rm(directory,{recursive:true,force:true});
  };
  t.after(cleanup);
  child.stdout.on('data',b=>output+=b);child.stderr.on('data',b=>output+=b);
  const code=await new Promise((res,rej)=>{
   const timer=setTimeout(()=>{child.kill('SIGKILL');rej(Error('Fixture harness exceeded 25s'));},25000);
   child.once('error',e=>{clearTimeout(timer);rej(e);});
   child.once('exit',c=>{clearTimeout(timer);res(c);});
  });
  assert.equal(code,1,output); // Deliberate fixture error, never a numeric acceptance substitute.
  assert.ok(!output.includes('ws://')&&!output.includes('/devtools/browser/')&&!output.includes('aaaaaaaa'),output);
  const report=output.split('\n').filter(line=>line.startsWith('{')).map(line=>JSON.parse(line)).find(value=>'fatal' in value);
  assert.ok(report,output);
  assert.deepEqual(report.pending,[],output);
  assert.ok(!output.includes('UnhandledPromiseRejection'),output);
  try{fixture=JSON.parse(await readFile(record,'utf8'));}catch{}
  if(fixture){
   await assert.rejects(access(fixture.profile),e=>e.code==='ENOENT');
   assert.throws(()=>process.kill(fixture.pid,0),e=>e.code==='ESRCH');
  }
  return {report,output,elapsedMs:performance.now()-started};
 }
 test('CI adapter regenerates exactly from the preserved browser comparison driver',async()=>{
  const original=await readFile('scripts/benchmark-browser.mjs','utf8');
  assert.equal(createHash('sha256').update(original).digest('hex'),browserOriginalSha256);
  assert.equal(deriveBrowserCi(original),await readFile('scripts/verify-browser-ci.mjs','utf8'));
 });
 test('CI derivation rejects changed or already hardened historical input',async()=>{
  const original=await readFile('scripts/benchmark-browser.mjs','utf8');
  assert.throws(()=>deriveBrowserCi(original+'\n'),/byte-for-byte/);
  assert.throws(()=>deriveBrowserCi(deriveBrowserCi(original)),/byte-for-byte/);
 });
 test('browser harness reaches owned bannerless CDP without stderr authorization',async t=>{
  const {report}=await run(t,'bannerless');
  assert.equal(report.chromeStartup.state,'ready');assert.equal(report.chromeStartup.bannerSeen,false);assert.equal(report.diagnostic.phase,'fixture');
 });
 test('slow owned startup is accepted within the original deadline',async t=>{
  const {report}=await run(t,'slow');assert.equal(report.chromeStartup.state,'ready');
 });
 for(const [mode,state] of [['exit','exited'],['spawn-error','spawn-error'],['no-port','timeout'],['never-open','ready'],['open-error','ready']]){
  test('browser startup '+mode+' cleans its pending calls, process and profile',async t=>{
   const {report}=await run(t,mode);assert.equal(report.chromeStartup.state,state);
   assert.equal(report.diagnostic,undefined);
  });
 }
 for(const mode of ['send-error','transport-error','transport-close']){
  test('browser '+mode+' rejects active calls without diagnostic leftovers',async t=>{
   const {report}=await run(t,mode);assert.equal(report.chromeStartup.state,'ready');assert.equal(report.diagnostic,undefined);
  });
 }
 test('connected failure diagnostics have a separate finite one-second request',async t=>{
  const {report,elapsedMs}=await run(t,'diagnostic-stall');assert.equal(report.chromeStartup.state,'ready');
  assert.ok(elapsedMs<10000,'diagnostic must not consume the normal 65-second evaluation timeout');
 });
}

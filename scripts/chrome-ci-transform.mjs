// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

export function assertCiArguments(argv,entry){
 const seen=new Map();
 for(let i=0;i<argv.length;i++){
  const key=argv[i],rule=entry.args[key];
  assert.ok(Object.hasOwn(entry.args,key),'CI-only argument not allowed: '+key);
  assert.ok(!seen.has(key),'Duplicate CI argument: '+key);
  const value=rule===true?true:argv[++i];
  assert.ok(value!==undefined&&value!==''&&!String(value).startsWith('--'),'Missing CI argument: '+key);
  if(Array.isArray(rule))assert.ok(rule.includes(value),'CI argument outside contract profile: '+key);
  seen.set(key,value);
 }
 for(const [key,value]of Object.entries(entry.required??{}))assert.equal(seen.get(key),value,'Required CI profile: '+key);
 if(seen.has('--case')){
  assert.ok(entry.fixedCase,'CI adapters cannot run measurement campaigns');
  for(const[key,value]of Object.entries(entry.fixedCase))assert.equal(seen.get(key),value,'Fixed functional CI case: '+key);
 }
}
export function deriveChromeCi(original,entry){
 assert.equal(createHash('sha256').update(original).digest('hex'),entry.sha256,'Historical driver must remain byte-for-byte unchanged: '+entry.original);
 return transformChromeLifecycle(original,entry);
}
export function transformChromeLifecycle(original,entry){
 let source=original;
 const replace=(from,to)=>{assert.equal(source.split(from).length,2,'Unique CI lifecycle anchor: '+from.slice(0,90));source=source.replace(from,to);};
 const replaceRange=(from,to,text)=>{
  const start=source.indexOf(from),end=source.indexOf(to,start);
  assert.ok(start>=0&&end>start,'CI lifecycle range: '+from);source=source.slice(0,start)+text+source.slice(end);
 };
 const guard=JSON.stringify({args:entry.args,required:entry.required,fixedCase:entry.fixedCase});
 source="import {createCiBrowserLifecycle,ciHarnessIdentity} from './chrome-ci-lifecycle.mjs';\nimport {assertCiArguments} from './chrome-ci-transform.mjs';\nassertCiArguments(process.argv.slice(2),"+guard+");\n"+source;
 const sender=source.slice(source.indexOf('const send = '),source.indexOf('const evaluate = '));
 const timeout=/rejectCall\(Error\('CDP timeout: ' \+ method\)\); \}, (.+)\);/.exec(sender)?.[1];
 assert.ok(timeout,'Exact historical CDP method budget');
 const long=source.includes('await cleanupLongHarness({');
 const watchdog=source.includes('hardTimer');
 const init="const ciHarness=ciHarnessIdentity(import.meta.url,"+JSON.stringify(entry.original)+","+JSON.stringify(entry.sha256)+","+JSON.stringify(entry.producer??"scripts/generate-chrome-ci.mjs")+");\n"+
  "const ciChrome=createCiBrowserLifecycle({getChrome:()=>chrome,getSocket:()=>socket,getMemory:()=>memory,getServer:()=>server,getSession:()=>pageSession,pending,nextId:()=>++sequence,timeoutForMethod:method=>"+timeout+",profile:temporary"+(watchdog?",getWatchdog:()=>hardTimer":"")+(long?",retire:()=>retireChrome()":"")+"});\n";
 replace('const send = ',init+'const send = ');
 replaceRange('const send = ','const evaluate = ','const send=(method,params={},sessionId)=>ciChrome.send(method,params,sessionId);\n');
 const spawnStart=source.indexOf('  chrome = spawn('),spawnEnd=source.indexOf('windowsHide: true });',spawnStart)+'windowsHide: true });'.length;
 assert.ok(spawnStart>=0&&spawnEnd>spawnStart,'Exact Chrome spawn boundary');
 const spawn=source.slice(spawnStart,spawnEnd);
 assert.ok(spawn.includes("'--remote-debugging-port=0'")&&spawn.includes("'--user-data-dir=' + temporary"));
 if(!/detached:\s*true/.test(spawn))replace(spawn,spawn.replace('{ stdio:','{ detached:true, stdio:'));
 const readyStart=source.indexOf('  const debuggingUrl = await new Promise('),readyEnd=source.indexOf("  socket.addEventListener('message'",readyStart);
 assert.ok(readyStart>=0&&readyEnd>readyStart);
 const readiness=source.slice(readyStart,readyEnd);
 assert.match(readiness,new RegExp('stderr\\.slice\\(-1000\\)\\)\\), '+entry.startupTimeoutMs+'\\);'));
 source=source.slice(0,readyStart)+"  socket=new WebSocket(await ciChrome.ready());\n  await ciChrome.connect(socket);\n"+source.slice(readyEnd);
 replace('windowsHide: true });','windowsHide: true });\n  ciChrome.observe({timeoutMs:'+entry.startupTimeoutMs+'});');
 replace('await memory.start();','await ciChrome.setup(()=>memory.start());');
 const receipt=/  const receipt\s*=\s*\{/.exec(source)?.[0];assert.ok(receipt,'CI receipt boundary');
 replace(receipt,'  Object.assign(sourceFiles,ciHarness.sourceFiles);\n'+receipt+'ciExecution:{...ciHarness,chromeStartup:ciChrome.diagnostics()},');
 replace('diagnostic = await evaluate(','diagnostic = await ciChrome.diagnostic(');
 const caught=source.lastIndexOf('} catch (error) {');assert.ok(caught>source.indexOf('const receipt'),'Final failure boundary');
 const failureStart=caught+'} catch (error) {'.length;
 source=source.slice(0,failureStart)+'\n  ciChrome.noteFailure(error);\n  console.error(JSON.stringify({chromeStartup:ciChrome.diagnostics(),ciExecution:ciHarness}));'+source.slice(failureStart);
 if(source.includes("const failure={kind:'harness-failure',"))replace("const failure={kind:'harness-failure',","const failure={ciExecution:{...ciHarness,chromeStartup:ciChrome.diagnostics()},kind:'harness-failure',");
 const final=source.lastIndexOf('} finally {');
 assert.ok(final>source.indexOf('ciChrome.noteFailure'),'Final owned resource cleanup');
 source=source.slice(0,final)+'} finally {\n  await ciChrome.cleanup();\n}\n';
 assert.ok(!source.includes('DevTools listening on'),'No stderr-authorized readiness');
 return '// Generated CI-only lifecycle adapter. Historical measurement source and receipts remain frozen.\n'+source;
}

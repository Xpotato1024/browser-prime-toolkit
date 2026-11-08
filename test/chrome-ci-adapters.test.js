// SPDX-License-Identifier: AGPL-3.0-only
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {deriveChromeCi,assertCiArguments} from '../scripts/chrome-ci-transform.mjs';
const entries=JSON.parse(readFileSync(new URL('../scripts/chrome-ci-entries.json',import.meta.url)));
for(const entry of entries.filter(e=>!e.producer))test('exact frozen source, numerical body and bounded lifecycle: '+entry.original,()=>{
 const original=readFileSync(entry.original,'utf8'),actual=readFileSync(entry.target,'utf8');
 assert.equal(createHash('sha256').update(original).digest('hex'),entry.sha256);
 assert.equal(actual,deriveChromeCi(original,entry));
 assert.ok(actual.indexOf('ciChrome.observe({timeoutMs:'+entry.startupTimeoutMs+'})')<actual.indexOf('ciChrome.setup(()=>memory.start())'));
 assert.ok(!actual.includes('DevTools listening on'));assert.match(actual,/ciChrome.connect\(socket\)/);
 assert.match(actual,/ciExecution:/);assert.match(actual,/await ciChrome.cleanup\(\)/);
 const start='  const browser = await send(',end='} catch (error) {';
 const computational=s=>s.slice(s.indexOf(start),s.lastIndexOf(end)).replace(/  Object.assign\(sourceFiles,ciHarness.sourceFiles\);\n/,'').replace('ciExecution:{...ciHarness,chromeStartup:ciChrome.diagnostics()},','');
 assert.ok(original.includes(start));assert.equal(computational(actual),computational(original));
 assert.throws(()=>deriveChromeCi(original+'\n',entry),/Historical/);
 const syntax=spawnSync(process.execPath,['--check',entry.target],{encoding:'utf8',timeout:10000});
 assert.equal(syntax.status,0,syntax.stderr);
 assert.doesNotThrow(()=>assertCiArguments([...entry.smokeArgs,'--out','/tmp/result.json'],entry));
});
test('all adapters reject campaign modifiers, inherited keys, duplicate and unknown arguments',()=>{
 for(const e of entries){
  const args=e.smokeArgs??[];
  for(const extra of [['--budget-ms','600000'],['--seed','2'],['--case=RSA-100'],['constructor','x'],['toString','x'],['__proto__','x'],['--out','x','--out','y']])assert.throws(()=>assertCiArguments([...args,...extra],e),e.target);
  if(!e.fixedCase)assert.throws(()=>assertCiArguments([...args,'--case','RSA-100'],e),e.target);
 }
});
test('only the existing fixed-case functional CI exceptions are accepted',()=>{
 for(const e of entries.filter(e=>e.fixedCase)){
  const args=Object.entries(e.fixedCase).flat();
  assert.doesNotThrow(()=>assertCiArguments(args,e));
  assert.throws(()=>assertCiArguments(args.filter((_,i)=>i!==2&&i!==3),e));
  assert.throws(()=>assertCiArguments(args.map(x=>x==='RSA-100'?'RSA-129':x==='full-balanced-64-1'?'RSA-100':x),e));
 }
});
test('long watchdog and memory stop callbacks are retained without timeout changes',()=>{
 for(const e of entries.filter(e=>!e.producer)){
  const a=readFileSync(e.original,'utf8'),b=readFileSync(e.target,'utf8');
  for(const line of a.split('\n').filter(l=>l.includes('hardTimer=setTimeout')||l.includes('memory.onFailure=')||l.includes('memory.sample=async')))assert.ok(b.includes(line.replace('await memory.start();','await ciChrome.setup(()=>memory.start());')),e.target);
 }
});

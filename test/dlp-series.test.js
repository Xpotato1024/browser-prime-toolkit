// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Xpotato.net / Xpotato1024
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {assertLongStart,trialArguments,DLP_DATA_DIR} from '../scripts/dlp-series-contract.mjs';
const plan=JSON.parse(readFileSync(new URL('../bench/staged-dlp-plan.json',import.meta.url))),sha=b=>createHash('sha256').update(b).digest('hex');
function fixture(){
 const files=new Map([['core.js',Buffer.from('fixed source')]]),head='a'.repeat(40),planHash=sha(Buffer.from(JSON.stringify(plan)));
 const trials=plan.trials.map(t=>{const raw=DLP_DATA_DIR+'/'+t.id+'.json',log=DLP_DATA_DIR+'/'+t.id+'.log';
 const r={mode:'dlp-measurement',profile:t.profile,variant:t.workers===2?'two-drop':'one-drop',caseId:'RSA-100',seed:1,budgetMs:t.budgetMs,measuredHead:head,sourceFiles:{'core.js':sha(files.get('core.js'))}};
 files.set(raw,Buffer.from(JSON.stringify(r)));files.set(log,Buffer.from('trial log'));
 return{...t,args:trialArguments(t,'/fixture'),exitCode:0,signal:null,error:null,rawSha256:sha(files.get(raw)),logSha256:sha(files.get(log))};});
 const short={stage:'short',plan:plan.id,planSha256:planHash,measuredHead:head,completedAt:'2026-10-20T00:00:00Z',trials};
 const state={changedTracked:'',untracked:[DLP_DATA_DIR+'/short-run.json',...files.keys()].filter(p=>p.startsWith(DLP_DATA_DIR+'/'))};
 return{short,state,files,check(){return assertLongStart(short,plan,planHash,head,state,p=>files.get(p),'/fixture');}};
}
test('long starts only from all twelve bound successful short artifacts',()=>assert.doesNotThrow(()=>fixture().check()));
test('tracked changes, extra untracked code and altered raw/log/source fail before long compute',()=>{
 for(const target of ['tracked','untracked','raw','log','source']){
  const f=fixture();
  if(target==='tracked')f.state.changedTracked='src/runtime.js';
  if(target==='untracked')f.state.untracked.push('unreviewed.js');
  if(target==='source')f.files.set('core.js',Buffer.from('modified source'));
  if(target==='raw'||target==='log')f.files.set(DLP_DATA_DIR+'/'+plan.trials[0].id+'.'+(target==='raw'?'json':'log'),Buffer.from('modified'));
  assert.throws(()=>f.check(),target);
 }
});
test('wrong plan, incomplete/duplicate IDs or unsuccessful harness cannot enter long series',()=>{
 for(const target of ['plan','missing','duplicate','failed']){
  const f=fixture();if(target==='plan')f.short.planSha256='0'.repeat(64);
  if(target==='missing')f.short.trials.pop();
  if(target==='duplicate')f.short.trials[0]=f.short.trials[1];
  if(target==='failed')f.short.trials[0].exitCode=1;
  assert.throws(()=>f.check(),target);
 }
});

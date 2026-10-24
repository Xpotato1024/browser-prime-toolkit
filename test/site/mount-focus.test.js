import test from 'node:test';
import assert from 'node:assert/strict';
import {mountSiteFactorizer} from '../../src/site/mount.js';
import {selectValidatedStagedPlan} from '../../src/engine/staged-selected.js';
import {factorStaged} from '../../src/engine/staged-factor.js';
function fixture(){const doc={activeElement:null,focuses:[],scrolls:[]};class Element{
 constructor(tag){this.tagName=tag.toUpperCase();this.ownerDocument=doc;this.children=[];this.attrs={};this.events=new Map();this.dataset={};this.value='';this.style={};}
 setAttribute(k,v){this.attrs[k]=String(v);if(['id','value'].includes(k))this[k]=String(v);}
 append(...nodes){this.children.push(...nodes);if(this.tagName==='SELECT'&&!this.value)this.value=this.children[0]?.value??'';}
 replaceChildren(...nodes){this.children=[...nodes];}addEventListener(k,f){this.events.set(k,f);}removeEventListener(k){this.events.delete(k);}
 showModal(){this.open=true;}close(){this.open=false;}
 focus(options){doc.activeElement=this;doc.focuses.push({node:this,options});}scrollIntoView(options){doc.scrolls.push({node:this,options});}select(){this.selected=true;}fire(k,event={}){this.events.get(k)?.({preventDefault(){},...event});}
 }doc.createElement=tag=>new Element(tag);doc.createRange=()=>({selectNodeContents(n){this.node=n;}});doc.defaultView={setInterval,clearInterval,setTimeout,clearTimeout,addEventListener(){},removeEventListener(){},navigator:{},getSelection:()=>({removeAllRanges(){doc.selected=null;},addRange(r){doc.selected=r.node;}})};return {doc,root:new Element('div')};}
const nodes=root=>{const all=[];const visit=n=>{all.push(n);for(const c of n.children)visit(c);};visit(root);return all;};
const settle=async()=>{for(let i=0;i<20;i++)await Promise.resolve();};
const finished=input=>({...factorStaged(BigInt(input)),origin:'worker',traceAvailable:true});
async function setup(options={},f=fixture()){f.app=mountSiteFactorizer(f.root,{sessionOptions:{loadLight:async()=>({selectValidatedStagedPlan,runSelectedStagedRequest:async i=>finished(i)}),...options}});await settle();f.find=predicate=>nodes(f.root).find(predicate);f.action=name=>f.find(n=>n.attrs['data-action']===name);f.input=f.find(n=>n.tagName==='INPUT');f.form=f.find(n=>n.tagName==='FORM');return f;}

test('all examples only fill the common input, collapse and return focus to the one start action',async()=>{
 let runs=0;const f=await setup({loadLight:async()=>({selectValidatedStagedPlan,runSelectedStagedRequest:async i=>{runs++;return finished(i);}})});
 assert.equal(f.action('quick-example'),undefined);const samples=f.find(n=>n.attrs['class']==='bt-samples');
 for(const sample of nodes(f.root).filter(n=>'data-sample-value' in n.attrs)){f.action('examples').fire('click');sample.focus();sample.fire('click');assert.equal(f.input.value,sample.attrs['data-sample-value']);assert.equal(samples.open,false);assert.equal(f.doc.activeElement,f.action('start'));assert.equal(f.app.getState().phase,'ready');}
 assert.equal(runs,0);assert.equal(f.input.attrs.maxlength,undefined);const area=f.find(n=>n.attrs['class']==='bt-input-area'),limit=f.find(n=>n.attrs['class']==='bt-input-limit');assert.ok(area.children.includes(limit));assert.match(limit.textContent,/39.*2\^128/);assert.ok(f.input.attrs['aria-describedby'].includes(limit.id));f.app.dispose();
});

test('edited input is unexecuted and the previous result and copy remain bound to their original input',async()=>{
 const f=await setup();f.input.value='104729';f.form.fire('submit');await settle();f.input.value='32';f.input.fire('input');
 assert.match(f.find(n=>n.attrs['class']==='bt-result-title').textContent,/前回.*104729/);assert.match(f.find(n=>n.attrs['class']==='bt-draft-note').textContent,/未実行/);
 f.action('copy').fire('click');await settle();assert.equal(f.doc.selected,f.find(n=>n.attrs['class']==='bt-result-body'));assert.equal(f.find(n=>n.attrs['class']==='bt-equation').textContent,'104729 = 104729');
 f.form.fire('submit');await settle();assert.equal(f.find(n=>n.attrs['class']==='bt-result-title').textContent,'32 の結果');assert.equal(f.find(n=>n.attrs['class']==='bt-equation').textContent,'32 = 2^5');
 f.input.value='2.5';f.input.fire('input');f.form.fire('submit');await settle();assert.equal(f.app.getState().errorField,'input');assert.match(f.find(n=>n.attrs['class']==='bt-result-title').textContent,/前回.*32/);assert.equal(f.doc.activeElement,f.input);f.app.dispose();
});

test('settings edits mark previous output without replacing its measured duration or result',async()=>{
 const f=await setup();f.input.value='360';f.form.fire('submit');await settle();const elapsed=f.find(n=>'data-elapsed' in n.attrs).textContent,time=f.find(n=>n.id?.endsWith('-time'));f.action('settings').fire('click');time.value='5000';time.fire('change');assert.equal(f.find(n=>n.attrs['class']==='bt-result-title').textContent,'360 の結果');f.action('apply-settings').fire('click');await settle();assert.match(f.find(n=>n.attrs['class']==='bt-result-title').textContent,/前回.*360/);assert.equal(f.find(n=>'data-elapsed' in n.attrs).textContent,elapsed);assert.match(f.find(n=>n.attrs['class']==='bt-next-plan').textContent,/5秒/);f.app.dispose();
});

test('start navigates once, input is read-only during work, and completion preserves another active control',async()=>{
 let finish;const f=await setup({loadLight:async()=>({selectValidatedStagedPlan,runSelectedStagedRequest:input=>new Promise(resolve=>{finish=()=>resolve(finished(input));})})});
 f.input.value='360';f.input.focus();f.form.fire('submit');assert.equal(f.input.readOnly,true);assert.equal(f.doc.activeElement,f.find(n=>n.attrs['class']==='bt-status'));assert.equal(f.doc.scrolls.length,1);
 f.input.focus();f.doc.focuses=[];finish();await settle();assert.equal(f.doc.activeElement,f.input);assert.equal(f.doc.focuses.length,0);assert.equal(f.doc.scrolls.length,1);assert.equal(f.input.readOnly,false);
 f.action('result').fire('click');assert.equal(f.doc.activeElement,f.find(n=>n.attrs['class']==='bt-result-title'));f.app.dispose();
});

test('cancel retains the lease until retirement and then permits a fresh run',async()=>{
 let finish,signal,runs=0;const f=await setup({loadLight:async()=>({selectValidatedStagedPlan,runSelectedStagedRequest:(input,options,d)=>{runs++;signal=d.signal;return new Promise(resolve=>{finish=()=>resolve(finished(input));});}})});
 f.input.value='32';f.form.fire('submit');f.action('cancel').fire('click');assert.equal(signal.aborted,true);assert.equal(f.app.getState().phase,'cancelling');assert.equal(f.action('start').disabled,true);assert.equal(f.input.readOnly,true);f.form.fire('submit');assert.equal(runs,1);finish();await settle();assert.equal(f.action('start').disabled,false);f.form.fire('submit');assert.equal(runs,2);finish();await settle();f.app.dispose();
});

test('paste text is never truncated and copying keeps rows, status and full precision',async()=>{
 const f=await setup();f.input.value='0'.repeat(4097);f.input.fire('input');f.form.fire('submit');await settle();assert.equal(f.input.value.length,4097);assert.match(f.app.getState().error,/4096/);
 f.input.value='000360';f.input.fire('input');f.form.fire('submit');await settle();assert.equal(f.input.value,'000360');const factors=f.find(n=>n.attrs['class']==='bt-factor-list');assert.equal(factors.tagName,'UL');assert.equal(factors.children.length,3);assert.ok(factors.children.every(n=>n.tagName==='LI'));
 f.action('copy').fire('click');await settle();const body=f.find(n=>n.attrs['class']==='bt-result-body');assert.equal(f.doc.activeElement,body);assert.equal(f.doc.selected,body);assert.equal(f.find(n=>n.attrs['class']==='bt-proof').open,true);assert.match(f.find(n=>n.attrs['class']==='bt-equation').textContent,/360 = 2\^3/);f.action('reset').focus();f.action('reset').fire('click');await settle();assert.equal(f.input.value,'');assert.equal(f.doc.activeElement,f.action('reset'));f.app.dispose();assert.equal(f.root.children.length,0);
});

test('asset failure is distinct from invalid input and retries retain the typed input',async()=>{
 let attempts=0;const f=await setup({loadLight:async()=>{if(++attempts===1)throw Error('asset failure');return{selectValidatedStagedPlan};}});assert.equal(f.app.getState().errorField,'load');assert.equal(f.input.attrs['aria-invalid'],'false');f.input.value='104729';f.action('retry').fire('click');await settle();assert.equal(f.app.getState().phase,'ready');assert.equal(f.input.value,'104729');assert.equal(f.action('start').disabled,false);f.app.dispose();
});

test('a failed result verification cannot attach an old job snapshot to a successful retry',async()=>{
 let runs=0;const f=await setup({loadLight:async()=>({selectValidatedStagedPlan,runSelectedStagedRequest:async input=>{const result=finished(input);return ++runs===1?{...result,policy:'forged'}:result;}})});
 f.input.value='32';f.form.fire('submit');await settle();assert.equal(f.app.getState().phase,'error');
 f.input.value='64';f.input.fire('input');f.form.fire('submit');await settle();assert.equal(f.find(n=>n.attrs['class']==='bt-result-title').textContent,'64 の結果');assert.equal(f.find(n=>n.attrs['class']==='bt-draft-note').hidden,true);
 f.input.value='32';f.input.fire('input');assert.match(f.find(n=>n.attrs['class']==='bt-result-title').textContent,/前回.*64/);assert.equal(f.find(n=>n.attrs['class']==='bt-draft-note').hidden,false);f.app.dispose();
});

test('another instance holding the lease is a runtime wait, not an input error or hidden scroll target',async t=>{
 const shared=fixture();let finish;
 const first=await setup({loadLight:async()=>({selectValidatedStagedPlan,runSelectedStagedRequest:input=>new Promise(resolve=>{finish=()=>resolve(finished(input));})})},shared),second=await setup({},{doc:shared.doc,root:shared.doc.createElement('div')});t.after(()=>{first.app.dispose();second.app.dispose();});
 first.input.value='32';first.form.fire('submit');second.input.value='64';second.form.fire('submit');await settle();
 assert.equal(second.app.getState().errorField,'runtime');assert.equal(second.input.attrs['aria-invalid'],'false');const destination=second.doc.scrolls.at(-1).node;assert.equal(destination.attrs.role,'alert');assert.equal(destination.hidden,false);assert.doesNotMatch(second.find(n=>n.attrs['class']==='bt-status').textContent,/入力|設定/);assert.equal(second.doc.activeElement.attrs.role,'status');
 finish();await settle();second.form.fire('submit');await settle();assert.equal(second.app.getState().phase,'result');first.app.dispose();second.app.dispose();
});

test('one vertical form keeps two modal triggers and no expanded settings or duplicate result text',async()=>{
 const f=await setup(),work=f.find(n=>n.attrs['class']==='bt-work'),details=f.find(n=>n.attrs['class']==='bt-settings');
 assert.ok(f.form.children.includes(work));assert.equal(details.tagName,'DIALOG');assert.ok(f.root.children.includes(details));assert.equal(f.form.children.includes(details),false);assert.equal(nodes(f.root).filter(n=>n.tagName==='TEXTAREA').length,0);assert.equal(f.action('examples').attrs['aria-haspopup'],'dialog');
 const workers=f.find(n=>n.id?.endsWith('-workers'));assert.equal(f.find(n=>n.children.includes(workers)).hidden,true);f.app.dispose();
});

test('composition confirmation and repeated Enter never dispatch; deliberate next Enter does',async()=>{
 let runs=0;const f=await setup({loadLight:async()=>({selectValidatedStagedPlan,runSelectedStagedRequest:async i=>{runs++;return finished(i);}})});f.input.value='32';
 f.input.fire('compositionstart');f.form.fire('submit');await settle();assert.equal(runs,0);f.input.fire('compositionend');
 let prevented=false;f.input.fire('keydown',{key:'Enter',preventDefault(){prevented=true;}});f.form.fire('submit');assert.equal(runs,0);assert.equal(prevented,true);f.input.fire('keyup',{key:'Enter'});
 f.input.fire('keydown',{key:'Enter',repeat:true});f.form.fire('submit');assert.equal(runs,0);f.input.fire('keyup',{key:'Enter'});
 f.input.fire('keydown',{key:'Enter',keyCode:229});f.form.fire('submit');assert.equal(runs,0);f.input.fire('keyup',{key:'Enter'});
 f.input.fire('keydown',{key:'Enter'});f.form.fire('submit');await settle();assert.equal(runs,1);f.app.dispose();
});

test('composition ending without an Enter allows the next deliberate Enter after the event turn',async()=>{
 const f=await setup();f.input.value='32';f.input.fire('compositionend');f.input.fire('keydown',{key:'Enter'});f.form.fire('submit');await settle();assert.equal(f.app.getState().phase,'result');
 f.input.fire('compositionstart');f.input.fire('compositionend');await new Promise(resolve=>setTimeout(resolve,15));f.input.value='64';f.input.fire('keydown',{key:'Enter'});f.form.fire('submit');await settle();assert.equal(f.find(n=>n.attrs['class']==='bt-result-title').textContent,'64 の結果');f.app.dispose();
});

test('manual values survive auto allocation and engine changes with applicability explained',async()=>{
 const f=await setup(),engine=f.find(n=>n.id?.endsWith('-engine')),mode=f.find(n=>n.id?.endsWith('-mode')),workers=f.find(n=>n.id?.endsWith('-workers')),memory=f.find(n=>n.id?.endsWith('-memory'));
 f.action('settings').fire('click');engine.value='optimized';engine.fire('change');await settle();mode.value='manual';mode.fire('change');workers.value='3';workers.fire('change');memory.value='512';memory.fire('change');mode.value='auto';mode.fire('change');assert.equal(f.find(n=>n.children.includes(workers)).hidden,true);
 mode.value='manual';mode.fire('change');assert.equal(workers.value,'3');assert.equal(memory.value,'512');engine.value='standard';engine.fire('change');await settle();engine.value='optimized';engine.fire('change');await settle();assert.equal(mode.value,'manual');assert.equal(workers.value,'3');assert.equal(memory.value,'512');assert.equal(f.find(n=>n.children.includes(workers)).hidden,false);
 memory.value='1536';memory.fire('change');mode.value='auto';mode.fire('change');assert.doesNotMatch(f.find(n=>n.attrs['class']==='bt-next-plan').textContent,/組み合わせ/);assert.equal(memory.value,'1536');f.app.dispose();
});

test('configured WASM budget remains distinct from the small route that does not use WASM',async()=>{
 const f=await setup({loadHeavy:async()=>({})}),engine=f.find(n=>n.id?.endsWith('-engine')),mode=f.find(n=>n.id?.endsWith('-mode')),memory=f.find(n=>n.id?.endsWith('-memory'));f.action('settings').fire('click');engine.value='optimized';engine.fire('change');await settle();mode.value='manual';mode.fire('change');memory.value='512';memory.fire('change');f.action('apply-settings').fire('click');await settle();f.input.value='32';f.form.fire('submit');await settle();assert.equal(f.app.getState().resources.configuredPlan.budgetBytes,512*1048576);assert.equal(f.app.getState().resources.actualWasmBytes,0);const limits=f.find(n=>n.attrs['class']==='bt-execution-limits');assert.equal(limits.children[0].children[1].textContent,'512 MiB');assert.equal(limits.children.at(-1).children[1].textContent,'この計算では使わない');f.app.dispose();
});

test('settings cancel and invalid apply leave current result and applied input ceiling unchanged',async()=>{
 const f=await setup();f.input.value='32';f.form.fire('submit');await settle();f.action('settings').fire('click');const engine=f.find(n=>n.id?.endsWith('-engine'));engine.value='wide';engine.fire('change');assert.match(f.find(n=>n.attrs['class']==='bt-input-limit').textContent,/39/);f.action('cancel-settings').fire('click');assert.equal(f.doc.activeElement,f.action('settings'));assert.equal(engine.value,'standard');assert.equal(f.find(n=>n.attrs['class']==='bt-result-title').textContent,'32 の結果');
 f.action('settings').fire('click');engine.value='optimized';engine.fire('change');const mode=f.find(n=>n.id?.endsWith('-mode')),memory=f.find(n=>n.id?.endsWith('-memory'));mode.value='manual';mode.fire('change');memory.value='1536';memory.fire('change');f.action('apply-settings').fire('click');assert.equal(f.find(n=>n.attrs['class']==='bt-settings').open,true);assert.equal(f.app.getState().engine,'standard');assert.match(f.doc.activeElement.textContent,/まだ適用していません/);f.form.fire('submit');await settle();assert.equal(f.app.getState().input,'32');f.app.dispose();
});
test('a pending clipboard denial cannot take focus from a newly opened modal',async()=>{const f=await setup();f.input.value='32';f.form.fire('submit');await settle();let rejectCopy;f.doc.defaultView.navigator.clipboard={writeText:()=>new Promise((resolve,reject)=>{rejectCopy=reject;})};f.action('copy').fire('click');f.action('examples').fire('click');const focused=f.doc.activeElement;rejectCopy(Error('denied'));await settle();assert.equal(f.doc.activeElement,focused);assert.equal(focused.tagName,'H2');f.app.dispose();});

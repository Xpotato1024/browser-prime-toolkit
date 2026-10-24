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
 focus(options){doc.activeElement=this;doc.focuses.push({node:this,options});}scrollIntoView(options){doc.scrolls.push({node:this,options});}select(){this.selected=true;}fire(k){this.events.get(k)?.({preventDefault(){}});}
 }doc.createElement=tag=>new Element(tag);doc.defaultView={setInterval,clearInterval,addEventListener(){},removeEventListener(){},navigator:{}};return {doc,root:new Element('div')};}
const nodes=root=>{const all=[];const visit=n=>{all.push(n);for(const c of n.children)visit(c);};visit(root);return all;};
const settle=async()=>{for(let i=0;i<20;i++)await Promise.resolve();};
const finished=input=>({...factorStaged(BigInt(input)),origin:'worker',traceAvailable:true});
async function setup(options={}){const f=fixture();f.app=mountSiteFactorizer(f.root,{sessionOptions:{loadLight:async()=>({selectValidatedStagedPlan,runSelectedStagedRequest:async i=>finished(i)}),...options}});await settle();f.find=predicate=>nodes(f.root).find(predicate);f.action=name=>f.find(n=>n.attrs['data-action']===name);f.input=f.find(n=>n.tagName==='INPUT');f.form=f.find(n=>n.tagName==='FORM');return f;}

test('all examples only fill the common input, collapse and return focus to the one start action',async()=>{
 let runs=0;const f=await setup({loadLight:async()=>({selectValidatedStagedPlan,runSelectedStagedRequest:async i=>{runs++;return finished(i);}})});
 assert.equal(f.action('quick-example'),undefined);const samples=f.find(n=>n.attrs['class']==='bt-samples');
 for(const sample of nodes(f.root).filter(n=>'data-sample-value' in n.attrs)){samples.open=true;sample.focus();sample.fire('click');assert.equal(f.input.value,sample.attrs['data-sample-value']);assert.equal(samples.open,false);assert.equal(f.doc.activeElement,f.action('start'));assert.equal(f.app.getState().phase,'ready');}
 assert.equal(runs,0);assert.equal(f.input.attrs.maxlength,undefined);const area=f.find(n=>n.attrs['class']==='bt-input-area'),limit=f.find(n=>n.attrs['class']==='bt-input-limit');assert.ok(area.children.includes(limit));assert.match(limit.textContent,/39.*2\^128/);assert.ok(f.input.attrs['aria-describedby'].includes(limit.id));f.app.dispose();
});

test('edited input is unexecuted and the previous result and copy remain bound to their original input',async()=>{
 const f=await setup();f.input.value='104729';f.form.fire('submit');await settle();f.input.value='32';f.input.fire('input');
 assert.match(f.find(n=>n.attrs['class']==='bt-result-title').textContent,/前回.*104729/);assert.match(f.find(n=>n.attrs['class']==='bt-draft-note').textContent,/未実行/);
 f.action('copy').fire('click');await settle();assert.match(f.find(n=>n.attrs['aria-label']?.startsWith('手動')).value,/104729 = 104729/);
 f.form.fire('submit');await settle();assert.equal(f.find(n=>n.attrs['class']==='bt-result-title').textContent,'32 の結果');assert.equal(f.find(n=>n.attrs['class']==='bt-equation').textContent,'32 = 2^5');
 f.input.value='2.5';f.input.fire('input');f.form.fire('submit');await settle();assert.equal(f.app.getState().errorField,'input');assert.match(f.find(n=>n.attrs['class']==='bt-result-title').textContent,/前回.*32/);assert.equal(f.doc.activeElement,f.input);f.app.dispose();
});

test('settings edits mark previous output without replacing its measured duration or result',async()=>{
 const f=await setup();f.input.value='360';f.form.fire('submit');await settle();const elapsed=f.find(n=>'data-elapsed' in n.attrs).textContent,time=f.find(n=>n.id?.endsWith('-time'));time.value='5000';time.fire('change');assert.match(f.find(n=>n.attrs['class']==='bt-result-title').textContent,/前回.*360/);assert.equal(f.find(n=>'data-elapsed' in n.attrs).textContent,elapsed);assert.match(f.find(n=>n.attrs['class']==='bt-next-plan').textContent,/5秒/);f.app.dispose();
});

test('start navigates once, input is read-only during work, and completion preserves another active control',async()=>{
 let finish;const f=await setup({loadLight:async()=>({selectValidatedStagedPlan,runSelectedStagedRequest:input=>new Promise(resolve=>{finish=()=>resolve(finished(input));})})});
 f.input.value='360';f.input.focus();f.form.fire('submit');assert.equal(f.input.readOnly,true);assert.equal(f.doc.activeElement,f.action('cancel'));assert.equal(f.doc.scrolls.length,1);
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
 f.action('copy').fire('click');await settle();const manual=f.find(n=>n.attrs['aria-label']?.startsWith('手動'));assert.equal(f.doc.activeElement,manual);assert.equal(manual.selected,true);assert.match(manual.value,/360 = 2\^3/);assert.match(manual.value,/因子の判定/);f.action('reset').focus();f.action('reset').fire('click');await settle();assert.equal(f.input.value,'');assert.equal(f.doc.activeElement,f.action('reset'));f.app.dispose();assert.equal(f.root.children.length,0);
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

test('another instance holding the lease is a runtime wait, not an input error or hidden scroll target',async()=>{
 const {makeComputeScope}=await import('../../src/site/document-scope.js');const scope=makeComputeScope();let finish;
 const first=await setup({scope,loadLight:async()=>({selectValidatedStagedPlan,runSelectedStagedRequest:input=>new Promise(resolve=>{finish=()=>resolve(finished(input));})})}),second=await setup({scope});
 first.input.value='32';first.form.fire('submit');second.input.value='64';second.form.fire('submit');await settle();
 assert.equal(second.app.getState().errorField,'runtime');assert.equal(second.input.attrs['aria-invalid'],'false');const destination=second.doc.scrolls.at(-1).node;assert.equal(destination.attrs.role,'alert');assert.equal(destination.hidden,false);assert.doesNotMatch(second.find(n=>n.attrs['class']==='bt-status').textContent,/入力|設定/);assert.equal(second.doc.activeElement.attrs.role,'status');
 finish();await settle();second.form.fire('submit');await settle();assert.equal(second.app.getState().phase,'result');first.app.dispose();second.app.dispose();
});

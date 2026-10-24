import test from 'node:test';
import assert from 'node:assert/strict';
import {mountSiteFactorizer} from '../../src/site/mount.js';
import {selectValidatedStagedPlan} from '../../src/engine/staged-selected.js';
import {factorStaged} from '../../src/engine/staged-factor.js';

// Minimal DOM records focus intent; actual viewport/keyboard behavior is checked in Chrome.
function documentFixture(){
 const doc={activeElement:null,focuses:[],scrolls:[]};
 class Element{
  constructor(tag){this.tagName=tag.toUpperCase();this.ownerDocument=doc;this.children=[];this.attrs={};this.events=new Map();this.dataset={};this.value='';this.style={};}
  setAttribute(k,v){this.attrs[k]=String(v);if(['id','value'].includes(k))this[k]=String(v);}
  append(...nodes){this.children.push(...nodes);if(this.tagName==='SELECT'&&!this.value)this.value=this.children[0]?.value??'';}
  replaceChildren(...nodes){this.children=[...nodes];}
  addEventListener(k,f){this.events.set(k,f);}
  removeEventListener(k){this.events.delete(k);}
  focus(options){doc.activeElement=this;doc.focuses.push({node:this,options});}
  scrollIntoView(options){doc.scrolls.push({node:this,options});}
  select(){this.selected=true;}
  fire(k){this.events.get(k)?.({preventDefault(){}});}
 }
 doc.createElement=tag=>new Element(tag);
 doc.defaultView={setInterval,clearInterval,addEventListener(){},removeEventListener(){},navigator:{}};
 return {doc,root:new Element('div')};
}
const settle=async()=>{for(let i=0;i<10;i++)await Promise.resolve();};
const nodes=root=>{const all=[];const visit=n=>{all.push(n);for(const c of n.children)visit(c);};visit(root);return all;};
test('sample and reset preserve the active control without forcing the input keyboard',async()=>{
 const {doc,root}=documentFixture();
 const app=mountSiteFactorizer(root,{sessionOptions:{loadLight:async()=>({selectValidatedStagedPlan})}});
 await settle();
 const all=nodes(root),sample=all.find(n=>n.attrs['data-sample-value']==='360'),input=all.find(n=>n.tagName==='INPUT'),reset=all.find(n=>n.attrs['data-action']==='reset');
 assert.equal(sample.tagName,'BUTTON');assert.equal(sample.attrs.type,'button');
 sample.focus();doc.focuses=[];sample.fire('click');
 assert.equal(input.value,'360');assert.equal(doc.activeElement,sample);assert.equal(doc.focuses.length,0);assert.equal(app.getState().phase,'ready');
 reset.focus();doc.focuses=[];reset.fire('click');await settle();
 assert.equal(input.value,'');assert.equal(doc.activeElement,reset);assert.ok(doc.focuses.every(x=>x.node!==input&&x.options.preventScroll===true));
 app.dispose();assert.equal(root.children.length,0);
});

test('input and primary execution precede optional examples; results precede optional controls',async()=>{
 const {root}=documentFixture(),app=mountSiteFactorizer(root,{sessionOptions:{loadLight:async()=>({selectValidatedStagedPlan})}});await settle();
 const all=nodes(root),form=all.find(n=>n.tagName==='FORM'),start=all.find(n=>n.attrs['data-action']==='start'),sample=all.find(n=>n.attrs['class']==='bt-samples'),settings=all.find(n=>n.attrs['class']==='bt-settings'),result=all.find(n=>n.attrs['class']==='bt-result');
 assert.ok(!nodes(form).includes(sample));assert.ok(!nodes(form).includes(settings));assert.ok(nodes(form).includes(start));
 assert.ok(root.children.indexOf(result)<root.children.indexOf(sample));assert.ok(root.children.indexOf(result)<root.children.indexOf(settings));app.dispose();
});

test('explicit quick example runs only 360 with a one-second limit and retains next-run settings',async()=>{
 const {doc,root}=documentFixture();let finish,received;
 const app=mountSiteFactorizer(root,{sessionOptions:{loadLight:async()=>({selectValidatedStagedPlan,runSelectedStagedRequest:(input,options)=>new Promise(resolve=>{received={input,options};finish=()=>resolve({...factorStaged(BigInt(input)),origin:'worker',traceAvailable:true});})})}});await settle();
 const all=nodes(root),quick=all.find(n=>n.attrs['data-action']==='quick-example'),input=all.find(n=>n.tagName==='INPUT'),time=all.find(n=>n.id?.endsWith('-time')),cancel=all.find(n=>n.attrs['data-action']==='cancel');
 assert.ok(quick);assert.equal(quick.attrs.type,'button');assert.match(quick.textContent,/360.*分解/);time.value='5000';time.fire('change');
 quick.focus();quick.fire('click');assert.equal(input.value,'360');assert.equal(received.input,'360');assert.equal(received.options.timeBudgetMs,1000);assert.equal(time.value,'5000');assert.equal(quick.disabled,true);assert.equal(doc.activeElement,cancel);
 finish();await settle();assert.equal(app.getState().phase,'result');assert.equal(app.getState().resources.actualTimeBudgetMs,1000);assert.equal(quick.disabled,false);assert.equal(time.value,'5000');assert.equal(doc.scrolls.length,0);app.dispose();
});

test('result navigation is explicit and completion leaves another active control alone',async()=>{
 const {doc,root}=documentFixture();let finish;
 const app=mountSiteFactorizer(root,{sessionOptions:{loadLight:async()=>({selectValidatedStagedPlan,runSelectedStagedRequest:input=>new Promise(resolve=>{finish=()=>resolve({...factorStaged(BigInt(input)),origin:'worker',traceAvailable:true});})})}});await settle();
 const all=nodes(root),jump=all.find(n=>n.attrs['data-action']==='result'),input=all.find(n=>n.tagName==='INPUT'),form=all.find(n=>n.tagName==='FORM'),output=all.find(n=>n.attrs.id?.endsWith('-output')),sample=all.find(n=>n.attrs['class']==='bt-samples');
 assert.ok(jump);assert.equal(jump.hidden,true);input.value='360';input.focus();form.fire('submit');const elsewhere=sample.children[0];elsewhere.focus();doc.focuses=[];finish();await settle();
 assert.equal(doc.activeElement,elsewhere);assert.equal(doc.focuses.length,0);assert.equal(doc.scrolls.length,0);assert.equal(jump.hidden,false);
 jump.focus();jump.fire('click');assert.equal(doc.activeElement,output);assert.deepEqual(doc.focuses.at(-1).options,{preventScroll:true});assert.equal(doc.scrolls.length,1);app.dispose();
});
test('execution and completion move keyboard focus with preventScroll; fallback remains selectable',async()=>{
 const {doc,root}=documentFixture();let finish;
 const app=mountSiteFactorizer(root,{sessionOptions:{loadLight:async()=>({selectValidatedStagedPlan,runSelectedStagedRequest:i=>new Promise(resolve=>{finish=()=>resolve({...factorStaged(BigInt(i)),origin:'worker',traceAvailable:true});})})}});
 await settle();
 const all=nodes(root),input=all.find(n=>n.tagName==='INPUT'),form=all.find(n=>n.tagName==='FORM'),cancel=all.find(n=>n.attrs['data-action']==='cancel'),copy=all.find(n=>n.attrs['data-action']==='copy');
 input.value='360';input.focus();doc.focuses=[];form.fire('submit');
 assert.equal(doc.activeElement,cancel);assert.deepEqual(doc.focuses.at(-1).options,{preventScroll:true});
 finish();await settle();assert.equal(doc.activeElement.attrs.role,'status');assert.deepEqual(doc.focuses.at(-1).options,{preventScroll:true});
 const rendered=nodes(root),elapsed=rendered.find(n=>'data-elapsed' in n.attrs),factors=rendered.find(n=>n.attrs['class']==='bt-factor-list');
 assert.equal(elapsed.tagName,'DD');assert.match(elapsed.textContent,/ms|秒/);assert.doesNotMatch(elapsed.textContent,/上限|Worker|WASM/);
 assert.equal(factors.tagName,'UL');assert.equal(factors.children.length,3);assert.ok(factors.children.every(n=>n.tagName==='LI'));assert.match(factors.children[0].textContent,/2（3乗）/);
 copy.fire('click');await settle();
 const manual=all.find(n=>n.attrs['aria-label']?.startsWith('手動'));
 assert.equal(doc.activeElement,manual);assert.equal(manual.selected,true);assert.equal(manual.hidden,false);assert.match(manual.value,/360 =/);assert.deepEqual(doc.focuses.at(-1).options,{preventScroll:true});
 app.dispose();
});

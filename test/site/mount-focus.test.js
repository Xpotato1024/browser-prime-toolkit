import test from 'node:test';
import assert from 'node:assert/strict';
import {mountSiteFactorizer} from '../../src/site/mount.js';
import {selectValidatedStagedPlan} from '../../src/engine/staged-selected.js';
import {factorStaged} from '../../src/engine/staged-factor.js';

// Minimal DOM records focus intent; actual viewport/keyboard behavior is checked in Chrome.
function documentFixture(){
 const doc={activeElement:null,focuses:[]};
 class Element{
  constructor(tag){this.tagName=tag.toUpperCase();this.ownerDocument=doc;this.children=[];this.attrs={};this.events=new Map();this.dataset={};this.value='';this.style={};}
  setAttribute(k,v){this.attrs[k]=String(v);if(['id','value'].includes(k))this[k]=String(v);}
  append(...nodes){this.children.push(...nodes);if(this.tagName==='SELECT'&&!this.value)this.value=this.children[0]?.value??'';}
  replaceChildren(...nodes){this.children=[...nodes];}
  addEventListener(k,f){this.events.set(k,f);}
  removeEventListener(k){this.events.delete(k);}
  focus(options){doc.activeElement=this;doc.focuses.push({node:this,options});}
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

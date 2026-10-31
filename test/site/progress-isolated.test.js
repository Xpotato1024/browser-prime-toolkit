// SPDX-License-Identifier: AGPL-3.0-only
import test from 'node:test';
import assert from 'node:assert/strict';
import {createProgressTracker,stopReasonPresentation} from '../../src/site/progress.js';
import {createProgressView} from '../../src/site/progress-view.js';
const fixture=()=>{const nodes=[];const doc={createElement(tag){const n={tag,attrs:{},children:[],textContent:'',hidden:false,setAttribute(k,v){this.attrs[k]=String(v);},removeAttribute(k){delete this.attrs[k];},append(...xs){this.children.push(...xs);}};nodes.push(n);return n;}};return{doc,nodes};};
test('only collection has a measured fraction and target arrival is never overall completion',()=>{
 const t=createProgressTracker();assert.equal(t.get(),null);t.begin(1);
 assert.equal(t.get().value,null);
 assert.equal(t.collect(1,{families:2,relations:25,target:100}),true);
 assert.equal(t.get().value,0.25);assert.equal(t.get().stage,'collecting');
 t.collect(1,{families:8,relations:105,target:100});
 assert.equal(t.get().value,null);assert.match(t.get().summary,/目標.*後続.*未完了/);
 t.verify(1);assert.equal(t.get().value,null);assert.equal(t.get().stage,'verifying');
 t.finish(1,'result');assert.equal(t.get().stage,'settled');assert.equal(t.get().value,null);
});
test('bad counters, changed targets, stale jobs and decreasing collection cannot regress the display',()=>{
 const t=createProgressTracker();t.begin(2);
 for(const data of [{families:1,relations:2,target:0},{families:1,relations:NaN,target:5},{families:1,relations:2,target:1e9}])assert.equal(t.collect(2,data),false);
 assert.equal(t.collect(1,{families:1,relations:2,target:5}),false);
 t.collect(2,{families:3,relations:4,target:5});
 for(const data of [{families:2,relations:4,target:5},{families:4,relations:3,target:5},{families:4,relations:5,target:6}])assert.equal(t.collect(2,data),false);
 assert.equal(t.get().relations,4);assert.equal(t.get().families,3);
 t.verify(2);assert.equal(t.collect(2,{families:4,relations:5,target:5}),false);
 t.begin(3);assert.equal(t.get().relations,null);assert.equal(t.verify(2),false);
});
test('cancel, terminal, unmount and reset reject late progress and retain no event history',()=>{
 const t=createProgressTracker();t.begin(1);t.collect(1,{families:1,relations:1,target:4});t.cancel(1);
 assert.equal(t.get().stage,'cancelling');assert.equal(t.get().value,null);
 assert.equal(t.collect(1,{families:2,relations:2,target:4}),false);
 t.finish(1,'result');assert.equal(t.verify(1),false);assert.equal(t.collect(1,{}),false);
 const snapshot=t.get();snapshot.stage='forged';assert.equal(t.get().stage,'settled');
 t.close();assert.equal(t.begin(2),false);assert.equal(t.get(),null);
});
test('timeout, observed soft stop, explicit quota refusal and unknown worker loss remain distinct',()=>{
 assert.equal(stopReasonPresentation('time-budget').category,'time');
 assert.equal(stopReasonPresentation('initialization-timeout').category,'initialization');
 assert.equal(stopReasonPresentation('coordinator-memory-soft-stop').category,'memory-soft-stop');
 assert.match(stopReasonPresentation('coordinator-memory-soft-stop').text,/観測.*保護/);
 assert.equal(stopReasonPresentation('native-memory-budget').category,'memory-allocation-refused');
 for(const code of ['worker-error','worker-creation','native-unknown','wasm-trap','arbitrary']){
  const r=stopReasonPresentation(code);assert.notEqual(r.category,'memory-allocation-refused');assert.doesNotMatch(r.text,/メモリ上限に達しました/);
 }
 assert.equal(stopReasonPresentation('cancelled').category,'cancelled');
 assert.equal(stopReasonPresentation('verification-failed').category,'verification');
 assert.equal(stopReasonPresentation('worker-retirement').category,'cleanup');
 assert.equal(stopReasonPresentation(null),null);
});
test('mock DOM keeps the same progress nodes, labels indeterminate state, and never moves focus',()=>{
 const f=fixture(),v=createProgressView(f.doc,'test-'),t=createProgressTracker();
 const bar=f.nodes.find(n=>n.tag==='progress'),stage=f.nodes.find(n=>n.attrs.id==='test-progress-stage');
 t.begin(1);v.update(t.get());assert.equal(v.root.hidden,false);assert.equal(bar.attrs.value,undefined);
 assert.equal(bar.attrs['aria-labelledby'],'test-progress-stage');assert.equal(stage.attrs['aria-live'],'polite');
 const fixed=f.nodes.length;
 t.collect(1,{families:10,relations:250,target:1000});v.update(t.get());
 assert.equal(bar.attrs.value,'0.25');assert.equal(bar.attrs['aria-valuetext'],'関係収集 25.0%（計算全体の完了率ではありません）');
 assert.ok(f.nodes.some(n=>n.textContent==='250 / 1000 関係式'));
 for(let i=0;i<1000;i++)v.update(t.get());assert.equal(f.nodes.length,fixed);
 t.collect(1,{families:20,relations:1000,target:1000});v.update(t.get());assert.equal(bar.attrs.value,undefined);
 t.cancel(1);v.update(t.get());assert.equal(bar.attrs.value,undefined);assert.match(stage.textContent,/中止/);
 t.finish(1,'error');v.update(t.get());assert.match(stage.textContent,/停止/);
 v.dispose();assert.equal(v.root.hidden,true);v.update({stage:'running'});assert.equal(v.root.hidden,true);
});

test('reset clears presentation and old job identifiers cannot be restarted',()=>{
 const t=createProgressTracker();t.begin(4);t.collect(4,{families:1,relations:2,target:10});t.reset();assert.equal(t.get(),null);
 assert.equal(t.begin(3),false);assert.equal(t.begin(4),false);assert.equal(t.begin(5),true);
 const f=fixture(),v=createProgressView(f.doc,'done-');v.update(t.get());t.finish(5,'result');v.update(t.get());
 const bar=f.nodes.find(n=>n.tag==='progress'),stage=f.nodes.find(n=>n.attrs.id==='done-progress-stage');
 assert.equal(bar.attrs['data-terminal'],'true');assert.equal(stage.attrs['aria-live'],'off');
 v.update(null);assert.equal(v.root.hidden,false);
});

test('a fraction just below the collection target is never rounded up to 100 percent',()=>{
 const f=fixture(),v=createProgressView(f.doc,'round-'),t=createProgressTracker();
 t.begin(1);t.collect(1,{families:1,relations:9999,target:10000});v.update(t.get());
 assert.equal(f.nodes.find(n=>n.tag==='progress').attrs['aria-valuetext'],'関係収集 99.9%（計算全体の完了率ではありません）');
});

test('host status can be the single named live heading without a duplicate node',()=>{
 const f=fixture(),status=f.doc.createElement('p'),v=createProgressView(f.doc,'shared-',{stageElement:status}),t=createProgressTracker();
 t.begin(1);v.update(t.get());assert.equal(status.textContent,'計算中');assert.equal(status.attrs['aria-live'],'polite');
 assert.equal(f.nodes.filter(n=>n.attrs.id==='shared-progress-stage').length,1);assert.ok(!v.root.children.includes(status));
 t.cancel(1);v.update(t.get());assert.equal(status.textContent,'中止処理');assert.equal(status.attrs['aria-live'],'polite');
 t.finish(1,'result');v.update(t.get());assert.equal(status.textContent,'処理終了');assert.equal(status.attrs['aria-live'],'off');
});

test('shared status announces once per stage and preparation restores its live setting',()=>{
 const f=fixture(),status=f.doc.createElement('p'),writes=[];let value='';
 Object.defineProperty(status,'textContent',{get:()=>value,set:x=>{value=x;writes.push(x);}});
 const v=createProgressView(f.doc,'once-',{stageElement:status}),t=createProgressTracker();t.begin(1);v.update(t.get());
 t.collect(1,{families:1,relations:2,target:10});v.update(t.get());writes.length=0;
 t.collect(1,{families:2,relations:3,target:10});v.update(t.get());assert.deepEqual(writes,[]);
 t.finish(1,'result');v.update(t.get());assert.equal(status.attrs['aria-live'],'off');
 v.update(null);assert.equal(status.attrs['aria-live'],'polite');
});

test('reported WASM allocation failure differs from a quota refusal and unknown fatal error',()=>{
 const observed=stopReasonPresentation('wasm-oom');
 assert.equal(observed.category,'wasm-allocation-failure-reported');
 assert.match(observed.text,/割当失敗.*報告/);assert.match(observed.text,/直接原因.*未確定/);
 assert.notEqual(observed.category,stopReasonPresentation('native-memory-budget').category);
 assert.equal(stopReasonPresentation('fatal-unknown').category,'worker');
 assert.equal(stopReasonPresentation('native-unknown').category,'native');
 assert.equal(stopReasonPresentation('missing-session').category,'protocol');
 assert.equal(stopReasonPresentation('composite-divisor').category,'verification');
});

test('partial factor candidates persist across methods but never become prime claims or leak into a fresh job',()=>{
 const t=createProgressTracker();t.begin(1);t.engine(1,1,'native');
 assert.equal(t.prefix(1,[{value:'2',exponent:3}]),true);assert.equal(t.prefix(1,[{value:'2',exponent:3}]),false);
 const copy=t.get();copy.factorCandidates[0].value='7';assert.equal(t.get().factorCandidates[0].value,'2');
 t.engine(1,2,'ecm');assert.equal(t.get().factorCandidates[0].value,'2');assert.equal(t.get().value,null);
 const f=fixture(),v=createProgressView(f.doc,'partial-');v.update(t.get());
 const detail=f.nodes.find(n=>n.attrs.class==='bt-progress-partial');assert.equal(detail.hidden,false);
 assert.ok(f.nodes.some(n=>n.textContent.includes('2^3')));assert.ok(f.nodes.some(n=>n.textContent.includes('最終確認前')));
 t.cancel(1);assert.equal(t.prefix(1,[{value:'5',exponent:1}]),false);t.finish(1,'result');v.update(t.get());assert.equal(detail.hidden,true);
 t.begin(2);assert.equal(t.get().factorCandidates.length,0);assert.equal(t.prefix(1,[{value:'7',exponent:1}]),false);
});

test('the progress region starts visible and neutral without claiming work has begun',()=>{
 const f=fixture(),v=createProgressView(f.doc,'idle-');
 const bar=f.nodes.find(n=>n.tag==='progress'),stage=f.nodes.find(n=>n.attrs.id==='idle-progress-stage');
 assert.equal(v.root.hidden,false);assert.equal(stage.textContent,'待機中');
 assert.equal(bar.attrs.value,'0');assert.equal(bar.attrs['data-state'],'idle');assert.match(bar.attrs['aria-valuetext'],/待機/);
 v.update(null,{phase:'loading'});assert.equal(v.root.hidden,false);assert.equal(bar.attrs.value,undefined);
 v.update(null,{phase:'invalid'});assert.equal(bar.attrs.value,'0');assert.match(stage.textContent,/入力/);
 v.update(null,{phase:'ready'});assert.equal(stage.textContent,'待機中');assert.equal(bar.attrs.value,'0');
 const t=createProgressTracker();t.begin(1);t.collect(1,{families:1,relations:2,target:10});v.update(t.get());t.finish(1,'result');v.update(t.get());
 assert.equal(v.root.hidden,false);assert.equal(bar.attrs.value,'0');assert.equal(bar.attrs['data-terminal'],'true');
});

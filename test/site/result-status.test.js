// SPDX-License-Identifier: AGPL-3.0-only
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createProgressTracker} from '../../src/site/progress.js';
import {createProgressView} from '../../src/site/progress-view.js';
import {sitePresentation} from '../../src/site/presentation.js';
function fixture(){
 const nodes=[],doc={createElement(tag){const n={tag,attrs:{},children:[],textContent:'',setAttribute(k,v){this.attrs[k]=String(v);},removeAttribute(k){delete this.attrs[k];},append(...xs){this.children.push(...xs);}};nodes.push(n);return n;}};
 const view=createProgressView(doc,'status-');
 return {view,bar:nodes.find(n=>n.tag==='progress')};
}
test('confirmed completion retains a full accent bar and a qualified accessible value',()=>{
 const t=createProgressTracker(),{view,bar}=fixture();t.begin(1);t.collect(1,{families:2,relations:3,target:4});view.update(t.get());
 t.verify(1);t.finish(1,'result','complete',true);view.update(t.get());
 assert.equal(bar.attrs.value,'1');assert.equal(bar.attrs['data-complete'],'true');assert.match(bar.attrs['aria-valuetext'],/分解完了/);
 for(let i=0;i<3;i++)view.update(t.get());assert.equal(bar.attrs.value,'1');
 assert.equal(t.collect(1,{families:4,relations:4,target:4}),false);
});
for(const status of ['incomplete','cancelled','blocked',undefined]){
 test('terminal '+status+' never presents confirmed completion',()=>{
  const t=createProgressTracker(),{view,bar}=fixture();t.begin(1);t.collect(1,{families:2,relations:3,target:4});
  t.finish(1,status==='blocked'?'blocked':'result',status);view.update(t.get());
  assert.equal(bar.attrs.value,'0');assert.equal(bar.attrs['data-complete'],'false');assert.doesNotMatch(bar.attrs['aria-valuetext'],/分解完了/);
 });
}
test('neither is a finished classification without inventing prime factors',()=>{
 const t=createProgressTracker(),{view,bar}=fixture();t.begin(1);t.finish(1,'result','neither',true);view.update(t.get());
 assert.equal(bar.attrs.value,'1');assert.match(bar.attrs['aria-valuetext'],/判定完了/);
});
test('retry, invalid input, loading and reset clear old completion',()=>{
 const t=createProgressTracker(),{view,bar}=fixture();t.begin(1);t.finish(1,'result','complete',true);view.update(t.get());
 t.begin(2);view.update(t.get());assert.equal(bar.attrs.value,undefined);assert.equal(bar.attrs['data-complete'],'false');
 assert.equal(t.finish(1,'result','complete',true),false);assert.equal(t.get().stage,'running');
 t.finish(2,'error');view.update(t.get());assert.equal(bar.attrs.value,'0');
 for(const phase of ['ready','invalid','loading','error','blocked']){view.update(null,{phase});assert.equal(bar.attrs['data-complete'],'false');assert.notEqual(bar.attrs.value,'1');}
 t.reset();view.update(t.get());assert.equal(bar.attrs.value,'0');
});
test('terminal CSS preserves the accent only for confirmed completion',async()=>{
 const css=await readFile(new URL('../../src/site/tool.css',import.meta.url),'utf8');
 assert.match(css,/progress\[data-terminal="true"\]\[data-complete="false"\]/);
});
test('factor states are concise and preserve multiplicity and uncertainty in display and copy',()=>{
 const p=sitePresentation({equation:'n = factors',statusText:'未完了',reasonText:'検算の時間上限',groups:[{base:'2',exponent:3,certainty:'proven'},{base:'18446744073709551629',exponent:1,certainty:'probable'}],pendingGroups:[{value:'97',exponent:2,certainty:'unknown'},{value:'143',exponent:1,certainty:'composite'}]});
 assert.deepEqual(p.factorRows.map(r=>r.text),['2（3乗）: 素数（確定）','18446744073709551629: 素数判定を通過（未証明）','97（2乗）: 不明','143: 合成数（未分解）']);
 assert.ok(p.factorRows.every(r=>!r.reason));assert.match(p.copyText,/97（2乗）: 不明/);assert.match(p.copyText,/検算の時間上限/);assert.doesNotMatch(p.copyText,/固定基底|判定の対象|素数証明はしていません/);
});
test('unknown future certainty is never promoted to prime',()=>{
 const p=sitePresentation({groups:[{base:'97',exponent:1,certainty:'unrecognized'}]});
 assert.equal(p.factorRows[0].text,'97: 不明');
});

test('normal probable completion fills the bar without asserting a prime proof',()=>{
 const t=createProgressTracker(),{view,bar}=fixture();t.begin(1);t.finish(1,'result','probable',true);view.update(t.get());
 assert.equal(bar.attrs.value,'1');assert.equal(bar.attrs['data-complete'],'true');assert.match(bar.attrs['aria-valuetext'],/処理完了.*未証明/);assert.doesNotMatch(bar.attrs['aria-valuetext'],/すべて.*確定/);
});
for(const status of ['complete','probable','neither'])test('abnormal execution cannot fill a mathematically '+status+' result',()=>{
 const t=createProgressTracker(),{view,bar}=fixture();t.begin(1);t.finish(1,'result',status,false);view.update(t.get());
 assert.equal(bar.attrs.value,'0');assert.equal(bar.attrs['data-complete'],'false');assert.match(bar.attrs['aria-valuetext'],/停止/);
});

import test from 'node:test';import assert from 'node:assert/strict';
import {formatElapsed,sitePresentation,sampleInputs,copyResult} from '../../src/site/presentation.js';
test('actual duration preserves subsecond resolution and differs from a budget',()=>{
 assert.equal(formatElapsed(0),'0 ms');assert.equal(formatElapsed(0.24),'<1 ms');assert.equal(formatElapsed(32.4),'32 ms');
 assert.equal(formatElapsed(1250),'1.25 秒');assert.equal(formatElapsed(2220175),'2220.18 秒');
});
test('visible equation contains no repeated completion and copied partial result keeps its state',()=>{
 const p=sitePresentation({equation:'35 = 5 × [未解決: 7]',statusText:'未完了です。',reasonText:'時間制限',certaintyText:'5: 確定判定'});
 assert.equal(p.equation,'35 = 5 × [未解決: 7]');assert.equal(p.copyText,'35 = 5 × [未解決: 7]\n未完了です。\n時間制限\n因子の確度: 5: 確定判定');
 assert.equal(p.details,'5: 確定判定');
});
test('samples are finite exact strings and only specify an input, not execution',()=>{
 assert.ok(sampleInputs.length>=3);for(const x of sampleInputs){assert.match(x.value,/^[0-9]+$/);assert.ok(x.label.length>5);assert.deepEqual(Object.keys(x).sort(),['label','value']);}
});
test('clipboard writes only on explicit request; unsupported and denial preserve manual text',async()=>{
 const text='35 = [未解決: 35]\n中止しました。';let writes=0;
 const api={writeText:async x=>{writes++;assert.equal(x,text);}};
 assert.equal(writes,0);assert.equal(await copyResult(text,api),true);assert.equal(writes,1);
 assert.equal(await copyResult(text,undefined),false);
 assert.equal(await copyResult(text,{writeText:async()=>{throw Error('denied');}}),false);
});

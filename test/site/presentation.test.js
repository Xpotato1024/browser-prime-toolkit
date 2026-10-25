import test from 'node:test';import assert from 'node:assert/strict';
import {formatElapsed,sitePresentation,executionPresentation,sampleInputs,copyResult} from '../../src/site/presentation.js';
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
test('measured elapsed is separate from route limits, never measured memory or worker usage',()=>{
 const p=executionPresentation({actualTimeBudgetMs:1000,route:'brent',actualWorkers:1,actualWasmBytes:0},30);
 assert.equal(p.elapsed,'30 ms');assert.deepEqual(p.limits,[['時間上限','1秒'],['計算経路','brent'],['経路のWorker上限','1'],['経路のWASM上限','この計算では使わない']]);
 assert.match(p.measurementNote,/初期化.*検証.*解放/);assert.match(p.measurementNote,/初回.*含みません/);assert.match(p.limitsNote,/測定値ではありません/);
 const configured=executionPresentation({configuredPlan:{budgetBytes:134217728},actualTimeBudgetMs:1000,route:'brent',actualWorkers:1,actualWasmBytes:0},30);assert.deepEqual(configured.limits[0],['選択したWASM予算','128 MiB']);assert.deepEqual(configured.limits.at(-1),['経路のWASM上限','この計算では使わない']);
 assert.equal(executionPresentation(null,30),null);
});
test('factor rows preserve multiplicities, probable status, residual and stop reason in copy',()=>{
 const value='9'.repeat(100),p=sitePresentation({equation:'input = result',statusText:'未完了',reasonText:'時間制限',groups:[{base:'2',exponent:12,certainty:'proven'},{base:value,exponent:1,certainty:'probable'}],residual:'35'});
 assert.equal(p.factorRows.length,2);assert.equal(p.factorRows[0].text,'2（12乗）: 確定判定');assert.equal(p.factorRows[1].value,value);assert.match(p.factorRows[1].text,/未証明（probable）/);assert.equal(p.residual,'35');
 assert.match(p.copyText,/時間制限\n因子の判定:\n2（12乗）: 確定判定 — /);assert.ok(p.copyText.includes(value));assert.match(p.copyText,/未解決の余因子: 35/);assert.match(p.factorRows[1].reason,/素数証明はしていません/);
});
test('many groups stay separate and neither-prime-nor-composite has no invented factor',()=>{
 const groups=Array.from({length:20},(_,i)=>({base:String(i+2),exponent:1,certainty:'proven'}));
 assert.equal(sitePresentation({equation:'x',groups,residual:null}).factorRows.length,20);
 const neither=sitePresentation({equation:'0 = 0',statusText:'素数でも合成数でもありません',groups:[],residual:null});assert.deepEqual(neither.factorRows,[]);assert.equal(neither.residual,null);
});
test('clipboard writes only on explicit request; unsupported and denial preserve manual text',async()=>{
 const text='35 = [未解決: 35]\n中止しました。';let writes=0;
 const api={writeText:async x=>{writes++;assert.equal(x,text);}};
 assert.equal(writes,0);assert.equal(await copyResult(text,api),true);assert.equal(writes,1);
 assert.equal(await copyResult(text,undefined),false);
 assert.equal(await copyResult(text,{writeText:async()=>{throw Error('denied');}}),false);
});

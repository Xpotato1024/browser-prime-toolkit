import test from 'node:test';import assert from 'node:assert/strict';
import {inputGuidance} from '../../src/site/guidance.js';import {siteInputLimit,selectSitePlan} from '../../src/site/policy.js';
test('explanation distinguishes input notation, numeric range, resource plans and result handling',()=>{
 assert.deepEqual(inputGuidance.map(g=>g.title),['入力形式','計算範囲','実行資源と端末の負荷','結果の扱い']);
 assert.match(inputGuidance[0].text,new RegExp(String(siteInputLimit().maxTextLength)));assert.match(inputGuidance[0].text,/切り詰めず/);assert.match(inputGuidance[1].text,/309.*1024.*128.*100.*332/);
 const manual=selectSitePlan('optimized',{mode:'manual',workers:6,memoryMiB:768,timeBudgetMs:600000}),automatic=selectSitePlan('optimized',{}, {hardwareConcurrency:16,deviceMemory:8}),wide=selectSitePlan('wide',{mode:'manual',workers:5,memoryMiB:1536,timeBudgetMs:3600000});
 const resources=inputGuidance[2].items.join(' ');assert.match(resources,new RegExp('自動配分は最大'+automatic.workers));assert.match(resources,new RegExp('手動配分は最大'+manual.workers));assert.match(resources,new RegExp('最大'+wide.workers+' Worker'));assert.match(inputGuidance[2].text,/実使用量の測定値ではありません.*RAM/);assert.match(inputGuidance[3].text,/未分解・未証明.*1件.*履歴.*コピー/);
});

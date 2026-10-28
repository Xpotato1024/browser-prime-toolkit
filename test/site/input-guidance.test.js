import test from 'node:test';
import assert from 'node:assert/strict';
import {siteInputLimit,validateSiteInput} from '../../src/site/policy.js';
import {createSiteSession} from '../../src/site/session.js';

test('visible mode guidance matches exact numeric acceptance at boundaries',()=>{
 const standard=(1n<<1024n)-1n,high=(1n<<332n)-1n;
 assert.equal(siteInputLimit('standard').maxDigits,309);assert.equal(siteInputLimit('standard').maxTextLength,4096);assert.match(siteInputLimit('standard').text,/309.*1024/);
 for(const engine of ['optimized','wide']){assert.equal(siteInputLimit(engine).maxDigits,100);assert.match(siteInputLimit(engine).text,/100.*332/);assert.equal(validateSiteInput(high.toString(),engine),high.toString());assert.throws(()=>validateSiteInput((high+1n).toString(),engine));assert.throws(()=>validateSiteInput('9'.repeat(100),engine));}
 assert.equal(validateSiteInput(standard.toString(),'standard'),standard.toString());assert.throws(()=>validateSiteInput((standard+1n).toString(),'standard'));
 assert.equal(validateSiteInput('0'.repeat(4000)+'32','standard'),'32');assert.equal(validateSiteInput('0'.repeat(4096),'standard'),'0');assert.throws(()=>validateSiteInput('0'.repeat(4097),'standard'),{code:'INPUT_TOO_LONG'});
 assert.equal(validateSiteInput('  +3.20e1  ','standard'),'32');assert.throws(()=>validateSiteInput('2.5','standard'),{code:'NOT_AN_INTEGER'});assert.equal(validateSiteInput('9007199254740993','standard'),'9007199254740993');
});

test('input errors and resource errors have separate targets before dispatch',async()=>{
 let dispatch=0;const s=createSiteSession({loadLight:async()=>({selectValidatedStagedPlan(){throw Error('must not plan invalid input');}}),loadHeavy:async()=>({runRusqsieve(){dispatch++;}})});
 await s.prepare();assert.equal(await s.start('2.5'),false);assert.equal(s.getState().errorField,'input');assert.match(s.getState().error,/整数/);assert.doesNotMatch(s.getState().error,/Worker|WASM/);
 assert.equal(await s.start('0'.repeat(4097)),false);assert.match(s.getState().error,/4096/);
 assert.equal(await s.start((1n<<1024n).toString()),false);assert.match(s.getState().error,/1024/);
 await s.prepare('optimized');assert.equal(await s.start((1n<<128n).toString(),{mode:'manual',workers:6,memoryMiB:128,timeBudgetMs:1000}),false);assert.equal(s.getState().errorField,'settings');assert.match(s.getState().error,/設定/);assert.equal(dispatch,0);s.dispose();
});

test('invalid selected manual budget is not rewritten as a valid small-route budget',async()=>{
 let plans=0;const s=createSiteSession({loadLight:async()=>({selectValidatedStagedPlan(){plans++;throw Error('must reject selected settings first');}}),loadHeavy:async()=>({})});await s.prepare('optimized');assert.equal(await s.start('32',{mode:'manual',workers:1,memoryMiB:1536,timeBudgetMs:1000}),false);assert.equal(s.getState().errorField,'settings');assert.equal(s.getState().resources,null);assert.equal(plans,0);s.dispose();
});

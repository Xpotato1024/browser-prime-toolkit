import test from 'node:test';import assert from 'node:assert/strict';import {readFile}from'node:fs/promises';
import {SITE_CAPABILITIES}from'../../src/site/capabilities.js';import{siteInputLimit,validateSiteInput,selectSitePlan}from'../../src/site/policy.js';
test('exported mode metadata and input policy share the profile-specific exact bounds',()=>{assert.equal(SITE_CAPABILITIES.input.maxTextLength,4096);assert.deepEqual(SITE_CAPABILITIES.modes.map(m=>[m.id,m.maxDigits,m.maxBits,m.timeBudgetMaxMs]),[['standard',309,1024,60000],['optimized',100,332,600000],['wide',121,400,3600000]]);for(const m of SITE_CAPABILITIES.modes){assert.equal(siteInputLimit(m.id).maxDigits,m.maxDigits);const last=(1n<<BigInt(m.maxBits))-1n;assert.equal(validateSiteInput(last.toString(),m.id),last.toString());assert.throws(()=>validateSiteInput((last+1n).toString(),m.id));}assert.equal(SITE_CAPABILITIES.completionGuaranteed,false);assert.ok(Object.isFrozen(SITE_CAPABILITIES.modes[0]));assert.throws(()=>SITE_CAPABILITIES.modes[0].maxBits=1);});
test('advertised time caps agree with actual plans without increasing any budget',()=>{for(const m of SITE_CAPABILITIES.modes){const s=m.id==='wide'?{mode:'manual',workers:1,memoryMiB:1536,timeBudgetMs:m.timeBudgetMaxMs}:{timeBudgetMs:m.timeBudgetMaxMs};assert.equal(selectSitePlan(m.id,s).timeBudgetMs,m.timeBudgetMaxMs);}assert.equal(selectSitePlan('wide',{mode:'manual',memoryMiB:1536,timeBudgetMs:3600000},{},true).timeBudgetMs,60000);});
test('tool CSS owns body/summary typography and exposes finite sizing fallbacks',async()=>{let css=await readFile(new URL('../../src/site/tool.css',import.meta.url),'utf8');for(const v of ['--bt-font-size','--bt-line-height','--bt-summary-font-size','--bt-summary-font-weight','--bt-help-font-size','--bt-control-min-size'])assert.ok(css.includes('var('+v+','),v);assert.match(css,/\.bt-prime-factorizer summary[^}]*font-size:var\(--bt-summary-font-size,1rem\)/);});

test('small-input routing metadata describes the existing clamp without inferring a different engine',()=>{assert.deepEqual(SITE_CAPABILITIES.smallInputRoute,{modeId:'standard',exclusiveUpperPowerOfTwo:128,timeBudgetMaxMs:60000});assert.equal(selectSitePlan('optimized',{timeBudgetMs:600000},{},true).timeBudgetMs,SITE_CAPABILITIES.smallInputRoute.timeBudgetMaxMs);});

test('raw text, parser normalization and public numeric acceptance remain separate',async()=>{
 const {parseIntegerInput}=await import('../../src/core/integer-input.js');
 assert.equal(parseIntegerInput('1e100').canonical.length,101);
 assert.equal(parseIntegerInput('1e1023').canonical.length,1024);
 for(const mode of ['standard','optimized','wide']){
  if(mode!=='optimized')assert.equal(validateSiteInput('1e100',mode),'1'+'0'.repeat(100));else assert.throws(()=>validateSiteInput('1e100',mode));
  if(mode==='optimized')assert.throws(()=>validateSiteInput('1'+'0'.repeat(100),mode));
  assert.equal(validateSiteInput('0'.repeat(4096),mode),'0');
  assert.equal(validateSiteInput('0'.repeat(4000)+'3.2e1',mode),'32');
  assert.throws(()=>validateSiteInput('0'.repeat(4097),mode),{code:'INPUT_TOO_LONG'});
  assert.throws(()=>validateSiteInput('1e10001',mode),{code:'EXPONENT_OUT_OF_RANGE'});
 }
});

test('333/400bit inputs require the explicit experimental wide profile',()=>{
 for(const bits of [333,400]){
  const input=(1n<<BigInt(bits-1)).toString();
  assert.equal(validateSiteInput(input,'standard'),input);
  assert.throws(()=>validateSiteInput(input,'optimized'));assert.equal(validateSiteInput(input,'wide'),input);
 }
});

// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Xpotato.net / Xpotato1024
import test from 'node:test';
import assert from 'node:assert/strict';
import {dlpProfile,validateDlpConfiguration,validateDlpStats,validateDlpTimings} from '../src/rusqsieve-dlp/contracts.js';
const config=(profile='baseline')=>({version:1,profile,bits:330,factorBaseBound:3250000,intervalHalfWidth:524288,singleLimit:'471250000',doubleLimit:(3250000n**2n*BigInt({baseline:1035,half:512,quarter:256}[profile])).toString(),lpBits:{baseline:54,half:53,quarter:52}[profile],thresholdAdjustment:-23,factorBaseSize:116448});
const stats=()=>({full:3,slp:7,dlp:10,cycles:2,vertices:12,treeEdges:9,usable:5,ingested:20});
const times=()=>({prepareMs:10,sieveMs:20,copyFreeMs:1,framingMs:1,submitMs:2,observeMs:1,extractMs:0});
test('only three named DLP profiles are accepted',()=>{
 assert.deepEqual(['baseline','half','quarter'].map(dlpProfile),[0,1,2]);
 for(const p of ['__proto__','constructor','512',512,null,undefined,{},'other'])assert.throws(()=>dlpProfile(p));
});
test('native RSA configuration preserves B/interval/offset and automatic threshold coupling',()=>{
 for(const p of ['baseline','half','quarter'])assert.doesNotThrow(()=>validateDlpConfiguration(config(p),p,330));
});
test('configuration mismatch and independent threshold changes are rejected',()=>{
 for(const [key,value]of [['factorBaseBound',2600000],['intervalHalfWidth',262144],['singleLimit','1'],['doubleLimit','10932187500000001'],['lpBits',53],['thresholdAdjustment',-22],['bits',329],['profile','half']]){
  assert.throws(()=>validateDlpConfiguration({...config(),[key]:value},'baseline',330),key);
 }
});
test('collector full plus cycles equals usable; ingested rows remain bounded',()=>{
 assert.equal(validateDlpStats(stats(),null,20,5),undefined);
 for(const patch of [{usable:6},{ingested:21},{cycles:18,usable:21},{treeEdges:18},{vertices:36},{full:-1},{slp:NaN}]){
  assert.throws(()=>validateDlpStats({...stats(),...patch},null,20,5));
 }
 assert.throws(()=>validateDlpStats(stats(),{...stats(),cycles:3},20,5));
});
test('per-owner cumulative wrapper timings are finite, bounded and monotonic',()=>{
 assert.equal(validateDlpTimings(times()),undefined);
 for(const patch of [{sieveMs:-1},{observeMs:Infinity},{extractMs:600001},{sieveMs:599999,submitMs:10001}])assert.throws(()=>validateDlpTimings({...times(),...patch}));
 assert.throws(()=>validateDlpTimings(times(),{...times(),sieveMs:21}));
});

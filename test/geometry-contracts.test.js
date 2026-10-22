// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Xpotato.net / Xpotato1024
import test from 'node:test';import assert from 'node:assert/strict';
import {geometryProfile,validateGeometryConfiguration} from '../src/rusqsieve-geometry/contracts.js';
const aDistribution={version:1,multiplier:1,q2:false,targetBits:140,factorCount:13,allCount:1000,poolCount:500,variants:2048,samples:Array.from({length:64},(_,family)=>({family,bits:140,ratioMilli:1000}))};
function config(profile){const p=geometryProfile(profile),b=BigInt(p.B);return{version:1,profile,bits:330,factorBaseBound:p.B,intervalHalfWidth:p.halfwidth,singleLimit:(145n*b).toString(),doubleLimit:(1035n*b*b).toString(),lpBits:(1035n*b*b).toString(2).length,thresholdAdjustment:-23,factorBaseSize:100000,aDistribution:structuredClone(aDistribution)};}
test('four named geometries enforce coupled native LP bounds and signed threshold',()=>{
 for(const name of ['b325-m524','b250-m524','b325-m262','b250-m262']){const c=config(name);validateGeometryConfiguration(c,name,330);for(const key of ['factorBaseBound','intervalHalfWidth','singleLimit','doubleLimit','lpBits','thresholdAdjustment']){const bad=structuredClone(c);bad[key]=key.endsWith('Limit')?'1':1;assert.throws(()=>validateGeometryConfiguration(bad,name,330));}}
 for(const x of ['baseline','__proto__','constructor',null,2])assert.throws(()=>geometryProfile(x));
});
test('A observations require bounded ordered samples and explicit quantization',()=>{
 for(const alter of [a=>a.samples.pop(),a=>a.samples[1].family=0,a=>a.samples[0].ratioMilli=Infinity,a=>a.variants=0,a=>a.multiplier=0]){const c=config('b325-m524');alter(c.aDistribution);assert.throws(()=>validateGeometryConfiguration(c,c.profile,330));}
});

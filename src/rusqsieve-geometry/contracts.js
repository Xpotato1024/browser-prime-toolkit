// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Xpotato.net / Xpotato1024
import {validateDlpConfiguration as baselineConfiguration} from '../rusqsieve-dlp/contracts.js';
const geometries=Object.freeze({'b325-m524':Object.freeze({code:0,B:3250000,halfwidth:524288}),'b250-m524':Object.freeze({code:1,B:2500000,halfwidth:524288}),'b325-m262':Object.freeze({code:2,B:3250000,halfwidth:262144}),'b250-m262':Object.freeze({code:3,B:2500000,halfwidth:262144})});
export function geometryProfile(name){if(typeof name!=='string'||!Object.hasOwn(geometries,name))throw Error('Named geometry required');return geometries[name];}
export function validateGeometryConfiguration(c,profile,bits){
 const p=geometryProfile(profile),integer=(n,min,max)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
 if(!c||c.version!==1||c.profile!==profile||c.bits!==bits||!integer(c.factorBaseSize,1,1000000))throw Error('Geometry configuration identity');
 for(const k of ['singleLimit','doubleLimit'])if(typeof c[k]!=='string'||!/^(0|[1-9][0-9]{0,19})$/.test(c[k]))throw Error('Bound encoding');
 if(bits>=321&&bits<=333){
  const b=BigInt(p.B),double=1035n*b*b;
  if(c.factorBaseBound!==p.B||c.intervalHalfWidth!==p.halfwidth||c.singleLimit!==(145n*b).toString()||c.doubleLimit!==double.toString()||c.lpBits!==double.toString(2).length||c.thresholdAdjustment!==-23)throw Error('Coupled geometry/LP/threshold');
 }else baselineConfiguration({...c,profile:'baseline'},'baseline',bits);
 const a=c.aDistribution;
 if(!a||a.version!==1||!integer(a.multiplier,1,10000)||typeof a.q2!=='boolean'||!integer(a.targetBits,1,1024)||!integer(a.factorCount,2,32)||!integer(a.allCount,1,1000000)||!integer(a.poolCount,1,a.allCount)||!integer(a.variants,1,4096)||(a.variants&(a.variants-1))||!Array.isArray(a.samples)||a.samples.length!==64)throw Error('Bounded native A observation');
 for(let i=0;i<64;i++){const x=a.samples[i];if(x.family!==i||!integer(x.bits,1,1024)||!integer(x.ratioMilli,0,1000000))throw Error('Ordered quantized A sample');}
 return c;
}

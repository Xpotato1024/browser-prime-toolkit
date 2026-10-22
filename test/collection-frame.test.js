// SPDX-License-Identifier: AGPL-3.0-only
import test from 'node:test';
import assert from 'node:assert/strict';
import {validateCollectionFrame} from '../src/collection-profile/bridge.js';
const frame=()=>({version:1,sequence:1,type:'batch',instrumented:true,rows:Array.from({length:16},()=>[2,1,1]),status:[0,0,32,2,0.1,2000000]});
test('diagnostic side frames reject invalid scopes, clocks, excess capacity and regressions',()=>{
 assert.equal(validateCollectionFrame(frame(),'instrumented'),true);
 for(const change of [d=>d.status[0]=1,d=>d.status[1]=1,d=>d.status[2]=2000001,d=>d.rows[0][1]=3,d=>d.rows.push([0,0,0]),d=>d.extra=true,d=>d.sequence=2,d=>d.rows[0][0]=NaN]){const d=frame();change(d);assert.throws(()=>validateCollectionFrame(d,'instrumented'));}
 const a=frame(),b=frame();b.sequence=2;b.rows[0][2]=0;assert.throws(()=>validateCollectionFrame(b,'instrumented',a));
 assert.equal(validateCollectionFrame({version:1,sequence:1,type:'ready',instrumented:false,rows:null,status:null},'baseline'),true);
 assert.throws(()=>validateCollectionFrame(frame(),'baseline'));
});

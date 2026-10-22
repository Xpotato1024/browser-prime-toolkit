// SPDX-License-Identifier: AGPL-3.0-only
import test from 'node:test';
import assert from 'node:assert/strict';
import {longWorkerSource} from '../src/long-window/worker-source.js';
import {LONG_LIMITS} from '../src/long-window/budget.js';
test('one-owner maximum family range stays within the snapshot retention contract',()=>{
 const s=longWorkerSource(256),fn=s.slice(s.lastIndexOf('function graphSnapshot(){')).split('\n')[0];
 const api={codex_graph_profile:()=>1},take=()=>new Uint8Array(164);
 const run=Function('api','take','count','let role="coord",session=1,graphSequence=0,graphPrefix=0;'+fn+';let snapshots=0;for(let i=0;i<count;i++)if(graphSnapshot().graphProfile)snapshots++;return snapshots;');
 assert.ok(run(api,take,1+2*LONG_LIMITS.maxFamilies)<=LONG_LIMITS.maxGraphSnapshots);
});

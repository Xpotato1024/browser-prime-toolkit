// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Xpotato.net / Xpotato1024
import test from 'node:test';import assert from 'node:assert/strict';
import {OwnerClock,PacketAudit} from '../src/rusqsieve-scheduler/metrics.js';
test('host state accounting separates useful assigned work from credit-blocked idle',()=>{
 const c=new OwnerClock(2,100),o=[{job:{},command:'job'},{job:{},command:'job'}];
 c.transition(100,o,[1,1],1);o[1].job=null;o[1].command=null;c.transition(110,o,[1,1],1);
 o[0].job=null;o[0].command='submit';c.transition(125,o,[1,1],1);
 c.finish(130);const r=c.result();assert.equal(r.collectionWindowMs,30);
 assert.deepEqual(r.owners[1].states,{assignedMs:10,submitMs:0,blockedIdleMs:20,idleMs:0});
 assert.equal(r.owners[0].states.submitMs,5);assert.equal(r.owners[1].assignedRatio,1/3);
});
test('ahead credit keeps a producer assigned while an older packet remains pending',()=>{
 const c=new OwnerClock(1,0),o=[{job:null,command:null}];c.transition(0,o,[1],2);
 o[0].job={};o[0].command='job';c.transition(1,o,[2],2);c.finish(11);
 const r=c.result().owners[0];assert.equal(r.states.blockedIdleMs,0);assert.equal(r.states.assignedMs,10);assert.equal(r.states.idleMs,1);
 assert.throws(()=>new OwnerClock(3,0));const d=new OwnerClock(1,10);assert.throws(()=>d.finish(9));
});
test('captured packets own bounded copies and reject duplicate/oversized audit retention',()=>{
 const a=new PacketAudit(true),b=new Uint8Array(12);a.add({first:0,count:1},b);b[0]=9;
 assert.equal(a.packets[0].bytes[0],0);assert.throws(()=>a.add({first:0,count:1},b));
 assert.throws(()=>a.add({first:1,count:1},new Uint8Array(8388608)));
 assert.equal(a.bytes,12);assert.equal(a.packets.length,1);
 const off=new PacketAudit(false);off.add({first:0,count:1},b);assert.equal(off.bytes,0);
});

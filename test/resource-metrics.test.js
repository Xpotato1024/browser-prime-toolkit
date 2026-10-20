import test from 'node:test';import assert from 'node:assert/strict';
import {OwnerClock} from '../src/resources/metrics.js';
test('global reservation wait is separated from per-owner credit and assigned wall time',()=>{
 const c=new OwnerClock(4,0),idle=Array.from({length:4},()=>({job:null,command:null}));
 c.transition(0,idle,[1,1,1,1],2,33554432);c.advance(10);
 c.transition(10,[{command:'submit'},...idle.slice(1)],[1,2,0,1],2,0);c.finish(20);
 const r=c.result();assert.equal(r.owners[0].states.globalCapacityIdleMs,10);assert.equal(r.owners[0].states.submitMs,10);
 assert.equal(r.owners[1].states.blockedIdleMs,10);assert.equal(r.owners[2].states.idleMs,10);
 for(const o of r.owners)assert.equal(Object.values(o.states).reduce((a,b)=>a+b,0),20);
});

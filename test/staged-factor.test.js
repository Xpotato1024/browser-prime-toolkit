import test from 'node:test';
import assert from 'node:assert/strict';
import {factorStaged} from '../src/engine/staged-factor.js';
import {BudgetExceeded} from '../src/engine/options.js';
const p=1000000000039n,q=1000000000061n,n=p*q;
const exhaust=(n,b)=>{while(true)b.tick();};
test('prefix exhaustion advances with one global operation total and stable ECM curve-budget identity',()=>{
 let identity,calls=0;
 const r=factorStaged(n*1009n,{mode:'p64',timeBudgetMs:1000,operationBudget:100000},{
  now:()=>0,splitBrent:exhaust,splitEcm(value,b){if(identity)assert.equal(identity,b);identity=b;b.tick();return ++calls===1?1009n:null;},splitSiqs(value,b){b.tick();return p;}
 });
 assert.equal(r.status,'complete');assert.ok(r.operations>50000&&r.operations<100000);
 assert.deepEqual(r.stages.map(s=>s.stage),['brent-prefix','ecm-prefix','ecm-prefix','siqs']);
 assert.equal(r.grants[0].operations,50000);assert.equal(r.grants[1].operations,2);
});
test('probable, global exhaustion and SIQS resource exhaustion retain their meanings',()=>{
 const m89=(1n<<89n)-1n;
 const r=factorStaged(1009n*m89,{mode:'p64'},{now:()=>0,splitBrent:()=>1009n});
 assert.equal(r.status,'probable');assert.equal(r.factors.find(f=>f.value===m89.toString()).certainty,'probable');
 const short=factorStaged(n,{mode:'p64',operationBudget:20},{now:()=>0,splitBrent:exhaust});
 assert.equal(short.status,'incomplete');assert.equal(short.reason,'operation-budget');assert.equal(short.remaining,n.toString());
 const resource=factorStaged(n,{mode:'siqs'},{now:()=>0,splitSiqs(){throw new BudgetExceeded('algorithm-resource');}});
 assert.equal(resource.reason,'algorithm-resource');assert.equal(resource.remaining,n.toString());
});
test('fatal backend failure is never hidden by another method',()=>{
 let fallback=false;
 assert.throws(()=>factorStaged(n,{mode:'p64'},{now:()=>0,splitBrent:exhaust,splitEcm(){throw Error('fatal');},splitSiqs(){fallback=true;return p;}}),/fatal/);
 assert.equal(fallback,false);
});

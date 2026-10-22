import assert from 'node:assert/strict';
const budgets=[3000,30000,180000];
const stat=values=>{
 if(!values.length)return null;assert.ok(values.every(v=>Number.isFinite(v)&&v>=0));
 const x=values.slice().sort((a,b)=>a-b),n=x.length;
 return{count:n,median:n%2?x[(n-1)/2]:(x[n/2-1]+x[n/2])/2,min:x[0],max:x.at(-1)};
};
export function summarizeTier({digits,cases,seeds,trials}){
 assert.equal(cases.length,2);assert.equal(seeds.length,2);const pairs=[];
 for(const c of cases)for(const seed of seeds){
  const attempts=trials.filter(t=>t.id===c.id&&t.seed===seed).sort((a,b)=>a.budgetMs-b.budgetMs);assert.ok(attempts.length);
  attempts.forEach((t,i)=>{assert.equal(t.budgetMs,budgets[i]);assert.equal(t.digits,digits);assert.ok(['factorized','timeout'].includes(t.kind));if(i)assert.equal(attempts[i-1].kind,'timeout');});
  const terminal=attempts.at(-1);assert.ok(terminal.kind==='factorized'||terminal.budgetMs===180000);
  pairs.push({id:c.id,seed,firstSuccessfulBudgetMs:terminal.kind==='factorized'?terminal.budgetMs:null,
   successfulRequestWallMs:terminal.kind==='factorized'?terminal.requestWallMs:null,
   effortToFirstSuccessMs:terminal.kind==='factorized'?attempts.reduce((n,t)=>n+t.requestWallMs,0):null,
   attempts:attempts.length,terminalKind:terminal.kind});
 }
 const solved=budget=>pairs.filter(p=>p.firstSuccessfulBudgetMs!==null&&p.firstSuccessfulBudgetMs<=budget).length;
 return{digits,inputs:2,seeds,fixedInputSeedPairs:4,
  cumulativeSolvedByBudget:budgets.map(b=>({budgetMs:b,solved:solved(b),notSolved:4-solved(b)})),
  actualTrialCountsByBudget:budgets.map(b=>({budgetMs:b,trials:trials.filter(t=>t.digits===digits&&t.budgetMs===b).length})),
  successfulRequestWallMs:stat(pairs.map(p=>p.successfulRequestWallMs).filter(x=>x!==null)),
  successfulEffortIncludingRetriesMs:stat(pairs.map(p=>p.effortToFirstSuccessMs).filter(x=>x!==null)),
  timedOutAttempts:trials.filter(t=>t.digits===digits&&t.kind==='timeout').length,terminalUnsolvedPairs:4-solved(180000),pairs};
}

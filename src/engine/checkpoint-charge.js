import {BudgetExceeded} from './options.js';
// Private experiment; the existing Budget/core and all historical artifacts stay fixed.
export function makeCheckpointCharger(budget) {
  if(!budget||!Number.isSafeInteger(budget.operations)||!budget.options||
    typeof budget.now!=='function'||typeof budget.pulse!=='function')throw TypeError('Invalid checkpoint budget');
  let phase=0,gap=0,clockReads=0,logical=0,maxClockGap=0;
  function charge(count,nextPhase,clock=true,force=false) {
    if(!Number.isSafeInteger(count)||count<0||count>64||!Number.isInteger(nextPhase)||nextPhase<1||nextPhase>6)
      throw TypeError('Invalid checkpoint');
    if(count>budget.options.operationBudget-budget.operations)throw new BudgetExceeded('operation-budget');
    budget.operations+=count;logical+=count;gap+=count;
    const changed=nextPhase!==phase;phase=nextPhase;
    if(clock&&(force||changed||gap>=64||count===0)) {
      maxClockGap=Math.max(maxClockGap,gap);gap=0;clockReads++;
      const time=budget.now();
      if(time-budget.started>=budget.options.timeBudgetMs)throw new BudgetExceeded('time-budget');
      if(time-budget.lastPulse>=100){budget.lastPulse=time;budget.pulse();}
    }
  }
  return {charge,finish:()=>charge(0,phase||1),
    stats:()=>({logical,clockReads,maxClockGap,pendingClockGap:gap})};
}

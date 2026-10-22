import {BudgetExceeded} from '../engine/options.js';
export function failFullNative(error,{reason,abortReason,account}){
 let accountingError=null;
 try{account();}catch(next){accountingError=next;}
 const known=error instanceof BudgetExceeded||reason===2||reason===3||reason===4||abortReason==='OOM';
 if(!known||reason===5||reason===6)throw error;
 if(accountingError&&!(accountingError instanceof BudgetExceeded))throw accountingError;
 if(error instanceof BudgetExceeded)throw error;
 if(reason===2)throw new BudgetExceeded('operation-budget');
 if(reason===3||reason===4||abortReason==='OOM')throw new BudgetExceeded('algorithm-resource');
 throw error;
}

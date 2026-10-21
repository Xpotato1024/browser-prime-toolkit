// SPDX-License-Identifier: AGPL-3.0-only
// Explicit experiment only. The ordinary selector remains capped at 600 seconds.
const MiB=1048576,keys=['mode','workers','memoryMiB','timeBudgetMs','outstandingSlots'];
export function selectResourcePlan(settings={}){
 if(!settings||typeof settings!=='object'||Array.isArray(settings)||Object.keys(settings).some(k=>!keys.includes(k)))throw Error('Unknown long resource settings');
 const {mode='manual',workers=5,memoryMiB=512,timeBudgetMs=1800000,outstandingSlots=8}=settings;
 if(mode!=='manual'||!Number.isInteger(workers)||workers<1||workers>5||memoryMiB!==512||!Number.isSafeInteger(timeBudgetMs)||timeBudgetMs<1||timeBudgetMs>1800000||![4,8].includes(outstandingSlots))throw Error('Finite long resource settings required');
 const ownerCapsMiB=[256,...Array(workers-1).fill(64)],totalWasmBytes=ownerCapsMiB.reduce((n,x)=>n+x,0)*MiB;
 if(totalWasmBytes>512*MiB)throw Error('Long WASM allocation cap');
 return Object.freeze({version:37,mode,workers,budgetBytes:512*MiB,ownerCapsMiB:Object.freeze(ownerCapsMiB),totalWasmBytes,transportBytes:outstandingSlots*8388608,packetBytes:8388608,outstandingSlots,timeBudgetMs,operationBudget:50000000});
}
export function validateResourcePlan(p){
 if(!p||typeof p!=='object')throw Error('Long resource plan required');
 const expected=selectResourcePlan({mode:p.mode,workers:p.workers,memoryMiB:p.budgetBytes/MiB,timeBudgetMs:p.timeBudgetMs,outstandingSlots:p.outstandingSlots});
 if(Object.keys(p).length!==Object.keys(expected).length||Object.keys(expected).some(k=>JSON.stringify(p[k])!==JSON.stringify(expected[k])))throw Error('Forged long resource plan');
 return p;
}

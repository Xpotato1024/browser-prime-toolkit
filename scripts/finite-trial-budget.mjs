// SPDX-License-Identifier: AGPL-3.0-only
export function requireTrialWindow(deadline,budgetMs,now=()=>performance.now()){
 if(!Number.isFinite(deadline)||!Number.isSafeInteger(budgetMs)||budgetMs<1||budgetMs>3600000)throw Error('Finite trial window required');
 const timeoutMs=budgetMs+120000;
 if(deadline-now()<timeoutMs)throw Error('Insufficient retirement reserve before trial');
 return timeoutMs;
}

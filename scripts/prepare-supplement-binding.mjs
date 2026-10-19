import {writeGenerated} from './generated-file.mjs';
import {readFileSync} from 'node:fs';
const r=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8'),w=(p,s)=>writeGenerated(new URL('../'+p,import.meta.url),s);
const sub=(s,a,b)=>{if(s.split(a).length!==2)throw Error('Patch count '+a);return s.replace(a,b);};
let s=r('src/engine/gmp.js');
s=sub(s,"import { GMP_BASE64 } from './gmp-bytes.js';","import { SUPPLEMENT_BASE64 } from './supplement-bytes.js';");
s=sub(s,'export async function createGmpSplit(bytes = Uint8Array.from(atob(GMP_BASE64), c => c.charCodeAt(0)), audit = {}) {',`export async function createSupplementSplit({lane=0,workers=1,method='ecm',base=2,bytes=Uint8Array.from(atob(SUPPLEMENT_BASE64),c=>c.charCodeAt(0))}={}) {
  if(![1,2].includes(workers)||!Number.isInteger(lane)||lane<0||lane>=workers)throw RangeError('Invalid partition');
  if(!['ecm','pm1'].includes(method)||![2,3].includes(base)||method==='pm1'&&workers!==1)throw RangeError('Invalid supplement');
  let lastBudget=null;`);
s=sub(s,'configureAudit(audit);','configureAudit();');
s=sub(s,"['input_ptr', 'factor_ptr', 'brent_split', 'ecm_split', 'configure_ecm_audit',","['configure_partition','stat_sigma','stat_used','stat_curves','stat_pm1','pm1_split','input_ptr', 'factor_ptr', 'brent_split', 'ecm_split', 'configure_ecm_audit',");
s=sub(s,"!['gmp-brent', 'gmp-ecm'].includes(algorithm)","algorithm !== 'gmp-ecm'");
s=sub(s,'activeBudget = budget; stopped = null;',`if(lastBudget!==budget) {
      if(api.configure_partition(seed,lane,workers)!==1)throw Error('Invalid partition schedule');
      lastBudget=budget;
    }
    activeBudget = budget; stopped = null;`);
s=sub(s,"api[algorithm === 'gmp-brent' ? 'brent_split' : 'ecm_split'](seed)","method==='pm1'?api.pm1_split(base):api.ecm_split(seed)");
s=sub(s,'return { mask, point:',"return {method,lane,workers,base,sigma:Array.from({length:32},(_,i)=>api.stat_sigma(i)>>>0),usedMask:api.stat_used()>>>0,curves:api.stat_curves(),pm1Attempts:api.stat_pm1(),mask, point:");
w('src/engine/supplement.js',s);

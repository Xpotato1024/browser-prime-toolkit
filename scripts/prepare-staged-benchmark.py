from pathlib import Path
s=Path('scripts/benchmark-counted.mjs').read_text()
def swap(a,b):
 global s
 assert s.count(a)==1,a[:80]
 s=s.replace(a,b)
s=s.replace("readFile, writeFile, mkdtemp","readFile, writeFile, access, mkdtemp")
s=s.replace("import { verifySnapshot } from '../src/engine/result.js';","import { verifyStagedOutcome } from '../src/engine/staged-result.js';")
a=s.index("const quick =");b=s.index("const temporary =",a)
s=s[:a]+"""const arg=(key,fallback)=>process.argv.includes(key)?process.argv[process.argv.indexOf(key)+1]:fallback;
const output=resolve(arg('--out',join(tmpdir(),'staged-receipt.json')));
try{await access(output);throw Error('Refusing to overwrite '+output);}catch(e){if(e.code!=='ENOENT')throw e;}
const mode=arg('--mode','primary'),variant=arg('--variant','p64'),caseId=arg('--case','balanced-112bit-0');
const group=arg('--group','train'),seed=Number(arg('--seed','1')),budgetMs=1000;
if(!['brent','ecm','siqs','p64','p80'].includes(variant)||!['train','holdout'].includes(group)||!Number.isSafeInteger(seed))throw Error('Fixed experiment');
const selected=JSON.parse(await readFile(join(root,'bench/staged-'+group+'.json')));
""" +s[b:]
swap("origin + '/bench/counted.html'","origin + '/bench/staged.html'")
swap("await memory.sample();verifySnapshot(result,c.input);","await memory.sample();verifyStagedOutcome(result,c.input);")
s=s.replace("result.allLanesDisposed","result.allWorkersDisposed")
a=s.index("  const options={variant,");b=s.index("  const ownership=",a)
s=s[:a]+"""  const options={mode:variant,timeBudgetMs:budgetMs,operationBudget:50000000,seed};
  let lifecycle=null;
  if(mode==='primary')await measure(c,options);
  else if(mode==='lifecycle'){
    lifecycle={};
    for(const when of ['loading','running']){
      const value=await evaluate('evaluationHarness.cancel('+JSON.stringify(c.input)+','+JSON.stringify(options)+','+JSON.stringify(when)+')');
      verifyStagedOutcome(value.result,c.input);assert.equal(value.result.allWorkersDisposed,true);
      if(value.aborted)assert.equal(value.result.status,'cancelled');else assert.ok(['complete','probable','incomplete'].includes(value.result.status));
      lifecycle[when]=value;
    }
    if(['ecm','p64','p80'].includes(variant)){
      const value=await evaluate('evaluationHarness.fatalRecovery('+JSON.stringify(c.input)+','+JSON.stringify(options)+')');
      assert.equal(value.failure.message,'computation-error');assert.equal(value.failure.allWorkersDisposed,true);
      assert.equal(value.failure.audit.siqs?.nativeLogical??0,0);verifyStagedOutcome(value.recovered,c.input);lifecycle.fatal=value;
    }
    await measure(c,options);
  }else throw Error('Mode');
""" +s[b:]
s=s.replace("'scripts/benchmark-counted.mjs'","'scripts/benchmark-staged.mjs','bench/staged-'+group+'.json'")
s=s.replace("const receipt={mode,variant,caseId,budgetMs,","const receipt={mode,variant,caseId,group,seed,budgetMs,")
s=s.replace("profile:'separate last-split callback-interval wall, includes JS/import/budget/output validation; not pure C or primary timing'","profile:'request includes Worker compile/init, computation, delivery and proof; one host deadline; unavailable terminated trace is null'")
Path('scripts/benchmark-staged.mjs').write_text(s)

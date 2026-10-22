import {readFileSync} from 'node:fs';
import {writeGenerated} from './generated-file.mjs';
let s=readFileSync(new URL('../src/engine/factor.js',import.meta.url),'utf8');
const sub=(a,b)=>{if(s.split(a).length!==2)throw Error('Staged factor patch '+a);s=s.replace(a,b);};
sub("export function factorInteger(input, options = {}, { now = () => performance.now(), onProgress = () => {}, splitAdvanced } = {}) {",
"export function factorStaged(input, options = {}, { now = () => performance.now(), onProgress = () => {}, splitBrent,splitEcm,splitSiqs } = {}) {");
sub("input >= INPUT_CEILING","input >= STAGED_LIMIT");
sub("const config = normalizeOptions(options);","const plan=selectStagedPlan(input.toString(),options);\n  const config=normalizeOptions({...plan.options,algorithm:plan.mode==='brent'?'brent':plan.mode==='ecm'?'gmp-ecm':'siqs'});");
sub("  const accept = (value, certainty, method) => {","  const dispatch=makeStagedDispatcher(budget,plan,{splitBrent,splitEcm,splitSiqs});\n  const accept = (value, certainty, method) => {");
const begin=s.indexOf("        else if (['gmp-brent'"),end=s.indexOf("        if (typeof divisor",begin);
if(begin<0||end<begin)throw Error('Staged dispatch region');
s=s.slice(0,begin)+"        else {budget.tick();divisor=dispatch(value);budget.tick();if(divisor===null)throw new BudgetExceeded('algorithm-exhausted');}\n"+s.slice(end);
sub("algorithm: config.algorithm, seed: config.seed,","algorithm: plan.mode.startsWith('p')?'staged':config.algorithm, seed: config.seed,policy:plan.mode,stages:dispatch.trace(),grants:dispatch.grants(),");
sub("return verifyFactorResult(result, input.toString());","return verifyStagedResult(result, input.toString());");
s="import {selectStagedPlan,STAGED_LIMIT} from './staged-plan.js';\nimport {makeStagedDispatcher} from './staged-dispatch.js';\nimport {verifyStagedResult} from './staged-result.js';\n"+s;
writeGenerated(new URL('../src/engine/staged-factor.js',import.meta.url),s);

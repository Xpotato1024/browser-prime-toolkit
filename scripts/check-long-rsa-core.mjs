import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=p=>readFile(p,'utf8');
for(const file of ['factor.js','core-result.js','result.js','options.js','factory.js']){
 assert.equal(await read('src/long-rsa/'+file),await read('src/rsa/'+file),'Unchanged RSA control layer '+file);
}
let expected=await read('src/rsa/evaluator.js');
expected=expected.replace('deadline=began+RSA_PROFILE.timeBudgetMs','deadline=began+plan.options.timeBudgetMs').replace('limits:RSA_PROFILE','limits:{...RSA_PROFILE,timeBudgetMs:plan.options.timeBudgetMs}');
assert.equal(await read('src/long-rsa/evaluator.js'),expected,'Only selected finite host deadline differs');
expected=(await read('src/rsa/install.js')).replace('options.timeBudgetMs>30000','options.timeBudgetMs>RSA_PROFILE.timeBudgetMs');
assert.equal(await read('src/long-rsa/install.js'),expected,'Only the Worker time ceiling differs');
expected=(await read('scripts/build-rsa-worker.mjs')).replaceAll('src/rsa/','src/long-rsa/').replaceAll('build-rsa-worker','build-long-rsa-worker');
assert.equal(await read('scripts/build-long-rsa-worker.mjs'),expected,'Same deterministic native bundling');
console.log('Verified isolated long control-layer forks; mathematical, proof and ownership implementations preserved');

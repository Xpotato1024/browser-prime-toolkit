// SPDX-License-Identifier: AGPL-3.0-only
import test from 'node:test';
import assert from 'node:assert/strict';
import {workflowBrowserInventory} from '../scripts/browser-ci-inventory.mjs';
const legacy="chrome = spawn('chrome',['--remote-debugging-port=0']); const debuggingUrl = await new Promise();";
const adapter="chrome = spawn('chrome',['--remote-debugging-port=0']); ciChrome.observe({timeoutMs:15000});";
const base={entries:[{target:'scripts/safe.mjs'}],scripts:{},read:p=>p==='scripts/safe.mjs'?adapter:legacy};
test('workflow and nested package aliases cannot reach legacy readiness',()=>{
 for(const workflows of [{ci:'node scripts/old.mjs'},{ci:'npm run verify:browser'}]){
  assert.throws(()=>workflowBrowserInventory({...base,workflows,scripts:{'verify:browser':'node scripts/old.mjs'}}),/bypasses shared startup/);
 }
 assert.throws(()=>workflowBrowserInventory({...base,workflows:{},scripts:{'verify:hidden':'node scripts/old.mjs'}}),/bypasses shared startup/);
});
test('matrix entrypoints are expanded and checked rather than missed',()=>{
 const workflows={ci:'matrix:\n  profile: [safe, old]\nrun: node scripts/${{ matrix.profile }}.mjs'};
 assert.throws(()=>workflowBrowserInventory({...base,workflows}),/old.mjs/);
 assert.throws(()=>workflowBrowserInventory({...base,workflows:{ci:'node scripts/${{ matrix.unknown }}.mjs'}}),/Unresolved workflow matrix/);
});
test('historical benchmark aliases remain outside CI while verified adapters are inventoried',()=>{
 const result=workflowBrowserInventory({...base,workflows:{ci:'npm run verify:browser'},scripts:{'verify:browser':'node scripts/safe.mjs','benchmark:browser':'node scripts/old.mjs'}});
 assert.equal(result.length,1);assert.equal(result[0].path,'scripts/safe.mjs');assert.deepEqual(result[0].via,['ci -> npm verify:browser','npm verify:browser']);
});

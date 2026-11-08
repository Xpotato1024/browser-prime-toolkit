// SPDX-License-Identifier: AGPL-3.0-only
import {readFileSync,readdirSync} from 'node:fs';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {generateChromeCi,chromeCiEntries} from './generate-chrome-ci.mjs';
import {workflowBrowserInventory,sharedBrowserEntrypoints} from './browser-ci-inventory.mjs';
generateChromeCi({check:true});
for(const producer of new Set(chromeCiEntries.map(e=>e.producer).filter(Boolean))){
 assert.ok(['scripts/generate-staged-ci.mjs','scripts/generate-siqs-lab-ci.mjs'].includes(producer));
 const result=spawnSync(process.execPath,[producer,'--check'],{encoding:'utf8',timeout:10000});
 assert.equal(result.status,0,result.error?.message??result.stderr);
}
const read=path=>readFileSync(path,'utf8');
const workflows=Object.fromEntries(readdirSync('.github/workflows').filter(p=>/\.ya?ml$/.test(p)).map(p=>[p,read('.github/workflows/'+p)]));
const inventory=workflowBrowserInventory({workflows,scripts:JSON.parse(read('package.json')).scripts,read,entries:chromeCiEntries});
assert.deepEqual(new Set(inventory.map(e=>e.path)),new Set([...chromeCiEntries.map(e=>e.target),...sharedBrowserEntrypoints]),'All registered browser contracts must remain reachable');
console.log(JSON.stringify({kind:'reachable-browser-ci-inventory',count:inventory.length,entries:inventory},null,2));

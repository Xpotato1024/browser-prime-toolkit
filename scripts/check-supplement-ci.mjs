import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=new URL('../',import.meta.url),read=p=>readFileSync(new URL(p,root),'utf8');
let expected=read('scripts/benchmark-supplement.mjs');
for(const [from,to] of [
 ["const mode=process.argv.includes('--mode')?process.argv[process.argv.indexOf('--mode')+1]:'quick';","const mode='quick'; // CI contract profile only; historical measurement driver is unchanged."],
 ["stderr.slice(-1000))), 15000);","stderr.slice(-1000))), 30000);"],
 ["['scripts/benchmark-supplement.mjs','scripts/browser-memory.mjs'","['scripts/verify-supplement-ci.mjs','scripts/benchmark-supplement.mjs','scripts/browser-memory.mjs'"]
]){assert.equal(expected.split(from).length,2);expected=expected.replace(from,to);}
assert.equal(read('scripts/verify-supplement-ci.mjs'),expected,'CI profile changes only startup deadline, quick mode, and receipt identity');
console.log('Supplement CI profile: finite 30s startup, historical computation/audits unchanged');
let privateExpected=read('scripts/verify-private-ui.mjs');
for(const[from,to]of [
 ["stderr.slice(-1000))), 15000);","stderr.slice(-1000))), 30000);"],
 ["'scripts/verify-private-ui.mjs'","'scripts/verify-private-ui-ci.mjs','scripts/verify-private-ui.mjs'"]
]){assert.equal(privateExpected.split(from).length,2);privateExpected=privateExpected.replace(from,to);}
assert.equal(read('scripts/verify-private-ui-ci.mjs'),privateExpected,'UI CI profile changes only startup deadline and receipt identity');
console.log('Private UI CI profile: finite 30s startup, historical driver and contracts unchanged');

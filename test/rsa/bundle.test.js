import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {RSA_WORKER_SOURCE} from '../../src/rsa/worker-source.js';
test('the generated Worker is valid as an ES module, including flattened private bindings',()=>{
 const checked=spawnSync(process.execPath,['--check','--input-type=module'],{input:RSA_WORKER_SOURCE,encoding:'utf8'});
 assert.equal(checked.status,0,checked.stderr);
 assert.doesNotMatch(RSA_WORKER_SOURCE,/^import /m);
});

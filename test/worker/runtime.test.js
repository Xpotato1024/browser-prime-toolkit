import test from 'node:test';
import assert from 'node:assert/strict';
import { Worker } from 'node:worker_threads';
import { once } from 'node:events';
import { WORKER_SOURCE } from '../../src/worker/worker-source.js';
import { verifyFactorResult } from '../../src/engine/result.js';

test('the actual bundled source runs jobs, budgets and invalid requests in an isolated worker', { timeout: 10000 }, async () => {
  const worker = new Worker("const {parentPort}=require('node:worker_threads');" +
    "globalThis.self={postMessage:data=>parentPort.postMessage(data)};" +
    "parentPort.on('message',data=>self.onmessage({data}));\n" + WORKER_SOURCE, { eval: true });
  try {
    const [ready] = await once(worker, 'message');
    assert.equal(ready.type, 'ready');
    for (const [jobId, input, options] of [[1, '1000036000099', {}],
      [2, '1000000016000000063', { operationBudget: 40 }], [3, '12', { remote: true }]]) {
      const response = new Promise((resolve, reject) => {
        const listener = data => { if (data.type !== 'progress') { worker.off('message', listener); resolve(data); } };
        worker.on('message', listener); worker.once('error', reject);
      });
      worker.postMessage({ protocolVersion: 1, type: 'run', jobId, input, options });
      const result = await response;
      assert.equal(result.jobId, jobId);
      if (jobId === 3) assert.equal(result.type, 'error');
      else { verifyFactorResult(result.result, input); assert.equal(result.result.status, jobId === 1 ? 'complete' : 'incomplete'); }
    }
  } finally { await worker.terminate(); }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { Worker } from 'node:worker_threads';
import { once } from 'node:events';
import { WORKER_SOURCE } from '../../src/worker/candidate-worker-source.js';
import { verifyFactorResult } from '../../src/engine/result.js';

test('actual GMP/ECM candidate bundle preserves jobs, proofs and rejects unsupported MPQS', { timeout: 10000 }, async () => {
  const worker = new Worker("const {parentPort}=require('node:worker_threads');" +
    "globalThis.self={addEventListener(){},postMessage:data=>parentPort.postMessage(data)};" +
    "parentPort.on('message',data=>self.onmessage({data}));\n" + WORKER_SOURCE, { eval: true });
  try {
    const [ready] = await once(worker, 'message');
    assert.equal(ready.type, 'ready');
    let jobId = 0;
    for (const algorithm of ['gmp-brent', 'gmp-ecm', 'tinyqs']) {
      const response = new Promise((resolve, reject) => {
        const listener = data => { if (data.type !== 'progress') { worker.off('message', listener); resolve(data); } };
        worker.on('message', listener); worker.once('error', reject);
      });
      worker.postMessage({ protocolVersion: 1, type: 'run', jobId: ++jobId, input: '10403', options: { algorithm } });
      const result = await response;
      assert.equal(result.jobId, jobId);
      if (algorithm === 'tinyqs') assert.equal(result.type, 'error');
      else assert.equal(verifyFactorResult(result.result, '10403').status, 'complete');
    }
  } finally { await worker.terminate(); }
});

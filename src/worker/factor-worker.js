import { factorInteger } from '../engine/factor.js';

let lastJobId = 0;
self.addEventListener('securitypolicyviolation', () =>
  self.postMessage({ protocolVersion: 1, type: 'audit-csp' }));
self.onmessage = ({ data }) => {
  const jobId = data?.jobId;
  try {
    if (!data || data.protocolVersion !== 1 || data.type !== 'run' ||
        !Number.isSafeInteger(jobId) || jobId <= lastJobId ||
        typeof data.input !== 'string' || data.input.length > 1024 ||
        !/^(0|[1-9][0-9]*)$/.test(data.input)) throw new TypeError('Invalid request');
    lastJobId = jobId;
    const result = factorInteger(BigInt(data.input), data.options, {
      onProgress: snapshot => self.postMessage({ protocolVersion: 1, type: 'progress', jobId, snapshot }),
    });
    self.postMessage({ protocolVersion: 1, type: 'result', jobId, result });
  } catch {
    self.postMessage({ protocolVersion: 1, type: 'error', jobId, code: 'computation-error' });
  }
};
self.postMessage({ protocolVersion: 1, type: 'ready' });

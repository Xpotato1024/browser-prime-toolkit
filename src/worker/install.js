import { factorInteger } from '../engine/factor.js';

self.addEventListener('securitypolicyviolation', () =>
  self.postMessage({ protocolVersion: 1, type: 'audit-csp' }));

export function installFactorWorker(splitAdvanced, algorithms, inspectState) {
  let lastJobId = 0;
  self.onmessage = ({ data }) => {
    const jobId = data?.jobId;
    try {
      if (!data || data.protocolVersion !== 1 || data.type !== 'run' ||
          !Number.isSafeInteger(jobId) || jobId <= lastJobId ||
          typeof data.input !== 'string' || data.input.length > 1024 ||
          !/^(0|[1-9][0-9]*)$/.test(data.input) ||
          !algorithms.includes(data.options?.algorithm ?? 'brent')) throw new TypeError('Invalid request');
      lastJobId = jobId;
      const result = factorInteger(BigInt(data.input), data.options, {
        splitAdvanced,
        onProgress: snapshot => self.postMessage({ protocolVersion: 1, type: 'progress', jobId, snapshot }),
      });
      self.postMessage({ protocolVersion: 1, type: 'result', jobId, result,
        ...(inspectState ? { audit: inspectState() } : {}) });
    } catch {
      self.postMessage({ protocolVersion: 1, type: 'error', jobId, code: 'computation-error',
        ...(inspectState ? { audit: inspectState() } : {}) });
    }
  };
  self.postMessage({ protocolVersion: 1, type: 'ready' });
}

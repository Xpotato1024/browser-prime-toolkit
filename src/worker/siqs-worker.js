import { createSiqsSplit } from '../engine/siqs.js';
import { installFactorWorker } from './install.js';

createSiqsSplit().then(split => installFactorWorker(split, ['siqs'], () => split.stats()))
  .catch(() => self.postMessage({ protocolVersion: 1, type: 'error', jobId: null, code: 'initialization-error' }));

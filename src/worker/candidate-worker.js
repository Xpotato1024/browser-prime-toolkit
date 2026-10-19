import { createGmpSplit } from '../engine/gmp.js';
import { installFactorWorker } from './install.js';

createGmpSplit().then(splitAdvanced =>
  installFactorWorker(splitAdvanced, ['brent', 'floyd', 'gmp-brent', 'gmp-ecm']))
  .catch(() => self.postMessage({ protocolVersion: 1, type: 'error', jobId: null, code: 'initialization-error' }));

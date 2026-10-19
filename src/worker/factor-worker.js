import { createTinyQs } from '../engine/tinyqs.js';
import { installFactorWorker } from './install.js';

createTinyQs().then(splitAdvanced => installFactorWorker(splitAdvanced, ['brent', 'floyd', 'tinyqs']))
  .catch(() => self.postMessage({ protocolVersion: 1, type: 'error', jobId: null, code: 'initialization-error' }));

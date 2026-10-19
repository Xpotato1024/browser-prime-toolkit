import { createGmpSplit } from '../engine/gmp.js';
import { installFactorWorker } from './install.js';
// ECM_AUDIT is a closed literal supplied by the private audit factory at boot.
createGmpSplit(undefined, ECM_AUDIT).then(split =>
  installFactorWorker(split, ['gmp-ecm'], () => split.stats()))
  .catch(() => self.postMessage({ protocolVersion: 1, type: 'error', jobId: null, code: 'initialization-error' }));

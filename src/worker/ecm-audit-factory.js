import { WORKER_SOURCE } from './ecm-audit-worker-source.js';
import { makeWorkerFromSource } from './source-factory.js';
const prefixes = Object.freeze({
  normal: 'const ECM_AUDIT={};\n',
  stop: 'const ECM_AUDIT={stop:5};\n',
  trap: 'const ECM_AUDIT={trap:5};\n',
  'gmp-oom': 'const ECM_AUDIT={domain:1,allocation:1};\n',
  'ecm-oom3': 'const ECM_AUDIT={domain:2,allocation:3};\n',
  'ecm-oom4': 'const ECM_AUDIT={domain:2,allocation:4};\n',
  'ecm-oom5': 'const ECM_AUDIT={domain:2,allocation:5};\n',
});
export function makeEcmAuditWorker(mode, dependencies) {
  if (!Object.hasOwn(prefixes, mode)) throw TypeError('Unknown private audit mode');
  return makeWorkerFromSource(prefixes[mode] + WORKER_SOURCE, dependencies);
}

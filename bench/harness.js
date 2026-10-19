import { WORKER_SOURCE } from '../src/worker/worker-source.js';
import { FactorWorkerController } from '../src/worker/controller.js';

let resolveJob, rejectJob, progressCount = 0;
const violations = [], rejections = [], errors = [];
addEventListener('securitypolicyviolation', event => violations.push({
  directive: event.violatedDirective, blocked: event.blockedURI }));
addEventListener('unhandledrejection', event => rejections.push(String(event.reason)));
const controller = new FactorWorkerController({ onEvent(event) {
  if (event.type === 'error') errors.push(event);
  if (event.type === 'progress') progressCount++;
  if (event.type === 'terminal' && resolveJob) { const resolve = resolveJob; resolveJob = rejectJob = null; resolve(event); }
  if (event.type === 'error' && rejectJob) { const reject = rejectJob; resolveJob = rejectJob = null; reject(Error(event.code)); }
} });
async function ready() {
  const started = performance.now();
  while (controller.phase !== 'ready') {
    if (controller.phase === 'error' || performance.now() - started > 6000) throw Error('Worker not ready');
    await new Promise(resolve => setTimeout(resolve, 5));
  }
}
async function run(input, options = {}) {
  await ready();
  if (resolveJob) throw Error('Concurrent harness job');
  progressCount = 0;
  const started = performance.now();
  const event = await new Promise((resolve, reject) => {
    resolveJob = resolve; rejectJob = reject;
    try { controller.start(input, options); }
    catch (error) { resolveJob = rejectJob = null; reject(error); }
  });
  return { ...event.result, wallMs: performance.now() - started, progressCount };
}
async function cancelRun(input) {
  await ready();
  let heartbeat = 0;
  const ticker = setInterval(() => heartbeat++, 5);
  try {
    const pending = run(input, { timeBudgetMs: 10000, operationBudget: 50000000 });
    await new Promise(resolve => setTimeout(resolve, 30));
    const started = performance.now(), cancelled = controller.cancel();
    const result = await pending;
    const cancelMs = performance.now() - started;
    await ready();
    return { result, cancelled, cancelMs, heartbeat };
  } finally { clearInterval(ticker); }
}
function verifyCspAudit() {
  return new Promise((resolve,reject) => {
    const suffix = '\nfetch(' + JSON.stringify(location.origin + '/blocked-worker-probe') + ').catch(()=>{});';
    const url = URL.createObjectURL(new Blob([WORKER_SOURCE, suffix], {type:'text/javascript'}));
    const worker = new Worker(url, {type:'module'});
    const cleanup = () => { clearTimeout(timer); URL.revokeObjectURL(url); worker.terminate(); };
    const timer = setTimeout(()=>{cleanup();reject(Error('Worker CSP audit missing'));},2000);
    worker.onmessage = event => { if(event.data.type==='audit-csp') {cleanup();resolve(true);} };
    worker.onerror = event => {cleanup();reject(Error(event.message));};
  });
}
globalThis.factorHarness = { controller, ready, run, cancelRun, verifyCspAudit, violations, rejections, errors };

import { parseIntegerInput } from '../core/integer-input.js';
import { normalizeOptions } from '../engine/options.js';
import { verifyFactorResult, verifySnapshot } from '../engine/result.js';
import { makeBundledWorker } from './factory.js';

export class FactorWorkerController {
  constructor({ createWorker = makeBundledWorker, onEvent = () => {},
    schedule = setTimeout, unschedule = clearTimeout } = {}) {
    this.createWorker = createWorker; this.onEvent = onEvent;
    this.schedule = schedule; this.unschedule = unschedule;
    this.worker = null; this.active = null; this.nextJobId = 0; this.loadTimer = null;
    this.phase = 'loading'; this.boot();
  }
  emit(event) { this.onEvent(structuredClone(event)); }
  retire() {
    if (this.loadTimer !== null) this.unschedule(this.loadTimer);
    this.loadTimer = null;
    const worker = this.worker; this.worker = null;
    if (worker) {
      worker.onmessage = null; worker.onerror = null; worker.onmessageerror = null;
      worker.releaseSource?.(); worker.terminate();
    }
  }
  boot() {
    this.phase = 'loading';
    try {
      const worker = this.createWorker(); this.worker = worker;
      worker.onmessage = event => { if (this.worker === worker) this.receive(event.data); };
      worker.onerror = event => { event.preventDefault?.(); if (this.worker === worker) this.fail('worker-error'); };
      worker.onmessageerror = () => { if (this.worker === worker) this.fail('message-error'); };
      this.loadTimer = this.schedule(() => { if (this.worker === worker) this.fail('initialization-timeout'); }, 5000);
    } catch { this.fail('worker-create-error'); }
  }
  receive(data) {
    if (this.phase === 'disposed') return;
    if (data?.type !== 'ready' && (!this.active || data?.jobId !== this.active.jobId)) return;
    try {
      if (data?.protocolVersion !== 1) throw new TypeError('Protocol');
      if (data.type === 'ready') {
        if (this.phase !== 'loading') return;
        this.unschedule(this.loadTimer); this.loadTimer = null;
        this.worker.releaseSource?.(); this.phase = 'ready'; this.emit({ type: 'ready' }); return;
      }
      const job = this.active;
      if (data.type === 'progress') {
        const snapshot = verifySnapshot(data.snapshot, job.input);
        this.checkWork(snapshot, job);
        job.snapshot = snapshot;
        this.emit({ type: 'progress', jobId: job.jobId, submittedInput: job.submittedInput, snapshot });
      } else if (data.type === 'result') {
        const result = verifyFactorResult(data.result, job.input);
        this.checkWork(result, job);
        if (result.algorithm !== job.options.algorithm || result.seed !== job.options.seed) throw new TypeError('Identity');
        this.unschedule(job.timer); this.active = null; this.phase = 'ready';
        this.emit({ type: 'terminal', jobId: job.jobId, submittedInput: job.submittedInput, result });
      } else if (data.type === 'error') this.fail('computation-error');
      else throw new TypeError('Message');
    } catch { this.fail('invalid-worker-result'); }
  }
  checkWork(snapshot, job) {
    if (snapshot.operations < job.snapshot.operations || snapshot.operations > job.options.operationBudget) {
      throw new TypeError('Work counter');
    }
  }
  start(text, options = {}) {
    if (this.phase !== 'ready' || this.active) throw new Error('Worker is not ready');
    const input = parseIntegerInput(text).canonical, config = normalizeOptions(options);
    const jobId = ++this.nextJobId;
    const job = { jobId, input, submittedInput: text, options: config,
      snapshot: { input, factors: [], remaining: input, operations: 0, elapsedMs: 0 } };
    this.active = job; this.phase = 'running';
    job.timer = this.schedule(() => { if (this.active === job) this.interrupt('host-timeout', true); },
      config.timeBudgetMs + 100);
    try { this.worker.postMessage({ protocolVersion: 1, type: 'run', jobId, input, options: config }); }
    catch { this.fail('post-message-error'); }
    return jobId;
  }
  interrupt(reason, reboot) {
    const job = this.active;
    if (!job) return false;
    this.unschedule(job.timer); this.active = null; this.retire();
    this.phase = reboot ? 'loading' : 'disposed';
    const result = { ...job.snapshot, status: reason === 'host-timeout' ? 'incomplete' : 'cancelled',
      reason, algorithm: job.options.algorithm, seed: job.options.seed,
      primality: job.snapshot.factors.length ? 'composite' : 'unknown' };
    if (reboot) this.boot();
    this.emit({ type: 'terminal', jobId: job.jobId, submittedInput: job.submittedInput, result });
    return true;
  }
  cancel() { return this.interrupt('cancelled', true); }
  fail(code) {
    const job = this.active;
    if (job) this.unschedule(job.timer);
    this.active = null; this.retire(); this.phase = 'error';
    this.emit({ type: 'error', code, jobId: job?.jobId ?? null, snapshot: job?.snapshot ?? null });
  }
  restart() {
    if (this.phase === 'disposed' || this.active) throw new Error('Cannot restart');
    this.retire(); this.boot();
  }
  dispose() {
    if (this.phase === 'disposed') return;
    if (this.active) this.interrupt('disposed', false);
    else { this.retire(); this.phase = 'disposed'; }
  }
}

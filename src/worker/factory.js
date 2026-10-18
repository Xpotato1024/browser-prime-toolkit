import { WORKER_SOURCE } from './worker-source.js';

export function makeBundledWorker({ WorkerCtor = Worker, URLApi = URL, BlobCtor = Blob } = {}) {
  const url = URLApi.createObjectURL(new BlobCtor([WORKER_SOURCE], { type: 'text/javascript' }));
  let released = false;
  const release = () => { if (!released) { released = true; URLApi.revokeObjectURL(url); } };
  try {
    const worker = new WorkerCtor(url, { type: 'module' });
    worker.releaseSource = release;
    return worker;
  } catch (error) { release(); throw error; }
}

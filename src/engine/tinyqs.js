import { TINYQS_BASE64 } from './tinyqs-bytes.js';

export const createTinyQs = async (bytes = Uint8Array.from(atob(TINYQS_BASE64), c => c.charCodeAt(0))) => {
  let activeBudget = null, stopped = null;
  const module = await WebAssembly.compile(bytes);
  const allowed = new Set(['env.budget_tick', 'wasi_snapshot_preview1.fd_write', 'wasi_snapshot_preview1.proc_exit']);
  if (WebAssembly.Module.imports(module).some(i => i.kind !== 'function' || !allowed.has(i.module + '.' + i.name))) {
    throw new TypeError('Unexpected WASM imports');
  }
  const instance = await WebAssembly.instantiate(module, {
    env: { budget_tick() {
      if (stopped) return 0;
      try { activeBudget.tick(); return 1; }
      catch (error) { stopped = error; return 0; }
    } },
    wasi_snapshot_preview1: {
      fd_write() { throw new Error('Unexpected WASM output'); },
      proc_exit() { throw new Error('WASM exit'); },
    },
  });
  const api = instance.exports;
  api._initialize?.();
  if (!(api.memory instanceof WebAssembly.Memory) || api.memory.buffer.byteLength !== 16777216 ||
      ['input_ptr', 'factor_ptr', 'split'].some(key => typeof api[key] !== 'function')) {
    throw new TypeError('Invalid WASM exports');
  }
  return (value, budget) => {
    if (typeof value !== 'bigint') throw new TypeError('Expected bigint');
    if (value < (1n << 47n) || value >= (1n << 85n) || value % 2n === 0n) throw new RangeError('MPQS range');
    if (!budget || typeof budget.tick !== 'function' || activeBudget) throw new TypeError('Invalid budget');
    const memory = new Uint8Array(api.memory.buffer);
    const pointer = api.input_ptr(), output = api.factor_ptr();
    if (pointer < 0 || pointer + 28 > memory.length || output < 0 || output + 28 > memory.length) {
      throw new TypeError('WASM pointer out of bounds');
    }
    const text = value.toString();
    memory.fill(0, pointer, pointer + 28);
    memory.set(new TextEncoder().encode(text), pointer);
    activeBudget = budget; stopped = null;
    try {
      const status = api.split();
      if (stopped) throw stopped;
      if (status === 0) return null;
      if (status !== 1) throw new TypeError('Invalid WASM status');
      const view = memory.subarray(output, output + 28), end = view.indexOf(0);
      if (end <= 0) throw new TypeError('Invalid WASM output');
      const result = new TextDecoder('utf-8', { fatal: true }).decode(view.subarray(0, end));
      if (!/^[1-9][0-9]{0,25}$/.test(result)) throw new TypeError('Invalid WASM divisor');
      const divisor = BigInt(result);
      if (divisor <= 1n || divisor >= value || value % divisor !== 0n) throw new TypeError('Invalid divisor');
      return divisor;
    } finally { activeBudget = null; stopped = null; }
  };
};

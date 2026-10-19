import { GMP_BASE64 } from './gmp-bytes.js';

export async function createGmpSplit(bytes = Uint8Array.from(atob(GMP_BASE64), c => c.charCodeAt(0))) {
  let activeBudget = null, stopped = null, api;
  const module = await WebAssembly.compile(bytes);
  const allowed = new Set(['env.budget_tick', 'wasi_snapshot_preview1.proc_exit',
    'wasi_snapshot_preview1.fd_write', 'wasi_snapshot_preview1.fd_close',
    'wasi_snapshot_preview1.fd_seek', 'wasi_snapshot_preview1.clock_time_get',
    'wasi_snapshot_preview1.fd_read', 'env.__syscall_unlinkat']);
  if (WebAssembly.Module.imports(module).some(i => i.kind !== 'function' || !allowed.has(i.module + '.' + i.name))) {
    throw new TypeError('Unexpected GMP WASM imports');
  }
  const unexpected = () => { throw new Error('Unexpected GMP WASM I/O or exit'); };
  const instance = await WebAssembly.instantiate(module, {
    env: { __syscall_unlinkat: unexpected, budget_tick() {
      if (stopped) return 0;
      try { activeBudget.tick(); return 1; }
      catch (error) { stopped = error; return 0; }
    } },
    wasi_snapshot_preview1: {
      proc_exit: unexpected, fd_write: unexpected, fd_close: unexpected, fd_seek: unexpected, fd_read: unexpected,
      clock_time_get(clockId, precision, pointer) {
        if (![0, 1, 2, 3].includes(clockId) || !Number.isInteger(pointer) ||
            pointer < 0 || pointer + 8 > api.memory.buffer.byteLength) return 28;
        // ECM's informational clock uses wall time, never an asserted CPU measurement.
        const time = clockId === 0 ? BigInt(Date.now()) * 1000000n :
          BigInt(Math.floor(performance.now() * 1000000));
        new DataView(api.memory.buffer).setBigUint64(pointer, time, true);
        return 0;
      },
    },
  });
  api = instance.exports;
  api._initialize?.();
  if (!(api.memory instanceof WebAssembly.Memory) || api.memory.buffer.byteLength !== 67108864 ||
      ['input_ptr', 'factor_ptr', 'brent_split', 'ecm_split'].some(k => typeof api[k] !== 'function')) {
    throw new TypeError('Invalid GMP WASM exports');
  }
  return (value, budget, { algorithm, seed }) => {
    if (typeof value !== 'bigint') throw new TypeError('Expected bigint');
    if (value < 5n || value >= (1n << 256n) || value % 2n === 0n) throw new RangeError('GMP range');
    if (!['gmp-brent', 'gmp-ecm'].includes(algorithm) || !Number.isSafeInteger(seed) ||
        seed < 1 || seed > 4294967295) throw new TypeError('Invalid GMP configuration');
    if (!budget || typeof budget.tick !== 'function' || activeBudget) throw new TypeError('Invalid budget');
    const memory = new Uint8Array(api.memory.buffer), pointer = api.input_ptr(), output = api.factor_ptr();
    if (pointer < 0 || pointer + 80 > memory.length || output < 0 || output + 80 > memory.length) {
      throw new TypeError('GMP WASM pointer out of bounds');
    }
    memory.fill(0, pointer, pointer + 80);
    memory.set(new TextEncoder().encode(value.toString()), pointer);
    activeBudget = budget; stopped = null;
    try {
      const status = api[algorithm === 'gmp-brent' ? 'brent_split' : 'ecm_split'](seed);
      if (stopped) throw stopped;
      if (status === 0) return null;
      if (status !== 1) throw new TypeError('Invalid GMP WASM status');
      const view = memory.subarray(output, output + 80), end = view.indexOf(0);
      if (end <= 0) throw new TypeError('Invalid GMP WASM output');
      const text = new TextDecoder('utf-8', { fatal: true }).decode(view.subarray(0, end));
      if (!/^[1-9][0-9]{0,77}$/.test(text)) throw new TypeError('Invalid GMP WASM divisor');
      const divisor = BigInt(text);
      if (divisor <= 1n || divisor >= value || value % divisor !== 0n) throw new TypeError('Invalid divisor');
      return divisor;
    } finally { activeBudget = null; stopped = null; }
  };
}

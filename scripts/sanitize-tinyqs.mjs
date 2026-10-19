import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { makeAdvancedCorpus } from '../bench/advanced-corpus.mjs';

const root = resolve(import.meta.dirname, '..');
const image = JSON.parse(readFileSync(join(root, 'native/tinyqs/build.json'))).image;
const directory = mkdtempSync(join(process.env.WASM_BUILD_TMP || tmpdir(), 'prime-sanitize-'));
try {
  let source = readFileSync(join(root, 'vendor/msieve/common/smallfact/tinyqs.c'), 'utf8');
  for (const patch of JSON.parse(readFileSync(join(root, 'native/tinyqs/patches.json')))) {
    assert.equal(source.split(patch.old).length - 1, patch.count);
    source = source.replaceAll(patch.old, patch.new);
  }
  writeFileSync(join(directory, 'tinyqs.c'), source);
  const corpus = makeAdvancedCorpus(false).map(c => c.input);
  for (let i = 0; i < 100; i++) corpus.push(((101n + 2n * BigInt(i)) * 7000000000057n).toString());
  corpus.push(((1n << 85n) - 1n).toString(), (101n * (((1n << 47n) / 101n) | 1n)).toString());
  const compile = ['cc', '-O1', '-g', '-fsanitize=address,undefined', '-fno-sanitize-recover=all', '-fno-omit-frame-pointer',
    '-fno-pie', '-no-pie', '-Wno-attributes', '-include', '/src/native/tinyqs/portable-check.h',
    '-I/src/vendor/msieve/include', '-I/src/native/tinyqs', '-I/build',
    '/src/native/tinyqs/sanitize.c', '/src/native/tinyqs/bridge.c',
    '/src/vendor/msieve/common/mp.c', '/src/vendor/msieve/common/prime_delta.c',
    '-lm', '-o', '/work/sanitize'];
  const shell = '"$@" && /work/sanitize ' + corpus.map(n => "'" + n + "'").join(' ');
  const result = spawnSync('docker', ['run', '--rm', '--network=none', '--cpus=2', '--memory=2g',
    '--pids-limit=128', '--cap-drop=ALL', '--security-opt=no-new-privileges',
    '--tmpfs', '/work:rw,exec,size=128m', '--mount', 'type=bind,src=' + root + ',dst=/src,readonly',
    '--mount', 'type=bind,src=' + directory + ',dst=/build,readonly',
    '-e', 'ASAN_OPTIONS=detect_leaks=1:abort_on_error=1', image, 'sh', '-c', shell, 'sanitize', ...compile],
  { encoding: 'utf8', timeout: 120000, maxBuffer: 4 * 1024 * 1024 });
  assert.equal(result.status, 0, result.stderr || String(result.error));
  const lines = result.stdout.trim().split('\n');
  assert.equal(lines.length, corpus.length);
  for (let i = 0; i < corpus.length; i++) {
    const [input, status, divisor] = lines[i].split(' ');
    assert.equal(input, corpus[i]);
    assert.ok(['0', '1', '-1'].includes(status));
    if (status === '1') {
      const d = BigInt(divisor), n = BigInt(input);
      assert.ok(d > 1n && d < n); assert.equal(n % d, 0n);
    }
  }
  console.log('Native portable C ASan/UBSan: ' + corpus.length +
    ' MPQS jobs plus synthetic 2-adic relation-boundary guard passed');
} finally {
  // Only this exact owned fresh directory is removed.
  rmSync(directory, { recursive: true, force: true });
}

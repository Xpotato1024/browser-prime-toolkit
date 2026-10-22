import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { compileInContainer } from './container-compile.mjs';
import { makeAdvancedCorpus } from '../bench/advanced-corpus.mjs';

const root = resolve(import.meta.dirname, '..');
const image = JSON.parse(readFileSync(join(root, 'native/tinyqs/build.json'))).image;
{
  let source = readFileSync(join(root, 'vendor/msieve/common/smallfact/tinyqs.c'), 'utf8');
  for (const patch of JSON.parse(readFileSync(join(root, 'native/tinyqs/patches.json')))) {
    assert.equal(source.split(patch.old).length - 1, patch.count);
    source = source.replaceAll(patch.old, patch.new);
  }
  const files = { 'build/tinyqs.c': source };
  const provenance = JSON.parse(readFileSync(join(root,'vendor/msieve/provenance.json')));
  for (const path of ['native/tinyqs/bridge.c','native/tinyqs/common.h','native/tinyqs/sanitize.c','native/tinyqs/portable-check.h',...provenance.files.map(f=>'vendor/msieve/'+f.path)]) {
    files['src/' + path] = readFileSync(join(root,path));
  }
  const corpus = makeAdvancedCorpus(false).map(c => c.input);
  for (let i = 0; i < 100; i++) corpus.push(((101n + 2n * BigInt(i)) * 7000000000057n).toString());
  corpus.push(((1n << 85n) - 1n).toString(), (101n * (((1n << 47n) / 101n) | 1n)).toString());
  const compile = ['cc', '-O1', '-g', '-fsanitize=address,undefined', '-fno-sanitize-recover=all', '-fno-omit-frame-pointer',
    '-fno-pie', '-no-pie', '-Wno-attributes', '-include', '/src/native/tinyqs/portable-check.h',
    '-I/src/vendor/msieve/include', '-I/src/native/tinyqs', '-I/build',
    '/src/native/tinyqs/sanitize.c', '/src/native/tinyqs/bridge.c',
    '/src/vendor/msieve/common/mp.c', '/src/vendor/msieve/common/prime_delta.c',
    '-lm', '-o', '/work/sanitize'];
  assert.ok(corpus.every(n => /^[0-9]{1,26}$/.test(n)));
  const after = 'ASAN_OPTIONS=detect_leaks=1:abort_on_error=1 /work/sanitize ' + corpus.map(n => "'" + n + "'").join(' ');
  const stdout = compileInContainer(image, files, compile, after, 120000);
  const lines = stdout.toString('utf8').trim().split('\n');
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
}

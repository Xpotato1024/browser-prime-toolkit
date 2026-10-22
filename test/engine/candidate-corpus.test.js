import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeCandidateCorpus } from '../../bench/candidate-corpus.mjs';
test('candidate corpus retains hard historical cases and exact new size/proof boundaries', () => {
  const corpus = makeCandidateCorpus(), historical = JSON.parse(readFileSync(new URL('../../docs/benchmarks/llm01-wasm-mpqs.json', import.meta.url))).corpus;
  assert.equal(corpus.length, 17); assert.equal(new Set(corpus.map(c => c.id)).size, 17);
  for (const digits of [10, 13]) assert.equal(corpus.filter(c => c.id.startsWith('balanced-' + digits + '-')).length, 4);
  for (const c of corpus) {
    assert.equal(c.factors.reduce((p, f) => p * BigInt(f), 1n).toString(), c.input);
    if (c.source === 'PR3 historical verified corpus') {
      const old = historical.find(o => o.id === c.id);
      assert.equal(c.input, old.input); assert.deepEqual(c.factors, old.factors);
    }
    const match = /^balanced-(96|112)bit-/.exec(c.id);
    if (match) assert.equal(BigInt(c.input).toString(2).length, Number(match[1]));
  }
  const proof = JSON.parse(readFileSync(new URL('../../bench/candidate-prime-proof.json', import.meta.url)));
  const expected = corpus.filter(c => c.source === 'new-uint64-trial-certified').flatMap(c => c.factors);
  assert.deepEqual(proof.results.map(s => s.split(':')[0]), expected);
  for (const row of proof.results) {
    const [n, count] = row.split(':').map(BigInt), last = count * 2n + 1n;
    assert.ok(last * last <= n && (last + 2n) ** 2n > n);
  }
});

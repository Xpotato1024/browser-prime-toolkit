import test from 'node:test';
import assert from 'node:assert/strict';
import { groupFactorPowers, formatFactorPowers } from '../../src/core/factor-powers.js';

test('sorts and groups without mutating supplied factors', () => {
  const factors = Object.freeze([5n, 2n, 3n, 2n, 3n, 2n]);
  assert.deepEqual(groupFactorPowers(factors), [
    { base: 2n, exponent: 3 }, { base: 3n, exponent: 2 }, { base: 5n, exponent: 1 },
  ]);
  assert.equal(formatFactorPowers(factors), '2^3 × 3^2 × 5');
});
test('compares beyond safe Number precision exactly', () => {
  assert.deepEqual(groupFactorPowers([9007199254740993n, 9007199254740992n]), [
    { base: 9007199254740992n, exponent: 1 }, { base: 9007199254740993n, exponent: 1 },
  ]);
});
test('empty and singleton values have explicit representation', () => {
  assert.deepEqual(groupFactorPowers([]), []);
  assert.equal(formatFactorPowers([]), '');
  assert.equal(formatFactorPowers([7n]), '7');
});
test('grouping does not assert that bases are prime', () => {
  assert.equal(formatFactorPowers([4n, 4n]), '4^2');
});
test('accepts maximum factor size and count', () => {
  const maximum = 10n ** 1024n - 1n;
  assert.equal(groupFactorPowers([maximum])[0].base, maximum);
  assert.deepEqual(groupFactorPowers(Array(4096).fill(2n)), [{ base: 2n, exponent: 4096 }]);
});
test('rejects invalid container and element types', () => {
  for (const value of [null, {}, '2', new Set([2n])]) {
    assert.throws(() => groupFactorPowers(value), TypeError);
  }
  for (const value of [2, '2', null, undefined]) {
    assert.throws(() => groupFactorPowers([value]), TypeError);
  }
  assert.throws(() => groupFactorPowers(Array(1)), TypeError);
});
test('rejects domain and resource boundaries', () => {
  for (const value of [-2n, 0n, 1n, 10n ** 1024n]) {
    assert.throws(() => groupFactorPowers([value]), RangeError);
  }
  assert.throws(() => groupFactorPowers(Array(4097).fill(2n)), RangeError);
  assert.throws(() => formatFactorPowers([1n]), RangeError);
});
test('grouped powers reconstruct the supplied product', () => {
  for (let count = 0; count <= 40; count++) {
    const factors = Array.from({ length: count }, (_, index) => BigInt(index % 11 + 2));
    const expected = factors.reduce((product, factor) => product * factor, 1n);
    const actual = groupFactorPowers(factors).reduce(
      (product, { base, exponent }) => product * base ** BigInt(exponent), 1n);
    assert.equal(actual, expected);
  }
});

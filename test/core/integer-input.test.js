import test from 'node:test';
import assert from 'node:assert/strict';
import { parseIntegerInput, IntegerInputError } from '../../src/core/integer-input.js';

const accepted = [
  ['0', '0'], ['1', '1'], [' +00042\n', '42'],
  ['9007199254740993', '9007199254740993'],
  ['1e3', '1000'], ['1.25E+3', '1250'], ['100e-2', '1'],
  ['1.20e1', '12'], ['000.001e3', '1'], ['0e-10000', '0'],
  ['0.000E+10000', '0'], ['1e0000003', '1000'], ['10e-1', '1'],
  ['1e1023', '1' + '0'.repeat(1023)], ['9'.repeat(1024), '9'.repeat(1024)],
  ['0'.repeat(4096), '0'],
];
for (const [input, canonical] of accepted) {
  test('exact parse: ' + input.slice(0, 24), () => {
    const result = parseIntegerInput(input);
    assert.equal(result.canonical, canonical);
    assert.equal(result.value, BigInt(canonical));
  });
}
const rejected = [
  [null, 'INVALID_TYPE'], [4n, 'INVALID_TYPE'], [{}, 'INVALID_TYPE'],
  ...['', ' ', '-1', '-0', '.5', '1.', '1e', '1e+', '1 2', '1,000',
    '0xff', 'NaN', 'Infinity', '１', '<img>', '2^3', '1e1.5'].map(x => [x, 'INVALID_SYNTAX']),
  ...['1e-3', '1.5', '1.01e1', '1001e-3'].map(x => [x, 'NOT_AN_INTEGER']),
  ...['1e10001', '0e-10001', '1e999999999999999999'].map(x => [x, 'EXPONENT_OUT_OF_RANGE']),
  ['1e1024', 'VALUE_TOO_LARGE'], ['9'.repeat(1025), 'VALUE_TOO_LARGE'],
  ['0'.repeat(4097), 'INPUT_TOO_LONG'], [' '.repeat(4096) + '1', 'INPUT_TOO_LONG'],
];
for (const [input, code] of rejected) {
  test('reject ' + code + ': ' + String(input).slice(0, 24), () => {
    assert.throws(() => parseIntegerInput(input), error =>
      error instanceof IntegerInputError && error.code === code);
  });
}
test('exact cancellation of a long decimal fraction', () => {
  assert.equal(parseIntegerInput('1.' + '0'.repeat(2000)).value, 1n);
});
test('small exhaustive integer scientific notation round trips', () => {
  for (let value = 0n; value < 250n; value++) {
    for (let exponent = 0; exponent <= 8; exponent++) {
      const input = value.toString() + '0'.repeat(exponent) + 'e-' + exponent;
      assert.equal(parseIntegerInput(input).value, value);
    }
  }
});

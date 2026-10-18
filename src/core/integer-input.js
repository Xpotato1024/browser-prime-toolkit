export class IntegerInputError extends Error {
  constructor(code) {
    super(code);
    this.name = 'IntegerInputError';
    this.code = code;
  }
}

export function parseIntegerInput(text) {
  const fail = code => { throw new IntegerInputError(code); };
  if (typeof text !== 'string') fail('INVALID_TYPE');
  if (text.length > 4096) fail('INPUT_TOO_LONG');
  const match = /^\+?([0-9]+)(?:\.([0-9]+))?(?:[eE]([+-]?[0-9]+))?$/.exec(text.trim());
  if (!match) fail('INVALID_SYNTAX');
  const [, whole, fraction = '', exponentText = '0'] = match;
  const exponentDigits = exponentText.replace(/^[+-]/, '').replace(/^0+/, '') || '0';
  if (exponentDigits.length > 5 || (exponentDigits.length === 5 && exponentDigits > '10000')) {
    fail('EXPONENT_OUT_OF_RANGE');
  }
  const exponent = Number(exponentDigits) * (exponentText.startsWith('-') ? -1 : 1);
  let digits = (whole + fraction).replace(/^0+/, '');
  if (!digits) return { value: 0n, canonical: '0' };
  const shift = exponent - fraction.length;
  if (shift < 0) {
    const remove = -shift;
    if (remove >= digits.length || !digits.endsWith('0'.repeat(remove))) fail('NOT_AN_INTEGER');
    digits = digits.slice(0, -remove);
  } else {
    if (digits.length + shift > 1024) fail('VALUE_TOO_LARGE');
    digits += '0'.repeat(shift);
  }
  if (digits.length > 1024) fail('VALUE_TOO_LARGE');
  return { value: BigInt(digits), canonical: digits };
}

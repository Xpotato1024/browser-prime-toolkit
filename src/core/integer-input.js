export class IntegerInputError extends Error {
  constructor(code) {
    super(code);
    this.name = 'IntegerInputError';
    this.code = code;
  }
}
export function parseIntegerInput() {
  throw new Error('not implemented');
}

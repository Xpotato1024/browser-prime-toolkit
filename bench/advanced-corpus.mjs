import { trialPrime } from './corpus.mjs';
import { assessPrime } from '../src/engine/arithmetic.js';

// MR is only a fast candidate filter. Exhaustive trial division certifies every factor.
function certifiedPrime(start) {
  let n = start | 1n;
  while (assessPrime(n, { tick() {} }) !== 'proven') n += 2n;
  if (!trialPrime(n)) throw Error('Candidate failed independent trial certificate');
  return n;
}
function withMetadata(c) {
  return { ...c, digits: c.input.length, bits: BigInt(c.input).toString(2).length,
    factorDigits: c.factors.map(f => f.length), factorBits: c.factors.map(f => BigInt(f).toString(2).length),
    factorProof: 'independent exhaustive trial division, outside timed region' };
}
export function makeAdvancedCorpus(quick = false) {
  let seed = 0x531f9a27;
  const random = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return BigInt(seed >>> 0); };
  const cases = [];
  for (const digits of quick ? [8, 12] : [10, 11, 12, 13]) {
    const base = 10n ** BigInt(digits - 1);
    for (let sample = 0; sample < (quick ? 2 : 4); sample++) {
      const p = certifiedPrime(base + random() % (base / 2n));
      const q = certifiedPrime((2n + random() % 6n) * base + random() % (base / 2n));
      cases.push(withMetadata({ id: 'balanced-' + digits + '-' + sample, kind: 'balanced-semiprime',
        input: (p * q).toString(), factors: [p.toString(), q.toString()] }));
    }
  }
  const p = certifiedPrime(1000000000039n), q = certifiedPrime(p + 100n);
  for (const [id, kind, a, b] of [
    ['unbalanced-101-13', 'unbalanced-semiprime', 101n, q],
    ['square-13', 'square-control', p, p],
    ['close-13', 'close-factor-control', p, q],
  ]) cases.push(withMetadata({ id, kind, input: (a * b).toString(), factors: [a.toString(), b.toString()] }));
  if (new Set(cases.map(c => c.input)).size !== cases.length) throw Error('Duplicate corpus input');
  return cases;
}

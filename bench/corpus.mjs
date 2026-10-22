// Generation is outside the timed region. Independent trial division certifies small factors.
export function trialPrime(n) {
  if (n < 2n) return false;
  if (n % 2n === 0n) return n === 2n;
  for (let d = 3n; d * d <= n; d += 2n) if (n % d === 0n) return false;
  return true;
}
function nextPrime(n) { while (!trialPrime(n)) n++; return n; }
export function makeCorpus(quick = false) {
  const cases = [];
  for (const digits of quick ? [6, 8] : [6, 8, 10, 12]) {
    const base = 10n ** BigInt(digits - 1);
    const p = nextPrime(base + 12345n), q = nextPrime(7n * base + 54321n);
    cases.push({ id: 'balanced-' + digits, kind: 'semiprime', input: (p * q).toString(),
      factors: [p.toString(), q.toString()], factorProof: 'independent exhaustive trial division' });
  }
  const p = nextPrime(1000003n), q = nextPrime(100000000003n);
  cases.push({ id: 'unbalanced-4-12', kind: 'semiprime', input: (1009n * q).toString(),
    factors: ['1009', q.toString()], factorProof: 'independent exhaustive trial division' });
  cases.push({ id: 'square-7', kind: 'semiprime-square', input: (p * p).toString(),
    factors: [p.toString(), p.toString()], factorProof: 'independent exhaustive trial division' });
  return cases.map(c => ({ ...c, digits: c.input.length, bits: BigInt(c.input).toString(2).length,
    factorDigits: c.factors.map(f => f.length), factorBits: c.factors.map(f => BigInt(f).toString(2).length) }));
}

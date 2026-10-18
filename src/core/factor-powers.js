export function groupFactorPowers(factors) {
  if (!Array.isArray(factors)) throw new TypeError('Expected a factor array');
  if (factors.length > 4096) throw new RangeError('Too many factors');
  const counts = new Map();
  for (const factor of factors) {
    if (typeof factor !== 'bigint') throw new TypeError('Expected bigint factors');
    if (factor < 2n || factor >= 10n ** 1024n) throw new RangeError('Factor out of range');
    counts.set(factor, (counts.get(factor) ?? 0) + 1);
  }
  return [...counts].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
    .map(([base, exponent]) => ({ base, exponent }));
}
export function formatFactorPowers(factors) {
  return groupFactorPowers(factors).map(({ base, exponent }) =>
    exponent === 1 ? base.toString() : base + '^' + exponent).join(' × ');
}

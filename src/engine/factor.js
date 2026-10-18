import { Budget, BudgetExceeded, INPUT_CEILING, SMALL_PRIMES, normalizeOptions } from './options.js';
import { assessPrime, findDivisor, seededRandom, squareRoot } from './arithmetic.js';
import { resolvedPrimality, verifyFactorResult, verifySnapshot } from './result.js';

export function factorInteger(input, options = {}, { now = () => performance.now(), onProgress = () => {} } = {}) {
  if (typeof input !== 'bigint') throw new TypeError('Expected bigint input');
  if (input < 0n || input >= INPUT_CEILING) throw new RangeError('Input out of range');
  const config = normalizeOptions(options);
  const factors = [];
  let remaining = input, composite = false;
  const snapshot = () => ({ input: input.toString(),
    factors: factors.slice().sort((a, b) => BigInt(a.value) < BigInt(b.value) ? -1 : 1),
    remaining: remaining.toString(), operations: budget.operations, elapsedMs: budget.elapsed() });
  const budget = new Budget(config, now, () => {
    if (remaining > 1n) onProgress(verifySnapshot(snapshot(), input.toString()));
  });
  const accept = (value, certainty, method) => {
    factors.push({ value: value.toString(), certainty, method });
    remaining /= value;
    if (value < input) composite = true;
  };
  let status = input < 2n ? 'neither' : 'complete', reason = null;
  if (input >= 2n) {
    const pending = [input], random = seededRandom(config.seed);
    try {
      while (pending.length) {
        budget.tick();
        let value = pending.pop();
        for (const prime of SMALL_PRIMES) {
          while (true) {
            budget.tick();
            if (value % prime !== 0n) break;
            accept(prime, 'proven', 'small-prime'); value /= prime;
            if (value === 1n) break;
          }
          if (value === 1n) break;
        }
        if (value === 1n) continue;
        const certainty = assessPrime(value, budget);
        if (certainty !== 'composite') {
          accept(value, certainty, certainty === 'proven' ? 'mr64' : 'mr-fixed7');
          continue;
        }
        composite = true;
        const root = squareRoot(value, budget);
        const divisor = root * root === value ? root : findDivisor(value, config.algorithm, random, budget);
        pending.push(divisor, value / divisor);
      }
      if (factors.some(factor => factor.certainty === 'probable')) status = 'probable';
    } catch (error) {
      if (!(error instanceof BudgetExceeded)) throw error;
      status = 'incomplete'; reason = error.reason;
    }
  }
  const result = { ...snapshot(), status, reason, algorithm: config.algorithm, seed: config.seed,
    primality: status === 'neither' ? 'neither' : status === 'incomplete' ?
      (composite ? 'composite' : 'unknown') : resolvedPrimality(snapshot()) };
  return verifyFactorResult(result, input.toString());
}

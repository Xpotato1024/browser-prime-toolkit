import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import { compileInContainer } from './container-compile.mjs';
const root = resolve(import.meta.dirname, '..');
const corpus = JSON.parse(readFileSync(join(root, 'bench/candidate-corpus.json')));
const primes = [...new Set(corpus.filter(c => c.source === 'new-uint64-trial-certified').flatMap(c => c.factors))];
if (!primes.length || primes.some(p => !/^[1-9][0-9]{0,16}$/.test(p))) throw Error('Invalid proof inputs');
const source = `#include <stdint.h>
#include <inttypes.h>
#include <stdio.h>
#include <assert.h>
int main(void) {
  uint64_t n;
  while(scanf("%" SCNu64,&n)==1) {
    assert(n>=3 && n<(UINT64_C(1)<<56) && (n&1));
    uint64_t count=0;
    for(uint64_t d=3;d<=n/d;d+=2) { assert(n%d!=0); count++; }
    printf("%" PRIu64 ":%" PRIu64 "\\n",n,count);
  }
  assert(feof(stdin));
  return 0;
}`;
const image = 'emscripten/emsdk@sha256:27bc6267cb285223b8aebb7627bfebae7cb3ad2aaa0d5923b8aa5321793033e8';
const input = primes.join('\n') + '\n';
const output = compileInContainer(image, {'src/proof.c': source, 'src/primes.txt': input},
  ['cc', '-O3', '/src/proof.c', '-o', '/work/proof'], '/work/proof < /src/primes.txt', 180000).toString().trim().split('\n');
if (output.length !== primes.length || output.some((line,i) => line.split(':')[0] !== primes[i])) throw Error('Trial certificate incomplete');
const sha = value => createHash('sha256').update(value).digest('hex');
const receipt = { method: 'independent exhaustive odd uint64 trial division through floor(sqrt(n)); n/d avoids overflow',
  image, sourceSha256: sha(source), inputSha256: sha(input), results: output };
const path = join(root, 'bench/candidate-prime-proof.json');
if (process.argv.includes('--check')) {
  if (JSON.stringify(JSON.parse(readFileSync(path))) !== JSON.stringify(receipt)) throw Error('Prime proof stale');
} else writeFileSync(path, JSON.stringify(receipt, null, 2) + '\n');
console.log('Independent exhaustive trial certification: ' + primes.length + ' primes PASS');

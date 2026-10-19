import { readFileSync } from 'node:fs';
export function makeCandidateCorpus(quick = false) {
  const corpus = JSON.parse(readFileSync(new URL('./candidate-corpus.json', import.meta.url)));
  return quick ? corpus.filter(c => ['balanced-10-0', 'balanced-13-0', 'unbalanced-101-13',
    'square-13', 'close-13', 'balanced-96bit-0', 'balanced-112bit-0', 'unbalanced-10digit-m127'].includes(c.id)) : corpus;
}

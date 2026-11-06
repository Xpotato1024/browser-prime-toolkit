// SPDX-License-Identifier: AGPL-3.0-only
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const workflow=readFileSync('.github/workflows/ci.yml','utf8');
const jobs=new Map([...workflow.matchAll(/^  ([\w-]+):\n([\s\S]*?)(?=^  [\w-]+:|$(?![\s\S]))/gm)].map(m=>[m[1],m[2]]));

test('one unconditional full unit suite covers the exact workflow checkout',()=>{
 const suites=[...jobs].filter(([,body])=>/^      - run: npm test$/m.test(body));
 assert.deepEqual(suites.map(([name])=>name),['test']);
 const body=jobs.get('test');
 assert.ok(!/^    (?:if|needs):/m.test(body),'full suite must run independently');
 assert.ok(!/^        if:/m.test(body),'full suite must remain unconditional');
 assert.ok(body.includes('run: node scripts/ci-execution-identity.mjs'));
 assert.ok(body.includes('run: npm run check'));
});

test('rebuilt checkouts reject tracked mutations before focused acceptance',()=>{
 const gates={
  'supplementary-evaluation':'node scripts/check-supplement.mjs',
  'counted-siqs-evaluation':'node scripts/check-counted.mjs',
  'rsa-profile':'npm run check:rsa-profile',
  'full-siqs':'npm run check:full-siqs',
  'siqs-lab':'npm run check:siqs-lab',
  'siqs-tuned':'npm run check:siqs-tuned'
 };
 for(const [name,gate] of Object.entries(gates)){
  const body=jobs.get(name),clean=body.indexOf('run: git diff --exit-code --\n');
  assert.ok(clean>=0&&clean<body.indexOf('run: '+gate),name);
 }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const workflow=readFileSync('.github/workflows/ci.yml','utf8');
const jobs=new Map([...workflow.matchAll(/^  ([\w-]+):\n([\s\S]*?)(?=^  [\w-]+:|$(?![\s\S]))/gm)].map(m=>[m[1],m[2]]));
const consumers=['test','supplementary-evaluation','full-siqs','siqs-lab','siqs-tuned'];
test('both event identities remain and one source producer gates all five named consumers',()=>{
 assert.match(workflow,/on:\n  push:\n  pull_request:/);assert.match(workflow,/permissions:\n  contents: read/);
 assert.deepEqual([...jobs].filter(([,body])=>/fetch-reviewed-candidates|fetch:reviewed-full-siqs/.test(body)).map(([name])=>name),consumers);
 const producer=jobs.get('reviewed-source-archives');assert.ok(producer);assert.ok(!/^    if:/m.test(producer));assert.ok(producer.includes('ci-execution-identity.mjs'));
 assert.equal([...jobs.values()].filter(x=>x.includes('ci-reviewed-sources.mjs restore')).length,1);
 for(const name of consumers){
  const body=jobs.get(name);assert.match(body,/^    needs: reviewed-source-archives$/m);assert.match(body,/^    if: \$\{\{ always\(\) \}\}$/m);
  const guard=body.match(/run: (test "\$SOURCE_JOB_RESULT" = success)/)?.[1];assert.ok(guard,name);
  assert.ok(body.indexOf(guard)<body.indexOf('uses: actions/checkout@'),name);
  for(const outcome of ['failure','cancelled','skipped',''])assert.notEqual(spawnSync('bash',['-c',guard],{env:{SOURCE_JOB_RESULT:outcome}}).status,0,name+' '+outcome);
  assert.equal(spawnSync('bash',['-c',guard],{env:{SOURCE_JOB_RESULT:'success'}}).status,0);
  assert.ok(body.indexOf('ci-reviewed-sources.mjs artifact-id')<body.indexOf('actions/download-artifact@'));
  assert.match(body,/artifact-ids: \$\{\{ needs.reviewed-source-archives.outputs.artifact-id \}\}/);
  assert.match(body,/digest-mismatch: error/);assert.match(body,/ci-reviewed-sources.mjs verify/);
  assert.match(body,/fetch(?::reviewed-full-siqs --|[-]reviewed-candidates.mjs) --cache-only/);
 }
});
test('source cache publication follows verification and never changes repository permissions',()=>{
 const body=jobs.get('reviewed-source-archives');
 assert.ok(!body.includes('restore-keys:'));assert.ok(body.includes('SOURCE_CACHE_MATCHED_KEY:'));assert.ok(body.includes('SOURCE_CACHE_HIT:'));
 assert.ok(body.indexOf('ci-reviewed-sources.mjs restore')<body.indexOf('actions/upload-artifact@'));
 assert.ok(body.indexOf('actions/upload-artifact@')<body.indexOf('actions/cache/save@'));
 assert.match(body,/if-no-files-found: error/);assert.match(body,/overwrite: false/);assert.match(body,/retention-days: 1/);
 assert.match(body,/github.event_name == 'push'/);assert.ok(!workflow.includes('github-token:'));
});
test('source sharing preserves the independent rebuild and numeric acceptance chains',()=>{
 const gates={
  test:['build:wasm -- --check','build:candidates -- --check','build:siqs -- --check','verify:siqs-native','verify:candidate-native','verify:candidate-primes','verify:selection-primes','verify:native','npm test','npm run check'],
  'supplementary-evaluation':['node scripts/build-supplement.mjs','node scripts/build-supplement.mjs --native','node scripts/check-supplement.mjs','git diff --exit-code --'],
  'full-siqs':['build:full-siqs -- --check','verify:full-siqs-native','check:full-siqs','git diff --exit-code --'],
  'siqs-lab':['generate-siqs-lab-runtime.mjs --check','build-siqs-lab.mjs --check','build-siqs-lab-worker.mjs --check','verify:siqs-lab-native','check:siqs-lab','git diff --exit-code --'],
  'siqs-tuned':['build-siqs-tuned.mjs --check','build-siqs-tuned-worker.mjs --check','build-siqs-tuned.mjs --native','check:siqs-tuned','git diff --exit-code --']
 };
 for(const [name,commands]of Object.entries(gates))for(const command of commands)assert.ok(jobs.get(name).includes(command),name+': '+command);
 assert.equal((workflow.match(/run: npm test\n/g)??[]).length,1);
 for(const line of workflow.split('\n').filter(l=>l.includes('uses:')))assert.match(line,/@[a-f0-9]{40}(?:\s|$)/);
});

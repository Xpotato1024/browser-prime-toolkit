// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';import {readFileSync,writeFileSync} from 'node:fs';
const read=p=>readFileSync(p,'utf8'),target='scripts/verify-coordinator-ci.mjs';
let expected=read('scripts/verify-coordinator.mjs');
for(const[from,to]of [
  [
    "import {digestPackets} from './scheduler-packets.mjs';",
    "import {digestPackets} from './scheduler-packets.mjs';\nimport {knownDetachedSetup,retireSetupCalls} from './resource-ui-cdp-lifecycle.mjs';"
  ],
  [
    "const coordinator=arg('--coordinator','combined');",
    "assert.ok(!process.argv.includes('--case')&&!process.argv.includes('--fixed-families'),'CI contracts only; performance study is frozen');\nconst coordinator=arg('--coordinator','combined');"
  ],
  [
    "let chrome, socket, server, pageSession, memory, sequence = 0;",
    "const setupFailures=[],setupTasks=[],detached=new Set();\nlet chrome, socket, server, pageSession, memory, sequence = 0;"
  ],
  [
    "pending.set(id, { method, resolve: resolveCall, reject: rejectCall, timer });",
    "pending.set(id, { sessionId, method, resolve: resolveCall, reject: rejectCall, timer });"
  ],
  [
    "enableNetwork(sessionId).then(() => send('Runtime.runIfWaitingForDebugger', {}, sessionId)).catch(error => fatal.push(error.message));",
    "setupTasks.push(enableNetwork(sessionId).then(() => send('Runtime.runIfWaitingForDebugger', {}, sessionId)).catch(error => setupFailures.push({sessionId,error:error.message})));"
  ],
  [
    "if (message.method === 'Target.detachedFromTarget') sessions.delete(message.params.sessionId);",
    "if (message.method === 'Target.detachedFromTarget'){sessions.delete(message.params.sessionId);detached.add(message.params.sessionId);retireSetupCalls(pending,message.params.sessionId);}"
  ],
  [
    "  assert.equal(requests.length,0);assert.equal(http.length,0);assert.deepEqual(badEvents,[]);assert.deepEqual(fatal,[]);",
    "  await Promise.all(setupTasks);for(const row of setupFailures)if(!knownDetachedSetup(row,{detached,active:sessions,workers:new Set(attached.filter(a=>a.type==='worker').map(a=>a.sessionId))}))fatal.push(row.error);\n  assert.equal(requests.length,0);assert.equal(http.length,0);assert.deepEqual(badEvents,[]);assert.deepEqual(fatal,[]);"
  ],
  [
    "['scripts/verify-coordinator.mjs','scripts/benchmark-coordinator.mjs'",
    "['scripts/verify-coordinator-ci.mjs','scripts/generate-coordinator-ci.mjs','scripts/resource-ui-cdp-lifecycle.mjs','scripts/verify-coordinator.mjs','scripts/benchmark-coordinator.mjs'"
  ],
  [
    "assetBoundarySelfTest,coldReadyMs,initialAssets,sourceFiles,records,ownership,sampledRam:memory.summary(),",
    "assetBoundarySelfTest,detachedBeforeResume:setupFailures,detachedSetupProof:{detached:[...detached],active:[...sessions],workers:attached.filter(a=>a.type==='worker').map(a=>a.sessionId)},coldReadyMs,initialAssets,sourceFiles,records,ownership,sampledRam:memory.summary(),"
  ]
]){assert.equal(expected.split(from).length,2,'Unique CI-only anchor '+from);expected=expected.replace(from,to);}
if(process.argv.includes('--check'))assert.equal(read(target),expected);else writeFileSync(target,expected);
console.log('Coordinator CI profile: contracts only, observed detached Worker setup races, original runtime/math/deadlines/audits unchanged');

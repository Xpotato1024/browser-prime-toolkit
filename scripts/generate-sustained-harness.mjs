// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';import{readFileSync,writeFileSync}from'node:fs';
const read=p=>readFileSync(p,'utf8'),write=(p,s)=>{if(process.argv.includes('--check'))assert.equal(read(p),s,p);else writeFileSync(p,s);};
let s=read('scripts/verify-coordinator-ci.mjs');
for(const[from,to]of [
  [
    "import { BrowserMemorySampler } from './browser-memory.mjs';",
    "import { SustainedMemorySampler as BrowserMemorySampler } from './sustained-memory.mjs';"
  ],
  [
    "import {coordinatorAsset} from './coordinator-asset-route.mjs';",
    "import {sustainedAsset as coordinatorAsset} from './sustained-asset-route.mjs';"
  ],
  [
    "import {digestPackets} from './scheduler-packets.mjs';",
    "import {validateStreamRecord} from './sustained-proof.mjs';"
  ],
  [
    "assert.ok(!process.argv.includes('--case')&&!process.argv.includes('--fixed-families'),'CI contracts only; performance study is frozen');\n",
    ""
  ],
  [
    "const caseId=arg('--case',null),",
    "const cancelAfterMs=arg('--cancel-after-ms',null)===null?null:Number(arg('--cancel-after-ms'));\nconst caseId=arg('--case',null),"
  ],
  [
    "[3000,30000,60000,180000,600000].includes(budgetMs)",
    "[3000,30000,60000,180000,300000,600000].includes(budgetMs)"
  ],
  [
    "if(!caseId)assert.equal(budgetMs,30000);",
    "if(!caseId)assert.equal(budgetMs,30000);\nassert.ok(cancelAfterMs===null||caseId==='RSA-100'&&budgetMs===300000&&cancelAfterMs===120000);"
  ],
  [
    "const http = [], requests = [], badEvents = [], localBlobs = [], sessions = new Set(), fatal = [];",
    "const http = [], requests = [], badEvents = [], localBlobs = [], sessions = new Set(), fatal = [];\nconst startupTrace=[];let startupTraceOpen=true,chromeStderr='',nodeMeasurementStart=null;"
  ],
  [
    "method === 'Runtime.evaluate' ? budgetMs+20000 : 5000",
    "method==='Page.navigate'?30000:method === 'Runtime.evaluate' ? budgetMs+20000 : 5000"
  ],
  [
    "    http.push(req.url);",
    "    http.push(req.url);\n    const trace={url:req.url,startedAtMs:performance.now()};if(startupTraceOpen)startupTrace.push(trace);res.once('finish',()=>{trace.status=res.statusCode;trace.finishedAtMs=performance.now();});"
  ],
  [
    "      res.end(await readFile(path));",
    "      const body=await readFile(path);trace.bytes=body.length;res.end(body);"
  ],
  [
    "    } catch { res.writeHead(404); res.end(); }",
    "    } catch (error) { trace.error=error.message;res.writeHead(404); res.end(); }"
  ],
  [
    "stderr = (stderr + data.toString()).slice(-10000);",
    "stderr = (stderr + data.toString()).slice(-10000);chromeStderr=stderr;"
  ],
  [
    "origin + '/bench/coordinator.html'",
    "origin + '/bench/sustained.html'"
  ],
  [
    "  const coldStarted = performance.now();",
    "  const coldStarted = performance.now();startupTrace.push({event:'navigate-start',atMs:coldStarted});"
  ],
  [
    "  for (let i = 0; i < 200; i++) {",
    "  startupTrace.push({event:'navigate-returned',atMs:performance.now()});\n  for (let i = 0; i < 200; i++) {"
  ],
  [
    "  requests.length = 0; http.length = 0; badEvents.length = 0; localBlobs.length = 0;",
    "  startupTraceOpen=false;\n  requests.length = 0; http.length = 0; badEvents.length = 0; localBlobs.length = 0;"
  ],
  [
    "  if(caseId){",
    "  nodeMeasurementStart=performance.now();\n  if(caseId){"
  ],
  [
    "{id:caseId,seed,budgetMs,fixedFamilies}",
    "{id:caseId,seed,budgetMs,fixedFamilies,cancelAfterMs}"
  ],
  [
    "record.handoff=handoffMetrics(value);record.familyDigests=digestPackets(record.capturedPackets,value);delete record.capturedPackets;",
    "record.handoff=handoffMetrics(value);validateStreamRecord(record);"
  ],
  [
    "['scripts/verify-coordinator-ci.mjs','scripts/generate-coordinator-ci.mjs'",
    "['scripts/verify-sustained.mjs','scripts/generate-sustained-harness.mjs','scripts/generate-sustained-runner.mjs','scripts/sustained-proof.mjs','scripts/sustained-memory.mjs','scripts/sustained-asset-route.mjs','scripts/check-sustained.mjs','src/sustained/packet-audit.js','bench/staged-sustained-plan.json','scripts/sustained-decision.mjs','scripts/benchmark-sustained.mjs','scripts/report-sustained.mjs','docs/contracts/sustained-evaluation.md','scripts/verify-coordinator-ci.mjs','scripts/generate-coordinator-ci.mjs'"
  ],
  [
    "assetBoundarySelfTest,detachedBeforeResume:",
    "startupTrace,ramOriginMs:nodeMeasurementStart,ramTimeline:memory.samples,assetBoundarySelfTest,detachedBeforeResume:"
  ],
  [
    "console.error(JSON.stringify({fatal,badEvents,requests,diagnostic,attached,",
    "console.error(JSON.stringify({startupTrace,chromeStderr,fatal,badEvents,requests,diagnostic,attached,"
  ]
]){assert.equal(s.split(from).length,2,'Sustained harness anchor '+from);s=s.replace(from,to);}
write('scripts/verify-sustained.mjs',s);
let route=read('scripts/coordinator-asset-route.mjs').replaceAll('coordinator.html','sustained.html').replaceAll('coordinator.js','sustained.js').replace('src/coordinator/runner.js','src/sustained/runner.js').replace('export function coordinatorAsset','export function sustainedAsset');
route=route.replace('const assets=new Set([','const assets=new Set(["src/sustained/packet-audit.js",');
write('scripts/sustained-asset-route.mjs',route);
console.log('Sustained harness: navigation30s, startup trace, bounded250ms RAM, streamed proof, same calculation deadlines and strict offline contracts');

// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
export const stagedOriginalSha256='8fd69abba55c4826c434fec512650cf8e4578772ab3e6e97b774e72bd63a47dd';
export function deriveStagedCi(original){
 assert.equal(createHash('sha256').update(original).digest('hex'),stagedOriginalSha256,'Historical staged measurement driver must remain byte-for-byte unchanged');
 let source=original;
 const replace=(from,to)=>{assert.equal(source.split(from).length,2,'Unique staged CI anchor '+from.slice(0,100));source=source.replace(from,to);};
 replace("import { BrowserMemorySampler } from './browser-memory.mjs';","import { BrowserMemorySampler } from './browser-memory.mjs';\nimport {observeChromeStartup,openChromeTransport} from './chrome-startup.mjs';");
 replace("const mode=arg('--mode','primary'),variant=","assert.equal(arg('--mode','primary'),'lifecycle','CI contracts only; historical performance driver is frozen');\nconst mode=arg('--mode','primary'),variant=");
 replace('let chrome, socket, server, pageSession, memory, sequence = 0;','let chrome, socket, server, pageSession, memory, startup, sequence = 0;');
 const start=source.indexOf('  memory = new BrowserMemorySampler(chrome.pid); await memory.start();'),end=source.indexOf("  socket.addEventListener('message'",start);assert.ok(start>=0&&end>start);
 source=source.slice(0,start)+`  // Observe ownership before the asynchronous memory sampler can yield.
  const startupTimeoutMs = 15000, startupDeadline = performance.now() + startupTimeoutMs;
  startup = observeChromeStartup(chrome, temporary, {timeoutMs: startupTimeoutMs});
  memory = new BrowserMemorySampler(chrome.pid); await memory.start();
  const debuggingUrl = await startup.ready;
  socket = new WebSocket(debuggingUrl);
  await openChromeTransport(socket,{timeoutMs:Math.max(1,startupDeadline-performance.now())});
`+source.slice(end);
 replace('  const receipt={mode,variant,caseId,group,seed,budgetMs,',"  for(const path of ['scripts/verify-staged-ci.mjs','scripts/generate-staged-ci.mjs','scripts/chrome-startup.mjs'])sourceFiles[path]=createHash('sha256').update(await readFile(join(root,path))).digest('hex');\n  const receipt={ciHarness:{source:'scripts/verify-staged-ci.mjs',originalSha256:"+JSON.stringify(stagedOriginalSha256)+",chromeStartup:startup.diagnostics()},mode,variant,caseId,group,seed,budgetMs,");
 replace("  try { diagnostic = await evaluate(","  try { if(socket?.readyState===WebSocket.OPEN&&pageSession)diagnostic = await evaluate(");
 replace('JSON.stringify({fatal,badEvents,requests,diagnostic,attached,pending:','JSON.stringify({startup:startup?.diagnostics(),fatal,badEvents,requests,diagnostic,attached,pending:');
 replace('} finally {\n  if (memory?.running)', '} finally {\n  startup?.dispose();\n  if (memory?.running)');
 return '// Generated CI-only lifecycle adapter; original benchmark/raw source remains frozen.\n'+source;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const target='scripts/verify-staged-ci.mjs',expected=deriveStagedCi(readFileSync('scripts/benchmark-staged.mjs','utf8'));if(process.argv.includes('--check'))assert.equal(readFileSync(target,'utf8'),expected);else writeFileSync(target,expected);console.log('Staged CI startup adapter verified; historical driver, calculations and15s startup cap preserved');}

// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';
export const sharedBrowserEntrypoints=Object.freeze(['scripts/verify-progress-rendering.mjs','scripts/verify-browser-ci.mjs','scripts/verify-staged-ci.mjs','scripts/verify-resieve-followup.mjs','scripts/verify-resieve-prefix.mjs','scripts/verify-chrome-startup.mjs']);
const shared=new Set(sharedBrowserEntrypoints);
export function workflowBrowserInventory({workflows,scripts,read,entries}){
 const paths=new Map();
 const record=(path,via)=>{if(!paths.has(path))paths.set(path,new Set());paths.get(path).add(via);};
 const expand=(text,workflow)=>{
  let variants=[text];
  const names=[...new Set([...text.matchAll(/\$\{\{\s*matrix\.(\w+)\s*\}\}/g)].map(m=>m[1]))];
  for(const name of names){
   const values=new RegExp('^\\s*'+name+':\\s*\\[([^\\]]+)\\]','m').exec(workflow)?.[1].split(',').map(s=>s.trim().replace(/^['"]|['"]$/g,''));
   assert.ok(values?.length,'Unresolved workflow matrix: '+name);
   variants=variants.flatMap(v=>values.map(value=>v.replaceAll(new RegExp('\\$\\{\\{\\s*matrix\\.'+name+'\\s*\\}\\}','g'),value)));
  }
  return variants;
 };
 const scan=(text,via,seen=new Set())=>{
  for(const m of text.matchAll(/\bnode\s+(?:--[a-z-]+\s+)*["']?(scripts\/[\w./-]+\.mjs)\b/g))record(m[1],via);
  for(const m of text.matchAll(/\bnpm\s+run\s+([\w:-]+)/g)){
   const name=m[1];assert.ok(Object.hasOwn(scripts,name),'Unknown package entry: '+name);
   if(seen.has(name))continue;seen.add(name);scan(scripts[name],via+' -> npm '+name,seen);
  }
 };
 for(const [name,workflow]of Object.entries(workflows)){
  // Only command lines can introduce executable entrypoints, not historical prose.
  for(const line of expand(workflow,workflow))scan(line,name);
 }
 for(const[name,command]of Object.entries(scripts))if(name.startsWith('verify:'))scan(command,'npm '+name);
 const targets=new Set(entries.map(e=>e.target)),result=[];
 for(const [path,via]of paths){
  const source=read(path);
  if(!/--remote-debugging-port/.test(source)||!/\bspawn\s*\(/.test(source))continue;
  assert.ok(targets.has(path)||shared.has(path),'Workflow/package browser entry bypasses shared startup: '+path+' via '+[...via].join(', '));
  if(targets.has(path))assert.match(source,/ciChrome\.observe\(/,'CI adapter must observe its owned browser');
  else if(path==='scripts/verify-progress-rendering.mjs')assert.match(source,/ciChrome\.observe\(\{timeoutMs:15000\}\)/);
  else{
   assert.match(source,/observeChromeStartup/);assert.match(source,/openChromeTransport/);
   assert.ok(!source.includes('const debuggingUrl = await new Promise'),'Legacy readiness reintroduced: '+path);
  }
  result.push({path,kind:targets.has(path)?'generated-ci-adapter':'shared-readiness',via:[...via].sort()});
 }
 return result.sort((a,b)=>a.path.localeCompare(b.path));
}

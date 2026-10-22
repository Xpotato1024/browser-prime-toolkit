import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';
import {writeGenerated} from './generated-file.mjs';
for(const profile of ['brent','ecm','siqs','staged']){
 const paths=['src/engine/options.js','src/engine/arithmetic.js','src/engine/result.js',
  'src/engine/staged-plan.js','src/engine/staged-budget.js','src/engine/staged-dispatch.js','src/engine/staged-result.js','src/engine/staged-factor.js',
  ...(['ecm','staged'].includes(profile)?['src/engine/supplement-bytes.js','src/engine/supplement.js']:[]),
  ...(['siqs','staged'].includes(profile)?['src/engine/checkpoint-charge.js','src/engine/siqs-dense-bytes.js','src/engine/siqs-counted.js']:[]),
  'src/worker/staged-backends.js','src/worker/staged-install.js'];
 const chunks=paths.map(p=>{
  let s=readFileSync(new URL('../'+p,import.meta.url),'utf8');
  s=s.replace(/^import .+ from '[^']+';\n/gm,'').replace(/^export (?=(?:async )?(const|class|function) )/gm,'');
  if(p.endsWith('siqs-dense-bytes.js'))s=s.replace('const SIQS_V2_BASE64','const DENSE');
  if(/^(import|export) /m.test(s)||/\bimport\s*\(/.test(s))throw Error('Module syntax '+p);return '// '+p+'\n'+s;
 });
 const code="'use strict';\n"+chunks.join('\n');new Script(code);
 writeGenerated(new URL('../src/worker/staged-'+profile+'-source.js',import.meta.url),'// Generated private staged core; fixed sources, no runtime imports.\nexport const STAGED_SOURCE = '+JSON.stringify(code)+';\n');
 console.log('Verified staged Worker core '+profile);
}

import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';
import {writeGenerated} from './generated-file.mjs';
for(const variant of ['clock-gated','dense','lanczos']){
 const paths=['src/engine/options.js','src/engine/arithmetic.js','src/engine/result.js','src/engine/factor.js',
  'src/engine/checkpoint-charge.js',variant==='clock-gated'?'src/engine/siqs-bytes.js':'src/engine/siqs-'+variant+'-bytes.js',
  'src/engine/siqs-counted.js','src/worker/counted-install.js'];
 const chunks=paths.map(p=>{
  let s=readFileSync(new URL('../'+p,import.meta.url),'utf8');
  s=s.replace(/^import .+ from '[^']+';\n/gm,'').replace(/^export (?=(?:async )?(const|class|function) )/gm,'');
  if(p.endsWith('-bytes.js')&&variant!=='clock-gated')s=s.replace('const SIQS_V2_BASE64','const '+variant.toUpperCase());
  if(/^(import|export) /m.test(s)||/\bimport\s*\(/.test(s))throw Error('Module syntax '+p);
  return '// '+p+'\n'+s;
 });
 const code="'use strict';\n"+chunks.join('\n');new Script(code);
 const out='// Generated private counted SIQS core; no runtime imports.\nexport const COUNTED_SOURCE = '+JSON.stringify(code)+';\n';
 writeGenerated(new URL('../src/worker/counted-'+variant+'-source.js',import.meta.url),out);
 console.log('Verified counted Worker '+variant);
}

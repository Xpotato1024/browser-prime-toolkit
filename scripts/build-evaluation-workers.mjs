import {readFileSync,writeFileSync} from 'node:fs';
import {Script} from 'node:vm';
for(const variant of ['supplement','siqs-profile']){
 const paths=['src/engine/options.js','src/engine/arithmetic.js','src/engine/result.js','src/engine/factor.js',
  ...(variant==='supplement'?['src/engine/supplement-bytes.js','src/engine/supplement.js']:['src/engine/siqs-bytes.js','src/engine/siqs-profile.js']),'src/worker/install.js'];
 const chunks=paths.map(p=>{
  let s=readFileSync(new URL('../'+p,import.meta.url),'utf8');
  s=s.replace(/^import \{[A-Za-z0-9_, ]+\} from '\.\.?\/[A-Za-z0-9_./-]+\.js';\n/gm,'').replace(/^export (?=(?:async )?(const|class|function) )/gm,'');
  if(/\b(import|export)\b/.test(s))throw Error('Module syntax '+p);return '// '+p+'\n'+s;
 });
 const code="'use strict';\n"+chunks.join('\n');new Script(code);
 const out='// Generated private evaluation core; no runtime imports.\nexport const EVALUATION_SOURCE = '+JSON.stringify(code)+';\n';
 const path=new URL('../src/worker/'+variant+'-source.js',import.meta.url);
 if(process.argv.includes('--check')){if(readFileSync(path,'utf8')!==out)throw Error('Stale '+variant);}else writeFileSync(path,out);
 console.log('Verified evaluation Worker core '+variant);
}

import {readFileSync,writeFileSync} from 'node:fs';
export function writeGenerated(path,content) {
  if(process.argv.includes('--check')) {
    if(readFileSync(path,'utf8')!==content)throw Error('Stale generated file: '+path);
  }else writeFileSync(path,content);
}

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, extname, relative } from 'node:path';
import { spawnSync } from 'node:child_process';
import { TextDecoder } from 'node:util';
import { documentationImage } from './documentation-image.mjs';

const root = resolve(import.meta.dirname, '..');
const decoder = new TextDecoder('utf-8', { fatal: true });
const files = [];
function walk(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (['.git', 'node_modules', 'coverage'].includes(entry.name)) continue;
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) walk(path);
    else if (entry.isFile()) files.push(path);
    else throw new Error('Unexpected file type: ' + path);
  }
}
walk(root);
for (const file of files) {
  const bytes = readFileSync(file);
  if (documentationImage(relative(root, file).split('\\').join('/'), bytes)) continue;
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    throw new Error('UTF-8 BOM: ' + file);
  }
  const text = decoder.decode(bytes);
  if (text.includes('\r')) throw new Error('CR newline: ' + file);
  if (text && !text.endsWith('\n')) throw new Error('Missing final newline: ' + file);
  if (['.js', '.mjs'].includes(extname(file))) {
    const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
    if (result.status !== 0) throw new Error(result.stderr);
  }
  if (extname(file) === '.md') {
    for (const [, target] of text.matchAll(/\]\(([^)\s]+)\)/g)) {
      if (/^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith('#')) continue;
      const path = resolve(dirname(file), decodeURIComponent(target.split('#')[0]));
      if (!existsSync(path)) throw new Error('Broken link in ' + relative(root, file) + ': ' + target);
    }
  }
}
console.log('Checked syntax, UTF-8/LF and Markdown paths in ' + files.length + ' files');

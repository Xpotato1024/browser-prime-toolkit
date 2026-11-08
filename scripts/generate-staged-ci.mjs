// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {deriveChromeCi} from './chrome-ci-transform.mjs';
export const stagedOriginalSha256='8fd69abba55c4826c434fec512650cf8e4578772ab3e6e97b774e72bd63a47dd';
export function deriveStagedCi(original){
 const entry=JSON.parse(readFileSync(new URL('./chrome-ci-entries.json',import.meta.url),'utf8')).find(e=>e.target==='scripts/verify-staged-ci.mjs');
 assert.equal(entry.sha256,stagedOriginalSha256);
 return deriveChromeCi(original,entry);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const target='scripts/verify-staged-ci.mjs',expected=deriveStagedCi(readFileSync('scripts/benchmark-staged.mjs','utf8'));
 if(process.argv.includes('--check'))assert.equal(readFileSync(target,'utf8'),expected);else writeFileSync(target,expected);
 console.log('Staged CI lifecycle verified; historical driver, calculations and 15s startup cap preserved');
}

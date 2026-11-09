// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {deriveChromeCi} from './chrome-ci-transform.mjs';
export const chromeCiEntries=JSON.parse(readFileSync(new URL('./chrome-ci-entries.json',import.meta.url)));
export function generateChromeCi({check=false}={}){
 for(const entry of chromeCiEntries){
  if(entry.producer)continue; // Its existing generator checks the complete derived harness.
  const expected=deriveChromeCi(readFileSync(entry.original,'utf8'),entry);
  if(check)assert.equal(readFileSync(entry.target,'utf8'),expected,'Stale Chrome CI adapter: '+entry.target);
  else writeFileSync(entry.target,expected);
 }
 return chromeCiEntries.length;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log('Chrome CI adapters verified: '+generateChromeCi({check:process.argv.includes('--check')}));

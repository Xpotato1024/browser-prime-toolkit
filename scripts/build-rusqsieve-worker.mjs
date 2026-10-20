// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Xpotato.net / Xpotato1024
import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const source="'use strict';\n"+read('src/rusqsieve/contracts.js').replaceAll('export ','')+'\n'+read('native/rusqsieve/memory-contract.mjs').replaceAll('export ','')+'\n'+read('src/rusqsieve/wasm-bytes.js').replaceAll('export ','')+'\n'+read('src/rusqsieve/worker-body.js');
assert.ok(!/\bimport\s*(?:\(|[{*'"])/.test(source));
const output='// Mixed upstream WASM and original adapter. See native/rusqsieve and source NOTICE.\nexport const RUS_WORKER_SOURCE='+JSON.stringify(source)+';\n';
const path=new URL('../src/rusqsieve/worker-source.js',import.meta.url);
if(process.argv.includes('--check'))assert.equal(readFileSync(path,'utf8'),output);else writeFileSync(path,output);
console.log('Rusqsieve inline Worker',source.length);

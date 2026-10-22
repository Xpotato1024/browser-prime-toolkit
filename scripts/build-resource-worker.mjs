// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Xpotato.net / Xpotato1024
import {readFileSync,writeFileSync} from 'node:fs';import assert from 'node:assert/strict';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
for(const cap of [64,128,256]){
 const source="'use strict';\nconst OWNER_CAP_MIB="+cap+";\n"+read('src/rusqsieve/contracts.js').replaceAll('export ','')+'\n'+read('src/rusqsieve-dlp/contracts.js').replaceAll('export ','')+'\n'+read('src/resources/credits.js').replaceAll('export ','')+'\n'+read('native/resources/memory-contract.mjs').replaceAll('export ','')+'\n'+read(cap===256?'src/rusqsieve-dlp/wasm-bytes.js':'src/resources/wasm-'+cap+'.js').replaceAll('export ','')+'\n'+read('src/resources/worker-body.js');
 assert.ok(!/\bimport\s*(?:\(|[{*'"])/.test(source));
 const output='// Mixed upstream WASM and original adapter. See native/rusqsieve and resources notices.\nexport const RUS_WORKER_SOURCE='+JSON.stringify(source)+';\n',path=new URL('../src/resources/worker-'+cap+'.js',import.meta.url);
 if(process.argv.includes('--check'))assert.equal(readFileSync(path,'utf8'),output);else writeFileSync(path,output);
 console.log('Role Worker',cap,source.length);
}

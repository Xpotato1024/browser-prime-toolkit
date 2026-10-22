// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Xpotato.net / Xpotato1024
const assets=new Set(['bench/dlp.html','bench/dlp.js','src/rusqsieve-dlp/runner.js','src/rusqsieve-dlp/contracts.js','src/rusqsieve-dlp/worker-source.js','src/rusqsieve/contracts.js','src/engine/arithmetic.js','src/engine/options.js','src/worker/source-factory.js','bench/staged-rsa/cases.js','bench/staged-full/cases.js']);
export function dlpAsset(path){try{const key=decodeURIComponent(path).slice(1);return assets.has(key)?key:null;}catch{return null;}}

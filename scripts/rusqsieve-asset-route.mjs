// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Xpotato.net / Xpotato1024
const assets=new Set(['bench/rusqsieve.html','bench/rusqsieve.js','src/rusqsieve/runner.js','src/rusqsieve/contracts.js','src/rusqsieve/worker-source.js','src/engine/arithmetic.js','src/engine/options.js','src/worker/source-factory.js','bench/staged-rsa/cases.js','bench/staged-full/cases.js']);
export function rusqsieveAsset(path){try{const key=decodeURIComponent(path).slice(1);return assets.has(key)?key:null;}catch{return null;}}

// SPDX-FileCopyrightText: 2026 Xpotato.net / Xpotato1024
// SPDX-License-Identifier: AGPL-3.0-only
const assets=new Set(['bench/full-siqs-diagnostic.html','bench/full-siqs-diagnostic.js','src/full-siqs-opt/evaluator.js','src/full-siqs-opt/factory.js','src/full-siqs-opt/worker-source.js','src/full-siqs-opt/result.js','src/full-siqs-opt/core-result.js','src/full-siqs-opt/profile.js','src/core/integer-input.js','src/engine/options.js','src/engine/arithmetic.js','src/worker/source-factory.js','bench/staged-rsa/cases.js','bench/staged-practical/cases.js','bench/staged-full/cases.js']);
export function fullSiqsAsset(path){try{const key=decodeURIComponent(path).slice(1);return assets.has(key)?key:null;}catch{return null;}}

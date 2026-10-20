// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Xpotato.net / Xpotato1024
const assets=new Set(['bench/geometry.html','bench/geometry.js','src/rusqsieve-geometry/runner.js','src/rusqsieve-dlp/contracts.js','src/rusqsieve-geometry/contracts.js','src/rusqsieve-geometry/worker-source.js','src/rusqsieve-scheduler/credits.js','src/rusqsieve-scheduler/metrics.js','src/rusqsieve/contracts.js','src/engine/arithmetic.js','src/engine/options.js','src/worker/source-factory.js','bench/staged-rsa/cases.js','bench/staged-full/cases.js']);
export function geometryAsset(path){try{const key=decodeURIComponent(path).slice(1);return assets.has(key)?key:null;}catch{return null;}}

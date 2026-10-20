const assets=new Set(['bench/siqs-tuned.html','bench/siqs-tuned.js','src/siqs-tuned/runner.js','src/siqs-tuned/contracts.js','src/siqs-tuned/worker-source.js','src/worker/source-factory.js','bench/staged-rsa/cases.js','bench/staged-full/cases.js']);
export function labAsset(path){try{const key=decodeURIComponent(path).slice(1);return assets.has(key)?key:null;}catch{return null;}}

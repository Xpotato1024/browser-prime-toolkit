const assets=new Set(['bench/siqs-lab.html','bench/siqs-lab.js','src/siqs-lab/runner.js','src/siqs-lab/contracts.js','src/siqs-lab/worker-source.js','src/worker/source-factory.js','bench/staged-rsa/cases.js','bench/staged-full/cases.js']);
export function labAsset(path){try{const key=decodeURIComponent(path).slice(1);return assets.has(key)?key:null;}catch{return null;}}

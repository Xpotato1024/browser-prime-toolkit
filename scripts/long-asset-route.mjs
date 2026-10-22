const allowed=new Set([
 '/bench/long-rsa.html','/bench/long-rsa.js','/bench/staged-rsa/cases.js','/bench/staged-practical/cases.js',
 '/src/long-rsa/evaluator.js','/src/long-rsa/profile.js','/src/long-rsa/result.js','/src/long-rsa/factory.js',
 '/src/long-rsa/core-result.js','/src/long-rsa/worker-source.js','/src/core/integer-input.js',
 '/src/engine/options.js','/src/engine/arithmetic.js','/src/worker/source-factory.js'
]);
export function longAsset(path){
 let decoded;try{decoded=decodeURIComponent(path);}catch{return null;}
 return allowed.has(decoded)?decoded.slice(1):null;
}

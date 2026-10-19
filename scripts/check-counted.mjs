import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {SIQS_V2_BASE64 as DENSE} from '../src/engine/siqs-dense-bytes.js';
import {SIQS_V2_BASE64 as LANCZOS} from '../src/engine/siqs-lanczos-bytes.js';
const root=new URL('../',import.meta.url),read=p=>readFileSync(new URL(p,root)),sha=b=>createHash('sha256').update(b).digest('hex');
for(const [variant,source] of [['dense',DENSE],['lanczos',LANCZOS]]) {
 const receipt=JSON.parse(read('native/siqs-v2/build-'+variant+'.json')),bytes=Buffer.from(source,'base64');
 assert.equal(sha(bytes),receipt.sha256);assert.equal(bytes.length,receipt.bytes);assert.equal(receipt.cleanBuilds,2);
 assert.equal(receipt.memoryLimitBytes,67108864);assert.equal(receipt.managedHeapBytes,33554432);
 for(const [p,h] of Object.entries(receipt.sourceHashes))assert.equal(sha(read(p)),h,p);
 for(const p of receipt.provenance.files)assert.equal(sha(read('vendor/msieve-lanczos/'+p.path)),p.sha256);
 const module=new WebAssembly.Module(bytes);
 assert.deepEqual(WebAssembly.Module.imports(module),receipt.imports);assert.deepEqual(WebAssembly.Module.exports(module),receipt.exports);
 const denied=()=>{throw Error('Unexpected verification I/O');};
 const instance=await WebAssembly.instantiate(module,{env:{budget_tick:()=>0},wasi_snapshot_preview1:{fd_write:denied,fd_close:denied,fd_seek:denied,proc_exit:denied}});
 instance.exports._initialize?.();assert.equal(instance.exports.memory.buffer.byteLength,67108864);assert.throws(()=>instance.exports.memory.grow(1),RangeError);
}
for(const name of ['prepare-siqs-v2','build-counted-workers','prepare-counted-runner','prepare-counted-benchmark']){
 const p=spawnSync(process.execPath,['scripts/'+name+'.mjs','--check'],{cwd:root,encoding:'utf8'});assert.equal(p.status,0,p.stderr);
}
console.log('Verified counted SIQS source pins, two clean artifacts, actual hard 64MiB memories and read-only generation');

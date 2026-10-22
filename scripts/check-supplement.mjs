import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {SUPPLEMENT_BASE64} from '../src/engine/supplement-bytes.js';
const root=new URL('../',import.meta.url),read=p=>readFileSync(new URL(p,root));
const sha=b=>createHash('sha256').update(b).digest('hex');
const receipt=JSON.parse(read('native/gmp/supplement-build.json')),bytes=Buffer.from(SUPPLEMENT_BASE64,'base64');
assert.equal(sha(bytes),receipt.sha256);assert.equal(bytes.length,receipt.bytes);
assert.equal(receipt.cleanBuilds,2);assert.equal(receipt.memoryLimitBytes,67108864);
for(const [p,h] of Object.entries(receipt.sourceHashes))assert.equal(sha(read(p)),h,p);
const module=new WebAssembly.Module(bytes);
assert.deepEqual(WebAssembly.Module.imports(module),receipt.imports);
assert.deepEqual(WebAssembly.Module.exports(module),receipt.exports);
for(const name of ['prepare-supplement','prepare-supplement-binding','prepare-siqs-profile','prepare-supplement-benchmark','build-evaluation-workers']){
 const p=spawnSync(process.execPath,['scripts/'+name+'.mjs','--check'],{cwd:root,encoding:'utf8'});
 assert.equal(p.status,0,p.stderr);
}
const denied=()=>{throw Error('Unexpected verification I/O');};
const instance=await WebAssembly.instantiate(module,{
 env:{budget_tick:()=>0,__syscall_unlinkat:denied},
 wasi_snapshot_preview1:{fd_write:denied,fd_close:denied,fd_seek:denied,fd_read:denied,proc_exit:denied,clock_time_get:()=>28}
});
instance.exports._initialize?.();
assert.equal(instance.exports.memory.buffer.byteLength,67108864);
assert.throws(()=>instance.exports.memory.grow(1),RangeError);
console.log('Verified supplementary source pins, artifact, actual 64MiB hard maximum and read-only generated checks');

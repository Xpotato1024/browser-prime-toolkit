import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {compileInContainer} from './container-compile.mjs';
import {patchSiqs} from './patch-siqs.mjs';
import {patchLanczos} from './patch-lanczos.mjs';
import './prepare-siqs-v2.mjs';
const root=resolve(import.meta.dirname,'..'),sha=x=>createHash('sha256').update(x).digest('hex');
const image='emscripten/emsdk@sha256:27bc6267cb285223b8aebb7627bfebae7cb3ad2aaa0d5923b8aa5321793033e8';
const upstreams=JSON.parse(readFileSync(join(root,'native/siqs/sources.json')));
const provenance=JSON.parse(readFileSync(join(root,'vendor/msieve-lanczos/provenance.json')));
const variant=process.argv.includes('--lanczos')?'lanczos':'dense',files={},patched={};
for(const p of upstreams) {
  const bytes=readFileSync(join(root,p.source));if(sha(bytes)!==p.sha256)throw Error('Source pin '+p.source);
  const result=patchSiqs(p.destination,bytes.toString());files['src/'+p.destination]=Buffer.from(result.text);
  patched[p.destination]={sha256:result.sha256,changes:result.changes};
}
for(const p of provenance.files) {
  const path='vendor/msieve-lanczos/'+p.path,bytes=readFileSync(join(root,path));
  if(sha(bytes)!==p.sha256)throw Error('Lanczos pin '+path);
  if(p.path==='lanczos.h')files['src/include/lanczos.h']=bytes;
  if(p.path==='lanczos.c') {
    const result=patchLanczos(bytes.toString());files['src/lanczos.c']=Buffer.from(result.text);
    patched[p.path]={sha256:result.sha256,changes:result.changes};
  }
}
const own=['native/siqs-v2/runtime.c','native/siqs-v2/runtime.h','native/siqs-v2/matrix-'+variant+'.c','native/siqs-v2/sanitize.c'];
for(const p of own)files['src/'+p]=readFileSync(join(root,p));
let script=String.raw`set -eu
cd /src
FLAGS="-O2 -std=gnu99 -DCPU_GENERIC -D_GMP_XFACE_H_ -Iinclude -Impqs -Inative/siqs-v2 -fwasm-exceptions -sSUPPORT_LONGJMP=wasm"
for n in mpqs poly relation sieve sqrt; do emcc $FLAGS -include native/siqs-v2/runtime.h -c mpqs/$n.c -o /work/$n.o; done
for n in mp prime_delta prime_sieve squfof; do emcc $FLAGS -include native/siqs-v2/runtime.h -c common/$n.c -o /work/$n.o; done
for b in 32 64; do emcc $FLAGS -include native/siqs-v2/runtime.h -DBLOCK_KB=$b -DROUTINE_NAME=qs_core_sieve_generic_"$b"k -c mpqs/sieve_core.c -o /work/core$b.o; done
emcc $FLAGS -c native/siqs-v2/runtime.c -o /work/runtime.o
`;
script+='emcc $FLAGS -c native/siqs-v2/matrix-'+variant+'.c -o /work/matrix.o\n';
if(variant==='lanczos')script+='emcc $FLAGS -include native/siqs-v2/runtime.h -c lanczos.c -o /work/lanczos.o\n';
if(process.argv.includes('--native')) {
  script=script.replaceAll('emcc','cc').replace('-O2 -std=gnu99','-O1 -g -fsanitize=address,undefined -fno-omit-frame-pointer -DPRIME_NATIVE_TESTS -std=gnu99').replace(' -fwasm-exceptions -sSUPPORT_LONGJMP=wasm','');
  if(process.argv.includes('--quick'))script=script.replaceAll('-DPRIME_NATIVE_TESTS','-DPRIME_NATIVE_TESTS -DPRIME_NATIVE_QUICK');
  script+='cc -O1 -g -fsanitize=address,undefined -DPRIME_NATIVE_TESTS -Inative/siqs-v2 -c native/siqs-v2/sanitize.c -o /work/sanitize.o\ncc -fsanitize=address,undefined /work/*.o -lm -o /work/sanitize\nASAN_OPTIONS=detect_leaks=1:abort_on_error=1 UBSAN_OPTIONS=halt_on_error=1 /work/sanitize\n';
  files['src/build.sh']=Buffer.from(script);
  console.log(compileInContainer(image,files,['sh','/src/build.sh'],'true',600000,'candidate').toString());process.exit(0);
}
const exports=['input_ptr','factor_ptr','siqs_split','stat_live','stat_peak','stat_phases','stat_reason','configure_fault','stat_line','log_ptr','stat_allocs','configure_checkpoint_budget','stat_work','stat_imports','stat_operation_stop','stat_phase_work','stat_lanczos_attempts','stat_lanczos_iterations','configure_snapshot','stat_snapshot_ptr','stat_snapshot_bytes','stat_parity_ptr','stat_parity_bytes'];
script+="emcc /work/*.o -O2 -fwasm-exceptions -sSUPPORT_LONGJMP=wasm --no-entry -sSTANDALONE_WASM=1 -sFILESYSTEM=0 -sALLOW_MEMORY_GROWTH=0 -sINITIAL_MEMORY=67108864 -sSTACK_SIZE=1048576 -sMALLOC=emmalloc '-sEXPORTED_FUNCTIONS="+JSON.stringify(exports.map(x=>'_'+x))+"' -o /work/siqs.wasm\n";
files['src/build.sh']=Buffer.from(script);
const paths=[...own,'native/siqs-v2/checkpoint.inc','native/siqs-v2/snapshot.inc','native/siqs/sources.json','vendor/msieve-lanczos/provenance.json','scripts/prepare-siqs-v2.mjs','scripts/patch-siqs.mjs','scripts/patch-lanczos.mjs','scripts/build-siqs-v2.mjs','scripts/container-compile.mjs'];
const sourceHashes=Object.fromEntries(paths.map(p=>[p,sha(readFileSync(join(root,p)))]));
const builds=[];for(let i=0;i<2;i++)builds.push(compileInContainer(image,files,['sh','/src/build.sh'],'cat /work/siqs.wasm',180000));
if(!builds[0].equals(builds[1]))throw Error('Clean builds differ '+variant);
const bytes=builds[0],module=new WebAssembly.Module(bytes);
const receipt={variant,image,sourceHashes,upstreams,provenance,patched,script,cleanBuilds:2,bytes:bytes.length,sha256:sha(bytes),imports:WebAssembly.Module.imports(module),exports:WebAssembly.Module.exports(module),memoryLimitBytes:67108864,stackBytes:1048576,managedHeapBytes:33554432};
const output='// Generated by build-siqs-v2.mjs; private counted '+variant+'.\nexport const SIQS_V2_BASE64 = '+JSON.stringify(bytes.toString('base64'))+';\n';
if(process.argv.includes('--check')) {
  if(readFileSync(join(root,'src/engine/siqs-'+variant+'-bytes.js'),'utf8')!==output||JSON.stringify(JSON.parse(readFileSync(join(root,'native/siqs-v2/build-'+variant+'.json'))))!==JSON.stringify(receipt))throw Error('Stale '+variant);
} else {
  writeFileSync(join(root,'src/engine/siqs-'+variant+'-bytes.js'),output);writeFileSync(join(root,'native/siqs-v2/build-'+variant+'.json'),JSON.stringify(receipt,null,2)+'\n');
}
console.log('Two clean builds',variant,bytes.length,sha(bytes),receipt.imports);

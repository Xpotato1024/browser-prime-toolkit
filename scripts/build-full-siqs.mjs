import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {compileInContainer} from './container-compile.mjs';
import {patchFullSiqs,patchFullLanczos} from './patch-full-siqs.mjs';
const root=resolve(import.meta.dirname,'..'),dir=process.env.PRIME_FULL_SOURCE_DIR;
if(!dir||resolve(dir).startsWith(root))throw Error('Set source cache outside repository');
const sha=b=>createHash('sha256').update(b).digest('hex');
function generated(path,value){
 const destination=join(root,path),bytes=Buffer.from(value);
 if(process.argv.includes('--check')){if(!readFileSync(destination).equals(bytes))throw Error('Stale full SIQS artifact '+path);}
 else writeFileSync(destination,bytes);
}

const upstreams=JSON.parse(readFileSync(join(root,'native/siqs-full/staged-upstreams.json')));
for(const e of upstreams){if(!/^[A-Za-z0-9._+-]+$/.test(e.file))throw Error('Full source name');const b=readFileSync(join(dir,e.file));if(b.length!==e.bytes||sha(b)!==e.sha256)throw Error('Full source manifest '+e.file);}

const extracted=spawnSync('python3',[join(root,'scripts/full-siqs-source.py'),dir],{encoding:'utf8',maxBuffer:16*1024*1024});
if(extracted.status!==0)throw Error(extracted.stderr);
const sources=JSON.parse(extracted.stdout),patched={},files={};
for(const [path,value] of Object.entries(sources)){
 if(!path.startsWith('mpqs/')&&!path.startsWith('common/lanczos/')&&!['include/common.h','include/util.h','common/mp.c','common/prime_sieve.c','common/driver.c'].includes(path))continue;
 if(!path.endsWith('.c')&&!['include/common.h','include/util.h'].includes(path))continue;
 const r=path==='common/lanczos/lanczos.c'?patchFullLanczos(value.text):patchFullSiqs(path,value.text);
 if(r.text!==value.text)patched[path]={originalSha256:value.sha256,sha256:r.sha256,changes:r.changes,text:r.text};
}
const make=sources.Makefile.text.replace('-march=native','').replace('CFLAGS = $(OPT_FLAGS)','CFLAGS += $(OPT_FLAGS)').replace('\tar r libmsieve.a','\t$(AR) r libmsieve.a').replace('\tranlib libmsieve.a','\t$(RANLIB) libmsieve.a').replace('\tcommon/savefile.c \\\n','');
patched.Makefile={originalSha256:sources.Makefile.sha256,sha256:sha(make),text:make};
const inputFiles=['native/siqs-full/runtime.c','native/siqs-full/runtime.h','native/siqs-full/callbacks.js','native/siqs-full/sanitize.c'];
for(const p of inputFiles)files['src/'+p]=readFileSync(join(root,p));
files['src/patched.json']=Buffer.from(JSON.stringify(patched));
files['src/msieve.tar.gz']=readFileSync(join(dir,'msieve153_src.tar.gz'));
const gmpLz=readFileSync(join(dir,'gmp-6.1.2.tar.lz'));
if(sha(gmpLz)!=='12fed0532d440d2dc902e64f016aa89a33af6044b90bd1f7bca7396635105dbb')throw Error('GMP pin');
const decode=spawnSync('python3',[join(root,'scripts/full-siqs-lzip.py'),join(dir,'gmp-6.1.2.tar.lz')],{maxBuffer:20*1024*1024});
if(decode.status!==0)throw Error(String(decode.stderr));
files['src/gmp.tar.gz']=gzipSync(decode.stdout,{mtime:0});
const buildDeps=JSON.parse(readFileSync(join(root,'native/gmp/upstreams.json'))).filter(e=>e.file.startsWith('m4_')||e.file.startsWith('libsigsegv2_'));
for(const e of buildDeps){const b=readFileSync(join(dir,e.file));if(sha(b)!==e.sha256||b.length!==e.bytes)throw Error('Build dependency pin');files['src/'+e.file]=b;}
const recipe=String.raw`set -eu
trap 'rc=$?; if [ "$rc" -ne 0 ]; then tail -n 30 /work/*.log >&2; fi' EXIT
for pkg in /src/*.deb; do dpkg-deb -x "$pkg" /; done
export LC_ALL=C TZ=UTC SOURCE_DATE_EPOCH=1773093262
mkdir /work/gmp /work/msieve
tar --no-same-owner --no-same-permissions -xzf /src/gmp.tar.gz --strip-components=1 -C /work/gmp
tar --no-same-owner --no-same-permissions -xzf /src/msieve.tar.gz --strip-components=1 -C /work/msieve
cd /work/gmp
export CFLAGS="-O2" LDFLAGS="-sALLOW_MEMORY_GROWTH=0"
emconfigure ./configure "CCAS=gcc -c" --host=none --build=x86_64-pc-linux-gnu --disable-assembly --disable-shared --disable-cxx > /work/configure.log 2>&1
emmake make -j2 all > /work/gmp.log 2>&1
python3 - <<'PY'
import json,hashlib
from pathlib import Path
root=Path('/work/msieve')
for name,e in json.loads(Path('/src/patched.json').read_text()).items():
 p=root/name
 assert hashlib.sha256(p.read_bytes()).hexdigest()==e['originalSha256'],name
 p.write_text(e['text'])
 assert hashlib.sha256(p.read_bytes()).hexdigest()==e['sha256'],name
PY
cp /src/native/siqs-full/runtime.c /work/msieve/demo.c
cd /work/msieve
export CFLAGS="-I/work/gmp -Impqs -I/src/native/siqs-full -include /src/native/siqs-full/runtime.h -fwasm-exceptions -sSUPPORT_LONGJMP=wasm"
export LDFLAGS="-fwasm-exceptions -sSUPPORT_LONGJMP=wasm -sENVIRONMENT=web,worker -sFILESYSTEM=0 -sMODULARIZE=1 -sEXPORT_ES6=1 -sINVOKE_RUN=0 -sEXIT_RUNTIME=1 -sALLOW_MEMORY_GROWTH=0 -sINITIAL_MEMORY=536870912 -sSTACK_SIZE=4194304 -sWASM_BIGINT=1 -sEXPORTED_FUNCTIONS=['_malloc','_abort','_large_input_ptr','_large_accept','_large_run','_large_work','_large_phase','_large_saved','_large_configure','_large_nnz','_large_reason','_large_line'] -sEXPORTED_RUNTIME_METHODS=['UTF8ToString','HEAPU8'] --js-library /src/native/siqs-full/callbacks.js -L/work/gmp/.libs -Wl,-Map=/work/link.map"
emmake make -j2 all CC=emcc AR=emar RANLIB=emranlib NO_ZLIB=1 NFS_OBJS= GPU_OBJS= > /work/msieve.log 2>&1
cp msieve /work/full.mjs
cp msieve.wasm /work/full.wasm
`;
if(process.argv.includes('--native')){
 let native=recipe.replace('emconfigure ./configure','./configure').replaceAll('emmake make','make');
 native=native.replace('export CFLAGS="-O2" LDFLAGS="-sALLOW_MEMORY_GROWTH=0"','export CC=cc CFLAGS="-O1 -g -fsanitize=address,undefined -fno-omit-frame-pointer" LDFLAGS="-fsanitize=address,undefined"');
 native=native.replace('cp /src/native/siqs-full/runtime.c /work/msieve/demo.c','cat /src/native/siqs-full/runtime.c /src/native/siqs-full/sanitize.c > /work/msieve/demo.c');
 native=native.replace(/^export CFLAGS="-I\/work\/gmp.*$/m,'export CFLAGS="-DPRIME_NATIVE_TESTS -I/work/gmp -Impqs -I/src/native/siqs-full -include /src/native/siqs-full/runtime.h"');
 native=native.replace(/^export LDFLAGS="-fwasm-exceptions.*$/m,'export LDFLAGS="-fsanitize=address,undefined -Wl,--wrap=block_lanczos -L/work/gmp/.libs"');
 native=native.replace('CC=emcc AR=emar RANLIB=emranlib','CC=cc AR=ar RANLIB=ranlib OPT_FLAGS="-O1 -g -fsanitize=address,undefined -fno-omit-frame-pointer -D_FILE_OFFSET_BITS=64 -DNDEBUG -D_LARGEFILE64_SOURCE"');
 native=native.replace('cp msieve /work/full.mjs\ncp msieve.wasm /work/full.wasm',String.raw`export ASAN_OPTIONS=detect_leaks=1:abort_on_error=1 UBSAN_OPTIONS=halt_on_error=1
for mode in no-deps boundary counter proof factor multiply post packed; do printf "native mode %s\\n" "$mode"; ./msieve "$mode"; done
for mode in forged row cycle; do
 set +e
 ./msieve "$mode"
 status=$?
 set -e
 if [ "$mode" = forged ]; then test "$status" -eq 75; else test "$status" -eq 73; fi
done
for phase in 1 2 3 4 5 6; do
 set +e
 ./msieve clock "$phase"
 status=$?
 set -e
 test "$status" -eq 82
done
./msieve factor`);
 files['src/build.sh']=Buffer.from(native);
 console.log(compileInContainer('emscripten/emsdk@sha256:27bc6267cb285223b8aebb7627bfebae7cb3ad2aaa0d5923b8aa5321793033e8',files,['sh','/src/build.sh'],'true',1200000,'candidate').toString());process.exit(0);
}
files['src/build.sh']=Buffer.from(recipe);

const image='emscripten/emsdk@sha256:27bc6267cb285223b8aebb7627bfebae7cb3ad2aaa0d5923b8aa5321793033e8';
const passes=process.argv.includes('--prototype')?1:2,outputs=[];
for(let i=0;i<passes;i++){
 const out=compileInContainer(image,files,['sh','/src/build.sh'],'tar -czf - -C /work full.mjs full.wasm link.map configure.log gmp.log msieve.log',1200000,'candidate');
 const archive=join(dir,'full-build-'+sha(out)+'.tar.gz');writeFileSync(archive,out);
 const unpack=spawnSync('tar',['-xOzf',archive,'full.wasm'],{maxBuffer:8*1024*1024});
 const glue=spawnSync('tar',['-xOzf',archive,'full.mjs'],{maxBuffer:8*1024*1024});
 if(unpack.status||glue.status)throw Error('Build archive');
 const map=spawnSync('tar',['-xOzf',archive,'link.map'],{maxBuffer:8*1024*1024});if(map.status)throw Error('Full link map');outputs.push({wasm:unpack.stdout,glue:glue.stdout,map:Buffer.from(map.stdout.toString().replace(/\/tmp\/emscripten_temp_[^/\s]+\//g,'/tmp/emscripten_temp/'))});
 console.log('Clean full SIQS build',i+1,unpack.stdout.length,sha(unpack.stdout));
}
if(passes===2&&(!outputs[0].wasm.equals(outputs[1].wasm)||!outputs[0].glue.equals(outputs[1].glue)||!outputs[0].map.equals(outputs[1].map)))throw Error('Non-reproducible full SIQS');
const {wasm,glue,map}=outputs[0],module=new WebAssembly.Module(wasm);
const receipt={profile:'full-siqs-1.53',image,upstreams,linkMapSha256:sha(map),linkedObjects:[...new Set([...map.toString().matchAll(/libmsieve\.a\(([^)]+)\)/g)].map(m=>m[1]))].sort(),cleanBuilds:passes,wasmBytes:wasm.length,wasmSha256:sha(wasm),glueSha256:sha(glue),memoryBytes:536870912,stackBytes:4194304,saveBytes:134217728,growth:false,threads:1,recipe,buildDeps,imports:WebAssembly.Module.imports(module),patched:Object.fromEntries(Object.entries(patched).map(([p,{text,...rest}])=>[p,rest])),sourceHashes:Object.fromEntries([...inputFiles,'scripts/build-full-siqs.mjs','scripts/patch-full-siqs.mjs','scripts/patch-siqs.mjs','scripts/full-siqs-source.py','scripts/full-siqs-lzip.py','scripts/container-compile.mjs','native/siqs-full/staged-upstreams.json','native/gmp/upstreams.json','scripts/fetch-full-siqs-sources.mjs'].map(p=>[p,sha(readFileSync(join(root,p)))]))};
mkdirSync(join(root,'src/full-siqs'),{recursive:true});
generated('src/full-siqs/module.js',glue);
generated('native/siqs-full/staged-link-map.txt',map);
generated('src/full-siqs/bytes.js','// Private generated full SIQS artifact.\nexport const FULL_SIQS_BASE64='+JSON.stringify(wasm.toString('base64'))+';\n');
generated('native/siqs-full/staged-build.json',JSON.stringify(receipt,null,2)+'\n');
console.log('Full SIQS artifact',receipt.wasmSha256,receipt.imports);

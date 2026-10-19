set -eu
export LC_ALL=C TZ=UTC SOURCE_DATE_EPOCH=1773093262
for pkg in /build/*.deb; do dpkg-deb -x "$pkg" /; done
test -e /usr/bin/automake || ln -s automake-1.16 /usr/bin/automake
test -e /usr/bin/aclocal || ln -s aclocal-1.16 /usr/bin/aclocal
m4 --version >&2
tar --no-same-owner --no-same-permissions -xJf /build/gmp-6.3.0.tar.xz -C /work
tar --no-same-owner --no-same-permissions -xzf /build/gmp-ecm.tar.gz -C /work
ECM=/work/gmp-ecm-8ea5e214fdf2f0ddf9415141b8dc039ed6f5874e
cd "$ECM"
cp /work/gmp-6.3.0/configfsf.guess config.guess
cp /work/gmp-6.3.0/configfsf.sub config.sub
autoreconf -fi >&2
mode=${1:?wasm or native}
if test "$mode" = wasm; then
    CONFIG=emconfigure
    export CFLAGS=-O3
elif test "$mode" = native; then
    CONFIG=
    export CC=cc CFLAGS='-O1 -g -fsanitize=address,undefined -fno-omit-frame-pointer'
    export LDFLAGS='-fsanitize=address,undefined'
else exit 2
fi
mkdir /work/gmp-build
cd /work/gmp-build
$CONFIG /work/gmp-6.3.0/configure --host=none --build=x86_64-pc-linux-gnu --disable-assembly --disable-shared --enable-static --disable-cxx >&2
make -j2 >&2
cd "$ECM"
$CONFIG ./configure --host=none --build=x86_64-pc-linux-gnu --disable-asm-redc --disable-sse2 --disable-openmp --disable-shared --enable-static --disable-gmp-cflags --disable-mmap --with-gmp-include=/work/gmp-build --with-gmp-lib=/work/gmp-build/.libs >&2
make -j2 libecm.la >&2
if test "$mode" = wasm; then
    mkdir /work/siqs-objects
    cd /src/vendor/msieve-siqs
    for name in gf2 mpqs poly relation sieve sqrt; do
        emcc -std=gnu99 -O2 -D_FILE_OFFSET_BITS=64 -Iinclude -Impqs -I/work/gmp-build -c "mpqs/$name.c" -o "/work/siqs-objects/$name.o"
    done
    for block in 32 64; do
        emcc -std=gnu99 -O2 -D_FILE_OFFSET_BITS=64 -Iinclude -Impqs -I/work/gmp-build -DCPU_GENERIC -DBLOCK_KB="$block" -DROUTINE_NAME="qs_core_sieve_generic_${block}k" -c mpqs/sieve_core.c -o "/work/siqs-objects/sieve_core_${block}.o"
    done
    sha256sum /work/siqs-objects/*.o > /work/siqs.txt
    cd "$ECM"
    emcc -O3 /src/native/gmp/bridge.c -I. -I/work/gmp-build .libs/libecm.a /work/gmp-build/.libs/libgmp.a --no-entry -sSTANDALONE_WASM=1 -sFILESYSTEM=0 -sALLOW_MEMORY_GROWTH=0 -sINITIAL_MEMORY=67108864 -sSTACK_SIZE=1048576 -sMALLOC=emmalloc -sSUPPORT_LONGJMP=0 '-sEXPORTED_FUNCTIONS=["_input_ptr","_factor_ptr","_brent_split","_ecm_split"]' -o /work/candidate.wasm
else
    cc $CFLAGS /src/native/gmp/bridge.c /src/native/gmp/sanitize.c -I. -I/work/gmp-build .libs/libecm.a /work/gmp-build/.libs/libgmp.a -lm -fsanitize=address,undefined -o /work/sanitize
    ASAN_OPTIONS=detect_leaks=1:abort_on_error=1 UBSAN_OPTIONS=halt_on_error=1 /work/sanitize
fi

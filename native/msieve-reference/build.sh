set -eu
export LC_ALL=C TZ=UTC SOURCE_DATE_EPOCH=1773093262
for pkg in /build/*.deb; do dpkg-deb -x "$pkg" /; done
tar --no-same-owner --no-same-permissions -xJf /build/gmp-6.3.0.tar.xz -C /work
mkdir /work/gmp-build
cd /work/gmp-build
/work/gmp-6.3.0/configure --host=none --build=x86_64-pc-linux-gnu --disable-assembly --disable-shared --enable-static --disable-cxx >&2
make -j2 >&2
cp -r /src/msieve /work/msieve
cd /work/msieve
cp /src/native/msieve-reference/main.c demo.c
make -j2 generic 'CC=cc -D_FILE_OFFSET_BITS=64 -I/work/gmp-build' 'OPT_FLAGS=-O2 -DNDEBUG -DCPU_GENERIC -Impqs' "LIBS=/work/gmp-build/.libs/libgmp.a -lm -lpthread" >&2
cp msieve /work/reference
python3 /src/native/msieve-reference/run.py

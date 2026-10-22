import sys,lzma,struct,zlib
from pathlib import Path
p=Path(sys.argv[1]).read_bytes()
assert p[:5]==b'LZIP\x01'
c=p[5]
d=(1<<(c&31))*(16-(c>>5))//16
out=lzma.decompress(p[6:-20],format=lzma.FORMAT_RAW,filters=[dict(id=lzma.FILTER_LZMA1,dict_size=d,lc=3,lp=0,pb=2)])
crc,size,member=struct.unpack('<IQQ',p[-20:])
assert zlib.crc32(out)==crc and len(out)==size and len(p)==member
sys.stdout.buffer.write(out)

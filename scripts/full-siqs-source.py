import sys,json,tarfile,hashlib
from pathlib import Path,PurePosixPath
root=Path(sys.argv[1])
archive=root/'msieve153_src.tar.gz'
data=archive.read_bytes()
assert hashlib.sha256(data).hexdigest()=='c5fcbaaff266a43aa8bca55239d5b087d3e3f138d1a95d75b776c04ce4d93bb4'
items={}
with tarfile.open(archive) as tar:
 for entry in tar.getmembers():
  parts=PurePosixPath(entry.name).parts
  assert parts[0]=='msieve-1.53' and '..' not in parts and not entry.name.startswith('/')
  if not entry.isfile():continue
  path='/'.join(parts[1:])
  if path=='Makefile' or path.endswith(('.c','.h')):
   b=tar.extractfile(entry).read()
   items[path]={'sha256':hashlib.sha256(b).hexdigest(),'text':b.decode('utf-8')}
print(json.dumps(items))

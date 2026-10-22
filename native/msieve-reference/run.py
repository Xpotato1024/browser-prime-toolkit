import json,subprocess,time,pathlib,resource,hashlib
cases=json.loads(pathlib.Path('/src/build/cases.json').read_text())
def bounds():
 resource.setrlimit(resource.RLIMIT_AS,(512*1024**2,512*1024**2))
 resource.setrlimit(resource.RLIMIT_FSIZE,(512*1024,512*1024))
 resource.setrlimit(resource.RLIMIT_CPU,(31,31))
rows=[]
for c in cases:
 d=pathlib.Path('/work/run-'+c['id']);d.mkdir()
 start=time.monotonic()
 try:
  p=subprocess.run(['/work/reference',c['input']],cwd=d,stdout=subprocess.PIPE,stderr=subprocess.PIPE,timeout=30,preexec_fn=bounds)
  row=dict(returncode=p.returncode,stdout=p.stdout.decode(errors='replace'),stderr=p.stderr.decode(errors='replace'),timeout=False)
 except subprocess.TimeoutExpired as e:
  row=dict(returncode=None,stdout=(e.stdout or b'').decode(errors='replace'),stderr=(e.stderr or b'').decode(errors='replace'),timeout=True)
 rows.append(dict(case=c['id'],input=c['input'],expectedFactors=c['factors'],elapsedMs=(time.monotonic()-start)*1000,**row))
pathlib.Path('/work/reference.json').write_text(json.dumps(dict(records=rows,limits=dict(timeoutSeconds=30,addressSpaceBytes=512*1024**2,fileBytes=512*1024,cpuSeconds=31),binarySha256=hashlib.sha256(pathlib.Path('/work/reference').read_bytes()).hexdigest()),indent=2)+'\n')

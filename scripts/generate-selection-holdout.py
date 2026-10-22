import json,random
from pathlib import Path
root=Path('/mnt/c/Users/miyut/Documents/Codex/2026-10-15/task/browser-prime-toolkit')
rng=random.Random(0x918c7d23)
bases=[2,325,9375,28178,450775,9780504,1795265022]
def probable(n):
 if n<3 or n%2==0:return n==2
 d=n-1;s=0
 while d%2==0:d//=2;s+=1
 for a in bases:
  if a%n==0:continue
  x=pow(a,d,n)
  if x in (1,n-1):continue
  for _ in range(s-1):
   x=pow(x,2,n)
   if x==n-1:break
  else:return False
 return True
def prime(bits):
 while True:
  n=rng.randrange(1<<(bits-1),1<<bits)|1
  if probable(n):return n
cases=[]
for name,a,b,bits in [('small-32',16,16,32),('native-63',31,32,63),('native-64',32,32,64),('balanced-80',40,40,80),('balanced-112',56,56,112)]:
 while True:
  p,q=prime(a),prime(b)
  if p!=q and (p*q).bit_length()==bits:break
 cases.append((name,sorted([p,q]),'independent-uint64-trial'))
p=prime(20);cases.append(('unbalanced-m127',[p,(1<<127)-1],'uint64-trial-small-factor; M127 runtime probable only'))
result=[dict(id='holdout-'+name,input=str(f[0]*f[1]),factors=list(map(str,f)),bits=(f[0]*f[1]).bit_length(),factorBits=[x.bit_length() for x in f],source='stage6-policy-frozen-holdout',factorProof=proof) for name,f,proof in cases]
old=set()
for path in (root/'docs/benchmarks').glob('*.json'):
 d=json.loads(path.read_text())
 old.update(c['input'] for c in d.get('corpus',[]))
assert not old.intersection(c['input'] for c in result)
(root/'bench/selection-holdout.json').write_text(json.dumps(result,indent=2)+'\n')
print('Frozen six new inputs; no prior measured input overlap')

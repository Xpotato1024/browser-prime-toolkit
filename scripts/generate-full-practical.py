import json,hashlib,math,random,sys
from pathlib import Path
root=Path(__file__).resolve().parents[1]
seed='llm01-full-siqs-balanced-20261019-v1'
rng=random.Random(seed)
bases=[2,325,9375,28178,450775,9780504,1795265022]
def mr64(n):
 if n<2:return False
 for p in [2,3,5,7,11,13,17,19,23,29,31,37]:
  if n%p==0:return n==p
 d=n-1;s=0
 while d%2==0:d//=2;s+=1
 for a in bases:
  if a%n==0:continue
  x=pow(a,d,n)
  if x in (1,n-1):continue
  for _ in range(s-1):
   x=x*x%n
   if x==n-1:break
  else:return False
 return True
def prime(bits):
 if bits<=64:
  while True:
   n=rng.randrange(1<<(bits-1),1<<bits)|1
   if mr64(n):return n,dict(n=str(n),kind='mr64')
 q,proof=prime((bits*3+4)//5+1)
 lo=((1<<(bits-1))+2*q-2)//(2*q)
 hi=((1<<bits)-2)//(2*q)
 while True:
  r=rng.randint(lo,hi);n=2*r*q+1
  if n.bit_length()!=bits or q*q<=n:continue
  if pow(2,n-1,n)==1 and math.gcd(pow(2,(n-1)//q,n)-1,n)==1:
   return n,dict(n=str(n),kind='pocklington',q=proof,r=str(r),a='2')
cases=[];oracle=[];used=set()
for digits in range(40,101,2):
 bits=(min(332,(10**digits-1).bit_length())+1)//2
 for index in [1,2]:
  while True:
   p,pc=prime(bits);q,qc=prime(bits)
   if p==q or p in used or q in used:continue
   p,q,pc,qc=(p,q,pc,qc) if p<q else (q,p,qc,pc)
   n=p*q
   if len(str(n))==digits and n.bit_length()<=332 and q<=2*p:break
  used.update([p,q]);case=dict(id=f'full-balanced-{digits}-{index}',input=str(n),digits=digits,bits=n.bit_length())
  cases.append(case);oracle.append(dict(**case,p=str(p),q=str(q),proofs=[pc,qc]))
out=root/'bench/staged-full'
values={'catalog.json':json.dumps(dict(seed=seed,cases=cases),indent=2)+'\n','oracle.json':json.dumps(dict(seed=seed,cases=oracle),indent=2)+'\n','cases.js':'// Moduli only; no factor oracle.\nexport const FULL_CASES='+json.dumps(cases,separators=(',',':'))+';\n'}
values['manifest.json']=json.dumps(dict(seed=seed,count=len(cases),generatorSha256=hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),files={p:hashlib.sha256(s.encode()).hexdigest() for p,s in values.items()}),indent=2)+'\n'
if '--check' in sys.argv:
 for p,s in values.items():assert (out/p).read_text()==s,p
else:
 out.mkdir(exist_ok=True)
 for p in values:assert not (out/p).exists(),'Refusing overwrite'
 for p,s in values.items():(out/p).write_text(s)
print('Fixed full SIQS corpus',len(cases),'moduli',len(used),'unique prime factors')

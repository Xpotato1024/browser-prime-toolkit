"""Independent, deterministic balanced semiprime corpus; oracle never enters browser assets."""
from pathlib import Path
import hashlib,json,math,random,sys
ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'bench/staged-practical'
BASES=(2,325,9375,28178,450775,9780504,1795265022)
def prime(n):
 if n<2 or n>=2**64: return False
 for p in (2,3,5,7,11,13,17,19,23,29,31,37):
  if n%p==0: return n==p
 d=n-1;s=0
 while d%2==0: d//=2;s+=1
 for a in BASES:
  if a%n==0: continue
  x=pow(a,d,n)
  if x in (1,n-1): continue
  for _ in range(s-1):
   x=x*x%n
   if x==n-1: break
  else: return False
 return True
cases=[];oracles=[];seen=set()
for digits in range(12,37,2):
 low=math.isqrt(10**(digits-1)-1)+1;high=math.isqrt(10**digits-1)
 for index in (1,2):
  label=f'private-practical-20261019-v1/{digits}/{index}'
  rng=random.Random(int.from_bytes(hashlib.sha256(label.encode()).digest(),'big'))
  def pick():
   while True:
    p=rng.randrange((low+1)//2,(high+1)//2)*2+1
    if p<=high and p not in seen and prime(p): return p
  while True:
   p,q=pick(),pick()
   if p!=q and max(p,q)<=2*min(p,q) and abs(p.bit_length()-q.bit_length())<=1: break
  seen.update((p,q));n=p*q;assert len(str(n))==digits and prime(p) and prime(q)
  cid=f'balanced-{digits}-{index}'
  cases.append({'id':cid,'input':str(n),'digits':digits,'bits':n.bit_length()})
  oracles.append({'id':cid,'p':str(min(p,q)),'q':str(max(p,q)),'generatorSeed':label,
   'proof':{'type':'deterministic-MR64','bases':list(BASES),'maximumExclusive':str(2**64)}})
catalog={'schema':1,'source':'independently-generated-balanced-semiprimes','cases':cases}
oracle={'schema':1,'notRuntimeAsset':True,'cases':oracles}
pretty=lambda value:json.dumps(value,ensure_ascii=False,indent=2)+'\n'
outputs={'catalog.json':pretty(catalog),'oracle.json':pretty(oracle),'cases.js':'export const PRACTICAL_CASES = '+json.dumps(cases,separators=(',',':'))+';\n'}
manifest={'schema':1,'frozenBeforeMeasurements':True,'initialTiers':[12,16,20,24,28,32],
 'refinementTiers':[14,18,22,26,30,34,36],'seeds':[1,11],'budgetsMs':[3000,30000,180000],
 'generatorSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
 'files':{name:hashlib.sha256(text.encode()).hexdigest() for name,text in outputs.items()}}
outputs['manifest.json']=pretty(manifest)
for name,text in outputs.items():
 path=OUT/name
 if '--check' in sys.argv: assert path.read_text()==text,name
 else:
  if path.exists(): raise RuntimeError('Refusing to replace frozen corpus '+str(path))
  path.write_text(text)
print('Verified' if '--check' in sys.argv else 'Generated',len(cases),'blinded inputs, unique balanced MR64-proven prime pairs and frozen oracle/generator hashes')

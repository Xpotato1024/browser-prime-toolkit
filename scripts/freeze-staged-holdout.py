import json,random,hashlib,sys
from pathlib import Path
root=Path(__file__).resolve().parents[1]
rng=random.Random(0x9A0319C5)
bases=[2,325,9375,28178,450775,9780504,1795265022]
def screen(n):
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
        p=rng.getrandbits(bits)|(1<<(bits-1))|1
        if screen(p):return p
cases=[]
for bits in [64,76,100,124]:
    while True:
        p,q=prime(bits//2),prime(bits//2)
        if p!=q and (p*q).bit_length()==bits:break
    f=sorted([p,q]);cases.append(dict(id='staged-holdout-balanced-'+str(bits),input=str(p*q),factors=list(map(str,f)),bits=bits,group='holdout'))
p=prime(20);q=(1<<61)-1
cases.append(dict(id='staged-holdout-unbalanced-81',input=str(p*q),factors=list(map(str,sorted([p,q]))),bits=(p*q).bit_length(),group='holdout'))
p=prime(127)
cases.append(dict(id='staged-holdout-probable-127',input=str(p),factors=[str(p)],bits=127,group='holdout',expectedStatus='probable'))
prior=json.loads((root/'bench/staged-prior-inputs.json').read_text())
assert not set(prior['inputs']).intersection(c['input'] for c in cases)
for c in cases:
    assert 0<int(c['input'])<1<<128 and all(screen(int(p)) for p in c['factors'])
    product=1
    for p in c['factors']:product*=int(p)
    assert product==int(c['input'])
corpus=json.dumps(cases,indent=2)+'\n'
proof={'method':'independent Python integer pow/square; deterministic seven-base MR for factors below 2^64; larger value is screened-probable, not a prime certificate','seed':'0x9A0319C5','corpusSha256':hashlib.sha256(corpus.encode()).hexdigest(),'priorInputsSha256':hashlib.sha256((root/'bench/staged-prior-inputs.json').read_bytes()).hexdigest(),'nonOverlapWithPrior':True,'factors':[{'value':p,'bits':int(p).bit_length(),'assessment':'MR64-proven' if int(p)<1<<64 else 'screened-probable'} for p in sorted(set(p for c in cases for p in c['factors']),key=int)]}
for path,text in [('bench/staged-holdout.json',corpus),('bench/staged-holdout-proof.json',json.dumps(proof,indent=2)+'\n')]:
    p=root/path
    if '--check' in sys.argv:assert p.read_text()==text,path
    else:
        assert not p.exists(),'Refuse overwrite '+path
        p.write_text(text,newline='\n')
print('Frozen six unused holdout inputs; independent arithmetic and non-overlap passed; sha256='+proof['corpusSha256'])

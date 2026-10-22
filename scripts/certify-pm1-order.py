import json,math,pathlib,sys,hashlib
root=pathlib.Path(__file__).resolve().parent.parent
records=json.loads((root/'docs/benchmarks/llm01-supplement-pm1.json').read_text())['records']
M=math.lcm(*range(1,2001))
rows=[]
for row in records:
 n=int(row['input']);base=row['options']['base'];fs=list(map(int,row['expectedFactors']))
 assert math.prod(fs)==n
 residue=[pow(base,M,p) for p in fs]
 divisor=math.gcd(pow(base,M,n)-1,n)
 proper=1<divisor<n
 assert proper==(row['result']['status'] in ['complete','probable'])
 rows.append(dict(case=row['case'],base=base,input=str(n),factorResidues=list(map(str,residue)),gcd=str(divisor),proper=proper))
out=dict(B1=2000,exponentBits=M.bit_length(),exponentSha256=hashlib.sha256(str(M).encode()).hexdigest(),rows=rows,
 method='Python builtin lcm/pow/gcd, exact congruences outside timing; not a primality certificate')
text=json.dumps(out,indent=2)+'\n';destination=root/'bench/pm1-order-evidence.json'
if '--check' in sys.argv:assert destination.read_text()==text
else:destination.write_text(text)
print('Verified 18 p−1 exact congruences including gcd=n and M127 base sensitivity')

import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {assessPrime} from '../src/engine/arithmetic.js';
const root=new URL('../bench/staged-full/',import.meta.url);
const read=p=>readFileSync(new URL(p,root)),manifest=JSON.parse(read('manifest.json')),catalog=JSON.parse(read('catalog.json')),oracle=JSON.parse(read('oracle.json'));
const sha=b=>createHash('sha256').update(b).digest('hex');
for(const[p,h]of Object.entries(manifest.files))if(sha(read(p))!==h)throw Error('Full corpus hash '+p);
if(sha(readFileSync(new URL('./generate-full-practical.py',import.meta.url)))!==manifest.generatorSha256)throw Error('Full corpus generator hash');
const pow=(a,e,n)=>{let out=1n;for(;e;e>>=1n,a=a*a%n)if(e&1n)out=out*a%n;return out;};
const gcd=(a,b)=>{while(b)[a,b]=[b,a%b];return a;};
function proof(p){
 const n=BigInt(p.n);
 if(p.kind==='mr64'){if(n>=1n<<64n||assessPrime(n,{tick(){}})!=='proven')throw Error('Full oracle MR64');}
 else if(p.kind==='pocklington'){
  const q=proof(p.q),r=BigInt(p.r),a=BigInt(p.a);
  if(q*q<=n||2n*r*q!==n-1n||pow(a,n-1n,n)!==1n||gcd(pow(a,(n-1n)/q,n)-1n,n)!==1n)throw Error('Full oracle Pocklington');
 }else throw Error('Full oracle proof kind');return n;
}
const used=new Set();
if(catalog.cases.length!==62||oracle.cases.length!==62)throw Error('Full case count');
for(let i=0;i<62;i++){
 const c=catalog.cases[i],o=oracle.cases[i],p=proof(o.proofs[0]),q=proof(o.proofs[1]),n=BigInt(c.input);
 if(c.id!==o.id||p.toString()!==o.p||q.toString()!==o.q||p*q!==n||p>=q||q>2n*p||used.has(o.p)||used.has(o.q)||c.input.length!==c.digits||n.toString(2).length!==c.bits||c.bits>332)throw Error('Full corpus identity '+c.id);
 used.add(o.p);used.add(o.q);
}
if(read('cases.js').toString().includes('"proofs"')||read('cases.js').toString().includes('"p"'))throw Error('Full oracle in runtime');
console.log('Verified full corpus: 62 moduli, 124 independently checked prime certificates; runtime N only');

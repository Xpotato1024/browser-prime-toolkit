import {readFileSync,readdirSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {makeCandidateCorpus} from '../bench/candidate-corpus.mjs';
const root=new URL('../',import.meta.url),read=p=>readFileSync(new URL(p,root)),sha=b=>createHash('sha256').update(b).digest('hex');
const oldHoldout=JSON.parse(read('bench/selection-holdout.json'));
const corpus=[...makeCandidateCorpus(false),...oldHoldout];
const ids=['balanced-10-0','holdout-balanced-80','balanced-13-0','balanced-96bit-0','balanced-112bit-0'];
const train=ids.map(id=>{const c=corpus.find(c=>c.id===id);if(!c)throw Error(id);return{...c,group:'general'};});
const m89=(1n<<89n)-1n;
train.push({id:'general-unbalanced-m89',input:(1009n*m89).toString(),factors:['1009',m89.toString()],bits:(1009n*m89).toString(2).length,group:'general',factorProof:'1009 MR64; M89 runtime probable only'});
function inputs(value,out){if(!value||typeof value!=='object')return;for(const [k,v]of Object.entries(value)){if(k==='input'&&typeof v==='string'&&/^[0-9]+$/.test(v))out.add(v);else if(typeof v==='object')inputs(v,out);}}
const prior=new Set(corpus.map(c=>c.input)),sources={};
function walk(path){for(const e of readdirSync(new URL(path,root),{withFileTypes:true})){
 const p=path+e.name;if(e.isDirectory())walk(p+'/');
 else if(e.name.endsWith('.json')&&!p.includes('staged-')){const b=read(p),set=new Set();inputs(JSON.parse(b),set);if(set.size){sources[p]=sha(b);for(const v of set)prior.add(v);}}
}}
walk('bench/');walk('docs/benchmarks/');
const outputs={'bench/staged-train.json':train,'bench/staged-prior-inputs.json':{baseHead:'82f1c3e4215bf990da142e82e8bc33fa55846b07',sources,inputs:[...prior].sort()}};
for(const [p,value]of Object.entries(outputs)){
 const out=JSON.stringify(value,null,2)+'\n';
 if(process.argv.includes('--check')){if(read(p).toString()!==out)throw Error('Frozen corpus changed '+p);}
 else {if(existsSync(new URL(p,root)))throw Error('Refuse overwrite '+p);writeFileSync(new URL(p,root),out);}
}
console.log('Frozen general group and prior inputs',train.length,prior.size);

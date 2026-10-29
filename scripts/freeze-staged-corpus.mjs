import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {reconstructStagedPrior} from './staged-prior-inventory.mjs';
import {makeCandidateCorpus} from '../bench/candidate-corpus.mjs';
const root=new URL('../',import.meta.url),read=p=>readFileSync(new URL(p,root));
const oldHoldout=JSON.parse(read('bench/selection-holdout.json'));
const corpus=[...makeCandidateCorpus(false),...oldHoldout];
const ids=['balanced-10-0','holdout-balanced-80','balanced-13-0','balanced-96bit-0','balanced-112bit-0'];
const train=ids.map(id=>{const c=corpus.find(c=>c.id===id);if(!c)throw Error(id);return{...c,group:'general'};});
const m89=(1n<<89n)-1n;
train.push({id:'general-unbalanced-m89',input:(1009n*m89).toString(),factors:['1009',m89.toString()],bits:(1009n*m89).toString(2).length,group:'general',factorProof:'1009 MR64; M89 runtime probable only'});
// A historical holdout cannot be redefined by later benchmark JSON files.
const frozenPrior=reconstructStagedPrior(corpus,read('bench/staged-prior-inputs.json'),read);
const outputs={'bench/staged-train.json':train,'bench/staged-prior-inputs.json':frozenPrior};
for(const [p,value]of Object.entries(outputs)){
 const out=JSON.stringify(value,null,2)+'\n';
 if(process.argv.includes('--check')){if(read(p).toString()!==out)throw Error('Frozen corpus changed '+p);}
 else {if(existsSync(new URL(p,root)))throw Error('Refuse overwrite '+p);writeFileSync(new URL(p,root),out);}
}
console.log('Frozen general group and prior inputs',train.length,frozenPrior.inputs.length);

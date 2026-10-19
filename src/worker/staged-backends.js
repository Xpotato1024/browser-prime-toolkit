import {createSupplementSplit} from '../engine/supplement.js';
import {createCountedSiqsSplit} from '../engine/siqs-counted.js';
export async function createStagedBackends(engineMode,{fault=false}={}) {
 if(!['brent','ecm','siqs','staged'].includes(engineMode)||typeof fault!=='boolean')throw TypeError('Backend profile');
 const [splitEcm,splitSiqs]=await Promise.all([
  engineMode==='ecm'||engineMode==='staged'?createSupplementSplit():null,
  engineMode==='siqs'||engineMode==='staged'?createCountedSiqsSplit('dense'):null
 ]);
 if(fault){if(!splitEcm)throw Error('Fault profile requires ECM');splitEcm.configureAudit({trap:1});}
 return{engineMode,splitEcm,splitSiqs,linearMemoryBytes:(splitEcm?67108864:0)+(splitSiqs?67108864:0),
  inspect:()=>({engineMode,ecm:splitEcm?.stats()??null,siqs:splitSiqs?.stats()??null})};
}

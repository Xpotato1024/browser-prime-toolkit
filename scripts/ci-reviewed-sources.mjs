// SPDX-License-Identifier: AGPL-3.0-only
import {readFileSync,readdirSync,existsSync,lstatSync,appendFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {fetchVerifiedSource,assertExternalCache,assertPinnedSource} from './verified-source-fetch.mjs';
export function mergeReviewedSources(groups){
 const entries=new Map();
 for(const group of groups)for(const entry of group){
  assertPinnedSource(entry);const prior=entries.get(entry.file);
  if(prior&&JSON.stringify(prior)!==JSON.stringify(entry))throw Error('Conflicting source identity: '+entry.file);
  entries.set(entry.file,entry);
 }
 return [...entries.values()].sort((a,b)=>a.file<b.file?-1:1);
}
export function sourceKey(entries){
 return 'reviewed-raw-v1-'+createHash('sha256').update(JSON.stringify(mergeReviewedSources([entries]).map(({file,bytes,sha256})=>({file,bytes,sha256})))).digest('hex');
}
export function cachePolicy(requested,matched,hit=''){
 if(typeof requested!=='string'||!/^reviewed-raw-v1-[a-f0-9]{64}$/.test(requested))throw Error('Invalid source cache key');
 if(!['','false','true'].includes(hit)||hit==='true'&&!matched||matched&&hit!=='true')throw Error('Inconsistent source cache status');
 if(matched&&matched!==requested)throw Error('Nonexact source cache match');
 return matched===requested?'verify':'prepare';
}
export function assertArtifactId(id){
 if(typeof id!=='string'||!/^[1-9][0-9]*$/.test(id))throw Error('One explicit artifact ID required');
 return id;
}
export function loadReviewedSources(root){
 const json=p=>JSON.parse(readFileSync(join(root,p),'utf8'));
 const entries=mergeReviewedSources([json('native/gmp/upstreams.json'),json('native/siqs-full/staged-upstreams.json')]);
 const plans=[...json('native/siqs-fetch/staged-candidate-transports.json'),...json('native/siqs-fetch/staged-transports.json')];
 if(new Set(plans.map(p=>p.file)).size!==plans.length)throw Error('Duplicate source transport plan');
 for(const plan of plans){
  const entry=entries.find(e=>e.file===plan.file);
  if(!entry||entry.bytes!==plan.bytes||entry.sha256!==plan.sha256||entry.url!==plan.urls[0])throw Error('Transport artifact identity');
 }
 return entries.map(entry=>({...entry,urls:plans.find(p=>p.file===entry.file)?.urls??[entry.url,entry.url]}));
}
export function prepareSources({root,directory,entries,mode='verify',fetchSource=fetchVerifiedSource}){
 assertExternalCache(root,directory);
 if(!['prepare','verify'].includes(mode))throw Error('Explicit source cache mode required');
 if(existsSync(directory)&&(!lstatSync(directory).isDirectory()||lstatSync(directory).isSymbolicLink()))throw Error('Regular source cache directory required');
 const present=existsSync(directory)?readdirSync(directory):[];
 const expected=entries.map(e=>e.file).sort();
 if(mode==='verify'||present.length){
  if(JSON.stringify(present.sort())!==JSON.stringify(expected))throw Error('Exact source archive set required');
  mode='verify';
 }
 const receipts=entries.map(entry=>fetchSource(entry,{directory,urls:entry.urls,requireCache:mode==='verify'}));
 // Verify the completed producer output exactly as consumers will, without network.
 if(mode==='prepare')return {...prepareSources({root,directory,entries,mode:'verify',fetchSource}),acquisition:receipts};
 return {schema:1,key:sourceKey(entries),files:receipts.length,bytes:entries.reduce((sum,e)=>sum+e.bytes,0),receipts};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const root=resolve(import.meta.dirname,'..'),[mode,value]=process.argv.slice(2);
 if(mode==='artifact-id')console.log(assertArtifactId(value));
 else{
  const entries=loadReviewedSources(root),key=sourceKey(entries);
  if(mode==='key'){
   console.log(key);if(process.env.GITHUB_OUTPUT)appendFileSync(process.env.GITHUB_OUTPUT,'key='+key+'\n');
  }else{
   const selected=mode==='restore'?cachePolicy(key,process.env.SOURCE_CACHE_MATCHED_KEY??'',process.env.SOURCE_CACHE_HIT??''):mode;
   const receipt=prepareSources({root,directory:value,entries,mode:selected});
   console.log('CI_REVIEWED_SOURCES '+JSON.stringify(receipt));
  }
 }
}

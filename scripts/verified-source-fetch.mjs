import {readFileSync,writeFileSync,existsSync,mkdirSync,mkdtempSync,rmSync,statSync} from 'node:fs';
import {join,resolve,relative,sep,isAbsolute} from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const sha=b=>createHash('sha256').update(b).digest('hex');
const transient=new Set([6,7,18,28,52,55,56]);
export function assertExternalCache(root,directory){
 if(typeof directory!=='string'||!directory)throw Error('Set external source cache');
 const target=resolve(directory),rel=relative(resolve(root),target);
 if(!(rel==='..'||rel.startsWith('..'+sep)||isAbsolute(rel)))throw Error('Source cache must be outside repository');
 return target;
}
export function fetchVerifiedSource(entry,{directory,urls=[entry.url],curl=spawnSync}={}){
 if(!entry||!/^[A-Za-z0-9_+-][A-Za-z0-9._+-]*$/.test(entry.file)||entry.file.includes('..')||!Number.isSafeInteger(entry.bytes)||entry.bytes<1||entry.bytes>16777216||!/^[a-f0-9]{64}$/.test(entry.sha256))throw Error('Invalid pinned source');
 if(typeof directory!=='string'||!directory||!Array.isArray(urls)||urls.length<1||urls.length>2||urls[0]!==entry.url)throw Error('Invalid transport plan');
 for(const value of urls){const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.hash)throw Error('HTTPS source required');}
 const verify=path=>{if(statSync(path).size!==entry.bytes)throw Error('Source size mismatch: '+entry.file);const b=readFileSync(path);if(sha(b)!==entry.sha256)throw Error('Source hash mismatch: '+entry.file);return b;};
 mkdirSync(directory,{recursive:true});const destination=join(directory,entry.file);
 if(existsSync(destination)){verify(destination);return {file:entry.file,bytes:entry.bytes,sha256:entry.sha256,source:'verified-cache',url:null,attempts:[]};}
 const attempts=[];
 for(const url of urls){
  const temporary=mkdtempSync(join(directory,'.verified-fetch-'));
  try{
   const download=join(temporary,'source');
   const result=curl('curl',['--fail','--silent','--show-error','--location','--max-redirs','5','--proto','=https','--proto-redir','=https','--tlsv1.2',
    '--connect-timeout','10','--max-time','60','--max-filesize',String(entry.bytes),'--write-out','%{http_code}','--output',download,url],
    {timeout:70000,maxBuffer:65536});
   const status=result.status,http=String(result.stdout??'').trim();
   attempts.push({url,status,http,detail:String(result.stderr??result.error??'').slice(0,2048)});
   if(status!==0){
    if(transient.has(status)||(status===22&&/^(408|429|500|502|503|504)$/.test(http)))continue;
    throw Error('Non-retryable source transport '+entry.file+': '+status);
   }
   const bytes=verify(download);
   writeFileSync(destination,bytes,{flag:'wx'});
   return {file:entry.file,bytes:entry.bytes,sha256:entry.sha256,source:'verified-download',url,attempts};
  }finally{rmSync(temporary,{recursive:true,force:true});}
 }
 throw Error('Pinned source transport exhausted '+entry.file+': '+JSON.stringify(attempts));
}

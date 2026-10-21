// SPDX-License-Identifier: AGPL-3.0-only
import {readFileSync,readdirSync} from 'node:fs';
import {readFile,readdir} from 'node:fs/promises';
import {join} from 'node:path';
function latest(names){
 const samples=names.filter(n=>/^windows-memory-sample-.*\.json$/.test(n));
 if(!samples.length||samples.length>271||new Set(samples).size!==samples.length||samples.some(n=>!/^windows-memory-sample-\d{4}\.json$/.test(n)||Number(n.slice(-9,-5))>270))throw Error('Bounded immutable Windows RAM channel required');
 return samples.sort().at(-1);
}
function validate(bytes,filename,now){
 bytes=Buffer.from(bytes);if(bytes.length>4096)throw Error('Windows receipt size');
 const value=JSON.parse(bytes),age=now()-Date.parse(value.checkedAt);
 if(Object.keys(value).sort().join(',')!=='availableMiB,checkedAt,host,source,totalMiB'||value.host!=='LLM-01'||value.source!=='Win32_OperatingSystem'||!Number.isFinite(value.availableMiB)||value.availableMiB<0||!Number.isFinite(value.totalMiB)||value.totalMiB<value.availableMiB||!Number.isFinite(age)||age<0||age>30000)throw Error('Fresh Windows memory monitor required');
 return {bytes,value,filename,age};
}
export function readWindowsMemorySync(directory,{read=readFileSync,list=readdirSync,now=Date.now}={}){
 const filename=latest(list(directory));return validate(read(join(directory,filename)),filename,now);
}
export async function readWindowsMemory(directory,{read=readFile,list=readdir,now=Date.now}={}){
 const filename=latest(await list(directory));return validate(await read(join(directory,filename)),filename,now);
}

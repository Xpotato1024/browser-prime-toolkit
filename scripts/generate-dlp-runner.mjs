// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Xpotato.net / Xpotato1024
import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const path=new URL('../src/rusqsieve-dlp/runner.js',import.meta.url);
let source=readFileSync(new URL('../src/rusqsieve/runner.js',import.meta.url),'utf8');
function change(a,b){assert.equal(source.split(a).length,2,'Runner anchor '+a.slice(0,60));source=source.replace(a,b);}
change("from './contracts.js';","from '../rusqsieve/contracts.js';\nimport {dlpProfile,validateDlpConfiguration,validateDlpStats,validateDlpTimings} from './contracts.js';");
change('const {workers=1,','const {profile=\'baseline\',workers=1,');
change('const inputInfo=validateInput(input);','const inputInfo=validateInput(input);dlpProfile(profile);if(retainLocal!==false||shareContext!==true)throw Error("Fixed DLP ownership");');
change("bytesSubmitted=0;","bytesSubmitted=0,collectorStats=null;");
source=source.replaceAll('version:17','version:18').replaceAll('d.version!==17','d.version!==18');
change('resolve({input,kind,','resolve({profile,configuration:owners[0]?.config??null,collectorStats,wrapperTimingByOwner:owners.map(o=>({owner:o.index,timings:o.timings??null})),input,kind,');
change("for(const m of [d.memory,d.before,d.after].filter(Boolean))validateMemory(m);","validateDlpTimings(d.timings,owner.timings);owner.timings=d.timings;\n    for(const m of [d.memory,d.before,d.after].filter(Boolean))validateMemory(m);");
change("if(owner.command!=='init')throw Error('Unexpected ready');","if(owner.command!=='init')throw Error('Unexpected ready');validateDlpConfiguration(d.config,profile,inputInfo.bits);owner.config=d.config;");
change("record('ready',{owner:owner.index,memory:d.memory});","record('ready',{owner:owner.index,memory:d.memory,config:d.config,timings:d.timings});");
change("if(owner.index===0){target=d.target;","if(owner.index===0){validateDlpStats(d.dlpStats,null,0,0);collectorStats=d.dlpStats;target=d.target;");
change("if(owners.length===workers&&owners.every(o=>o.ready)){","if(owners.length===workers&&owners.every(o=>o.ready)){for(const o of owners)if(JSON.stringify(o.config)!==JSON.stringify(owners[0].config))throw Error('Owner configuration mismatch');if(owners[0].config.factorBaseSize!==factorBaseSize)throw Error('Configured factor-base mismatch');");
change("relations=d.relations;submitJob=null;owner.command=null;","relations=d.relations;validateDlpStats(d.dlpStats,collectorStats,rawRelationsSubmitted,relations);collectorStats=d.dlpStats;submitJob=null;owner.command=null;");
change("record('batch',{owner:owner.index,first:d.first,count:d.count,memory:d.memory,stats:checked});","record('batch',{owner:owner.index,first:d.first,count:d.count,memory:d.memory,stats:checked,timings:d.timings});");
change("record('submitted',{families:submitted,relations,memory:d.memory});onProgress({families:submitted,relations,target,memory:d.memory});","record('submitted',{families:submitted,relations,memory:d.memory,collectorStats,timings:d.timings});onProgress({families:submitted,relations,target,memory:d.memory,collectorStats,timings:d.timings});");
change("post(owner,'init',{input,role:","post(owner,'init',{input,profile,role:");
if(process.argv.includes('--check'))assert.equal(readFileSync(path,'utf8'),source);else writeFileSync(path,source);
console.log('DLP runner preserves base lifecycle with explicit profile/telemetry changes');

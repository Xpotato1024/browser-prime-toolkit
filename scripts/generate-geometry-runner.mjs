// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Xpotato.net / Xpotato1024
import {readFileSync,writeFileSync} from 'node:fs';import assert from 'node:assert/strict';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
let source=read('src/rusqsieve-scheduler/runner.js');
const change=(a,b)=>{assert.equal(source.split(a).length,2,'Geometry runner anchor '+a);source=source.replace(a,b);};
change("import {dlpProfile,validateDlpConfiguration,validateDlpStats,validateDlpTimings} from '../rusqsieve-dlp/contracts.js';","import {validateDlpStats,validateDlpTimings} from '../rusqsieve-dlp/contracts.js';\nimport {geometryProfile,validateGeometryConfiguration} from './contracts.js';");
change("from './credits.js'","from '../rusqsieve-scheduler/credits.js'");change("from './metrics.js'","from '../rusqsieve-scheduler/metrics.js'");
change("scheduler='batch2'","scheduler='credit1'");change("profile='baseline'","profile='b325-m524'");
change("if(profile!=='baseline'||","if(scheduler!=='credit1'||");
source=source.replaceAll('dlpProfile(profile)','geometryProfile(profile)').replaceAll('validateDlpConfiguration(','validateGeometryConfiguration(').replaceAll('version:19','version:20').replaceAll('d.version!==19','d.version!==20');
let body=read('src/rusqsieve-scheduler/worker-body.js').replaceAll('version:19','version:20').replaceAll('d.version!==19','d.version!==20').replace("profile='baseline'","profile='b325-m524'").replace('dlpProfile(profile)','geometryProfile(profile).code').replaceAll('validateDlpConfiguration(','validateGeometryConfiguration(');
const helper=`function aDetails(read){
 const g=(field,family=0)=>{const x=read(field,family);if(typeof x!=='bigint'||x<0n||x>1000000n)throw Error('Native A observation unavailable');return Number(x);};
 const q2=g(1);if(q2>1)throw Error('Native Q2 flag');
 return{version:1,multiplier:g(0),q2:Boolean(q2),targetBits:g(2),factorCount:g(3),allCount:g(4),poolCount:g(5),variants:g(6),samples:Array.from({length:64},(_,family)=>({family,bits:g(7,family),ratioMilli:g(8,family)}))};
}
`;
assert.equal(body.split('function configuration(){').length,2);body=body.replace('function configuration(){',helper+'function configuration(){');
body=body.replace(' validateGeometryConfiguration(c,profile,',` c.aDistribution=aDetails((field,family)=>api.codex_geometry_worker_detail(context,field,family));
 if(role==='coord'&&JSON.stringify(c.aDistribution)!==JSON.stringify(aDetails((field,family)=>api.codex_geometry_coord_detail(session,field,family))))throw Error('Local A context mismatch');
 validateGeometryConfiguration(c,profile,`);
for(const[p,s]of [['src/rusqsieve-geometry/runner.js',source],['src/rusqsieve-geometry/worker-body.js',body]]){const path=new URL('../'+p,import.meta.url);if(process.argv.includes('--check'))assert.equal(readFileSync(path,'utf8'),s);else writeFileSync(path,s);}
console.log('Geometry derives the reviewed bounded scheduler and lifecycle with named native context observation');

// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Xpotato.net / Xpotato1024
import {readFileSync,writeFileSync} from 'node:fs';import assert from 'node:assert/strict';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
let s=read('src/resources/runner.js');
const change=(a,b)=>{assert.equal(s.split(a).length,2,'Coordinator anchor '+a);s=s.replace(a,b);};
for(const path of ['credits','worker-sources','policy'])change("from './"+path+".js'","from '../resources/"+path+".js'");
change("const {scheduler='credit1'","const {coordinatorCompute=true,scheduler='credit1'");
change("validateResourcePlan(resourcePlan);","validateResourcePlan(resourcePlan);if(typeof coordinatorCompute!=='boolean'||!coordinatorCompute&&workers<2)throw Error('Dedicated coordinator requires helpers');");
change("resolve({resourcePlan,scheduler,","resolve({resourcePlan,coordinatorCompute,scheduler,");
change("if(owner.job||owner.command||owner.retired)continue;","if(owner.job||owner.command||owner.retired||!owner.canCompute)continue;");
change("owner={index,worker,","owner={index,canCompute:coordinatorCompute||index!==0,worker,");
change("owner:o.index,command:o.command,job:","owner:o.index,canCompute:o.canCompute,command:o.command,job:");
let m=read('src/resources/metrics.js').replace('blockedIdleMs:0,globalCapacityIdleMs:0','coordinatorIdleMs:0,blockedIdleMs:0,globalCapacityIdleMs:0').replace("owned[i]>=credit?'blockedIdleMs'","o.canCompute===false?'coordinatorIdleMs':owned[i]>=credit?'blockedIdleMs'");
m=m.replace('host assigned-job wall occupancy;','host assigned-job wall occupancy; dedicated coordinator idle is separate;');
for(const[p,text]of [['src/coordinator/runner.js',s],['src/coordinator/metrics.js',m]]){const path=new URL('../'+p,import.meta.url);if(process.argv.includes('--check'))assert.equal(readFileSync(path,'utf8'),text);else writeFileSync(path,text);}
console.log('Dedicated coordinator derives only host dispatch/role metrics; native Worker and artifacts unchanged');

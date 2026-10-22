// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Xpotato.net / Xpotato1024
import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8'),path=new URL('../src/rusqsieve-scheduler/runner.js',import.meta.url);
let source=read('src/rusqsieve-dlp/runner.js');
function change(a,b){assert.equal(source.split(a).length,2,'Scheduler runner anchor '+a.slice(0,70));source=source.replace(a,b);}
change("from './contracts.js';","from '../rusqsieve-dlp/contracts.js';\nimport {CreditLedger,schedulerProfile} from './credits.js';\nimport {OwnerClock,PacketAudit} from './metrics.js';");
change("const {profile='baseline',","const {scheduler='batch2',fixedFamilies=null,capturePackets=false,profile='baseline',");
change("const inputInfo=validateInput(input);","const policy=schedulerProfile(scheduler);if(profile!=='baseline'||typeof capturePackets!=='boolean'||fixedFamilies!==null&&fixedFamilies!==4)throw Error('Frozen scheduler limits');\n const inputInfo=validateInput(input);");
change('collectorStats=null;','collectorStats=null,ledger=null,clock=null;const audit=new PacketAudit(capturePackets);\n  const tick=()=>{if(clock)clock.transition(now(),owners,ledger.owned,policy.credit);};');
change("const post=(owner,type,data={},transfer=[])=>{owner.command=type;","const post=(owner,type,data={},transfer=[])=>{owner.command=type;tick();");
source=source.replaceAll('version:18','version:19').replaceAll('d.version!==18','d.version!==19');
change('if(done)return;done=true;','if(done)return;clock?.finish(now());ledger?.close();done=true;');
change('resolve({profile,configuration:','resolve({scheduler,fixedFamilies,ownerActivity:clock?.result()??null,activeAtStop:owners.map(o=>({owner:o.index,command:o.command,job:o.job?{first:o.job.first,count:o.job.count}:null})),creditState:ledger?{owned:[...ledger.owned],outstanding:ledger.issued-ledger.submitted,peakOutstanding:ledger.peakOutstanding,reservedBytes:ledger.reservedBytes,peakReservedBytes:ledger.peakReserved}:null,auditBytes:audit.bytes,packetArchives:audit.packets,profile,configuration:');
change("phase='releasing';","clock?.finish(now());phase='releasing';");
change("if(done||phase!=='collecting')return;","if(done||phase!=='collecting')return;tick();");
change('const item=pending.get(submitted);pending.delete(submitted);item.bytes=item.buffer.byteLength;submitJob=item;','const item=ledger.beginSubmission();if(!item)throw Error("Submission ledger");submitJob=item;');
change('if(relations>=target)drain=true;','if(fixedFamilies===null&&relations>=target)drain=true;');
change("if((drain||issued>=familyBudget)&&owners.every(o=>!o.job&&!o.command)&&!pending.size){release();return;}","if((drain||issued>=ledger.budget)&&owners.every(o=>!o.job&&!o.command)&&!pending.size){if(fixedFamilies!==null&&submitted===fixedFamilies){finish('incomplete','fixed-family-bound');return;}release();return;}");
change("for(const owner of owners){if(owner.job||owner.command||owner.retired||issued>=familyBudget)continue;\n    const count=Math.min(LIMITS.batchFamilies,familyBudget-issued),job={jobId:issued,first:issued,count,owner:owner.index};\n    issued+=count;owner.job=job;post(owner,'job',{...job,target,factorBaseSize,familyBudget});","for(const owner of owners){if(owner.job||owner.command||owner.retired)continue;\n    const job=ledger.issue(owner.index);if(!job)continue;issued=ledger.issued;owner.job=job;post(owner,'job',{...job,target,factorBaseSize,familyBudget});");
change("initializedMs=now()-started;phase='collecting';pump();","initializedMs=now()-started;ledger=new CreditLedger(workers,scheduler,Math.min(familyBudget,fixedFamilies??familyBudget),pending);clock=new OwnerClock(workers,now());phase='collecting';pump();");
change("owner.command=null;transport+=d.buffer.byteLength;peakTransport=Math.max(peakTransport,transport);if(transport>LIMITS.transportBytes)throw Error('Transport bound');\n    pending.set(d.first,{...owner.job,buffer:d.buffer,stats:checked});","ledger.returned(owner.index,owner.job,{buffer:d.buffer,stats:checked});try{audit.add(owner.job,new Uint8Array(d.buffer));}catch{return finish('incomplete','audit-retention-cap');}\n    owner.job=null;owner.command=null;transport=ledger.transport;peakTransport=ledger.peakTransport;");
change("const item=submitJob;transport-=item.bytes;owners[item.owner].job=null;submitted+=item.count;","const item=ledger.ack(d.jobId);transport=ledger.transport;submitted=ledger.submitted;");
change("post(owner,'init',{input,profile,role:","post(owner,'init',{input,profile,scheduler,role:");
if(process.argv.includes('--check'))assert.equal(readFileSync(path,'utf8'),source);else writeFileSync(path,source);
let body=read('src/rusqsieve-dlp/worker-body.js').replaceAll('version:18','version:19').replaceAll('d.version!==18','d.version!==19');
const bodyChange=(a,b)=>{assert.equal(body.split(a).length,2,'Scheduler body anchor '+a);body=body.replace(a,b);};
bodyChange("profile='baseline';","profile='baseline',packetBytes=16777216;");
bodyChange("function take(handle){","function take(handle,maximum=LIMITS.packetBytes){");
bodyChange("n>LIMITS.packetBytes","n>maximum");
bodyChange("profile=d.profile;const profileNumber=dlpProfile(profile)","profile=d.profile;packetBytes=schedulerProfile(d.scheduler).packetBytes;const profileNumber=dlpProfile(profile)");
bodyChange("const{first,count,jobId}=d;","const{first,count,jobId}=d;if(d.packetBytes!==packetBytes)throw Error('Reserved packet limit');");
bodyChange("()=>take(handle)","()=>take(handle,packetBytes)");
const bodyPath=new URL('../src/rusqsieve-scheduler/worker-body.js',import.meta.url);
if(process.argv.includes('--check'))assert.equal(readFileSync(bodyPath,'utf8'),body);else writeFileSync(bodyPath,body);
console.log('Scheduler derives frozen original numeric/lifecycle code with explicit bounded-credit/audit changes');

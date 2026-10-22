import {writeGenerated} from './generated-file.mjs';
import {readFileSync} from 'node:fs';
const r=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8'),w=(p,s)=>writeGenerated(new URL('../'+p,import.meta.url),s);
const sub=(s,a,b)=>{if(s.split(a).length!==2)throw Error('Patch count '+a);return s.replace(a,b);};
let s=r('src/engine/siqs.js');
s=sub(s,'createSiqsSplit(', 'createSiqsProfile(');
s=sub(s,'let active=null,stopped=null,poisoned=false;',`let active=null,stopped=null,poisoned=false,profile;
  function sample(phase) {
    const t=performance.now();
    if(profile.last!==null)profile.wallMs[profile.phase]+=t-profile.last;
    profile.last=t;profile.phase=phase;
  }`);
s=sub(s,'env:{budget_tick() {',`env:{budget_tick(phase) {
      if(!Number.isInteger(phase)||phase<0||phase>6)throw Error('Invalid profile phase');
      profile.calls[phase]++;
      if(phase!==profile.phase||(profile.calls[phase]&1023)===0)sample(phase);`);
s=sub(s,'active=budget;stopped=null;',`profile={calls:Array(7).fill(0),wallMs:Array(7).fill(0),phase:0,last:performance.now()};
    active=budget;stopped=null;`);
s=sub(s,'finally {active=null;stopped=null;}', 'finally {sample(profile.phase);active=null;stopped=null;}');
s=sub(s,'split.stats=()=>({liveBytes:', 'split.stats=()=>({profile:profile?{calls:profile.calls,wallMs:profile.wallMs,samplingEvery:1024}:null,log:split.log(),liveBytes:');
w('src/engine/siqs-profile.js',s);

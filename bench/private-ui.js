import {app,page} from '../app/main.js';
import {createPageLifecycle} from '../src/ui/page-lifecycle.js';
import {mountFactorApp} from '../src/ui/mount.js';
import {runSelectedStagedRequest} from '../src/worker/staged-selected.js';
import {makeStagedWorker} from '../src/worker/staged-factory.js';
import {factorStaged} from '../src/engine/staged-factor.js';
const violations=[],errors=[],rejections=[];
addEventListener('securitypolicyviolation',e=>violations.push({directive:e.violatedDirective,blocked:e.blockedURI}));
addEventListener('error',e=>errors.push(e.message));
addEventListener('unhandledrejection',e=>rejections.push(String(e.reason)));
const root=document.getElementById('factor-app'),assert=(ok,message)=>{if(!ok)throw Error(message);};
const q=s=>{const e=root.querySelector(s);assert(e,'Missing UI element '+s);return e;};
const tick=ms=>new Promise(r=>setTimeout(r,ms));
let current=app,live=0,maxLive=0,created=0,posted=false;
function tracked(plan){
 const w=makeStagedWorker(plan);created++;live++;maxLive=Math.max(maxLive,live);let dead=false;
 const terminate=w.terminate.bind(w),post=w.postMessage.bind(w);
 w.terminate=()=>{terminate();if(!dead){dead=true;live--;}};
 w.postMessage=data=>{if(data.type==='run')posted=true;post(data);};return w;
}
const realRun=(input,options,deps)=>runSelectedStagedRequest(input,options,{...deps,createWorker:tracked});
const finished=input=>({...factorStaged(BigInt(input)),origin:'worker',traceAvailable:true});
function setup(run=realRun,writeClipboard){current.dispose();root.replaceChildren();current=mountFactorApp(root,{run,writeClipboard});posted=false;}
async function settled(){
 for(let i=0;i<400;i++){const s=current.getState();if(['result','invalid','error'].includes(s.phase))return s;await tick(5);}
 throw Error('UI did not settle');
}
async function submit(raw){q('#integer-input').value=raw;q('form').requestSubmit();return settled();}
const cases=[
 ['exact decimal, powers and repeated factors',async()=>{
  setup();
  for(const [raw,input,speech]of [['3.2e1','32','32 は 2の5乗'],['360','360','360 は 2の3乗 × 3の2乗 × 5'],
   ['9007199254740991','9007199254740991'],['9007199254740992','9007199254740992','9007199254740992 は 2の53乗'],
   ['9007199254740993','9007199254740993'],[(3n**45n).toString(),(3n**45n).toString()]]){
   const s=await submit(raw);assert(s.phase==='result','Real engine result');
   assert(q('#submitted-integer').value===input,'Exact submitted decimal');assert(s.view.copyText.startsWith(input+' = '),'Exact copied input');
   if(speech)assert(q('#result-equation').getAttribute('aria-label')===speech,'Spoken exponent');
  }
  await submit('32');assert(q('sup').textContent==='5','Visible superscript');
 }],
 ['labels, invalid range, zero and one',async()=>{
  setup();assert(q('label[for="integer-input"]').textContent==='整数','Input label');
  assert(q('#ui-status').getAttribute('role')==='status','Live status');
  const before=created;await submit((1n<<128n).toString());
  assert(current.getState().phase==='invalid','Range rejected');assert(created===before,'No out-of-range Worker');
  assert(q('#integer-input').getAttribute('aria-invalid')==='true','Invalid semantic');
  assert(q('#input-error').textContent.length>0,'Linked error');
  for(const n of ['0','1']){await submit(n);assert(q('#result-description').textContent.includes('素数でも合成数でもありません'),'Neither');}
 }],
 ['probable is explicit and copied',async()=>{
  const n=(2n*((1n<<89n)-1n)).toString();setup();await submit(n);
  assert(q('#result-description').textContent.includes('未証明'),'Visible probable');
  assert(current.getState().view.copyText.includes('未証明'),'Copy probable');
 }],
 ['partial residual has a distinct label',async()=>{
  const r={input:'18',factors:[{value:'2',certainty:'proven',method:'small-prime'}],remaining:'9',operations:5,elapsedMs:1,
   status:'incomplete',reason:'host-timeout',primality:'composite',algorithm:'staged',seed:1,policy:'p64',origin:'host',traceAvailable:false,stages:null,grants:null};
  setup(async()=>r);await submit('18');assert(q('#result-equation').textContent.includes('未解決: 9'),'Residual label');
  assert(current.getState().view.copyText.includes('[未解決: 9]'),'Residual copy');
 }],
 ['copy success and rejection fallback',async()=>{
  const written=[];setup(realRun,async text=>written.push(text));await submit('32');q('#copy-result').click();await tick(0);
  assert(written[0].startsWith('32 = 2^5\n'),'Canonical exponent copy');assert(q('#copy-status').textContent.includes('コピーしました'),'Copy feedback');
  setup(realRun,async()=>{throw Error('denied');});await submit('32');q('#copy-result').click();await tick(0);
  const fallback=q('#copy-fallback');assert(!fallback.hidden&&fallback.value.startsWith('32 = 2^5\n'),'Selectable fallback');
  assert(document.activeElement===fallback&&fallback.selectionStart===0&&fallback.selectionEnd===fallback.value.length,'Fallback selected');
 }],
 ['old clipboard completion cannot change a newer result',async()=>{
  let release;setup(realRun,()=>new Promise(r=>release=r));await submit('32');q('#copy-result').click();
  await submit('64');release();await tick(0);assert(current.getState().view.equation==='64 = 2^6','New result retained');
  assert(q('#copy-status').textContent==='','No stale feedback');
 }],
 ['loading and running cancellation own at most one Worker',async()=>{
  const input='3894222643488354664636594044948941';
  for(const when of ['loading','running']){
   setup();q('#integer-input').value=input;q('form').requestSubmit();
   if(when==='running'){for(let i=0;i<1000&&!posted;i++)await tick(1);assert(posted,'Worker run posted');await tick(30);}
   q('#cancel-computation').click();assert(q('#start-computation').disabled,'Cancel keeps owner');
   const state=await settled();assert(state.view.status==='cancelled','Cancelled result');assert(live===0,'Owner retired');
  }
 }],
 ['persisted page lifecycle retires a running owner and restores a usable draft',async()=>{
  current.dispose();const target=new EventTarget();
  const lifecycle=createPageLifecycle(root,{target,mount:node=>mountFactorApp(node,{run:realRun})});
  current=lifecycle.getApp();
  try{
   const input='3894222643488354664636594044948941';
   q('#integer-input').value=input;q('form').requestSubmit();
   target.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true}));await tick(0);
   assert(live===0&&root.childElementCount===0,'Hidden owner retired');
   target.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));current=lifecycle.getApp();
   assert(q('#integer-input').value===input&&current.getState().phase==='idle','Draft restored without automatic calculation');
   await submit('32');assert(current.getState().view.equation==='32 = 2^5','Restored UI computes');
  }finally{lifecycle.dispose();}
 }],
 ['fatal UI recovers on a new explicit request',async()=>{
  let count=0;setup(async input=>{if(++count===1)throw Error('trap');return finished(input);});
  await submit('32');assert(current.getState().phase==='error'&&q('#copy-result').disabled,'Fatal blocks copy');
  await submit('32');assert(current.getState().view.equation==='32 = 2^5','Fresh recovery');
 }]
];
globalThis.evaluationHarness={
 async run(){
  page.dispose();
  const tests=[];for(const[name,fn]of cases){try{await fn();tests.push({name,pass:true});}catch(e){tests.push({name,pass:false,error:e.message});}finally{current.dispose();await tick(0);}}
  setup();return{tests,created,maxLive};
 },
 async restore(){setup();await submit('360');return current.getState().view.copyText;},
 state:()=>current.getState(),ownership:()=>({live,maxLive}),violations,errors,rejections
};

// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Xpotato.net / Xpotato1024
import {createProgressTracker,stopReasonPresentation} from './progress.js';
import {makeComputeScope} from './document-scope.js';
import {validateSiteInput,siteInputErrorMessage,selectSitePlan} from './policy.js';
import * as lightModule from '../resources/light-adapter.js';
import * as optimizedModule from '../optimized/index.js';
import * as wideModule from '../selected-wide/index.js';
import * as extendedModule from '../extended/runner.js';
import {EXTENDED_RUNNER_LIMITS} from '../extended/policy.js';
import {makeExtendedResultView} from '../extended/result-view.js';
import {makeResultView} from '../ui/result-view.js';
import {assessPrime} from '../engine/arithmetic.js';
import {UINT64_CEILING} from '../engine/options.js';
const boundary=1n<<128n;
export const heavyView=(r,input,{now,deadline})=>{
 let ticks=0;const budget={tick(){if(++ticks>100000||now()>=deadline)throw Error('Display proof budget');}};
 if(!r||r.input!==input||!['factorized','probable','partial','incomplete','timeout','cancelled'].includes(r.kind)||r.allWorkersDisposed!==true||r.allWorkerSourcesReleased!==true||!Array.isArray(r.factors)||r.factors.length>2||typeof r.remaining!=='string'||r.remaining.length>100||!/^[1-9][0-9]*$/.test(r.remaining))throw Error('Result contract');
 let product=BigInt(r.remaining),previous=1n;const n=BigInt(input),terms=[];
 for(const f of r.factors){
  if(typeof f.value!=='string'||f.value.length>100||!/^[1-9][0-9]*$/.test(f.value)||!['proven','probable'].includes(f.certainty))throw Error('Factor contract');
  const d=BigInt(f.value);if(d<=1n||d>=n||n%d)throw Error('Proper divisor');
  if(d<previous||f.certainty==='proven'&&d>=UINT64_CEILING||f.certainty==='probable'&&d<UINT64_CEILING||assessPrime(d,budget)!==f.certainty)throw Error('Prime certainty');previous=d;
  product*=d;terms.push(f.value+(f.certainty==='probable'?'（未証明）':''));
 }
 if(r.factors.length===2&&r.factors[0].value===r.factors[1].value)terms.splice(0,terms.length,r.factors[0].value+'^2'+(r.factors[0].certainty==='probable'?'（未証明）':''));
 if(product!==n||['factorized','probable'].includes(r.kind)&&(r.remaining!=='1'||r.factors.length!==2)||r.kind==='factorized'&&r.factors.some(f=>f.certainty!=='proven')||r.kind==='probable'&&!r.factors.some(f=>f.certainty==='probable'))throw Error('Factor product');
 if(r.factors.length&&now()>=deadline)throw Error('Display proof deadline');
 const complete=['factorized','probable'].includes(r.kind);
 const status=r.kind==='cancelled'?'中止しました。':complete?r.kind==='probable'?'未証明の因子を含みます。素数証明ではありません。':'分解完了（確定判定）。':'未完了です。未解決部分は素数とは限りません。';
 if(r.remaining!=='1')terms.push('[未解決: '+r.remaining+']');
 const equation=input+' = '+terms.join(' × ');
 const reasonText=stopReasonPresentation(r.reason)?.text??'';
 const groups=[];for(const f of r.factors){const last=groups.at(-1);if(last?.base===f.value)last.exponent++;else groups.push({base:f.value,exponent:1,certainty:f.certainty});}
 return{reasonCode:r.reason,groups,residual:r.remaining==='1'?null:r.remaining,equation,reasonText,certaintyText:r.factors.map(f=>f.value+': '+(f.certainty==='proven'?'確定判定':'未証明（probable）')).join('、'),copyText:[equation,status,reasonText].filter(Boolean).join('\n'),statusText:status};
};
export function createSiteSession({scope=makeComputeScope(),hints={},loadLight=async()=>lightModule,loadHeavy=async name=>name==='wide'?wideModule:optimizedModule,loadExtended=async()=>extendedModule,onChange=()=>{},now=()=>performance.now()}={}){
 let light=null,heavy=null,extendedApi=null,engine='standard',preparing=false,active=null,closed=false,blocked=false,generation=0;
 const progress=createProgressTracker();
 let state={phase:'unprepared',engine,input:null,view:null,error:null,errorField:null,resources:null};
 const emit=next=>{state={...next,progress:progress.get()};if(!closed)onChange(structuredClone(state));};
 return{
  getState:()=>structuredClone(state),
  getElapsedMs:()=>active?Math.max(0,now()-active.startedAt):state.resources?.elapsedMs??0,
  async prepare(next='standard'){
   if(closed||blocked||active||preparing)return false;
   if(scope.isQuarantined()){blocked=true;emit({...state,phase:'blocked',errorField:'runtime',error:'Workerの解放を確認できないため、このページでは再実行できません。ページを再読み込みしてください。'});return false;}
   if(!['standard','optimized','wide'].includes(next))throw Error('Named engine required');
   progress.reset();preparing=true;const id=++generation;emit({...state,phase:'loading',view:null,error:null,errorField:null});
   try{
    light??=await loadLight();extendedApi??=await loadExtended();if(next!=='standard')heavy=await loadHeavy(next);
    if(closed||id!==generation)return false;engine=next;emit({phase:'ready',engine,input:null,view:null,error:null,errorField:null,resources:null});return true;
   }catch{if(!closed&&id===generation)emit({...state,phase:'error',errorField:'load',error:'必要ファイルを準備できませんでした。準備をやり直してください。'});return false;}
   finally{preparing=false;}
  },
  async start(raw,settings={}){
   if(closed||blocked||active||preparing||!light||engine!=='standard'&&!heavy)return false;
   let input,configuredPlan,resourcePlan,stagedPlan,experimental,extendedRoute,options,resources;
   try{
    input=validateSiteInput(raw,engine);
   }catch(error){emit({...state,phase:'invalid',input:null,view:null,resources:null,error:siteInputErrorMessage(error,engine),errorField:'input'});return false;}
   try{
    configuredPlan=selectSitePlan(engine,settings,hints);
    const n=BigInt(input);extendedRoute=engine==='standard'&&n>=boundary;experimental=engine!=='standard'&&n>=boundary;resourcePlan=selectSitePlan(engine,settings,hints,!experimental);
    if(experimental&&(engine==='standard'||input.length>100||n.toString(2).length>332))throw Error('Experimental input range');
    options={seed:1,timeBudgetMs:Math.min(60000,resourcePlan.timeBudgetMs),operationBudget:resourcePlan.operationBudget};
    if(extendedRoute)options={timeBudgetMs:Math.min(resourcePlan.timeBudgetMs,EXTENDED_RUNNER_LIMITS.maxTimeMs),operationBudget:EXTENDED_RUNNER_LIMITS.defaultOperations};
     else if(!experimental)stagedPlan=light.selectValidatedStagedPlan(input,options);
    resources={configuredPlan,plan:resourcePlan,route:extendedRoute?'extended-brent':experimental?engine:stagedPlan.engineMode,actualWorkers:extendedRoute?1:experimental?resourcePlan.workers:n<2n?0:1,actualWasmBytes:extendedRoute?0:experimental?resourcePlan.totalWasmBytes:stagedPlan.linearMemoryBytes,actualTimeBudgetMs:experimental?resourcePlan.timeBudgetMs:options.timeBudgetMs,...(extendedRoute?{actualOperationBudget:options.operationBudget}:{})};
   }catch{emit({...state,phase:'invalid',input:null,view:null,resources:null,error:'Worker数・WASM予算・時間上限の設定を見直してください。この組み合わせでは実行できません。',errorField:'settings'});return false;}
   const id=++generation,control=new AbortController(),token={};
   if(!scope.acquire(token)){emit({phase:scope.isQuarantined()?'blocked':'invalid',engine,input:null,view:null,resources:null,errorField:'runtime',error:scope.isQuarantined()?'Workerの解放を確認できません。ページを再読み込みしてください。':'同じページの別の計算が終了してから実行してください。'});return false;}
   const startedAt=now();let lastProgressAt=startedAt-200;progress.begin(id);active={id,control,startedAt};resources.elapsedMs=0;emit({phase:'running',engine,input,view:null,error:null,errorField:null,resources});let terminal,runReturned=false;const deadline=startedAt+resources.actualTimeBudgetMs;
   try{
    let view;
    if(extendedRoute){
     const result=await extendedApi.runExtendedInput(input,{...options,signal:control.signal,onProgress:event=>{
      if(closed||active?.id!==id||control.signal.aborted)return;
      if(event.stage==='verifying'){progress.verify(id);emit({...state});}
     }},{scope,scopeToken:token,now});
     runReturned=true;if(result?.allWorkersDisposed!==true||result?.allWorkerSourcesReleased!==true||result.status==='blocked')blocked=true;
     progress.verify(id);emit({...state});view=makeExtendedResultView(result,input);
    }else if(experimental){
     const result=await heavy.runRusqsieve(input,{resourcePlan,signal:control.signal,onProgress:data=>{
      if(closed||active?.id!==id||control.signal.aborted)return;
      const before=progress.get();if(!progress.collect(id,data))return;
      const sampledAt=now();if(sampledAt-lastProgressAt>=200||before.stage!=='collecting'||before.value!==null&&progress.get().value===null){lastProgressAt=sampledAt;emit({...state});}
     }});runReturned=true;progress.verify(id);emit({...state});if(result?.allWorkersDisposed!==true||result?.allWorkerSourcesReleased!==true)blocked=true;view=heavyView(result,input,{now,deadline});
    }else{
     const result=await light.runSelectedStagedRequest(input,options,{signal:control.signal});runReturned=true;
     if(result.policy!==stagedPlan.mode||result.seed!==1)throw Error('Result identity');
     progress.verify(id);emit({...state});view={...makeResultView(result,input),reasonCode:result.reason};if(['complete','probable'].includes(view.status)&&now()>=deadline)throw Error('Display proof deadline');
    }
    terminal={phase:blocked?'blocked':'result',engine,input,view,error:blocked?'Workerまたは生成資源の解放を確認できないため、この画面では次の計算を開始できません。':null,errorField:blocked?'runtime':null,resources};
   }catch{if(!runReturned)blocked=true;const reason=stopReasonPresentation(blocked?(runReturned?'worker-retirement':'worker-outcome-unknown'):'verification-failed');terminal={phase:blocked?'blocked':'error',engine,input,view:null,errorField:'runtime',error:(reason?.text??'')+(blocked?'Workerの解放を確認できませんでした。この画面では次の計算を開始できません。タブを閉じて開き直してください。':'新しい計算を開始できます。'),resources};}
   finally{progress.finish(id,terminal?.phase);resources.elapsedMs=Math.max(0,now()-startedAt);if(blocked)scope.quarantine();else scope.release(token);if(!closed&&id===generation){active=null;emit(terminal);}}
   return true;
  },
  cancel(){if(closed||!active||active.control.signal.aborted)return false;progress.cancel(active.id);emit({...state,phase:'cancelling'});active.control.abort();return true;},
  dispose(){if(closed)return;closed=true;generation++;progress.close();active?.control.abort();active=null;state={...state,phase:'disposed',view:null,progress:null};}
 };
}

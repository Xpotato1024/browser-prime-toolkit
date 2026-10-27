// SPDX-License-Identifier: AGPL-3.0-only
// UI FIXTURE ONLY. No factorization, Worker, WASM, primality test, or benchmark.
const control=globalThis.uiFixture={runs:[],current:null,mathCalls:0,loadFailures:0,
 progress(data,run=this.current){run?.options.onProgress?.(data);},
 finish({reason=null,malformed=false,cleanup=false}={},run=this.current){
  if(!run)throw Error('No fixture request');
  const cancelled=run.options.signal?.aborted;
  if(run.heavy)run.resolve({input:run.input,kind:cancelled?'cancelled':'incomplete',reason:cancelled?'cancelled':reason,
   factors:[],remaining:malformed?'1':run.input,allWorkersDisposed:!cleanup,allWorkerSourcesReleased:!cleanup});
  else run.resolve({input:run.input,policy:'ui-fixture-only',seed:1,reason:cancelled?'cancelled':reason,
   fixtureView:{status:cancelled?'cancelled':reason?'incomplete':'complete',statusText:cancelled?'中止しました。':reason?'未完了です。':'分解完了（確定判定）。',
    equation:run.input+' = '+(reason||cancelled?'[未解決: '+run.input+']':'5 × 7'),
    groups:reason||cancelled?[]:[{base:'5',exponent:1,certainty:'proven'},{base:'7',exponent:1,certainty:'proven'}],
    residual:reason||cancelled?run.input:null,reasonText:''}});
 },
 fail(run=this.current){run.reject(Error('UI fixture rejection'));},
};
function request(input,options,heavy){return new Promise((resolve,reject)=>{const run={input,options,heavy,resolve,reject};control.current=run;control.runs.push(run);});}
export const selectValidatedStagedPlan=()=>({mode:'ui-fixture-only',engineMode:'ui-fixture-only',linearMemoryBytes:0});
export const runSelectedStagedRequest=(input,options,context)=>request(input,{...options,...context},false);
export const runRusqsieve=(input,options)=>request(input,options,true);
export const loadFixtureLight=async()=>{if(control.loadFailures>0){control.loadFailures--;throw Error('UI fixture load error');}return{selectValidatedStagedPlan,runSelectedStagedRequest};};

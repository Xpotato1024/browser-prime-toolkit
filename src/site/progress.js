// SPDX-License-Identifier: AGPL-3.0-only
// Presentation state only: never imports an engine, verifies factors, or changes budgets.
const stages={
 running:['計算中','この工程の割合は未計測です。'],
 collecting:['関係収集','収集量の割合です。計算全体の完了率ではありません。'],
 verifying:['結果の検算','因子と積・確度・資源解放を確認しています。割合は未計測です。'],
 cancelling:['中止処理','計算停止と資源解放を待っています。'],
 settled:['実行記録','完了・未完了と因子の確度は結果本文を確認してください。'],
 stopped:['処理停止','結果の検証または資源解放を確認できませんでした。']
};
function snapshot(state){
 if(!state)return null;
 const [label,summary]=stages[state.stage],atTarget=state.stage==='collecting'&&state.relations>=state.target;
 return {...state,label:atTarget?'収集目標到達・後続処理':label,summary:atTarget?'収集目標に到達。検算を含む後続処理は未完了です。':summary,
  value:state.stage==='collecting'&&!atTarget?state.relations/state.target:null};
}
export function createProgressTracker(){
 let state=null,closed=false,lastJob=0;
 const current=job=>!closed&&state?.job===job&&!['settled','stopped'].includes(state.stage);
 return{
  get:()=>snapshot(state),
  begin(job){if(closed||!Number.isSafeInteger(job)||job<=lastJob)return false;lastJob=job;state={job,stage:'running',families:null,relations:null,target:null};return true;},
  collect(job,data){
   if(!current(job)||!['running','collecting'].includes(state.stage)||!data)return false;
   const {families,relations,target}=data;
   if(![families,relations,target].every(x=>Number.isSafeInteger(x)&&x>=0&&x<=1000000)||target<1)return false;
   if(state.target!==null&&(target!==state.target||relations<state.relations||families<state.families))return false;
   state={job,stage:'collecting',families,relations,target};return true;
  },
  verify(job){if(!current(job)||!['running','collecting'].includes(state.stage))return false;state={...state,stage:'verifying'};return true;},
  cancel(job){if(!current(job)||state.stage==='cancelling')return false;state={...state,stage:'cancelling'};return true;},
  finish(job,outcome){if(!current(job))return false;state={...state,stage:outcome==='result'?'settled':'stopped'};return true;},
  reset(){if(!closed)state=null;},
  close(){closed=true;state=null;}
 };
}
const reasons={
 'time-budget':['time','設定した実行時間の上限に達しました。'],
 'host-timeout':['time','初期化を含む実行時間の上限に達しました。'],
 'initialization-timeout':['initialization','Workerの初期化時間の上限に達しました。'],
 'coordinator-memory-soft-stop':['memory-soft-stop','観測したWASM保持量・linear memoryが保護停止の閾値に達しました。端末全体の空きRAMの測定ではありません。'],
 'native-memory-budget':['memory-allocation-refused','Native処理で設定された割当予算による拒否を確認しました。'],
 'operation-budget':['work','設定した計算量の上限に達しました。'],
 'family-budget':['work','関係収集の計算量上限に達しました。'],
 'fixed-family-bound':['work','指定した関係収集範囲を終了しました。'],
 'algorithm-range':['range','この計算経路の対応範囲を超えています。'],
 'algorithm-resource':['resource','計算資源の制限で停止しました。メモリ不足とは特定していません。'],
 'algorithm-exhausted':['search','有限の探索範囲で因子が見つかりませんでした。'],
 'insufficient-relations':['search','検算へ進むための関係が不足しています。'],
 'no-dependency':['search','利用できる依存関係が見つかりませんでした。'],
 'no-factor':['search','この探索では因子が得られませんでした。'],
 'cancelled':['cancelled','ユーザーの操作により計算を中止しました。'],
 'verification-failed':['verification','結果の検算を完了できませんでした。'],
 'invalid-dependency':['verification','依存関係の検証に失敗しました。'],
 'worker-retirement':['cleanup','Workerまたは生成資源の解放を確認できませんでした。'],
 'worker-error':['worker','Worker異常で停止しました。原因がメモリ不足かは確認できません。'],
 'worker-creation':['worker','Workerの生成に失敗しました。原因がメモリ不足かは確認できません。'],
 'worker-outcome-unknown':['worker','計算処理が正常な結果を返しませんでした。原因と資源解放は未確認です。'],
 'message-error':['protocol','Workerからのデータを受信できませんでした。'],
 'protocol-failure':['protocol','Workerからの応答が契約に一致しませんでした。'],
 'audit-retention-cap':['resource','検証用データの保持上限に達しました。']
};
export function stopReasonPresentation(code){
 if(code===null||code===undefined||code==='')return null;
 const [category,text]=typeof code==='string'&&Object.hasOwn(reasons,code)?reasons[code]:['unknown','計算が停止しました。原因は特定できていません。'];
 return {category,text};
}

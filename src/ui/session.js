import {parseIntegerInput} from '../core/integer-input.js';
import {selectValidatedStagedPlan} from '../engine/staged-selected.js';
import {runSelectedStagedRequest} from '../worker/staged-selected.js';
import {makeResultView} from './result-view.js';
const OPTIONS=Object.freeze({timeBudgetMs:1000,operationBudget:50000000,seed:1});
const validationMessage=error=>error instanceof RangeError?'対応範囲は0以上2^128未満の整数です。':
 error.code==='INPUT_TOO_LONG'?'入力は4096文字以内にしてください。':
 error.code==='VALUE_TOO_LARGE'||error.code==='EXPONENT_OUT_OF_RANGE'?'入力の桁数または指数が上限を超えています。':
 '0以上の十進整数を入力してください。e表記は整数になる場合だけ使えます。';
export function createUiSession({run=runSelectedStagedRequest,onChange=()=>{}}={}){
 let state={phase:'idle',input:null,view:null,error:null},active=null,closed=false,generation=0;
 const emit=next=>{state=next;if(!closed)onChange(structuredClone(state));};
 return{
  getState:()=>structuredClone(state),
  async start(raw){
   if(closed||active)return false;
   let input,plan;
   try{input=parseIntegerInput(raw).canonical;plan=selectValidatedStagedPlan(input,OPTIONS);}
   catch(error){emit({phase:'invalid',input:null,view:null,error:validationMessage(error)});return false;}
   const id=++generation,control=new AbortController();active={control,id};
   emit({phase:'running',input,view:null,error:null});let terminal;
   try{
    const result=await run(input,{...OPTIONS},{signal:control.signal});
    if(closed||id!==generation)return false;
    if(result.policy!==plan.mode||result.seed!==OPTIONS.seed)throw TypeError('Result identity');
    terminal={phase:'result',input,view:makeResultView(result,input),error:null};
   }catch{
    terminal={phase:'error',input,view:null,error:'計算が異常終了しました。新しい計算を開始できます。'};
   }finally{
    if(!closed&&id===generation){active=null;emit(terminal);}
   }
   return true;
  },
  cancel(){
   if(closed||!active||active.control.signal.aborted)return false;
   emit({...state,phase:'cancelling'});active.control.abort();return true;
  },
  dispose(){
   if(closed)return;closed=true;generation++;
   state={phase:'disposed',input:state.input,view:null,error:null};
   active?.control.abort();active=null;
  }
 };
}

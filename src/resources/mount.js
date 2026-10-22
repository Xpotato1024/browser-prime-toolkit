// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Xpotato.net / Xpotato1024
import {createResourceSession} from './session.js';
import {selectResourcePlan} from './policy.js';
export function mountResourceApp(root,{hints={hardwareConcurrency:globalThis.navigator?.hardwareConcurrency,deviceMemory:globalThis.navigator?.deviceMemory},sessionOptions={}}={}){
 if(!root?.ownerDocument)throw Error('DOM root required');const doc=root.ownerDocument;
 const el=(tag,attrs={})=>{const n=doc.createElement(tag);for(const[k,v]of Object.entries(attrs))k==='text'?n.textContent=v:n.setAttribute(k,v);return n;};
 const select=(id,items)=>{const n=el('select',{id});for(const[value,text]of items)n.append(el('option',{value:String(value),text}));return n;};
 const field=(parent,label,node)=>{const p=el('p');p.append(el('label',{for:node.id,text:label}),' ',node);parent.append(p);};
 const title=el('h1',{text:'素因数分解・端末別設定（非公開）'});
 const intro=el('p',{text:'必要ファイルの準備後、計算はブラウザ内で行います。結果を外部へ送信しません。'});
 const form=el('form'),fields=el('fieldset');form.noValidate=true;fields.append(el('legend',{text:'次の計算'}));
 const engine=select('calculation-mode',[['standard','通常'],['experimental','高難度（実験）']]);
 field(fields,'計算モード',engine);
 const input=el('input',{id:'integer-input',type:'text',inputmode:'decimal',size:'26',autocomplete:'off',spellcheck:'false','aria-describedby':'input-help resource-error'});
 input.required=true;field(fields,'0以上の整数',input);
 fields.append(el('p',{id:'input-help',text:'例: 32、3.2e1。通常は2^128未満、高難度は最大332bit・100桁。桁数だけでは難易度は決まりません。2^128未満には通常経路を使います。'}));
 const mode=select('resource-mode',[['auto','自動（保守的）'],['manual','詳細設定']]);field(fields,'資源設定',mode);
 const detail=el('details',{id:'resource-details'});detail.append(el('summary',{text:'Worker・WASM・時間の設定'}));
 const workers=select('worker-count',[[1,'1'],[2,'2'],[3,'3'],[4,'4']]);
 const memory=select('wasm-budget',[[128,'128 MiB'],[256,'256 MiB'],[384,'384 MiB'],[512,'512 MiB']]);
 const time=select('time-budget',[[1000,'1秒'],[5000,'5秒'],[15000,'15秒'],[60000,'60秒'],[300000,'5分'],[600000,'10分']]);
 field(detail,'総Worker数（集約役を含む）',workers);field(detail,'WASM予算',memory);field(detail,'計算時間（初期化を含む）',time);fields.append(detail);
 const estimate=el('p',{id:'resource-estimate'});fields.append(estimate);
 const note=el('p',{text:'通常経路は最大1 Worker・WASM 128 MiB・60秒です。自動設定は最大2 Worker。端末情報は参考値で、空きRAMを測定しません。WASM予算にはJavaScriptやブラウザ全体のRAMを含みません。資源不足で停止する場合があり、端末によるタブ終了の防止は保証できません。'});
 const start=el('button',{id:'start-computation',type:'submit',text:'分解する'});fields.append(start);form.append(fields);
 const cancel=el('button',{id:'cancel-computation',type:'button',text:'計算を中止'});
 const retry=el('button',{id:'prepare-assets',type:'button',text:'必要ファイルを準備し直す'});
 const error=el('p',{id:'resource-error',role:'alert'}),status=el('p',{id:'ui-status',role:'status','aria-live':'polite','aria-atomic':'true'});
 const actual=el('p',{id:'actual-resources'}),output=el('textarea',{id:'resource-result',readonly:'',rows:'10',cols:'30',wrap:'soft','aria-label':'検証済みの結果。未完了の場合は未解決部分を含みます'});
 root.replaceChildren(title,intro,form,cancel,' ',retry,note,error,status,actual,output);
 let disposed=false,busy=false;
 const settings=()=>({mode:mode.value,workers:Number(workers.value),memoryMiB:Number(memory.value),timeBudgetMs:Number(time.value)});
 function estimateNext(){
  try{const p=selectResourcePlan(settings(),hints);estimate.textContent='次回の高難度計算: '+p.workers+' Worker、WASM上限合計 '+p.totalWasmBytes/1048576+' MiB（予算 '+p.budgetBytes/1048576+' MiB）。';}
  catch{estimate.textContent='このWorker数とWASM予算の組合せは実行できません。';}
  workers.disabled=busy||mode.value!=='manual';memory.disabled=busy||mode.value!=='manual';
 }
 const render=s=>{
  if(disposed)return;busy=['running','cancelling','loading','blocked'].includes(s.phase);
  for(const n of [engine,input,mode,time])n.disabled=busy;
  start.disabled=busy||s.phase==='unprepared'||s.phase==='error'&&s.input===null;cancel.disabled=!['running','cancelling'].includes(s.phase)||s.phase==='cancelling';retry.disabled=busy;
  error.textContent=s.error??'';input.setAttribute('aria-invalid',String(s.phase==='invalid'));
  status.textContent=s.phase==='loading'?'必要ファイルを準備しています。計算はまだ始まっていません。':s.phase==='ready'?'準備できました。計算中の通信は不要です。':s.phase==='running'?'計算しています。':s.phase==='cancelling'?'中止してWorkerを解放しています。':s.view?.statusText??'入力と設定を確認してください。';
  output.value=s.view?.copyText??'';const r=s.resources;
  actual.textContent=r?'今回の経路: '+({brent:'通常（64bit以下）',staged:'通常（WASM）',experimental:'高難度'}[r.route]??'通常')+'、'+r.actualWorkers+' Worker、WASM上限 '+r.actualWasmBytes/1048576+' MiB、時間枠 '+r.actualTimeBudgetMs/1000+'秒。':'';
  estimateNext();
 };
 const session=createResourceSession({...sessionOptions,hints,onChange:render});
 const submit=e=>{e.preventDefault();void session.start(input.value,settings());};
 const changeMode=()=>{detail.open=mode.value==='manual';estimateNext();};
 const stop=()=>session.cancel(),prepare=()=>{void session.prepare(engine.value);};
 const changeEngine=()=>{time.value=engine.value==='experimental'?'60000':'1000';prepare();};
 form.addEventListener('submit',submit);cancel.addEventListener('click',stop);retry.addEventListener('click',prepare);engine.addEventListener('change',changeEngine);
 mode.addEventListener('change',changeMode);for(const n of [workers,memory,time])n.addEventListener('change',estimateNext);
 render(session.getState());prepare();
 return{getState:session.getState,getDraft:()=>input.value,setDraft:value=>{input.value=value;},dispose(){
  if(disposed)return;disposed=true;session.dispose();form.removeEventListener('submit',submit);cancel.removeEventListener('click',stop);retry.removeEventListener('click',prepare);engine.removeEventListener('change',changeEngine);
  mode.removeEventListener('change',changeMode);for(const n of [workers,memory,time])n.removeEventListener('change',estimateNext);root.replaceChildren();
 }};
}

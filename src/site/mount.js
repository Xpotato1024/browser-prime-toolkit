// SPDX-License-Identifier: AGPL-3.0-only
import {documentComputeScope} from './document-scope.js';
import {createSiteSession} from './session.js';
import {selectSitePlan} from './policy.js';
import {executionPresentation,sitePresentation,sampleInputs,copyResult} from './presentation.js';
let serial=0;
export function mountSiteFactorizer(root,{hints={hardwareConcurrency:globalThis.navigator?.hardwareConcurrency,deviceMemory:globalThis.navigator?.deviceMemory},sessionOptions={}}={}){
 if(!root?.ownerDocument)throw TypeError('DOM root required');
 const doc=root.ownerDocument,scope=documentComputeScope(doc),prefix='bt-prime-'+(++serial)+'-',listeners=[];
 const el=(tag,attrs={})=>{const n=doc.createElement(tag);for(const[k,v]of Object.entries(attrs))k==='text'?n.textContent=v:n.setAttribute(k,k==='id'?prefix+v:v);return n;};
 const listen=(target,event,fn)=>{target.addEventListener(event,fn);listeners.push(()=>target.removeEventListener(event,fn));};
 const select=(id,items)=>{const n=el('select',{id});for(const[v,t]of items)n.append(el('option',{value:String(v),text:t}));return n;};
 const field=(parent,text,node)=>{const p=el('div',{'class':'bt-field'});p.append(el('label',{for:node.id,text}),node);parent.append(p);};
 const form=el('form'),fields=el('fieldset');form.noValidate=true;
 const input=el('input',{id:'input',type:'text',inputmode:'decimal',autocomplete:'off',spellcheck:'false',maxlength:'4096','aria-label':'0以上の整数'});input.required=true;
 field(fields,'0以上の整数',input);
 const help=el('p',{id:'help','class':'bt-help',text:'整数・科学表記に対応（例: 3.2e1）。2^128 以上は詳細設定へ。'});input.setAttribute('aria-describedby',help.id);
 const samples=el('details',{'class':'bt-samples'}),sampleList=el('ul',{'class':'bt-sample-list'}),sampleStatus=el('p',{'class':'bt-help','aria-live':'polite'});sampleStatus.hidden=true;
 samples.append(el('summary',{text:'入力例と用途（入力のみ）'}),sampleList,sampleStatus);
 const sampleButtons=sampleInputs.map(x=>{const button=el('button',{type:'button','class':'bt-sample-choice','data-sample-value':x.value,text:x.label}),item=el('li');item.append(button);sampleList.append(item);return button;});
 const engine=select('engine',[['standard','通常（小さい入力）'],['optimized','高難度（有限SIQS）'],['wide','大メモリ（明示実験）']]);
 const mode=select('mode',[['auto','自動（保守的）'],['manual','手動設定']]);
 const details=el('details',{'class':'bt-settings'});details.append(el('summary',{text:'詳細設定（計算モード・資源・時間）'}));
 field(details,'計算モード',engine);field(details,'資源設定',mode);
 const workers=select('workers',[1,2,3,4,5,6].map(x=>[x,String(x)]));
 const memory=select('memory',[128,256,384,512,768,1536].map(x=>[x,x+' MiB']));
 const time=select('time',[[1000,'1秒'],[5000,'5秒'],[15000,'15秒'],[60000,'1分'],[300000,'5分'],[600000,'10分'],[1800000,'30分'],[3600000,'1時間']]);
 field(details,'総Worker数（集約役を含む）',workers);field(details,'WASM予算',memory);field(details,'計算時間（初期化を含む）',time);
 const estimate=el('p',{'class':'bt-estimate'});details.append(estimate);
 const start=el('button',{type:'submit',text:'分解する','data-action':'start'}),cancel=el('button',{type:'button',text:'計算を中止','data-action':'cancel'}),reset=el('button',{type:'button',text:'リセット','data-action':'reset'});
 const jump=el('button',{type:'button',text:'結果へ移動','data-action':'result'}),quick=el('button',{type:'button',text:'360 を入力して分解（1秒上限）','data-action':'quick-example'});
 const actions=el('div',{'class':'bt-actions'}),quickActions=el('div',{'class':'bt-quick-actions'});actions.append(start,cancel,reset,jump);quickActions.append(quick);fields.append(actions,help,quickActions);form.append(fields);
 const error=el('p',{id:'error',role:'alert','class':'bt-error'}),status=el('p',{role:'status','aria-live':'polite','aria-atomic':'true','class':'bt-status',tabindex:'-1'});
 const metrics=el('section',{'class':'bt-metrics','aria-label':'実測結果'}),metricList=el('dl'),metricRow=el('div'),elapsedLabel=el('dt',{id:'elapsed-label',text:'実経過'}),elapsed=el('dd',{'data-elapsed':'','aria-labelledby':elapsedLabel.id}),measurementNote=el('p',{'class':'bt-help'});metricRow.append(elapsedLabel,elapsed);metricList.append(metricRow);metrics.append(metricList,measurementNote);metrics.hidden=true;
 const execution=el('details',{'class':'bt-execution'}),limits=el('dl',{'class':'bt-execution-limits'}),limitsNote=el('p',{'class':'bt-help'});execution.append(el('summary',{text:'この実行の設定・上限'}),limits,limitsNote);execution.hidden=true;
 const retry=el('button',{type:'button',text:'ファイルの準備をやり直す','data-action':'retry'});
 const output=el('textarea',{readonly:'',id:'output',rows:'2','aria-label':'全桁の検証済み結果（未解決部分を含む）',wrap:'soft'});
 const result=el('section',{'class':'bt-result','aria-label':'計算結果'});
 const outputLabel=el('label',{for:output.id,text:'結果（全桁・未解決部分を含む）'});const copy=el('button',{type:'button',text:'結果をコピー','data-action':'copy'}),copyStatus=el('p',{role:'status','class':'bt-help'}),copyActions=el('div',{'class':'bt-copy-actions'});copyStatus.hidden=true;copyActions.append(copy);
 const manual=el('textarea',{readonly:'',rows:'5','aria-label':'手動コピー用（計算状態を含む）'});manual.hidden=true;
 const proof=el('details'),factorList=el('ul',{'class':'bt-factor-list'}),residualText=el('p',{'class':'bt-residual'}),reasonText=el('p',{'class':'bt-stop-reason'});proof.append(el('summary',{text:'因子の判定と停止理由'}),factorList,residualText,reasonText);
 result.append(outputLabel,output,copyActions,copyStatus,manual,proof);
 const note=el('details',{'class':'bt-limits'});note.append(el('summary',{text:'計算範囲と端末への負荷について'}),el('p',{text:'最大332bit・100桁。桁数だけでは難易度は決まりません。通常経路は最大1 Worker・WASM128 MiB・60秒、自動は最大2 Worker。大メモリは明示手動・WASM予算1536 MiB・最大5 Worker・1時間です。WASM上限はブラウザ全体のRAM上限ではなく、端末によるタブ終了を防ぐ保証はありません。未完了・未証明を区別して表示し、同じページでは同時計算を1件に制限します。'}));
 root.replaceChildren(form,error,retry,status,result,metrics,execution,samples,details,el('p',{'class':'bt-help',text:'入力・結果を保存・送信しません。'}),note);
 let disposed=false,busy=false,prepared=false,session,clock=null,currentResources=null,currentCopy='',copyGeneration=0,limitsKey='';
 const stopClock=()=>{if(clock!==null){doc.defaultView.clearInterval(clock);clock=null;}};
 const showActual=()=>{const r=currentResources,p=executionPresentation(r,session?.getElapsedMs()??r?.elapsedMs??0);metrics.hidden=execution.hidden=!p;if(!p)return;elapsed.textContent=p.elapsed;measurementNote.textContent=p.measurementNote;
  const key=JSON.stringify(p.limits);if(key!==limitsKey){limitsKey=key;limits.replaceChildren(...p.limits.map(([label,value])=>{const row=el('div');row.append(el('dt',{text:label}),el('dd',{text:value}));return row;}));limitsNote.textContent=p.limitsNote;}
 };
 const fitOutput=()=>{if(result.hidden)return;output.style.height='auto';const height=output.scrollHeight+output.offsetHeight-output.clientHeight;if(Number.isFinite(height)&&height>0)output.style.height=height+'px';};
 const settings=()=>({mode:mode.value,workers:Number(workers.value),memoryMiB:Number(memory.value),timeBudgetMs:Number(time.value),...(engine.value==='wide'?{outstandingSlots:8}:{})});
 const estimateNext=()=>{try{
  const p=selectSitePlan(engine.value,settings(),hints);time.value=String(p.timeBudgetMs);
  if(engine.value==='standard'){
   workers.value='1';memory.value='128';
   estimate.textContent='通常入力は最大1 Worker・WASM128 MiBです。小さい入力はWASMを使いません。時間上限 '+p.timeBudgetMs/1000+'秒。';
  }else{
   if(mode.value==='auto'){workers.value=String(p.workers);memory.value=String(p.budgetBytes/1048576);}
   estimate.textContent='高難度入力時の設定: '+p.workers+' Worker、WASM上限合計 '+p.totalWasmBytes/1048576+' MiB（予算 '+p.budgetBytes/1048576+' MiB）、'+p.timeBudgetMs/1000+'秒。小さい入力は最大1 Worker・WASM128 MiBの経路です。';
  }
 }catch{estimate.textContent='この設定の組合せは実行できません。';}};

 const render=s=>{
  if(disposed)return;const cancelFocused=doc.activeElement===cancel,runFocused=doc.activeElement===input||doc.activeElement===start||doc.activeElement===quick;if(s.phase==='loading')prepared=false;if(s.phase==='ready')prepared=true;busy=['loading','running','cancelling','blocked'].includes(s.phase);
  for(const n of [input,...sampleButtons,engine,mode,time])n.disabled=busy;
  mode.disabled=busy||engine.value==='standard';workers.disabled=memory.disabled=busy||engine.value==='standard'||mode.value!=='manual';form.setAttribute('aria-busy',String(['loading','running','cancelling'].includes(s.phase)));
  start.disabled=quick.disabled=busy||!prepared||s.phase==='unprepared';jump.hidden=!s.view;jump.disabled=busy;cancel.disabled=s.phase!=='running';reset.disabled=busy;
  cancel.hidden=!['running','cancelling'].includes(s.phase);retry.hidden=s.phase!=='error'||prepared;
  start.textContent=s.phase==='loading'?'準備中…':s.phase==='running'?'計算中…':s.phase==='cancelling'?'中止処理中…':s.phase==='result'?'再実行':'分解する';
  result.hidden=!s.view;error.hidden=!s.error;
  input.setAttribute('aria-describedby',help.id+(s.error?' '+error.id:''));
  error.textContent=s.error??'';input.setAttribute('aria-invalid',String(s.phase==='invalid'));
  status.textContent=s.phase==='loading'?'ファイルを準備しています。':s.phase==='ready'?'準備完了。':s.phase==='running'?'計算しています。':s.phase==='cancelling'?'中止してWorkerを解放しています。':s.phase==='blocked'?'計算を停止しました。ページを開き直してください。':s.view?.statusText??'入力と設定を確認してください。';
  root.dataset.phase=s.phase;const presentation=s.view?sitePresentation(s.view):null;output.value=presentation?.equation??'';currentCopy=presentation?.copyText??'';
  const rows=presentation?.factorRows??[];factorList.replaceChildren(...rows.map(row=>el('li',{text:row.text})));factorList.hidden=!rows.length;residualText.textContent=presentation?.residual!==null&&presentation?.residual!==undefined?'未解決の余因子: '+presentation.residual:'';residualText.hidden=!residualText.textContent;reasonText.textContent=s.view?.reasonText??'';reasonText.hidden=!reasonText.textContent;proof.hidden=!rows.length&&!residualText.textContent&&!reasonText.textContent;
  copy.disabled=!currentCopy;copyGeneration++;copyStatus.textContent='';copyStatus.hidden=true;manual.hidden=true;fitOutput();if((cancel.hidden||s.phase==='cancelling')&&cancelFocused)status.focus({preventScroll:true});else if(s.phase==='running'&&runFocused)cancel.focus({preventScroll:true});
  currentResources=s.resources;showActual();if(['running','cancelling'].includes(s.phase)){if(clock===null&&doc.defaultView)clock=doc.defaultView.setInterval(showActual,100);}else stopClock();
  estimateNext();
 };
 const prepare=()=>session.prepare(engine.value);
 const makeSession=(restoreReset=false)=>{prepared=false;session=createSiteSession({...sessionOptions,scope,hints,onChange:render});render(session.getState());void prepare().then(()=>{if(restoreReset&&!disposed&&!reset.disabled)reset.focus({preventScroll:true});});};
 listen(form,'submit',e=>{e.preventDefault();void session.start(input.value,settings());});
 // This explicit action has a fixed tiny input and cap; generic choices remain input-only.
 listen(quick,'click',()=>{if(busy||!prepared)return;input.value='360';void session.start('360',{...settings(),timeBudgetMs:1000});});
 listen(jump,'click',()=>{if(!result.hidden){output.focus({preventScroll:true});output.scrollIntoView({block:'center',behavior:'instant'});}});
 sampleButtons.forEach((button,i)=>listen(button,'click',()=>{if(!busy){input.value=sampleInputs[i].value;sampleStatus.textContent='入力例 '+sampleInputs[i].value+' を反映しました。分解するボタンで実行できます。';sampleStatus.hidden=false;}}));
 listen(copy,'click',async()=>{if(!currentCopy)return;const generation=++copyGeneration,text=currentCopy;let clipboard;try{clipboard=doc.defaultView?.navigator?.clipboard;}catch{}const ok=await copyResult(text,clipboard);if(disposed||generation!==copyGeneration)return;copyStatus.hidden=false;if(ok)copyStatus.textContent='結果と計算状態をコピーしました。';else{manual.value=text;manual.hidden=false;manual.focus({preventScroll:true});manual.select();copyStatus.textContent='自動コピーを利用できません。選択された文字列を手動でコピーしてください。';}});
 listen(cancel,'click',()=>session.cancel());
 listen(retry,'click',()=>{const restore=doc.activeElement===retry;void prepare().then(()=>{if(restore&&!disposed)(prepared?start:retry).focus({preventScroll:true});});});
 listen(reset,'click',()=>{session.dispose();input.value='';sampleStatus.textContent='';sampleStatus.hidden=true;makeSession(true);});
 if(doc.defaultView)listen(doc.defaultView,'resize',fitOutput);
 listen(engine,'change',()=>{
  if(engine.value==='wide'){mode.value='manual';memory.value='1536';workers.value=String(Math.min(5,Math.max(1,(hints.hardwareConcurrency??2)-1)));time.value='60000';details.open=true;}
  else{mode.value='auto';memory.value='128';workers.value='1';time.value=engine.value==='standard'?'1000':'60000';}
  prepare();
 });
 for(const n of [mode,workers,memory,time])listen(n,'change',()=>{render(session.getState());});
 makeSession();
 const dispose=()=>{if(disposed)return;disposed=true;copyGeneration++;stopClock();session.dispose();for(const remove of listeners)remove();root.replaceChildren();root.dataset.phase='disposed';};
 if(doc.defaultView)listen(doc.defaultView,'pagehide',dispose);
 return{dispose,getState:()=>session.getState()};
}

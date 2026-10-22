import {createUiSession} from './session.js';
export function mountFactorApp(root,{run,writeClipboard=text=>navigator.clipboard?.writeText(text)??Promise.reject(Error('Clipboard unavailable'))}={}){
 if(!root?.ownerDocument)throw TypeError('Expected a DOM root');
 const doc=root.ownerDocument;
 const el=(tag,attrs={})=>{const n=doc.createElement(tag);for(const[k,v]of Object.entries(attrs)){if(k==='text')n.textContent=v;else n.setAttribute(k,v);}return n;};
 const digits=(node,text)=>{for(let i=0;i<text.length;i+=12){if(i)node.append(el('wbr'));node.append(doc.createTextNode(text.slice(i,i+12)));}};
 const title=el('h1',{text:'素因数分解・非公開プレビュー'});
 const intro=el('p',{text:'ブラウザ内で計算します。結果を外部へ送信しません。'});
 const limits=el('p',{text:'初期化を含む1秒の計算枠です。時間内に解けない場合や、端末の都合で応答が遅れる場合があります。'});
 const memory=el('p',{text:'固定WASM領域を最大128MiB使う場合があります。ブラウザ全体のRAM上限ではありません。'});
 const form=el('form'),fieldset=el('fieldset'),legend=el('legend',{text:'整数を分解する'});
 form.noValidate=true;
 const label=el('label',{for:'integer-input',text:'整数'});
 const input=el('input',{id:'integer-input',name:'integer',type:'text',inputmode:'decimal',size:'28',
  autocomplete:'off',autocapitalize:'off',spellcheck:'false',enterkeyhint:'go','aria-describedby':'input-help input-error'});
 input.required=true;
 const help=el('p',{id:'input-help',text:'0以上の十進整数。例: 32、3.2e1。対応範囲は'});
 digits(help,'340282366920938463463374607431768211456');help.append('未満です。式や端数は入力できません。');
 const error=el('p',{id:'input-error',role:'alert'});
 const start=el('button',{id:'start-computation',type:'submit',text:'分解する'});
 const cancel=el('button',{id:'cancel-computation',type:'button',text:'計算を中止'});
 const controls=el('p');controls.append(start,' ',cancel);
 fieldset.append(legend,label,el('br'),input,help,error,controls);form.append(fieldset);
 const status=el('p',{id:'ui-status',role:'status','aria-live':'polite','aria-atomic':'true'});
 const panel=el('section',{'aria-labelledby':'result-heading'});
 const heading=el('h2',{id:'result-heading',text:'計算対象と結果'});
 const submittedLabel=el('label',{for:'submitted-integer',text:'計算した整数（全桁）'});
 const submitted=el('textarea',{id:'submitted-integer',rows:'2',cols:'30',readonly:'',wrap:'soft'});
 const equation=el('div',{id:'result-equation',role:'math','aria-describedby':'result-description result-certainty'});
 const description=el('p',{id:'result-description'}),reason=el('p',{id:'result-reason'}),certainty=el('p',{id:'result-certainty'});
 const copy=el('button',{id:'copy-result',type:'button',text:'表示中の結果をコピー'});
 const copyStatus=el('p',{id:'copy-status',role:'status','aria-live':'polite','aria-atomic':'true'});
 const fallbackLabel=el('label',{for:'copy-fallback',text:'手動コピー用の結果'});
 const fallback=el('textarea',{id:'copy-fallback',rows:'6',cols:'30',readonly:'',wrap:'soft','aria-describedby':'copy-status'});
 panel.append(heading,submittedLabel,el('br'),submitted,equation,description,reason,certainty,copy,copyStatus,fallbackLabel,el('br'),fallback);
 root.replaceChildren(title,intro,limits,memory,form,status,panel);
 let disposed=false,epoch=0;
 function render(state){
  if(disposed)return;epoch++;const busy=['running','cancelling'].includes(state.phase),view=state.view;
  input.readOnly=busy;start.disabled=busy;cancel.disabled=!busy||state.phase==='cancelling';copy.disabled=!view||busy;
  input.setAttribute('aria-invalid',String(state.phase==='invalid'));error.textContent=state.phase==='invalid'?state.error:'';
  copyStatus.textContent='';fallback.value='';fallback.hidden=true;fallbackLabel.hidden=true;
  submitted.value=state.input??'';panel.hidden=state.input===null;panel.setAttribute('aria-busy',String(busy));
  equation.replaceChildren();equation.removeAttribute('aria-label');description.textContent='';reason.textContent='';certainty.textContent='';
  status.textContent=state.phase==='idle'?'整数を入力して分解してください。':state.phase==='running'?'計算しています。':
   state.phase==='cancelling'?'中止しています。':state.phase==='invalid'?'入力を確認してください。':
   state.phase==='error'?state.error:view?.statusText??'';
  if(state.phase==='invalid'){input.focus();return;}
  if(!view)return;
  equation.setAttribute('aria-label',view.speech);
  const visual=el('span',{'aria-hidden':'true'});digits(visual,view.input);visual.append(' = ');
  view.groups.forEach((g,i)=>{
   if(i)visual.append(' × ');const factor=el('span');digits(factor,g.base);
   if(g.exponent>1)factor.append(el('sup',{text:String(g.exponent)}));
   if(g.certainty==='probable')factor.append(el('small',{text:'（未証明）'}));visual.append(factor);
  });
  if(view.residual!==null){if(view.groups.length)visual.append(' × ');visual.append('[未解決: ');digits(visual,view.residual);visual.append(']');}
  if(view.status==='neither')digits(visual,view.input);
  equation.append(visual);description.textContent=view.statusText;reason.textContent=view.reasonText;certainty.textContent=view.certaintyText;
 }
 const session=createUiSession({run,onChange:render});
 const submit=event=>{event.preventDefault();if(!disposed)void session.start(input.value);};
 const stop=()=>{if(!disposed)session.cancel();};
 const copyResult=async()=>{
  const view=session.getState().view;if(disposed||!view||copy.disabled)return;
  const token=epoch,text=view.copyText;copy.disabled=true;
  try{await writeClipboard(text);if(!disposed&&epoch===token)copyStatus.textContent='コピーしました。';}
  catch{if(!disposed&&epoch===token){fallback.value=text;fallback.hidden=false;fallbackLabel.hidden=false;
   copyStatus.textContent='自動コピーできませんでした。選択されたテキストをコピーしてください。';fallback.focus();fallback.select();}}
  finally{if(!disposed&&epoch===token)copy.disabled=false;}
 };
 form.addEventListener('submit',submit);cancel.addEventListener('click',stop);copy.addEventListener('click',copyResult);
 render(session.getState());
 return{getState:session.getState,dispose(){
  if(disposed)return;disposed=true;epoch++;session.dispose();
  form.removeEventListener('submit',submit);cancel.removeEventListener('click',stop);copy.removeEventListener('click',copyResult);
  root.replaceChildren();
 }};
}

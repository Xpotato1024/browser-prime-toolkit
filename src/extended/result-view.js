// SPDX-License-Identifier: AGPL-3.0-only
// Format immutable controller-certified data; never repeat arithmetic after a timeout.
import {isVerifiedExtendedOutcome} from './runner.js';
import {stopReasonPresentation} from '../site/progress.js';
export function makeExtendedResultView(result,input){
 if(!isVerifiedExtendedOutcome(result,input))throw Error('Uncertified extended outcome');
 const groups=[];
 for(const factor of result.factors){
  const previous=groups.at(-1);
  if(previous?.base===factor.value)previous.exponent++;
  else groups.push({base:factor.value,exponent:1,certainty:factor.certainty});
 }
 const complete=['complete','probable','neither'].includes(result.status);
 const residual=!complete&&result.remaining!=='1'?result.remaining:null;
 const terms=groups.map(g=>g.base+(g.exponent===1?'':'^'+g.exponent));
 if(residual!==null)terms.push('[未解決: '+residual+']');
 if(result.status==='neither')terms.push(input);
 let statusText;
 if(result.status==='neither')statusText=input+'は素数でも合成数でもありません。';
 else if(result.status==='complete')statusText=result.primality==='proven-prime'?'素数です（確定判定）。':'分解完了（すべて確定判定）。';
 else if(result.status==='probable')statusText='未証明の因子を含みます。probable判定は素数証明ではありません。';
 else if(result.status==='cancelled')statusText='中止しました。検算済みの結果だけを表示しています。';
 else if(result.status==='incomplete')statusText=residual!==null?'未完了です。未解決の余因子は素数とは限りません。':'処理は未完了です。最終完了は確認していません。';
 else statusText='計算は停止しました。検算済みの結果だけを表示しています。';
 const equation=input+' = '+terms.join(' × '),reasonText=stopReasonPresentation(result.reason)?.text??'';
 return{input,status:result.status,groups,residual,equation,statusText,reasonCode:result.reason,reasonText,
  certaintyText:groups.map(g=>g.base+': '+(g.certainty==='proven'?'確定判定':'未証明（probable）')).join('、'),
  copyText:[equation,statusText,reasonText].filter(Boolean).join('\n')};
}

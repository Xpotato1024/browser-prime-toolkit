// SPDX-License-Identifier: AGPL-3.0-only
const types=['ready','batch','submitted','released','extracted'];
export function validateCollectionFrame(d,variant,previous=null){
 if(!d||typeof d!=='object'||Object.keys(d).sort().join(',')!=='instrumented,rows,sequence,status,type,version')throw Error('Diagnostic frame shape');
 if(d.version!==1||!Number.isInteger(d.sequence)||d.sequence!==(previous?.sequence??0)+1||d.sequence>2048||!types.includes(d.type)||d.instrumented!==(variant==='instrumented'))throw Error('Diagnostic frame identity');
 if(!d.instrumented){if(d.rows!==null||d.status!==null)throw Error('Baseline has no diagnostic imports');return true;}
 if(!Array.isArray(d.rows)||d.rows.length!==16||!Array.isArray(d.status)||d.status.length!==6)throw Error('Fixed diagnostic arrays');
 if(d.status.some(v=>!Number.isFinite(v)||v<0)||d.status[0]!==0||d.status[1]!==0||!Number.isInteger(d.status[2])||d.status[2]>2000000||!Number.isInteger(d.status[3])||d.status[3]>16||d.status[5]!==2000000)throw Error('Diagnostic clock/scope failure');
 if(previous&&d.status[2]<previous.status[2])throw Error('Diagnostic clock count regression');
 d.rows.forEach((r,i)=>{
  if(!Array.isArray(r)||r.length!==3||r.some(v=>!Number.isFinite(v)||v<0)||r[0]+0.001<r[1]||r[0]>10000000||!Number.isInteger(r[2])||r[2]>1000000)throw Error('Diagnostic phase bounds');
  if(previous&&r.some((v,j)=>v+0.001<previous.rows[i][j]))throw Error('Diagnostic cumulative regression');
 });
 return true;
}
export function attachCollectionPort(worker,variant,onFailure){
 if(!['baseline','instrumented','resieve4','sparse'].includes(variant))throw Error('Named diagnostic variant');
 const channel=new MessageChannel();let last=null,closed=false,failure=null;
 channel.port1.onmessage=e=>{if(closed)return;try{validateCollectionFrame(e.data,variant,last);last=e.data;}catch(error){failure=String(error.message);onFailure(failure);}};
 channel.port1.onmessageerror=()=>{failure='Diagnostic port decode failure';onFailure(failure);};
 channel.port1.start();worker.postMessage({type:'codex-collection-port-v1'},[channel.port2]);
 const terminate=worker.terminate.bind(worker);let terminated=false,timer=null;
 const close=()=>{if(closed)return;closed=true;clearTimeout(timer);channel.port1.close();};
 worker.terminate=()=>{if(!terminated){terminated=true;try{terminate();}finally{timer=setTimeout(close,50);}}};
 return{get closed(){return closed;},close,snapshot:()=>({closed,terminated,failure,last})};
}

// Final cumulative snapshot: runtime sequence transitions are enforced at reception.
export function validateCollectionFinal(d,variant){if(!Number.isInteger(d?.sequence)||d.sequence<1||d.sequence>2048)throw Error('Final diagnostic sequence');return validateCollectionFrame({...d,sequence:1},variant);}

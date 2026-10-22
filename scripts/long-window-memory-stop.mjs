// SPDX-License-Identifier: AGPL-3.0-only
export async function stopForMemoryGuard({requestStop,retireChrome,timeoutMs=1000}){
 if(!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>1000)throw Error('Finite memory stop deadline');
 let timer;
 try{await Promise.race([Promise.resolve().then(requestStop),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Memory stop deadline')),timeoutMs);})]);}
 catch{await retireChrome();}
 finally{clearTimeout(timer);}
}

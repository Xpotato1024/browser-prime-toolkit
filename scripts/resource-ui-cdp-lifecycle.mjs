// Test-only lifecycle handling: a cancelled Worker can detach while paused for CDP setup.
const setupMethods=new Set(['Network.enable','Network.setCacheDisabled','Network.setBypassServiceWorker','Runtime.enable','Runtime.runIfWaitingForDebugger']);
export function retireSetupCalls(pending,sessionId){
 for(const[id,call]of pending)if(call.sessionId===sessionId&&setupMethods.has(call.method)){
  clearTimeout(call.timer);pending.delete(id);call.reject(Error(call.method+': Session with given id not found.'));
 }
}
export function knownDetachedSetup(row,{detached,active,workers}){
 return Boolean(row&&workers.has(row.sessionId)&&detached.has(row.sessionId)&&!active.has(row.sessionId)&&/^(Network\.(enable|setCacheDisabled|setBypassServiceWorker)|Runtime\.(enable|runIfWaitingForDebugger)): Session with given id not found\.$/.test(row.error));
}

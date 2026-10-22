  // Positive audit controls after quiet counters were asserted.
  await networkOffline(false);await new Promise(r=>server.listen(port,'127.0.0.1',r));
  await evaluate('fetch("/blocked-probe").catch(()=>null)');
  assert.ok((await evaluate('evaluationHarness.violations')).some(v=>v.directive==='connect-src'));
  await send('Page.navigate',{url:origin+'/probe'},pageSession);
  for(let i=0;i<100&&!http.includes('/probe');i++)await new Promise(r=>setTimeout(r,10));
  assert.ok(http.includes('/probe'));assert.ok(requests.some(r=>r.url===origin+'/probe'));
  const probe='fetch('+JSON.stringify(origin+'/worker-probe')+').then(()=>self.postMessage("observed")).catch(()=>self.postMessage("failed"));';
  await evaluate('new Promise((yes,no)=>{const url=URL.createObjectURL(new Blob(['+JSON.stringify(probe)+'],{type:"text/javascript"}));const w=new Worker(url);w.onmessage=e=>{URL.revokeObjectURL(url);w.terminate();e.data==="observed"?yes(true):no(Error("probe"));};w.onerror=e=>no(Error(e.message));})');
  assert.ok(http.includes('/worker-probe'));assert.ok(requests.some(r=>r.url===origin+'/worker-probe'&&r.sessionId!==pageSession));

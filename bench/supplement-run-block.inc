  const records=[];
  // Stop the asset server before all timed calculations; Blob sources are already local.
  await networkOffline(true);server.closeAllConnections();
  await new Promise(r=>server.close(r));
  const measure=async(c,options)=>{
    const mark=memory.mark();await memory.sample();
    const result=await evaluate('evaluationHarness.run('+JSON.stringify(c.input)+','+JSON.stringify(options)+')');
    await memory.sample();verifySnapshot(result,c.input);
    if(['complete','probable'].includes(result.status))assert.deepEqual(result.factors.map(f=>f.value),c.factors);
    assert.equal(result.allLanesDisposed,true);
    records.push({case:c.id,input:c.input,expectedFactors:c.factors,options,result,sampledRam:memory.summary(mark)});
    console.log('Measured '+c.id+' '+JSON.stringify(options)+' '+result.status+' '+result.reason);
  };
  if(mode==='long'){
    await measure({id:'siqs-smoke',input:'1000000000100000000002379',factors:['1000000000039','1000000000061']},{kind:'siqs',computeMs:10000,totalMs:15100,seed:1});
    for(const c of selected)for(const computeMs of [10000,30000])
      await measure(c,{kind:'siqs',computeMs,totalMs:computeMs+5100,seed:c.id.startsWith('holdout')?23:1});
    for(const c of selected)await measure(c,{kind:'profile',computeMs:10000,totalMs:15100,seed:c.id.startsWith('holdout')?23:1});
  }else if(mode==='pool'){
    const id=process.argv[process.argv.indexOf('--case')+1],c=corpus.find(c=>c.id===id);
    if(!c||!['balanced-13-0','balanced-96bit-0','balanced-112bit-0','holdout-balanced-112','holdout-unbalanced-m127'].includes(id))throw Error('Fixed pool case');
    await measure(c,{kind:'ecm',workers:Number(process.argv[process.argv.indexOf('--workers')+1]),seed:Number(process.argv[process.argv.indexOf('--seed')+1]),totalMs:1000});
  }else if(mode==='pm1'){
    const controls=JSON.parse(await readFile(join(root,'bench/pm1-controls.json')));
    for(const c of [...controls,...selected,...corpus.filter(c=>c.id==='holdout-unbalanced-m127')])
      for(const base of [2,3])await measure(c,{kind:'pm1',base,totalMs:1000});
  }else if(mode==='quick'){
    const c={id:'control',input:'10403',factors:['101','103']};
    for(const workers of [1,2])await measure(c,{kind:'ecm',workers,totalMs:1000});
    await measure({id:'pm1-positive',input:'1009003027',factors:['1009','1000003']},{kind:'pm1',totalMs:1000});
    await measure({id:'siqs-smoke',input:'1000000000100000000002379',factors:['1000000000039','1000000000061']},{kind:'profile',computeMs:10000,totalMs:15100});
    const hard=selected[2].input;
    const cancelled=await evaluate('evaluationHarness.cancel('+JSON.stringify(hard)+',{kind:"ecm",workers:2,totalMs:10000})');
    assert.equal(cancelled.status,'cancelled');assert.equal(cancelled.allLanesDisposed,true);
    await measure(c,{kind:'ecm',workers:2,totalMs:1000});
  }else throw Error('Mode');
  const ownership=await evaluate('evaluationHarness.ownership()');assert.equal(ownership.live,0);assert.ok(ownership.maxLive<=2);
  assert.deepEqual(await evaluate('evaluationHarness.violations'),[]);
  assert.deepEqual(await evaluate('evaluationHarness.errors'),[]);
  assert.deepEqual(await evaluate('evaluationHarness.rejections'),[]);
  assert.equal(requests.length,0);assert.equal(http.length,0);assert.deepEqual(badEvents,[]);assert.deepEqual(fatal,[]);
  await memory.stop();
  const sourceFiles={};
  for(const path of ['scripts/benchmark-supplement.mjs','scripts/browser-memory.mjs','native/gmp/supplement-build.json',...initialAssets.map(a=>a.path.slice(1))])
    sourceFiles[path]=createHash('sha256').update(await readFile(join(root,path))).digest('hex');
  const receipt={mode,measuredHead:process.env.PRIME_MEASURED_HEAD??null,measuredAt:new Date().toISOString(),browser,browserDevice,
    host:{platform:platform(),release:release(),cpu:cpus()[0]?.model,logicalCpus:cpus().length,memoryBytes:totalmem(),headless:true},
    coldReadyMs,initialAssets,sourceFiles,records,ownership,sampledRam:memory.summary(),
    quiet:{networkRequests:0,httpRequests:0,badEvents:0,assetServerStopped:true,cacheDisabled:true},
    limits:{operationBudget:50000000,wholeRam:'sampled Chrome tree RSS/PSS, not a hard bound or instantaneous peak',
      workerAudit:'terminal/progress observations only; terminated loser may have unreported final curve',profile:'last split approximate callback interval wall including JS/import/budget/output validation; additional phase clock sampling, not primary timing'}};
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
  receipt.detectorSelfTest={blockedPageFetchCsp:true,pageCdpAndHttp:true,workerCdpAndHttp:true};
  await writeFile(output,JSON.stringify(receipt,null,2)+'\n');console.log('Receipt '+output);

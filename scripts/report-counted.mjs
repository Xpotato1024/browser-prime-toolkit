import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {makeCandidateCorpus} from '../bench/candidate-corpus.mjs';
import {verifyFactorResult} from '../src/engine/result.js';
const root=new URL('../',import.meta.url),read=p=>readFileSync(new URL(p,root)),sha=b=>createHash('sha256').update(b).digest('hex');
const modes=['primary','diagnostic','lifecycle'],sets=Object.fromEntries(modes.map(m=>[m,JSON.parse(read('docs/benchmarks/llm01-counted-'+m+'.json'))]));
const ids=['balanced-13-0','balanced-96bit-0','balanced-112bit-0','holdout-balanced-80','holdout-balanced-112'],variants=['legacy','clock-gated','dense','lanczos'];
const corpus=[...makeCandidateCorpus(false),...JSON.parse(read('bench/selection-holdout.json'))];
const head='dc5a568988eb2e645f773c0caedfc4a5c302b33e',good=r=>['complete','probable'].includes(r.status);
const result=t=>t.records[0].result,audit=t=>result(t).audits[0],f=n=>n.toFixed(1),range=a=>f(Math.min(...a))+'–'+f(Math.max(...a)),mib=n=>n/1048576;
const find=(mode,id,variant,budget=10000)=>sets[mode].trials.find(t=>t.caseId===id&&t.variant===variant&&t.budgetMs===budget);
for(const mode of modes){
 const set=sets[mode];assert.equal(set.freshChromePerTrial,true);assert.equal(set.trials.length,mode==='primary'?40:mode==='diagnostic'?20:4);
 assert.equal(sha(read('scripts/run-counted-matrix.mjs')),set.runnerSha256);
 const expected=new Set();for(const id of mode==='lifecycle'?ids.slice(0,1):ids)for(const v of variants)for(const b of mode==='primary'?[1000,10000]:[10000])expected.add(id+'/'+v+'/'+b);
 for(const t of set.trials){
  assert.ok(expected.delete(t.caseId+'/'+t.variant+'/'+t.budgetMs));assert.equal(t.measuredHead,head);
  assert.equal(t.mode,mode);assert.equal(t.records.length,1);assert.equal(t.ownership.live,0);assert.equal(t.ownership.maxLive,1);
  for(const [p,h] of Object.entries(t.sourceFiles))assert.equal(sha(read(p)),h,p);
  for(const k of ['networkRequests','httpRequests','badEvents'])assert.equal(t.quiet[k],0);
  assert.equal(t.quiet.assetServerStopped,true);assert.ok(Object.values(t.detectorSelfTest).every(x=>x===true));
  const r=result(t),c=corpus.find(c=>c.id===t.caseId);assert.equal(t.records[0].input,c.input);assert.deepEqual(t.records[0].expectedFactors,c.factors);verifyFactorResult(r,c.input);
  assert.equal(t.browser.product,sets.primary.trials[0].browser.product);assert.equal(t.browser.revision,sets.primary.trials[0].browser.revision);
  if(good(r))assert.deepEqual(r.factors.map(f=>f.value),c.factors);
  assert.equal(r.algorithm,'siqs');assert.equal(r.seed,t.caseId.startsWith('holdout')?23:1);assert.equal(r.allLanesDisposed,true);
  assert.ok(r.operations<=50000000);assert.equal(r.linearMemoryBytes,67108864);
  assert.equal(audit(t).liveBytes,0);assert.equal(audit(t).poisoned,false);
  if(t.variant!=='legacy'){assert.ok(audit(t).maxClockGap<=64);assert.ok(audit(t).logical<=r.operations);}
  if(['dense','lanczos'].includes(t.variant)){assert.ok(audit(t).lanczosAttempts<=2);assert.ok(audit(t).lanczosIterations<=4096);}
  if(mode!=='primary'||t.variant!=='legacy'||t.budgetMs===10000)assert.ok(good(r));
  if(mode==='lifecycle'){
   for(const when of ['loading','running']){assert.equal(t.lifecycle[when].status,'cancelled');assert.equal(t.lifecycle[when].allLanesDisposed,true);}
   if(t.variant!=='legacy'){assert.equal(t.lifecycle.fatal.rejected,true);assert.ok(good(t.lifecycle.fatal.recovered));assert.equal(t.lifecycle.fatal.recovered.allLanesDisposed,true);}
  }
 }
 assert.equal(expected.size,0);
}
assert.equal(sets.primary.trials.filter(t=>t.variant==='legacy'&&t.budgetMs===1000&&good(result(t))).length,0);
const archive=JSON.parse(read('docs/benchmarks/archive/stage8-9487e42/manifest.json'));
for(const [p,h] of Object.entries(archive.files))assert.equal(sha(read('docs/benchmarks/archive/stage8-9487e42/'+p)),h);
for(const id of ids){
 const abc=['legacy','clock-gated','dense'].map(v=>result(find('primary',id,v)));
 assert.equal(abc[0].operations,abc[1].operations);assert.equal(abc[1].operations,abc[2].operations);
 for(const b of [1000,10000]){
  const c=audit(find('primary',id,'dense',b)),d=audit(find('primary',id,'lanczos',b));
  assert.deepEqual(c.phaseWork.slice(0,4),d.phaseWork.slice(0,4));
 }
 const c=audit(find('diagnostic',id,'dense')),d=audit(find('diagnostic',id,'lanczos'));
 assert.ok(c.descriptorBytes>0&&c.parityBytes>0);
 for(const k of ['descriptorBytes','parityBytes','matrixDescriptorSha256','paritySha256'])assert.equal(c[k],d[k]);
}
const lines=['# SIQSの時計・callback分離と有界Lanczos比較','','コードhead: '+head+'。非公開の固定最小実験。旧測定と旧artifactは保持する。',
'','固定5問ではclock/Budget経路とcallback集約で大きく改善した。Lanczos差替えに一貫した優位は見られず、この範囲では集約denseを次の私的候補とする。',
'1秒枠の成功は旧版0/5、他3variantは各5/5。10秒枠は全variant各5/5。製品UI・公開用schedulerへの採用判断は別段階。',
'','## 条件と比較の意味','','seed1・holdout23、総50M logical checkpoints、計算枠1000/10000ms。各セルは1観測で反復統計ではない。',
'各trialはfresh Chrome/Worker、順序回転。計測前の共通asset graphには4variantのbundleを含む。cold取得は別記録し、requestはasset取得後のWorker作成・compile/初期化・計算・検証を含む。',
'外側期限は計算枠+5100ms、内側host期限は計算枠+100ms。64checkpoint samplingに厳密wall保証はない。',
'A=旧版、B=同じ旧WASMのclock/Budget経路変更、C=C側の計数・callback集約+旧dense、D=Cと同じふるい/relation+上流Lanczos。',
'A→Bは純粋clock単体のマイクロベンチではなくglue/Budget経路を含む。A/B/Cの成功した10秒枠はwhole-job operationsが5問すべて一致した。',
'C/Dのbase/poly/sieve/relationのphase workも一致。Dには追加のmatrix poll/検算があり、50Mは同じ算術命令数を意味しない。',
'','|入力（10秒枠、初期化込みms）|A 旧|B clock|C 集約dense|D 集約Lanczos|','|---|---:|---:|---:|---:|'];
for(const id of ids)lines.push('|'+[id,...variants.map(v=>f(result(find('primary',id,v)).requestWallMs))].join('|')+'|');
lines.push('','|variant / 枠ms|成功/5|request ms範囲|初期化ms範囲|計算ms範囲|','|---|---:|---:|---:|---:|');
for(const v of variants)for(const b of [1000,10000]){
 const a=sets.primary.trials.filter(t=>t.variant===v&&t.budgetMs===b).map(result);
 lines.push('|'+[v+'/'+b,a.filter(good).length+'/5',range(a.map(r=>r.requestWallMs)),range(a.map(r=>r.initializationMs)),range(a.map(r=>r.computeWallMs))].join('|')+'|');
}
lines.push('','## callbackと資源','','|入力（10秒枠）|B logical/import|B clock|C import|C clock|D import|D attempt/iteration|','|---|---:|---:|---:|---:|---:|---:|');
for(const id of ids){
 const b=audit(find('primary',id,'clock-gated')),c=audit(find('primary',id,'dense')),d=audit(find('primary',id,'lanczos'));
 lines.push('|'+[id,b.logical,b.clockReads,c.importCalls,c.clockReads,d.importCalls,d.lanczosAttempts+'/'+d.lanczosIterations].join('|')+'|');
}
lines.push('','|variant（主10観測）|Chrome tree peak PSS標本MiB範囲|peak RSS標本MiB範囲|managed heap peak MiB範囲|cold asset ready ms範囲|','|---|---:|---:|---:|---:|');
for(const v of variants){
 const a=sets.primary.trials.filter(t=>t.variant===v);
 lines.push('|'+[v,range(a.map(t=>mib(t.records[0].sampledRam.peakPssBytes))),range(a.map(t=>mib(t.records[0].sampledRam.peakRssBytes))),range(a.map(t=>mib(audit(t).peakBytes))),range(a.map(t=>t.coldReadyMs))].join('|')+'|');
}
lines.push('','WASMは実際のmemory.grow拒否まで検証した固定64MiB、stack1MiB、managed heap32MiB。取消後はWorkerを破棄するためterminal native heap監査は得られない。',
'RAMは全Chrome子processの25ms標本で、RSSには共有pageの重複があり、瞬間peak/hard process RAM上限やmobile適性を示さない。',
'','## 別枠のphase診断','','下表はlast splitのcallback間隔wall概算。JS/import/Budget/出力検証と追加sampling/captureを含み、純粋C時間でも主計測でもない。',
'','|入力|variant|sieve ms|relation ms|matrix ms|','|---|---|---:|---:|---:|');
for(const id of ids)for(const v of variants){
 const a=audit(find('diagnostic',id,v)),p=a.profile?.wallMs??a.phaseIntervals;
 lines.push('|'+[id,v,f(p[3]??0),f(p[4]??0),f(p[5]??0)].join('|')+'|');
}
lines.push('','Cのmatrix概算は'+range(ids.map(id=>audit(find('diagnostic',id,'dense')).phaseIntervals[5]))+'ms、Dは'+range(ids.map(id=>audit(find('diagnostic',id,'lanczos')).phaseIntervals[5]))+'msだった。matrix主因という仮説はこの結果から支持しない。',
'5問すべてでC/Dのmatrix-relevant factor-offset/cycle descriptorとparity hashが一致。全relation fieldやFB prime値の一致までは立証しない。',
'','## 停止・回復と限界','','4variantすべてでloading/running取消とfresh Worker再実行が成功した。追加3variantは固定unreachable WASMによる計算入口trapをprotocol errorとして退役し、fresh Workerで回復した。SIQS core内で自然発生したtrapの実測ではない。',
'0/1/63/64/65/127/128/129のexact operation cap、phase末尾時計、残tail、資源停止、job-global試行/反復枠はunit/nativeで検証する。',
'native ASan/UBSanはdense全2528・Lanczos全3818割当失敗、6phase、13probeと回復を完了。最終headのCIでも再実行する。',
'今回は固定5入力・2枠・各1回であり、128bit全域/困難入力/複数端末/長期負荷の一般保証ではない。上限1024cycle prefixは維持し、filterやGNFSは実装していない。',
'次は集約denseを候補に、入力範囲・scheduler・UI・公開license/source/relink/site契約を本人判断へ返す。今回の数値だけで公開設定を変更しない。',
'','証跡: [主40回](llm01-counted-primary.json)、[別枠診断20回](llm01-counted-diagnostic.json)、[取消・回復4構成](llm01-counted-lifecycle.json)。',
'[原本・実装境界](../architecture/counted-lanczos-review.md)、[TDD記録](../operations/stage8-tdd-evidence.md)。native/browser単純倍率は作成しない。','');
lines.push('予備9487e42の64構成は[archive](archive/stage8-9487e42/README.md)に保持した。最終測定はbusy guard修正後の上記code headを用いる。','');
for(const v of ['dense','lanczos']){const r=JSON.parse(read('native/siqs-v2/build-'+v+'.json'));lines.push(v+' WASM: '+r.bytes+' bytes / SHA-256 '+r.sha256+'。');}
lines.push('');
const output=lines.join('\n'),destination=new URL('../docs/benchmarks/llm01-counted.md',import.meta.url);
if(process.argv.includes('--check'))assert.equal(readFileSync(destination,'utf8'),output);else writeFileSync(destination,output);
console.log('Verified 40 primary, 20 separate diagnostic, 4 lifecycle receipts, fixed source bindings and matrix parity identity');

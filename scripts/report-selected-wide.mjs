// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {historicalHashes} from './git-source-blobs.mjs';
import {validateGuardManifest} from './source-guard.mjs';
import {validateCollectionSources} from './collection-receipt-proof.mjs';
const base='docs/benchmarks/staged-selected-wide-stage44',sha=b=>createHash('sha256').update(b).digest('hex');
if(process.argv.includes('--pack')){
 const from=process.argv[process.argv.indexOf('--pack')+1];assert.ok(from&&!existsSync(base));mkdirSync(base,{recursive:true});
 const files={};let total=0;
 for(const name of ['selected-helper.json','selected-helper.log','selected-contracts.json','selected-contracts.log','selected-red.log','selected-green.log']){
  const raw=readFileSync(join(from,name));assert.ok(raw.length<=2097152);
  const packed=gzipSync(raw,{level:9,mtime:0}),text=packed.toString('base64').match(/.{1,76}/g).join('\n')+'\n';total+=Buffer.byteLength(text);
  files[name]={file:name+'.gz.base64',originalBytes:raw.length,originalSha256:sha(raw),compressedBytes:packed.length,compressedSha256:sha(packed),encodedBytes:Buffer.byteLength(text)};
  writeFileSync(join(base,files[name].file),text,{flag:'wx'});
 }
 assert.ok(total<=1048576);writeFileSync(join(base,'evidence-index.json'),JSON.stringify({encoding:'gzip+canonical-base64-lines76',files,totalEncodedBytes:total},null,2)+'\n',{flag:'wx'});
}
const index=JSON.parse(readFileSync(join(base,'evidence-index.json'))),raws=new Map();let total=0;
assert.equal(index.encoding,'gzip+canonical-base64-lines76');
assert.deepEqual(Object.keys(index.files),['selected-helper.json','selected-helper.log','selected-contracts.json','selected-contracts.log','selected-red.log','selected-green.log']);
for(const[name,e]of Object.entries(index.files)){
 assert.equal(e.file,name+'.gz.base64');const text=readFileSync(join(base,e.file),'utf8'),packed=Buffer.from(text.replaceAll('\n',''),'base64');
 assert.equal(packed.toString('base64').match(/.{1,76}/g).join('\n')+'\n',text);assert.equal(packed.length,e.compressedBytes);assert.equal(sha(packed),e.compressedSha256);assert.equal(Buffer.byteLength(text),e.encodedBytes);total+=e.encodedBytes;
 const raw=gunzipSync(packed,{maxOutputLength:2097152});assert.equal(raw.length,e.originalBytes);assert.equal(sha(raw),e.originalSha256);raws.set(name,raw);
}
assert.equal(total,index.totalEncodedBytes);assert.ok(total<=1048576);
assert.match(raws.get('selected-red.log').toString(),/ERR_MODULE_NOT_FOUND/);assert.match(raws.get('selected-green.log').toString(),/pass 9/);
const helper=JSON.parse(raws.get('selected-helper.json')),browser=JSON.parse(raws.get('selected-contracts.json'));
assert.equal(helper.measuredHead,browser.measuredHead);validateGuardManifest({head:helper.measuredHead,sourceGuard:helper.sourceGuard});
assert.equal(helper.nodeVersion,'v24.19.0');assert.equal(helper.rows.length,2);assert.deepEqual(helper.rows.map(r=>r.variant),['baseline','selected']);
const paths=[...new Set([...Object.keys(browser.sourceFiles),...Object.keys(browser.graphSourceFiles)])],hashes=historicalHashes(browser.measuredHead,paths);
validateCollectionSources(browser,hashes);
assert.equal(browser.caseId,null);assert.equal(browser.records.length,1);assert.equal(browser.records[0].performanceMeasurement,false);assert.equal(browser.records[0].tests.length,22);
assert.ok(browser.records[0].tests.every(t=>t.pass===true&&!('error'in t)));
assert.ok(browser.records[0].tests.some(t=>t.name==='fresh-full-path'));assert.ok(browser.records[0].tests.some(t=>t.name==='fresh-full-64-path'));assert.ok(browser.records[0].tests.some(t=>t.name==='cancel-during-sieve'));
assert.deepEqual(browser.quiet,{networkRequests:0,httpRequests:0,badEvents:0,assetServerStopped:true,cacheDisabled:true});
assert.deepEqual(browser.detectorSelfTest,{blockedPageFetchCsp:true,pageCdpAndHttp:true,workerCdpAndHttp:true});
assert.equal(browser.ownership.live,0);assert.equal(browser.ownership.liveSources,0);assert.equal(browser.sampledRam.observerFailure,null);
const role=JSON.parse(readFileSync('native/selected-wide/worker-sources.json')),math=r=>({input:r.input,packets:r.packets,digests:r.digests});
for(const r of helper.rows){
 assert.equal(r.closed,true);assert.equal(r.knownFactorsUsed,false);assert.equal(r.packets.length,4);assert.equal(r.digests.length,4);assert.equal(r.memory.allocationFailures,0);assert.ok(r.memory.linearBytes<=64*1048576);
 r.packets.forEach((p,i)=>{assert.equal(p.family,i);assert.equal(p.facts.polynomials,2048);assert.equal(p.facts.families,1);assert.equal(p.facts.bytes,p.bytes);assert.match(p.sha256,/^[a-f0-9]{64}$/);});
 assert.deepEqual(math(r),math(helper.rows[0]));
}
assert.equal(helper.rows[1].artifactSha256,role.roles[64].nativeSha256);
const runtime=browser.initialAssets??browser.assets;
assert.ok(Array.isArray(runtime));
assert.ok(runtime.some(a=>a.path==='/src/selected-wide/worker-1024.js'));
assert.ok(runtime.some(a=>a.path==='/src/selected-wide/worker-64.js'));
assert.ok(!runtime.some(a=>a.path==='/src/wide-window/worker-source.js'||a.path==='/src/optimized/worker-source.js'),'Detached selected runtime does not load old Native factories');
const output='docs/benchmarks/llm01-selected-wide.md',text=[
'# 選定wide入口の追加機能試験','',
'測定head '+helper.measuredHead+'。性能32反復の終了後に実施した機能試験で、速度比較へ混ぜない。','',
'- 新helper64MiBは旧builtin64とRSA100先頭4familyのpacket全bytes hash・family digest・多項式数・関係式数が一致。双方とも割当失敗0、context解放済み。',
'- owner1024MiBは反復測定したresieve1のbytesを再利用。helperとownerの対象関数を完全一致で検査し、2clean buildの64MiB hardcap/zero importsを確認した。',
'- 実Chromeの22契約（40/64桁fresh、取消、deadline、protocol偽造、誤因子、OOM/予算拒否、退役・復帰）が成功。通信0、Worker/source残存0、detector selftest成功。',
'- 実際に読み込んだassetは選定64/1024 roleを含み、旧Native factoryをロードしない。初回asset取得後はserverを止めofflineで計算した。',
'- 入口/cap拒否/protocol/runner一致の実redを保存した。greenは統計7件＋入口2件。','',
'全'+Object.keys(index.files).length+'原本を可逆圧縮'+total.toLocaleString('en-US')+' bytesで保全（上限1MiB）。[索引](staged-selected-wide-stage44/evidence-index.json)。',
'通常UI・サイト公開は変更していない。新入口でのRSA100完走、5Worker性能改善、他端末での改善は未測定。',''].join('\n');
if(process.argv.includes('--check'))assert.equal(readFileSync(output,'utf8'),text);else writeFileSync(output,text);
console.log(JSON.stringify({head:helper.measuredHead,helperFamilies:4,browserContracts:22,evidenceBytes:total}));

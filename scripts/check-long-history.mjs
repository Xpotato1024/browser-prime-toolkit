import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {upgradeLegacyLongHarness} from './long-asset-upgrade.mjs';
import {longAsset} from './long-asset-route.mjs';
import {verifyLongReceipt} from './long-receipt.mjs';
const dir='docs/benchmarks/archive/staged-long-router-v1/',read=async p=>JSON.parse(await readFile(p,'utf8'));
const manifest=await read(dir+'manifest.json'),source=dir+'verify-long-rsa-source.txt';
assert.equal(manifest.measuredHead,'8a63892ea855f598723d2fbdca4c646d019af5fc');
for(const[path,sha]of Object.entries(manifest.files))assert.equal(createHash('sha256').update(await readFile(dir+path)).digest('hex'),sha,path);
assert.equal(await readFile('scripts/verify-long-rsa.mjs','utf8'),upgradeLegacyLongHarness(await readFile(source,'utf8')),'Only pre-computation asset routing and its self-test changed');
const baseline=await read(dir+'llm01-staged-long-contract.json'),sourceOverrides={'scripts/verify-long-rsa.mjs':source};
await verifyLongReceipt(baseline,{sourceOverrides});
export const historicalRsa100=await read(dir+'llm01-staged-long-rsa100-seed1-600000.json');
const official=JSON.parse(await readFile('bench/staged-rsa/catalog.json','utf8')).find(c=>c.id==='RSA-100');
const value=await verifyLongReceipt(historicalRsa100,{expected:official,baseline,sourceOverrides});
for(const asset of historicalRsa100.initialAssets){
 assert.equal(longAsset(asset.path),asset.path.slice(1));assert.equal(createHash('sha256').update(await readFile(asset.path.slice(1))).digest('hex'),asset.sha256);
}
console.log(JSON.stringify({historicalRsa100:value.kind,reason:value.reason,requestWallMs:value.requestWallMs,operations:value.snapshot.operations,sampledRam:historicalRsa100.sampledRam,unchangedComputationSources:true}));

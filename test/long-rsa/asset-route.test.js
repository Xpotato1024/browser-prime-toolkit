import test from 'node:test';
import assert from 'node:assert/strict';
import {longAsset} from '../../scripts/long-asset-route.mjs';
test('only explicit decoded runtime assets can be served; factor oracles never resolve',()=>{
 for(const path of ['/bench/staged-practical/oracle.json','/bench/staged-practical/%6fracle.json','/bench/staged-practical/%256fracle.json',
  '/bench/staged-practical/%6danifest.json','/bench/staged-practical/x/../oracle.json','/bench/staged-practical/%2e%2e/staged-practical/%6fracle.json',
  '/bench/staged-practical/oracle.json%00.js','/src/../bench/staged-practical/oracle.json','/src/%2e%2e/bench/staged-practical/oracle.json',
  '/src\\..\\bench\\staged-practical\\oracle.json','/bench/long-rsa.js/../oracle.json','/bench/%zz','/bench/staged-practical/catalog.json']){
  assert.equal(longAsset(path),null,path);
 }
 assert.equal(longAsset('/bench/long-rsa.js'),'bench/long-rsa.js');
 assert.equal(longAsset('/bench/%6cong-rsa.js'),'bench/long-rsa.js');
 assert.equal(longAsset('/src/long-rsa/worker-source.js'),'src/long-rsa/worker-source.js');
});

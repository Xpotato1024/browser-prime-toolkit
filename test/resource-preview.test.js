import test from 'node:test';import assert from 'node:assert/strict';
import {createResourcePreviewServer} from '../scripts/preview-resources.mjs';
import {resourceUiAsset} from '../scripts/resource-ui-asset-route.mjs';
test('resource preview serves only local assets under a quiet CSP',async()=>{
 const server=createResourcePreviewServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 try{
  const page=await fetch(origin);assert.equal(page.status,200);assert.match(await page.text(),/resources-main.js/);
  const csp=page.headers.get('content-security-policy');assert.match(csp,/connect-src 'none'/);assert.match(csp,/style-src 'self'/);assert.ok(!csp.includes('unsafe-inline'));
  const css=await fetch(origin+'/app/resources.css');assert.equal(css.status,200);assert.match(css.headers.get('content-type'),/text\/css/);
  for(const path of ['/docs/README.md','/bench/staged-full/oracle.json','/native/resources/build-64.json','/app/%2e%2e/bench/staged-full/oracle.json'])assert.equal((await fetch(origin+path)).status,404);
  assert.equal((await fetch(origin,{method:'POST'})).status,405);
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});
test('runtime test server has no oracle or escaped-path route',()=>{
 for(const p of ['/bench/staged-full/oracle.json','/bench/staged-full/%6fracle.json','/src/../bench/oracle.js','/src/%2e%2e/bench/oracle.js','/src/worker.js%00'])assert.equal(resourceUiAsset(p),null);
 assert.equal(resourceUiAsset('/app/resources.css'),'app/resources.css');
});

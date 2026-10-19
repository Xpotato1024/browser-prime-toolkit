import test from 'node:test';
import assert from 'node:assert/strict';
import {createPrivatePreviewServer} from '../../scripts/preview-private.mjs';
async function fixture(t){
 const server=createPrivatePreviewServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
 t.after(()=>{server.closeAllConnections();return new Promise(r=>server.close(r));});
 return{server,base:'http://127.0.0.1:'+server.address().port};
}
test('private preview binds to loopback and serves only the UI entry and source',async t=>{
 const{server,base}=await fixture(t);assert.equal(server.address().address,'127.0.0.1');
 const page=await fetch(base+'/');assert.equal(page.status,200);assert.match(await page.text(),/factor-app/);
 const source=await fetch(base+'/src/core/integer-input.js');assert.equal(source.status,200);
 assert.match(source.headers.get('content-type'),/javascript/);assert.match(await source.text(),/parseIntegerInput/);
});
test('repository metadata, artifacts and path escapes are never served',async t=>{
 const{base}=await fixture(t);
 for(const path of ['/.git/config','/docs/README.md','/native/gmp/bridge.c','/package.json',
  '/app/%2e%2e/%2e%2e/.git/config','/app%5c..%5c.git/config','/app/','/src/']){
  const r=await fetch(base+path);assert.equal(r.status,404,path);await r.text();
 }
});
test('preview has no upload route and HEAD sends no document body',async t=>{
 const{base}=await fixture(t);const post=await fetch(base+'/',{method:'POST',body:'secret'});
 assert.equal(post.status,405);await post.text();
 const head=await fetch(base+'/',{method:'HEAD'});assert.equal(head.status,200);assert.equal(await head.text(),'');
});

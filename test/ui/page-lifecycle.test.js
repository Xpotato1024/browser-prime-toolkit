import test from 'node:test';
import assert from 'node:assert/strict';
import {createPageLifecycle} from '../../src/ui/page-lifecycle.js';
function fixture(){
 const target=new EventTarget(),root={input:{value:''},querySelector(){return this.input;}};
 let mounts=0,disposals=0;
 const mount=()=>{mounts++;root.input={value:''};let dead=false;return{dispose(){if(!dead){dead=true;disposals++;root.input=null;}}};};
 const page=createPageLifecycle(root,{target,mount});
 const fire=(type,persisted)=>{const e=new Event(type);Object.defineProperty(e,'persisted',{value:persisted});target.dispatchEvent(e);};
 return{page,root,fire,counts:()=>({mounts,disposals})};
}
test('pagehide retires its owner and persisted pageshow remounts the draft without executing',()=>{
 const f=fixture();f.root.input.value='9007199254740993';
 f.fire('pagehide',true);assert.equal(f.page.getApp(),null);assert.deepEqual(f.counts(),{mounts:1,disposals:1});
 f.fire('pageshow',true);assert.ok(f.page.getApp());assert.equal(f.root.input.value,'9007199254740993');
 f.fire('pageshow',true);assert.deepEqual(f.counts(),{mounts:2,disposals:1});f.page.dispose();
});
test('ordinary pageshow does not remount and duplicate pagehide is idempotent',()=>{
 const f=fixture();f.fire('pageshow',false);f.fire('pagehide',false);f.fire('pagehide',false);
 f.fire('pageshow',false);assert.deepEqual(f.counts(),{mounts:1,disposals:1});f.page.dispose();
});
test('explicit disposal removes lifecycle listeners and never restores a closed page',()=>{
 const f=fixture();f.page.dispose();f.page.dispose();f.fire('pagehide',true);f.fire('pageshow',true);
 assert.equal(f.page.getApp(),null);assert.deepEqual(f.counts(),{mounts:1,disposals:1});
});

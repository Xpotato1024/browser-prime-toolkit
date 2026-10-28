// SPDX-License-Identifier: AGPL-3.0-only
// Inert byte fixtures only. No engine graph, generated artifact or build execution.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createArtifactProvenance,localReferences,rewriteLocalReferences,releasePackage} from '../../scripts/artifact-provenance.mjs';
const b=s=>Buffer.from(s),sha=s=>createHash('sha256').update(s).digest('hex');
const revision='a'.repeat(40);
function fixture(){
 const source=b("import {x} from './value.js';\nexport {x};\n");
 const pkg=b(JSON.stringify({name:'fixture-only',version:'0.0.0',license:'MIT',peerDependencies:{react:'19.x'},scripts:{bad:'not included'}}));
 const inputs=new Map([['src/site/index.js',source],['LICENSE',b('fixture license')],['package.json',pkg],['scripts/build.mjs',b('// inert recipe')]]);
 const files=new Map([['src/site/index.mjs',b(rewriteLocalReferences(source.toString()))],['LICENSE',b('fixture license')],['package.json',releasePackage(pkg)]]);
 const origins=new Map([['src/site/index.mjs',{sourcePath:'src/site/index.js',transform:'local-esm-extension'}],['LICENSE',{sourcePath:'LICENSE',transform:'copy'}],['package.json',{sourcePath:'package.json',transform:'release-package'}]]);
 return{sourceRevision:revision,nodeVersion:'v24.22.1',inputs,files,origins,recipes:['scripts/build.mjs'],sourceOffer:['LICENSE']};
}
test('receipt binds container bytes, source bytes, recipe and revision without hash cycles',()=>{
 const f=fixture(),r=createArtifactProvenance(f),js=r.outputs.find(x=>x.path.endsWith('.mjs'));
 assert.equal(r.schemaVersion,1);assert.equal(r.source.revision,revision);assert.equal(r.source.cleanTree,'not-asserted');
 assert.equal(r.toolchain.node,'v24.22.1');assert.equal(js.kind,'javascript-container');
 assert.equal(js.sha256,sha(f.files.get(js.path)));assert.equal(js.source.sha256,sha(f.inputs.get(js.source.path)));
 assert.equal(js.source.bytes,f.inputs.get(js.source.path).length);
 assert.equal(r.recipes[0].sha256,sha(f.inputs.get('scripts/build.mjs')));
 assert.deepEqual(r.sourceOffer,['LICENSE']);assert.equal(r.outputs.length,3);
 assert.ok(!JSON.stringify(r).includes('wasmSha256'));assert.ok(!JSON.stringify(r).includes('browser-tool.json'));
});
test('deterministic bytes do not depend on map or recipe insertion order',()=>{
 const f=fixture(),a=createArtifactProvenance(f);
 const g={...f,files:new Map([...f.files].reverse()),inputs:new Map([...f.inputs].reverse()),origins:new Map([...f.origins].reverse())};
 assert.equal(JSON.stringify(a),JSON.stringify(createArtifactProvenance(g)));
});
test('copy, extension rewriting and package generation must match exact output bytes',()=>{
 for(const path of ['LICENSE','src/site/index.mjs','package.json']){
  const f=fixture();f.files.set(path,b('tampered'));assert.throws(()=>createArtifactProvenance(f),/Transformation mismatch/);
 }
 const f=fixture();f.inputs.set('src/site/index.js',b('changed source'));
 assert.throws(()=>createArtifactProvenance(f),/Transformation mismatch/);
});
test('missing, extra and unknown origins fail closed',()=>{
 const f=fixture();f.origins.delete('LICENSE');assert.throws(()=>createArtifactProvenance(f),/Origin count/);
 const g=fixture();g.origins.set('extra',{sourcePath:'LICENSE',transform:'copy'});assert.throws(()=>createArtifactProvenance(g),/Origin count/);
 const h=fixture();h.origins.get('LICENSE').sourcePath='absent';assert.throws(()=>createArtifactProvenance(h),/Missing source/);
 const i=fixture();i.origins.get('LICENSE').transform='execute';assert.throws(()=>createArtifactProvenance(i),/Unknown transformation/);
});
test('portable local paths reject traversal, ambiguous aliases, reserved outputs and case collisions',()=>{
 for(const path of ['../escape','/absolute','C:/host','a\\b','a//b','a/./b','a/../b','browser-tool.json','artifact-provenance.json']){
  const f=fixture();f.files.set(path,b('x'));f.origins.set(path,{sourcePath:'LICENSE',transform:'copy'});
  assert.throws(()=>createArtifactProvenance(f));
 }
 const f=fixture();f.inputs.set('license',b('alias'));assert.throws(()=>createArtifactProvenance(f),/Path collision/);
});
test('revision, toolchain, recipe and source offer must be explicit and resolvable',()=>{
 for(const override of [{sourceRevision:'HEAD'},{nodeVersion:'latest'},{recipes:[]},{recipes:['absent']},{sourceOffer:[]},{sourceOffer:['absent']}]){
  assert.throws(()=>createArtifactProvenance({...fixture(),...override}));
 }
 const f=fixture();f.inputs.set('unused',b('unused'));assert.throws(()=>createArtifactProvenance(f),/Unused input/);
});
test('receipt construction does not modify input buffers, maps or descriptor objects',()=>{
 const f=fixture(),before=[...f.inputs].map(([p,v])=>[p,v.toString('hex')]),origin=JSON.stringify([...f.origins]);
 const r=createArtifactProvenance(f);r.outputs[0].sha256='changed';
 assert.deepEqual([...f.inputs].map(([p,v])=>[p,v.toString('hex')]),before);
 assert.equal(JSON.stringify([...f.origins]),origin);assert.notEqual(createArtifactProvenance(f).outputs[0].sha256,'changed');
});
test('ESM transformation preserves existing local graph behavior without executing it',()=>{
 const text="import x from './a.js'; const y=import('../b.js'); export {z} from './c.js';";
 assert.deepEqual(localReferences(text),['./a.js','../b.js','./c.js']);
 assert.equal(rewriteLocalReferences(text),"import x from './a.mjs'; const y=import('../b.mjs'); export {z} from './c.mjs';");
 const pkg=JSON.parse(releasePackage(fixture().inputs.get('package.json')));
 assert.equal(pkg.scripts,undefined);assert.equal(pkg.main,'./src/site/index.mjs');
});
test('non-byte inputs and unsupported transformation path pairs are rejected',()=>{
 const f=fixture();f.inputs.set('LICENSE','text');assert.throws(()=>createArtifactProvenance(f),/Buffer required/);
 const g=fixture();g.origins.get('LICENSE').transform='local-esm-extension';assert.throws(()=>createArtifactProvenance(g));
 const h=fixture();h.origins.get('LICENSE').transform='release-package';assert.throws(()=>createArtifactProvenance(h));
});

test('metadata has finite entry and byte budgets without allocating a large probe',()=>{
 const f=fixture(),many=new Map(Array.from({length:10001},(_,i)=>['f'+i,b('x')]));
 assert.throws(()=>createArtifactProvenance({...f,inputs:many}),/Finite input map/);
 const oneMiB=Buffer.alloc(1024*1024),large=new Map(Array.from({length:65},(_,i)=>['f'+i,oneMiB]));
 assert.throws(()=>createArtifactProvenance({...f,inputs:large}),/Byte budget/);
});

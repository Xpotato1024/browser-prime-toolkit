// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';
import {patchSource as basePatch} from '../rusqsieve-dlp/patch-source.mjs';
export function patchSource(files,observer,{compact=false,engineProfile,compactRoot,phase}={}){
 basePatch(files,observer);
 const rep=(s,a,b)=>{assert.equal(s.split(a).length,2,'Graph patch anchor '+a.slice(0,80));return s.replace(a,b);};
 let engine=files['src/src/engine.rs'].toString();
 if(compact){
  engine=rep(engine,'    relations: Vec<Relation>,\n    reroot_vertices:','    relations: Vec<CodexRetainedRelation>,\n    reroot_vertices:');
  engine=rep(engine,'        self.relations.push(rel);','        self.relations.push(CodexRetainedRelation::retain(rel));');
  engine=rep(engine,'            self.columns.push(combine_cycle(\n                core::iter::once(&rel).chain(','            let restored: Vec<Relation> = self.cycle_path.iter().map(|&i| self.forest.relations[i as usize].restore()).collect();\n            self.columns.push(combine_cycle(\n                core::iter::once(&rel).chain(');
  engine=rep(engine,'                    self.cycle_path\n                        .iter()\n                        .map(|&index| &self.forest.relations[index as usize]),','                    restored.iter(),');
  engine+='\n'+compactRoot;
 }else{
  engine+='\ntype CodexRetainedRelation = Relation;\nfn codex_retained_root_bytes(r:&Relation)->usize {r.root.bit_len().div_ceil(8)}\npub(crate) fn codex_graph_roundtrip()->bool {true}\n';
 }
 engine+='\n'+engineProfile;
 files['src/src/engine.rs']=Buffer.from(engine);
 files['src/src/lib.rs']=Buffer.from(files['src/src/lib.rs'].toString()+'\nmod codex_graph_phase;\n');
 files['src/src/codex_graph_phase.rs']=Buffer.from(phase);
 let extract=files['src/src/engine/extract.rs'].toString();
 extract=rep(extract,'    let matrix_cols:','    crate::codex_graph_phase::reset();\n    crate::codex_graph_phase::mark(1);\n    let matrix_cols:');
 extract=rep(extract,'    let matrix =','    crate::codex_graph_phase::mark(2);\n    let matrix =');
 extract=rep(extract,'    // Preserve what','    crate::codex_graph_phase::mark(3);\n    // Preserve what');
 extract=rep(extract,'    for dep in dependencies.iter() {','    crate::codex_graph_phase::mark(4);\n    for dep in dependencies.iter() {');
 files['src/src/engine/extract.rs']=Buffer.from(extract);
 files['src/src/wasm.rs']=Buffer.from(files['src/src/wasm.rs'].toString()+`
#[unsafe(no_mangle)]
pub extern "C" fn codex_graph_profile(session:u32)->u32 {
    COORDS.with(|r| r.borrow().get(session).map_or(0,|s|{
        let mut bytes=Vec::new();
        for v in s.codex_graph_profile() {bytes.extend_from_slice(&v.to_le_bytes());}
        packet(12,&bytes)
    }))
}
#[unsafe(no_mangle)]
pub extern "C" fn codex_graph_columns(session:u32)->u32 {
    COORDS.with(|r| r.borrow().get(session).map_or(0,|s|packet(13,&s.codex_graph_columns())))
}
#[unsafe(no_mangle)]
pub extern "C" fn codex_graph_phase(row:u32,field:u32)->u32 {crate::codex_graph_phase::get(row,field)}
#[unsafe(no_mangle)]
pub extern "C" fn codex_graph_roundtrip()->u32 {engine::codex_graph_roundtrip() as u32}
`);
 return files;
}

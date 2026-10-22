// SPDX-License-Identifier: AGPL-3.0-only
import assert from'node:assert/strict';
import{patchSource as graphPatch}from'../graph-profile/patch-source.mjs';
export function patchSource(files,observer,options){
 graphPatch(files,observer,{...options,compact:true});
 const rep=(s,a,b)=>{assert.equal(s.split(a).length,2,'Release anchor '+a.slice(0,80));return s.replace(a,b);};
 let e=files['src/src/engine.rs'].toString();
 e=rep(e,'    seen_a: HashSet<Natural>,','    seen_a: HashSet<Natural>,\n    codex_extraction_attempted:bool,\n    codex_final_stats:Option<[i64;8]>,');
 e=rep(e,'            seen_a: HashSet::new(),','            seen_a: HashSet::new(),\n            codex_extraction_attempted:false,\n            codex_final_stats:None,');
 e=rep(e,'    pub fn take_jobs(&mut self, maximum: usize) -> Vec<EngineJob> {','    pub fn take_jobs(&mut self, maximum: usize) -> Vec<EngineJob> {\n        if self.codex_extraction_attempted {return Vec::new();}');
 e=rep(e,'    pub fn submit(&mut self, result: EngineJobResult) {','    pub fn submit(&mut self, result: EngineJobResult) {\n        if self.codex_extraction_attempted {return;}');
 e=rep(e,'    pub fn submit_bytes(&mut self, bytes: &[u8]) -> bool {','    pub fn submit_bytes(&mut self, bytes: &[u8]) -> bool {\n        if self.codex_extraction_attempted {return false;}');
 e=rep(e,'        let c = &self.collector;','        if let Some(stats)=self.codex_final_stats {return stats.get(field as usize).copied().unwrap_or(-1);}\n        let c = &self.collector;');
 e+='\n'+options.sessionStop;files['src/src/engine.rs']=Buffer.from(e);
 let w=files['src/src/wasm.rs'].toString();
 w=rep(w,'pub unsafe extern "C" fn qs_coord_submit(session: u32, pointer: u32, length: u32) -> u32 {','pub unsafe extern "C" fn qs_coord_submit(session: u32, pointer: u32, length: u32) -> u32 {\n    if COORDS.with(|r|r.borrow().get(session).is_some_and(|s|s.codex_graph_terminal())) {return u32::MAX;}');
 const a=w.indexOf('pub extern "C" fn qs_coord_extract('),b=w.indexOf('\n#[unsafe(no_mangle)]',a);
 assert.ok(a>0&&b>a);let block=w.slice(a,b);
 block=rep(block,'let reg = r.borrow();','let mut reg = r.borrow_mut();');
 block=rep(block,'let Some(s) = reg.get(session)','let Some(s) = reg.get_mut(session)');
 block=rep(block,'match s.extract_factor() {','if s.codex_graph_terminal() {CODEX_EXTRACT.with(|s|s.set(10));return 0;}\n        match s.codex_graph_extract_once() {');
 w=w.slice(0,a)+block+w.slice(b);files['src/src/wasm.rs']=Buffer.from(w);
 let x=files['src/src/engine/extract.rs'].toString();
 x=rep(x,'    crate::codex_graph_phase::reset();\n','');
 x=rep(x,'    crate::codex_graph_phase::mark(3);','    drop(matrix_cols);\n    crate::codex_graph_phase::mark(3);');
 x=rep(x,'    for dep in dependencies.iter() {','    crate::codex_graph_phase::mark(5);\n    for dep in dependencies.iter() {');
 files['src/src/engine/extract.rs']=Buffer.from(x);
 let m=files['src/src/f2/mod.rs'].toString();
 m=rep(m,'        let mut col_alive = vec![true; ncols];','        crate::codex_graph_phase::mark(20);\n        let mut col_alive = vec![true; ncols];');
 m=rep(m,'        let alive_cols: Vec<usize>','        crate::codex_graph_phase::mark(21);\n        let alive_cols: Vec<usize>');
 m=rep(m,'        if alive_cols.len() == ncols || alive_cols.len() <= reduced_rows {','        if alive_cols.len() == ncols || alive_cols.len() <= reduced_rows {\n            drop((row_cols,col_rows,col_alive,eliminations,stack,alive_cols,row_map));\n            crate::codex_graph_phase::mark(25);');
 m=rep(m,'        let Ok(reduced) = SparseBinaryMatrix::from_columns(reduced_rows, &reduced_cols) else {','        crate::codex_graph_phase::mark(22);\n        let Ok(reduced) = SparseBinaryMatrix::from_columns(reduced_rows, &reduced_cols) else {');
 m=rep(m,'        let words = ncols.div_ceil(64);\n        let mut out = Vec::new();','        drop((row_cols,col_rows,col_alive,stack,row_map,reduced_cols));\n        crate::codex_graph_phase::mark(23);\n        let words = ncols.div_ceil(64);\n        let mut out = Vec::new();');
 m=rep(m,'        if reduced_dependencies.is_empty() {','        crate::codex_graph_phase::mark(24);\n        if reduced_dependencies.is_empty() {');
 files['src/src/f2/mod.rs']=Buffer.from(m);return files;
}

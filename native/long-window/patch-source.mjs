// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';
import {patchSource as mapPatch} from '../lp-map/patch-source.mjs';
export function patchSource(files,observer,options){
 const rep=(s,a,b)=>{assert.equal(s.split(a).length,2,'Long allocation guard anchor '+a.slice(0,100));return s.replace(a,b);};
 let custom=observer.toString();
 custom=rep(custom,'        let p = unsafe { System.alloc(layout) };','        if !la_permit(layout.size(),1){return core::ptr::null_mut();}\n        let p = unsafe { System.alloc(layout) };');
 custom=rep(custom,'        let p = unsafe { System.alloc_zeroed(layout) };','        if !la_permit(layout.size(),2){return core::ptr::null_mut();}\n        let p = unsafe { System.alloc_zeroed(layout) };');
 custom=rep(custom,'        let next = unsafe { System.realloc(p, layout, size) };','        if !la_permit(size,3){return core::ptr::null_mut();}\n        let next = unsafe { System.realloc(p, layout, size) };');
 custom+='\n'+options.quota;
 mapPatch(files,Buffer.from(custom),options);
 let e=files['src/src/engine/extract.rs'].toString();
 e=rep(e,'pub(super) fn extract(ctx: &Context, columns: &[Column]) -> Result<Natural, EngineError> {',
 `pub(super) fn extract(ctx: &Context, columns: &[Column]) -> Result<Natural, EngineError> {
    let _codex_quota=crate::codex_observer::la_scope();
    let entries=columns.iter().try_fold(0usize,|n,c|n.checked_add(c.sign as usize).and_then(|n|n.checked_add(c.powers.iter().filter(|(_,e)|e&1!=0).count()))).ok_or(EngineError::ResourceLimit)?;
    if !crate::codex_observer::la_preflight(ctx.base.len()+1,columns.len(),entries){return Err(EngineError::ResourceLimit);}
`);
 e=rep(e,'    // Preserve what','    crate::codex_observer::la_mark(2,matrix.rows(),matrix.columns(),matrix.nonzeros());\n    // Preserve what');
 e=rep(e,'    for dep in dependencies.iter() {','    crate::codex_observer::la_mark(7,matrix.rows(),matrix.columns(),matrix.nonzeros());\n    for dep in dependencies.iter() {');
 files['src/src/engine/extract.rs']=Buffer.from(e);
 let f=files['src/src/f2/mod.rs'].toString();
 f=rep(f,'        let mut row_cols:','        crate::codex_observer::la_mark(3,nrows,ncols,self.nonzeros());\n        let mut row_cols:');
 f=rep(f,'        let alive_cols:','        let codex_remaining=row_cols.iter().try_fold(0usize,|n,r|n.checked_add(r.len())).ok_or(MatrixError::ResourceLimit)?;\n        crate::codex_observer::la_mark(4,nrows,ncols,codex_remaining);\n        let alive_cols:');
 f=rep(f,'            if prefer_block_lanczos {','            if prefer_block_lanczos {\n                crate::codex_observer::la_mark(5,nrows,ncols,self.nonzeros());');
 f=rep(f,'        let reduced_dependencies = if use_lanczos {','        crate::codex_observer::la_mark(5,reduced.rows(),reduced.columns(),reduced.nonzeros());\n        let reduced_dependencies = if use_lanczos {');
 f=rep(f,'        if reduced_dependencies.is_empty() {','        crate::codex_observer::la_mark(6,reduced.rows(),reduced.columns(),reduced.nonzeros());\n        if reduced_dependencies.is_empty() {');
 files['src/src/f2/mod.rs']=Buffer.from(f);
 return files;
}

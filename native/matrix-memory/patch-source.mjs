// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';
import {patchSource as longPatch} from '../long-window/patch-source.mjs';
export function patchSource(files,observer,options){
 longPatch(files,observer,options);
 const path='src/src/f2/mod.rs',before=files[path].toString();
 const anchor='        crate::codex_graph_phase::mark(22);\n        let Ok(reduced) = SparseBinaryMatrix::from_columns(reduced_rows, &reduced_cols) else {';
 const delayed='        drop((row_cols,col_rows,col_alive,stack,row_map,reduced_cols));';
 assert.equal(before.split(anchor).length,2,'Owned reduced columns / matrix construction anchor');
 assert.equal(before.split(delayed).length,2,'Original delayed filter release anchor');
 const after=before.replace(anchor,'        crate::codex_graph_phase::mark(22);\n        drop((row_cols,col_rows,col_alive,stack,row_map));\n        crate::codex_graph_phase::mark(26);\n        let Ok(reduced) = SparseBinaryMatrix::from_columns(reduced_rows, &reduced_cols) else {').replace(delayed,'        drop(reduced_cols);');
 files[path]=Buffer.from(after);return files;
}

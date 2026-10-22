// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';
import {patchSource as builtinPatch} from '../graph-builtin/patch-source.mjs';
export function patchSource(files,observer,options){
 builtinPatch(files,observer,options);
 const key='src/src/engine.rs',source=files[key].toString(),old='((2 * scores.len()) / candidates.len().max(1))';
 assert.equal(source.split(old).length,2,'Exactly one measured boundary coefficient');
 files[key]=Buffer.from(source.replace(old,'(scores.len() / candidates.len().max(1))'));
 return files;
}

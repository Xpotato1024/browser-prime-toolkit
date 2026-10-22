// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';
import {patchSource as longPatch} from '../long-window/patch-source.mjs';
import {functionSource} from '../collection-hotpath/patch-source.mjs';
export function patchSource(files,observer,options){
 longPatch(files,observer,options);
 let e=files['src/src/engine.rs'].toString();
 const reference=functionSource(e,'resieve_candidate_factors'),score=functionSource(e,'score_polynomial');
 const old="    for (candidate_index, &position) in candidates.iter().enumerate() {\n        for idx in small_end..sparse_start {\n            let first = root1[idx];\n            if first == u32::MAX {\n                continue;\n            }\n            let prime = ctx.base[idx].prime;\n            let residue = fastmod(position, prime, ctx.pinv[idx]);\n            if residue == first || residue == root2[idx] {\n                overflow |= !push_factor(counts, factors, candidate_index, idx as u32);\n            }\n        }\n    }",next="    // Per-candidate factor indices stay ascending; overflow never short-circuits.\n    for idx in small_end..sparse_start {\n        let first = root1[idx];\n        if first == u32::MAX {\n            continue;\n        }\n        let prime = ctx.base[idx].prime;\n        let second = root2[idx];\n        let inverse = ctx.pinv[idx];\n        for (candidate_index, &position) in candidates.iter().enumerate() {\n            let residue = fastmod(position, prime, inverse);\n            if residue == first || residue == second {\n                overflow |= !push_factor(counts, factors, candidate_index, idx as u32);\n            }\n        }\n    }";
 assert.equal(e.split(old).length,2,'Exact prefix loop');
 e=e.replace(old,next);
 if(options.probe){
  e+='\n#[allow(clippy::too_many_arguments,unsafe_code)]\n'+score.replace('fn score_polynomial','fn score_polynomial_reference');
  e+='\n#[allow(clippy::too_many_arguments)]\n'+reference.replace('fn resieve_candidate_factors','fn resieve_candidate_factors_reference');
  e+='\n'+options.probe;
 }
 files['src/src/engine.rs']=Buffer.from(e);return files;
}

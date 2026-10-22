// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';
import {patchSource as longPatch} from '../long-window/patch-source.mjs';
const rep=(s,a,b)=>{assert.equal(s.split(a).length,2,'Hotpath anchor '+a.slice(0,100));return s.replace(a,b);};
export function functionSource(s,name){
 const start=s.indexOf('fn '+name);assert.ok(start>=0);const begin=s.indexOf('{',start);let depth=1,end=begin+1;
 for(;end<s.length&&depth;end++){if(s[end]==='{')depth++;else if(s[end]==='}')depth--;}
 assert.equal(depth,0);return s.slice(start,end);
}
export function patchSource(files,observer,options){
 longPatch(files,observer,options);
 let e=files['src/src/engine.rs'].toString();
 const references={score:functionSource(e,'score_polynomial'),resieve:functionSource(e,'resieve_candidate_factors')};
 if(options.hotpath==='resieve4')e=rep(e,'((2 * scores.len()) / candidates.len().max(1))','((4 * scores.len()) / candidates.len().max(1))');
 else if(options.hotpath==='sparse'){
  const a=e.indexOf('        let sentinel = score_len + (idx & (SCORE_SENTINELS - 1));');
  const b=e.indexOf('\n    }\n}',a);assert.ok(a>0&&b>a);
  e=e.slice(0,a)+`        // Skip out-of-interval roots; sentinel bytes are never scanned.
        // SAFETY: each write is guarded by its active interval bound.
        if r1 < score_len {
            unsafe { add_score::<SATURATING>(&mut *pointer.add(r1), weight); }
        }
        if r2 != r1 && r2 < score_len {
            unsafe { add_score::<SATURATING>(&mut *pointer.add(r2), weight); }
        }`+e.slice(b);
 }else throw Error('Named finite hotpath candidate');
 if(options.probe){
  e+='\n#[allow(clippy::too_many_arguments,unsafe_code)]\n'+references.score.replace('fn score_polynomial','fn score_polynomial_reference');
  e+='\n#[allow(clippy::too_many_arguments)]\n'+references.resieve.replace('fn resieve_candidate_factors','fn resieve_candidate_factors_reference');
  e+='\n'+options.probe;
 }
 files['src/src/engine.rs']=Buffer.from(e);
 return files;
}

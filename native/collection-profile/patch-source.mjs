// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';
import {patchSource as longPatch} from '../long-window/patch-source.mjs';
const rep=(s,a,b)=>{assert.equal(s.split(a).length,2,'Collection anchor '+a.slice(0,100));return s.replace(a,b);};
function enterFunction(s,name,tag){
 const re=new RegExp('(\\bfn '+name+'\\([\\s\\S]*?\\)\\s*(?:->[^\\{]+)?\\{)');
 const matches=[...s.matchAll(new RegExp(re.source,'g'))];assert.equal(matches.length,1,'Unique function '+name);
 return s.replace(re,'$1\n    let _collection_scope=crate::collection_profile::scope('+tag+');');
}
export function patchSource(files,observer,options){
 longPatch(files,observer,options);
 files['src/src/collection_profile.rs']=Buffer.from(options.collectionTiming);
 let lib=files['src/src/lib.rs'].toString();
 lib+='\n#[allow(unsafe_code)]\nmod collection_profile;\n';files['src/src/lib.rs']=Buffer.from(lib);
 let e=files['src/src/engine.rs'].toString();
 e=enterFunction(e,'prepare',0);e=enterFunction(e,'resieve_candidate_factors',8);e=enterFunction(e,'classify_cofactor',10);
 e=rep(e,'    let base = &ctx.base;\n    let len = (ctx.interval as usize) * 2;','    let collection_coeff=crate::collection_profile::scope(4);\n    let base = &ctx.base;\n    let len = (ctx.interval as usize) * 2;');
 e=rep(e,'    let (bias, scan_threshold, exact_scores) = score_plan(ctx, a);','    drop(collection_coeff);\n    let collection_fill=crate::collection_profile::scope(5);\n    let (bias, scan_threshold, exact_scores) = score_plan(ctx, a);');
 e=rep(e,'    let score_started = ctx.profile.then(std::time::Instant::now);','    drop(collection_fill);\n    let collection_score=crate::collection_profile::scope(6);\n    let score_started = ctx.profile.then(std::time::Instant::now);');
 e=rep(e,'    collect_candidates(&scores[..len], scan_threshold, candidates);','    drop(collection_score);\n    {let _collection_scan=crate::collection_profile::scope(7);collect_candidates(&scores[..len], scan_threshold, candidates);}');
 e=rep(e,'    let two_idx = base.iter().position(|e| e.prime == 2).map(|i| i as u32);','    let collection_trial=crate::collection_profile::scope(9);\n    let two_idx = base.iter().position(|e| e.prime == 2).map(|i| i as u32);');
 e=rep(e,'        let mut root = t.div_rem(&ctx.n).unwrap().1;','        let _collection_relation=crate::collection_profile::scope(11);\n        let mut root = t.div_rem(&ctx.n).unwrap().1;');
 e=rep(e,'    if let Some(started) = factor_started {','    drop(collection_trial);\n    if let Some(started) = factor_started {');
 files['src/src/engine.rs']=Buffer.from(e);
 let p=files['src/src/engine/siqs.rs'].toString();
 p=rep(p,'    let Some((a, aidx)) = choose_a(ctx, family) else {','    let collection_choice={let _collection_a=crate::collection_profile::scope(1);choose_a(ctx,family)};\n    let Some((a, aidx)) = collection_choice else {');
 p=rep(p,'    let base = &ctx.base;\n    let nfb = base.len();','    let collection_crt=crate::collection_profile::scope(2);\n    let base = &ctx.base;\n    let nfb = base.len();');
 p=rep(p,'    scratch.root1.clear();','    drop(collection_crt);\n    let collection_roots=crate::collection_profile::scope(3);\n    scratch.root1.clear();');
 p=rep(p,'    // Sieve every polynomial in Gray-code order, advancing the roots in O(1) per','    drop(collection_roots);\n    // Sieve every polynomial in Gray-code order, advancing the roots in O(1) per');
 p=rep(p,'        let j = (v + 1).trailing_zeros() as usize;','        let collection_gray=crate::collection_profile::scope(12);\n        let j = (v + 1).trailing_zeros() as usize;');
 p=rep(p,'        let off = j * nfb;','        let off = j * nfb;\n        drop(collection_gray);');
 files['src/src/engine/siqs.rs']=Buffer.from(p);
 let r=files['src/src/engine/root_wasm.rs'].toString();r=enterFunction(r,'advance_add',13);r=enterFunction(r,'advance_sub',13);files['src/src/engine/root_wasm.rs']=Buffer.from(r);
 let w=files['src/src/engine/wire.rs'].toString();w=enterFunction(w,'to_bytes',14);files['src/src/engine/wire.rs']=Buffer.from(w);
 let wasm=files['src/src/wasm.rs'].toString();wasm=enterFunction(wasm,'qs_coord_submit',15);
 wasm=rep(wasm,'            let bytes = engine::execute(ctx, job).to_bytes();','            let result=engine::execute(ctx,job);\n            let _collection_packet=crate::collection_profile::scope(14);\n            let bytes=result.to_bytes();');
 wasm=rep(wasm,'        packet(10, &payload)','        let _collection_outer_packet=crate::collection_profile::scope(14);\n        packet(10, &payload)');
 files['src/src/wasm.rs']=Buffer.from(wasm);
}

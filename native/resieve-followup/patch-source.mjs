// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';
import {patchSource as longPatch} from '../long-window/patch-source.mjs';
import {functionSource} from '../collection-hotpath/patch-source.mjs';
const rep=(s,a,b)=>{assert.equal(s.split(a).length,2,'Resieve followup anchor '+a.slice(0,90));return s.replace(a,b);};
export function patchSource(files,observer,options){
 longPatch(files,observer,options);
 let e=files['src/src/engine.rs'].toString();
 const reference=functionSource(e,'resieve_candidate_factors'),score=functionSource(e,'score_polynomial');
 if(options.hotpath==='resieve1')e=rep(e,'((2 * scores.len()) / candidates.len().max(1))','(scores.len() / candidates.len().max(1))');
 else if(options.hotpath==='rank'){
  e=rep(e,'    candidate_bits: Vec<u64>,','    candidate_bits: Vec<u64>,\n    /// First report index plus one for each bitmap word; zero after cleanup.\n    candidate_word_start: Vec<u32>,');
  const signature='    candidate_bits: &mut Vec<u64>,';
  assert.equal(e.split(signature).length,3);e=e.replaceAll(signature,signature+'\n    candidate_word_start: &mut Vec<u32>,');
  e=rep(e,'            candidate_bits,','            candidate_bits,\n            candidate_word_start,');
  e=rep(e,'    for &position in candidates {\n        candidate_bits[position as usize >> 6] |= 1u64 << (position & 63);\n    }',`    if candidate_word_start.len() < bit_words { candidate_word_start.resize(bit_words,0); }
    for (index,&position) in candidates.iter().enumerate() {
        let word=position as usize >> 6;
        if candidate_word_start[word]==0 { candidate_word_start[word]=index as u32+1; }
        candidate_bits[word] |= 1u64 << (position & 63);
    }`);
  e=rep(e,`                    let candidate_index = candidates
                        .binary_search(&(position as u32))
                        .expect("candidate bit filter must be exact");`,`                    let word=position >> 6;
                    let lower=(1u64 << (position & 63))-1;
                    let candidate_index=(candidate_word_start[word]-1
                        +(candidate_bits[word]&lower).count_ones()) as usize;`);
  e=rep(e,'        candidate_bits[position as usize >> 6] &= !(1u64 << (position & 63));','        candidate_bits[position as usize >> 6] &= !(1u64 << (position & 63));\n        candidate_word_start[position as usize >> 6]=0;');
  let p=files['src/src/engine/siqs.rs'].toString();p=rep(p,'            &mut scratch.candidate_bits,','            &mut scratch.candidate_bits,\n            &mut scratch.candidate_word_start,');files['src/src/engine/siqs.rs']=Buffer.from(p);
 }else throw Error('Named finite resieve followup');
 if(options.probe){
  e+='\n#[allow(clippy::too_many_arguments,unsafe_code)]\n'+score.replace('fn score_polynomial','fn score_polynomial_reference');
  e+='\n#[allow(clippy::too_many_arguments)]\n'+reference.replace('fn resieve_candidate_factors','fn resieve_candidate_factors_reference');
  let probe=options.probe;
  if(options.hotpath==='rank'){
   probe=probe.replaceAll('let mut cc=Vec::new();','let mut starts=Vec::new();let mut cc=Vec::new();')
    .replaceAll('&mut nc,&mut nf,&mut nb)','&mut nc,&mut nf,&mut nb,&mut starts)')
    .replaceAll('assert!(cb.iter().all(|&x|x==0)&&nb.iter().all(|&x|x==0));','assert!(cb.iter().all(|&x|x==0)&&nb.iter().all(|&x|x==0)&&starts.iter().all(|&x|x==0));');
  }
  e+='\n'+probe;
 }
 files['src/src/engine.rs']=Buffer.from(e);return files;
}

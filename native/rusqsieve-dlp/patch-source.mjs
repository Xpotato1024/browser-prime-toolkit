// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Xpotato.net / Xpotato1024
import {patchSource as basePatch} from '../rusqsieve/patch-source.mjs';
export function patchSource(files,observer){
 basePatch(files,observer);
 const replace=(text,a,b)=>{if(text.split(a).length!==2)throw Error('DLP patch anchor count: '+a.slice(0,60));return text.replace(a,b);};
 let engine=files['src/src/engine.rs'].toString();
 const start=engine.indexOf('struct RelationCollector {'),end=engine.indexOf('fn inv_u32(',start);
 if(start<0||end<0)throw Error('Collector scope');let collector=engine.slice(start,end);
 collector=replace(collector,'    cycles: usize,','    cycles: usize,\n    codex_counts: [u64; 3],');
 collector=replace(collector,'            cycles: 0,','            cycles: 0,\n            codex_counts: [0; 3],');
 collector=replace(collector,'    fn ingest(&mut self, rel: Relation, n: &Natural) {','    fn ingest(&mut self, rel: Relation, n: &Natural) {\n        let slot = match &rel.large { LargePrime::None => 0, LargePrime::One(_) => 1, LargePrime::Two(_, _) => 2 };\n        self.codex_counts[slot] += 1;');
 engine=engine.slice(0,start)+collector+engine.slice(end);
 engine+=`
impl EngineContext {
    /// Actual immutable settings used by both native registries; signed offset stays signed.
    pub(crate) fn codex_dlp_config(&self, field: u32) -> i64 {
        let c = &self.0;
        match field {
            0 => c.n.bit_len() as i64,
            1 => crate::qs::parameters::engine_params(c.n.bit_len()).factor_base_bound as i64,
            2 => c.interval as i64,
            3 => c.single_limit as i64,
            4 => c.double_limit as i64,
            5 => c.lp_bits as i64,
            6 => c.thresh_adj as i64,
            7 => c.base.len() as i64,
            _ => -1,
        }
    }
}
impl EngineSession {
    /// Counters observe the original collector after native duplicate-A handling.
    pub(crate) fn codex_dlp_stat(&self, field: u32) -> i64 {
        let c = &self.collector;
        match field {
            0..=2 => c.codex_counts[field as usize] as i64,
            3 => c.cycles as i64,
            4 => c.forest.parent.len() as i64,
            5 => c.forest.relations.len() as i64,
            6 => c.columns.len() as i64,
            7 => c.codex_counts.iter().sum::<u64>() as i64,
            _ => -1,
        }
    }
}
`;
 files['src/src/engine.rs']=Buffer.from(engine);
 let wasm=files['src/src/wasm.rs'].toString();
 wasm+=`
fn codex_dlp_tuning(n: &WasmNatural, profile: u32) -> Option<crate::factor::FactorTuning> {
    if profile > 2 { return None; }
    let mut tuning = crate::factor::FactorTuning::default();
    if (321..=333).contains(&n.bit_len()) && profile != 0 {
        let bound = crate::qs::parameters::engine_params(n.bit_len()).factor_base_bound as u64;
        let multiplier = if profile == 1 { 512u64 } else { 256u64 };
        tuning.double_large_prime_bound = Some(bound.checked_mul(bound)?.checked_mul(multiplier)?);
    }
    Some(tuning)
}
#[unsafe(no_mangle)]
pub extern "C" fn codex_dlp_version() -> u32 { 1 }
#[unsafe(no_mangle)]
pub unsafe extern "C" fn codex_dlp_prepare(pointer: u32, length: u32, profile: u32) -> u32 {
    let Some(n) = parse_decimal(pointer, length) else { return 0; };
    let Some(tuning) = codex_dlp_tuning(&n, profile) else { return 0; };
    let Ok(ctx) = engine::prepare(n, &tuning) else { return 0; };
    WORKERS.with(|r| r.borrow_mut().insert(ctx))
}
#[unsafe(no_mangle)]
pub unsafe extern "C" fn codex_dlp_new(pointer: u32, length: u32, profile: u32) -> u32 {
    let Some(n) = parse_decimal(pointer, length) else { return 0; };
    let Some(tuning) = codex_dlp_tuning(&n, profile) else { return 0; };
    let Ok(ctx) = engine::prepare(n, &tuning) else { return 0; };
    COORDS.with(|r| r.borrow_mut().insert(EngineSession::new(ctx)))
}
#[unsafe(no_mangle)]
pub extern "C" fn codex_dlp_coord_config(session: u32, field: u32) -> i64 {
    COORDS.with(|r| r.borrow().get(session).map_or(-1, |s| s.codex_worker_context().codex_dlp_config(field)))
}
#[unsafe(no_mangle)]
pub extern "C" fn codex_dlp_worker_config(context: u32, field: u32) -> i64 {
    WORKERS.with(|r| r.borrow().get(context).map_or(-1, |c| c.codex_dlp_config(field)))
}
#[unsafe(no_mangle)]
pub extern "C" fn codex_dlp_stat(session: u32, field: u32) -> i64 {
    COORDS.with(|r| r.borrow().get(session).map_or(-1, |s| s.codex_dlp_stat(field)))
}
`;
 files['src/src/wasm.rs']=Buffer.from(wasm);return files;
}

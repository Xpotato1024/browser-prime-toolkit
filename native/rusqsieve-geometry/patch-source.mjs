// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Xpotato.net / Xpotato1024
import {patchSource as dlpPatch} from '../rusqsieve-dlp/patch-source.mjs';
export function patchSource(files,observer){
 dlpPatch(files,observer);
 const replace=(text,a,b)=>{if(text.split(a).length!==2)throw Error('Geometry patch anchor '+a.slice(0,60));return text.replace(a,b);};
 let engine=files['src/src/engine.rs'].toString();
 engine=replace(engine,'    interval: i32,','    interval: i32,\n    codex_geometry_bound: u32,');
 engine=replace(engine,'        interval: p.sieve_half_width as i32,','        interval: p.sieve_half_width as i32,\n        codex_geometry_bound: p.factor_base_bound,');
 engine=replace(engine,'1 => crate::qs::parameters::engine_params(c.n.bit_len()).factor_base_bound as i64,','1 => c.codex_geometry_bound as i64,');
 engine+=`
impl EngineContext {
    /// Bounded observation of the actual immutable A-selection context.
    pub(crate) fn codex_geometry_detail(&self, field: u32, family: u32) -> i64 {
        let c = &self.0;
        match field {
            0 => c.sieve_n.div_rem(&c.n).and_then(|x| x.0.to_u64()).unwrap_or(0) as i64,
            1 => c.use_q2 as i64,
            2 => c.target_a.bit_len() as i64,
            3 => c.a_factor_count as i64,
            4 => c.a_all.len() as i64,
            5 => c.a_pool.len() as i64,
            6 => (1usize << match c.n.bit_len() { ..=320 => (c.a_factor_count - 1).min(10), 321..=333 => (c.a_factor_count - 1).min(11), _ => (c.a_factor_count - 1).min(12) }) as i64,
            7 | 8 if family < 64 => {
                let Some((a, _)) = siqs::choose_a(c, family as u64) else { return -1; };
                if field == 7 { return a.bit_len() as i64; }
                a.checked_mul(&Natural::from_u64(1000))
                    .and_then(|x| x.div_rem(&c.target_a))
                    .and_then(|x| x.0.to_u64()).map_or(-1, |x| x as i64)
            }
            _ => -1,
        }
    }
}
`;
 files['src/src/engine.rs']=Buffer.from(engine);
 let wasm=files['src/src/wasm.rs'].toString();
 const start=wasm.indexOf('fn codex_dlp_tuning('),end=wasm.indexOf('#[unsafe(no_mangle)]',start);
 if(start<0||end<0)throw Error('Named tuning block');
 wasm=wasm.slice(0,start)+`fn codex_dlp_tuning(n: &WasmNatural, profile: u32) -> Option<crate::factor::FactorTuning> {
    let (bound, halfwidth) = match profile {
        0 => (3_250_000u32, 524_288u32),
        1 => (2_500_000u32, 524_288u32),
        2 => (3_250_000u32, 262_144u32),
        3 => (2_500_000u32, 262_144u32),
        _ => return None,
    };
    let mut tuning = crate::factor::FactorTuning::default();
    if (321..=333).contains(&n.bit_len()) {
        tuning.factor_base_bound = Some(bound);
        tuning.sieve_half_width = Some(halfwidth);
    }
    Some(tuning)
}
`+wasm.slice(end);
 wasm+=`
#[unsafe(no_mangle)]
pub extern "C" fn codex_geometry_worker_detail(context: u32, field: u32, family: u32) -> i64 {
    WORKERS.with(|r| r.borrow().get(context).map_or(-1, |c| c.codex_geometry_detail(field, family)))
}
#[unsafe(no_mangle)]
pub extern "C" fn codex_geometry_coord_detail(session: u32, field: u32, family: u32) -> i64 {
    COORDS.with(|r| r.borrow().get(session).map_or(-1, |s| s.codex_worker_context().codex_geometry_detail(field, family)))
}
`;
 files['src/src/wasm.rs']=Buffer.from(wasm);return files;
}

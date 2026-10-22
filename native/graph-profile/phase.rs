// SPDX-License-Identifier: AGPL-3.0-only
// Fixed unshared WASM phase telemetry; no growing event buffer or unsafe state.
use core::cell::Cell;
thread_local! {static PHASES: Cell<([[u32;4];16],usize)> = const {Cell::new(([[0;4];16],0))};}
pub(crate) fn reset() {PHASES.with(|s|s.set(([[0;4];16],0)));}
pub(crate) fn mark(tag:u32) {
    PHASES.with(|s|{
        let (mut rows,used)=s.get();
        if used<16 {
            rows[used]=[tag,crate::codex_observer::codex_mem_live(),crate::codex_observer::codex_mem_peak(),core::arch::wasm32::memory_size(0) as u32*65536];
            s.set((rows,used+1));
        }
    });
}
pub(crate) fn get(row:u32,field:u32)->u32 {
    PHASES.with(|s|{let(rows,used)=s.get();if (row as usize)<used && field<4 {rows[row as usize][field as usize]} else {0}})
}

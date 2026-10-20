// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Xpotato.net / Xpotato1024
// Single-thread, unshared wasm32 observer; requested allocation sizes exclude
// allocator metadata, fragmentation, stack and static data. No math changes.
use std::alloc::{GlobalAlloc, Layout, System};
struct Observer;
static mut LIVE: usize = 0;
static mut PEAK: usize = 0;
static mut FAILURES: usize = 0;
static mut LAST_FAILED: usize = 0;
unsafe fn record(pointer: *mut u8, size: usize) {
    if pointer.is_null() {
        unsafe { FAILURES += 1; LAST_FAILED = size; }
    } else {
        unsafe { LIVE += size; PEAK = PEAK.max(LIVE); }
    }
}
unsafe impl GlobalAlloc for Observer {
    unsafe fn alloc(&self, layout: Layout) -> *mut u8 {
        let p = unsafe { System.alloc(layout) };
        unsafe { record(p, layout.size()); }
        p
    }
    unsafe fn alloc_zeroed(&self, layout: Layout) -> *mut u8 {
        let p = unsafe { System.alloc_zeroed(layout) };
        unsafe { record(p, layout.size()); }
        p
    }
    unsafe fn dealloc(&self, p: *mut u8, layout: Layout) {
        unsafe { System.dealloc(p, layout); LIVE -= layout.size(); }
    }
    unsafe fn realloc(&self, p: *mut u8, layout: Layout, size: usize) -> *mut u8 {
        let next = unsafe { System.realloc(p, layout, size) };
        if !next.is_null() { unsafe { LIVE -= layout.size(); } }
        unsafe { record(next, size); }
        next
    }
}
#[global_allocator]
static ALLOCATOR: Observer = Observer;
/// Live requested heap bytes, excluding allocator and non-heap memory.
#[unsafe(no_mangle)]
pub extern "C" fn codex_mem_live() -> u32 { unsafe { LIVE as u32 } }
/// Peak requested heap bytes since startup or reset.
#[unsafe(no_mangle)]
pub extern "C" fn codex_mem_peak() -> u32 { unsafe { PEAK as u32 } }
/// Failed allocation/reallocation count; a trap without this remains unknown.
#[unsafe(no_mangle)]
pub extern "C" fn codex_mem_failures() -> u32 { unsafe { FAILURES as u32 } }
/// Most recent failed allocation's requested size.
#[unsafe(no_mangle)]
pub extern "C" fn codex_mem_last_failed() -> u32 { unsafe { LAST_FAILED as u32 } }
/// Reset peak to current live size, preserving live and failure accounting.
#[unsafe(no_mangle)]
pub extern "C" fn codex_mem_reset_peak() { unsafe { PEAK = LIVE; } }

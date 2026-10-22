// SPDX-License-Identifier: AGPL-3.0-only
// Diagnostic-only, unshared wasm32. The sole clock import must not reenter Wasm.
use core::cell::RefCell;
#[link(wasm_import_module = "codex_collection")]
unsafe extern "C" { fn now_ms() -> f64; }
const TAGS:usize=16;
const DEPTH:usize=16;
const CALLS:u32=2_000_000;
#[derive(Clone,Copy)]
struct Frame { tag:usize, token:u32, start:f64, children:f64 }
const EMPTY:Frame=Frame{tag:0,token:0,start:0.0,children:0.0};
struct Stats {
    inclusive:[f64;TAGS], exclusive:[f64;TAGS], count:[u32;TAGS],
    stack:[Frame;DEPTH], depth:usize, max_depth:usize, token:u32,
    calls:u32, limit:u32, errors:u32, last:f64, min_step:f64,
}
impl Stats {const fn new()->Self {Self{inclusive:[0.0;TAGS],exclusive:[0.0;TAGS],count:[0;TAGS],
    stack:[EMPTY;DEPTH],depth:0,max_depth:0,token:0,calls:0,limit:CALLS,errors:0,last:0.0,min_step:f64::INFINITY}}}
thread_local! {static STATS:RefCell<Stats>=const {RefCell::new(Stats::new())};}
fn clock()->Option<f64> {
    let permitted=STATS.with(|s|{let mut s=s.borrow_mut();if s.errors!=0{return false;}
        if s.calls>=s.limit{s.errors=1;return false;}s.calls+=1;true});
    if !permitted{return None;}
    // SAFETY: fixed diagnostic import, no pointers or shared state cross the boundary.
    let now=unsafe{now_ms()};
    STATS.with(|s|{let mut s=s.borrow_mut();
        if !now.is_finite()||now<0.0||now>1_000_000_000.0||now<s.last {s.errors=1;return None;}
        let step=now-s.last;if s.calls>1&&step>0.0{s.min_step=s.min_step.min(step);}s.last=now;Some(now)})
}
pub(crate) struct Scope {token:u32}
pub(crate) fn scope(tag:usize)->Scope {
    if tag>=TAGS {STATS.with(|s|s.borrow_mut().errors=1);return Scope{token:0};}
    let Some(now)=clock() else{return Scope{token:0};};
    STATS.with(|s|{let mut s=s.borrow_mut();if s.depth>=DEPTH{s.errors=1;return Scope{token:0};}
        s.token+=1;let token=s.token;let at=s.depth;s.stack[at]=Frame{tag,token,start:now,children:0.0};s.depth+=1;s.max_depth=s.max_depth.max(s.depth);Scope{token}})
}
impl Drop for Scope {
    fn drop(&mut self) {
        if self.token==0{return;}let Some(now)=clock() else{return;};
        STATS.with(|s|{let mut s=s.borrow_mut();
            if s.depth==0||s.stack[s.depth-1].token!=self.token{s.errors=1;return;}
            s.depth-=1;let f=s.stack[s.depth];let elapsed=now-f.start;let exclusive=elapsed-f.children;
            if !elapsed.is_finite()||elapsed<0.0||exclusive < -0.001{s.errors=1;return;}
            s.inclusive[f.tag]+=elapsed;s.exclusive[f.tag]+=exclusive.max(0.0);s.count[f.tag]+=1;
            if s.depth>0 {let parent=s.depth-1;s.stack[parent].children+=elapsed;}
        });
    }
}
#[unsafe(no_mangle)]
pub extern "C" fn codex_collection_reset()->u32 {STATS.with(|s|{let mut s=s.borrow_mut();if s.depth!=0{return 0;}*s=Stats::new();1})}
#[unsafe(no_mangle)]
pub extern "C" fn codex_collection_field(tag:u32,field:u32)->f64 {
    STATS.with(|s|{let s=s.borrow();let i=tag as usize;if i>=TAGS{return f64::NAN;}
        match field{0=>s.inclusive[i],1=>s.exclusive[i],2=>s.count[i] as f64,_=>f64::NAN}})
}
#[unsafe(no_mangle)]
pub extern "C" fn codex_collection_status(field:u32)->f64 {
    STATS.with(|s|{let s=s.borrow();match field{0=>s.errors as f64,1=>s.depth as f64,2=>s.calls as f64,
        3=>s.max_depth as f64,4=>if s.min_step.is_finite(){s.min_step}else{0.0},5=>s.limit as f64,_=>f64::NAN}})
}
#[unsafe(no_mangle)]
pub extern "C" fn codex_collection_lower_calls(limit:u32)->u32 {
    STATS.with(|s|{let mut s=s.borrow_mut();if s.depth!=0||limit==0||limit>s.limit{return 0;}s.limit=limit;1})
}
fn early_scope()->u32 {let _outer=scope(0);let _inner=scope(1);7}
#[unsafe(no_mangle)]
pub extern "C" fn codex_collection_probe(kind:u32)->u32 {
    match kind{0=>{let outer=scope(0);{let _inner=scope(1);}drop(outer);1},1=>early_scope(),_=>0}
}

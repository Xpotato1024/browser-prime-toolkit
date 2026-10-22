// SPDX-License-Identifier: AGPL-3.0-only
// Unshared wasm32 only. This guard never allocates or panics.
const BASE_LIVE_LIMIT:usize = __LIVE_LIMIT__;
const BASE_LINEAR_LIMIT:usize = __LINEAR_LIMIT__;
static mut LA_ACTIVE:bool=false;
static mut LA_LIVE_LIMIT:usize=BASE_LIVE_LIMIT;
static mut LA_LINEAR_LIMIT:usize=BASE_LINEAR_LIMIT;
static mut LA_REFUSALS:u32=0;
static mut LA_LAST_KIND:u32=0;
static mut LA_LAST_REQUEST:usize=0;
static mut LA_PREFLIGHT_REFUSED:bool=false;
static mut LA_ROWS:[[u32;12];24]=[[0;12];24];
static mut LA_COUNT:usize=0;
pub(crate) struct LaScope;
impl Drop for LaScope {fn drop(&mut self){unsafe{LA_ACTIVE=false;}}}
pub(crate) fn la_scope()->LaScope {
    unsafe{LA_ACTIVE=true;LA_REFUSALS=0;LA_LAST_KIND=0;LA_LAST_REQUEST=0;LA_PREFLIGHT_REFUSED=false;LA_COUNT=0;}
    la_mark(0,0,0,0);
    LaScope
}
pub(crate) fn la_mark(stage:u32,rows:usize,cols:usize,nnz:usize) {
    unsafe{
        if !LA_ACTIVE||LA_COUNT>=24{return;}
        LA_ROWS[LA_COUNT]=[stage,rows as u32,cols as u32,nnz as u32,LIVE as u32,PEAK as u32,
            (core::arch::wasm32::memory_size::<0>()*65536) as u32,LA_LIVE_LIMIT as u32,LA_LINEAR_LIMIT as u32,
            LA_REFUSALS,LA_LAST_KIND,LA_LAST_REQUEST as u32];
        LA_COUNT+=1;
    }
}
pub(crate) fn la_preflight(rows:usize,cols:usize,entries:usize)->bool {
    let bytes=entries.checked_mul(8).and_then(|n|rows.checked_add(cols).and_then(|d|d.checked_add(2)).and_then(|d|d.checked_mul(4)).and_then(|d|n.checked_add(d)));
    let allowed=unsafe{bytes.and_then(|n|LIVE.checked_add(n)).is_some_and(|n|n<=LA_LIVE_LIMIT)};
    la_mark(1,rows,cols,entries);
    if !allowed {unsafe{LA_PREFLIGHT_REFUSED=true;}la_mark(98,rows,cols,entries);}
    allowed
}
fn la_permit(size:usize,kind:u32)->bool {
    unsafe{
        if !LA_ACTIVE{return true;}
        let live=LIVE.checked_add(size).is_some_and(|n|n<=LA_LIVE_LIMIT);
        let linear=core::arch::wasm32::memory_size::<0>().checked_mul(65536)
            .and_then(|n|n.checked_add(size)).and_then(|n|n.checked_add(65536)).is_some_and(|n|n<=LA_LINEAR_LIMIT);
        if live&&linear{return true;}
        LA_REFUSALS=LA_REFUSALS.saturating_add(1);LA_LAST_KIND=kind;LA_LAST_REQUEST=size;
        record(core::ptr::null_mut(),size);
        la_mark(99,0,0,0);
        false
    }
}
#[unsafe(no_mangle)]
pub extern "C" fn codex_la_refusals()->u32 {unsafe{LA_REFUSALS}}
#[unsafe(no_mangle)]
pub extern "C" fn codex_la_active()->u32 {unsafe{LA_ACTIVE as u32}}
#[unsafe(no_mangle)]
pub extern "C" fn codex_la_preflight_refused()->u32 {unsafe{LA_PREFLIGHT_REFUSED as u32}}
#[unsafe(no_mangle)]
pub extern "C" fn codex_la_count()->u32 {unsafe{LA_COUNT as u32}}
#[unsafe(no_mangle)]
pub extern "C" fn codex_la_field(row:u32,field:u32)->u32 {
    if row>=24||field>=12{return 0;}unsafe{LA_ROWS[row as usize][field as usize]}
}
#[unsafe(no_mangle)]
pub extern "C" fn codex_la_lower_limits(live:u32,linear:u32)->u32 {
    unsafe{
        if LA_ACTIVE||live==0||live as usize>LA_LIVE_LIMIT||linear<65536||linear as usize>LA_LINEAR_LIMIT{return 0;}
        LA_LIVE_LIMIT=live as usize;LA_LINEAR_LIMIT=linear as usize;1
    }
}
/// Fixed tiny probes, never a free-memory search. Reallocation denial preserves old bytes.
#[unsafe(no_mangle)]
pub extern "C" fn codex_la_probe(kind:u32)->u32 {
    if !(1..=4).contains(&kind){return 0;}
    unsafe{
        if LA_ACTIVE{return 0;}
        let before=LIVE;
        let old_layout=Layout::from_size_align(64,8).unwrap();
        let mut old=std::alloc::alloc(old_layout);
        if old.is_null(){return 0;}
        old.write(0x5a);old.add(63).write(0xa5);
        let saved_live=LA_LIVE_LIMIT;let saved_linear=LA_LINEAR_LIMIT;
        LA_LIVE_LIMIT=LIVE;LA_ACTIVE=true;LA_REFUSALS=0;LA_LAST_KIND=0;LA_COUNT=0;
        let p=match kind {
            1=>std::alloc::alloc(Layout::from_size_align(16,8).unwrap()),
            2=>std::alloc::alloc_zeroed(Layout::from_size_align(16,8).unwrap()),
            3=>std::alloc::realloc(old,old_layout,128),
            _=>{let refused=!la_permit(usize::MAX,4);if !refused{LA_ACTIVE=false;}core::ptr::null_mut()},
        };
        LA_ACTIVE=false;LA_LIVE_LIMIT=saved_live;LA_LINEAR_LIMIT=saved_linear;
        let refused=p.is_null()&&LA_REFUSALS==1&&LIVE==before+64&&old.read()==0x5a&&old.add(63).read()==0xa5;
        if !p.is_null(){
            if kind==3 {old=core::ptr::null_mut();std::alloc::dealloc(p,Layout::from_size_align(128,8).unwrap());}
            else {std::alloc::dealloc(p,Layout::from_size_align(16,8).unwrap());}
        }
        if !old.is_null(){std::alloc::dealloc(old,old_layout);}
        (refused&&LIVE==before) as u32
    }
}
/// Test-only 64-byte abort path; the owner must retire this instance after a trap.
#[unsafe(no_mangle)]
pub extern "C" fn codex_la_abort_probe()->u32 {
    unsafe{LA_LIVE_LIMIT=1;LA_ACTIVE=true;LA_REFUSALS=0;LA_LAST_KIND=0;LA_COUNT=0;}
    let layout=Layout::from_size_align(64,8).unwrap();
    let p=unsafe{std::alloc::alloc(layout)};
    if p.is_null(){std::alloc::handle_alloc_error(layout);}
    unsafe{LA_ACTIVE=false;std::alloc::dealloc(p,layout);}0
}

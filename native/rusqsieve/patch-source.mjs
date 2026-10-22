// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Xpotato.net / Xpotato1024
export function patchSource(files,observer){
 const text=p=>files[p].toString();
 let lib=text('src/src/lib.rs');lib+='\n#[allow(unsafe_code)]\nmod codex_observer;\n';files['src/src/lib.rs']=Buffer.from(lib);files['src/src/codex_observer.rs']=observer;
 let wasm=text('src/src/wasm.rs'),start=wasm.indexOf('pub extern "C" fn qs_coord_extract('),end=wasm.indexOf('\n#[unsafe(no_mangle)]',start+1);
 if(start<0||end<0)throw Error('Missing extraction block');let block=wasm.slice(start,end);
 const replace=(a,b)=>{if(block.split(a).length!==2)throw Error('Patch anchor count');block=block.replace(a,b);};
 replace('    COORDS.with(|r| {','    CODEX_EXTRACT.with(|s| s.set(9));\n    COORDS.with(|r| {');
 replace('            Ok(d) => {','            Ok(d) => {\n                CODEX_EXTRACT.with(|s| s.set(1));');
 replace('            Err(_) => 0,',`            Err(error) => {
                let status = match error {
                    engine::EngineError::InsufficientRelations => 2,
                    engine::EngineError::NoDependency => 3,
                    engine::EngineError::NoFactor => 4,
                    engine::EngineError::ResourceLimit => 5,
                    engine::EngineError::InvalidDependency => 6,
                    engine::EngineError::Cancelled => 7,
                    _ => 8,
                };
                CODEX_EXTRACT.with(|s| s.set(status)); 0
            },`);
 wasm=wasm.slice(0,start)+block+wasm.slice(end);
 wasm+='\nthread_local! {static CODEX_EXTRACT: std::cell::Cell<u32> = const {std::cell::Cell::new(0)};}\n/// Last extraction result: 1 success; 2/3/4 finite retry; 5 resource; 6 invalid; 7 cancelled; 8 other; 9 missing.\n#[unsafe(no_mangle)]\npub extern "C" fn codex_extract_status() -> u32 {CODEX_EXTRACT.with(|s|s.get())}\n';
 let engine=text('src/src/engine.rs');const anchor='impl EngineSession {';if(engine.split(anchor).length!==2)throw Error('Session accessor anchor');
 engine=engine.replace(anchor,anchor+'\n    /// Shared immutable context for the same-WASM local worker.\n    pub(crate) fn codex_worker_context(&self) -> EngineContext { self.context.clone() }\n    /// Exact factor-base length for strict host framing.\n    pub(crate) fn codex_factorbase_len(&self) -> usize { self.context.0.base.len() }\n');
 files['src/src/engine.rs']=Buffer.from(engine);
 wasm+=`
/// Clone the coordinator context into the local-worker registry; no new owner or mutable scratch.
#[unsafe(no_mangle)]
pub extern "C" fn codex_coord_worker(session: u32) -> u32 {
    let context = COORDS.with(|r| r.borrow().get(session).map(|s| s.codex_worker_context()));
    match context { Some(c) => WORKERS.with(|r| r.borrow_mut().insert(c)), None => 0 }
}
/// Exact factor-base size, separate from the relation target.
#[unsafe(no_mangle)]
pub extern "C" fn codex_coord_fb_len(session: u32) -> u32 {
    COORDS.with(|r| r.borrow().get(session).map_or(0, |s| s.codex_factorbase_len() as u32))
}
`;
 files['src/src/wasm.rs']=Buffer.from(wasm);return files;
}

// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';
import {patchSource as varintPatch} from '../graph-varint/patch-source.mjs';
export function patchSource(files,observer,options){
 const rep=(s,a,b)=>{assert.equal(s.split(a).length,2,'LP map anchor '+a.slice(0,100));return s.replace(a,b);};
 const profile=rep(options.engineProfile,'(f.id_of.capacity() * core::mem::size_of::<(u64,u32)>()) as u64','f.id_of.key_value_bytes() as u64');
 varintPatch(files,observer,{...options,engineProfile:profile});
 let s=files['src/src/engine.rs'].toString();
 s=rep(s,'type PrimeMap = HashMap<u64, u32, BuildHasherDefault<PrimeHasher>>;',options.lpMap);
 s=rep(s,'    fn write_u64(&mut self, value: u64) {','    fn write_u32(&mut self, value: u32) { self.write_u64(u64::from(value)); }\n    fn write_u64(&mut self, value: u64) {');
 files['src/src/engine.rs']=Buffer.from(s);
 files['src/src/wasm.rs']=Buffer.from(files['src/src/wasm.rs'].toString()+`
#[unsafe(no_mangle)]
pub extern "C" fn codex_lpmap_selftest()->u32 {engine::codex_lpmap_selftest() as u32}
#[unsafe(no_mangle)]
pub extern "C" fn codex_lpmap_field(session:u32,field:u32)->u32 {
    COORDS.with(|r| r.borrow().get(session).map_or(0,|s|s.codex_lpmap_field(field)))
}
`);
 return files;
}

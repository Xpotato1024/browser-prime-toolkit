// SPDX-License-Identifier: AGPL-3.0-only
import assert from'node:assert/strict';
import{patchSource as releasePatch}from'../graph-release/patch-source.mjs';
export function patchSource(files,observer,options){
 const rep=(s,a,b)=>{assert.equal(s.split(a).length,2,'Packed profile anchor '+a);return s.replace(a,b);};
 let p=options.engineProfile;
 p=rep(p,'        let mut root_bytes = 0usize;','        let mut root_bytes = 0usize;\n        let mut payload_bytes = 0usize;');
 p=rep(p,'            power_len += r.powers.len();','            power_len += r.power_len();\n            payload_bytes += r.bytes.len();');
 p=rep(p,'            power_capacity += r.powers.capacity();','            power_capacity += 0;');
 p=rep(p,'            ((f.reroot_vertices.capacity()+f.reroot_edges.capacity()+self.collector.cycle_path.capacity())*4) as u64,','            ((f.reroot_vertices.capacity()+f.reroot_edges.capacity()+self.collector.cycle_path.capacity())*4) as u64,\n            payload_bytes as u64,');
 return releasePatch(files,observer,{...options,engineProfile:p,compactRoot:options.packedRelation});
}

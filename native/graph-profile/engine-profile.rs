// SPDX-License-Identifier: AGPL-3.0-only
// Single-thread WASM diagnostic snapshots; capacity estimates are not allocator totals.
impl EngineSession {
    pub(crate) fn codex_graph_profile(&self) -> Vec<u64> {
        let f = &self.collector.forest;
        let mut power_len = 0usize;
        let mut power_capacity = 0usize;
        let mut root_bytes = 0usize;
        for r in &f.relations {
            power_len += r.powers.len();
            power_capacity += r.powers.capacity();
            root_bytes += codex_retained_root_bytes(r);
        }
        let columns = &self.collector.columns;
        let column_powers = columns.iter().map(|c| c.powers.capacity() * core::mem::size_of::<(u32,u32)>()).sum::<usize>();
        let column_extra = columns.iter().map(|c| c.extra_sqrt.capacity() * 8).sum::<usize>();
        vec![
            core::mem::size_of::<CodexRetainedRelation>() as u64,
            f.relations.len() as u64, f.relations.capacity() as u64,
            power_len as u64, power_capacity as u64, root_bytes as u64,
            (f.parent.capacity() * 4) as u64,
            (f.edge.capacity() * core::mem::size_of::<Option<u32>>()) as u64,
            (f.size.capacity() * 4) as u64,
            f.id_of.len() as u64, f.id_of.capacity() as u64,
            (f.id_of.capacity() * core::mem::size_of::<(u64,u32)>()) as u64,
            (columns.capacity() * core::mem::size_of::<Column>()) as u64,
            column_powers as u64, column_extra as u64,
            (self.seen_a.capacity() * core::mem::size_of::<Natural>()) as u64,
            self.buffered.len() as u64,
            ((f.reroot_vertices.capacity()+f.reroot_edges.capacity()+self.collector.cycle_path.capacity())*4) as u64,
        ]
    }
    pub(crate) fn codex_graph_columns(&self) -> Vec<u8> {
        let mut out = Vec::new();
        out.extend_from_slice(&(self.collector.columns.len() as u32).to_le_bytes());
        for c in &self.collector.columns {
            let mut root = [0u8; PARTS * 8];
            let n = c.root.write_le_bytes(&mut root).unwrap();
            out.extend_from_slice(&(n as u16).to_le_bytes());
            out.extend_from_slice(&root[..n]);
            out.push(c.sign as u8);
            out.extend_from_slice(&(c.powers.len() as u32).to_le_bytes());
            for &(i,e) in &c.powers {
                out.extend_from_slice(&i.to_le_bytes());
                out.extend_from_slice(&e.to_le_bytes());
            }
            out.extend_from_slice(&(c.extra_sqrt.len() as u32).to_le_bytes());
            for p in &c.extra_sqrt { out.extend_from_slice(&p.to_le_bytes()); }
        }
        out
    }
}

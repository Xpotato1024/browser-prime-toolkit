// SPDX-License-Identifier: AGPL-3.0-only
impl EngineSession {
    pub(crate) fn codex_graph_terminal(&self)->bool {self.codex_extraction_attempted}
    pub(crate) fn codex_graph_extract_once(&mut self)->Result<Natural,EngineError> {
        // The WASM boundary rejects a repeated call with explicit status 10.
        if self.codex_extraction_attempted {return Err(EngineError::Cancelled);}
        crate::codex_graph_phase::reset();
        crate::codex_graph_phase::mark(10);
        let ready=self.is_ready();
        self.codex_final_stats=Some(core::array::from_fn(|i|self.codex_dlp_stat(i as u32)));
        self.codex_extraction_attempted=true;
        self.collector.forest=Forest::default();
        self.collector.cycle_path=Vec::new();
        self.buffered=BTreeMap::new();
        self.seen_a=HashSet::new();
        crate::codex_graph_phase::mark(11);
        if !ready {return Err(EngineError::InsufficientRelations);}
        extract::extract(&self.context.0,&self.collector.columns)
    }
}

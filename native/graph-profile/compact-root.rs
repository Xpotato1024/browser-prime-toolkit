// SPDX-License-Identifier: AGPL-3.0-only
// Lossless retained representation only. Arithmetic continues to use upstream Natural.
struct CodexRetainedRelation {
    root: Box<[u8]>,
    sign: bool,
    powers: Vec<(u32,u16)>,
    large: LargePrime,
}
impl CodexRetainedRelation {
    fn retain(r: Relation) -> Self {
        let mut bytes = [0u8; PARTS * 8];
        let n = r.root.write_le_bytes(&mut bytes).unwrap();
        Self {root: bytes[..n].into(), sign:r.sign, powers:r.powers, large:r.large}
    }
    fn restore(&self) -> Relation {
        Relation {root:Natural::from_le_bytes(&self.root).unwrap(),sign:self.sign,powers:self.powers.clone(),large:self.large}
    }
}
fn codex_retained_root_bytes(r: &CodexRetainedRelation) -> usize { r.root.len() }
pub(crate) fn codex_graph_roundtrip() -> bool {
    for width in [0usize,1,42,64,128] {
        let bytes = vec![255u8; width];
        let root = Natural::from_le_bytes(&bytes).unwrap();
        for large in [LargePrime::None,LargePrime::One(2),LargePrime::Two(3,u64::MAX)] {
            let original = Relation {root:root.clone(),sign:width%2==1,powers:vec![(0,1),(u32::MAX,u16::MAX)],large};
            let stored = CodexRetainedRelation::retain(original.clone());
            let restored = stored.restore();
            if restored.root != original.root || restored.sign != original.sign || restored.powers != original.powers {
                return false;
            }
            if restored.large.primes() != original.large.primes() { return false; }
        }
    }
    true
}

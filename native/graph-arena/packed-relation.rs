// SPDX-License-Identifier: AGPL-3.0-only
// One exact packed allocation per retained tree edge. This is storage, not new arithmetic.
struct CodexRetainedRelation { bytes: Box<[u8]> }
impl CodexRetainedRelation {
    fn retain(r: Relation) -> Self {
        let mut root=[0u8;PARTS*8];
        let n=r.root.write_le_bytes(&mut root).unwrap();
        let (_,lp_count)=r.large.primes();
        let mut out=Vec::with_capacity(2+n+2+lp_count*8+4+r.powers.len()*6);
        out.extend_from_slice(&(n as u16).to_le_bytes());
        out.extend_from_slice(&root[..n]);
        out.push(r.sign as u8);
        match r.large {
            LargePrime::None=>out.push(0),
            LargePrime::One(p)=>{out.push(1);out.extend_from_slice(&p.to_le_bytes());}
            LargePrime::Two(a,b)=>{out.push(2);out.extend_from_slice(&a.to_le_bytes());out.extend_from_slice(&b.to_le_bytes());}
        }
        out.extend_from_slice(&(r.powers.len() as u32).to_le_bytes());
        for (i,e) in r.powers {out.extend_from_slice(&i.to_le_bytes());out.extend_from_slice(&e.to_le_bytes());}
        Self {bytes:out.into_boxed_slice()}
    }
    fn restore(&self) -> Relation {
        // Reuse upstream's checked decoder, retaining its exact exponent and LP semantics.
        let mut family=Vec::with_capacity(20+self.bytes.len());
        family.extend_from_slice(&[0u8;16]);
        family.extend_from_slice(&1u32.to_le_bytes());
        family.extend_from_slice(&self.bytes);
        wire::deserialize_family(&family).unwrap().relations.pop().unwrap()
    }
    fn power_len(&self)->usize {
        let root=codex_retained_root_bytes(self);
        let tag=self.bytes[3+root] as usize;
        let p=4+root+tag*8;
        u32::from_le_bytes(self.bytes[p..p+4].try_into().unwrap()) as usize
    }
}
fn codex_retained_root_bytes(r:&CodexRetainedRelation)->usize {
    u16::from_le_bytes(r.bytes[..2].try_into().unwrap()) as usize
}
pub(crate) fn codex_graph_roundtrip()->bool {
    for width in [0usize,1,42,64,128] {
        let root=Natural::from_le_bytes(&vec![255u8;width]).unwrap();
        for large in [LargePrime::None,LargePrime::One(2),LargePrime::Two(3,u64::MAX)] {
            let original=Relation {root:root.clone(),sign:width%2==1,powers:vec![(0,1),(u32::MAX,u16::MAX)],large};
            let stored=CodexRetainedRelation::retain(original.clone());
            let restored=stored.restore();
            if restored.root!=original.root||restored.sign!=original.sign||restored.powers!=original.powers||restored.large.primes()!=original.large.primes()||stored.power_len()!=original.powers.len() {return false;}
        }
    }
    true
}

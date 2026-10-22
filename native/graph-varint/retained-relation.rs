// SPDX-License-Identifier: AGPL-3.0-only
// Reversible storage codec for existing u32/u16 values; no new integer arithmetic.
struct CodexRetainedRelation { bytes: Box<[u8]> }
impl CodexRetainedRelation {
    fn retain(r: Relation) -> Self {
        let mut root=[0u8;PARTS*8];
        let n=r.root.write_le_bytes(&mut root).unwrap();
        let (_,lp_count)=r.large.primes();
        let width=|i:u32,e:u16| {let mut h=(u64::from(i)<<1)|u64::from(e!=1);let mut n=1usize;while h>=128 {h>>=7;n+=1;}n+if e==1 {0}else{2}};
        let power_bytes:usize=r.powers.iter().map(|&(i,e)|width(i,e)).sum();
        let mut out=Vec::with_capacity(2+n+2+lp_count*8+4+power_bytes);
        out.extend_from_slice(&(n as u16).to_le_bytes());
        out.extend_from_slice(&root[..n]);out.push(r.sign as u8);
        match r.large {
            LargePrime::None=>out.push(0),
            LargePrime::One(p)=>{out.push(1);out.extend_from_slice(&p.to_le_bytes());}
            LargePrime::Two(a,b)=>{out.push(2);out.extend_from_slice(&a.to_le_bytes());out.extend_from_slice(&b.to_le_bytes());}
        }
        out.extend_from_slice(&(r.powers.len() as u32).to_le_bytes());
        for(i,e)in r.powers {
            let mut h=(u64::from(i)<<1)|u64::from(e!=1);
            while h>=128 {out.push((h as u8&127)|128);h>>=7;}
            out.push(h as u8);
            if e!=1 {out.extend_from_slice(&e.to_le_bytes());}
        }
        Self{bytes:out.into_boxed_slice()}
    }
    fn family_bytes(&self)->Option<Vec<u8>> {
        let root=u16::from_le_bytes(self.bytes.get(..2)?.try_into().ok()?) as usize;
        if root>PARTS*8 {return None;}
        let tag=*self.bytes.get(3+root)? as usize;
        if tag>2 {return None;}
        let p=4+root+tag*8;
        let count=u32::from_le_bytes(self.bytes.get(p..p+4)?.try_into().ok()?) as usize;
        let prefix=p+4;
        if count>1_000_000||count>self.bytes.len().checked_sub(prefix)? {return None;}
        let mut family=Vec::with_capacity(20+prefix+count*6);
        family.extend_from_slice(&[0u8;16]);family.extend_from_slice(&1u32.to_le_bytes());
        family.extend_from_slice(self.bytes.get(..prefix)?);
        let mut cursor=prefix;
        for _ in 0..count {
            let mut header=0u64;let mut terminated=false;
            for width in 0..5 {
                let b=*self.bytes.get(cursor)?;cursor+=1;
                if width==4&&b&0xe0!=0 {return None;}
                header|=u64::from(b&127)<<(width*7);
                if b&128==0 {
                    if width>0&&b==0 {return None;}
                    terminated=true;break;
                }
            }
            if !terminated {return None;}
            let index=(header>>1) as u32;
            let exponent=if header&1==0 {1}else{
                let e=u16::from_le_bytes(self.bytes.get(cursor..cursor+2)?.try_into().ok()?);cursor+=2;
                if e==0||e==1 {return None;}e
            };
            family.extend_from_slice(&index.to_le_bytes());family.extend_from_slice(&exponent.to_le_bytes());
        }
        if cursor!=self.bytes.len() {return None;}
        Some(family)
    }
    fn restore(&self)->Relation {
        // Restore the original wire representation and reuse its checked decoder.
        wire::deserialize_family(&self.family_bytes().expect("retained power codec")).unwrap().relations.pop().unwrap()
    }
    fn power_len(&self)->usize {
        let root=codex_retained_root_bytes(self);let tag=self.bytes[3+root] as usize;let p=4+root+tag*8;
        u32::from_le_bytes(self.bytes[p..p+4].try_into().unwrap()) as usize
    }
}
fn codex_retained_root_bytes(r:&CodexRetainedRelation)->usize {u16::from_le_bytes(r.bytes[..2].try_into().unwrap()) as usize}
pub(crate) fn codex_graph_roundtrip()->bool {
    for width in [0usize,1,42,64,128] {
        let root=Natural::from_le_bytes(&vec![255u8;width]).unwrap();
        for large in [LargePrime::None,LargePrime::One(2),LargePrime::Two(3,u64::MAX)] {
            for index in [0,63,64,127,128,8191,8192,1u32<<31,u32::MAX] {
                for exponent in [1,2,u16::MAX] {
                    let original=Relation{root:root.clone(),sign:width%2==1,powers:vec![(0,1),(index,exponent)],large};
                    let stored=CodexRetainedRelation::retain(original.clone());let restored=stored.restore();
                    if restored.root!=original.root||restored.sign!=original.sign||restored.powers!=original.powers||restored.large.primes()!=original.large.primes()||stored.power_len()!=original.powers.len() {return false;}
                }
            }
        }
    }
    for tail in [vec![],vec![128],vec![128;5],vec![255,255,255,255,63],vec![128,0],vec![1],vec![1,1,0],vec![1,0,0]] {
        let mut b=vec![0,0,0,0,1,0,0,0];b.extend(tail);
        if (CodexRetainedRelation{bytes:b.into_boxed_slice()}).family_bytes().is_some() {return false;}
    }
    let b=vec![0,0,0,0,0,0,0,0,0];
    if (CodexRetainedRelation{bytes:b.into_boxed_slice()}).family_bytes().is_some(){return false;}
    true
}

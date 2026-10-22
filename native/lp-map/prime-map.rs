// SPDX-License-Identifier: AGPL-3.0-only
// Exact key partition; both maps retain the original SplitMix64 key hash.
#[derive(Default)]
struct PrimeMap {
    small: HashMap<u32, u32, BuildHasherDefault<PrimeHasher>>,
    wide: HashMap<u64, u32, BuildHasherDefault<PrimeHasher>>,
}
impl PrimeMap {
    #[inline]
    fn get(&self, key: &u64) -> Option<&u32> {
        match u32::try_from(*key) {
            Ok(k) => self.small.get(&k),
            Err(_) => self.wide.get(key),
        }
    }
    #[inline]
    fn insert(&mut self, key: u64, value: u32) -> Option<u32> {
        match u32::try_from(key) {
            Ok(k) => self.small.insert(k, value),
            Err(_) => self.wide.insert(key, value),
        }
    }
    fn len(&self) -> usize {
        self.small.len().checked_add(self.wide.len()).expect("map length overflow")
    }
    fn capacity(&self) -> usize {
        self.small.capacity().checked_add(self.wide.capacity()).expect("map capacity overflow")
    }
    fn key_value_bytes(&self) -> usize {
        self.small.capacity().checked_mul(core::mem::size_of::<(u32,u32)>())
            .and_then(|a| self.wide.capacity().checked_mul(core::mem::size_of::<(u64,u32)>()).and_then(|b|a.checked_add(b)))
            .expect("map byte estimate overflow")
    }
}
impl EngineSession {
    pub(crate) fn codex_lpmap_field(&self, field:u32)->u32 {
        let m=&self.collector.forest.id_of;
        let value=match field {
            0=>m.small.len(),1=>m.small.capacity(),2=>m.wide.len(),3=>m.wide.capacity(),
            4=>core::mem::size_of::<(u32,u32)>(),5=>core::mem::size_of::<(u64,u32)>(),
            _=>0,
        };
        u32::try_from(value).expect("map field exceeds ABI")
    }
}
pub(crate) fn codex_lpmap_selftest()->bool {
    let mut actual=PrimeMap::default();
    let mut reference:HashMap<u64,u32,BuildHasherDefault<PrimeHasher>>=HashMap::default();
    if actual.len()!=0||actual.capacity()!=0||actual.key_value_bytes()!=0{return false;}
    let mut keys=vec![0,1,u32::MAX as u64-1,u32::MAX as u64,u32::MAX as u64+1,(1u64<<32)+1,(1u64<<63),u64::MAX,1,u64::MAX];
    let mut seed=0x243f6a8885a308d3u64;
    for i in 0..10000u32 {
        seed^=seed<<13;seed^=seed>>7;seed^=seed<<17;
        keys.push(if i%2==0 {seed&u32::MAX as u64}else{seed});
    }
    for (i,&key) in keys.iter().enumerate() {
        let value=u32::MAX-(i as u32);
        if actual.get(&key)!=reference.get(&key)||actual.insert(key,value)!=reference.insert(key,value)||actual.get(&key)!=reference.get(&key)||actual.len()!=reference.len(){return false;}
    }
    for &key in &keys {if actual.get(&key)!=reference.get(&key){return false;}}
    for key in [0,1,u32::MAX] {
        let mut a=PrimeHasher::default();let mut b=PrimeHasher::default();
        a.write_u64(u64::from(key));b.write_u32(key);
        if a.finish()!=b.finish(){return false;}
    }
    if actual.small.len()==0||actual.wide.len()==0{return false;}
    let n=Natural::from(101u64);
    let mut c=RelationCollector::new();
    let big=(1u64<<32)+3;
    for (a,b) in [(3,big),(big,u64::MAX),(u64::MAX,3)] {
        c.ingest(Relation{root:Natural::ONE,sign:false,powers:vec![(0,1)],large:LargePrime::Two(a,b)},&n);
    }
    if c.forest.id_of.get(&3)!=Some(&0)||c.forest.id_of.get(&big)!=Some(&1)||c.forest.id_of.get(&u64::MAX)!=Some(&2)||c.forest.relations.len()!=2||c.cycles!=1||c.columns.len()!=1{return false;}
    let column=&c.columns[0];
    if column.root!=Natural::ONE||column.sign||column.powers!=vec![(0,3)]||column.extra_sqrt!=vec![3,big,u64::MAX]{return false;}
    drop(actual);
    PrimeMap::default().len()==0
}

// SPDX-License-Identifier: AGPL-3.0-only
// Same safe scalar oracle for both block configurations and arithmetic candidate.
pub(crate) fn codex_hotpath_probe() -> bool {
    fn check<const SAT: bool>() -> bool {
        for len in [0usize,1,16383,16384,16385,32767,32768,32769,65537] {
            for initial in [0u8,127,250] {
                let mut expected=vec![initial;len];
                let mut actual=expected.clone();
                for p in [2usize,3,127,8191,8192,8193] {
                    for root in [0usize,1,p-1,p,p+1] {
                        // Include coincident roots by repeating this contribution.
                        for _ in 0..2 {
                            let mut pos=root;
                            while pos<len { expected[pos]=if SAT {expected[pos].saturating_add(63)}else{expected[pos].wrapping_add(63)};pos+=p; }
                            let mut next=root;
                            for block in actual.chunks_mut(DENSE_BLOCK_LEN) { next=sieve_dense_root::<SAT>(block,next,p,63) as usize; }
                        }
                    }
                }
                if actual!=expected {return false;}
                let mut a=Vec::new();
                collect_candidates(&actual,128,&mut a);
                let b:Vec<u32>=expected.iter().enumerate().filter(|(_,s)|**s>=128).map(|(i,_)|i as u32).collect();
                if a!=b {return false;}
            }
        }
        true
    }
    check::<false>()&&check::<true>()
}

// Local diagnostic oracle only; excluded from performance artifacts.
#[allow(unsafe_code)]
#[unsafe(no_mangle)]
pub extern "C" fn codex_resieve_prefix_oracle()->u32 {
    let n=Natural::from_decimal("8156172677439289108635319830552518815109").unwrap();
    let tuning=FactorTuning{factor_base_bound:Some(65537),sieve_half_width:Some(2048),..FactorTuning::default()};
    let prepared=prepare(n,&tuning).unwrap();
    let mut ctx=(*prepared.0).clone();
    let nfb=ctx.base.len();assert!(nfb>60);
    let mut r1=vec![0u32;nfb];let mut r2=vec![0u32;nfb];
    let b=Natural::from_u64(1);let c=Natural::from_u64(1);
    let mut cases=0u32;
    for half in [32usize,128,512,2048] {
        ctx.interval=half as i32;let active=2*half;let len=active+SCORE_SENTINELS;
        for pattern in 0..4 {
            for i in 0..nfb {
                let p=ctx.primes[i];
                r1[i]=if pattern==0{0}else if pattern==1{p-1}else{(i as u32*17+3)%p};
                r2[i]=if pattern<2{r1[i]}else{(i as u32*29+1)%p};
                if r1[i]>r2[i] {core::mem::swap(&mut r1[i],&mut r2[i]);}
                if pattern==3&&i%11==0 {r1[i]=u32::MAX;}
            }
            for initial in [0u8,17,254,255] {
                for start in [0usize,ctx.primes.partition_point(|&p|p<128)] {
                    let mut old=vec![initial;len];let mut next=old.clone();
                    score_polynomial_reference::<false>(&ctx,&b,false,&c,false,&r1,&r2,&mut old,ctx.small_skip,start);
                    score_polynomial::<false>(&ctx,&b,false,&c,false,&r1,&r2,&mut next,ctx.small_skip,start);
                    assert_eq!(&old[..active],&next[..active]);
                    old.fill(initial);next.fill(initial);
                    score_polynomial_reference::<true>(&ctx,&b,false,&c,false,&r1,&r2,&mut old,ctx.small_skip,start);
                    score_polynomial::<true>(&ctx,&b,false,&c,false,&r1,&r2,&mut next,ctx.small_skip,start);
                    assert_eq!(&old[..active],&next[..active]);cases+=2;
                }
            }
            let scores=vec![0u8;len];
            let small=ctx.base.partition_point(|e|e.prime<ctx.small_skip);
            let mut cb=Vec::new();let mut nb=Vec::new();let mut cf=Vec::new();let mut nf=Vec::new();let mut cc=Vec::new();let mut nc=Vec::new();
            for density in [0usize,1,2,3,4,5,16,64,512,4096,1] {
                let count=density.min(active);
                let candidates=(0..count).map(|i|if count==1{0}else{(i*(active-1)/(count-1)) as u32}).collect::<Vec<_>>();
                let a=resieve_candidate_factors_reference(&ctx,&r1,&r2,&scores,0,&candidates,small,&mut cc,&mut cf,&mut cb);
                let z=resieve_candidate_factors(&ctx,&r1,&r2,&scores,0,&candidates,small,&mut nc,&mut nf,&mut nb);
                assert_eq!(a,z);assert_eq!(cc,nc);assert_eq!(cf,nf);
                assert!(cb.iter().all(|&x|x==0)&&nb.iter().all(|&x|x==0));cases+=1;
            }
        }
    }
    let small=ctx.base.partition_point(|e|e.prime<ctx.small_skip);
    let scores=vec![0u8;2*ctx.interval as usize+SCORE_SENTINELS];
    let candidates=vec![0u32];let mut cb=Vec::new();let mut nb=Vec::new();let mut cf=Vec::new();let mut nf=Vec::new();let mut cc=Vec::new();let mut nc=Vec::new();
    for k in [48usize,49,48] {
        r1.fill(u32::MAX);r2.fill(0);
        for i in small..small+k {r1[i]=0;}
        let a=resieve_candidate_factors_reference(&ctx,&r1,&r2,&scores,0,&candidates,small,&mut cc,&mut cf,&mut cb);
        let z=resieve_candidate_factors(&ctx,&r1,&r2,&scores,0,&candidates,small,&mut nc,&mut nf,&mut nb);
        assert_eq!(a,k==48);assert_eq!(a,z);assert_eq!(cc,vec![48]);assert_eq!(cc,nc);assert_eq!(cf,nf);
        assert!(cb.iter().all(|&x|x==0)&&nb.iter().all(|&x|x==0));cases+=1;
    }
    // Explicit word-boundary and same-word rank cases, after reused overflow scratch.
    let positions=vec![0u32,1,2,31,32,62,63,64,65,66,126,127,128,129,511,512,1023,1024,2047,2048,4094,4095];
    for pattern in 0..8usize {
        for i in 0..nfb {
            let p=ctx.primes[i];let a=positions[(i+pattern)%positions.len()]%p;
            let b=positions[(i*3+pattern+1)%positions.len()]%p;
            r1[i]=a.min(b);r2[i]=a.max(b);
            if pattern==7&&i%11==0 {r1[i]=u32::MAX;}
        }
        let a=resieve_candidate_factors_reference(&ctx,&r1,&r2,&scores,0,&positions,small,&mut cc,&mut cf,&mut cb);
        let z=resieve_candidate_factors(&ctx,&r1,&r2,&scores,0,&positions,small,&mut nc,&mut nf,&mut nb);
        assert_eq!(a,z);assert_eq!(cc,nc);assert_eq!(cf,nf);
        assert!(cb.iter().all(|&x|x==0)&&nb.iter().all(|&x|x==0));cases+=1;
    }
    // One report overflows while another still receives all ten factors.
    // The prefix alone owns these first 49 primes at this report density.
    let positions=vec![0u32,1,63,64];
    for k in [48usize,49,48] {
        r1.fill(u32::MAX);r2.fill(0);
        for i in small..small+k {r1[i]=0;}
        // These ten primes follow candidate0's possible 49th factor.
        // A short-circuit overflow OR would incorrectly suppress them.
        for i in small+49..small+59 {r1[i]=1;r2[i]=1;}
        let a=resieve_candidate_factors_reference(&ctx,&r1,&r2,&scores,0,&positions,small,&mut cc,&mut cf,&mut cb);
        let z=resieve_candidate_factors(&ctx,&r1,&r2,&scores,0,&positions,small,&mut nc,&mut nf,&mut nb);
        assert_eq!(a,k==48);assert_eq!(a,z);assert_eq!(cc,nc);assert_eq!(cf,nf);
        assert_eq!(nc[0],48);assert_eq!(nc[1],10);
        assert!(cb.iter().all(|&x|x==0)&&nb.iter().all(|&x|x==0));cases+=1;
    }
    cases
}

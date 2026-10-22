/* Fixed small stage1 only. No claim of internal cancellation within cascade/pow. */
int pm1_split(uint32_t base) {
    prime_ecm_begin();
    int status=-1; mpz_t n,f,work; mpz_inits(n,f,work,NULL);
    stopped=0;
    if ((base!=2 && base!=3) || !read_input(n)) goto done;
    status=0;
    if (pm1_done || stop_curve()) goto done;
    pm1_done=1;
    ecm_params p; ecm_init(p);
    p->method=ECM_PM1; p->verbose=0; p->use_ntt=0;
    p->stop_asap=stop_curve; p->maxmem=16777216;
    p->chkfilename=NULL; p->TreeFilename=NULL;
    mpz_set_ui(p->x,base); mpz_set_ui(p->B2min,2000); mpz_set_ui(p->B2,1);
    mpz_set(work,n);
    int found=ecm_factor(f,work,2000,p);
    ecm_clear(p);
    if (stop_curve()) goto done;
    if (found<0) status=-1;
    else if (found>0 && mpz_cmp(f,n)!=0) status=emit_factor(f,n);
done:
    mpz_clears(n,f,work,NULL); return status;
}

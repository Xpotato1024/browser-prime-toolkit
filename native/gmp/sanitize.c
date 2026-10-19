#include <assert.h>
#include <stdio.h>
#include <stdint.h>
#include <string.h>
#include <gmp.h>
extern char *input_ptr(void), *factor_ptr(void);
extern int brent_split(uint32_t), ecm_split(uint32_t);
static unsigned calls, limit;
int budget_tick(void) { return calls++ < limit; }
static void load(const char *s) { memset(input_ptr(),0,80); strcpy(input_ptr(),s); calls=0; }
static void check(int (*split)(uint32_t)) {
    for (unsigned cutoff=0;cutoff<200;cutoff++) {
        load("392318858461667547569595655490009919272404068553904357377"); limit=cutoff;
        assert(split(1)==0);
        load("10403"); limit=50000000;
        assert(split(17)==1);
        mpz_t n,f; mpz_inits(n,f,NULL);
        mpz_set_ui(n,10403); assert(mpz_set_str(f,factor_ptr(),10)==0);
        assert(mpz_cmp_ui(f,1)>0 && mpz_cmp(f,n)<0 && mpz_divisible_p(n,f));
        mpz_clears(n,f,NULL);
    }
    const char *bad[]={"","0","1","3","4","00101","-7","1e2"," 101","101x",
      "115792089237316195423570985008687907853269984665640564039457584007913129639937"};
    for (unsigned i=0;i<sizeof(bad)/sizeof(bad[0]);i++) {
        load(bad[i]); limit=50000000; assert(split(1)==-1);
    }
    memset(input_ptr(),'1',80); assert(split(1)==-1);
    load("10403"); assert(split(0)==-1);
}
int main(void) { check(brent_split); check(ecm_split); puts("GMP/ECM native sanitizer: 400 interrupts, exact recovery and raw ABI bounds PASS"); }

#include <stdint.h>
#include <string.h>
#include <gmp.h>
#include <ecm.h>
#include "stage-probe.h"
#ifdef __EMSCRIPTEN__
__attribute__((import_module("env"), import_name("budget_tick")))
#endif
extern int budget_tick(void);

static char input[80], output[80];
static int stopped;
char *input_ptr(void) { return input; }
char *factor_ptr(void) { return output; }

static int read_input(mpz_t n) {
    size_t len = strnlen(input, sizeof(input));
    output[0] = 0;
    if (!len || len > 78 || input[0] == '0') return 0;
    for (size_t i = 0; i < len; i++)
        if (input[i] < '0' || input[i] > '9') return 0;
    if (mpz_set_str(n, input, 10) || mpz_cmp_ui(n, 5) < 0 ||
        mpz_even_p(n) || mpz_sizeinbase(n, 2) > 256) return 0;
    return 1;
}
static uint32_t random32(uint32_t *state) {
    *state ^= *state << 13; *state ^= *state >> 17; *state ^= *state << 5;
    return *state;
}
static int emit_factor(const mpz_t f, const mpz_t n) {
    if (mpz_cmp_ui(f, 1) <= 0 || mpz_cmp(f, n) >= 0 || !mpz_divisible_p(n, f)) return -1;
    mpz_get_str(output, 10, f);
    return 1;
}
#define CHECK() do { if (!budget_tick()) { status = 0; goto done; } } while (0)
#define STEP(v) do { CHECK(); mpz_mul(v, v, v); mpz_add(v, v, c); mpz_mod(v, v, n); } while (0)

int brent_split(uint32_t seed) {
    prime_ecm_begin();
    int status = -1;
    mpz_t n,y,c,g,x,saved,q,tmp,bound;
    mpz_inits(n,y,c,g,x,saved,q,tmp,bound,NULL);
    if (!seed || !read_input(n)) goto done;
    for (;;) {
        CHECK();
        mpz_sub_ui(bound,n,3); mpz_set_ui(y,random32(&seed));
        mpz_mod(y,y,bound); mpz_add_ui(y,y,2);
        mpz_sub_ui(bound,n,1); mpz_set_ui(c,random32(&seed));
        mpz_mod(c,c,bound); mpz_add_ui(c,c,1);
        mpz_set_ui(g,1);
        uint32_t r = 1;
        while (mpz_cmp_ui(g,1) == 0) {
            mpz_set(x,y);
            for (uint32_t i=0;i<r;i++) STEP(y);
            for (uint32_t k=0;k<r && mpz_cmp_ui(g,1)==0;k+=64) {
                mpz_set(saved,y); mpz_set_ui(q,1);
                uint32_t length = r-k < 64 ? r-k : 64;
                for (uint32_t i=0;i<length;i++) {
                    STEP(y);
                    mpz_sub(tmp,x,y); mpz_abs(tmp,tmp);
                    mpz_mul(q,q,tmp); mpz_mod(q,q,n);
                }
                CHECK(); mpz_gcd(g,q,n);
            }
            if (r >= (1U<<29)) { status=0; goto done; }
            r *= 2;
        }
        if (mpz_cmp(g,n)==0) {
            do {
                STEP(saved); mpz_sub(tmp,x,saved); mpz_abs(tmp,tmp);
                CHECK(); mpz_gcd(g,tmp,n);
            } while (mpz_cmp_ui(g,1)==0);
        }
        if (mpz_cmp_ui(g,1)>0 && mpz_cmp(g,n)<0) {
            status=emit_factor(g,n); goto done;
        }
    }
done:
    mpz_clears(n,y,c,g,x,saved,q,tmp,bound,NULL);
    return status;
}
#undef CHECK
#undef STEP

/* Private evaluation: same job-global sigma schedule, disjoint lane indices. */
static uint32_t schedule[32], used_mask, master_seed;
static unsigned cursor, lane_count=1, curves, pm1_done;
int configure_partition(uint32_t seed,unsigned lane,unsigned count) {
    if (!seed || (count!=1 && count!=2) || lane>=count) return 0;
    uint32_t state=seed; unsigned filled=0;
    for (unsigned tries=0;tries<128 && filled<32;tries++) {
        uint32_t v=random32(&state);
        if (v>UINT32_MAX-6U) continue;
        v+=6U; unsigned i=0;
        while (i<filled && schedule[i]!=v) i++;
        if (i==filled) schedule[filled++]=v;
    }
    if (filled!=32) return 0;
    master_seed=seed; cursor=lane; lane_count=count;
    used_mask=curves=pm1_done=0; return 1;
}
uint32_t stat_sigma(unsigned index) { return index<32?schedule[index]:0; }
uint32_t stat_used(void) { return used_mask; }
unsigned stat_curves(void) { return curves; }
unsigned stat_pm1(void) { return pm1_done; }

static int stop_curve(void) {
    if (stopped) return 1;
    if (prime_ecm_stop_requested()) { stopped=1; return 1; }
    if (!budget_tick()) stopped=1;
    return stopped;
}
int ecm_split(uint32_t seed) {
    prime_ecm_begin();
    int status=-1;
    mpz_t n,f,work;
    mpz_inits(n,f,work,NULL);
    stopped=0;
    if (!seed || seed!=master_seed || !read_input(n)) goto done;
    status=0;
    for (;cursor<32;) {
        if (stop_curve()) break;
        unsigned index=cursor; cursor+=lane_count;
        ecm_params p;
        ecm_init(p);
        p->verbose=0; p->param=ECM_PARAM_SUYAMA; p->use_ntt=0;
        p->stop_asap=stop_curve; p->maxmem=16777216;
        p->chkfilename=NULL; p->TreeFilename=NULL;
        mpz_set_ui(p->B2,200000);
        mpz_set_ui(p->sigma,schedule[index]);
        gmp_randseed_ui(p->rng,schedule[index]);
        used_mask|=UINT32_C(1)<<index; curves++;
        mpz_set(work,n);
        int found=ecm_factor(f,work,2000,p);
        prime_ecm_probe(12);
        ecm_clear(p);
        prime_ecm_probe(13);
        if (stopped) break;
        if (found<0) { status=-1; break; }
        if (found>0 && mpz_cmp(f,n)!=0) { status=emit_factor(f,n); break; }
    }
done:
    mpz_clears(n,f,work,NULL);
    return status;
}

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

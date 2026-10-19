#include <stdint.h>
#include <string.h>
#include <gmp.h>
#include <ecm.h>
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

static int stop_curve(void) {
    if (stopped) return 1;
    if (!budget_tick()) stopped=1;
    return stopped;
}
int ecm_split(uint32_t seed) {
    int status=-1;
    mpz_t n,f,work;
    mpz_inits(n,f,work,NULL);
    stopped=0;
    if (!seed || !read_input(n)) goto done;
    status=0;
    for (unsigned curve=0;curve<32;curve++) {
        if (stop_curve()) break;
        ecm_params p;
        ecm_init(p);
        p->verbose=0; p->param=ECM_PARAM_SUYAMA; p->use_ntt=0;
        p->stop_asap=stop_curve; p->maxmem=16777216;
        p->chkfilename=NULL; p->TreeFilename=NULL;
        mpz_set_ui(p->B2,200000);
        mpz_set_ui(p->sigma,6UL+(unsigned long)(random32(&seed)%4294967290U));
        gmp_randseed_ui(p->rng,seed);
        mpz_set(work,n);
        int found=ecm_factor(f,work,2000,p);
        ecm_clear(p);
        if (stopped) break;
        if (found<0) { status=-1; break; }
        if (found>0 && mpz_cmp(f,n)!=0) { status=emit_factor(f,n); break; }
    }
done:
    mpz_clears(n,f,work,NULL);
    return status;
}

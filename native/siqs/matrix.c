#include <common.h>
#include "mpqs.h"
#include "runtime.h"
#define LIMIT 1024
static void xor_words(uint64 *a,const uint64 *b,unsigned count) {
    for (unsigned i=0;i<count;i++) a[i]^=b[i];
}
static void column(uint64 *bits,unsigned words,unsigned fb_size,
                   const la_col_t *col,const relation_t *relations) {
    memset(bits,0,words*sizeof(uint64));
    REQUIRE(col->cycle.num_relations<=201);
    for (unsigned j=0;j<col->cycle.num_relations;j++) {
        unsigned index=col->cycle.list[j]; REQUIRE(index<prime_relation_count());
        const relation_t *r=relations+index; REQUIRE(r->num_factors<=64);
        for (unsigned k=0;k<r->num_factors;k++) {
            unsigned row=r->fb_offsets[k]; REQUIRE(row<fb_size);
            bits[row/64]^=(uint64)1<<(row%64);
        }
    }
}
void solve_linear_system(msieve_obj *obj,uint32 rows,uint64 **result,
                         relation_t *relations,la_col_t *cols,uint32 *count) {
    prime_mark(PH_MATRIX);
    unsigned n=*count; REQUIRE(rows>0 && rows<=LIMIT && n<=16000);
    if (n>LIMIT) {
        for (unsigned i=LIMIT;i<n;i++) prime_free(cols[i].cycle.list);
        n=LIMIT; *count=LIMIT;
    }
    if (!n) { *result=NULL; return; }
    unsigned rw=(rows+63)/64,cw=(n+63)/64;
    uint64 *basis=prime_calloc(rows*rw,sizeof(uint64));
    uint64 *history=prime_calloc(rows*cw,sizeof(uint64));
    uint64 *original=prime_calloc(n*rw,sizeof(uint64));
    uint64 *v=prime_calloc(rw,sizeof(uint64)),*h=prime_calloc(cw,sizeof(uint64));
    uint64 *check=prime_calloc(rw,sizeof(uint64));
    unsigned char *used=prime_calloc(rows,1);
    uint64 *deps=prime_calloc(n,sizeof(uint64)); unsigned found=0;
    for (unsigned c=0;c<n;c++) {
        prime_mark(PH_MATRIX);
        column(original+c*rw,rw,rows,cols+c,relations);
        memcpy(v,original+c*rw,rw*sizeof(uint64)); memset(h,0,cw*sizeof(uint64));
        h[c/64]|=(uint64)1<<(c%64); int pivot=-1;
        for (unsigned r=0;r<rows;r++) {
            if (!(v[r/64]&((uint64)1<<(r%64)))) continue;
            prime_mark(PH_MATRIX);
            if (!used[r]) { pivot=(int)r; break; }
            xor_words(v,basis+r*rw,rw); xor_words(h,history+r*cw,cw);
        }
        if (pivot>=0) {
            used[pivot]=1; memcpy(basis+pivot*rw,v,rw*sizeof(uint64));
            memcpy(history+pivot*cw,h,cw*sizeof(uint64));
        } else {
            uint64 mix=(uint64)get_rand(&obj->seed1,&obj->seed2)<<32;
            mix|=get_rand(&obj->seed1,&obj->seed2);
            memset(check,0,rw*sizeof(uint64));
            for (unsigned j=0;j<=c;j++) {
                if (!(h[j/64]&((uint64)1<<(j%64)))) continue;
                xor_words(check,original+j*rw,rw);
                deps[j]^=mix;
            }
            for (unsigned r=0;r<rw;r++) if (check[r]) prime_fail(STOP_INVALID);
            found++;
        }
    }
    for (unsigned d=0;d<64;d++) {
        memset(check,0,rw*sizeof(uint64));
        for (unsigned c=0;c<n;c++) {
            prime_mark(PH_MATRIX);
            if (deps[c]&((uint64)1<<d)) xor_words(check,original+c*rw,rw);
        }
        for (unsigned r=0;r<rw;r++) if(check[r]) prime_fail(STOP_INVALID);
    }
    prime_free(basis); prime_free(history); prime_free(original);
    prime_free(v); prime_free(h); prime_free(check); prime_free(used);
    if (!found) { prime_free(deps); deps=NULL; }
    *result=deps;
}

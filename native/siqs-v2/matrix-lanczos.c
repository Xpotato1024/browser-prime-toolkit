#include <common.h>
#include "mpqs.h"
#include "lanczos.h"
#include "runtime.h"
void prime_snapshot(unsigned,unsigned,relation_t *,la_col_t *);
void prime_record_column(unsigned,unsigned,const uint64 *);
void prime_verify_dependencies(const uint64 *,unsigned);
void packed_matrix_init(msieve_obj *obj,packed_matrix_t *p,la_col_t *a,uint32 rows,uint32 cols,uint32 dense) {
    (void)obj;REQUIRE(rows>=64&&rows<cols&&cols<=1024&&dense==0);
    memset(p,0,sizeof(*p));p->nrows=rows;p->ncols=cols;p->num_threads=1;p->unpacked_cols=a;
}
void packed_matrix_free(packed_matrix_t *p) {
    for(unsigned i=0;i<p->ncols;i++){prime_poll();prime_free(p->unpacked_cols[i].data);p->unpacked_cols[i].data=NULL;}
}
size_t packed_matrix_sizeof(packed_matrix_t *p) {
    size_t size=sizeof(*p);
    for(unsigned i=0;i<p->ncols;i++){prime_poll();REQUIRE(p->unpacked_cols[i].weight<=p->nrows);size+=p->unpacked_cols[i].weight*sizeof(uint32);}
    return size;
}
void mul_MxN_Nx64(packed_matrix_t *p,uint64 *x,uint64 *b) {
    memset(b,0,p->ncols*sizeof(uint64));
    for(unsigned i=0;i<p->ncols;i++){
        prime_poll();la_col_t *c=p->unpacked_cols+i;REQUIRE(c->weight<=p->nrows);
        for(unsigned j=0;j<c->weight;j++){prime_poll();REQUIRE(c->data[j]<p->nrows);b[c->data[j]]^=x[i];}
    }
}
void mul_trans_MxN_Nx64(packed_matrix_t *p,uint64 *x,uint64 *b) {
    for(unsigned i=0;i<p->ncols;i++){
        prime_poll();la_col_t *c=p->unpacked_cols+i;REQUIRE(c->weight<=p->nrows);uint64 value=0;
        for(unsigned j=0;j<c->weight;j++){prime_poll();REQUIRE(c->data[j]<p->nrows);value^=x[c->data[j]];}
        b[i]=value;
    }
}
void solve_linear_system(msieve_obj *obj,uint32 rows,uint64 **result,relation_t *relations,la_col_t *cols,uint32 *count) {
    prime_mark(PH_MATRIX);unsigned n=*count;*result=NULL;
    REQUIRE(rows>0&&rows<=1024&&n<=16000);
    if(n>1024){for(unsigned i=1024;i<n;i++)prime_free(cols[i].cycle.list);n=1024;*count=1024;}
    if(!n)return;
    REQUIRE(rows>=64&&rows<n);
    prime_snapshot(rows,n,relations,cols);
    unsigned words=(rows+63)/64;uint64 bits[16];
    for(unsigned c=0;c<n;c++){
        prime_poll();memset(bits,0,sizeof(bits));REQUIRE(cols[c].cycle.num_relations<=201);
        for(unsigned j=0;j<cols[c].cycle.num_relations;j++){
            prime_poll();unsigned index=cols[c].cycle.list[j];REQUIRE(index<prime_relation_count());
            relation_t *r=relations+index;REQUIRE(r->num_factors<=64);
            for(unsigned k=0;k<r->num_factors;k++){unsigned row=r->fb_offsets[k];REQUIRE(row<rows);bits[row/64]^=(uint64)1<<(row%64);}
        }
        prime_record_column(c,words,bits);
        unsigned weight=0;for(unsigned r=0;r<rows;r++)if(bits[r/64]&((uint64)1<<(r%64)))weight++;
        cols[c].weight=weight;cols[c].data=prime_malloc(weight*sizeof(uint32));
        unsigned index=0;for(unsigned r=0;r<rows;r++)if(bits[r/64]&((uint64)1<<(r%64)))cols[c].data[index++]=r;
    }
    uint32 deps_found=0;
    uint64 *deps=block_lanczos(obj,rows,0,n,cols,&deps_found);
    if(!deps_found){prime_free(deps);return;}
    prime_verify_dependencies(deps,n);*result=deps;
}

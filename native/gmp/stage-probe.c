#include <stdlib.h>
#include <gmp.h>
#include "stage-probe.h"
static unsigned point,mask,requested,injected,gmp_depth;
static unsigned stop_target,domain_target,allocation_target,trap_target;
static unsigned gmp_allocations,direct_allocations,installed;
static void *(*original_allocate)(size_t);
static void *(*original_reallocate)(void*,size_t,size_t);
static void (*original_free)(void*,size_t);
void *__real_malloc(size_t);
void *__real_calloc(size_t,size_t);
void *__real_realloc(void*,size_t);
static int fail_allocation(void) {
    if(point<1 || point>10) return 0;
    unsigned domain=gmp_depth?1:2;
    unsigned count=domain==1?++gmp_allocations:++direct_allocations;
    if(domain==domain_target && count==allocation_target) { injected=1;return 1; }
    return 0;
}
void *__wrap_malloc(size_t size) { return fail_allocation()?NULL:__real_malloc(size); }
void *__wrap_calloc(size_t count,size_t size) { return fail_allocation()?NULL:__real_calloc(count,size); }
void *__wrap_realloc(void *ptr,size_t size) { return fail_allocation()?NULL:__real_realloc(ptr,size); }
static void *gmp_allocate(size_t size) {
    gmp_depth++;void *ptr=original_allocate(size);gmp_depth--;return ptr;
}
static void *gmp_reallocate(void *ptr,size_t old,size_t size) {
    gmp_depth++;void *next=original_reallocate(ptr,old,size);gmp_depth--;return next;
}
static void gmp_free(void *ptr,size_t size) {
    gmp_depth++;original_free(ptr,size);gmp_depth--;
}
void prime_ecm_begin(void) {
    if(!installed) {
        mp_get_memory_functions(&original_allocate,&original_reallocate,&original_free);
        mp_set_memory_functions(gmp_allocate,gmp_reallocate,gmp_free);installed=1;
    }
    point=mask=requested=injected=gmp_allocations=direct_allocations=0;
}
void prime_ecm_probe(unsigned current) {
    point=current;mask|=1U<<current;
    if(current==stop_target) requested=1;
    if(current==trap_target) {injected=1;__builtin_trap();}
}
int prime_ecm_stop_requested(void) {return (int)requested;}
void configure_ecm_audit(unsigned stop,unsigned domain,unsigned allocation,unsigned trap) {
    stop_target=stop;domain_target=domain;allocation_target=allocation;trap_target=trap;
}
unsigned ecm_audit_mask(void) {return mask;}
unsigned ecm_audit_point(void) {return point;}
unsigned ecm_audit_injected(void) {return injected;}
unsigned ecm_audit_gmp_allocations(void) {return gmp_allocations;}
unsigned ecm_audit_direct_allocations(void) {return direct_allocations;}
static unsigned actual_df,actual_k;
static int actual_s,actual_repr,actual_ntt;
void prime_ecm_enter(unsigned dF,unsigned k,int S,int repr,int ntt) {
    actual_df=dF;actual_k=k;actual_s=S;actual_repr=repr;actual_ntt=ntt;
    prime_ecm_probe(1);
}
unsigned ecm_audit_df(void) {return actual_df;}
unsigned ecm_audit_k(void) {return actual_k;}
int ecm_audit_s(void) {return actual_s;}
int ecm_audit_repr(void) {return actual_repr;}
int ecm_audit_ntt(void) {return actual_ntt;}

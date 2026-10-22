#define PRIME_RUNTIME_IMPL
#include <assert.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>
#include "runtime.h"
extern char *input_ptr(void),*factor_ptr(void);
extern int siqs_split(uint32_t);
extern unsigned stat_live(void),stat_peak(void),stat_phases(void),stat_reason(void),stat_allocs(void);
extern void configure_fault(unsigned,unsigned);
extern int native_probe(unsigned);
static const char *number="1000000000100000000002379";
static uint64_t ticks;
int budget_tick(unsigned phase) { (void)phase; ticks++; return ticks<20000000; }
static int run(void) { strcpy(input_ptr(),number); ticks=0; return siqs_split(1); }
static void recovered(void) {
    configure_fault(0,0); assert(run()==1); assert(stat_live()==0);
    assert(!strcmp(factor_ptr(),"1000000000039")||!strcmp(factor_ptr(),"1000000000061"));
}
int main(void) {
    recovered(); unsigned allocations=stat_allocs(),tested=allocations;
#ifdef PRIME_NATIVE_QUICK
    tested=16;
#endif
    for(unsigned phase=1;phase<=6;phase++) {
        configure_fault(phase,0); assert(run()==0); assert(stat_reason()==STOP_BUDGET);
        assert(stat_phases()&(1U<<phase)); assert(stat_live()==0); recovered();
    }
    for(unsigned i=1;i<=tested;i++) {
        configure_fault(0,i); assert(run()==-STOP_ALLOC); assert(stat_live()==0);
        if(i%31==0) recovered();
    }
    recovered();
    for(unsigned mode=1;mode<=13;mode++) {
        const int expected[]={0,STOP_CAPACITY,STOP_CAPACITY,STOP_ALLOC,STOP_INTERNAL,STOP_CAPACITY,1,1,STOP_INVALID,STOP_INVALID,STOP_INVALID,STOP_CAPACITY,STOP_CAPACITY,STOP_CAPACITY};
        assert(native_probe(mode)==expected[mode]); assert(stat_live()==0); recovered();
    }
    configure_fault(0,0);strcpy(input_ptr(),"10189224821914436983");ticks=0;
    assert(siqs_split(1)==-STOP_CAPACITY);assert(stat_live()==0);recovered();
    const char *bad[]={"","01","5","18446744073709551616","1e24","340282366920938463463374607431768211457"};
    for(unsigned i=0;i<sizeof(bad)/sizeof(*bad);i++) {
        strcpy(input_ptr(),bad[i]);assert(siqs_split(1)==-1);assert(stat_live()==0);
    }
    memset(input_ptr(),'9',80);assert(siqs_split(1)==-1);
    strcpy(input_ptr(),number);assert(siqs_split(0)==-1);recovered();
    printf("SIQS native safety: 6 reached phase stops, %u allocation failures, 13 boundary probes, ABI rejection and recovery passed\n",tested);
}

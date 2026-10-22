#define PRIME_RUNTIME_IMPL
#include <assert.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>
#include "runtime.h"
extern char *input_ptr(void),*factor_ptr(void);
extern int siqs_split(uint32_t),native_probe(unsigned),native_checkpoint_probe(unsigned);
extern unsigned stat_live(void),stat_peak(void),stat_phases(void),stat_reason(void),stat_allocs(void),stat_work(void),stat_imports(void),stat_lanczos_attempts(void),stat_lanczos_iterations(void);
extern void configure_fault(unsigned,unsigned);
static const char *number="1000000000100000000002379";
static uint64_t ticks;static unsigned reject_import;
int budget_tick(unsigned phase,unsigned count) { assert(phase>=1&&phase<=6&&count>=1&&count<=64);ticks+=count;return !reject_import; }
static int limited(unsigned limit,unsigned reset) { assert(configure_checkpoint_budget(limit,reset));strcpy(input_ptr(),number);ticks=0;return siqs_split(1); }
static int run(void) { return limited(50000000,1); }
static void recovered(void) {
    configure_fault(0,0);reject_import=0;assert(run()==1);assert(stat_live()==0);
    assert(ticks<=stat_work()&&stat_work()-ticks<=63);
    assert(!strcmp(factor_ptr(),"1000000000039")||!strcmp(factor_ptr(),"1000000000061"));
}
int main(void) {
    const unsigned limits[]={0,1,63,64,65,127,128,129};
    for(unsigned i=0;i<sizeof(limits)/sizeof(*limits);i++){
        assert(limited(limits[i],1)==0);assert(stat_operation_stop());assert(stat_work()==limits[i]);
        assert(ticks<=stat_work()&&stat_work()-ticks<=63);assert(stat_live()==0);
    }
    reject_import=1;assert(run()==0);assert(stat_work()==ticks&&ticks<=64);assert(stat_live()==0);
    recovered();
    assert(native_checkpoint_probe(1)==STOP_CAPACITY);assert(stat_lanczos_attempts()==2);assert(stat_live()==0);
    assert(native_checkpoint_probe(2)==STOP_CAPACITY);assert(stat_lanczos_iterations()==4096);assert(stat_live()==0);
    recovered();unsigned allocations=stat_allocs(),tested=allocations;
#ifdef PRIME_NATIVE_QUICK
    tested=16;
#endif
    for(unsigned phase=1;phase<=6;phase++){
        configure_fault(phase,0);assert(run()==0);assert(stat_reason()==STOP_BUDGET);assert(stat_phases()&(1U<<phase));assert(stat_live()==0);recovered();
    }
    for(unsigned i=1;i<=tested;i++){
        configure_fault(0,i);assert(run()==-STOP_ALLOC);assert(stat_live()==0);if(i%31==0)recovered();
    }
    recovered();
    for(unsigned mode=1;mode<=13;mode++){
        const int expected[]={0,STOP_CAPACITY,STOP_CAPACITY,STOP_ALLOC,STOP_INTERNAL,STOP_CAPACITY,1,1,STOP_INVALID,STOP_INVALID,STOP_INVALID,STOP_CAPACITY,STOP_CAPACITY,STOP_CAPACITY};
        assert(native_probe(mode)==expected[mode]);assert(stat_live()==0);recovered();
    }
    printf("Counted SIQS safety: 8 exact limits, import stop, job caps, 6 phases, %u allocation failures (all %u without --quick), 13 boundary probes and recovery passed\n",tested,allocations);
}

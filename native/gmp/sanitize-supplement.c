#include <assert.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>
char *input_ptr(void); char *factor_ptr(void);
int configure_partition(uint32_t,unsigned,unsigned);
int ecm_split(uint32_t); int pm1_split(uint32_t);
uint32_t stat_sigma(unsigned); uint32_t stat_used(void);
unsigned stat_curves(void);
static unsigned calls,limit=1000000;
int budget_tick(void) { return ++calls<limit; }
int main(void) {
    assert(!configure_partition(1,2,2)); assert(!configure_partition(0,0,1));
    assert(configure_partition(1,0,1));
    for(unsigned i=0;i<32;i++)for(unsigned j=0;j<i;j++)assert(stat_sigma(i)!=stat_sigma(j));
    strcpy(input_ptr(),"1009003027");calls=0;assert(pm1_split(2)==1);
    assert(!strcmp(factor_ptr(),"1009"));assert(pm1_split(2)==0);
    assert(configure_partition(1,0,1));strcpy(input_ptr(),"1022117");calls=0;
    assert(pm1_split(2)==0);
    for(unsigned lane=0;lane<2;lane++){
        assert(configure_partition(11,lane,2));strcpy(input_ptr(),"170141183460469231731687303715884105727");
        calls=0;limit=1;assert(ecm_split(11)==0);assert(!stat_used());
    }
    for(unsigned i=1;i<=100;i++){
        assert(configure_partition(1,0,1));strcpy(input_ptr(),"10403");calls=0;limit=i;
        int r=ecm_split(1);assert(r==0||r==1);
    }
    puts("supplement native sanitizer passed: partition, pm1 controls, 100 interrupts");
}

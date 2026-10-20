#ifndef __EMSCRIPTEN__
#include <time.h>
#endif
static void lab_tick(uint64_t value,unsigned next,unsigned periodic){
 if(lab_audit){if(periodic)lab_periodic++;else lab_flush++;}
 largeTick(value,next);
}
static double lab_now(void){
 REQUIRE(lab_probe_clocks<UINT64_C(1000000000000)); lab_probe_clocks++;
#ifdef __EMSCRIPTEN__
 return emscripten_get_now();
#else
 return (double)clock()*1000.0/CLOCKS_PER_SEC;
#endif
}
void lab_probe(unsigned i,unsigned enter){
 if(!lab_probes)return; REQUIRE(i<LAB_TIMERS);
 if(enter){REQUIRE(!lab_open[i]);lab_open[i]=1;lab_starts[i]=lab_now();REQUIRE(lab_calls[i]<UINT32_MAX);lab_calls[i]++;}
 else{REQUIRE(lab_open[i]);lab_elapsed[i]+=lab_now()-lab_starts[i];lab_open[i]=0;}
}
void lab_params(void *value){
 sieve_param_t *p=value;
 if(lab_parameter==1)p->fb_size=p->fb_size*4/5;
 if(lab_parameter==2)p->sieve_size=p->sieve_size/2;
 if(lab_parameter==3)p->large_mult=p->large_mult/2;
 REQUIRE(p->fb_size>=100&&p->fb_size<=100000);
}
void lab_meta(unsigned multiplier,unsigned fb){lab_multiplier=multiplier;lab_fb=fb;}
unsigned lab_mode(void){return lab_mode_value;}
unsigned lab_done(void){return lab_mode_value==1&&lab_block_quota&&counters[3]>=lab_block_quota;}
void lab_verified(unsigned n){lab_verified_count=n;}
void lab_reset(void){
 lab_periodic=lab_flush=lab_probe_clocks=0;lab_verified_count=0;lab_header_work=0;
 memset(lab_starts,0,sizeof(lab_starts));memset(lab_elapsed,0,sizeof(lab_elapsed));
 memset(lab_calls,0,sizeof(lab_calls));memset(lab_open,0,sizeof(lab_open));
}
int lab_configure(unsigned mode,unsigned stride,unsigned probes,unsigned parameter,unsigned blocks,unsigned audit){
 if(active||mode>2||(stride!=1024&&stride!=16384)||probes>1||parameter>3||blocks>4096||audit>1)return 0;
 lab_mode_value=mode;lab_stride=stride;lab_probes=probes;lab_parameter=parameter;lab_block_quota=blocks;lab_audit=audit;return 1;
}
char *lab_import_ptr(void){REQUIRE(!active&&!saved&&lab_mode_value==2);saved=malloc(SAVE_CAP);REQUIRE(saved!=NULL);return saved;}
int lab_import(unsigned n){if(active||!saved||lab_mode_value!=2||!n||n>SAVE_CAP||saved[n-1]!='\n')return 0;used=n;return 1;}
char *lab_save_ptr(void){return saved;}
void lab_release(void){REQUIRE(!active);free(saved);saved=NULL;used=cursor=0;}
uint64_t lab_stat(unsigned i){
 if(i>=20&&i<27)return phase_work[i-20];
 switch(i){
 case 0:return lab_periodic;case 1:return lab_flush;case 2:return lab_probe_clocks;
 case 3:return counters[3];case 4:return counters[1];case 5:return counters[2];
 case 6:return work;case 7:return lab_fb;case 8:return lab_multiplier;case 9:return lab_verified_count;
 case 10:return limit;case 11:return lab_stride;case 12:return lab_probes;case 13:return lab_parameter;
 case 14:return lab_block_quota;case 15:return lab_mode_value;case 16:return lab_audit;case 17:return lab_header_work;
 default:prime_fail(STOP_INVALID);
 }
}
double lab_timer(unsigned i){REQUIRE(i<LAB_TIMERS);return lab_elapsed[i];}
unsigned lab_timer_calls(unsigned i){REQUIRE(i<LAB_TIMERS);return lab_calls[i];}
unsigned lab_timer_open(unsigned i){REQUIRE(i<LAB_TIMERS);return lab_open[i];}
double lab_timer_elapsed(unsigned i){REQUIRE(i<LAB_TIMERS);return lab_elapsed[i]+(lab_open[i]?lab_now()-lab_starts[i]:0);}

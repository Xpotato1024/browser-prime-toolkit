#include "runtime.h"
static unsigned lab_mode_value,lab_stride=1024,lab_probes,lab_parameter,lab_block_quota,lab_audit=1;
static unsigned lab_multiplier,lab_fb,lab_verified_count;
static uint64_t lab_periodic,lab_flush,lab_probe_clocks,lab_header_work;
static double lab_starts[LAB_TIMERS],lab_elapsed[LAB_TIMERS];
static unsigned lab_calls[LAB_TIMERS],lab_open[LAB_TIMERS];
static void lab_tick(uint64_t,unsigned,unsigned);
void lab_reset(void);
#include "runtime.h"
#include <common.h>
#include "mpqs.h"
#include <string.h>
#ifdef __EMSCRIPTEN__
#include <emscripten.h>
#endif
extern void largeTick(uint64_t,unsigned);
extern void largePhase(unsigned);
extern void publishFactor(unsigned,char*);
#define SAVE_CAP (16U*1024U*1024U)
static char input[128],*saved;
static mp_t original;
static size_t used,cursor;
static unsigned active,phase,ended,rows,relations,poly_factors,nnz,last_reason,last_line;
static uint64_t work,limit=UINT64_C(1000000000000),phase_work[7];
static unsigned counters[4],attempts,iterations;
_Noreturn void prime_fail(int reason){
 last_reason=reason;
#ifdef __EMSCRIPTEN__
 emscripten_force_exit(70+reason);
#else
 fprintf(stderr,"native stop reason=%d line=%u phase=%u work=%llu\n",reason,last_line,phase,(unsigned long long)work);
 _Exit(70+reason);
#endif
}
_Noreturn void prime_capacity(unsigned line){last_line=line;prime_fail(STOP_CAPACITY);}
void prime_poll(void){
 if(!active)return;
 if(work>=limit){lab_tick(work,phase,0);prime_fail(STOP_BUDGET);}
 work++;phase_work[phase]++;
 if(!(work&(lab_stride-1)))lab_tick(work,phase,1);
}
void prime_mark(unsigned next){
 REQUIRE(next<7);
 if(phase!=next){lab_tick(work,phase,0);phase=next;largePhase(phase);}
 prime_poll();
}
void prime_count(unsigned kind,unsigned count){
 static const unsigned caps[]={2000000,65536,1000000,4000000};
 REQUIRE(kind<4&&count<=caps[kind]-counters[kind]);counters[kind]+=count;
}
void prime_set_fb(unsigned n){REQUIRE(n&&n<=100000);rows=n;}
void prime_set_relations(unsigned n){REQUIRE(n<=2000000);relations=n;}
unsigned prime_relation_count(void){return relations;}
void prime_set_poly(unsigned n){REQUIRE(n>=2&&n<=16);poly_factors=n;}
void prime_add_nnz(unsigned n){REQUIRE(n<=16000000U-nnz);nnz+=n;}
void prime_lanczos_attempt(void){REQUIRE(attempts<4);attempts++;prime_mark(PH_MATRIX);}
void prime_lanczos_iteration(void){REQUIRE(iterations<20000);iterations++;prime_poll();}
uint32 prime_collect(void *candidate){
 mp_t *n=candidate,rem;
 if(mp_is_zero(n)||mp_is_one(n)||mp_cmp(n,&original)>=0)return 1;
 mp_mod(&original,n,&rem);if(!mp_is_zero(&rem))prime_fail(STOP_INVALID);
 char buf[32*MAX_MP_WORDS+1];char *digits=mp_sprintf(n,10,buf);
 REQUIRE(strlen(digits)<=100);publishFactor(MSIEVE_COMPOSITE,digits);return 0;
}
void prime_verify_full(unsigned nr,unsigned nc,void *cv,void *rv,const uint64_t *deps){
 la_col_t *cols=cv;relation_t *rels=rv;
 REQUIRE(nr&&nr<=rows&&nc<=150000);
 uint64 *check=calloc(rows,sizeof(uint64));REQUIRE(check!=NULL);
 uint64_t terms=0;
 for(unsigned c=0;c<nc;c++){
  REQUIRE(cols[c].cycle.num_relations<=8192);
  for(unsigned k=0;k<cols[c].cycle.num_relations;k++){
   prime_poll();unsigned id=cols[c].cycle.list[k];REQUIRE(id<relations);
   relation_t *r=rels+id;REQUIRE(r->num_factors<=64);
   for(unsigned j=0;j<r->num_factors;j++){
    prime_poll();REQUIRE(++terms<=UINT64_C(256000000));unsigned row=r->fb_offsets[j];
    REQUIRE(row<rows);check[row]^=deps[c];
   }
  }
 }
 for(unsigned r=0;r<rows;r++){prime_poll();if(check[r]){
#ifndef __EMSCRIPTEN__
 fprintf(stderr,"dependency parity row=%u bits=%llx\n",r,(unsigned long long)check[r]);
#endif
 prime_fail(STOP_INVALID);
 }}
 free(check);
}
static uint32 token(char **cursor,int negative){
 char *p=*cursor;while(*p==' ')p++;if(negative&&*p=='-')p++;
 uint32 value=0;unsigned digits=0;
 while((*p>='0'&&*p<='9')||(*p>='a'&&*p<='f')){
  if(++digits>8)prime_fail(STOP_INVALID);
  value=(value<<4)|(uint32)(*p<='9'?*p-'0':*p-'a'+10);p++;
 }
 if(!digits||(*p&&*p!=' '))prime_fail(STOP_INVALID);
 while(*p==' ')p++;*cursor=p;return value;
}
void prime_validate_line(char *line){
 if(!line[0])return;
 if(line[0]!='A'&&line[0]!='R'){
  size_t n=strlen(line);if(n>85||line[0]=='0')prime_fail(STOP_INVALID);
  for(size_t i=0;i<n;i++)if(!((line[i]>='0'&&line[i]<='9')||(line[i]>='a'&&line[i]<='f')))prime_fail(STOP_INVALID);
  return;
 }
 if(line[1]!=' ')prime_fail(STOP_INVALID);
 char *p=line+2;unsigned count=0,previous=0;
 if(line[0]=='A'){
  while(*p){uint32 x=token(&p,0);if(x>=rows||x<2||(count&&x<=previous)||++count>16)prime_fail(STOP_INVALID);previous=x;}
  if(count!=poly_factors)prime_fail(STOP_INVALID);return;
 }
 if(token(&p,1)>0x7fffffffU||token(&p,0)>=1000000)prime_fail(STOP_INVALID);
 while(*p&&*p!='L'){uint32 x=token(&p,0);if(x>=rows||(count&&x<previous)||++count>64)prime_fail(STOP_INVALID);previous=x;}
 if(*p++!='L'||*p++!=' ')prime_fail(STOP_INVALID);
 uint32 a=token(&p,0),b=token(&p,0);if(!a||!b||a>b||*p)prime_fail(STOP_INVALID);
}
void savefile_init(savefile_t *s,char *name){(void)name;memset(s,0,sizeof(*s));}
void savefile_free(savefile_t *s){(void)s;}
void savefile_open(savefile_t *s,uint32 flags){(void)s;prime_poll();if(flags==SAVEFILE_WRITE)used=0;cursor=0;ended=0;}
void savefile_close(savefile_t *s){(void)s;}
void savefile_flush(savefile_t *s){(void)s;}
void savefile_rewind(savefile_t *s){(void)s;cursor=0;ended=0;}
uint32 savefile_eof(savefile_t *s){(void)s;return ended;}
uint32 savefile_exists(savefile_t *s){(void)s;return used!=0;}
void savefile_read_line(char *buf,size_t max,savefile_t *s){
 (void)s;prime_poll();REQUIRE(max>1);size_t j=0;
 if(cursor>=used)ended=1;
 while(cursor<used){char ch=saved[cursor++];if(ch=='\n')break;REQUIRE(j+1<max);buf[j++]=ch;}
 buf[j]=0;prime_validate_line(buf);
}
void savefile_write_line(savefile_t *s,char *line){
 (void)s;prime_poll();size_t n=strnlen(line,1024);REQUIRE(n<1024&&n<=SAVE_CAP-used);
 if(line[0]=='R')prime_count(0,1);if(line[0]=='A')prime_count(1,1);
 memcpy(saved+used,line,n);used+=n;if(used==n&&n)lab_header_work=work;
}
char *large_input_ptr(void){return input;}
uint64_t large_work(void){return work;}
unsigned large_phase(void){return phase;}
unsigned large_saved(void){return used;}
unsigned large_reason(void){return last_reason;}
unsigned large_line(void){return last_line;}
unsigned large_nnz(void){return nnz;}
int large_configure(uint64_t n){if(active||n>UINT64_C(1000000000000))return 0;limit=n;return 1;}
int large_accept(void){
 size_t n=strnlen(input,sizeof(input));
 if(!n||n>100||input[0]=='0')return 0;
 for(size_t i=0;i<n;i++)if(input[i]<'0'||input[i]>'9')return 0;
 mp_str2mp(input,&original,10);
 return mp_bits(&original)>=64&&mp_bits(&original)<=332&&(original.val[0]&1);
}
int large_run(uint32 seed1,uint32 seed2){
 if(active||!seed1||!seed2||!large_accept())return -1;
 work=0;active=1;phase=0;rows=relations=poly_factors=nnz=last_reason=last_line=0;
 memset(counters,0,sizeof(counters));memset(phase_work,0,sizeof(phase_work));attempts=iterations=0;if(lab_mode_value!=2)used=0;cursor=ended=0;
 lab_reset(); prime_mark(PH_BASE);
 uint32 p=0;
 for(unsigned i=0;i<PRECOMPUTED_NUM_PRIMES;i++){
  p+=prime_delta[i];prime_poll();
  if(!mp_mod_1(&original,p)){
   mp_t factor;mp_clear(&factor);factor.nwords=1;factor.val[0]=p;prime_collect(&factor);
   lab_tick(work,phase,0);active=0;return 1;
  }
 }
 if(!saved)saved=malloc(SAVE_CAP);REQUIRE(saved!=NULL);cursor=0;ended=0;
 msieve_obj *obj=msieve_obj_new(input,0,NULL,NULL,NULL,seed1,seed2,0,(enum cpu_type)0,32768,1048576,1,0,NULL);
 factor_list_t factors;factor_list_init(&factors);mp_t n;mp_copy(&original,&n);
 prime_mark(PH_BASE);int found=factor_mpqs(obj,&n,&factors);
 prime_mark(PH_SQRT);msieve_obj_free(obj);lab_tick(work,phase,0);active=0;
 return found?1:0;
}
#ifndef PRIME_NATIVE_TESTS
int main(void){return 0;}
#endif

#ifdef PRIME_NATIVE_TESTS
uint64_t large_native_counter(void){
 active=1;phase=PH_MATRIX;work=UINT64_C(4294967280);limit=UINT64_C(1000000000000);
 for(unsigned i=0;i<2048;i++)prime_poll();
 lab_tick(work,phase,0);active=0;return work;
}
#endif

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

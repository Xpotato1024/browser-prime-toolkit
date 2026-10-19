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
#define SAVE_CAP (128U*1024U*1024U)
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
 if(work>=limit)prime_fail(STOP_BUDGET);
 work++;phase_work[phase]++;
 if(!(work&1023))largeTick(work,phase);
}
void prime_mark(unsigned next){
 REQUIRE(next<7);
 if(phase!=next){largeTick(work,phase);phase=next;largePhase(phase);}
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
 memcpy(saved+used,line,n);used+=n;
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
 memset(counters,0,sizeof(counters));memset(phase_work,0,sizeof(phase_work));attempts=iterations=0;used=cursor=ended=0;
 prime_mark(PH_BASE);
 uint32 p=0;
 for(unsigned i=0;i<PRECOMPUTED_NUM_PRIMES;i++){
  p+=prime_delta[i];prime_poll();
  if(!mp_mod_1(&original,p)){
   mp_t factor;mp_clear(&factor);factor.nwords=1;factor.val[0]=p;prime_collect(&factor);
   largeTick(work,phase);active=0;return 1;
  }
 }
 saved=malloc(SAVE_CAP);REQUIRE(saved!=NULL);used=cursor=0;ended=0;
 msieve_obj *obj=msieve_obj_new(input,0,NULL,NULL,NULL,seed1,seed2,0,(enum cpu_type)0,32768,1048576,1,0,NULL);
 factor_list_t factors;factor_list_init(&factors);mp_t n;mp_copy(&original,&n);
 prime_mark(PH_BASE);int found=factor_mpqs(obj,&n,&factors);
 prime_mark(PH_SQRT);msieve_obj_free(obj);free(saved);saved=NULL;largeTick(work,phase);active=0;
 return found?1:0;
}
#ifndef PRIME_NATIVE_TESTS
int main(void){return 0;}
#endif

#ifdef PRIME_NATIVE_TESTS
uint64_t large_native_counter(void){
 active=1;phase=PH_MATRIX;work=UINT64_C(4294967280);limit=UINT64_C(1000000000000);
 for(unsigned i=0;i<2048;i++)prime_poll();
 largeTick(work,phase);active=0;return work;
}
#endif

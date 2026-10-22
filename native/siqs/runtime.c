#define PRIME_RUNTIME_IMPL
#include "runtime.h"
#include <setjmp.h>
#include <string.h>
#include <common.h>
#include "mpqs.h"
#ifdef __EMSCRIPTEN__
__attribute__((import_module("env"), import_name("budget_tick")))
#endif
extern int budget_tick(unsigned phase);
#define HEAP_LIMIT (32U * 1024U * 1024U)
#define SAVE_LIMIT (4U * 1024U * 1024U)
#define MAX_LIVE 32768
static struct { void *ptr; size_t size; } owned[MAX_LIVE];
static jmp_buf boundary;
static unsigned live_bytes, peak_bytes, live_count, phase_mask, phase_now;
static unsigned counters[4], fault_phase, fault_alloc, alloc_calls;
static int active, last_reason;
static char input[80], output[80], *saved;
static size_t saved_size, saved_cursor;
static int saved_eof;
static mp_t original, found_factor;
static unsigned factor_found,last_line,actual_relations,actual_fb,actual_poly;
_Noreturn void prime_fail(int reason) {
    if (!active) abort();
    last_reason=reason; longjmp(boundary,1);
}
void prime_mark(unsigned phase) {
    phase_now=phase; phase_mask |= 1U << phase;
    if (phase==fault_phase || !budget_tick(phase)) prime_fail(STOP_BUDGET);
}
void prime_count(unsigned kind, unsigned count) {
    static const unsigned limits[]={16000,2048,32768,65536};
    REQUIRE(kind<4 && count<=limits[kind]-counters[kind]);
    counters[kind]+=count;
}
static int locate(void *ptr) {
    for (unsigned i=0;i<MAX_LIVE;i++) if (owned[i].ptr==ptr) return (int)i;
    return -1;
}
void *prime_malloc(size_t size) {
    if (!size) size=1;
    if (++alloc_calls==fault_alloc) prime_fail(STOP_ALLOC);
    if (size>HEAP_LIMIT-live_bytes || live_count>=MAX_LIVE) prime_fail(STOP_CAPACITY);
    void *ptr=malloc(size);
    if (!ptr) prime_fail(STOP_ALLOC);
    unsigned i=0; while (owned[i].ptr) i++;
    owned[i].ptr=ptr; owned[i].size=size;
    live_count++; live_bytes+=(unsigned)size;
    if (live_bytes>peak_bytes) peak_bytes=live_bytes;
    return ptr;
}
void *prime_calloc(size_t count,size_t size) {
    REQUIRE(!size || count<=SIZE_MAX/size);
    size_t bytes=count*size;
    void *ptr=prime_malloc(bytes); memset(ptr,0,bytes); return ptr;
}
void prime_free(void *ptr) {
    if (!ptr) return;
    int i=locate(ptr); if (i<0) prime_fail(STOP_INTERNAL);
    live_bytes-=(unsigned)owned[i].size; live_count--;
    free(ptr); owned[i].ptr=NULL; owned[i].size=0;
}
void *prime_realloc(void *ptr,size_t size) {
    if (!ptr) return prime_malloc(size);
    int i=locate(ptr); if (i<0) prime_fail(STOP_INTERNAL);
    if (!size) { prime_free(ptr); return prime_malloc(1); }
    size_t old_size=owned[i].size;
    void *next=prime_malloc(size);
    memcpy(next,ptr,size<old_size?size:old_size); prime_free(ptr);
    return next;
}
_Noreturn void prime_exit(int status) { (void)status; prime_fail(STOP_INVALID); }
static void cleanup(void) {
    for (unsigned i=0;i<MAX_LIVE;i++) {
        free(owned[i].ptr); owned[i].ptr=NULL; owned[i].size=0;
    }
    live_bytes=live_count=0; saved=NULL; saved_size=saved_cursor=0; saved_eof=0;
}
void *aligned_malloc(size_t size,uint32 align) {
    REQUIRE(align && !(align&(align-1)) && size<=SIZE_MAX-align-sizeof(void*));
    void *base=prime_malloc(size+align+sizeof(void*));
    void *result=(void*)(((uintptr_t)base+sizeof(void*)+align-1)&~(uintptr_t)(align-1));
    ((void**)result)[-1]=base; return result;
}
void aligned_free(void *ptr) { if (ptr) prime_free(((void**)ptr)[-1]); }
static char logs[16384];
static unsigned log_size;
char *log_ptr(void) { return logs; }
void logprintf(msieve_obj *obj,char *fmt,...) {
    (void)obj; if (log_size>=sizeof(logs)-1) return;
    va_list args; va_start(args,fmt);
    int used=vsnprintf(logs+log_size,sizeof(logs)-log_size,fmt,args); va_end(args);
    if (used>0) log_size+=(unsigned)used<sizeof(logs)-log_size?(unsigned)used:(unsigned)sizeof(logs)-log_size-1;
}
void savefile_open(savefile_t *s,uint32 flags) {
    (void)s; prime_mark(phase_now);
    if (!saved) saved=prime_malloc(SAVE_LIMIT);
    if (flags==SAVEFILE_WRITE) saved_size=0;
    saved_cursor=0; saved_eof=0;
}
void savefile_close(savefile_t *s) { (void)s; }
void savefile_flush(savefile_t *s) { (void)s; }
uint32 savefile_exists(savefile_t *s) { (void)s; return saved_size!=0; }
uint32 savefile_eof(savefile_t *s) { (void)s; return (uint32)saved_eof; }
void savefile_rewind(savefile_t *s) { (void)s; saved_cursor=0; saved_eof=0; }
void savefile_read_line(char *buf,size_t max,savefile_t *s) {
    (void)s; prime_mark(phase_now); REQUIRE(max>1);
    if (saved_cursor>=saved_size) saved_eof=1;
    size_t size=0;
    while (saved_cursor<saved_size) {
        char ch=saved[saved_cursor++]; if (ch=='\n') break;
        REQUIRE(size+1<max); buf[size++]=ch;
    }
    buf[size]=0; prime_validate_line(buf);
}
void savefile_write_line(savefile_t *s,char *line) {
    (void)s; prime_mark(phase_now);
    size_t size=strnlen(line,1024); REQUIRE(size<1024 && size<=SAVE_LIMIT-saved_size);
    if (line[0]=='R') prime_count(0,1);
    if (line[0]=='A') prime_count(1,1);
    memcpy(saved+saved_size,line,size); saved_size+=size;
}
void fill_prime_list(prime_list_t *list,uint32 size,uint32 bound) {
    REQUIRE(size<=4096);
    list->list=prime_malloc(size*sizeof(uint32)); list->num_primes=0;
    uint32 p=2;
    for (unsigned i=0;i<PRECOMPUTED_NUM_PRIMES && list->num_primes<size;i++) {
        if (i) p+=prime_delta[i];
        if (p>bound) break;
        prime_mark(PH_BASE);
        if (!mp_mod_1(&original,p)) {
            mp_clear(&found_factor); found_factor.nwords=1; found_factor.val[0]=p;
            factor_found=1; prime_fail(1);
        }
        list->list[list->num_primes++]=p;
    }
    REQUIRE(list->num_primes==size);
}
void factor_list_init(factor_list_t *list) { memset(list,0,sizeof(*list)); }
uint32 factor_list_add(msieve_obj *obj,factor_list_t *list,mp_t *candidate) {
    (void)obj; (void)list;
    mp_t rem;
    if ((candidate->nwords<=1 && candidate->val[0]<=1) || mp_cmp(candidate,&original)>=0) return 1;
    mp_mod(&original,candidate,&rem);
    if (!mp_is_zero(&rem)) prime_fail(STOP_INVALID);
    mp_copy(candidate,&found_factor); factor_found=1; return 0;
}
void free_cycle_list(la_col_t *cols,uint32 count) {
    for (uint32 i=0;i<count;i++) {
        prime_free(cols[i].cycle.list);
    }
    prime_free(cols);
}
char *input_ptr(void) { return input; }
char *factor_ptr(void) { return output; }
unsigned stat_live(void) { return live_bytes; }
unsigned stat_peak(void) { return peak_bytes; }
unsigned stat_phases(void) { return phase_mask; }
unsigned stat_reason(void) { return (unsigned)last_reason; }
void configure_fault(unsigned phase,unsigned alloc) { fault_phase=phase; fault_alloc=alloc; }
int siqs_split(uint32 seed) {
    if (active || live_count) return -1;
    output[0]=logs[0]=0; log_size=last_line=actual_relations=actual_fb=actual_poly=0; peak_bytes=phase_mask=phase_now=alloc_calls=0;
    memset(counters,0,sizeof(counters)); factor_found=0; last_reason=0;
    size_t length=strnlen(input,sizeof(input));
    if (!seed || !length || length>39 || input[0]=='0') return -1;
    for (size_t i=0;i<length;i++) if (input[i]<'0'||input[i]>'9') return -1;
    mp_str2mp(input,&original,10);
    if (mp_bits(&original)<64 || mp_bits(&original)>128 || !(original.val[0]&1)) return -1;
    active=1;
    if (!setjmp(boundary)) {
        mp_t n; mp_copy(&original,&n);
        msieve_obj obj; memset(&obj,0,sizeof(obj));
        obj.seed1=seed; obj.seed2=seed^0x9e3779b9U; obj.cache_size1=32768;
        factor_list_t factors; factor_list_init(&factors);
        prime_mark(PH_BASE);
        factor_mpqs(&obj,&n,&factors);
    }
    cleanup(); active=0;
    if (factor_found && (last_reason==0 || last_reason==1)) {
        char scratch[32*MAX_MP_WORDS+1];
        const char *digits=mp_sprintf(&found_factor,10,scratch);
        size_t length=strnlen(digits,sizeof(output));
        if (length>0 && length<sizeof(output)) memcpy(output,digits,length+1);
        else { output[0]=0; last_reason=STOP_INVALID; }
    }
    return output[0]?1:(last_reason==STOP_BUDGET?0:last_reason?-(int)last_reason:0);
}

void prime_poll(void) { if (active) prime_mark(phase_now); }
void prime_set_relations(unsigned count) { REQUIRE(count<=16000); actual_relations=count; }
unsigned prime_relation_count(void) { return actual_relations; }

_Noreturn void prime_capacity(unsigned line) { last_line=line; prime_fail(STOP_CAPACITY); }
unsigned stat_line(void) { return last_line; }
unsigned stat_allocs(void) { return alloc_calls; }
#ifdef PRIME_NATIVE_TESTS
int native_probe(unsigned mode) {
    configure_fault(0,0); last_reason=0; active=1;
    if (!setjmp(boundary)) {
        if (mode==1) prime_calloc(SIZE_MAX,2);
        if (mode==2) prime_malloc(HEAP_LIMIT+1U);
        if (mode==3) {
            void *ptr=prime_malloc(16); fault_alloc=alloc_calls+1;
            prime_realloc(ptr,32);
        }
        if (mode==4) prime_free(input);
        if (mode==5) {
            char line[1024]; memset(line,'X',1023); line[1023]=0;
            savefile_t file; savefile_open(&file,SAVEFILE_WRITE);
            for(unsigned i=0;i<5000;i++) savefile_write_line(&file,line);
        }
        if (mode==6) {
            uint32 count=0; uint64 *result=(void*)1;
            solve_linear_system(NULL,1,&result,NULL,NULL,&count);
            if(result || count) prime_fail(STOP_INVALID);
        }
        if (mode==7) {
            savefile_t file; char line[1024]; unsigned count=0;
            prime_set_fb(16); prime_set_poly(3);
            savefile_open(&file,SAVEFILE_WRITE); savefile_write_line(&file,"abcdef1234567890\nA 2 3 4\nR 0 0 1 L 1 1\n");
            savefile_open(&file,SAVEFILE_READ); savefile_read_line(line,sizeof(line),&file);
            while(!savefile_eof(&file)) { count++; savefile_read_line(line,sizeof(line),&file); }
            if(count!=3) prime_fail(STOP_INVALID);
        }
        if(mode>=8 && mode<=10) {
            prime_set_fb(16); prime_set_poly(3);
            char bad[64];
            strcpy(bad,mode==8?"A 2 3 10":mode==9?"R 0 0 10 L 1 1":"A 2 2 3");
            prime_validate_line(bad);
        }
        if(mode==11) { uint32 count=0; uint64 *result; solve_linear_system(NULL,1025,&result,NULL,NULL,&count); }
        if(mode==12) {
            uint32 index=0,count=1; uint64 *result; la_col_t col;
            memset(&col,0,sizeof(col)); col.cycle.num_relations=1; col.cycle.list=&index;
            prime_set_relations(0); solve_linear_system(NULL,1,&result,NULL,&col,&count);
        }
        if(mode==13) {
            sieve_conf_t conf; memset(&conf,0,sizeof(conf));
            save_relation(&conf,0,NULL,65,0,1,1);
        }
    }
    cleanup(); active=0; return last_reason?last_reason:1;
}
#endif
void prime_set_fb(unsigned count) { REQUIRE(count>0 && count<=1024); actual_fb=count; }
void prime_set_poly(unsigned count) { REQUIRE(count>=2 && count<=16); actual_poly=count; }
static uint32 token(char **cursor,int negative) {
    char *p=*cursor;
    while (*p==' ') p++;
    if (negative && *p=='-') p++;
    uint32 value=0; unsigned digits=0;
    while ((*p>='0'&&*p<='9')||(*p>='a'&&*p<='f')) {
        if (++digits>8) prime_fail(STOP_INVALID);
        value=(value<<4)|(uint32)(*p<='9'?*p-'0':*p-'a'+10); p++;
    }
    if (!digits || (*p && *p!=' ')) prime_fail(STOP_INVALID);
    while (*p==' ') p++;
    *cursor=p; return value;
}
void prime_validate_line(char *line) {
    if (!line[0]) return;
    if (line[0]!='A' && line[0]!='R') {
        size_t n=strlen(line); if(n>34 || line[0]=='0') prime_fail(STOP_INVALID);
        for(size_t i=0;i<n;i++) if(!((line[i]>='0'&&line[i]<='9')||(line[i]>='a'&&line[i]<='f'))) prime_fail(STOP_INVALID);
        return;
    }
    if(line[1]!=' ') prime_fail(STOP_INVALID);
    char *p=line+2; unsigned count=0,previous=0;
    if(line[0]=='A') {
        while(*p) {
            uint32 index=token(&p,0);
            if(index>=actual_fb || index<2 || (count && index<=previous) || ++count>16) prime_fail(STOP_INVALID);
            previous=index;
        }
        if(count!=actual_poly) prime_fail(STOP_INVALID);
        return;
    }
    if(token(&p,1)>0x7fffffffU || token(&p,0)>=32768) prime_fail(STOP_INVALID);
    while(*p && *p!='L') {
        uint32 index=token(&p,0);
        if(index>=actual_fb || (count && index<previous) || ++count>64) prime_fail(STOP_INVALID);
        previous=index;
    }
    if(*p++!='L' || *p++!=' ') prime_fail(STOP_INVALID);
    uint32 first=token(&p,0),second=token(&p,0);
    if(!first || !second || first>second || *p) prime_fail(STOP_INVALID);
}

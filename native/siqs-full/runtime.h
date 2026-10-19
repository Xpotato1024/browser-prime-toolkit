#ifndef PRIME_FULL_SIQS_H
#define PRIME_FULL_SIQS_H
#include <stddef.h>
#include <stdint.h>
#include <stdlib.h>
enum {PH_BASE=1,PH_POLY,PH_SIEVE,PH_RELATION,PH_MATRIX,PH_SQRT};
enum {STOP_BUDGET=2,STOP_CAPACITY,STOP_ALLOC,STOP_INVALID,STOP_INTERNAL};
_Noreturn void prime_fail(int);
_Noreturn void prime_capacity(unsigned);
void prime_poll(void);
void prime_mark(unsigned);
void prime_count(unsigned,unsigned);
void prime_set_fb(unsigned);
void prime_set_relations(unsigned);
unsigned prime_relation_count(void);
void prime_set_poly(unsigned);
void prime_add_nnz(unsigned);
void prime_lanczos_attempt(void);
void prime_lanczos_iteration(void);
void prime_verify_full(unsigned,unsigned,void*,void*,const uint64_t*);
uint32_t prime_collect(void*);
#define REQUIRE(x) do {if(!(x))prime_capacity(__LINE__);} while(0)
void publishState(unsigned,unsigned,unsigned,unsigned,unsigned);
#endif

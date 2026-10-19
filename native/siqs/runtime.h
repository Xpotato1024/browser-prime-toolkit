#ifndef PRIME_SIQS_RUNTIME_H
#define PRIME_SIQS_RUNTIME_H
#include <stddef.h>
#include <stdint.h>
#include <stdlib.h>
#include <stdio.h>
enum { PH_BASE=1, PH_POLY, PH_SIEVE, PH_RELATION, PH_MATRIX, PH_SQRT };
enum { STOP_BUDGET=2, STOP_CAPACITY, STOP_ALLOC, STOP_INVALID, STOP_INTERNAL };
_Noreturn void prime_fail(int reason);
void prime_mark(unsigned phase);
void prime_poll(void);
_Noreturn void prime_capacity(unsigned line);
void prime_set_relations(unsigned count);
void prime_set_fb(unsigned count);
void prime_set_poly(unsigned count);
void prime_validate_line(char *line);
unsigned prime_relation_count(void);
void prime_count(unsigned kind, unsigned count);
void *prime_malloc(size_t size);
void *prime_calloc(size_t count, size_t size);
void *prime_realloc(void *ptr, size_t size);
void prime_free(void *ptr);
_Noreturn void prime_exit(int status);
#define REQUIRE(x) do { if (!(x)) prime_capacity(__LINE__); } while (0)
#ifndef PRIME_RUNTIME_IMPL
#define malloc prime_malloc
#define calloc prime_calloc
#define realloc prime_realloc
#define free prime_free
#define exit prime_exit
#define printf(...) (0)
#endif
#endif

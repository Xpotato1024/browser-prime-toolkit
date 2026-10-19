/* Narrow compatibility declarations; upstream common.h also imports GMP. */
#ifndef PRIME_TINYQS_COMMON_H
#define PRIME_TINYQS_COMMON_H
#include <mp.h>
#define PRECOMPUTED_NUM_PRIMES 9592
extern const uint8 prime_delta[PRECOMPUTED_NUM_PRIMES];
uint32 tinyqs(mp_t *, mp_t *, mp_t *);
__attribute__((import_module("env"), import_name("budget_tick")))
extern int budget_tick(void);
#endif

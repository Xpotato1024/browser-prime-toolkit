#ifndef PRIME_SIQS_LAB_H
#define PRIME_SIQS_LAB_H
#include "../siqs-full/runtime.h"
enum { LAB_total_time,LAB_base_poly_time,LAB_next_poly_small_time,LAB_next_poly_large_time,
 LAB_plus_init_time,LAB_bucket_time,LAB_sieve_small_time,LAB_sieve_large_time,
 LAB_tf_plus_scan_time,LAB_tf_total_time,LAB_tf_small_time,LAB_tf_large_time,LAB_residual_split,LAB_TIMERS };
void lab_probe(unsigned,unsigned);
void lab_params(void*);
void lab_meta(unsigned,unsigned);
unsigned lab_mode(void);
unsigned lab_done(void);
void lab_verify_saved(void*);
void lab_verified(unsigned);
#endif

#ifndef PRIME_ECM_STAGE_PROBE_H
#define PRIME_ECM_STAGE_PROBE_H
void prime_ecm_begin(void);
void prime_ecm_probe(unsigned point);
int prime_ecm_stop_requested(void);
void configure_ecm_audit(unsigned stop,unsigned domain,unsigned allocation,unsigned trap);
unsigned ecm_audit_mask(void);
unsigned ecm_audit_point(void);
unsigned ecm_audit_injected(void);
unsigned ecm_audit_gmp_allocations(void);
unsigned ecm_audit_direct_allocations(void);
void prime_ecm_enter(unsigned dF,unsigned k,int S,int repr,int ntt);
unsigned ecm_audit_df(void);
unsigned ecm_audit_k(void);
int ecm_audit_s(void);
int ecm_audit_repr(void);
int ecm_audit_ntt(void);
#endif

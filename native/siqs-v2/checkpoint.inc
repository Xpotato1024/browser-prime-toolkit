#define CHECKPOINT_STRIDE 64U
static unsigned checkpoint_limit,logical_work,pending_work,import_calls,operation_stop;
static unsigned phase_work[7],lanczos_attempts,lanczos_iterations;
int configure_checkpoint_budget(unsigned remaining,unsigned reset) {
    if(active||remaining>50000000U||reset>1)return 0;
    checkpoint_limit=remaining;
    if(reset)lanczos_attempts=lanczos_iterations=0;
    return 1;
}
unsigned stat_work(void) { return logical_work; }
unsigned stat_imports(void) { return import_calls; }
unsigned stat_operation_stop(void) { return operation_stop; }
unsigned stat_phase_work(unsigned phase) { return phase<7?phase_work[phase]:0; }
unsigned stat_lanczos_attempts(void) { return lanczos_attempts; }
unsigned stat_lanczos_iterations(void) { return lanczos_iterations; }
static void flush_checkpoint(void) {
    unsigned count=pending_work;
    if(!count)return;
    pending_work=0;import_calls++;
    if(!budget_tick(phase_now,count))prime_fail(STOP_BUDGET);
}
void prime_lanczos_attempt(void) { REQUIRE(lanczos_attempts<2);lanczos_attempts++;prime_mark(PH_MATRIX); }
void prime_lanczos_iteration(void) { REQUIRE(lanczos_iterations<4096);lanczos_iterations++;prime_poll(); }

#ifdef PRIME_NATIVE_TESTS
int native_checkpoint_probe(unsigned mode) {
    REQUIRE(!active);
    fault_phase=fault_alloc=0;configure_checkpoint_budget(50000,1);
    logical_work=pending_work=import_calls=operation_stop=0;phase_now=PH_MATRIX;last_reason=0;active=1;
    if(!setjmp(boundary)) {
        if(mode==1) {
            prime_lanczos_attempt();
            active=0;REQUIRE(configure_checkpoint_budget(49999,0));active=1;
            prime_lanczos_attempt();prime_lanczos_attempt();
        } else {
            for(unsigned i=0;i<2048;i++)prime_lanczos_iteration();
            active=0;REQUIRE(configure_checkpoint_budget(47952,0));active=1;
            for(unsigned i=0;i<2049;i++)prime_lanczos_iteration();
        }
    }
    active=0;return last_reason;
}
#endif

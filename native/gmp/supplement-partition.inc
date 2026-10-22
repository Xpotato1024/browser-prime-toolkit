/* Private evaluation: same job-global sigma schedule, disjoint lane indices. */
static uint32_t schedule[32], used_mask, master_seed;
static unsigned cursor, lane_count=1, curves, pm1_done;
int configure_partition(uint32_t seed,unsigned lane,unsigned count) {
    if (!seed || (count!=1 && count!=2) || lane>=count) return 0;
    uint32_t state=seed; unsigned filled=0;
    for (unsigned tries=0;tries<128 && filled<32;tries++) {
        uint32_t v=random32(&state);
        if (v>UINT32_MAX-6U) continue;
        v+=6U; unsigned i=0;
        while (i<filled && schedule[i]!=v) i++;
        if (i==filled) schedule[filled++]=v;
    }
    if (filled!=32) return 0;
    master_seed=seed; cursor=lane; lane_count=count;
    used_mask=curves=pm1_done=0; return 1;
}
uint32_t stat_sigma(unsigned index) { return index<32?schedule[index]:0; }
uint32_t stat_used(void) { return used_mask; }
unsigned stat_curves(void) { return curves; }
unsigned stat_pm1(void) { return pm1_done; }

#define SNAPSHOT_WORDS 1250000U
static uint32_t snapshot[SNAPSHOT_WORDS],snapshot_size,capture_snapshot;
static uint64_t parity_columns[16384];
static unsigned parity_rows,parity_count,parity_words;
void configure_snapshot(unsigned capture) { REQUIRE(capture<=1);capture_snapshot=capture; }
unsigned stat_snapshot_ptr(void) { return (unsigned)(uintptr_t)snapshot; }
unsigned stat_snapshot_bytes(void) { return snapshot_size*4U; }
unsigned stat_parity_ptr(void) { return (unsigned)(uintptr_t)parity_columns; }
unsigned stat_parity_bytes(void) { return parity_count*parity_words*8U; }
static void snapshot_word(unsigned value) { REQUIRE(snapshot_size<SNAPSHOT_WORDS);snapshot[snapshot_size++]=value; }
void prime_snapshot(unsigned rows,unsigned n,relation_t *relations,la_col_t *cols) {
    REQUIRE(rows>0&&rows<=1024&&n<=1024);
    parity_rows=rows;parity_count=n;parity_words=(rows+63)/64;
    memset(parity_columns,0,n*parity_words*sizeof(uint64));
    if(!capture_snapshot)return;
    unsigned nr=prime_relation_count();REQUIRE(nr<=16000);
    snapshot_word(0x31514c4dU);snapshot_word(rows);snapshot_word(n);snapshot_word(nr);
    for(unsigned i=0;i<nr;i++){
        prime_poll();const relation_t *r=relations+i;REQUIRE(r->num_factors<=64);
        snapshot_word(r->num_factors);
        for(unsigned j=0;j<r->num_factors;j++){REQUIRE(r->fb_offsets[j]<rows);snapshot_word(r->fb_offsets[j]);}
    }
    for(unsigned i=0;i<n;i++){
        prime_poll();REQUIRE(cols[i].cycle.num_relations<=201);snapshot_word(cols[i].cycle.num_relations);
        for(unsigned j=0;j<cols[i].cycle.num_relations;j++){unsigned k=cols[i].cycle.list[j];REQUIRE(k<nr);snapshot_word(k);}
    }
}
void prime_record_column(unsigned col,unsigned words,const uint64 *data) {
    REQUIRE(col<parity_count&&words==parity_words);memcpy(parity_columns+col*words,data,words*sizeof(uint64));
}
void prime_verify_dependencies(const uint64 *deps,unsigned count) {
    REQUIRE(count==parity_count);
    uint64 check[16];
    for(unsigned d=0;d<64;d++){
        memset(check,0,sizeof(check));
        for(unsigned c=0;c<count;c++){
            prime_poll();if(!(deps[c]&((uint64)1<<d)))continue;
            for(unsigned r=0;r<parity_words;r++)check[r]^=parity_columns[c*parity_words+r];
        }
        for(unsigned r=0;r<parity_words;r++)if(check[r])prime_fail(STOP_INVALID);
    }
}

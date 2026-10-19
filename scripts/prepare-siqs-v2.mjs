import {readFileSync} from 'node:fs';
import {writeGenerated} from './generated-file.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8'),write=(p,s)=>writeGenerated(new URL('../'+p,import.meta.url),s);
function sub(s,a,b){if(s.split(a).length!==2)throw Error('Patch count '+a);return s.replace(a,b);}
let s=read('native/siqs/runtime.c');
s=sub(s,'extern int budget_tick(unsigned phase);','extern int budget_tick(unsigned phase,unsigned count);');
const begin=s.indexOf('void prime_mark(unsigned phase) {'),end=s.indexOf('void prime_count(',begin);
s=s.slice(0,begin)+read('native/siqs-v2/checkpoint.inc')+'\n'+read('native/siqs-v2/snapshot.inc')+`
void prime_mark(unsigned phase) {
    REQUIRE(phase<7);
    if(phase!=phase_now)flush_checkpoint();
    phase_now=phase;phase_mask|=1U<<phase;
    if(phase==fault_phase)prime_fail(STOP_BUDGET);
    if(logical_work>=checkpoint_limit){operation_stop=1;prime_fail(STOP_BUDGET);}
    logical_work++;phase_work[phase]++;pending_work++;
    if(pending_work==CHECKPOINT_STRIDE)flush_checkpoint();
}
`+s.slice(end);
s=sub(s,'output[0]=logs[0]=0;','logical_work=pending_work=import_calls=operation_stop=snapshot_size=parity_count=0; memset(phase_work,0,sizeof(phase_work));\n    output[0]=logs[0]=0;');
s=sub(s,'factor_mpqs(&obj,&n,&factors);','factor_mpqs(&obj,&n,&factors);\n        if(!last_reason)flush_checkpoint();');
write('native/siqs-v2/runtime.c',s);
let h=read('native/siqs/runtime.h');h=sub(h,'void prime_poll(void);',`void prime_poll(void);
void prime_lanczos_attempt(void);
void prime_lanczos_iteration(void);
int configure_checkpoint_budget(unsigned,unsigned);
unsigned stat_work(void);
unsigned stat_operation_stop(void);
void prime_snapshot(unsigned,unsigned,struct relation_unused *,struct column_unused *);
`);
// relation_t/col types become available only after common.h/mpqs.h in C translation units.
h=h.replace('void prime_snapshot(unsigned,unsigned,struct relation_unused *,struct column_unused *);\n','');
write('native/siqs-v2/runtime.h',h);
let m=read('native/siqs/matrix.c');
m=sub(m,'#define LIMIT 1024',`#define LIMIT 1024
void prime_snapshot(unsigned,unsigned,relation_t *,la_col_t *);
void prime_record_column(unsigned,unsigned,const uint64 *);`);
m=sub(m,'unsigned rw=(rows+63)/64,cw=(n+63)/64;','prime_snapshot(rows,n,relations,cols);\n    unsigned rw=(rows+63)/64,cw=(n+63)/64;');
m=sub(m,'column(original+c*rw,rw,rows,cols+c,relations);','column(original+c*rw,rw,rows,cols+c,relations);\n        prime_record_column(c,rw,original+c*rw);');
write('native/siqs-v2/matrix-dense.c',m);

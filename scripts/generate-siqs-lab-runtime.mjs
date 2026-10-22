import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
const root=resolve(import.meta.dirname,'..');
let text=readFileSync(join(root,'native/siqs-full/runtime.c'),'utf8');
const sub=(a,b)=>{if(text.split(a).length!==2)throw Error('Lab runtime patch '+a);text=text.replace(a,b);};
sub('#define SAVE_CAP (128U*1024U*1024U)','#define SAVE_CAP (16U*1024U*1024U)');
sub('if(work>=limit)prime_fail(STOP_BUDGET);','if(work>=limit){lab_tick(work,phase,0);prime_fail(STOP_BUDGET);}');
sub('if(!(work&1023))largeTick(work,phase);','if(!(work&(lab_stride-1)))lab_tick(work,phase,1);');
text=text.replaceAll('largeTick(work,phase)','lab_tick(work,phase,0)');
sub('prime_mark(PH_BASE);\n uint32 p=0;','lab_reset(); prime_mark(PH_BASE);\n uint32 p=0;');
sub('attempts=iterations=0;used=cursor=ended=0;','attempts=iterations=0;if(lab_mode_value!=2)used=0;cursor=ended=0;');
sub('saved=malloc(SAVE_CAP);REQUIRE(saved!=NULL);used=cursor=0;ended=0;','if(!saved)saved=malloc(SAVE_CAP);REQUIRE(saved!=NULL);cursor=0;ended=0;');
sub('free(saved);saved=NULL;lab_tick(work,phase,0);active=0;','lab_tick(work,phase,0);active=0;');
sub('memcpy(saved+used,line,n);used+=n;','memcpy(saved+used,line,n);used+=n;if(used==n&&n)lab_header_work=work;');
const prefix=`#include "runtime.h"
static unsigned lab_mode_value,lab_stride=1024,lab_probes,lab_parameter,lab_block_quota,lab_audit=1;
static unsigned lab_multiplier,lab_fb,lab_verified_count;
static uint64_t lab_periodic,lab_flush,lab_probe_clocks,lab_header_work;
static double lab_starts[LAB_TIMERS],lab_elapsed[LAB_TIMERS];
static unsigned lab_calls[LAB_TIMERS],lab_open[LAB_TIMERS];
static void lab_tick(uint64_t,unsigned,unsigned);
void lab_reset(void);
`;
text=prefix+text+'\n'+readFileSync(join(root,'native/siqs-lab/runtime-tail.c'),'utf8');
const target=join(root,'native/siqs-lab/runtime.c');
if(process.argv.includes('--check')){if(readFileSync(target,'utf8')!==text)throw Error('Stale lab runtime');}
else writeFileSync(target,text);

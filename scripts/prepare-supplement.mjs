import {writeGenerated} from './generated-file.mjs';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const write=(p,s)=>writeGenerated(new URL('../'+p,import.meta.url),s);
function replace(s,a,b){if(s.split(a).length!==2)throw Error('Patch count '+a);return s.replace(a,b);}
let c=read('native/gmp/bridge.c');
c=replace(c,'static int stop_curve(void) {',read('native/gmp/supplement-partition.inc')+'\nstatic int stop_curve(void) {');
c=replace(c,'if (!seed || !read_input(n)) goto done;\n    status=0;', 'if (!seed || seed!=master_seed || !read_input(n)) goto done;\n    status=0;');
c=replace(c,'for (unsigned curve=0;curve<32;curve++) {','for (;cursor<32;) {');
c=replace(c,'        ecm_params p;\n        ecm_init(p);','        unsigned index=cursor; cursor+=lane_count;\n        ecm_params p;\n        ecm_init(p);');
c=replace(c,'mpz_set_ui(p->sigma,6UL+(unsigned long)(random32(&seed)%4294967290U));\n        gmp_randseed_ui(p->rng,seed);','mpz_set_ui(p->sigma,schedule[index]);\n        gmp_randseed_ui(p->rng,schedule[index]);\n        used_mask|=UINT32_C(1)<<index; curves++;');
write('native/gmp/supplement.c',c+'\n'+read('native/gmp/supplement-pm1.inc'));
let sh=read('native/gmp/build.sh');
sh=replace(sh,'/src/native/gmp/bridge.c /src/native/gmp/stage-probe.c -I/src/native/gmp -I.', '/src/native/gmp/supplement.c /src/native/gmp/stage-probe.c -I/src/native/gmp -I.');
sh=replace(sh,'"_input_ptr","_factor_ptr"', '"_configure_partition","_stat_sigma","_stat_used","_stat_curves","_stat_pm1","_pm1_split","_input_ptr","_factor_ptr"');
sh=replace(sh,'/src/native/gmp/bridge.c /src/native/gmp/stage-probe.c -I/src/native/gmp /src/native/gmp/sanitize.c','/src/native/gmp/supplement.c /src/native/gmp/stage-probe.c -I/src/native/gmp /src/native/gmp/sanitize-supplement.c');
write('native/gmp/build-supplement.sh',sh);

import {createHash} from 'node:crypto';
import {patchSiqs} from './patch-siqs.mjs';
const oldPaths=new Set(['include/common.h','include/util.h','common/mp.c','common/prime_sieve.c','mpqs/mpqs.c','mpqs/poly.c','mpqs/relation.c','mpqs/sieve.c','mpqs/sqrt.c','mpqs/sieve_core.c']);
export function patchFullSiqs(path,text) {
 let changes=[];
 const sub=(a,b)=>{const n=text.split(a).length-1;if(n!==1)throw Error('Full SIQS patch '+path+' '+a.slice(0,70)+' '+n);text=text.replace(a,b);changes.push({old:a});};
 if(oldPaths.has(path)){
  const r=patchSiqs(path,text);text=r.text;changes=r.changes;
  if(path==='mpqs/mpqs.c')sub('bits<=128 && params.fb_size<=1024','bits<=332 && params.fb_size<=100000');
  if(path==='mpqs/sqrt.c'){
   sub('large_primes[804]','large_primes[32768]');
   sub('REQUIRE(m<402)','REQUIRE(m<16384)');
   sub('mp_mul_1(a, sieve_offset, &sum.num);','REQUIRE(mp_bits(a)<=384 && mp_bits(&b->num)<=384);\n\t\t\t\tmp_mul_1(a, sieve_offset, &sum.num);');
   sub('fb_counts[relation->fb_offsets[k]]++;','do { REQUIRE(relation->fb_offsets[k]<fb_size && fb_counts[relation->fb_offsets[k]]<UINT32_MAX); fb_counts[relation->fb_offsets[k]]++; } while (0);');
   sub('num_relations = vectors[i].cycle.num_relations;','num_relations = vectors[i].cycle.num_relations; REQUIRE(num_relations<=8192);');
  }
 }
 if(path==='mpqs/sieve.c'){
  sub('\t    \tif (obj->flags & (MSIEVE_FLAG_USE_LOGFILE |',
   '\t\tpublishState(num_relations, conf->num_relations, conf->num_cycles + conf->components - conf->vertices, conf->num_cycles, max_relations);\n\t    \tif (obj->flags & (MSIEVE_FLAG_USE_LOGFILE |');
 }
 if(path==='common/mp.c'){
  sub('void mp_mul(mp_t *a, mp_t *b, mp_t *prod) {','void mp_mul(mp_t *a, mp_t *b, mp_t *prod) {\n REQUIRE(a->nwords<=MAX_MP_WORDS && b->nwords<=MAX_MP_WORDS && a->nwords+b->nwords<=MAX_MP_WORDS);');
  sub('void mp_mul_1(mp_t *a, uint32 b, mp_t *x) {','void mp_mul_1(mp_t *a, uint32 b, mp_t *x) {\n REQUIRE(a->nwords<MAX_MP_WORDS);');
 }
 if(path==='mpqs/gf2.c'){
  sub('reduce_matrix(obj, &nrows, 0, &ncols, cols, NUM_EXTRA_RELATIONS);','reduce_matrix(obj, &nrows, 0, &ncols, cols, NUM_EXTRA_RELATIONS);\n\t*num_cycles = ncols;');
  sub('nrows = fb_size;','nrows = fb_size; REQUIRE(nrows<=100000 && ncols<=150000);');
  sub('weight = qs_merge_relations(accum, buf, weight,','REQUIRE(r->num_factors<=64 && weight<=MAX_COL_WEIGHT-r->num_factors);\n\t\t\tweight = qs_merge_relations(accum, buf, weight,');
  sub('relation_t *r = relation_list + col->cycle.list[j];','REQUIRE(col->cycle.num_relations<=8192 && col->cycle.list[j]<prime_relation_count());\n\t\t\trelation_t *r = relation_list + col->cycle.list[j];');
  sub('col->weight = weight;','prime_add_nnz(weight);\n\t\tcol->weight = weight;');
  sub('*bitfield = dependencies;','prime_verify_full(fb_size,ncols,cycle_list,relation_list,dependencies);\n\t*bitfield = dependencies;');
 }
 if(path==='common/lanczos/lanczos_matmul0.c'){
  sub('free(p->dense_blocks[i]);','free(p->dense_blocks[i]);\n\t\tfree(p->dense_blocks); p->dense_blocks=NULL;');
 }
 if(path==='common/lanczos/lanczos_pre.c'){
  sub('\tc0->cycle.list = (uint32 *)xrealloc(c0->cycle.list, ',
   '\tREQUIRE(c0->cycle.num_relations<=8192 && c1->cycle.num_relations<=8192-c0->cycle.num_relations);\n\tc0->cycle.list = (uint32 *)xrealloc(c0->cycle.list, ');
 }
 if(path==='common/driver.c'){
  const begin=text.indexOf('static uint32 msieve_run_core'),finish=text.indexOf('void add_next_factor',begin);
  if(begin<0||finish<begin)throw Error('Full SIQS patch implicit dispatch');
  text=text.slice(0,begin)+text.slice(finish);changes.push({removed:'unused msieve_run and implicit rho/ECM/NFS dispatch'});
  const start=text.indexOf('uint32 factor_list_add(msieve_obj *obj,');
  const end=text.indexOf('/*--------------------------------------------------------------------*/',start);
  if(start<0||end<start)throw Error('Full SIQS patch collector');
  text=text.slice(0,start)+'uint32 factor_list_add(msieve_obj *obj,factor_list_t *list,mp_t *n) {\n (void)obj;(void)list;return prime_collect(n);\n}\n\n'+text.slice(end);
  changes.push({collector:'nontrivial-divisor-only; no APRCL dispatch'});
 }
 if(!oldPaths.has(path)&&path.endsWith('.c')){
  let polls=0;text=text.replace(/^(\s*)(?:for|while)\s*\([^\n]*\)\s*\{/gm,m=>{polls++;return m+'\n prime_poll();';});
  text=text.replace(/\b1\s*<< /g,'1U << ');changes.push({loopCheckpoints:polls});
 }
 return {text,changes,sha256:createHash('sha256').update(text).digest('hex')};
}
export function patchFullLanczos(text) {
 const changes=[];
 const cut=(a,b,next='')=>{const start=text.indexOf(a),end=text.indexOf(b,start);if(start<0||end<start||text.indexOf(a,start+1)>=0)throw Error('Full Lanczos patch '+a);text=text.slice(0,start)+next+text.slice(end);changes.push({from:a,to:b});};
 const sub=(a,b)=>{if(text.split(a).length!==2)throw Error('Full Lanczos patch '+a);text=text.replace(a,b);changes.push({old:a});};
 cut('static void dump_lanczos_state','static void init_lanczos_state');
 sub('fflush(stderr);','/* Dedicated Worker has no output stream. */');
 cut('\tif (obj->flags & MSIEVE_FLAG_NFS_LA_RESTART) {','\n\tmask1 = 0;', '\tREQUIRE(!(obj->flags & MSIEVE_FLAG_NFS_LA_RESTART));\n\tinit_lanczos_state(obj, packed_matrix, scratch, x, v0, vt_v0, v, vt_a_v, vt_a2_v, winv, packed_matrix->ncols, s, &dim1);\n');
 cut('\n\tif (dump_interval) {','\n\t/* perform the iteration */','\tREQUIRE(dump_interval==0);\n');
 cut('\t\tif (dump_interval) {','\n\t}\n\n\tMPI_NODE_0_START','\t\tif (obj->flags & MSIEVE_FLAG_STOP_SIEVING) break;\n');
 cut('\tif (max_nrows > 1000000) {','\n\t/* solve the matrix */');
 sub('\t\titer++;','\t\titer++; prime_lanczos_iteration();');
 sub('\tdo {\n\t\tdependencies','\tREQUIRE(max_nrows<=100000 && max_ncols<=150000 && obj->num_threads==1);\n\tdo {\n\t\tprime_lanczos_attempt();\n\t\tdependencies');
 let polls=0;text=text.replace(/^(\s*)(?:for|while)\s*\([^\n]*\)\s*\{/gm,m=>{polls++;return m+'\n prime_poll();';});
 text=text.replace(/\b1\s*<< /g,'1U << ');changes.push({loopCheckpoints:polls});
 if(/\b(fopen|fwrite|fread|fflush)\s*\(/.test(text))throw Error('Full Lanczos disk IO remained');
 return {text,changes,sha256:createHash('sha256').update(text).digest('hex')};
}

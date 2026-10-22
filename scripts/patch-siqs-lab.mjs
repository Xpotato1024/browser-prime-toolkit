import {patchFullSiqs,patchFullLanczos} from './patch-full-siqs.mjs';
import {createHash} from 'node:crypto';
export function patchLab(path,original){
 let r=path==='common/lanczos/lanczos.c'?patchFullLanczos(original):patchFullSiqs(path,original),text=r.text;
 const sub=(a,b)=>{if(text.split(a).length!==2)throw Error('Lab patch '+path+' '+a.slice(0,80));text=text.replace(a,b);};
 if(text.includes('#include "mpqs.h"\n'))sub('#include "mpqs.h"\n','#include "mpqs.h"\n#undef TIME1\n#undef TIME2\n#define TIME1(v) lab_probe(LAB_##v,1);\n#define TIME2(v) lab_probe(LAB_##v,0);\n');
 if(path==='mpqs/mpqs.c'){
  sub('REQUIRE(bits>=64 && bits<=332 && params.fb_size<=100000);','REQUIRE(bits>=64 && bits<=332 && params.fb_size<=100000); lab_params(&params);');
  sub('fb_size = params.fb_size; prime_set_fb(fb_size);','fb_size = params.fb_size; prime_set_fb(fb_size); lab_meta(multiplier,fb_size);');
 }
 if(path==='mpqs/sieve.c'){
  sub('char buf[300];','char buf[1024];');
  sub('if (update) {','if (update && lab_mode()==2) prime_fail(STOP_INVALID);\n\tif (update) {');
  sub('/* Read in the large primes for all the relations','if (lab_mode()==2) lab_verify_saved(conf);\n\n\t/* Read in the large primes for all the relations');
  sub('num_relations < max_relations) {','num_relations < max_relations && lab_mode()!=2 && !lab_done()) {');
  sub('i += curr_num_poly;','i += curr_num_poly; if(lab_done())return;');
  sub('/* choose how many full relations to collect before','publishState(num_relations,conf->num_relations,conf->num_cycles+conf->components-conf->vertices,conf->num_cycles,max_relations);\n\n\t/* choose how many full relations to collect before');
  sub('if (relations_found >= max_relations &&','if (lab_mode()!=1 && relations_found >= max_relations &&');
  sub('i = squfof(&res);','lab_probe(LAB_residual_split,1); i = squfof(&res); lab_probe(LAB_residual_split,0);');
 }
 if(path==='mpqs/sieve_core.c')sub('int32 block_start = -(sieve_size / 2) +','if(lab_done())return relations_found;\n\t\t\tint32 block_start = -(sieve_size / 2) +');
 if(path==='mpqs/relation.c')text+=`
void lab_verify_saved(void *value) {
 sieve_conf_t *conf=value; char buf[1024]; unsigned has_a=0,verified=0;
 savefile_open(&conf->obj->savefile,SAVEFILE_READ);
 savefile_read_line(buf,sizeof(buf),&conf->obj->savefile);
 mp_t header; mp_str2mp(buf,&header,16); if(mp_cmp(&header,conf->n))prime_fail(STOP_INVALID);
 while(!savefile_eof(&conf->obj->savefile)){
  savefile_read_line(buf,sizeof(buf),&conf->obj->savefile);
  if(!buf[0])continue;
  if(buf[0]=='A'){read_poly_a(conf,buf);build_derived_poly(conf);has_a=1;}
  else if(buf[0]=='R'){
   relation_t relation; memset(&relation,0,sizeof(relation));
   if(!has_a||read_relation(conf,buf,&relation))prime_fail(STOP_INVALID);
   free(relation.fb_offsets); if(++verified>200000)prime_fail(STOP_CAPACITY);
  }else prime_fail(STOP_INVALID);
 }
 lab_verified(verified);
 savefile_close(&conf->obj->savefile);
}
`;
 return {text,changes:[...r.changes,{lab:true}],sha256:createHash('sha256').update(text).digest('hex')};
}

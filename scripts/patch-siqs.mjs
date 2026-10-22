import { createHash } from 'node:crypto';
export function patchSiqs(path, text) {
  const changes=[];
  const replace=(old,next,count=1)=>{
    const actual=text.split(old).length-1;
    if(actual!==count) throw Error('SIQS patch mismatch '+path+': '+old.slice(0,70)+' ('+actual+')');
    text=text.replaceAll(old,next); changes.push({old,count});
  };
  if(path.endsWith('common.h')) replace('#define LINE_BUF_SIZE 300','#define LINE_BUF_SIZE 1024');
  if(path.endsWith('util.h')) {
    text+='\n#ifdef PRIME_NATIVE_TESTS\n#undef GCC_ASM64A\n#undef GCC_ASM64X\n#undef GCC_ASM32A\n#undef GCC_ASM32X\n#endif\n';
    changes.push({nativePortableArithmetic:true});
  }
  if(path.endsWith('mpqs.c')) {
    replace('fb_size = params.fb_size;','fb_size = params.fb_size; prime_set_fb(fb_size);');
    replace('get_sieve_params(bits, &params);','get_sieve_params(bits, &params);\n\tREQUIRE(bits>=64 && bits<=128 && params.fb_size<=1024);');
    replace('solve_linear_system(obj, fb_size, &bitfield,','prime_set_relations(num_relations);\n\tprime_mark(PH_MATRIX);\n\tsolve_linear_system(obj, fb_size, &bitfield,');
    replace('factor_found = find_factors(obj, n, factor_base, fb_size,','prime_mark(PH_SQRT);\n\t\tfactor_found = find_factors(obj, n, factor_base, fb_size,');
  }
  if(path.endsWith('poly.c')) {
    replace('logprintf(obj, "fatal error: poly selection failed\\n");\n\t\texit(-1);', 'prime_fail(STOP_CAPACITY);');
    replace('conf->num_poly_factors = num_factors;','REQUIRE(num_factors>=2 && num_factors<=16 && num_factors<=MAX_POLY_FACTORS);\n\tconf->num_poly_factors = num_factors; prime_set_poly(num_factors);');
    replace('conf->factor_bits[j] = i;\n\t\tnum_factors++;','REQUIRE(j<MAX_POLY_FACTORS);\n\t\tconf->factor_bits[j] = i;\n\t\tnum_factors++;');
    replace('void build_base_poly(sieve_conf_t *conf) {','void build_base_poly(sieve_conf_t *conf) {\n\tprime_mark(PH_POLY);');
    replace('get_rand(&obj->seed1, &obj->seed2) % range;','get_rand(&obj->seed1, &obj->seed2) % range;\n\t\tREQUIRE(poly_factors[i]<conf->fb_size);');
    replace('uint32 range = factor_bounds[bits+1] - factor_bounds[bits];','REQUIRE(bits<31);\n\t\tuint32 range = factor_bounds[bits+1] - factor_bounds[bits];\n\t\tREQUIRE(range>0 && range<=conf->fb_size);');
  }
  if(path.endsWith('relation.c')) {
    replace('i = sprintf(buf, "R ");','REQUIRE(num_factors<=64);\n\ti = sprintf(buf, "R ");');
    replace('if (fb_offset == 0 || fb_offset >= conf->fb_size)\n\t\t\tcontinue;','if (fb_offset>=conf->fb_size) prime_fail(STOP_INVALID);\n\t\tif (fb_offset==0) continue;');
    replace('poly_factors[i] = j;','do { REQUIRE(j<conf->fb_size); poly_factors[i] = j; } while (0);');
    replace('cycle_list[num_cycles-1].cycle.num_relations);','num_cycles ? cycle_list[num_cycles-1].cycle.num_relations : 0);');
    replace('qs_filter_relations(sieve_conf_t *conf) {','qs_filter_relations(sieve_conf_t *conf) {\n\tprime_mark(PH_RELATION);');
  }
  if(path==='mpqs/sieve.c') {
    replace('mp_copy(&polyval.num, &res);','mp_copy(&polyval.num, &res);\n\tif (mp_is_zero(&res)) return 0;');
    const re=/fb_offsets\[num_factors\+\+\] = ([^;]+);/g;
    const count=[...text.matchAll(re)].length;
    if(count!==13) throw Error('Factor append coverage '+count);
    text=text.replace(re,'do { REQUIRE(num_factors<64); fb_offsets[num_factors++] = $1; } while (0);');
    changes.push({guardedFactorAppends:count});
  }
  if(path.endsWith('sqrt.c')) {
    replace('mp_gcd(&tmp, n, &tmp);','mp_t sx,sy; mp_modmul(&x,&x,n,&sx); mp_modmul(&y,&y,n,&sy);\n\t\tif (mp_cmp(&sx,&sy)) prime_fail(STOP_INVALID);\n\t\tmp_gcd(&tmp, n, &tmp);\n\t\tlogprintf(obj,"gcd=%s\\n",mp_sprintf(&tmp,10,obj->mp_sprintf_buf));');

    replace('uint32 large_primes[200], num_large_primes;','uint32 large_primes[804], num_large_primes;');
    replace('large_primes[2*m] = prime;','REQUIRE(m<402);\n\t\t\t\t\t\tlarge_primes[2*m] = prime;');
    replace('for (j = 0; j < num_large_primes; j++) {','for (j = 0; j < num_large_primes; j++) {\n\t\t\t\tREQUIRE(!(large_primes[2*j+1]&1));');
  }
  if(path.endsWith('sieve_core.c')) {
    replace('for (i = 0; i < num_poly; i++) {','for (i = 0; i < num_poly; i++) {\n\t\tprime_count(2,1);');
    replace('TIME1(tf_plus_scan_time)','prime_mark(PH_SIEVE); prime_count(3,1);\n\tTIME1(tf_plus_scan_time)');
  }
  if(path.endsWith('.c')) {
    let checkpoints=0;
    text=text.replace(/^(\s*)(?:for|while)\s*\([^\n]*\)\s*\{/gm,match=>{
      checkpoints++; return match+'\n\tprime_poll();';
    });
    changes.push({loopCheckpoints:checkpoints});
    text=text.replace(/\b1\s*<< /g,'1U << ');
  }
  return {text, changes, sha256:createHash('sha256').update(text).digest('hex')};
}

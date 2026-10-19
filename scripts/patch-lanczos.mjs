import {createHash} from 'node:crypto';
export function patchLanczos(text) {
  const changes=[];
  const cut=(a,b,next='')=>{
    const start=text.indexOf(a),end=text.indexOf(b,start);
    if(start<0||end<start||text.indexOf(a,start+1)>=0)throw Error('Lanczos region '+a);
    text=text.slice(0,start)+next+text.slice(end);changes.push({from:a,to:b});
  };
  const replace=(a,b)=>{if(text.split(a).length!==2)throw Error('Lanczos patch '+a);text=text.replace(a,b);changes.push({old:a});};
  cut('static uint64 * form_post_lanczos_matrix','static void mul_64x64_64x64',`static uint64 * form_post_lanczos_matrix(msieve_obj *obj,uint32 *rows,uint32 *dense,uint32 cols,la_col_t *a) {
  (void)obj;(void)a;REQUIRE(*rows>=64 && *rows<cols && cols<=1024 && *dense==0);return NULL;
}
`);
  cut('static void dump_lanczos_state','static void init_lanczos_state');
  cut('\tif (obj->flags & MSIEVE_FLAG_NFS_LA_RESTART) {','\n\tmask1 = 0;',`\tREQUIRE(!(obj->flags & MSIEVE_FLAG_NFS_LA_RESTART));
\tinit_lanczos_state(obj, packed_matrix, x, v0, vt_v0, v,
\t\tvt_a_v, vt_a2_v, winv, n, s, &dim1);
`);
  cut('\tfirst_time = time(NULL);','\n\tif (dump_interval)', '\tREQUIRE(n<=1024 && dump_interval==0);\n');
  cut('\t\t/* possibly print a status update */','\n\tlogprintf(obj, "lanczos halted', '\t}\n');
  cut('\tif (ncols > 1000000) {','\n\t/* solve the matrix */');
  replace('\t\titer++;','\t\titer++; prime_lanczos_iteration();');
  replace('\tdo {\n\t\tdependencies', '\tREQUIRE(nrows>=64 && nrows<ncols && ncols<=1024 && num_dense_rows==0);\n\tdo {\n\t\tprime_lanczos_attempt();\n\t\tdependencies');
  let polls=0;
  text=text.replace(/^(\s*)(?:for|while)\s*\([^\n]*\)\s*\{/gm,m=>{polls++;return m+'\n\tprime_poll();';});
  text=text.replace(/\b1\s*<< /g,'1U << ');
  changes.push({loopCheckpoints:polls});
  if(/\b(fopen|fwrite|fread|fprintf|fflush|time)\s*\(/.test(text))throw Error('Lanczos IO remained');
  return {text,changes,sha256:createHash('sha256').update(text).digest('hex')};
}

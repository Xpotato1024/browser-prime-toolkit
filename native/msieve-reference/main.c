#include <common.h>
#include "mpqs.h"
/* Resolve architecture dispatch to the reviewed generic C sieve kernels. */
uint32 qs_core_sieve_k8_64k(sieve_conf_t *c,uint32 s,uint32 n) {return qs_core_sieve_generic_64k(c,s,n);}
uint32 qs_core_sieve_p4_64k(sieve_conf_t *c,uint32 s,uint32 n) {return qs_core_sieve_generic_64k(c,s,n);}
uint32 qs_core_sieve_core_32k(sieve_conf_t *c,uint32 s,uint32 n) {return qs_core_sieve_generic_32k(c,s,n);}
int main(int argc,char **argv) {
    if(argc!=2)return 2;
    mp_t n;mp_str2mp(argv[1],&n,10);
    msieve_obj *obj=msieve_obj_new(argv[1],MSIEVE_FLAG_LOG_TO_STDOUT,"relations.dat",NULL,NULL,
        1,1^0x9e3779b9U,0,0,0,cpu_generic,32768,262144,1,128,0);
    if(!obj)return 3;
    factor_list_t list;factor_list_init(&list);
    unsigned status=factor_mpqs(obj,&n,&list);
    printf("\nREFERENCE_STATUS %u\n",status);
    for(unsigned i=0;i<list.num_factors;i++){
        char out[32*MAX_MP_WORDS+1];
        printf("REFERENCE_FACTOR %s TYPE %u\n",mp_sprintf(&list.final_factors[i]->factor,10,out),list.final_factors[i]->type);
        free(list.final_factors[i]);
    }
    msieve_obj_free(obj);return 0;
}

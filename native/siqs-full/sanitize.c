#include <assert.h>
#include <stdio.h>
#include <string.h>
extern char *large_input_ptr(void);
extern int large_accept(void),large_run(uint32,uint32),large_configure(uint64_t);
extern uint64_t large_native_counter(void);
static uint64_t observed;
static unsigned stop_phase;
static char collected[128];
void largeTick(uint64_t work,unsigned phase){
 if(work>UINT64_C(1000000000000)||phase>6)_Exit(91);
 observed=work;
}
void largePhase(unsigned phase){if(stop_phase==phase)_Exit(82);}
void publishFactor(unsigned type,char *text){
 (void)type;if(strlen(text)>100)_Exit(92);strcpy(collected,text);
}
void publishState(unsigned n,unsigned f,unsigned c,unsigned p,unsigned t){
 if(n>2000000||f>2000000||c>2000000||p>2000000||t>150000)_Exit(93);
}
#define CHECK(x) do{if(!(x)){fprintf(stderr,"check failed: %s:%d %s\n",__FILE__,__LINE__,#x);return 1;}}while(0)
static int force_no_dependencies;
uint64 *__real_block_lanczos(msieve_obj*,uint32,uint32,uint32,uint32,uint32,uint32,uint32,la_col_t*,uint32*);
uint64 *__wrap_block_lanczos(msieve_obj *obj,uint32 rows,uint32 maxrows,uint32 firstrow,uint32 dense,uint32 cols,uint32 maxcols,uint32 firstcol,la_col_t *matrix,uint32 *count){
 if(force_no_dependencies){
  for(uint32 i=0;i<cols;i++){free(matrix[i].data);matrix[i].data=NULL;}
  *count=0;return NULL;
 }
 return __real_block_lanczos(obj,rows,maxrows,firstrow,dense,cols,maxcols,firstcol,matrix,count);
}
static int matrix_probe(int zero_dependencies,unsigned rows,unsigned seed){
 attempts=iterations=nnz=0;
 unsigned count=zero_dependencies?160:3*rows,original_count=count;
 relation_t *relations=calloc(count,sizeof(*relations));
 la_col_t *columns=calloc(count,sizeof(*columns));
 if(!relations||!columns)return 1;
 for(unsigned i=0;i<count;i++){
  unsigned row=i%rows;
  relations[i].num_factors=zero_dependencies?2:row<50?49:1;relations[i].fb_offsets=malloc(49*sizeof(uint32));
  if(zero_dependencies){relations[i].fb_offsets[0]=3;relations[i].fb_offsets[1]=5;}
  else if(row<50){unsigned at=0;for(unsigned j=0;j<50;j++)if(j!=row)relations[i].fb_offsets[at++]=j;}
  else relations[i].fb_offsets[0]=row;
  columns[i].cycle.num_relations=1;columns[i].cycle.list=malloc(sizeof(uint32));columns[i].cycle.list[0]=i;
  if(!zero_dependencies){columns[i].weight=relations[i].num_factors;columns[i].data=malloc(relations[i].num_factors*sizeof(uint32));memcpy(columns[i].data,relations[i].fb_offsets,relations[i].num_factors*sizeof(uint32));}
 }
 msieve_obj obj;memset(&obj,0,sizeof(obj));obj.seed1=seed;obj.seed2=seed^0x9e3779b9U;obj.num_threads=1;obj.cache_size1=32768;obj.cache_size2=1048576;
 prime_set_fb(rows);prime_set_relations(count);uint64 *dependencies=NULL;unsigned nd=0;
 if(zero_dependencies){
  force_no_dependencies=1;solve_linear_system(&obj,rows,&dependencies,relations,columns,&count);force_no_dependencies=0;
 }else{
  dependencies=__wrap_block_lanczos(&obj,rows,rows,0,0,count,count,0,columns,&nd);
  fprintf(stderr,"native returned rows=%u dependencies=%u pointer=%p\n",rows,nd,(void*)dependencies);
  if(!dependencies||nd==0||nd>64){free(dependencies);free_cycle_list(columns,count);for(unsigned i=0;i<original_count;i++)free(relations[i].fb_offsets);free(relations);return 2;}
  uint64 any=0;for(unsigned i=0;i<count;i++)any|=dependencies[i];if(!any)return 3;
  fprintf(stderr,"native raw rows=%u dependency-count=%u first=%llx\n",rows,nd,(unsigned long long)dependencies[0]);
  prime_verify_full(rows,count,columns,relations,dependencies);
 }
 free(dependencies);free_cycle_list(columns,count);
 for(unsigned i=0;i<original_count;i++)free(relations[i].fb_offsets);
 free(relations);
 if(zero_dependencies&&count>=original_count)return 4;
 printf("full native matrix rows=%u compacted=%u/%u dependencies=%u\n",rows,count,original_count,nd);
 return 0;
}
#include "common/lanczos/lanczos.h"
static int packed_multiply_probe(void){
 const uint32 rows=30001,cols=rows+64;
 la_col_t *matrix=calloc(cols,sizeof(*matrix));
 uint64 *x=calloc(cols,sizeof(uint64)),*out=calloc(cols,sizeof(uint64)),*scratch=calloc(cols,sizeof(uint64));
 if(!matrix||!x||!out||!scratch)return 1;
 for(uint32 c=0;c<cols;c++){
  uint32 row=c<rows?c:c-rows;matrix[c].weight=row<64?0:1;matrix[c].data=calloc(matrix[c].weight+2,sizeof(uint32));
  if(row<64)matrix[c].data[row/32]=1U<<(row%32);else matrix[c].data[0]=row;
  x[c]=UINT64_C(0x9e3779b97f4a7c15)*(c+1);
 }
 msieve_obj obj;memset(&obj,0,sizeof(obj));obj.num_threads=1;obj.cache_size1=32768;obj.cache_size2=1048576;
 packed_matrix_t p;memset(&p,0,sizeof(p));
 packed_matrix_init(&obj,&p,matrix,rows,rows,0,cols,cols,0,64,NUM_MEDIUM_ROWS);
 if(p.unpacked_cols)return 2;
 mul_MxN_Nx64(&p,x,out,scratch);
 for(uint32 row=0;row<rows;row++)if(out[row]!=(x[row]^(row<64?x[rows+row]:0)))return 3;
 mul_sym_NxN_Nx64(&p,x,out,scratch);
 for(uint32 c=0;c<cols;c++){uint32 row=c<rows?c:c-rows;if(out[c]!=(x[row]^(row<64?x[rows+row]:0)))return 4;}
 packed_matrix_free(&p);free(matrix);free(x);free(out);free(scratch);
 puts("full native packed M and M-transpose-M: all 30001 rows verified");return 0;
}
int main(int argc,char **argv){
 CHECK(argc>=2);
 char *input=large_input_ptr();
 if(!strcmp(argv[1],"multiply"))return packed_multiply_probe();
 if(!strcmp(argv[1],"no-deps"))return matrix_probe(1,128,1);
 if(!strcmp(argv[1],"post")||!strcmp(argv[1],"packed")){
  unsigned seeds[]={1,11,23,41,67};
  for(unsigned i=0;i<5;i++){int result=matrix_probe(0,!strcmp(argv[1],"post")?10001:30100,seeds[i]);if(!result)return 0;if(result!=2)return result;}
  return 2;
 }
 if(!strcmp(argv[1],"boundary")){
  strcpy(input,"1522605027922533360535618378132637429718068114961380688657908494580122963258952897654000350692006139");
  CHECK(large_accept()==1);
  memset(input,'9',100);input[100]=0;CHECK(large_accept()==0);
  memset(input,'9',128);CHECK(large_accept()==0);
  strcpy(input,"018446744073709551617");CHECK(large_accept()==0);
  strcpy(input,"18446744073709551616");CHECK(large_accept()==0);
  strcpy(input,"18446744073709551617");CHECK(large_accept()==1);
  strcpy(input,"1+18446744073709551617");CHECK(large_accept()==0);
  CHECK(large_configure(UINT64_C(1000000000001))==0);
  CHECK(large_configure(UINT64_C(1000000000000))==1);
 }else if(!strcmp(argv[1],"counter")){
  CHECK(large_native_counter()==UINT64_C(4294969328));
  CHECK(observed==UINT64_C(4294969328));
 }else if(!strcmp(argv[1],"proof")||!strcmp(argv[1],"forged")||!strcmp(argv[1],"row")||!strcmp(argv[1],"cycle")){
  prime_set_fb(100000);prime_set_relations(1);
  uint32 offsets[]={99999,99999},index=0;uint64 dependency=UINT64_C(0x8000000000000001);
  relation_t rel;la_col_t col;memset(&rel,0,sizeof(rel));memset(&col,0,sizeof(col));
  rel.num_factors=2;rel.fb_offsets=offsets;col.cycle.num_relations=1;col.cycle.list=&index;
  if(!strcmp(argv[1],"forged"))rel.num_factors=1;
  if(!strcmp(argv[1],"row"))offsets[0]=100000;
  if(!strcmp(argv[1],"cycle"))col.cycle.num_relations=8193;
  prime_verify_full(100000,1,&col,&rel,&dependency);
  CHECK(!strcmp(argv[1],"proof"));
 }else if(!strcmp(argv[1],"factor")||!strcmp(argv[1],"clock")){
  if(!strcmp(argv[1],"clock")){CHECK(argc==3);stop_phase=(unsigned)atoi(argv[2]);}
  strcpy(input,"1427247692705959880439315947500961989719490561");
  CHECK(large_configure(UINT64_C(1000000000000))==1);
  for(unsigned run=0;run<2;run++){
   collected[0]=0;CHECK(large_run(1,2)==1);
   CHECK(!strcmp(collected,"2305843009213693951")||!strcmp(collected,"618970019642690137449562111"));
  }
 }else return 1;
 printf("full SIQS native %s passed\n",argv[1]);return 0;
}

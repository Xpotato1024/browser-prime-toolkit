#include <stdio.h>
#include <string.h>
static uint64_t received;
static unsigned progress_total,progress_partial;
void largeTick(uint64_t value,unsigned next){if(value>UINT64_C(1000000000000)||next>6)_Exit(91);received++;}
void largePhase(unsigned next){if(next>6)_Exit(92);}
void publishFactor(unsigned type,char *text){(void)type;if(!text||strlen(text)>100)_Exit(93);}
void publishState(unsigned n,unsigned f,unsigned c,unsigned p,unsigned t){(void)f;(void)c;(void)t;progress_total=n;progress_partial=p;}
#define CHECK(x) do{if(!(x)){fprintf(stderr,"lab native check %d: %s\n",__LINE__,#x);return 1;}}while(0)
int main(int argc,char **argv){
 CHECK(argc==2);
 strcpy(large_input_ptr(),"1427247692705959880439315947500961989719490561");
 CHECK(lab_configure(1,1024,1,0,64,1)==1);
 CHECK(large_configure(UINT64_C(1000000000000))==1);
 CHECK(large_run(1,2)==0);
 CHECK(lab_stat(0)==large_work()/1024);
 CHECK(received==lab_stat(0)+lab_stat(1));
 CHECK(lab_stat(2)>0&&lab_stat(3)>0);
 size_t n=large_saved();CHECK(n>100&&n<16U*1024U*1024U);
 char *copy=malloc(n);CHECK(copy!=NULL);memcpy(copy,lab_save_ptr(),n);lab_release();
 if(!strcmp(argv[1],"forged")){
  char *r=strstr(copy,"\nR ");CHECK(r!=NULL);r[3]=r[3]=='1'?'2':'1';
 }else if(!strcmp(argv[1],"header"))copy[0]=copy[0]=='1'?'2':'1';
 CHECK(lab_configure(2,16384,0,0,0,1)==1);
 memcpy(lab_import_ptr(),copy,n);CHECK(lab_import(n)==1);free(copy);
 int found=large_run(1,2);
 CHECK(!strcmp(argv[1],"collect"));
 CHECK(lab_stat(9)>0);CHECK(found==0||found==1);
 CHECK(lab_stat(0)==large_work()/16384);
 lab_release();
 printf("lab native verified=%llu total=%u partial=%u\n",(unsigned long long)lab_stat(9),progress_total,progress_partial);
 return 0;
}

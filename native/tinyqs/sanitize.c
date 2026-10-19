#include "common.h"
#include <assert.h>
#include <tinyqs.c>

extern char *input_ptr(void);
extern char *factor_ptr(void);
extern int split(void);
static int checkpoints;
static int limit = 10000;
int budget_tick(void) { return ++checkpoints < limit; }

int main(int argc, char **argv) {
    tiny_fb reused_roots[MAX_FB_SIZE_TINY];
    mp_t divisible_by_67;
    int found67 = 0;
    memset(reused_roots, 0xa5, sizeof(reused_roots));
    mp_str2mp("67", &divisible_by_67, 10);
    uint32 root_count = init_one_fb_tiny(MAX_FB_SIZE_TINY, &divisible_by_67, reused_roots);
    for (uint32 i = MIN_FB_OFFSET; i < root_count; i++) {
        if (reused_roots[i].prime == 67) {
            assert(reused_roots[i].modsqrt == 0);
            found67 = 1;
        }
    }
    assert(found67);
    tiny_qs_params *params = calloc(1, sizeof(*params));
    mp_t a, b, c;
    tiny_relation sentinel;
    assert(params);
    memset(&sentinel, 0xa5, sizeof(sentinel));
    params->relation_list[1] = sentinel;
    mp_str2mp("1", &a, 10);
    mp_str2mp("33554431", &b, 10);
    mp_clear(&c);
    check_sieve_val_tiny(params, &a, &b, &c, 1, POSITIVE, 0);
    assert(!memcmp(&sentinel, &params->relation_list[1], sizeof(sentinel)));
    free(params);
    limit = 153;
    for (int repeat = 0; repeat < 200; repeat++) {
        strcpy(input_ptr(), "7000000000330000000002223");
        checkpoints = 0;
        assert(split() == 0);
        assert(checkpoints >= limit);
    }
    limit = 10000;
    for (int i = 1; i < argc; i++) {
        assert(strlen(argv[i]) <= 26);
        strcpy(input_ptr(), argv[i]);
        checkpoints = 0;
        int status = split();
        printf("%s %d %s\n", argv[i], status, factor_ptr());
    }
    return 0;
}

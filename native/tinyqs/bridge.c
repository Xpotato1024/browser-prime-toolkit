#include "common.h"

static char input[28];
static char output[28];
char *input_ptr(void) { return input; }
char *factor_ptr(void) { return output; }

int split(void) {
    mp_t n, a, b;
    size_t length = strnlen(input, sizeof(input));
    output[0] = 0;
    if (!length || length > 26 || input[0] == '0') return -1;
    for (size_t i = 0; i < length; i++)
        if (input[i] < '0' || input[i] > '9') return -1;
    mp_str2mp(input, &n, 10);
    if (mp_bits(&n) < 48 || mp_bits(&n) > 85 || !(n.val[0] & 1))
        return -1;
    for (uint32 i = 0, p = 0; i < PRECOMPUTED_NUM_PRIMES; i++) {
        if (!(i % 64) && !budget_tick()) return 0;
        p += prime_delta[i];
        if (mp_mod_1(&n, p) == 0) {
            snprintf(output, sizeof(output), "%u", p);
            return 1;
        }
    }
    mp_clear(&a);
    mp_clear(&b);
    if (!tinyqs(&n, &a, &b)) return 0;
    if (mp_is_zero(&a) || mp_is_one(&a) || mp_cmp(&a, &n) >= 0) return 0;
    mp_mod(&n, &a, &b);
    if (!mp_is_zero(&b)) return 0;
    char scratch[32 * MAX_MP_WORDS + 1];
    char *digits = mp_sprintf(&a, 10, scratch);
    if (strlen(digits) >= sizeof(output)) return -1;
    strcpy(output, digits);
    return 1;
}

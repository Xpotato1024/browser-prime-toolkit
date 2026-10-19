/* Force the same portable C arithmetic paths used by wasm32 for native sanitizers. */
#include <util.h>
#undef GCC_ASM64A
#undef GCC_ASM64X
#undef GCC_ASM32A
#undef GCC_ASM32X

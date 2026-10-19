# ADR 0003: bounded upstream MPQS in WASM
Status: experimental, dependent on PR2; no site integration.
Date: 2026-10-19.

## Decision and source
Compare native BigInt Brent/Floyd with msieve's tinyqs MPQS, rather than
claiming that replacing arithmetic alone improves large-semiprime performance.
Pin radii/msieve at c8727d91305bdbe0972d160ef0ce61dd02ce9193.
Its tinyqs.c states a practical upper limit of 85 bits and describes itself as
old and inefficient. It is not the main SIQS algorithm.
Import only reviewed public-domain tinyqs.c, mp.c, prime_delta.c, mp.h and util.h.
Retain original notices and SHA-256 for both original and imported bytes.
Normalize only the 10 CRLF lines of util.h; all imported files must be UTF-8/LF.
The upstream mp_t is implementation detail; external integers remain BigInt.
No new integer implementation, GMP, ECM, NFS, SIMD or threads are introduced.

## Why and alternatives
Rho and ECM depend strongly on the smaller factor; QS depends on input size.
Use multiple independently generated balanced pairs per size and unbalanced,
square and close-factor controls. Measure distributions, failures and deadlines.
Full msieve SIQS needs GMP and a much larger port; Alpertron is GPL-3.0,
FLINT LGPL-3.0-or-later with GMP/MPFR. They remain candidates for later review.
Do not present this limited MPQS experiment as a solution for arbitrary sizes.
No license for our private application is selected; third-party notices remain.

## Boundary, resource and output contract
Select algorithm tinyqs explicitly; brent remains default.
Preprocess using existing small primes, MR and square recognition.
Use Brent below 48 bits, MPQS from 48 through 85 bits, and return incomplete
with algorithm-range above that bound. Never silently round or truncate input.
C receives canonical decimal bounded to 26 digits and rechecks bit length.
Return a divisor only when 1 < d < n and n % d == 0; classify resulting factors
using existing MR64 / probable policies and independently verify the product.
No factors found within upstream's 20-polynomial limit means algorithm-exhausted.
Budget callbacks at polynomial/sieve-block boundaries bound cooperative work.
An unresponsive C call is stopped by host Worker termination with 100ms grace.
Operation counts are checkpoints, not comparable CPU-work units across methods.
Seed labels are retained for protocol identity; upstream MPQS uses fixed seeds.
Do not interpret MPQS seed repetitions as independent random trials.

## Build and browser
Pin Emscripten 4.0.15 Docker image by SHA-256, compile without network, 2 CPUs,
2GiB memory and explicit reviewed source files streamed as tar on stdin.
No host mounts are used; src/build/work use bounded container tmpfs.
Build twice into fresh directories; compare exact WASM bytes.
Keep source patches minimal and reproducible: compatibility header replaces
GMP-bearing common.h; add budget checkpoints and array/initialization guards, with patches retained.
Use fixed 16MiB WASM memory, 1MiB stack and no growth/filesystem/pthreads.
Embed reviewed WASM base64 in the static Worker bundle, instantiate before ready.
No fetch, remote script, storage, PWA, iframe or runtime updates.
WASM compilation requires wasm-unsafe-eval in the measurement harness only.
The site's current CSP and PR110 are untouched; integration requires later review.
Browser network/CSP audit, cancellation, offline restart and actual Chrome tests
remain mandatory. Report cold initialization separately from warm factorization.

## Primary references
- [Pinned tinyqs](https://github.com/radii/msieve/blob/c8727d91305bdbe0972d160ef0ce61dd02ce9193/common/smallfact/tinyqs.c)
- [msieve build dependencies](https://github.com/radii/msieve/blob/c8727d91305bdbe0972d160ef0ce61dd02ce9193/Makefile)
- [HAC chapter 3](https://cacr.uwaterloo.ca/hac/about/chap3.pdf)
- [Emscripten setup](https://emscripten.org/docs/getting_started/downloads.html)
- [Alpertron source/license](https://github.com/alpertron/calculators)
- [FLINT dependencies/license](https://github.com/flintlib/flint)

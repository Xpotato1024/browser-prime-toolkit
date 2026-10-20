# ADR0015: fixed-source transport recovery and bounded SIQS optimization

Status: private experiment; extend Draft PR13 without changing its 38 measured trials or runtime.
Base: 5d39de05ac3b0732531c7cd1ad98225eaf24fdc4.

CI's push full-siqs/lab failures occurred before compilation: curl(28), gmplib.org:443 connection timeout after three existing attempts. PR CI later succeeded with the same source identity. LLM-01 also observed a truncated HTTP200 transfer from the origin. This is evidence of transport instability, not a demonstrated compiler/runtime failure or approval refusal.

Keep the old source manifest, fetch script and measured build/source receipts unchanged. Add a separate reviewed transport helper: original URL first, then GNU's official archive for the same gmp-6.1.2.tar.lz, at most two attempts per file. Pin 1939430 bytes and SHA256 12fed0532d440d2dc902e64f016aa89a33af6044b90bd1f7bca7396635105dbb. Verify cache/download before use; never continue after bad size/hash or TLS/certificate refusal. HTTPS/TLS, bounded time, bounded download and exclusive publication remain mandatory. No mirrors selected dynamically.

The GNU directory exposes this exact release file; a fresh LLM-01 download matched both existing pins. The official 6.1.2 announcement also names GNU distribution: https://gmplib.org/list-archives/gmp-announce/2016-December/000047.html . CI uses the new helper, while historical build inputs retain their previous hashes.

Performance work starts from the measured small-sieve/bucket and notification costs. The first compiler candidate adds LTO to the existing flags, source and memory profile. The upstream Makefile compiles msieve at -O3 and uses CFLAGS in its final link command; GMP remains -O2. Keep all original arithmetic, checkpoints and proof logic. This is one build-mode comparison, not a new mathematical algorithm.

Use separate optimized artifacts and harness paths. Run the same real-WASM 12 safety contracts and fixed-work same-seed saved-byte/graph/native-proof equivalence, with alternating order and fresh initialization. Preserve all failed candidates. Monitoring comparisons retain required finite work polling and the independent host deadline. Same total wall/work ceilings and a common 512MiB managed-WASM ceiling apply to one/two-Worker controls; actual one/two ownership differs and browser RAM stays sampled.

Freeze each performance plan before measurement. Short comparisons precede any longer RSA100 run. Any longer trial has an explicit initialization-inclusive deadline and finite aggregate work allowance, cancellation/retirement, no runtime communication and recorded censoring. No extrapolated RSA100 ETA, production selection, Ready, merge, release, deployment or site integration is authorized by this experiment.

The frozen Stage15 plan is [28 trials](../../bench/staged-siqs-opt-plan.json): 24 short equal-work compiler × monitoring × one/two-Worker comparisons, followed by four predeclared RSA100 trials at 60000ms and aggregate work ceiling 1000000000000. Long trials compare base/base against LTO/stride16384 in ABBA order: this is a combined compiler and notification candidate. The preceding short factorial trials separate the two effects. No result-dependent candidate selection is used. New protocol version15 and copied wrappers permit at most 60s; old version14 contracts/artifacts remain unchanged. Actual new-artifact tests reject larger horizons, traps and poisoned reuse.

# DLP cutoff: fixed browser evaluation

The fixed measurement head is dc0458547b2d104eff31af6b39074281ecb4c210. The original b2e38bb4 baseline, its raw data and source remain unchanged. This series compares three separately instrumented profiles with the same compiler and safety limits. The binary is 417867 bytes, SHA-256 c9fc84ce31f1c8ac92cfa44e0ce77521d419abc87570d762e326974ed313bd13, reproduced by two clean builds.

Screen: no-reproducible-short-improvement; long candidate: none. Final evaluation: no-short-candidate; adopted for evaluation: false. RSA-100 completed in these trials: none. This does not select or release a product engine.

| Trial | Request s | Outcome | Usable/target | Full+cycles | SLP/DLP ingested | Vertices/tree edges | Submitted polynomials | Requested peak bytes per owner | Linear peak bytes per owner | Chrome PSS MiB |
| --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: |
| short-baseline-w1-r1 | 60.001 | timeout/time-budget | 169/116512 | 169+0 | 2139/6665 | 15407/8804 | 12288 | 15218233 | 18546688 | 438.4 |
| short-half-w1-r1 | 60.001 | timeout/time-budget | 169/116512 | 169+0 | 2137/5535 | 13153/7672 | 12288 | 14990544 | 16711680 | 437.5 |
| short-quarter-w1-r1 | 60.001 | timeout/time-budget | 169/116512 | 169+0 | 2133/4411 | 10912/6544 | 12288 | 14638767 | 18546688 | 437.7 |
| short-quarter-w2-r1 | 60.001 | timeout/time-budget | 273/116512 | 271+2 | 3501/7291 | 17968/10790 | 20480 | 15241972+11895905 | 18546688+13369344 | 477.1 |
| short-half-w2-r1 | 60.001 | timeout/time-budget | 273/116512 | 271+2 | 3507/9189 | 21748/12694 | 20480 | 15522211+11991570 | 17104896+13369344 | 466.5 |
| short-baseline-w2-r1 | 60.001 | timeout/time-budget | 323/116512 | 320+3 | 4175/13317 | 30590/17489 | 24576 | 18347349+12066116 | 23724032+13369344 | 473.2 |
| short-quarter-w1-r2 | 60.001 | timeout/time-budget | 169/116512 | 169+0 | 2133/4411 | 10912/6544 | 12288 | 14638767 | 18546688 | 438.3 |
| short-half-w1-r2 | 60.001 | timeout/time-budget | 169/116512 | 169+0 | 2137/5535 | 13153/7672 | 12288 | 14990544 | 16711680 | 438.7 |
| short-baseline-w1-r2 | 60.001 | timeout/time-budget | 169/116512 | 169+0 | 2139/6665 | 15407/8804 | 12288 | 15218233 | 18546688 | 437.9 |
| short-baseline-w2-r2 | 60.001 | timeout/time-budget | 323/116512 | 320+3 | 4175/13317 | 30590/17489 | 24576 | 18347349+12066116 | 23724032+13369344 | 476.1 |
| short-half-w2-r2 | 60.001 | timeout/time-budget | 273/116512 | 271+2 | 3507/9189 | 21748/12694 | 20480 | 15548810+11970671 | 18546688+13369344 | 470.7 |
| short-quarter-w2-r2 | 60.001 | timeout/time-budget | 273/116512 | 271+2 | 3501/7291 | 17968/10790 | 20480 | 15241972+11895905 | 18546688+13369344 | 472.5 |

Selection uses only acknowledged contiguous submitted-prefix usable columns: full+cycles. Raw rows, total DLPs and work interrupted before delivery do not qualify. Both two-Worker repeat ratios must reach1.15 and both one-Worker ratios0.90; ranking uses exact integer cross-products. The conditional long ABBA gate requires both candidate yields at least1.15 times the maximum baseline long yield. The summary preserves all paired ratios and decisions.

B=3250000, half-interval524288, single large-prime145B, threshold offset-23 and2048-pattern families are fixed. Baseline/half/quarter accept product limits1035B²/512B²/256B². The existing threshold formula automatically derives lp_bits54/53/52; this coupled effect is part of each DLP condition. There is no independent threshold sweep.

Each short profile/worker combination has only two fixed-order observations on one PC. Early graph growth is nonlinear and a short screen does not establish long-horizon performance. No profile passed the short gate, so all600-second comparisons remain unmeasured and the series closes without adoption. No RSA completion time is extrapolated. Preparation, controls, reviews and CI are separate from the maximum52-minute numeric allocation.

Timing: short 2026-10-20T12:38:59.549Z to 2026-10-20T12:51:30.580Z. Summed bounded request time is 720.011 seconds. See the evidence manifest for separately recorded preparation timing.

## Last-delivered cumulative wrapper phases

Values below are seconds. Native sieve includes serialization; submit includes native graph ingestion. These wrappers do not isolate filter, Lanczos or individual CPU instructions. An interrupted call can leave undelivered timing or graph data. The coordinator submit counters correspond to acknowledged input prefixes.

| Trial | Owner | Prepare | Sieve/serialize | Copy/free | Framing | Submit/graph | Observe | Extract |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| short-baseline-w1-r1 | 0 | 0.343 | 48.626 | 0.002 | 0.035 | 0.076 | 0.000 | 0.000 |
| short-half-w1-r1 | 0 | 0.333 | 47.722 | 0.002 | 0.028 | 0.075 | 0.000 | 0.000 |
| short-quarter-w1-r1 | 0 | 0.343 | 46.728 | 0.001 | 0.025 | 0.075 | 0.000 | 0.000 |
| short-quarter-w2-r1 | 0 | 0.543 | 47.169 | 0.001 | 0.036 | 0.140 | 0.000 | 0.000 |
| short-quarter-w2-r1 | 1 | 0.530 | 31.847 | 0.001 | 0.011 | 0.000 | 0.000 | 0.000 |
| short-half-w2-r1 | 0 | 0.615 | 48.281 | 0.002 | 0.039 | 0.138 | 0.000 | 0.000 |
| short-half-w2-r1 | 1 | 0.617 | 32.436 | 0.001 | 0.012 | 0.000 | 0.000 | 0.000 |
| short-baseline-w2-r1 | 0 | 0.485 | 49.795 | 0.001 | 0.044 | 0.162 | 0.000 | 0.000 |
| short-baseline-w2-r1 | 1 | 0.497 | 49.607 | 0.002 | 0.020 | 0.000 | 0.000 | 0.000 |
| short-quarter-w1-r2 | 0 | 0.342 | 46.712 | 0.001 | 0.027 | 0.074 | 0.000 | 0.000 |
| short-half-w1-r2 | 0 | 0.343 | 47.682 | 0.001 | 0.032 | 0.076 | 0.000 | 0.000 |
| short-baseline-w1-r2 | 0 | 0.338 | 48.526 | 0.001 | 0.034 | 0.075 | 0.000 | 0.000 |
| short-baseline-w2-r2 | 0 | 0.503 | 49.597 | 0.001 | 0.046 | 0.162 | 0.001 | 0.000 |
| short-baseline-w2-r2 | 1 | 0.495 | 49.477 | 0.002 | 0.019 | 0.000 | 0.000 | 0.000 |
| short-half-w2-r2 | 0 | 0.496 | 48.351 | 0.001 | 0.034 | 0.140 | 0.000 | 0.000 |
| short-half-w2-r2 | 1 | 0.508 | 32.787 | 0.001 | 0.014 | 0.000 | 0.000 | 0.000 |
| short-quarter-w2-r2 | 0 | 0.507 | 47.161 | 0.002 | 0.030 | 0.138 | 0.000 | 0.000 |
| short-quarter-w2-r2 | 1 | 0.517 | 31.979 | 0.001 | 0.009 | 0.000 | 0.000 | 0.000 |

Each owner uses unshared bounded-growth WASM memory, initial17pages and maximum256MiB. At most two owners give a512MiB total linear-memory cap. Requested allocator peaks exclude metadata, fragmentation, stack/static and JS/Chrome; per-owner high-water values need not be simultaneous. Freeing memory does not shrink the linear buffer. Chrome-tree sampled PSS/RSS is a separate whole-process observation, and summed RSS may count shared pages repeatedly. No capacity increase is called a resource saving.

All measured runs shut down the asset server, disable cache and go CDP-offline before calculation; observed calculation communication is zero and positive detector controls pass afterward. Every Worker and Blob source is retired/released. Any completed factorization retains independent factor-product/MR checks and probable status. Native RSA packet tests cover all three actual330-bit configurations and collector conservation before measurement.

[All short invocations](staged-dlp-stage18/short-run.json), [summary](llm01-dlp-summary.json), [contract](../contracts/dlp-evaluation.md), [TDD/evidence](../operations/stage18-tdd-evidence.md) and [hashed validation manifest](archive/validation-logs/staged-dlp-stage18/manifest.json) preserve failures and negative outcomes. The generator verifies current sources against immutable measured Git blobs, raw/log hashes, all safety boundaries and the exact gate. Ready, merge, release, deployment and site integration remain separate.

# rusqsieve 0.5.0 SIMD: fixed browser comparison

Static disassembly of the pinned artifact confirms SIMD opcodes; this is not an isolated SIMD speed comparison.

The fixed 14 trials used commit `0999af2b90f458d5c6808128793f831e5e7182f2`, the reviewed 0.5.0 source and two identical clean builds. RSA-100 completed in these conditions: none. No completion time is extrapolated from incomplete collection.

| Trial | Request wall s | Outcome | Submitted/issued families | Usable/target relations | Observed linear max bytes per owner | Observed requested heap max bytes per owner | Sampled Chrome PSS MiB |
| --- | ---: | --- | ---: | ---: | --- | --- | ---: |
| control-40-one-copy | 0.363 | probable/— | 10/10 | 2829/2162 | 9568256 | 7498009 | 430.4 |
| control-40-one-drop | 0.341 | probable/— | 10/10 | 2829/2162 | 9437184 | 7498009 | 429.7 |
| control-40-two-copy | 0.319 | probable/— | 12/12 | 3533/2162 | 10485760+2097152 | 8368577+811154 | 449.2 |
| control-40-two-drop | 0.335 | probable/— | 12/12 | 3533/2162 | 10420224+2097152 | 8368577+811154 | 450.6 |
| control-64-one-copy | 9.938 | probable/— | 360/360 | 6550/6510 | 34734080 | 32947554 | 455.2 |
| control-64-one-drop | 9.697 | probable/— | 360/360 | 6550/6510 | 34734080 | 32947554 | 452.2 |
| control-64-one-retain | 10.017 | probable/— | 360/360 | 6550/6510 | 34996224 | 33163386 | 453.5 |
| control-64-two-copy | 6.142 | probable/— | 360/360 | 6550/6510 | 34865152+2031616 | 32947554+768022 | 472.5 |
| control-64-two-drop | 5.151 | probable/— | 360/360 | 6550/6510 | 34734080+2031616 | 32947554+765686 | 471.7 |
| control-64-two-retain | 5.672 | probable/— | 360/360 | 6550/6510 | 34996224+2031616 | 33163386+765305 | 473.6 |
| rsa100-60s-two-copy | 60.001 | timeout/time-budget | 12/16 | 323/116512 | 24182784+13369344 | 22191969+12066116 | 478.5 |
| rsa100-60s-two-drop | 60.001 | timeout/time-budget | 10/14 | 273/116512 | 23724032+13369344 | 17500565+12049988 | 471.5 |
| rsa100-600s-one-drop | 600.001 | timeout/time-budget | 72/74 | 1936/116512 | 67633152 | 64929635 | 485.0 |
| rsa100-600s-two-drop | 600.001 | timeout/time-budget | 132/136 | 3672/116512 | 117309440+13369344 | 112948377+12087913 | 544.2 |

The initial RSA-100 coordinator requested heap fell from 7690360 to 3845612 bytes with sharing. However the 64-digit whole-request heap high-water was 32947554 bytes for both copy and sharing; retain used 33163386. Sharing did not improve every measured quantity: the 60-second shared run submitted10 families versus12 for copy. These are retained negative/limited results, not a general throughput win.

All ten 40/64-digit controls passed exact factor-product and post-retirement oracle checks before RSA trials started. Probable-prime status remains probable. The adapter makes one typed extraction attempt and does not silently add upstream rho/ECM or native-thread algorithms.

copy versus drop isolates sharing the immutable same-WASM factor base/context. copy versus retain isolates dropping the local context before extraction. drop versus retain changes both settings and is not an isolated retention comparison. Fixed ordering and one observation per condition limit interpretation. Family counts are not C checkpoint work or CPU instructions. Conditions with different family counts are not equal-work speed comparisons.

Each actual owner has unshared bounded-growth memory: initial17pages and maximum256MiB, at most two owners and512MiB total linear-memory maximum. Requested-live/peak excludes allocator metadata, fragmentation, stack/static and JS/Chrome. Per-owner maxima are observed high-water snapshots, not simultaneous whole-system peaks; an interrupted native call may have undelivered telemetry. Freeing contexts does not shrink linear memory. Sampled Chrome-tree PSS/RSS is separate, and summed RSS can count shared pages repeatedly. No capacity was increased as a memory optimization.

All measured requests ran after asset-server shutdown with CDP offline/cache disabled and zero network requests; positive audit controls passed afterward. Every owner and Blob source was retired/released. All original raw, logs, source hashes and negative outcomes remain preserved.

[Raw invocation](staged-rusqsieve-stage17/run-all.json), [summary](llm01-rusqsieve-summary.json), and [contract/TDD evidence](archive/validation-logs/staged-rusqsieve-stage17/manifest.json) are verified by this generated report. These measurements preceded the separate public-repository/CI authorization. Current verification is tracked by the PR checks; this report does not authorize Ready/merge/release/deployment or site integration.

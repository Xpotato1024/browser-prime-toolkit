# Scheduler and geometry findings

The paired Stage19 comparison supports finite ahead credit as a collection experiment. It does not change the public/default runner. The native kernel and all common family bytes/prefix counters are unchanged.

For two owners, credit1 produced usable376/376 against batch2's323/273, meeting the predeclared10% gate in both repeats. One owner produced199/199 against169/169. Batch1 alone did not meet the gate: two-owner344/323 and blocked idle8.20s/16.22s. Batch2's second repeat had16.10s blocked idle. Credit1's blocked idle was zero in both repeats, although one packet waited8.11s for ACK while the producer performed ahead work. Return-to-ACK time, blocked idle and assigned-job occupancy therefore describe different things; occupancy is not measured CPU utilization.

The same-family proof isolates scheduling from mathematical settings. A two-family native call also exposes fewer checkpoints before a fixed deadline than a one-family call. These results establish bounded collection/progress behavior, not an end-to-end completion speedup.

Stage20 then held credit1 fixed and tested only the declared Rust B/M2×2. None met both15% target-normalized gates. Retain the original B3.25M/halfwidth524288 for the next experiment. All negative results and source-bound raw/log evidence remain in the generated [scheduler](../benchmarks/llm01-scheduler.md) and [geometry](../benchmarks/llm01-geometry.md) reports.

Geometry timing includes a new64-family A observation during initialization. Observed initialization was about2.03–3.83s, leaving about56.17–57.97s for collection. The geometry baseline therefore has its own paired trials; its usable323/295 must not be treated as the same instrumented throughput experiment as Stage19's376/376. Native baseline family bytes/counters match across the stages. The A samples are quantized observations, and changing B also changes LP bounds, lp_bits and target. The grid does not separately identify each component's causal contribution.

Neither stage reaches the RSA-100 target or measures filtering, near-target linear algebra and extraction. No ten-minute completion claim or linear extrapolation from60-second usable counts is supported. Two repetitions are a bounded screen rather than a broad statistical performance study. Do not expand to longer runs or a larger parameter search based only on these results.

## Test and source boundary

Local Node tests use actual embedded WASM for named configuration/native packet ingestion as well as fake-worker failure/deadline contracts. Real Chrome155 is controlled through CDP, without Playwright; actual Blob Workers/WASM run after the local asset server stops, with cache disabled and offline/page/Worker network audits and positive detector controls. Exact divisor/product checks and primality assessment remain independent of the native engine. Factor oracles are not delivered to workers.

The Rust geometry artifact has two local clean byte-identical fenced builds. GitHub CI verifies the pinned source/artifact receipts and executes the checked-in WASM in native-API Node tests and real-browser contracts; the new CI job does not independently rebuild the producer-specific Rust image. The source offer supplies the exact patch/build/runtime sources and pinned toolchain inputs so another producer can recreate it and retain a separate receipt.

## Xpotato-site boundary

This is an independent calculation engine intended for a possible Xpotato-site tool, not completed site-plugin integration. The [site adapter](../contracts/site-adapter.md) is a proposal tied to its documented historical site revision. Current site production behavior was not reverified or changed in these stages.

A separately reviewed adapter/profile is still required for long-lived Workers/WASM, computation limits, CSP and source/license acceptance. The site's existing policy must not be weakened during a general documentation or tool cleanup. No site E2E, production route, public default, Ready/merge/release/deploy or credential/permission change occurred in these experiments.

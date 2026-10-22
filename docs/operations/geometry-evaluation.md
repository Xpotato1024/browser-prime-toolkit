# Conditional geometry evaluation

Read the [contract](../contracts/geometry-evaluation.md) and frozen plan before running. Stage19 must have a completed, source-bound credit1 gate before this series can start.

The separate native patch uses existing FactorTuning fields for four named B/M profiles only. LP formulas and the native lp_bits coupling remain upstream. Actual context telemetry includes B/M, native accepted LP limits, factor-base size/target, k/Q2, target-A bits, pool sizes, factor count/variants and64 deterministic quantized A samples.

The original pinned crate/Rust image and container compile fence are reused. Run `PRIME_RUS_SOURCE_DIR=/verified/source node scripts/build-rusqsieve-geometry.mjs` for two clean builds, then generate the host/Worker sources. No source cache or tool binary belongs in the repository. The original Stage19 kernel/scheduler/measurements stay unchanged.

`npm test` runs four-profile native configuration and actual RSA-family ingestion tests. The unchanged geometry must emit the exact Stage19 family-body SHA. `node scripts/check-geometry.mjs` checks build/source/memory preservation, generated protocol, fixed plan and asset boundary.

`node scripts/verify-geometry.mjs --profile b250-m262 --engine two-drop --out /new/receipt.json` runs sixteen real-Chrome contracts. `node scripts/benchmark-geometry.mjs` requires a clean committed measured tree, validates the Stage19 prerequisite, runs all four browser contract configurations and then exactly eight60-second trials with exclusive raw/log outputs. It stops on harness failure and cannot overwrite or resume a campaign. No other heavy test/build runs during timing.

`node scripts/report-geometry.mjs` checks source and raw/log hashes, configuration/target/resource bounds, equal-family/prefix counters within each geometry and the unchanged native baseline, then generates the report. `--check` compares it. The gate uses exact paired usable/target ratios, both repetitions and conservative tie handling.

The same offline asset-server shutdown, cache disable, page/Worker CDP audits, detector positive controls, retirement, memory accounting and factor verification apply as in Stage19. Native timing censors active calls; host occupancy is not CPU utilization; sampled Chrome RSS/PSS differs from requested allocator sizes and WASM linear memory.

Only a provisional collection candidate can result. Site production integration, runtime defaults, merge, release, deploy and a claim that RSA-100 completes within ten minutes remain outside this experiment.

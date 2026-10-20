# Fixed Rust geometry comparison artifact

This separate artifact derives from the same rusqsieve0.5.0 crate and commit as [Stage17](../rusqsieve/README.md). Read its source manifest, original license texts and Rust runtime notices there. No upstream dependency or license is replaced. Local changes remain AGPL-3.0-only; upstream code retains Apache-2.0 OR MPL-2.0, with Apache-2.0 selected for comparison.

The [build receipt](staged-build.json) binds the exact crate, pinned Rust image, bounded compiler command, all patch/build sources, compiled-source hashes and two byte-identical clean outputs. [The patch](patch-source.mjs) first applies the retained Stage18 observer, then adds only four named B/M settings for321..333bit and bounded context observation. It records the actual selected factor-base bound and reads existing multiplier/Q2/A selection without changing it. LP145/1035 and lp_bits/threshold coupling remain upstream.

Build with `PRIME_RUS_SOURCE_DIR=/verified/source node scripts/build-rusqsieve-geometry.mjs`, then `node scripts/generate-geometry-runner.mjs` and `node scripts/build-geometry-worker.mjs`. The source cache stays outside the repository. Compilation inherits the existing network-none,2CPU,2GiB,128pid,cap-drop,no-new-privileges/no-host-mount container fence. Original Stage18 WASM and Stage19 scheduler artifacts remain unchanged.

The artifact is an independent bounded evaluation, not an adopted site plugin or release. See the [frozen geometry contract](../../docs/contracts/geometry-evaluation.md).

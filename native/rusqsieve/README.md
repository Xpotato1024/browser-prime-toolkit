# rusqsieve 0.5.0 private comparison

Upstream: https://github.com/metastable-void/rusqsieve/tree/4b150834b57636f6ebc350a81321a15c1cd901d2
The signed release tag, crate VCS record and source hashes identify this commit. See staged-upstream.json. Upstream offers Apache-2.0 OR MPL-2.0; the comparison selects Apache-2.0 and preserves both original license texts. Original local observer/adapter code is AGPL-3.0-only, copyright 2026 Xpotato.net / Xpotato1024. No upstream-wide relicensing is asserted.

Rust 1.90.0 and wasm32 std are fixed by official manifest/component hashes in staged-toolchain.json. RustDockerfile installs those verified archives into the existing pinned emsdk base without network. The local compiler image ID in staged-build.json identifies this PC build. Rust compiler/sysroot notices copied from the original archives are indexed under toolchain-notices/. Do not commit compiler archives or executables.

Rebuild on LLM-01: materialize the pinned crate outside this repository, validate its complete file receipt, and set PRIME_RUS_SOURCE_DIR to that source directory. Run node scripts/build-rusqsieve.mjs --check and node scripts/build-rusqsieve-worker.mjs --check. Each check compiles twice in network-none, 2 CPU, 2GiB, pids128, cap-drop/no-new-privileges containers with no host mounts. For another machine, first recreate the toolchain using the exact official components/RustDockerfile and review the resulting local image identity; this local image ID is not a published registry image.

Direct rustc compiles lib-only with no native cli/rand features or Cargo dependency resolution; upstream cfg-gates optional rand to native targets. SIMD, edition2024, O3/fatLTO, one codegen unit, panic-abort, stripped link and max256MiB are explicit. This is a source rebuild with known toolchain, not a claim to reproduce upstream's differently built distributed WASM.

Local patches add requested-allocation counters, typed extraction status, exact FB-length query, and a clone of the coordinator's immutable Arc<Context> into the same-WASM local registry. Scratch/collector/relation graphs are not shared. Original arithmetic is unchanged. The native family budget is queried per input. The coordinator and helper each have one unshared bounded-growth memory, initial17pages and max4096pages; two actual owners total at most512MiB of linear memory.

Host allocation/transport, Chrome RAM, allocator overhead/fragmentation, stack/static data are separate from requested-live/peak counters. Linear memory cannot shrink after freeing allocations. Freeing contexts may lower live bytes or later peak demand without lowering reserved/grown memory immediately.

The performance adapter performs one extraction attempt with typed failures and a finite family/time budget. It does not automatically add upstream rho/ECM or native thread algorithms. No public UI, release, deployment or site integration is included.

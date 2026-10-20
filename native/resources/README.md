# Reviewed role memory artifacts

Stage21 uses the identical compiled source set and byte-identical WASM code section of [Stage18](../rusqsieve-dlp/README.md), with only the linker memory maximum varied. No new dependency or upstream patch. The original256MiB module remains unchanged.

| Hardcap | Bytes | SHA256 |
| --- | ---: | --- |
| 64 MiB | 417867 | `a51ff35df9720f0f30892c727e3cfa0b1deb95b6cf7cfebc6a7bb6d624aa6b42` |
| 128 MiB | 417867 | `6de242f3a7c204610394969a1e8ef1215f882a076b85f49284bdb690c1f120a1` |

Each artifact has two equal clean builds using the original pinned image/toolchain, no network or dependency resolution. Exact arguments, source hashes and compiled-source hashes are in build-64.json and build-128.json. Run PRIME_RUS_SOURCE_DIR=/absolute/reviewed/source node scripts/build-resource-wasm.mjs 64 (or128) from the repository root; receipts are reproducible. The runtime checks the selected module memory section and ready role/cap before dispatch, and checks actual linear memory against the role maximum.

The minimum initial memory is17 WASM pages (1,114,112 bytes), not the maximum. Unknown device free RAM is never allocation-probed. A finite negative test requests the known module maximum once and verifies recorded allocator refusal plus trap retirement; this is not free-RAM discovery.

Upstream remains Apache-2.0 OR MPL-2.0; observer/adapter remains AGPL-3.0-only. Retain [upstream source and license mappings](../rusqsieve/README.md), original notices and prior fixed-source receipts. Generated Worker bundles inline only these reviewed artifacts and the original adapters. No CDN or runtime remote code.

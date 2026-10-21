# Bounded extraction allocation guard

This is an experiment derived from the reviewed LP map + varint powers + terminal-release engine. Upstream rusqsieve0.5.0 remains Apache-2.0 OR MPL-2.0; local observer/adapter/quota additions are AGPL-3.0-only. See [upstream notices](../rusqsieve/README.md), [source offer](../../SOURCE_OFFER.md) and [contract](../../docs/contracts/long-window.md).

Upstream commit: `4b150834b57636f6ebc350a81321a15c1cd901d2`. The archive SHA and every source file are fixed by [staged-upstream.json](../rusqsieve/staged-upstream.json). Rust1.90.0, SIMD128, O3/fatLTO, unshared memory and the Docker image digest are recorded in the receipt. No dependency resolution or network is used during compilation.

With the verified upstream cache outside the repository:

```sh
PRIME_RUS_SOURCE_DIR=/absolute/verified/source node scripts/build-long-window.mjs 256 --check
node scripts/check-long-window.mjs
node --test test/long-window-*.test.js
```

The256MiB artifact has two identical clean builds,439916bytes, SHA256 `56bbfc06947ae631a1c3c984ef9bcb97fb90e1325ab160da3d93b7ea91d66974`. [Receipt](build-long-256.json) binds all patches, observer, flags, compiled sources and memory exports. The Stage37 API does not accept a1024MiB role. Stage38 builds that separate named variant: [receipt](build-long-1024.json), [finite wide contract](../../docs/contracts/wide-window.md). Its initial memory remains small; the1GiB value is an unshared WASM hard maximum, not an eager physical allocation.

The scope begins before extraction matrix allocation, after terminal collection release. Checked preflight CSR/CSC payload is only a lower-bound test; subsequent allocation/zeroed/reallocation calls share the quota. Requested heap, linear precheck and actual WASM hardmax are distinct. The linear estimate is not a proof of allocator growth or process RSS.

A Rust allocation abort leaves the instance quarantined. Read only nonallocating scalar diagnostics, then terminate the Worker. Do not free sessions or reuse that instance. The host classifies quota failure only in the extraction phase with a matching Native refusal flag and allocation-failure evidence; unknown traps retain their fatal meaning. Twenty-four fixed scalar rows describe matrix stages without allocating diagnostic buffers.

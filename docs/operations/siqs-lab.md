# SIQS lab operation and measurement contract

This is a private diagnostic runtime. It is separate from full-siqs and the private UI; no site adapter or published selector calls it.

Run `node scripts/generate-siqs-lab-runtime.mjs` when editing the C template, `npm run build:siqs-lab` for two offline clean builds, then `npm run build:siqs-lab-worker`. Verification uses the corresponding `--check` commands, `npm run verify:siqs-lab-native` and `npm run verify:siqs-lab`. The lab CI job runs each check explicitly so npm argument forwarding cannot turn a check into artifact generation.

The fixed plan is bench/siqs-lab-plan.json. Commit the measured implementation before `npm run benchmark:siqs-lab -- --stage all --out-dir docs/benchmarks/staged-siqs-lab-stage14`. Each trial uses a fresh Chrome process and local assets, then stops the asset server and goes offline. Outputs refuse overwrite; any failed process retains its log and available raw receipt. No trial exceeds 15 seconds of requested computation time. Process startup and detector positive controls are outside this request budget.

The host deadline includes Worker initialization, compilation, collection, message delivery and fresh merging. Collection receives 80% of the total work ceiling. Two-stream lanes split that allowance; one Worker executes both sequentially, two Workers execute them concurrently. Both use seeds 1 and 11. Unknown terminated work consumes its entire allowance in accounting. The remaining total allowance belongs to postprocessing. Graph traversal work and native loop work are distinct instrumented units, never CPU instruction counts.

Native finite-work checks remain on every original poll even when C-to-JS notifications are reduced. The independent host timer retires non-cooperative Workers. Clock gating, callback stride, optional counters, coarse C probes and browser RAM sampling each have explicit conditions. Mandatory polling and CDP audit costs are common; the experiment does not measure an entirely uninstrumented implementation.

Saved records retain canonical A factor indices, signed offset and local derived polynomial index. Metadata binds input, multiplier, factor-base size, parameter version and WASM build. The same deterministic build/input/settings regenerate the ordered factor base. Exact identity replays are dropped; conflicting payloads are fatal. A known stop between the header body and LF is carried separately and cannot enter the merger. Other malformed/truncated records are rejected.

Every unique imported relation is checked by the original native relation reader against its regenerated polynomial. The merger builds one shared large-prime graph; lane cycle counts are not added. The browser fixture creates a real cross-stream cycle from actual partial relations and tests replay deduplication. A returned `kind: verified` means this relation verification succeeded; it does not mean complete factorization or proven prime factors.

At most two fixed 256MiB WASM instances coexist. All collectors retire before the fresh merger. Combined source records are bounded by 16MiB and 200000 relations; live serialized buffer ownership by 64MiB. JS maps/strings, native browser components and allocator behavior are additional overhead. Sampled Chrome-tree RSS/PSS are evidence, not an instantaneous whole-browser hard cap.

Normal, known budget stop, unknown trap, actual fixed-memory OOM, cancellation during loading/running, stale/late results and retirement/release errors have separate tested outcomes. A trapped instance is never resumed. Disposal failures settle fatally and disable reuse; ownership is retained for the final retirement retry.

`npm run report:siqs-lab` regenerates the summary and report only after validating all 38 raw receipts, source/asset bindings, exact plan coverage, zero runtime communication, aggregate budgets, saved-byte graphs and native verification counts. `-- --check` rejects drift. Equal-work pool streams must have identical byte hashes across worker counts and repeats. Raw failures and losing settings remain evidence.

These short trials do not select a production engine, establish a maximum decimal size, forecast RSA100 completion, or compare browser performance with Alpertron/YAFU/GNFS. Public integration, Ready, merge, release, deployment and security-header changes require the separate user decision already recorded in this repository.

After measurement, Stage14 raw receipts were relocated byte-for-byte from the original siqs-lab-stage14 output directory into staged-siqs-lab-stage14. The original absolute output arguments remain in run-all.json as executed. This naming keeps later evidence outside Stage9's frozen prior-input scan without modifying its historical corpus or checker. The measured driver source remains unchanged; use the explicit --out-dir above for this evidence namespace. Existing outputs refuse overwrite.

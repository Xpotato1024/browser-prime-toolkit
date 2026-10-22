# ADR0014: bounded SIQS profiling and shared relation collection

Status: private experiment, not a selected production engine.
Base: 643846e9e43810cec1932315a9aab8240adc67a7 (PR12).

Keep every historical runtime, source receipt and measurement unchanged. New artifacts live under siqs-lab; old full-siqs checks remain required.

The 107297149 periodic notifications in the RSA100 report are derived from floor(Cwork/1024), not an independently observed call counter. Phase flushes and final callbacks are additional. Count C periodic/flush calls, JS deliveries, clock calls and diagnostic timer calls separately. Cwork is instrumentation, not instructions, sieve values or CPU time.

Use bounded coarse phase timers with optional probes. Compare probes off/on on the same fixed work and corpus; expose overlap rather than summing inclusive timers. Keep raw failed/no-improvement candidates.

Every C checkpoint still enforces the finite operation bound. The host owns one initialization-inclusive wall deadline and cancellation path, regardless of clock/callback stride. Workers that stop or trap are retired; no poisoned instance resumes. Unknown traps are fatal.

Two collectors use the same input, multiplier, ordered factor base and parameter version, independent deterministic polynomial streams, and disjoint operation allowances whose sum is the single-worker allowance. A one-worker control runs the same streams sequentially under the same global deadline. All lanes are terminated before postprocessing.

Transfer bounded save records, preserving each A polynomial context and local derived polynomial index. Deduplicate by polynomial identity and relation identity; never sum lane cycle counts. Rebuild one common large-prime graph, including cross-lane cycles, and verify every imported relation against the polynomial congruence before filtering/linear algebra. The merger is a fresh Worker with the same reviewed source and parameters.

Managed WASM allocations remain at most 512MiB concurrently: at most two 256MiB instances, or one merger after all collectors retire. Bound serialized relation buffers separately; JS/browser overhead is sampled and never described as a whole-browser hard cap. No shared memory, pthreads, network runtime, storage or site header changes.

Measure short, predeclared comparisons only. Report raw/full/partial/cycles, work, observed notifications, probes, initialization, cancellation, memory and censoring separately. No speedup or RSA100 completion claim before measurement. YAFU, Alpertron and GNFS remain unmeasured alternatives.

The frozen plan is bench/siqs-lab-plan.json (38 trials). Collection receives 80% of the total work ceiling; the fresh merger receives the remaining allowance after observed work, with unknown terminated work charged conservatively. Collection stops before the host deadline to reserve up to 1000ms for merging and 50ms for delivery. This reserve is identical in sequential and concurrent controls.

Combined source save bytes are at most 16MiB and 200000 relation records; serialized live buffer ownership is capped at 64MiB. Fixed WASM memory and these buffers are separate bounds. Required finite-budget polling and the CDP audit remain active in all trials; optional counters, coarse timers and RAM sampling each have their own control. Existing Stage13 has different memory and save limits, so no direct old/new speed ratio is inferred.

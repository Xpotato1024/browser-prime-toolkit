# Stage18: fixed DLP-only evaluation contract

Base b2e38bb4b87a36cf2f76159c6ac6b76d4ea60064 and every Stage17 measured file remain byte-identical. This separate evaluation does not change the product selector or release a new default engine.

## Single independent variable
RSA-100 stays at factor-base prime bound B=3250000, half-interval524288, per-prime large limit145B, threshold adjustment-23 and2048-pattern families. Three named profiles use product cutoff1035B^2 (baseline),512B^2 (half),256B^2 (quarter). These are approximate half/quarter, not exact fractions. No arbitrary tuning numbers are accepted. Both coordinator and helper prepare the same profile and report the actual native configuration.

The existing threshold formula derives lp_bits from the bit length of the accepted DLP product bound. Reducing that bound changes lp_bits automatically (54/53/52 for these three profiles); the fixed-23 offset and all other threshold/slack logic remain unchanged. This necessary coupling is part of the DLP condition, not an independent threshold sweep. Outside321..333bits the named variants retain upstream defaults; small controls test unchanged arithmetic, while real RSA packet/collector tests cover the modified tier.

## Observation
Add counters only at original collector ingestion: raw full/SLP/DLP, native cycles, graph vertices and retained tree edges. Usable columns must equal full+cycles, and ingested full+SLP+DLP cannot exceed parsed submitted rows; duplicate A families may be discarded upstream. Snapshot counters at existing batch boundaries. Worker monotonic timings measure preparation, native sieve/serialization, copy/free, packet framing, native submission/graph, observation and extraction. These are inclusive wrapper phases where specified, not instruction counts or a claim to separately time filter and Lanczos.

Keep only the bounded256-event trace plus per-owner cumulative timing/counter high-water snapshots. Native graph counters are last delivered values; termination can interrupt a call before its metrics are delivered. Requested allocator counters, grown linear memory and sampled Chrome PSS/RSS remain different quantities. Time polling/telemetry overhead is common to all new variants, and the instrumented baseline is compared within this series.

## Unchanged safety
One/two real Workers, each at most256MiB and total linear memory512MiB; no third owner or shared memory. Family budget250000 at RSA330bits, unique contiguous issuance, at most two families per batch, packet16MiB/in-flight32MiB. Whole request includes initialization, compute, delivery and host factor verification;60s or600s deadlines, initialization at most10s, AbortSignal and forced host retirement. All prior framing, stale-generation, typed error, resource failure, proper-divisor/product/MR, source-release and communication-zero contracts remain. No Rho/ECM fallback, storage, network calculation, or new compiler/algorithm.

## Fixed sequence and decision
bench/staged-dlp-plan.json freezes12 short trials, fresh Chrome per trial and two symmetric repeats per worker count/profile. Seed1 and native family ordering are unchanged. All raw/logs, failures and negative results are retained; harness failures stop the sequence for diagnosis rather than silently retrying.

Gate yield is native usable columns (full+cycles) in the acknowledged contiguous submitted prefix. Raw rows, unacknowledged native work and other telemetry are not yield. A zero baseline, missing receipt, abnormal outcome or invalid mandatory contract makes the ratio undefined and selection fails closed. Only valid timeout/time-budget or independently verified complete outcomes are eligible.

Each completed short trial records its raw/log SHA-256. Long start requires unchanged tracked/staged sources, exactly the25 declared short data/log/manifest files as untracked files, the same measured head and plan hash, all12 unique successful harness invocations, and unchanged raw/log/source hashes. An existing long series refuses restart.

A candidate may enter the four600s two-Worker ABBA trials only if both its short two-Worker repeat yields are at least1.15x their paired baseline, both one-Worker yields are at least0.90x, all mandatory contracts pass, and no allocation failure occurs. Rank qualifying profiles by their minimum two-Worker ratio, breaking ties half before quarter. The52-minute maximum RSA calculation allocation is separate from build, controls, review and CI time.

Final selection additionally requires each of the two long candidate yields to exceed the maximum long baseline yield by at least15%, with valid factor results if completed and unchanged retirement/network/memory guarantees. A full verified completion is reported separately. Otherwise retain baseline and close this series as not adopted. Raw partial rows alone never qualify. Failing the screen leaves long-horizon behavior unmeasured; it is not a proof of a global optimum or impossibility. Never extrapolate an RSA completion time.

Design before code; targeted RED/GREEN, two clean offline builds, actual browser contracts, independent numeric review, clean immutable measured head, final tests/check and exact-head public standard-runner CI are required. No Ready/merge/release/deploy/site integration.

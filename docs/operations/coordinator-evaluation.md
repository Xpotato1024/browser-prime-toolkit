# Dedicated coordinator evaluation

This is a separate experiment under src/coordinator. It derives the Stage21 host runner and role metrics; src/resources, its private entry, selected policy, all Worker bodies and WASM modules remain unchanged. No additional build/dependency is required.

The coordinatorCompute boolean defaults true. false requires at least two total owners and excludes owner0 from family dispatch; all helpers use the existing64MiB hardcap and the coordinator128/256MiB profile. Family IDs, credits, reservations, accepted prefix, native graph/proof and release-before-extraction stay unchanged. Count includes the coordinator. A deliberately idle coordinator is not a blocked compute owner; coordinatorIdleMs is separate from globalCapacityIdleMs and per-owner blockedIdleMs.

Reproduce with node --test test/coordinator-*.test.js, node scripts/check-coordinator.mjs and node scripts/verify-coordinator.mjs --coordinator dedicated --engine four-drop --out /absolute/new.json. Also verify dedicated two-drop/three-drop and combined four-drop. The16 real-browser checks retain strict offline/CSP, positive detectors, frame/config/counter forgery, factor proof, cancellation, deadlines and actual owner/source release.

From a clean committed tree, node scripts/benchmark-coordinator.mjs executes the predeclared signal/plan once. It preserves all failed/negative raw and logs and refuses existing output. Exactly two fixed-family controls and four60s timed trials are allowed. node scripts/report-coordinator.mjs generates the exact source/commit/raw/log-bound report; --check verifies it.

Stage21 measured prerequisite is core a7d25eb952c63d20c220e653247a69de7c5d1d5a. The dedicated4 preliminary preflight passed16 checks; the full measured-head preflights repeat all required modes. Final comparisons are collection evidence only. No private UI default, automatic count, production site or deployment change is made by this experiment.

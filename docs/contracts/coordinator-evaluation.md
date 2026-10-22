# Stage22: bounded dedicated-coordinator screen

This follow-up is conditional on the completed Stage21 owner-count screen. Stage21 core a7d25eb952c63d20c220e653247a69de7c5d1d5a and every original source/artifact/receipt stay unchanged. This stage derives a separate host runner; no native code, WASM, mathematical parameter, Worker body or production entry changes.

## Signal and hypothesis fixed before implementation
Both Stage21 four-owner trials yielded475 usable relations, with48032.8/48482.5ms aggregate global-reservation waiting and coordinator assigned-job occupancy above0.90. Helpers averaged below0.85 assigned occupancy. Aggregate wait sums owner wall times, not user latency or CPU utilization. The fixed prerequisite is both four-owner global waits>=30000ms, coordinator assigned ratio>=0.90 and helper-average assigned ratio<=0.85. All previous safety and family proofs must pass.

Compare exactly four total owners under the same448MiB compiled maximum (256MiB coordinator plus three64MiB helpers),512MiB admitted budget, credit1, four8MiB global packet slots and32MiB transport. Combined mode lets the coordinator compute; dedicated mode dispatches families only to the three helpers. The coordinator still prepares its original shared context for identical configuration observation and frees it before extraction. Native functions and contexts are not patched. There is no five-owner variant and no dedicated mode with one owner.

An immutable boolean coordinatorCompute must validate before allocation; output records the mode. Keep generation/ready role-cap checks, finite family budget, prefix submission, duplicate rejection, exact proof and original whole deadline/cancel/retirement. Source-release/terminate failure fails closed. Dedicated coordinator idle time is recorded separately; never mislabel deliberately idle coordinator time as a blocked compute Worker or CPU utilization.

## Fixed sequence and budget
First source-derived unit/lifecycle tests and actual-Chrome16-contract preflights: combined4 and dedicated2/3/4. Then both four-owner modes process exactly families0..3, <=60s each, compared with the preserved Stage21 four-owner reference.

Freeze a clean measured commit. Exactly four RSA-10060s trials: combined r1, dedicated r1, dedicated r2, combined r2. Request budget4minutes plus2minutes fixed controls; preflight/build/review/CI separate. Same modulus, B3250000,halfwidth524288,LP145B,DLP1035B^2,offset-23 and original finite native target/family limits. No retries, overwritten raw or further tuning. All raw/log hashes and negative results remain.

The candidate qualifies only if both dedicated usable yields are>=1.10 times their paired combined baseline, all safety/quiet/family/source checks pass, and no resource failure occurs. Use exact integer cross-products; zero/abnormal baselines fail closed. Otherwise retain combined mode. Even a qualifying result is a one-host collection candidate, not proof of RSA100 completion or a universal/phone default. The private UI and automatic<=2 policy remain Stage21's existing entry in this stage.

Final-head tests/check, independent read-only review, public source mappings and exact-head Draft PR CI remain required. No Ready/merge/release/deploy/site integration/permissions changes.

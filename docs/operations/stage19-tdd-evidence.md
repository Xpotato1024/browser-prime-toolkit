# Stage19 verification evidence

Baseline commit: `2008edb702a6b9a214687542a146d38582a780de`. The dedicated worktree preserves all Stage18 code, WASM, pin/build receipts and measurements.

The actual local sequence is retained under the LLM-01 task directory `prime-stage19`:

- `credit-red.log` → `credit-green.log`: missing credit module, then six behavioral cases pass.
- `reservation-red.log` → `reservation-green.log`: worst-case transport reservation before dispatch, then seven cases pass.
- `metrics-red.log` → `metrics-green.log`: missing state/audit module, then ten credit/metrics cases pass.
- `metadata-pattern-red.log` → `metadata-green.log`: independent review identified packet metadata overriding issued job fields. A regression was run against the old spread pattern and failed; the explicit buffer/stats whitelist passes. The old-pattern mutation was restored in a finally block.
- `decision-red.log` → `decision-green.log`: missing gate module, then exact paired ratios, both repetitions/owner counts, blocked-idle bound, deterministic tie order and abnormal-baseline rejection pass.
- `lifecycle-first.log`: all three scheduler modes pass the original fake-Worker late initialization, deadline, release/extraction and retirement-exception behaviors.
- `packets-green.log`: actual native-family-body hashing is grouping-independent and rejects altered family bytes, duplicate capture, incomplete accepted prefix and non-retired owners. This was a direct verification, not a historical RED claim.

The first browser harness attempt timed out while waiting for all contracts in one CDP evaluation. The second exposed a generated Worker input-version check left at v18 while the host sent v19. The generator now updates both send and receive versions; the static check protects this boundary. Both failed logs are retained as `browser-batch2-w2-preflight*.log`. The corrected attempt passed all sixteen real-Chrome contracts. These are preflight failures and are excluded from timed performance comparisons.

Before the measured core was frozen, the full Node suite passed 336 tests. The final measured-head browser preflight and campaign raw receipts supply the authoritative comparison evidence; final-head tests, independent review and CI are reported separately.

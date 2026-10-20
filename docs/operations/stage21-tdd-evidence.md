# Stage21 development evidence

Baseline d5e5304119534a64e4dc1e13a5d41aabaaa74897. Dedicated branch codex/device-resources-20261020 and worktree browser-prime-resources-stage21. Only this checkout and task/prime-stage21 evidence were written; other projects/checkouts were not changed.

The resource contract was committed first as0b791b0. Policy tests failed before implementation, then passed. The independent review's manual-to-auto forgery failed its regression before the validator was corrected. Auto limits are enforced at validation, not only selection.

Native64/128MiB modules each have two equal clean builds. The first64MiB preparation failed because the script still passed the old256MiB linker flag; the corrected script and original failure log were preserved. No invalid artifact was accepted. New modules have the identical complete compiled source set and byte-identical numeric WASM code as Stage18.

Ledger/memory tests failed before their new modules existed. Runtime tests then exercised1..4 owner caps, deadlines, release/terminate errors and global four-slot capacity. Independent review caught default1-owner deadline tests and missing global-reservation wait classification; both were corrected with explicit owner counts and conserved separate globalCapacityIdleMs metrics.

The session regression reproduced a correct product with forged proven factors (2^128 as2^64 squared). Display verification now rechecks uint64 proven boundaries, strong probable-prime status, proper divisors, exact product, sorted factors, result status and the same finite proof deadline. Unconfirmed retirement or a rejected engine call blocks replacements until a fresh page. Session tests cover canonical parsing, experimental opt-in, asset preparation before calculation, no overlap, cancel/dispose and late responses.

## Actual checks before measured commit
- Initial complete suite392 tests passed; existing npm run check passed. Later additions are covered by the final-head run below.
- Real Chrome155.0.8059.39:16 contracts passed for each1/2/3/4 owners, including40/64-digit fresh factor controls, input/budget rejection, native frame/counter/config forgery, stale generation, cancellation, host/extraction deadlines, allocator refusal and retirement.
- Private UI initially24 checks passed; opening manual controls adds one check, for25. An earlier progress message saying26 was a count typo.
- The ordinary entry's initial assets exclude the experimental Worker bundles. UI tests shut the asset server before calculations, disable cache, enforce offline mode/CSP and use page/Worker positive network detectors.
- Native insertion of4098 characters remains untruncated and rejects before calculation. Viewport320 has no horizontal overflow; this is not physical-phone validation.

## Preserved preparation failures and corrections
All preparation logs are in the local task/prime-stage21 directory and are not timed results. Initial Chrome invocation lacked the configured binary, then the existing libasound path; explicit existing local paths resolved both. UI harness generation first exposed a quoting error and a CDP expression that needed an async wrapper; both were corrected before acceptance.

A one-shot native allocator refusal can return null without aborting; the negative test was corrected to verify that real recorded refusal plus a controlled trap retires as wasm-oom. Unknown traps remain distinct. This bounded test does not fill RAM or probe device capacity.

Fast cancel/pagehide can detach a Worker while Chrome DevTools setup is pending. The new test-only lifecycle helper settles only that detached session's known Network/Runtime setup calls, and classifies only an exact session-not-found error with observed detach and no active session. Unknown errors/timeouts remain failures. Original failed UI receipts/logs were retained; final quiet counters and positive detectors must pass.

The packet limit displayed in new receipts was corrected from the copied16MiB description to the actual8MiB credit1 hardcap. Existing profiles and historical receipts remain unchanged.

## Measured and final results
The frozen plan, measured core, all raw/log hashes, same-family proof, paired gate and observed memory are recorded in docs/benchmarks/llm01-resources.md after execution. Final-head tests/check, independent review and exact-head Draft PR CI are required before handoff. No RSA-100 completion, all-device speedup or physical phone test is implied.

The first final whole-tree check failed because new PNG screenshots were decoded as text. The checker now recognizes only documentation benchmark PNGs, validates signature/IHDR bounds/terminal IEND, and keeps all text UTF8/LF/syntax/link checks. Real screenshot, corrupt/truncated image and path-scoping regressions pass. Original failure log remains local.

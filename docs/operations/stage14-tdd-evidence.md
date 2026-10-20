# Stage14 TDD and verification evidence

Measured implementation: 0a2d3979e038b4ae740a9bbecca3fff673352cc3. [Evidence manifest](../benchmarks/archive/validation-logs/staged-siqs-lab-stage14/manifest.json) binds retained logs and the measured-head browser receipt. Precommit red/debug logs are historical evidence, not retroactively relabelled final-head runs.

- Pure contract and runner tests first failed on missing modules; implementation added exact budget/notification/graph contracts and ownership handling.
- Race regression exposed a retirement exception that could escape settlement. The fix retains ownership for retry, settles fatal and disables reuse. Valid late merge responses and slow retirement now time out.
- Header-stop regression protects the exact native header-body/LF boundary. Known stops return this prefix separately; malformed/truncated relation records still fail.
- The first native coarse-timer check failed because upstream mpqs.h redefined timing macros after common.h. Moving instrumentation after that include enabled the actual timer counters. Native ASan/UBSan/LSan then verified 106 collected relations and rejected forged relation/header imports.
- The measured implementation passed 246 unit tests, static syntax/UTF-8/LF/link checks and two identical clean WASM builds. Actual Chrome passed all 11 contracts: single/two collectors, native all-relation verification, both callback strides, loading/running cancellation and fresh recovery, independent host deadline, wrong-memory ready rejection, unsupported input without allocation, graph budget, forged relation fatal, actual cross-stream partial cycle with duplicate replay, exact header stop, real WASM OOM and unknown trap retirement/recovery.
- The 38 predeclared performance trials ran after this commit, separately from contract tests. All raw receipts, losing settings, logs, plan conditions, byte hashes, budget accounting and native proof counts are checked by [the report](../benchmarks/llm01-siqs-lab.md).

The final evidence/documentation head must additionally pass npm test, npm run check, native sanitizer, two clean build checks, real Chrome contracts, read-only independent numeric review and all required CI jobs. Final-head results are recorded in the PR handoff; the measured source hashes remain unchanged.

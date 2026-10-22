# Running the fixed DLP series

Read the [contract](../contracts/dlp-evaluation.md), [frozen plan](../../bench/staged-dlp-plan.json) and [native rebuild mapping](../../native/rusqsieve-dlp/README.md) first. Commit a clean measured head after tests, browser controls and independent numeric review.

Set CHROME_BIN to a supported local Chrome executable. Run node scripts/benchmark-dlp.mjs. It refuses existing output and executes exactly12 fresh-browser60-second trials. Raw JSON, logs and the invocation manifest go to docs/benchmarks/staged-dlp-stage18. Failed harness invocations preserve their evidence and stop the sequence; do not silently repeat or overwrite them.

The short decision is recomputed from all12 acknowledged usable-prefix yields and mandatory contracts. Only if it selects a candidate, run node scripts/benchmark-dlp.mjs --long on the same measured head. This requires both staged/unstaged sources clean, exactly the25 predeclared short data/log/manifest files untracked, current source/raw/log hashes and successful unique invocations. It refuses an existing long series and permits only four600-second two-Worker ABBA trials for the chosen profile. Do not add tracked reports or stage raw files before this conditional step.

After the series ends, archive the preflight/TDD/build logs with a hash manifest and generate node scripts/report-dlp.mjs. Its --check mode verifies current source against immutable measured Git blobs, raw/log hashes, exact gates and safety evidence. Final reporting/CI commits are separate from the measured source head. Reports must preserve negative results, graph/full/cycle quantities, last-delivered phase times and separate allocator, linear-memory and Chrome PSS/RSS observations.

RSA numeric time is at most12×60s plus4×600s,52minutes. Build, safety controls, review, harness audit/teardown, report verification and CI are accounted separately. A failed screen leaves600-second comparisons unmeasured and closes this series without adoption. Do not infer a global optimum or an RSA completion time. Ready, merge, release, deploy and site integration need separate authorization.

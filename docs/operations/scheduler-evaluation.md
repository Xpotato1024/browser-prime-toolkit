# Bounded scheduler evaluation

Run Node 24.19.x and npm 11.19.x. This experiment imports the Stage18 baseline WASM unchanged; no new build or dependency is introduced.

- `npm test` verifies numeric framing, exact integer checks, bounded credit/byte reservation, duplicate and prefix rejection, old-ACK/new-job isolation, host state-time conservation, packet audit limits, and lifecycle exceptions.
- `node scripts/check-scheduler.mjs` checks the original source/artifact preservation, generated protocol version, immutable scheduler modes, finite trial plan and runtime oracle boundary.
- `node scripts/verify-scheduler.mjs --scheduler credit1 --engine two-drop --out /new/path.json` launches actual Chrome through CDP, with real Blob Workers and the embedded WASM. Sixteen contracts include actual 40/64-digit full factorization, configuration/counter/frame forgery, unknown trap versus allocation failure, cancellation, noncooperative deadline/extraction and cleanup. Output files are exclusive.
- `node scripts/benchmark-scheduler.mjs` requires a clean committed tree and a nonexistent results directory. It runs six contract configurations first, then six fixed four-family controls and twelve predeclared short trials. Every call gets a fresh Chrome. The asset server stops before calculation; the page is offline, cache-disabled, with page/Worker network and CSP positive detector controls.
- `node scripts/report-scheduler.mjs` validates source binding at the measured commit, raw/log hashes, all common family bodies and native counters, bounded memory and exact paired gates, then creates the report. `--check` compares the saved report.

Packet-body SHA-256 is computed by Node only after the runtime reports that every Worker is disposed and every source released. Raw packet capture is explicitly enabled only for the evaluation harness, bounded to 8 MiB and 1024 entries. Node receives captured bytes after retirement; workers never receive the factor oracle. Packet grouping headers differ between batch modes, so equality is checked over each complete native family body.

One producer has at most one active native call. The credit1 mode can have one additional returned/retained or active family within its two-family owner credit. Each issued packet reserves its maximum size before dispatch; all outstanding packet reservations total at most 32 MiB. Audit retention is a separate JavaScript allocation budget. Per-owner WASM is at most 256 MiB; total two-owner WASM is at most 512 MiB.

Host assigned-job wall occupancy is not CPU utilization. Returned-to-accepted latency can overlap ahead computation; blocked idle is measured separately. Delivered native sieve durations exclude unfinished calls. Requested allocator bytes and linear-memory bytes are distinct from sampled Chrome RSS/PSS; the WASM cap is not a total browser RAM cap.

This remains an independent engine evaluation intended for a possible Xpotato-site tool. The current site-adapter document is a proposal checked against a historical site revision, not implemented integration. No site CSP, plugin acceptance policy, production route, public runtime default, merge, release or deployment is changed here.

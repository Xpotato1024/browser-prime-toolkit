# Firefox / WebKit acceptance of 0.1.1

2026-10-22: **12/12 bounded acceptance cases passed in each engine**. No product defect was reproduced, so this change adds reproduction tools and evidence only. It changes no runtime, mathematical contract, release, deployment, permissions or CI configuration.

## Fixed source and artifact

- `origin/main` and the published `v0.1.1` release/tag were both `69d12a0a511e00a2e33040eb72f4222ce19a4f97` when the target was fixed. Its tree, `9c9bb98407abe845ea1e963f6459c78be3b06a4b`, equals PR29 head `0744823`.
- Release: [v0.1.1](https://github.com/Xpotato1024/browser-prime-toolkit/releases/tag/v0.1.1). A clean LF checkout and `build-site-release.mjs` produced the release's 72 files / 5,012,304 bytes and artifact SHA-256 `1d21b62421930792d5d4dafe501d97e809156330b43d52fb99ecfa588a64d383`.
- The browser harness imports the actual generated `src/site/mount.mjs` and `tool.css`. It does not copy the UI into a mock. React hydration/host integration are outside this harness.
- Work used a new checkout and `codex/firefox-webkit-20261022`; other checkouts were not edited. The initial Windows CRLF checkout was retained and not used as the measured artifact.
- Before push/PR, all nine tracked workflows and package scripts were inspected: push/PR triggers test/verification jobs with `contents: read`; none publish, deploy, merge, or update a release. No deployment configuration was added or changed.

## Confirmed

Windows desktop engines, headless Playwright Core **1.61.0**, Firefox **151.0** (revision 1532) and WebKit **26.5** (revision 2311). Existing Playwright tooling was reused, and only the missing engines were downloaded into the task directory. Browsers and calculations ran serially, with one Worker and 128 MiB WASM maximum for the tested inputs; no RSA-100 or long load trials were run.

| Acceptance case | Firefox | WebKit |
| --- | --- | --- |
| Sample selection changes input, restores input focus, creates no Worker | Pass | Pass |
| `2.5`, `-1`, `1e10000` rejected before Worker creation; linked visible error | Pass | Pass |
| `3.2e1` gives `32 = 2^5`; exact `9007199254740993`; zero status | Pass | Pass |
| Subsecond elapsed display is distinct from the configured one-second budget | 14 ms | 20 ms |
| Actual native Clipboard API write resolves after a user click | Pass | Pass |
| Controlled copy success, rejection and unavailable API; selected fallback includes state | Pass | Pass |
| 70-bit input through the actual 128 MiB WASM path | Pass, 136 ms | Pass, 115 ms |
| Keyboard Enter starts/cancels; cancel focus moves to status on completion | Pass | Pass |
| Cancelled job retires before a successful fresh rerun | Pass | Pass |
| Reset empties input and restores focus; Tab reaches sample select | Pass | Pass |
| 390 x 844 desktop viewport: full exact result, no horizontal page overflow | Pass | Pass |
| Dispose while running retires Worker and revokes Blob URL | Pass | Pass |

The WASM calculation returned `1050809297549059047257 = 32416187567 × 32416190071` in both engines. Each full acceptance run created/terminated eight Workers and created/revoked eight Blob URLs. No page errors, page network API calls, storage calls, or HTTP(S) requests after ready were observed. Local `blob:` Worker loads are not HTTP communication. These are single functional observations, not speed or physical-memory guarantees.

The local harness sends `connect-src 'none'`, `worker-src blob:` and `script-src 'self' 'wasm-unsafe-eval'`. Firefox additionally used Playwright offline emulation after ready. WebKit's successful acceptance run kept the browser online with the same restrictive CSP and an empty post-ready HTTP(S) trace.

Native clipboard success records the promise resolving and success feedback; it does not read the OS clipboard. Rejection/unavailable cases deliberately substitute the Clipboard API in the test page and verify fallback text, focus and full selection; they do not claim a native OS permission denial was exercised.

Full structured evidence: [acceptance JSON](evidence/firefox-webkit-20261022.json), [minimal offline probe JSON](evidence/webkit-offline-20261022.json). Initial runs exposed a zero-equation expectation mistake in the test (`0 = 0` is correct); that test was corrected before the recorded run.

## Environment limitation and unverified work

**Playwright WebKit on this Windows host fails to load a new Blob Worker under `context.setOffline(true)`.** This also reproduces without any toolkit code: a Worker whose entire program is `self.onmessage=()=>self.postMessage('ok')` works online and emits an error offline. WebKit writes `ERROR: WebKit encountered an internal error. This is a WebKit bug.` at `WebLoaderStrategy.cpp(698)`. The [standalone probe](../../scripts/probe-site-worker-offline.mjs) preserves that distinction. No product workaround or relaxed CSP was introduced. Actual disconnected-network WebKit behavior remains unverified.

Not exercised: physical iPhone/iPad/Android, Safari application integration, React hydration/unmount, screen readers, real BFCache round trips, native permission-denial UI, experimental optimized/wide modes, exhaustive inputs, long-duration/multiworker/performance trials. The 390px check is desktop browser viewport testing, **not physical iPhone testing**.

## Reproduction and checks

Use the repository's pinned Node/npm for normal checks. Playwright is an optional, separately installed test tool, not an application dependency; no lockfile change is needed. Set `PLAYWRIGHT_MODULE` to its absolute `playwright-core/index.mjs` path, and optionally `PLAYWRIGHT_BROWSERS_PATH` to an isolated browser directory. The recorded run used Windows Node 24.14.0 / npm 11.9.0; CI uses the repository pins.

```sh
node scripts/build-site-release.mjs /absolute/fresh/external/dist
node scripts/verify-site-cross-browser.mjs --dist /absolute/fresh/external/dist --out /absolute/evidence/acceptance.json
node scripts/probe-site-worker-offline.mjs /absolute/evidence/webkit-offline.json
npm test -- --test-concurrency=1
npm run check
git diff --check
```

The acceptance runner runs Firefox then WebKit, serves only loopback files, uses the production UI and real Workers/WASM, saves JSON plus viewport screenshots, and returns failure for failed assertions. `TEST_BROWSERS=firefox` or `webkit` selects one engine. `TEST_OFFLINE=1` deliberately re-exercises the known WebKit emulation limitation. Desktop Commander became unavailable during the final ordinary checks; those checks and Git used the same machine's Ubuntu-24.04 login bash directly instead.

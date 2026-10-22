# Device resource preview and finite screen

Run `npm run preview:resources -- --port 0` and open the printed loopback URL. The new entry is app/resources.html; the original app/index.html, selected math policy and production site are unchanged. No storage, provider, credentials, CDN or network calculation is added.

Select ordinary or experimental mode. Asset preparation occurs before the Calculate action; the ordinary entry does not load the new experimental Worker bundles. After preparation, calculation is local and requires no communication. Experimental mode still uses the ordinary path for integers below2^128. Above that boundary the reviewed SIQS experiment accepts at most332 bits/100 decimal digits. Zero/one use no Worker; <=64bit uses1 JS BigInt Worker and no WASM. Input magnitudes do not determine factorization difficulty.

Automatic settings use optional hardwareConcurrency/deviceMemory hints, with conservative fallbacks and at most2 Workers. These APIs neither reserve CPU cores nor report free RAM. Manual settings allow1..4 total Workers, including the coordinator, under128/256/384/512MiB WASM budgets. Infeasible combinations reject before allocation. The coordinator also computes, with128/256MiB compiled cap; helpers each64MiB. Show the effective route/count/cap and time separately from the next experimental settings. Normal mode has a60s maximum; experimental requests have a600s maximum, finite native family/work limits and one extraction attempt.

Settings freeze for a request and cannot be changed during calculation. Cancel/pagehide retire every owner and source. No job overlaps a cancelling request. If retirement cannot be confirmed, the session blocks replacements until a new page. A BFCache restoration restores draft input only, not an active calculation or claimed checkpoint. Whole request proof remains bounded; final displayed prime certainty is checked independently and late proof cannot claim completion.

WASM maximum is not allocated RAM and is not a browser-total hardcap. Initial memory is17 pages per experimental owner and grows within its compiled maximum. JS/result/audit and32MiB transport reservations have their own finite bounds. No device-limit allocation probing or automatic retry is used. A negative allocator test requests a known module cap once; it does not search available device RAM. Allocation/init failure can be caught only where the browser returns control; OS tab termination cannot be prevented or reliably caught.

## Reproduction
- `node --test test/resource-*.test.js`: policy, hardcaps, unchanged native code/source identity, protocol, deadline, retirement, certainty, global capacity, decision and preview boundaries.
- `npm run check:resources`: exact artifact/build receipts, pinned source hashes and generated Worker/runner/UI harness.
- `npm run verify:resources -- --engine four-drop --out /absolute/new.json`:16 real-Chrome contracts, offline audit and positive detectors. Also run one-drop/two-drop/three-drop.
- `npm run verify:resource-ui -- --out /absolute/new-ui.json`: actual UI25 checks, native input and keyboard, four-owner factor/cancel/deadline, page lifecycle, viewport320 and network/source ownership. Viewport emulation is not a physical phone test.
- Set CHROME_BIN to a reviewed local Chrome binary; its existing shared libraries must be available. Never overwrite a receipt.
- From a clean committed tree, `node scripts/benchmark-resources.mjs` runs the frozen plan once. No resume/retry/overwrite is accepted. Builds are reused; fresh browser requests preserve trial independence.
- `node scripts/report-resources.mjs` generates the hash/source/commit-bound report; `--check` verifies it.

Actual phone, Safari/Firefox, low-RAM failure and thermal/background behavior require separate physical-device validation. The LLM-01 screen establishes only this host's observations. Site integration, source adoption in Xpotato-site, Ready, merge, release, deployment and permission changes remain separate authorization boundaries.

# Device resource implementation and bounded evaluation

This branch is based on PR16 core d5e5304119534a64e4dc1e13a5d41aabaaa74897. The resource implementation/measurement core is a7d25eb952c63d20c220e653247a69de7c5d1d5a; the isolated coordinator experiment is 4203aab1703e9129fd3e86343c485c334bbccc4a.

The separate app/resources.html private entry supports conservative automatic settings and manual1..4 total Workers,128/256/384/512MiB admitted WASM budgets and finite deadlines up to600s. Automatic selection stays<=2. Missing API hints fall back to one Worker/128MiB; deviceMemory is a rounded total-RAM hint, never free RAM. Invalid/infeasible settings fail before allocation. Four owners use a256MiB coordinator plus three64MiB helpers (448MiB total hardcaps); there is no512MiB coordinator build. Job/credit/packet/transport/retention limits, exact factor proof, deadlines, cancellation and retirement remain finite.

Ordinary smaller inputs use the existing JS BigInt or single staged Worker route; they do not instantiate four WASM modules. BigInt remains necessary even for some Number-safe inputs because arithmetic intermediates exceed safe integer precision. High-difficulty multi-owner use requires explicit experimental opt-in. Initial asset preparation precedes calculations; real-browser tests stop the asset server and enforce zero subsequent network traffic. This branch does not integrate into or deploy xpotato-site.

## Observations and decisions
The [completed owner-count comparison](../benchmarks/llm01-resources.md) contains all raw/log hashes, family controls and paired60s results. Usable relations were1 owner199/199,2 owners344/376,3 owners448/423 and4 owners475/475. Four owners beat two by38.08% and26.33% in the paired samples on this host. Manual4 is available; automatic selection was not increased. Assigned-job wall occupancy is not CPU utilization.

Four-owner observed Chrome RSS/PSS peaks were1374.1/545.7MiB and1376.6/545.7MiB. WASM hardcaps do not include JS, transport/audit retention or browser/OS overhead and are not a tab-RSS cap. Catchable allocation/initialization failures retire safely; OS tab termination cannot be guaranteed preventable.

The [dedicated coordinator follow-up](../benchmarks/llm01-coordinator.md) passed16 contract tests in each of four modes but stopped at a fixed-control Page.navigate timeout before any timed trial. No retry, overwrite or adoption occurred. Its performance hypothesis remains untested. The experimental source is isolated; combined behavior remains the private entry.

No RSA-100 factorization or completion-time prediction was achieved. Viewport320 validation is not a physical smartphone test. Safari/Firefox and physical phone performance remain untested. There is no claim of universal speedup.

## Review and reproducibility
Independent numeric and distribution/source reviews of both fixed cores reported no P1/P2 issues (distribution also no P0). Review covered cap/role admission, family/prefix/duplicate invariants, lifecycle/proof and source/license/quiet contracts. [Immutable source mappings](../../native/resources/source-index.json) include commit URLs, file byte counts and SHA256 values; native64/128MiB receipts preserve two equal clean builds and original upstream licenses.

Run npm test and npm run check. CI adds resource and coordinator contract jobs without changing contents:read, pinned actions or publication/security settings. Performance trials are not CI tasks. Final-head test/CI evidence is recorded separately; an incomplete Stage22 report deliberately cannot pass the complete-series reporter.

This work permits a Draft PR only. No Ready, merge, release, deploy, site production integration, credential or permission change was performed.

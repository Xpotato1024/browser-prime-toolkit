# LLM-01 bounded scheduler comparison

Measured core: `a8f9ae5fdff8012d856096f779d7db8d347e4bcf`. Plan: [frozen settings](../../bench/staged-scheduler-plan.json). Six fixed-family controls and all twelve 60-second trials are retained in [run index](staged-scheduler-stage19/run.json), alongside six real-browser contract receipts.

The mathematical kernel is the unchanged Stage18 baseline WASM (SHA-256 `c9fc84ce31f1c8ac92cfa44e0ce77521d419abc87570d762e326974ed313bd13`). B=3,250,000; halfwidth=524,288; LP=471,250,000; combined DLP=10,932,187,500,000,000; threshold adjustment=-23; factor base=116,448; target=116,512. Only batching and finite ahead credit vary.

| Mode | Owners | Repeat | Polys | Full | SLP | DLP | Cycles | Usable | Raw | Max return→ACK ms | Blocked idle ms | Assigned wall occupancy | Chrome peak RSS MiB |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---:|
| batch2 | 1 | 1 | 12288 | 169 | 2139 | 6665 | 0 | 169 | 8973 | 33.3 | 0.2 | 99.8% | 1263.8 |
| batch1 | 1 | 1 | 14336 | 198 | 2483 | 7708 | 1 | 199 | 10389 | 26.2 | 0.1 | 99.8% | 1264.2 |
| credit1 | 1 | 1 | 14336 | 198 | 2483 | 7708 | 1 | 199 | 10389 | 26.2 | 0.0 | 99.8% | 1266.1 |
| credit1 | 2 | 1 | 28672 | 371 | 4887 | 15548 | 5 | 376 | 20806 | 367.3 | 0.0 | 99.6%/100.0% | 1305.7 |
| batch1 | 2 | 1 | 26624 | 341 | 4543 | 14468 | 3 | 344 | 19352 | 8019.5 | 8200.5 | 99.6%/86.2% | 1303.4 |
| batch2 | 2 | 1 | 24576 | 320 | 4175 | 13317 | 3 | 323 | 17812 | 152.4 | 283.3 | 99.7%/99.5% | 1300.7 |
| credit1 | 1 | 2 | 14336 | 198 | 2483 | 7708 | 1 | 199 | 10389 | 25.9 | 0.0 | 99.8% | 1274.4 |
| batch1 | 1 | 2 | 14336 | 198 | 2483 | 7708 | 1 | 199 | 10389 | 28.7 | 0.3 | 99.8% | 1265.1 |
| batch2 | 1 | 2 | 12288 | 169 | 2139 | 6665 | 0 | 169 | 8973 | 33.7 | 0.2 | 99.8% | 1268.4 |
| batch2 | 2 | 2 | 20480 | 271 | 3512 | 11043 | 2 | 273 | 14826 | 16032.7 | 16097.0 | 99.7%/72.9% | 1305.5 |
| batch1 | 2 | 2 | 24576 | 320 | 4175 | 13317 | 3 | 323 | 17812 | 8007.4 | 16222.0 | 99.7%/72.7% | 1298.9 |
| credit1 | 2 | 2 | 28672 | 371 | 4887 | 15548 | 5 | 376 | 20806 | 8111.4 | 0.0 | 99.6%/100.0% | 1303.1 |

Gate candidate: **credit1**. The conditional geometry screen may proceed under a separately frozen plan.

All common native family bodies match SHA-256 across schedules, owner counts and repetitions. The six fixed controls accept exactly families 0–3, with identical native counters. Accepted-prefix, duplicate, transport/reservation, audit and lifecycle limits are independently checked.

Assigned-job wall occupancy is not OS CPU utilization. Delivered native sieve timings censor active calls at stop; return-to-ACK wait can overlap ahead computation and is distinct from blocked idle. Chrome RSS/PSS covers the sampled process tree and differs from requested allocations and WASM linear memory. Per-owner memory and full timings remain in each raw receipt. A 512 MiB total WASM limit is not a total browser RAM cap.

Every short run is a bounded collection observation, not an end-to-end RSA-100 completion or completion-time estimate. Filtering, linear algebra and extraction near the target remain unmeasured. No runtime default, site integration, release or deployment is changed.

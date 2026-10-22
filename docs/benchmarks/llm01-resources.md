# LLM-01: finite device resources and1/2/3/4 Worker screen

Measured core `a7d25eb952c63d20c220e653247a69de7c5d1d5a`. Plan `device-resources-stage21-20261020`, 2026-10-20T17:01:53.197Z to 2026-10-20T17:12:48.419Z. Same Stage18 numeric kernel/code, geometry B3250000/halfwidth524288, credit1 and32MiB global transport reservations. Fixed-case modulus only reaches Workers; no known factors are supplied.

All five preflights passed: private UI25 checks and16 real-browser checks for each owner count. Fixed families0..3 match SHA256 bytes and native counters across all counts and the preserved Stage19 reference. Every common timed prefix matches.

| Workers | Round | Usable | Full | SLP | DLP | Cycles | Polynomials |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 1 | 199 | 198 | 2483 | 7708 | 1 | 14336 |
| 2 | 1 | 344 | 341 | 4543 | 14468 | 3 | 26624 |
| 3 | 1 | 448 | 442 | 5940 | 18907 | 6 | 34816 |
| 4 | 1 | 475 | 469 | 6301 | 19996 | 6 | 36864 |
| 4 | 2 | 475 | 469 | 6301 | 19996 | 6 | 36864 |
| 3 | 2 | 423 | 417 | 5574 | 17792 | 6 | 32768 |
| 2 | 2 | 376 | 371 | 4887 | 15548 | 5 | 28672 |
| 1 | 2 | 199 | 198 | 2483 | 7708 | 1 | 14336 |

| Workers/round | Init ms | Owner-credit wait ms | Global-cap wait ms | Max return-to-ack ms | Assigned ratios | WASM cap MiB | Chrome RSS/PSS MiB |
| --- | ---: | ---: | ---: | ---: | --- | ---: | --- |
| 1/1 | 362.4 | 0.0 | 0.0 | 25.4 | 99.8% | 256 | 1279.5/449.7 |
| 2/1 | 359.1 | 0.0 | 0.0 | 8155.6 | 99.6%/100.0% | 320 | 1306.1/510.7 |
| 3/1 | 543.3 | 0.0 | 8633.3 | 8787.9 | 99.5%/99.9%/85.2% | 384 | 1338.9/545.6 |
| 4/1 | 752.2 | 0.1 | 48032.8 | 8491.7 | 99.5%/85.7%/60.3%/72.1% | 448 | 1374.1/545.7 |
| 4/2 | 737.2 | 0.1 | 48482.5 | 8352.1 | 99.5%/74.0%/71.7%/72.0% | 448 | 1376.6/545.7 |
| 3/2 | 536.8 | 0.0 | 40288.3 | 8485.9 | 99.6%/73.0%/58.9% | 384 | 1338.4/517.2 |
| 2/2 | 367.5 | 0.0 | 0.0 | 463.5 | 99.6%/100.0% | 320 | 1310.5/483.5 |
| 1/2 | 355.1 | 0.0 | 0.0 | 47.1 | 99.8% | 256 | 1272.9/447.0 |

Assigned ratios measure host-observed job wall occupancy, not CPU utilization. Censored native calls are lower bounds. Requested allocator bytes, observed grown linear memory and sampled Chrome RSS/PSS are distinct. WASM caps exclude JS, transport/audit retention, browser overhead and OS memory; RSS/PSS are observations, not whole-tab hardcaps.

Decision: `{"baselineWorkers":2,"baselineYields":[344,376],"candidates":[{"workers":3,"yields":[448,423],"pass":true,"pairedRatios":[{"numerator":448,"denominator":344},{"numerator":423,"denominator":376}]},{"workers":4,"yields":[475,475],"pass":true,"pairedRatios":[{"numerator":475,"denominator":344},{"numerator":475,"denominator":376}]}],"candidate":4,"automaticDefaultChanged":false,"scope":"one-host 60s collection screen; no completion-time or smartphone extrapolation"}`. Automatic selection remains conservative at<=2; manual1..4 is available within the finite approved budget. This screen alone does not establish completion time, RSA-100 completion, physical-phone behavior or portable speedup.

## All raw evidence, including controls

- contracts-ui: [raw](staged-resources-stage21/contracts-ui.json), [log](staged-resources-stage21/contracts-ui.log)
- contracts-w1: [raw](staged-resources-stage21/contracts-w1.json), [log](staged-resources-stage21/contracts-w1.log)
- contracts-w2: [raw](staged-resources-stage21/contracts-w2.json), [log](staged-resources-stage21/contracts-w2.log)
- contracts-w3: [raw](staged-resources-stage21/contracts-w3.json), [log](staged-resources-stage21/contracts-w3.log)
- contracts-w4: [raw](staged-resources-stage21/contracts-w4.json), [log](staged-resources-stage21/contracts-w4.log)
- fixed-w1: [raw](staged-resources-stage21/fixed-w1.json), [log](staged-resources-stage21/fixed-w1.log)
- fixed-w2: [raw](staged-resources-stage21/fixed-w2.json), [log](staged-resources-stage21/fixed-w2.log)
- fixed-w3: [raw](staged-resources-stage21/fixed-w3.json), [log](staged-resources-stage21/fixed-w3.log)
- fixed-w4: [raw](staged-resources-stage21/fixed-w4.json), [log](staged-resources-stage21/fixed-w4.log)
- w1-r1: [raw](staged-resources-stage21/w1-r1.json), [log](staged-resources-stage21/w1-r1.log)
- w2-r1: [raw](staged-resources-stage21/w2-r1.json), [log](staged-resources-stage21/w2-r1.log)
- w3-r1: [raw](staged-resources-stage21/w3-r1.json), [log](staged-resources-stage21/w3-r1.log)
- w4-r1: [raw](staged-resources-stage21/w4-r1.json), [log](staged-resources-stage21/w4-r1.log)
- w4-r2: [raw](staged-resources-stage21/w4-r2.json), [log](staged-resources-stage21/w4-r2.log)
- w3-r2: [raw](staged-resources-stage21/w3-r2.json), [log](staged-resources-stage21/w3-r2.log)
- w2-r2: [raw](staged-resources-stage21/w2-r2.json), [log](staged-resources-stage21/w2-r2.log)
- w1-r2: [raw](staged-resources-stage21/w1-r2.json), [log](staged-resources-stage21/w1-r2.log)

[Run manifest](staged-resources-stage21/run.json) binds each raw/log hash and measured source commit. No retry or overwrite is accepted by the series runner. Preparation failures and review corrections are recorded separately in the Stage21 TDD notes.

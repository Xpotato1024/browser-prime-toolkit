# LLM-01 bounded SIQS lab

Measured implementation: 0a2d3979e038b4ae740a9bbecca3fff673352cc3. Frozen plan: [38 trials](../../bench/siqs-lab-plan.json). All runtime source hashes, initial asset hashes, common graph counts and raw conditions are checked by scripts/report-siqs-lab.mjs.

These are short diagnostic observations on one host, not factorization completion benchmarks. The status verified means all imported relations passed the native polynomial verification; it does not mean N was factored. No complete-factorization or RSA100 ETA is claimed.

## Monitoring controls

| Trial | Collector compute s | Request s | C periodic | Flush | JS deliveries | JS clocks | Probe clocks | Relations / full / partial / cycles |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| profile-s1-base | 4.714 | 4.921 | 781250 | 3 | 781253 | 781252 | 0 | 279 / 2 / 277 / 0 |
| profile-s1-audit-off | 4.716 | 4.926 | — | — | — | — | 0 | 279 / 2 / 277 / 0 |
| profile-s1-probes | 5.127 | 5.335 | 781250 | 3 | 781253 | 781252 | 1521264 | 279 / 2 / 277 / 0 |
| profile-s1-clock16 | 4.491 | 4.704 | 781250 | 3 | 781253 | 48828 | 0 | 279 / 2 / 277 / 0 |
| profile-s1-stride16k | 4.532 | 4.741 | 48828 | 4 | 48832 | 48831 | 0 | 279 / 2 / 277 / 0 |
| profile-s1-ram-off | 4.660 | 4.874 | 781250 | 3 | 781253 | 781252 | 0 | 279 / 2 / 277 / 0 |
| profile-s1-base-repeat | 4.685 | 4.889 | 781250 | 3 | 781253 | 781252 | 0 | 279 / 2 / 277 / 0 |
| profile-s11-base-repeat | 4.745 | 4.948 | 781250 | 3 | 781253 | 781252 | 0 | 273 / 6 / 267 / 0 |
| profile-s11-ram-off | 4.662 | 4.862 | 781250 | 3 | 781253 | 781252 | 0 | 273 / 6 / 267 / 0 |
| profile-s11-stride16k | 4.486 | 4.700 | 48828 | 4 | 48832 | 48831 | 0 | 273 / 6 / 267 / 0 |
| profile-s11-clock16 | 4.524 | 4.730 | 781250 | 3 | 781253 | 48828 | 0 | 273 / 6 / 267 / 0 |
| profile-s11-probes | 5.043 | 5.250 | 781250 | 3 | 781253 | 781252 | 1520196 | 273 / 6 / 267 / 0 |
| profile-s11-audit-off | 4.688 | 4.900 | — | — | — | — | 0 | 273 / 6 / 267 / 0 |
| profile-s11-base | 4.755 | 4.986 | 781250 | 3 | 781253 | 781252 | 0 | 273 / 6 / 267 / 0 |

Counters, coarse phase probes and RAM sampling have separate controls. Mandatory finite-work polling and CDP quiet-runtime auditing remain common costs. Two seeds with one repeat are diagnostic evidence, not a robust statistical speedup estimate. Compare collector work and saved bytes before interpreting time differences. Inclusive timers overlap; throughSnapshotMs includes any open, censored timer. Do not sum them.

## Coarse phase probes

| Trial / phase timer | Closed ms | Through snapshot ms | Calls | Open at stop |
|---|---:|---:|---:|---|
| profile-s1-probes / sieving-inclusive | 0.000 | 4982.600 | 1 | true |
| profile-s1-probes / base-poly | 71.300 | 71.300 | 1 | false |
| profile-s1-probes / next-small | 18.300 | 18.300 | 690 | false |
| profile-s1-probes / next-large | 217.000 | 217.000 | 323640 | false |
| profile-s1-probes / plus-init | 8.300 | 8.300 | 691 | false |
| profile-s1-probes / bucket | 1562.900 | 1562.900 | 323640 | false |
| profile-s1-probes / sieve-small | 2366.300 | 2368.800 | 24862 | true |
| profile-s1-probes / sieve-large | 294.700 | 294.700 | 24861 | false |
| profile-s1-probes / scan-inclusive | 263.300 | 263.300 | 24861 | false |
| profile-s1-probes / trial-inclusive | 169.800 | 169.800 | 32264 | false |
| profile-s1-probes / trial-small | 42.100 | 42.100 | 2451 | false |
| profile-s1-probes / trial-large | 55.600 | 55.600 | 2451 | false |
| profile-s1-probes / residual-split | 22.200 | 22.200 | 219 | false |
| profile-s11-probes / sieving-inclusive | 0.000 | 4895.300 | 1 | true |
| profile-s11-probes / base-poly | 72.200 | 72.200 | 1 | false |
| profile-s11-probes / next-small | 17.600 | 17.600 | 690 | false |
| profile-s11-probes / next-large | 213.400 | 213.400 | 323545 | false |
| profile-s11-probes / plus-init | 7.800 | 7.800 | 690 | false |
| profile-s11-probes / bucket | 1537.800 | 1539.200 | 323546 | true |
| profile-s11-probes / sieve-small | 2324.800 | 2324.800 | 24840 | false |
| profile-s11-probes / sieve-large | 277.600 | 277.600 | 24840 | false |
| profile-s11-probes / scan-inclusive | 263.500 | 263.500 | 24840 | false |
| profile-s11-probes / trial-inclusive | 167.900 | 167.900 | 31942 | false |
| profile-s11-probes / trial-small | 42.500 | 42.500 | 2466 | false |
| profile-s11-probes / trial-large | 52.700 | 52.700 | 2466 | false |
| profile-s11-probes / residual-split | 23.000 | 23.000 | 231 | false |

The sieving-inclusive timer covers do_sieving_internal only; factor-base initialization and later matrix phases are outside it. Residual-split covers the explicitly instrumented SQUFOF call, not every large-prime decision. Unreached matrix phases cannot be profiled from these short collection trials.

## Parameter controls

| Trial | Request s | Work | FB size | Unique / full / partial / cycles | Target | Native verified |
|---|---:|---:|---:|---|---:|---|
| parameter-RSA-100-s1-base | 9.097 | 1553555769 | 97647 | 564 / 5 / 559 / 0 | 97743 | true |
| parameter-RSA-100-s1-fb80 | 9.076 | 1585434762 | 78117 | 409 / 5 / 404 / 0 | 78213 | true |
| parameter-RSA-100-s1-interval50 | 9.092 | 1458113320 | 97647 | 533 / 6 / 527 / 0 | 97743 | true |
| parameter-RSA-100-s1-lp75 | 9.098 | 1543112087 | 97647 | 374 / 5 / 369 / 0 | 97743 | true |
| parameter-RSA-100-s11-lp75 | 9.089 | 1554086998 | 97647 | 358 / 16 / 342 / 0 | 97743 | true |
| parameter-RSA-100-s11-interval50 | 9.093 | 1448485123 | 97647 | 516 / 6 / 510 / 0 | 97743 | true |
| parameter-RSA-100-s11-fb80 | 9.072 | 1574860563 | 78117 | 407 / 8 / 399 / 0 | 78213 | true |
| parameter-RSA-100-s11-base | 9.097 | 1553878304 | 97647 | 551 / 15 / 536 / 0 | 97743 | true |
| parameter-full-balanced-96-1-s1-base | 9.088 | 1600446960 | 84706 | 1032 / 17 / 1015 / 0 | 84802 | true |
| parameter-full-balanced-96-1-s1-fb80 | 9.063 | 1625573320 | 67764 | 768 / 15 / 753 / 0 | 67860 | true |
| parameter-full-balanced-96-1-s1-interval50 | 9.089 | 1498480489 | 84706 | 983 / 16 / 967 / 0 | 84802 | true |
| parameter-full-balanced-96-1-s1-lp75 | 9.078 | 1587080938 | 84706 | 669 / 17 / 652 / 0 | 84802 | true |
| parameter-full-balanced-96-1-s11-lp75 | 9.086 | 1589563293 | 84706 | 627 / 7 / 620 / 0 | 84802 | true |
| parameter-full-balanced-96-1-s11-interval50 | 9.089 | 1498124596 | 84706 | 975 / 19 / 956 / 0 | 84802 | true |
| parameter-full-balanced-96-1-s11-fb80 | 9.068 | 1611740556 | 67764 | 722 / 5 / 717 / 0 | 67860 | true |
| parameter-full-balanced-96-1-s11-base | 9.085 | 1579637153 | 84706 | 964 / 7 / 957 / 0 | 84802 | true |

Each parameter changes one setting. Wall/work ceilings are equal; instrumented work is not an equal primitive-operation count across parameter choices. Relation yield, target size, matrix readiness and memory must be considered together. Losing candidates and failures remain in raw files.

## Shared two-stream collection

| Input | One Worker request s | Two Workers request s | Mean request ratio | Equal-work byte identity |
|---|---|---|---:|---|
| RSA-100 | 9.711, 9.638 | 4.986, 5.072 | 1.924 | true |
| full-balanced-96-1 | 9.390, 9.330 | 4.887, 4.805 | 1.932 | true |

Both controls run seeds 1 and 11 with the same aggregate allowance and host deadline. Collectors retire before one fresh merger; every unique imported relation is verified natively and one common large-prime graph is rebuilt. Lane cycle counts are never added. Equal-work hashes above are checked across both repeats and worker counts; time-censored runs cannot establish this comparison.

WASM is fixed at 256MiB per instance, at most 512MiB concurrently. Combined source records are capped at 16MiB/200000 relations; live serialized buffers at 64MiB. Chrome-tree RSS/PSS are sampled, include other overhead and are not a hard whole-browser cap. No network activity occurred after initial assets in any trial; detector positive controls ran afterwards.

The 96-digit balanced input is a fixed constructive corpus case, not a representative distribution; prior p−1 construction bias remains. RSA100 and this case cannot establish general maximum digits. Stage13 used different memory/save bounds, so old/new speed ratios are not inferred. Alpertron, native YAFU and GNFS remain separate alternatives with no browser performance comparison here.

## Raw evidence

| Trial | Status | Raw | SHA256 |
|---|---|---|---|
| profile-s1-base | verified | [JSON](staged-siqs-lab-stage14/profile-s1-base.json), [log](staged-siqs-lab-stage14/profile-s1-base.log) | cd83d03b8d78f4641e35626995169069731d3afaf647f2a69d1b1f675975e865 |
| profile-s1-audit-off | verified | [JSON](staged-siqs-lab-stage14/profile-s1-audit-off.json), [log](staged-siqs-lab-stage14/profile-s1-audit-off.log) | cbe8fb8ca8d462086fb3ae9e0d0816f2c3104f6e7a98f4bf1b60629cb70c6ee0 |
| profile-s1-probes | verified | [JSON](staged-siqs-lab-stage14/profile-s1-probes.json), [log](staged-siqs-lab-stage14/profile-s1-probes.log) | eb8b87c042ad6bcdc4d9beff6577ac9ec6fa501d274a61255a1c3c24bc57c6cc |
| profile-s1-clock16 | verified | [JSON](staged-siqs-lab-stage14/profile-s1-clock16.json), [log](staged-siqs-lab-stage14/profile-s1-clock16.log) | 3db0c61a48b641ea654741eae2726b03205b63fa2e3e21f61a484ea7442dc8ed |
| profile-s1-stride16k | verified | [JSON](staged-siqs-lab-stage14/profile-s1-stride16k.json), [log](staged-siqs-lab-stage14/profile-s1-stride16k.log) | df4c05d3fbd33cd776de486eac1e8c24153c323270e33ce050f61ae498cccb67 |
| profile-s1-ram-off | verified | [JSON](staged-siqs-lab-stage14/profile-s1-ram-off.json), [log](staged-siqs-lab-stage14/profile-s1-ram-off.log) | fd98240d28f996e5a08eaecec6432e5de78472cc5b5926972313622fbf1f220a |
| profile-s1-base-repeat | verified | [JSON](staged-siqs-lab-stage14/profile-s1-base-repeat.json), [log](staged-siqs-lab-stage14/profile-s1-base-repeat.log) | 69c652581a9b7f4552c8e57656a8c771209f7678a1f2034313be6b6831e01bc5 |
| profile-s11-base-repeat | verified | [JSON](staged-siqs-lab-stage14/profile-s11-base-repeat.json), [log](staged-siqs-lab-stage14/profile-s11-base-repeat.log) | d4b2de264febecbe81dd60b83265eaeb3b0aa985b0818e619699b5d178b7968f |
| profile-s11-ram-off | verified | [JSON](staged-siqs-lab-stage14/profile-s11-ram-off.json), [log](staged-siqs-lab-stage14/profile-s11-ram-off.log) | 2477c52dfd47a045ab0abdfcf90cb6641b536b4a2c075e9f55fd2b4c202e4978 |
| profile-s11-stride16k | verified | [JSON](staged-siqs-lab-stage14/profile-s11-stride16k.json), [log](staged-siqs-lab-stage14/profile-s11-stride16k.log) | f5d4f2dc0335798cee4c36ea3d80f45225d74125f73670091f1af1dfbd07a4b2 |
| profile-s11-clock16 | verified | [JSON](staged-siqs-lab-stage14/profile-s11-clock16.json), [log](staged-siqs-lab-stage14/profile-s11-clock16.log) | 85c406f5fb66270f8244dc05b1d813ed4755ae195d6040e17d1604821692a3d9 |
| profile-s11-probes | verified | [JSON](staged-siqs-lab-stage14/profile-s11-probes.json), [log](staged-siqs-lab-stage14/profile-s11-probes.log) | aa23a7a8190a0229d51bd87a2659a7669d73b5c93ece834a20cd14b162c48222 |
| profile-s11-audit-off | verified | [JSON](staged-siqs-lab-stage14/profile-s11-audit-off.json), [log](staged-siqs-lab-stage14/profile-s11-audit-off.log) | e7e1a828ed624a806b04801a8b56ddfd2988171044a189b8d9ce9232d4f238a1 |
| profile-s11-base | verified | [JSON](staged-siqs-lab-stage14/profile-s11-base.json), [log](staged-siqs-lab-stage14/profile-s11-base.log) | e679ab250ca259c995be02841948034e9e595523d99b3662b86d286bf114e040 |
| parameter-RSA-100-s1-base | verified | [JSON](staged-siqs-lab-stage14/parameter-RSA-100-s1-base.json), [log](staged-siqs-lab-stage14/parameter-RSA-100-s1-base.log) | 3575690f39d78ac1a3e6ff6978e41ba7c618c8d6222860796bc37a0955e51f46 |
| parameter-RSA-100-s1-fb80 | verified | [JSON](staged-siqs-lab-stage14/parameter-RSA-100-s1-fb80.json), [log](staged-siqs-lab-stage14/parameter-RSA-100-s1-fb80.log) | 6886b209a64b2ae8396230de58b33f5303ced558c4580222ab844cfd7043790f |
| parameter-RSA-100-s1-interval50 | verified | [JSON](staged-siqs-lab-stage14/parameter-RSA-100-s1-interval50.json), [log](staged-siqs-lab-stage14/parameter-RSA-100-s1-interval50.log) | 789cec1d8369b70497b4acd6a8839b0299255ebb2e5808c42ed1ff764320ae50 |
| parameter-RSA-100-s1-lp75 | verified | [JSON](staged-siqs-lab-stage14/parameter-RSA-100-s1-lp75.json), [log](staged-siqs-lab-stage14/parameter-RSA-100-s1-lp75.log) | 8857fb3be377496c4224041d36daf4291eb89a42266dedf4b1d3b7e8a6334fb0 |
| parameter-RSA-100-s11-lp75 | verified | [JSON](staged-siqs-lab-stage14/parameter-RSA-100-s11-lp75.json), [log](staged-siqs-lab-stage14/parameter-RSA-100-s11-lp75.log) | 0e9c83c360a6a6bfa5dbb5c14be2c9a01889c012e07af8d6bdb77511f321a054 |
| parameter-RSA-100-s11-interval50 | verified | [JSON](staged-siqs-lab-stage14/parameter-RSA-100-s11-interval50.json), [log](staged-siqs-lab-stage14/parameter-RSA-100-s11-interval50.log) | 58e65b6bb4f1d620b50f91d931255c38134da8756aa5e14ebdeab49d4378004d |
| parameter-RSA-100-s11-fb80 | verified | [JSON](staged-siqs-lab-stage14/parameter-RSA-100-s11-fb80.json), [log](staged-siqs-lab-stage14/parameter-RSA-100-s11-fb80.log) | fafecc86c5128612d28d856943e7c4170952ddceb24c2e1a8e63a6f22153d059 |
| parameter-RSA-100-s11-base | verified | [JSON](staged-siqs-lab-stage14/parameter-RSA-100-s11-base.json), [log](staged-siqs-lab-stage14/parameter-RSA-100-s11-base.log) | 7173be9a4c2d9743f1e1f430fed6a096ca54b5f0751fff02b408c2351ba0d33e |
| parameter-full-balanced-96-1-s1-base | verified | [JSON](staged-siqs-lab-stage14/parameter-full-balanced-96-1-s1-base.json), [log](staged-siqs-lab-stage14/parameter-full-balanced-96-1-s1-base.log) | 09fecc02450edfdd87adbadec6b291e2fb66f96c36cdaaef20ecbef2d4d41db5 |
| parameter-full-balanced-96-1-s1-fb80 | verified | [JSON](staged-siqs-lab-stage14/parameter-full-balanced-96-1-s1-fb80.json), [log](staged-siqs-lab-stage14/parameter-full-balanced-96-1-s1-fb80.log) | 732db82ab7cb139b20329eae11f28ffdd281692b69510322adee5a5fd9f63dcf |
| parameter-full-balanced-96-1-s1-interval50 | verified | [JSON](staged-siqs-lab-stage14/parameter-full-balanced-96-1-s1-interval50.json), [log](staged-siqs-lab-stage14/parameter-full-balanced-96-1-s1-interval50.log) | 794131cb5f28ecbd674e62f891a495240305552bfd531c0e25dbe5cc3e69a2c5 |
| parameter-full-balanced-96-1-s1-lp75 | verified | [JSON](staged-siqs-lab-stage14/parameter-full-balanced-96-1-s1-lp75.json), [log](staged-siqs-lab-stage14/parameter-full-balanced-96-1-s1-lp75.log) | 9cfb1a1bb871f4a26db25a8503f37f9dbb1e472ddfac2672bee4875651c639a1 |
| parameter-full-balanced-96-1-s11-lp75 | verified | [JSON](staged-siqs-lab-stage14/parameter-full-balanced-96-1-s11-lp75.json), [log](staged-siqs-lab-stage14/parameter-full-balanced-96-1-s11-lp75.log) | 1f988c6da20997e94275d2f266d557432c0c8dbf3e41f3cdbcbb1e4ca7b85f86 |
| parameter-full-balanced-96-1-s11-interval50 | verified | [JSON](staged-siqs-lab-stage14/parameter-full-balanced-96-1-s11-interval50.json), [log](staged-siqs-lab-stage14/parameter-full-balanced-96-1-s11-interval50.log) | 02e02ab737078358c7759574cae834ced0e4fc6f60cc08096a0621082d41ebe5 |
| parameter-full-balanced-96-1-s11-fb80 | verified | [JSON](staged-siqs-lab-stage14/parameter-full-balanced-96-1-s11-fb80.json), [log](staged-siqs-lab-stage14/parameter-full-balanced-96-1-s11-fb80.log) | a94f31d333e7fe089b5012e5e714c2fef24dca5da65d7e43ec31be130105579e |
| parameter-full-balanced-96-1-s11-base | verified | [JSON](staged-siqs-lab-stage14/parameter-full-balanced-96-1-s11-base.json), [log](staged-siqs-lab-stage14/parameter-full-balanced-96-1-s11-base.log) | 27d55eaa08f32e07be9cf1e8c2026d679162702f7fecb411918bf01229d40b41 |
| pool-RSA-100-r0-w1 | verified | [JSON](staged-siqs-lab-stage14/pool-RSA-100-r0-w1.json), [log](staged-siqs-lab-stage14/pool-RSA-100-r0-w1.log) | 8d4a2b9cc88fd67bd2141f6b998f5913ed84006b1533c37248dc1db15a8c1e46 |
| pool-RSA-100-r1-w2 | verified | [JSON](staged-siqs-lab-stage14/pool-RSA-100-r1-w2.json), [log](staged-siqs-lab-stage14/pool-RSA-100-r1-w2.log) | 1ab68241f6fcf012bb94aa7be844dd14f8d331c368f564a86b2528ae17d86354 |
| pool-RSA-100-r2-w2 | verified | [JSON](staged-siqs-lab-stage14/pool-RSA-100-r2-w2.json), [log](staged-siqs-lab-stage14/pool-RSA-100-r2-w2.log) | fffbf94aa5b979ca3e6ad3c4267a5572b899036775c4dd9e733ac753ced30539 |
| pool-RSA-100-r3-w1 | verified | [JSON](staged-siqs-lab-stage14/pool-RSA-100-r3-w1.json), [log](staged-siqs-lab-stage14/pool-RSA-100-r3-w1.log) | d76e3b9771795cc2f5938ef78af5046149eb8c36f74c8727adf6a04091e49ac2 |
| pool-full-balanced-96-1-r0-w1 | verified | [JSON](staged-siqs-lab-stage14/pool-full-balanced-96-1-r0-w1.json), [log](staged-siqs-lab-stage14/pool-full-balanced-96-1-r0-w1.log) | c58d1f9d04b3dc8b9f35978327132b1cc709182df74a49dbe596ca515e3497c2 |
| pool-full-balanced-96-1-r1-w2 | verified | [JSON](staged-siqs-lab-stage14/pool-full-balanced-96-1-r1-w2.json), [log](staged-siqs-lab-stage14/pool-full-balanced-96-1-r1-w2.log) | 9f12c7ccf0c7e45b1cf1702c9d338f1c22efc22bb5f5f3c1f75748f782aa91c9 |
| pool-full-balanced-96-1-r2-w2 | verified | [JSON](staged-siqs-lab-stage14/pool-full-balanced-96-1-r2-w2.json), [log](staged-siqs-lab-stage14/pool-full-balanced-96-1-r2-w2.log) | 8aff158aab1de27c69b0a2666335a566800f01096653e27e7b5adb8081fabbd7 |
| pool-full-balanced-96-1-r3-w1 | verified | [JSON](staged-siqs-lab-stage14/pool-full-balanced-96-1-r3-w1.json), [log](staged-siqs-lab-stage14/pool-full-balanced-96-1-r3-w1.log) | 4d91d9462b819f329591df93700909f10515cd20359e6c2abfaa56201c4631dc |

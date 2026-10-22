# Stage15 bounded RSA100 SIQS optimization

Measured head: b25dfa54af9c0b585ee7e14cd6e3466e7cfca4be. [Frozen 28-trial plan](../../bench/staged-siqs-opt-plan.json). Historical Stage14 38 trials and all old source/artifacts remain unchanged.

The baseline and LTO artifacts use identical C patches and upstream bytes. LTO adds only -flto to existing msieve compile/link flags (-O3); GMP stays -O2. Both profiles use the same new version15 wrapper, at most 60s, fixed 256MiB WASM per owner, and the same source verification. This measures a compiler candidate, not a new factorization algorithm.

## Equal-work short comparisons

All 24 streams-pairs reach the prescribed work: true. Each seed has identical saved bytes across every compiler, monitor, worker count and repeat: true. Every actual relation is checked again natively; verified means relation proof, not complete factorization.

| Workers | Engine | Monitoring | Request s mean (min–max) | Baseline/request ratio |
|---:|---|---|---|---:|
| 1 | base | base | 9.619 (9.595–9.643) | 1.000 |
| 1 | base | clock16 | 9.306 (9.270–9.342) | 1.034 |
| 1 | base | stride16k | 9.323 (9.274–9.373) | 1.032 |
| 1 | lto | base | 7.833 (7.829–7.838) | 1.228 |
| 1 | lto | clock16 | 7.397 (7.390–7.404) | 1.300 |
| 1 | lto | stride16k | 7.388 (7.338–7.438) | 1.302 |
| 2 | base | base | 5.123 (5.122–5.124) | 1.000 |
| 2 | base | clock16 | 4.966 (4.954–4.978) | 1.032 |
| 2 | base | stride16k | 4.849 (4.738–4.960) | 1.056 |
| 2 | lto | base | 4.148 (4.085–4.212) | 1.235 |
| 2 | lto | clock16 | 3.964 (3.930–3.998) | 1.292 |
| 2 | lto | stride16k | 3.950 (3.892–4.008) | 1.297 |

These are two alternating-order observations per condition on one host. Initial Worker compilation, computation, proof and delivery are included in request time; source asset loading is separately recorded. Mandatory budget polling and CDP auditing remain. No statistical confidence interval or general speed guarantee is claimed.

## Four 60-second horizon trials

The fixed ABBA comparison is base/base versus LTO/stride16k. It combines compiler and callback changes; the short factorial separates their effects. Both use two streams, the same seeds 1/11, total work ceiling 1000000000000, common managed-WASM ceiling 512MiB and one initialization-inclusive 60000ms host deadline. Known C work, graph work and conservatively charged unknown terminated work remain distinct.

| Trial | Request s | Charged work | Unique / full / partial / common cycles | Lane cycles sum | Target | Proof | Peak sampled PSS MiB |
|---|---:|---:|---|---:|---:|---|---:|
| long-r0-base-base | 59.160 | 20406348791 | 7052 / 100 / 6952 / 1 | 0 | 97743 | true | 517.6 |
| long-r1-lto-stride16k | 59.173 | 27816601076 | 9546 / 146 / 9400 / 2 | 1 | 97743 | true | 519.0 |
| long-r2-lto-stride16k | 59.177 | 27765117758 | 9531 / 146 / 9385 / 2 | 1 | 97743 | true | 518.5 |
| long-r3-base-base | 59.155 | 20603458551 | 7119 / 100 / 7019 / 1 | 0 | 97743 | true | 516.4 |

A time-budget collection stop is censoring; later successful relation verification does not turn it into completed factorization. Raw files retain every phase, open condition, failure and host stop. Matrix work and RSA100 completion must be demonstrated, never extrapolated from relation yield.

WASM allocations are fixed/unshared with rejected growth. Combined saves remain at most16MiB/200000 records and live serialized buffers64MiB; browser RSS/PSS are sampled and include additional JS/browser overhead, not a hard whole-browser RAM cap. The optimized WASM is 192409 bytes versus 138700 baseline bytes, so artifact/initialization cost is also relevant. No runtime network activity was observed; source server stopped before every calculation and detector positive controls ran afterwards.

## Raw evidence

| Trial | Result | Receipt and log | SHA256 |
|---|---|---|---|
| short-w1-r0-base-base | verified | [JSON](staged-siqs-opt-stage15/short-w1-r0-base-base.json), [log](staged-siqs-opt-stage15/short-w1-r0-base-base.log) | fa3a2e9deb78f71e548c884ba031ef45c9e0fefa303ad432b13382d35d82290f |
| short-w1-r0-base-clock16 | verified | [JSON](staged-siqs-opt-stage15/short-w1-r0-base-clock16.json), [log](staged-siqs-opt-stage15/short-w1-r0-base-clock16.log) | 67885748c3866196b7c01a09b7f99deeda3d26bff1c13d44b9cea9caff28d8fe |
| short-w1-r0-base-stride16k | verified | [JSON](staged-siqs-opt-stage15/short-w1-r0-base-stride16k.json), [log](staged-siqs-opt-stage15/short-w1-r0-base-stride16k.log) | d16de0c9c59f1c22f95e055126d23e31947fc00fa2fd74eaaa85590775074c1c |
| short-w1-r0-lto-base | verified | [JSON](staged-siqs-opt-stage15/short-w1-r0-lto-base.json), [log](staged-siqs-opt-stage15/short-w1-r0-lto-base.log) | 8ea7c731ae5bda922d123d720ca0afc489139d7ac2cf8da5eaebf1a9dc039cee |
| short-w1-r0-lto-clock16 | verified | [JSON](staged-siqs-opt-stage15/short-w1-r0-lto-clock16.json), [log](staged-siqs-opt-stage15/short-w1-r0-lto-clock16.log) | 58b194c3ab0c2fe3ed3c06bfef049d5eb0d592138492b9bd8cb38eae87c484db |
| short-w1-r0-lto-stride16k | verified | [JSON](staged-siqs-opt-stage15/short-w1-r0-lto-stride16k.json), [log](staged-siqs-opt-stage15/short-w1-r0-lto-stride16k.log) | e4d485e268dc8bfc073a8002822e87c29bcdf1cfefb79db5b729360286554ecb |
| short-w1-r1-lto-stride16k | verified | [JSON](staged-siqs-opt-stage15/short-w1-r1-lto-stride16k.json), [log](staged-siqs-opt-stage15/short-w1-r1-lto-stride16k.log) | 510c66e52b7deea27f62977e541ffddc8d4702f4c072ea2089918e14c32b2e57 |
| short-w1-r1-lto-clock16 | verified | [JSON](staged-siqs-opt-stage15/short-w1-r1-lto-clock16.json), [log](staged-siqs-opt-stage15/short-w1-r1-lto-clock16.log) | 462847173e77de55f7a157cd548e87d7c698da6fd84a9dd37fe434924c837a97 |
| short-w1-r1-lto-base | verified | [JSON](staged-siqs-opt-stage15/short-w1-r1-lto-base.json), [log](staged-siqs-opt-stage15/short-w1-r1-lto-base.log) | 5d7b304020f9fddd3e3030ccbbee1b3d777d1bc967f51044f01aa82c85e94032 |
| short-w1-r1-base-stride16k | verified | [JSON](staged-siqs-opt-stage15/short-w1-r1-base-stride16k.json), [log](staged-siqs-opt-stage15/short-w1-r1-base-stride16k.log) | c6476c9fe7c72ac618ce6934b01007bbfbb66d67d3968b0b43e98eab3c1fc895 |
| short-w1-r1-base-clock16 | verified | [JSON](staged-siqs-opt-stage15/short-w1-r1-base-clock16.json), [log](staged-siqs-opt-stage15/short-w1-r1-base-clock16.log) | fdde35fb7bc4cedd7e2121f333db82b02225f9a893afee72737a685cd8a1b39b |
| short-w1-r1-base-base | verified | [JSON](staged-siqs-opt-stage15/short-w1-r1-base-base.json), [log](staged-siqs-opt-stage15/short-w1-r1-base-base.log) | ecbb0cdc6c9c780e82a068b1d950b4c2d129901c80785b14fb0855d878802709 |
| short-w2-r0-base-base | verified | [JSON](staged-siqs-opt-stage15/short-w2-r0-base-base.json), [log](staged-siqs-opt-stage15/short-w2-r0-base-base.log) | 2ce74ada95168ddf62ab39cf1b1c279bfa7b3d7b1fc2e4611f3e14cd7a6d585a |
| short-w2-r0-base-clock16 | verified | [JSON](staged-siqs-opt-stage15/short-w2-r0-base-clock16.json), [log](staged-siqs-opt-stage15/short-w2-r0-base-clock16.log) | ac5bf9c50d3eaaa9b38bc9887c463292696b860f6738fa951f2dc0a6cadefc3c |
| short-w2-r0-base-stride16k | verified | [JSON](staged-siqs-opt-stage15/short-w2-r0-base-stride16k.json), [log](staged-siqs-opt-stage15/short-w2-r0-base-stride16k.log) | 08a8d24e22939e3878ead74c9d3b346b96a43cacb57f2c731a4df0a5977d759e |
| short-w2-r0-lto-base | verified | [JSON](staged-siqs-opt-stage15/short-w2-r0-lto-base.json), [log](staged-siqs-opt-stage15/short-w2-r0-lto-base.log) | a13fb8129a4d2bb692b1b0637d2abe66daa9b3a273337b46ba41c09ff2805b0e |
| short-w2-r0-lto-clock16 | verified | [JSON](staged-siqs-opt-stage15/short-w2-r0-lto-clock16.json), [log](staged-siqs-opt-stage15/short-w2-r0-lto-clock16.log) | 47741d586d9716ce5da17c9d7e38cb189545f629103447bb2b0a41ce5ef93294 |
| short-w2-r0-lto-stride16k | verified | [JSON](staged-siqs-opt-stage15/short-w2-r0-lto-stride16k.json), [log](staged-siqs-opt-stage15/short-w2-r0-lto-stride16k.log) | 1e6245fe7526863705703f766c70e25f1739a284603a063faafbe6f7e5d344bd |
| short-w2-r1-lto-stride16k | verified | [JSON](staged-siqs-opt-stage15/short-w2-r1-lto-stride16k.json), [log](staged-siqs-opt-stage15/short-w2-r1-lto-stride16k.log) | 80b1d1bc8d7b0aeaa115db0342ab3c48743a535ce8a8cc56b411515347df9d5c |
| short-w2-r1-lto-clock16 | verified | [JSON](staged-siqs-opt-stage15/short-w2-r1-lto-clock16.json), [log](staged-siqs-opt-stage15/short-w2-r1-lto-clock16.log) | 061669086289702adcbdd12cf95607bb4693396425316b03db54e4aa1e69fd90 |
| short-w2-r1-lto-base | verified | [JSON](staged-siqs-opt-stage15/short-w2-r1-lto-base.json), [log](staged-siqs-opt-stage15/short-w2-r1-lto-base.log) | a4c58d682894b28ebc0a7072c80961f7559424b77e32d06571621682fb2b502c |
| short-w2-r1-base-stride16k | verified | [JSON](staged-siqs-opt-stage15/short-w2-r1-base-stride16k.json), [log](staged-siqs-opt-stage15/short-w2-r1-base-stride16k.log) | 8c9ab5ec5b540d8726cb44b628fff8505d9a9a78358e9d1f79efe34e4d862766 |
| short-w2-r1-base-clock16 | verified | [JSON](staged-siqs-opt-stage15/short-w2-r1-base-clock16.json), [log](staged-siqs-opt-stage15/short-w2-r1-base-clock16.log) | 98434be3f6d650c33d0e206222cf4f75d1e5de3eafabf37c8c8ffb0477b7bb23 |
| short-w2-r1-base-base | verified | [JSON](staged-siqs-opt-stage15/short-w2-r1-base-base.json), [log](staged-siqs-opt-stage15/short-w2-r1-base-base.log) | fa8b828caceb766a22d4d15721a1cb6ac44e4388b8693be6ab40a6978731988d |
| long-r0-base-base | verified | [JSON](staged-siqs-opt-stage15/long-r0-base-base.json), [log](staged-siqs-opt-stage15/long-r0-base-base.log) | 6ef5d600b0773b6a1f26a371f624cdbc79a19fab3a5054b94567f591ff859931 |
| long-r1-lto-stride16k | verified | [JSON](staged-siqs-opt-stage15/long-r1-lto-stride16k.json), [log](staged-siqs-opt-stage15/long-r1-lto-stride16k.log) | 0e918413db475a203eaf9c3bdceed62b78af89e1a8da8cd5c44e7048330e4b02 |
| long-r2-lto-stride16k | verified | [JSON](staged-siqs-opt-stage15/long-r2-lto-stride16k.json), [log](staged-siqs-opt-stage15/long-r2-lto-stride16k.log) | eab8b8d36caee899796aaece0b313c8fc73f35fc626c3aa7d585de662729eeeb |
| long-r3-base-base | verified | [JSON](staged-siqs-opt-stage15/long-r3-base-base.json), [log](staged-siqs-opt-stage15/long-r3-base-base.log) | 2338a90b783ffc06f639367f759debee8c4f733f79f59dfd8b627951b8b63696 |

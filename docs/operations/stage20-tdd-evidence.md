# Stage20 verification evidence

The design and finite eight-trial grid were committed before implementation in `65b2ffb8973e2c6f486abf7dea6a7fe89b9ee499`.

LLM-01 task directory `prime-stage20` retains actual preparation results:

- `contracts-red.log` → `contracts-green.log`: missing geometry contract module, then four named settings, coupled LP/threshold checks and bounded ordered A samples pass.
- `decision-red.log` → `decision-green.log`: missing normalized gate module, then both repetitions, actual target normalization, tie-to-baseline and abnormal/missing/duplicate record rejection pass.
- `build-first.log`: two clean WASM builds matched, then output failed because the new runtime directory was not yet created. The build script now creates output parents. This was an output-preparation failure, not a numerical comparison.
- `build-green.log`: two fresh isolated builds both produced419,203 bytes, SHA-256 `eaea066bec0a7605c6e5aad2b9a1588d725a31669651db4dc0234f5cda2edb62`, and saved the artifact/receipt.
- `native-preflight.log`: five tests passed, including all four real RSA native packet/configuration controls and unchanged-geometry equality to the Stage19 family body.
- `browser-first.log`: all sixteen actual Chrome/Blob-Worker/WASM contracts passed for the unchanged geometry. The frozen campaign runs the same contracts for all four profiles before timing.

The native preflight observes k=139 and Q2=true. B3.25M has FB116,448/target116,512/lp_bits54; B2.5M has FB91,267/target91,331/lp_bits53. Halfwidth524,288 yields target-A149bits;262,144 yields150bits. All four sampled contexts have13 A factors and2,048 variants. These are actual native observations, not an assertion of final factorization performance.

Independent read-only native/API review found P1=0,P2=0,P3=0 before measurement. Full plan/gate/driver review, final-head tests, comparison results and CI are recorded at handoff.

The complete premeasurement Node suite passed344 tests. The frozen campaign completed all four browser contract configurations and all eight short trials, with no candidate meeting both1.15 normalized-progress gates. Generated reports validate every raw/log/source hash, within-geometry family/prefix equality and the unchanged Stage19 native baseline. Exact final-head test/review/CI results are supplied with the handoff.

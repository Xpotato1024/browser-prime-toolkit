# LLM-01: dedicated coordinator screen stopped before performance trials

Measured source core `4203aab1703e9129fd3e86343c485c334bbccc4a`; plan `dedicated-coordinator-stage22-20261020`; started 2026-10-20T17:28:47.262Z.

Combined4 and dedicated2/3/4 each passed16 actual Chrome contract checks, including offline positive network detectors and owner/source retirement. The first fixed-family control then failed during Page.navigate after the existing5s CDP deadline. Its diagnostic contains only the page and its entry-module requests, no attached Worker and no runtime error. No fixed-family receipt or timed trial was produced. This is a harness navigation failure, not an engine performance result.

The predeclared no-retry rule was followed. Original failed output remains intact; there was no second series, overwrite, parameter tuning or adoption. Dedicated versus combined performance and family equality are untested by this stage. The independently reviewed experimental runner remains isolated from the private UI and automatic policy. Stage21 completed results remain the basis for manual1..4 controls; automatic count remains<=2.

No RSA-100 completion, completion-time estimate, phone behavior or portable speedup is established. A future comparison needs a separately reviewed harness startup policy and a new predeclared study; do not silently resume this series.

- contracts-combined-w4: [raw](staged-coordinator-stage22/contracts-combined-w4.json), [log](staged-coordinator-stage22/contracts-combined-w4.log)
- contracts-dedicated-w2: [raw](staged-coordinator-stage22/contracts-dedicated-w2.json), [log](staged-coordinator-stage22/contracts-dedicated-w2.log)
- contracts-dedicated-w3: [raw](staged-coordinator-stage22/contracts-dedicated-w3.json), [log](staged-coordinator-stage22/contracts-dedicated-w3.log)
- contracts-dedicated-w4: [raw](staged-coordinator-stage22/contracts-dedicated-w4.json), [log](staged-coordinator-stage22/contracts-dedicated-w4.log)
- fixed-combined: [failure log](staged-coordinator-stage22/fixed-combined.log)

[Original incomplete manifest](staged-coordinator-stage22/run.json) binds all hashes and explicitly has zero timed trials. The separate aborted-report verifier checks this state, current/measured source hashes and the failure diagnostic. The original complete-series reporter deliberately continues to reject this incomplete study.

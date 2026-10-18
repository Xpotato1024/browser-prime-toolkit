# Repository instructions

## Scope and working rules
- This private repository builds a browser-only primality and integer-factorization toolkit.
- Read docs/README.md and relevant contracts before changes. Keep canonical documents under docs/.
- Design contracts before implementation. Use small behavior-level TDD red → green → refactor units; record actual results.
- Work on a branch. Push and Draft PR are authorized; implementation merge, publication, deployment and site integration require separate authorization.
- Use LLM-01 Desktop Commander. Run Git through WSL Ubuntu-24.04 login bash.
- Do not change other project checkouts, credentials, permissions or existing site PRs.
- Never commit intake archives, virtual environments, executables, secrets or unreviewed vendored bundles.
- Use UTF-8 without BOM and LF. Check encoding and git diff --check.

## Numeric and browser contracts
- Use BigInt for exact integer values; never round via Number. Bound input before expansion.
- Keep parsing, mathematical algorithms, worker protocol and presentation separate.
- Distinguish proven, probable, incomplete and cancelled results. Zero and one are neither prime nor composite.
- Grouping supplied factors does not prove primality or complete factorization.
- Do not introduce a custom integer type, manual division-based modulo, CDN, telemetry, dynamic remote code or storage.
- Dependencies require source/license/pin review and a demonstrated need. Do not relicense legacy code.
- Worker lifecycle, cancellation, stale results and time budgets must be tested before a browser calculation UI ships.
- Require a read-only independent agent review for changes to numeric contracts and input boundaries. Review final head and resolve findings before handoff.
- Run npm test, npm run check and required CI on the final head. Report what was not implemented or browser-tested.

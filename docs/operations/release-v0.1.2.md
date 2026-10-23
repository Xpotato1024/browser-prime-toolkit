# Compatibility release 0.1.2

This patch release includes merged PR30 and aligns package, lockfile and React adapter labels to 0.1.2. The numerical engines, budgets, GUI behavior, dependencies and CI workflows remain those of published 0.1.1. PR31 is not included. Its future sample/reset focus changes require new expectations and a separate browser acceptance run.

The source baseline is main commit `95fb33a6ca582eb73056aaf6a0a621c6cf2a3161`. The exact released source is the new `v0.1.2` tag target, recorded in the release's `RELEASE-PROVENANCE.json`. Do not move old tags or replace old assets. Publish a runtime ZIP, a complete tracked repository source ZIP, provenance and SHA256SUMS.txt. Browser acceptance JSON and viewport screenshots may accompany them as verification evidence, not additional runtime dependencies.

## Required verification

- Final source CI, `npm test`, `npm run check`, UTF-8/LF and `git diff --check`.
- Two separate clean checkouts produce identical distribution file sets, sizes and SHA-256 hashes using `scripts/build-site-release.mjs`.
- The generated package, browser-tool.json and adapter label all say 0.1.2; root package remains private, the distributed package retains only the existing pinned React peers.
- Verify every manifest file and required license/source/third-party text, including the musl original. Retain historical kernel/candidate maps; the tag/provenance is authoritative for this adapter.
- Run the existing bounded Firefox/WebKit acceptance runner against the actual 0.1.2 distribution, serially. Keep native copy success separate from injected denial/unsupported cases. Preserve the app-independent WebKit offline/Blob limitation.
- ZIPs contain only the generated runtime or tracked public source, never .git, untracked scratch files, credentials, local absolute paths or private intake. Verify the source archive against the tagged Git tree and inspect archive paths before uploading.
- Retrieve the public uploaded assets, compare SHA-256 and size to the local release files, then inspect the downloaded runtime manifest and source correspondence.

## Download and inspect

The release page is https://github.com/Xpotato1024/browser-prime-toolkit/releases/tag/v0.1.2 . Use `browser-prime-toolkit-v0.1.2.zip` for the React island package and `browser-prime-toolkit-v0.1.2-source.zip` for its complete source/rebuild instructions. This is a library package, not a standalone HTML application; opening an extracted module as a file is not an installation method. See the release's bounded browser evidence/screenshots for a visual check without changing a deployed host.

```sh
gh release download v0.1.2 --repo Xpotato1024/browser-prime-toolkit --dir release-0.1.2
cd release-0.1.2
sha256sum -c SHA256SUMS.txt
```

The source archive contains `scripts/verify-site-cross-browser.mjs`; its separately installed Playwright Core 1.61.0 and browser paths are configured as described in [the acceptance procedure](firefox-webkit-20261022.md). Rebuild the runtime to a fresh external directory, then use that runner to reproduce the bounded acceptance and screenshots.

## Limits

Physical iOS/Android devices, Safari application integration, real BFCache round trips, screen readers and native OS permission-denial dialogs remain unverified. A 390px desktop viewport is not an iPhone test. Native clipboard success means the user-gesture write promise resolved; denial/unavailable acceptance substitutes the page API. WebKit offline emulation on the measured Windows host fails even for an app-independent Blob Worker, so its successful acceptance uses the restrictive CSP and a quiet online HTTP trace. No speed/physical-memory guarantee, new release of the numerical kernels, npm publication, site asset update or deployment is implied.

# Public beta preparation

Baseline: `7de6c8d`, v0.7.0, `preferences-page`; clean installed checkout.
Current candidate: v0.9.2 beta. One candidate for Jay's Reload and the public package.

## v0.9.2 compact scroll prompt

Baseline 7217c0d. Removed the extra explanatory text and kept all three
choice buttons on one row. Page loading behavior and saved records are unchanged.
Scroll-consent/release checks passed (2/2), with desktop and narrow-layout visual
checks of the real content script and stylesheet. The v0.9.2 ZIP is rebuilt.

## v0.9.1 scroll consent and history overlap

Baseline 881fe1b, clean installed checkout. Scope: ask-first page loading,
Yes / No / Always controls, ten-page checkpoints and verified history overlap
handling after warning/resume. Retain loaded rows, date headings, profile
isolation, cancellation and native pagination. Existing records and permissions
are preserved. No artwork changes or live signed-in claims.

Combined gate: 46/46 suites passed. The prompt was visually checked in the actual
isolated unpacked extension. Windows independently extracted all 37 runtime files
and matched the tested source. Logs/audit: test-results/v091-combined.log and
v091-package-verification.json. Signed-in user acceptance remains open.

## v0.9.0 library-wide XML casing framework

Baseline b134285, clean installed checkout on preferences-page. Scope: a shared
source-independent casing collector, whole-library type selections on XML review,
an import entry from Display names, documented future Library Doctor boundary,
focused/actual-extension checks and updated beta package. Reuse existing XML
streaming, conflicts, atomic Apply and selective Revert. Keep storage formats,
identity and permissions intact. No changes in Library Doctor's checkout, no
cross-app connection, live metadata edits or publication. The live artwork
defect is separate and remains unresolved.

## v0.8.3 scrolling/artwork recovery

Baseline ff6fc13 (v0.8.2 beta), initially clean installed checkout. Scope:
temporary read-failure classification, bounded visible artwork recovery, real
scroll/extension integration, version labels and package. Native edit behavior,
album selection, local record formats, identity and permissions are unchanged.

The initial real-scroller insertion test passed unchanged. A temporary history
failure then reproduced a permanent blank. The actual unpacked-extension test
now verifies recovery while pages 2 and 3 load, tagged-album images/links on
initial and imported rows, unchanged preferences and completed-control removal.
Focused retry guards pass. All 42 suites are verified: combined 41/42, followed
by a passing focused rerun after the new fixture's first-install setup/navigation
race was removed. No runtime change was needed for that fixture correction.
Windows independently extracted and verified all 36 files against the audit
and tested source. ZIP: 237,752 bytes; SHA-256
`bde6d798574d2eacde9101db6523d87006dafc1b541d1064eff70379ed659ffb`.
Audit: test-results/v083-package-verification.json. The extracted ZIP passed
actual isolated-extension onboarding, record/profile preservation and no-write
checks (1/1; v083-extracted-install.log). Combined/focused logs:
v083-combined.log, v083-scroll-startup.log under test-results.
Public list inspection succeeded; public history/album pages returned HTTP 600.
This is a recovery candidate, with Jay's signed-in acceptance still pending.
Logs: test-results/v083-transient-before.log, v083-actual-scroll.log and
v083-retry-guards.log. Source rollback: ff6fc13.

## v0.8.2 artist Tracks follow-up

Baseline c4ef360 (v0.8.1 beta), initially clean installed checkout. Scope:
read-only native album parsing, a full artist Tracks regression, version labels,
release notes and regenerated package. Native write validation stays strict.
The regression failed with the exact scrobble-field verification error before
the correction and passes afterward, covering rank 42 and a later appended row.
The test also checks raw tag authority, mixed album counts, painted covers and
album links, duplicate-field refusal, unchanged preferences and cached revisits.
Public responses were Client Challenges; actual signed-in markup is unverified.

All 40 suites verified: combined 39/40, then the artwork suite passed its focused
rerun after its obsolete missing-album-artist negative fixture was changed to a
missing-album fixture. The missing-album refusal still passes; the new positive
artist Tracks regression and all other combined suites passed. Logs:
test-results/v082-combined.log, v082-artwork-contract.log and
v082-artist-tracks.log (initial failure: v082-before.log).
Windows independently extracted and verified all 36 files against the audit
and tested source. ZIP: 236,622 bytes; SHA-256
`028024b41dc85f11da6b3c01f8d391b6d8fb46dca02b6aef371565a05f745516`.
Report: test-results/v082-package-verification.json.
The extracted package passed actual isolated-extension onboarding, profile
isolation, preserved-record and no-automatic-write checks (1/1 suite). Log:
test-results/v082-extracted-install.log.
No user data was accessed or migrated; no signed-in writes or public upload.
Rollback source: c4ef360.

## v0.8.1 album-view follow-up

Baseline b391802 (v0.8.0 beta), initially clean installed checkout. Scope:
artwork album context, failing regression plus unpacked-extension integration,
version labels, release notes and regenerated package. No user storage access,
scrobble edits, full-history scans, account operations or public upload.

The new regression fails before the fix and passes afterward. Selected album
header covers/links apply with a stalled cache and no history requests. Guest
artists, late rows, preferred-cover changes, lazy-loader repairs, restoration,
sidebar/friend isolation and mismatched-header refusal are covered. The actual
unpacked extension also proves a selected album overrides an existing global
winner without changing that winner or requesting metadata, and the artist
page still uses its saved winner afterward. Focused gate: 2/2 passed.

Combined gate: 39/39 suites passed. Windows independently expanded the new ZIP
and verified all 36 file hashes against the audit and tested source. ZIP:
235,934 bytes; SHA-256
`8f0b03f295cb61b6f7af4be91d78095d6bdb1627067b4471b6702272ec0e9de9`.
The extracted package passed actual isolated-extension onboarding, profile
isolation, preserved-record and no-automatic-write checks (1/1 suite). Signed-in
Supermium acceptance remains pending; the public album page returned a Client
Challenge during read-only inspection. Source rollback: b391802. Logs:
test-results/v081-combined.log, v081-focused.log, v081-package-verification.json
and v081-extracted-install.log.

## Original v0.8.0 preparation

## Scope

- Fresh installs start disconnected. Connecting a profile activates only its own
  pages; existing configured profiles, rules, XML undo and scan records survive.
- Package display names, XML review/apply/revert, scrolling and personal artwork.
  Normal edits still use Last.fm. Automatic album-less scrobble corrections are
  unavailable in this beta, including for previously enabled saved records.
  Preserve those records for later review; do not migrate or erase them.
- Add original icons, local help/privacy pages, store copy, actual settings/XML
  screenshots with fictional demo metadata, a small promotional image and a
  static beta download page. No Last.fm logos, third-party cover art or analytics.
- Build an explicit allowlist ZIP with manifest at its root, verify its contents
  and SHA-256, and test the extracted package in an isolated browser profile.

Owners: defaults/worker, settings/popup/import UI, beta automation guards,
manifest/assets/help/privacy, release tools/site, affected tests and docs.
No public upload, account submission, purchase, new permissions, signed-in writes,
user profile file access, broad history scan or licence grant is authorised here.

## Acceptance

1. Fresh install has no profile, writes no initial data and changes no Last.fm page.
2. Explicit profile setup enables its pages and never friends' profiles.
3. Existing stored data survives update/navigation unchanged; JSON export remains
   available. No change to the installed path, extension key or permission set.
4. Saved enabled automation cannot start a correction or reserve a write in beta.
5. Package references are complete, runtime code is local and private working
   files, tests, logs, browser state, backups and user XML are excluded.
6. Focused regressions, one combined gate, extracted-package install and visual
   checks pass. Signed-in Last.fm remains Jay's final acceptance check.

## Delivery

Local candidate and release materials only. Website/privacy URL, support channel,
publisher details, live acceptance and store submission remain publication gates.
Do not invent a publisher identity or claim a public URL already exists.

## Verified candidate

- 38 suites verified: initial combined 36/38, then two corrected fixture checks
  passed. The failures relied on the removed implicit DCCXX default; profile
  setup is now explicit in those fixtures. No runtime default was restored.
- Fresh actual-extension setup, own/friend isolation, XML gating and preserved
  previously enabled/legacy records pass. No automatic requests or POSTs occur.
- Independent Windows ZIP extraction verifies the exact 36-file set and all
  file/ZIP SHA-256 values. Actual extracted-package onboarding/isolation and
  preservation checks pass in a separate disposable browser profile.
- Local screenshots, original icons/promotional tile and assembled site were
  inspected. Site/privacy checks cover 1280px and 390px widths, all local links,
  image loading, horizontal fit and absence of external requests.
- ZIP: 233,863 bytes; SHA-256
  `e1465f04d4bf25fcaf9b31cf691f76e391558d72d0d784701c3d8e7754617397`.
- Nothing was published. No user storage was inspected/cleared/migrated and no
  signed-in scrobble edit or full-history scan was performed. The isolated checks
  do not certify the current signed-in Last.fm layout or account flows.

Logs remain under ignored test-results. Runtime package and site are under
ignored dist; regenerate with tools/package-beta.cjs. Source rollback: 7de6c8d.
An older saved enabled automation flag may reactivate on rollback; review it in
that older version before browsing. Current beta guards leave it inert.

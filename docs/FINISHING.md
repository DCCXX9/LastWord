# Finishing the existing features

Baseline: `2180539`, v0.6.15, branch `preferences-page`, clean working tree.
Work in the installed folder. Keep extension identity and permissions intact.

## Order and acceptance

1. Artwork: retain proven most-scrobbled album selection across artists, blank
   scrobble title-album fallback and preferred album image/link. Cached results
   must appear without waiting for the discovery queue. Native lazy loading must
   not overwrite a resolved cover. First discovery still requires paced requests.
2. Native editing: keep Edit track first in album menus, use Last.fm's delegated
   dialog and real forms, preserve normal edits and local-only casing. Support
   verified blank album fields and reject ambiguous/mismatched identities.
3. Album-less rules: remember successful edits with both album fields blank;
   correct matching future plays only. Offer explicit, resumable read-only
   discovery of historical blank plays, with conservative pacing and a shared
   rate-limit stop. No historical scrobble edits or automatic full-library scan.

Owners may include artwork*.js, adapter.js, native-edit.js, pages.js, store.js,
background.js, new albumless modules/page, options/popup navigation, manifest,
relevant styles, focused regressions and current/decision documentation.

## Data and verification boundaries

Keep existing preferences, XML undo and legacy scan records byte-for-byte unless
the user performs an explicit existing operation. New rules use a separate key;
no migration or clearing. Recommend JSON export in the new feature before use.
No installs, new permissions, publishing, pushes, signed-in test writes or large
history scans. Do not access the user's browser profile through its files.

Reproduce faults with focused failing tests before correction. Verify storage
authorization, cross-tab concurrency, profile isolation, rate limits, stale work,
future-only timestamps, failed edits, duplicate submissions and rollback. Run one
combined relevant gate after stabilization. Use temporary isolated browser
profiles; these do not certify signed-in Supermium. Supply one version for Reload
and user acceptance, without Console homework or reply deadlines.

Rollback source checkpoint: `2180539`. Restoring source does not remove stored
preferences or the new separate rule records.

## Progress

- Baseline inspected. Public browser connector unavailable (another browser owns
  its configured profile); no user browser/process was interrupted.
- Artwork and native faults were reproduced before correction. Native scrobble
  fields now override canonical album links; resolved cached covers/links survive
  lazy-loader rewrites. Blank native forms open the normal delegated track editor.
- Separate album-less storage, reader, engine, discovery and settings modules are
  implemented. Rules default off; capture requires exact-play readback. Corrections
  use native single-play forms, persist a claim before saving, verify afterward,
  and pause uncertain writes. Legacy storage remains unchanged.
- Read-only discovery has manual 20-page batches, 12-second pacing, review choices,
  saved per-page progress and an explicit request-resume button. No signed-in edit
  or history scan was run. The actual Last.fm response shape remains an acceptance
  boundary; unsupported or ambiguous responses stop rather than guessing.
- Focused artwork/native gate: 8/8 passed. Album-less focused gate: 7/8, with the
  startup race reproduced on the untouched baseline rather than attributed to
  the new modules. The corrected startup contract verifies the required page
  refresh. Subsequent startup/UI/transport/discovery/unpacked gate: 5/5 passed.
- Combined v0.7.0 regression gate: 33/34 passed. The extension suite timed out
  waiting 30 seconds for its service worker; the exact suite passed on an unchanged
  retry (14.6 seconds). All 34 suites are verified. Logs: v070-combined.log and
  v070-extension-retry.log under ignored test-results. No assertion deadlines were
  relaxed. CPU/memory probes were unavailable, so the timeout's cause is unproven.
- Reviewed the album-less settings screenshot; corrected unstyled text fields.
  Actual unpacked-extension coverage verifies the page is available, writes
  nothing when opened, and saving a rule leaves real corrections disabled.

## User acceptance after Reload

Export JSON, Reload the existing extension and refresh Last.fm when convenient.
Check cached artwork and links, then normal Edit track/casing behavior. In Settings
→ Album-less tracks review rules before enabling corrections. Confirm one normal
blank-album edit is remembered and one newly scrobbled matching play is corrected;
older plays must remain unchanged. First-time uncached artwork may still require
paced requests. No Console commands or response deadlines are required.

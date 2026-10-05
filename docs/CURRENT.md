# Current state — 6 October 2026

Installed candidate: **v0.6.2**, branch `preferences-page`.
Baseline: `73946315be32a23c6f16c27b98b14cb738f2b3a7` (v0.6.1).

## Scope and cause

Fix Keep Scrolling on the personal Scrobbles library: older rows appeared
before Yesterday, and date sections could disappear. The old loader copied
only the first table on each fetched page into the first existing table.
The user's signed-in inspection confirmed multiple `section.tracklist-section`
siblings, each with `h2.date-heading` and one chartlist table, in `.col-main`.

Changed owners: `content.js`, manifest version, focused scrobble regression,
README/current-state notes. Excluded: storage/preferences, XML importer,
Last.fm edits, installation identity/path and request-rate behavior.

## Behavior

Scrobbles and artist scrobbles append all native dated sections in page order.
The last existing date section receives a matching continuation; new days retain
their native section and heading. The loading panel follows the final section.
Ranked Artists/Albums/Tracks views retain their single-table append behavior.
Validation, hidden-row failure and cancellation roll back the complete added
page before advancing pagination. Pause during insertion now reaches a resumable
paused state. Saved browser preferences and storage formats are unchanged.

## Verification and acceptance

All 12 suites pass in isolated Supermium profiles with Last.fm requests mocked.
The new regression failed on misplaced/missing rows before the fix, then passed
for personal/artist histories with multiple initial/fetched days, dates spanning
pages, panel placement, disable, insertion cancellation and failed-page retry.
The full existing storage, XML, native editing, scrolling, profile and unpacked
extension regressions also pass. The rendered date-order fixture was inspected.

Live DOM structure is user-confirmed; live post-update acceptance remains:
Reload the existing extension, refresh DCCXX's Library and scroll across
Today/Yesterday/older dates. Direct browser capture was unavailable: the native
helper rejected the returned Supermium window owner; the public request returned
a client challenge. No live account edits or preference writes were made.

Rollback: restore source from the baseline commit above; source restoration
does not change browser storage.

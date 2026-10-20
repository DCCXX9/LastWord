# Unassisted maintenance until the allowance reset

Authorised by Jay on 15 October 2026. Work in the existing installed folder.
Starting checkpoint: `1f21384`, branch `preferences-page`, v0.6.12.

## Guardrails

- Preserve installation identity, preferences, XML undo and legacy scan records.
- No storage migrations/clearing, signed-in writes, full-history scans, publication,
  new permissions, installs, destructive cleanup or unrelated changes.
- Reproduce a concrete defect before correcting it. Keep fixes small, verify them
  and checkpoint the combined result. Distinguish isolated tests from live acceptance.
- No Console homework or reply deadlines. Do useful bounded work; do not invent
  features or repeat passing checks just to consume allowance.
- Check usage every ten minutes. Baseline: 54% used, weekly reset timestamp
  `1792472313` (20 October 2026 at 15:58:33 Australia/Sydney). An advanced timestamp
  confirms reset. Stop project work at the deadline regardless of meter availability,
  then pause the heartbeat when reset is observed. Never spend the new allowance.
- Heartbeat: `last-fm-maintenance-and-reset-check`. Once the queue is exhausted,
  only check the meter until reset; stay quiet on unchanged checks.

## Bounded review queue

1. **Done:** review settings, backup and preference controls for lost drafts,
   double submissions and stale asynchronous results; reproduce before changes.
2. **Reviewed; existing focused checks pass:** review artwork cancellation/profile-switch/navigation boundaries for stale work
   or avoidable network requests, preserving exact most-scrobbled album selection.
3. **Done:** review keyboard access/focus and status feedback in existing extension pages.
4. **Done:** provide a single repeatable local regression command if the current suite lacks
   one; keep browser tests isolated from the installed user profile.
5. **Done: v0.6.14 all 25 suites verified, including three unchanged startup retries:** run the combined relevant regression gate once after changes stabilise. Record
   exact results, update the version once, and retain the prior Git checkpoint.
6. **Done:** Keep Scrolling off/on and profile round trips after appending rows.
   A failing regression reproduced duplicate page 2; suspension retains the next
   page/completion state. Late success/failure callbacks cannot replace newer work.
   Five focused scrolling/profile suites pass, including the new scroll-toggle test.

Remove or mark reviewed items as they are exhausted. New work requires a concrete
defect in these existing features; this is not an open-ended feature roadmap.
All queued items completed. The meter subsequently advanced its reset timestamp
to 1792649583, confirming a reset. The heartbeat was paused. Do not resume it or
continue spending under the old pre-reset authorisation.

## Separately authorised finishing work

Jay subsequently authorised artwork/native-edit corrections followed by album-less
rules, unassisted, with one version to Reload and test. See FINISHING.md and CURRENT.md
for v0.7.0 scope, independent storage, tests and signed-in acceptance limits. This
does not reactivate the completed reset watcher or its unbounded allowance override.

## Results

- 20 October, separately authorised artwork loading performance: v0.9.9 prepares
  nearby initial/appended covers before entry and begins consenting automatic
  pages earlier, with on-screen priority and unchanged pacing/checkpoints.
  Signed-in timing, painted covers, stale-context lock diagnosis and limits:
  CURRENT.md. The completed reset heartbeat remains paused.

- 20 October, separately authorised real-row tracing: v0.9.8 corrects signed-in
  skeleton-table parsing, reproduced before patching. Verified actual initial
  and scroll-added blank rows resolve and paint their scrobbled album covers.
  Exact evidence and remaining limits: CURRENT.md. Reset watcher stays paused.

- 20 October, separately authorised library-wide artwork follow-up: v0.9.7
  extends album-count recovery to mixed-artist library Tracks and saved seeds
  off-page, retaining per-artist proof and bounds. Infinite-scroll and native
  Scrobbles coverage, exact checks and signed-in limits: CURRENT.md. The reset
  heartbeat remains paused; this does not resume its old allowance override.

- 20 October, separately authorised artwork retry: v0.9.6 addresses an observed
  legacy-cache mismatch. Old album names seed fresh exact counts/header reads;
  obsolete artwork is not trusted. Focused regression and acceptance limits:
  CURRENT.md. The old maintenance/reset heartbeat remains paused.

- 17 October, separately authorised public beta preparation: v0.8.0 starts fresh
  installs disconnected, retains existing data and hard-disables corrections/
  capture without migrating saved records. Local help/privacy, original assets,
  store materials, static site and a verified 36-file ZIP are ready. All 38
  suites are verified (36 initial passes plus two explicit-profile fixture
  corrections), with an independent extracted-package check. Signed-in testing
  and public publisher/support URLs remain pending. See BETA.md and CURRENT.md.
  The old maintenance/reset heartbeat remains paused; no new queue was opened.

- v0.6.13: settings saves preserve edits typed while the earlier save finishes.
  A failing browser regression reproduced the lost text/checkbox draft first.
- Artwork refreshes share one artist/album context read. A paired 200-song fixture
  reduced five-refresh context traversals from 1,000 to five, and median refresh
  time from 373.1 ms to 8.8 ms (10.2 ms in the combined gate). This is local DOM
  work, not a claim about signed-in network loading speed.
- XML casing review preserves keyboard focus after a selection redraw. Reproduced
  before correction; scan, apply and selective revert regressions still pass.
- `node tests/run.cjs` runs the isolated regression gate; all 22 suites passed.
  Runner checks cover suite selection, bad arguments, failures and timeouts.
- No preference, undo or legacy scan records were read from or changed in Jay's
  installed browser. Source storage formats and manifest permissions are unchanged.
- Usage check at 05:27:56 UTC: 63% used, same reset timestamp. No reset observed.
- v0.6.14 focused regressions pass: shared busy guards for preference mutations,
  keyboard focus restoration without stealing newer search focus, latest-file
  backup previews, and retained browser-history pagination/completion state.
  All defects were reproduced before correction. Combined gate: 22/25; album,
  artwork-extension and startup timed out under 100% host CPU/2.66 GB free memory.
  Those exact three suites passed on retry without source/timeout changes;
  all 25 suites are verified with the initial failures retained in this record.
  No signed-in acceptance is implied by a retry pass.
- Usage check at 05:37:15 UTC: 75% used, same reset timestamp. No reset observed.
- Usage check at 05:56:59 UTC: 85% used, same reset timestamp. No reset observed.
- Usage check around 06:05 UTC: 87% used, same reset timestamp. No reset observed.
- v0.6.15: settings/profile reactivation and browser-history restoration retain
  pagination state. The five-suite scrolling gate passes, including controlled
  cancelled callbacks that settle after a newer request starts. No user browser
  storage was accessed. Source rollback checkpoint: c4c0270.
  Actual unpacked-extension startup passed in 12.4 s on an unchanged retry,
  following an initial 3-second artist-name timeout with host CPU at 100%.
  Both logs are retained; assertion deadlines and source were unchanged on retry.

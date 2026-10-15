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

1. **Settings draft fix verified; preference review continues:** review settings, backup and preference controls for lost drafts,
   double submissions and stale asynchronous results; reproduce before changes.
2. Review artwork cancellation/profile-switch/navigation boundaries for stale work
   or avoidable network requests, preserving exact most-scrobbled album selection.
3. **XML casing focus fixed and verified; preference controls remain:** review keyboard access/focus and status feedback in existing extension pages.
4. **Done:** provide a single repeatable local regression command if the current suite lacks
   one; keep browser tests isolated from the installed user profile.
5. **22/22 suites passed for v0.6.13:** run the combined relevant regression gate once after changes stabilise. Record
   exact results, update the version once, and retain the prior Git checkpoint.

Remove or mark reviewed items as they are exhausted. New work requires a concrete
defect in these existing features; this is not an open-ended feature roadmap.

## Results

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

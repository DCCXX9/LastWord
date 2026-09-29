# Implementation lessons

## Album-less scrobble scan candidate (2026-09-29)

The v0.4.0–0.4.2 candidate was not verified against the signed-in Last.fm
library. Its scanner first rejected an actual scrobble form as changed fields.
After allowing omitted blank album fields, the scan panel disappeared during
the live run. Moving it out of the library header exposed another form mismatch:
the real edit form action did not match the assumed `/user/DCCXX/library/edit`
path. No rules were committed and no older scrobbles were edited during the
reported attempts. The candidate was removed from the active extension and
saved under `.codex-backups/failed-albumless-20260929`.

For a smaller retry, first inspect a signed-in scrobble form's field names and
action path without capturing its security token, then validate a read-only
single-page scan in Supermium before adding full pagination or any automatic
Last.fm edits. Keep a visible scan draft and preserve the existing display
preferences.

## Full-history scan rate limit (2026-09-29)

The v0.4.0–0.4.2 retry used the confirmed `/user/DCCXX/library/edit-track`
form and passed synthetic tests. A signed-in single-page check also confirmed
50 editable forms. However, DCCXX has 4,332 Scrobbles pages. Even with a small
number of concurrent requests, a live run progressed slowly and sometimes
received empty responses for otherwise populated pages. Pages 93–95 each
returned 50 forms when checked again, so the empty response was transient.
The next retry triggered Last.fm's “You're requesting too many pages” warning.
Stop using a full-history website crawler for this library. No pages should be
silently skipped, and repeated retries or higher concurrency would worsen the
rate limit. The v0.4.2 files were saved in
`.codex-backups/failed-albumless-20260929-v2`, and the installed files were
restored to v0.3.4 without changing Chrome storage. The incomplete scan draft
may remain in extension-local storage but v0.3.4 ignores it.

For a future attempt, separate immediate future-rule capture from historical
discovery. Historical discovery needs a user-provided export or another source
that can identify both blank album fields without thousands of web requests.
Verify one normal edit and one new play in the signed-in browser before enabling
automatic correction.

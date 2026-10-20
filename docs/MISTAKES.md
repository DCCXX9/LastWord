# Implementation lessons

## Artwork and redirect observers must agree on album URL identity (2026-10-20)

v0.9.11 passed separate artwork and redirect tests but froze a real protected
artist list. Artwork repeatedly removed the +noredirect component that redirect
protection restored. Test both observers together with an actual cached winner
and an appended row. Bound the test observer deliveries so failures cannot hang
the runner. Include settings transitions: copying the redirect setting into the
artwork module briefly disagreed with the other module's asynchronous state.
Accepting the same protected album identity avoids the competing writes without
another settings owner. CPU-idle samples before a lookup finishes and absence of
page errors are not proof that later callbacks remain responsive.

## Shared URL guards need worker-origin coverage (2026-10-20)

The first public-artwork check passed in the mocked worker but failed in signed-in
Supermium: artwork-read/put were refused, forcing fresh requests on every visit.
The shared adapter defaulted its URL base to location.href. In a real extension
worker that is chrome-extension://, while the mock had no location and defaulted
to Last.fm. Public-site scope now passes an explicit HTTPS Last.fm base. Keep both
the worker-origin negative/positive regression and the real unpacked public-page
cache integration; a passing content-page URL test does not cover this boundary.

## Reload timing and inferred album identity (2026-10-15)

The previous startup check assumed Reload during a blocked navigation would
always inject document_idle afterward. Repeated failures also occurred against
the untouched 2180539 baseline: the extension world had early dependencies but
none of the idle features. Treat refreshing Last.fm after Reload as required.
Keep the no-crash/data-preservation assertion during the race and test actual
feature activation on the fresh navigation; do not label that race a dependency
failure or claim a longer timeout proves reliable injection.

A rendered album column can be canonicalized away from the user's raw scrobble
tags. Artwork must prefer validated native fields and fail on malformed fields
rather than guess from the visible canonical link. Cached results also need
protection against a later native lazy-loader rewrite of the image and album link.

Album-less v0.7.0 deliberately separates successful edit capture, optional
candidate discovery and explicitly enabled future correction. The old full-scan
failure below is not considered resolved by slower pacing. Batches are limited
and manually resumed; no unattended full-history run is authorised or verified.

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

## Signed-in loading skeletons mistaken for library data (2026-10-20)

v0.9.7 passed isolated/public checks but failed in the installed signed-in tab.
Actual responses included chartlist__placeholder tables with empty rows beside
complete real tables. Both artwork readers rejected those extra rows. Trace
actual response structure and the displayed image before another candidate;
include observed signed-in skeletons in regression fixtures. Exclude explicitly
marked skeleton tables, preserving strict validation of real rows. v0.9.8 was
verified on initial and genuinely blank scroll-added rows in the same profile.

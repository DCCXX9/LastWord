# Current state — 6 October 2026

Installed candidate: **v0.6.5**, branch `preferences-page`.
Focused correction baseline: `f63d91d` (v0.6.4).
Artwork feature baseline: `74ce8ba796c9d39e8c42a7a18060969935cd33c1` (v0.6.2).

## Scope

Use the connected user's own most-scrobbled album for track-row artwork and its
cover link. Use the artist/track-title album page when the winning album tag is
blank. Respect the user's starred artwork through the signed-in album overview's
primary cover. Excluded: edits to Last.fm scrobbles, saved preference changes,
full-library scans, installation identity/path changes, unrelated UI changes.

Owners: artwork-source.js resolves/counts albums; artwork.js observes visible
track images, caches and replaces/restores them; pages.js retains the shared
origin lock/throttle/rate-limit pause and adds guarded public album reads.
Manifest and focused tests/docs are the remaining changed owners.

## Confirmed source contracts

The signed-in Myron track history exposes one `.col-main .metadata-display`
paragraph with total 56 and 50 editable forms on its first page. Scrobble forms
use the existing named artist/track/album/album-artist/timestamp fields. The album
must win against every unseen play before a lookup may stop early; otherwise the
track's pages are counted until complete. Exact ties use the most recent album.
Missing/inconsistent fields, totals or pagination keep the original cover.

The user confirmed the Silentó title-album overview's cover hash 9741753a613314214accd15a28eb91da.
Their starred LUV vs. the World 2 artwork hash a60ce9721d8cd306dcd20cdc85e7ca47
matches that signed-in album overview's primary `.cover-art img` (and currently
its sharing metadata). Primary cover has priority over sharing metadata, and
later Similar Albums images are excluded. Native thumbnail dimensions are reused;
image, alt text and cover link change together. Friend/profile transitions restore
original attributes and cancel pending work. A separate bounded cache persists
resolved tracks across visits, scoped by profile. Known covers apply at
document_start as rows arrive; fresh records need no repeat lookup for 24 hours.
Stale covers remain visible while refreshed. Uncached tracks require server time.

Watch Me's signed-in track history has total 1 and one form with only artist_name,
track_name and timestamp. BOTH blank album fields are omitted. The resolver now
normalizes that confirmed representation in a detached copy; no forms are submitted
and a single missing album field remains an error.

## Verification and live acceptance

The 15-suite regression gate passed in isolated Supermium profiles, with Last.fm
requests mocked. The new suites verify exact/early winners, multiple albums,
album artists, blanks, ties, malformed/incomplete history, visible-only and
shared/deduplicated requests, restoration and actual unpacked-extension injection.
The starred-primary-cover and omitted-blank-fields fixes each followed a failing
regression. Cache checks verify profile isolation, concurrent writes and unchanged
preferences/scan/undo keys. The actual unpacked-extension test reloads a resolved
cover within its 2-second assertion deadline with zero repeat history/album requests.

Initial live checks still showed native images/links. Diagnostics then showed
v0.6.3 loaded but no page connection; after refreshing the active library tab,
the user confirmed contentVersion 0.6.3, ownProfile true and rateLimited false.
The user confirmed Myron eventually shows the starred LUV cover and selected
album link. Watch Me was still unchanged: connected/current script, no rate
pause, waiting behind other visible lookups. Its targeted history inspection
then established the omitted-fields failure above. The user reported the v0.6.4
handover still showed the old Watch Me image and Myron took about 20 seconds.
Its live result is not accepted. The user wants version handovers followed by
their own test when convenient, with no repeated Console instructions or reply deadlines.

v0.6.5 corrects a reproduced navigation-cache failure: resolved results were
persisted but never added to the current tab's cache, so back/forward restoration
rejoined the network queue. The failing test made two extra requests; the fix
reuses the result with zero requests. Visible album-less scrobbles now receive
queue priority; the all-time winner proof and shared throttle are unchanged.
Copy diagnostics includes cache errors/counts, job counts, elapsed lookup time and
the last artwork error, without track names or security fields.

Focused artwork, actual-extension, options/popup and dated-section suites pass.
The actual extension test now checks Watch Me's confirmed omitted-field layout,
title-album image/link and cached reload within two seconds with zero new requests.
v0.6.5 remains a candidate for the user's live test; no live success claim is made.
The earlier v0.6.2 per-day scrolling break was accepted live by the user.

Rollback: baseline source above. No saved display preferences/settings were
changed by the implementation or test profiles.

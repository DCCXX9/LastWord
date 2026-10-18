# v0.8.3 beta candidate

Scrolling/artwork recovery prepared from `ff6fc13` (v0.8.2 beta), in the existing
installed folder. A temporary history request failure previously left that
track unavailable for the rest of the visit. Artwork now gets one retry after
ten seconds when visible, through the same paced request queue. Other visible
tracks can resolve during that delay. Persistent failures stop after that retry.
Rate-limit warnings, invalid album metadata and native writes never auto-retry.
Hidden tabs suspend recovery and profile changes cancel it.

An actual isolated unpacked-extension test loads 101 rows through the real
page-2/page-3 scroller. It recovers a temporary failure for rank 42 and verifies
painted tagged-album covers and links on imported rows 53, 55, 57 and 101.
Album selection, saved preferences, identity and permissions are unchanged.

The initial row-insertion test passed without source changes. This candidate
fixes a reproduced permanent-blank failure path; it does not establish that this
was the cause of Jay's signed-in FiGure5 result. Public track-list inspection
worked, but public track-history/album requests returned HTTP 600. One normal
Reload and refresh is still the signed-in acceptance check. No Console steps.

## Included v0.8.2 changes

Artist Tracks correction prepared from `c4ef360` (v0.8.1 beta) in the existing
installed folder. Artwork lookup now accepts a native tagged album when its
album-artist field is omitted, using the track artist in that case. Raw tags
still take precedence over redirected album links, and the most-scrobbled
album wins across releases. Native edit validation is unchanged.

The regression covers a blank rank-42 cover on an artist's full Tracks list,
later appended rows, mixed album counts, correct cover links and cached revisits.
This is a reproduced parser defect, not confirmation of Jay's current signed-in
markup: public read-only inspection returned Last.fm's Client Challenge. One
Reload and normal page refresh remains the live acceptance check.

## Included v0.8.1 changes

Album-view correction prepared from `b391802` (v0.8.0 beta) on
`preferences-page`, in the existing installed folder.

## Album-view correction

On a specific album's library page, every track now uses the verified album
header's cover and public album link, including guest artists and tracks with
missing or different native artwork. This does not wait for the artwork cache
or history requests. Late rows and native image rewrites retain the same cover.
An updated preferred header image is copied to the track rows.

This view-specific result never replaces saved all-time track winners. Artist
and general track lists retain the most-scrobbled-album selection. Other profiles
remain untouched. Existing settings, XML undo, legacy records, identity and
permissions are unchanged. If the album header has no verifiable real cover,
the extension leaves the native rows rather than selecting a different release.

## Included v0.8.0 changes

- New installations start disconnected instead of selecting DCCXX. First-install
  setup opens automatically and XML import waits for profile setup.
- Existing profiles, display names, XML undo, artwork cache and legacy scan/rule
  records are retained. No startup migration or data reset is performed.
- Automatic album-less corrections and native-rule capture are unavailable in
  this public beta, even if an older saved record was enabled. Records remain
  reviewable. Normal user-submitted Last.fm edits remain available.
- Added original icons, local help/privacy pages and visible beta/version links.
- Added a deterministic allowlist ZIP builder, package checks, a static download
  site and store materials with fictional example metadata.

## Included features and limits

Local display names, grouped preference management, incremental large XML scan,
selection/apply/revert, JSON backup, native scrolling, personal artwork and normal
Last.fm edit-dialog delegation are included. Native editing needs the appropriate
Last.fm access. The extension does not provide a password or editing entitlement.

Artwork selection uses the user's most-scrobbled album, not a track's global
default release. Cached covers apply without joining the network queue. Uncached
tracks need paced Last.fm requests and can take time. A missing album cover or an
unverifiable history can still leave an empty slot or unchanged cover. No promise
that every track has available artwork is made.

Requests pause when Last.fm limits traffic. Do not repeatedly restart a paused
scan. Read-only discovery remains an explicit bounded operation, not an automatic
full-history crawl.

## Verification boundary

Automated checks use isolated browser profiles and intercepted Last.fm responses.
They never inspect Jay's signed-in profile or submit a real scrobble edit. Final
signed-in acceptance remains with Jay after one Reload and Last.fm refresh.
See `docs/BETA.md` for the recorded combined and extracted-package checks.

No public upload, store submission, publisher account operation, new browser
permission, actual scrobble edit or user-data migration was performed.

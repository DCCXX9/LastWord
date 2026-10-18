# v0.8.1 beta candidate

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

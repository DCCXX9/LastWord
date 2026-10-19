# v0.9.7 beta candidate

Personal track artwork recovery now covers the mixed-artist library Tracks
list as well as individual artists. Saved album hints work even when the seed
track is off-page, including new artists and tracks reached by scrolling.
Each track still needs exact personal counts proving its most-used album;
identical titles from different artists never share that evidence. Uncached
tracks retain individual history lookup, including appended Scrobbles rows.

Existing cached winners display without repeat discovery. Unseen tracks still
need Last.fm responses, and missing metadata/artwork cannot be reconstructed.
No permissions, preferences, saved-data formats or installation identity changed.
Signed-in visual acceptance is pending.

## Included v0.9.6 legacy artwork cache correction

Older saved artwork can now help discover the correct album for blank sibling
tracks. It supplies an album name only: current personal album counts must prove
the winner, and the exact album header supplies its current cover. This addresses
the observed old LUCRE cache that v0.9.5 could not use, including scroll-added rows.
Preferences and saved data remain intact. Signed-in visual acceptance is pending.

## Included v0.9.5 artist Tracks album counts

Full artist Tracks pages now reuse exact album counts to prove several personal
track covers together, including scroll-added tracks. Fresh verified covers seed
the album lookup; each new track still needs sufficient counts to prove that
album wins its own all-time scrobbles. Existing saved winners display immediately.

This reduces separate history reads when Last.fm returns temporary errors. It
cannot resolve metadata if neither album counts nor track history is available.
No permissions, installation identity, preferences or storage formats changed.
Signed-in Dean Blunt acceptance remains the Reload test.

## Included v0.9.4 broken-image recovery

Failed artist portraits and album thumbnails automatically retry alternate sizes
of the same selected image. Recovery also applies to scroll-added rows, failed
responsive sources and selected-album covers, without fighting the personal
artwork feature or changing image links, titles or styling.

Retries are bounded, shared within the page and deferred while offscreen. They
do not scan history or request additional Last.fm pages. Deleted images and
images blocked at all sizes remain unavailable. Existing preferences, undo,
legacy records, installation identity and permissions are preserved.

Actual-unpacked recovery and existing artwork integration pass. Jay's subsequent
live screenshot confirms Drug Church's portrait now displays.

## Included v0.9.3 artist redirect protection

Artist redirect protection starts with Travis Scott and Lucki. Artist, album and
track links on your connected profile and their public music pages use Last.fm's
+noredirect route, including newly loaded rows. Artwork/library reads use the
same policy and reject a response identifying another artist.

Genuine Lucky Twice entries remain native. Already redirected row links require
original native scrobble fields proving the intended artist before repair.
Turn off Protect artist redirects in Settings to restore native links. Existing
preferences, XML undo, legacy records, installation identity and permissions are
preserved. Old JSON backups remain accepted; no startup data migration.

This protects navigation; it cannot repair Last.fm's merged global statistics or
intercept a server redirect before a typed/external URL loads. Help explains the
scope and links to Last.fm's spelling-correction setting. No account setting is
changed automatically. Signed-in acceptance remains open after isolated checks.

## Included v0.9.2 compact prompt

Removed the extra text beneath “Load next page?” and kept Yes / No / Always
on one row. The existing loading choices and ten-page checkpoints are unchanged.

## Included v0.9.1 scrolling changes

Library page loading now asks first: Yes loads once, No pauses this view, and
Always enables automatic loading only to the next ten-page checkpoint. Including
the initial page, normal lists stop at 500 rows, then 1000, and ask again. A new
view asks again; existing settings and saved library records are preserved.

Warning/resume and shifted history pages could repeat scrobbles already loaded.
Verified timestamp/artist/track identities now remove that overlap; real repeated
listens remain. Unseen reordered history stops before it changes the page.
This fixes a reproduced response pattern, not a capture of Jay's signed-in page.
The outstanding artwork issue is separate and unchanged.

## Included v0.9.0 XML casing framework

Library-wide XML casing framework prepared from b134285 in the same installed
folder. Open Display names or Settings → Import iTunes XML. Scan locally, choose
artists, albums, songs and album artists across every result page, resolve any
conflicting spellings, then Apply. Group selections also include eligible names
outside the current search. XML casing is copied exactly, without title-case
conversion. Rules also apply to future matching plays and infinite-scroll rows.

The existing persistent Revert preserves later manual changes. Existing differing
preferences start unchecked. Use Export JSON backup before replacing an import's
undo record. There is no total XML file-size cap; storage quota still applies.

The shared name-record collector is ready for a later Library Doctor adapter;
today the hand-off is a fresh iTunes XML export after cleanup. No direct app
connection or automatic sync is enabled. No permissions, identity or storage
formats changed. The outstanding live blank-artwork issue remains unresolved.

## Retained v0.8.3 scrolling/artwork behavior

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

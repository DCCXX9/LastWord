# Current state — 6 October 2026

Installed candidate: **v0.6.9**, branch preferences-page.
Scrolling correction baseline: ff7ae0d (v0.6.8).
Correction baseline: ae100ec (v0.6.7).
Artwork feature baseline: 74ce8ba796c9d39e8c42a7a18060969935cd33c1 (v0.6.2).

## Scrolling completion correction

The loading panel is removed after the final page, retaining the completed
scroller state so later DOM changes cannot restart the original pagination.
A replacement library container discards copied extension controls before
creating its own panel. Loaded rows and date sections remain intact; pause,
retry and pagination restoration keep their existing behavior. No storage or
artwork changes. Focused browser regressions cover all supported library views,
completed-state mutations, cloned-container redraws, dated sections, cancellation,
retry, rate limits and profile/preference restoration. Signed-in acceptance remains
with the user's Reload and test, without Console steps or a reply deadline.

## Scope and ownership

Use the connected profile's most-scrobbled album for track artwork/link, with
the title-album fallback for verified album-less scrobbles. Preserve installation
identity, display preferences, XML revert records and scan progress. No scrobble
edits, full-library scans or unrelated UI changes.

- artwork-albums.js: shared artist-page album totals and existing album-row covers.
- artwork-source.js: individual histories/native album columns and cover fetches.
- artwork.js: early cached application, row readiness, progressive results/restoration.
- background.js: separate bounded cache writes; pages.js: shared request limits.

## Confirmed source contracts

The public DCCXX/Playboi Carti artist overview exposes all-time track totals in
data-stat-value and album covers in album rows. Its Music library contains
36 ranked tracks totaling 971 plays; the 2024 row has exactly 63. The 2024
history has total 63 and 50 Music rows on page 1, with native chartlist-album
links and stable 32-character hexadecimal data-edit-scrobble-id values.

On unfiltered own artist overviews, album lists are shared across track jobs.
Each complete list must sum to its metadata total and have unique track identities.
At most five displayed albums/two pages per album are read. A track wins only
when its album count exceeds the runner-up plus every unaccounted play.
Proven results publish immediately, without waiting for the original job to end.
The own album-row cover supplies the image. Filtered pages, large/incomplete
lists and unresolved ties use individual track histories.

The individual reader accepts the verified native album column, even when
edit forms are unavailable/incomplete. It keeps explicit album-artist tags when
their album matches that column. Track-row artwork never supplies album identity.
Exact history ties use native most-recent order.

Verified blank scrobble fields (including BOTH omitted album fields) select the
artist/title album directly. This has a separate cache key from ranked winners.
Single omitted fields remain strict in edit callers. Primary signed-in album
covers reflect starred artwork; Similar Albums images are excluded. Native
thumbnail size and original row styling remain intact.

## Loading and storage

Artwork starts at document_start. Scrobble rows wait for their native fields;
classification is reconsidered when later nodes arrive. Known covers apply
before network/visibility scheduling. Unknown covers still need discovery.
Artist batch counting reduces requests and reuses existing album pictures.

The separate cache retains up to 1,000 tracks/500,000 JSON characters. New results
carry sourceVersion 2. Old normal-track images remain visible during one background
verification; verified fresh records avoid requests for 24 hours. No saved
preference or cache key is cleared/migrated. Profile changes restore original
attributes. The request throttle, origin lock and rate-limit pause remain.

## Evidence and live acceptance

The 16-suite gate passed with isolated profiles/mocked Last.fm requests.
Focused follow-ups verify bounded album pagination and actual manifest injection.
Tests cover progressive MUSIC selection while another request is blocked, old
2024 title-album cache correction, zero-request warmed reloads, native-column
selection, date-filter rejection, incomplete totals, profile/storage preservation,
and day ordering. A staged-row test asserts the known cover at the first
rendering frame after metadata arrives.

The actual v0.6.8 selection module was executed against the real public DCCXX
artist page in a separate browser. It selected Music for 2024, counted 63 of 63,
and requested only the owned Music album list. Selected cover:
2fcb1df976faa7f06b07553484d4cd6d; link: /music/Playboi+Carti/Music.

The user accepted Myron's album/link and Watch Me's single cover/link, but reported
about ten seconds of loading on v0.6.7 and a wrong 2024 image. Signed-in v0.6.8
speed/artwork acceptance is pending their Reload and test, without Console steps
or a reply deadline. Direct Supermium window binding remains unavailable; public
library inspection through the separate browser now works.

Rollback: correction baseline above; complete artwork rollback uses the feature
baseline. Saved display preferences/settings are unaffected by source edits.

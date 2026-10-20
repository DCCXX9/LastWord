# Architecture decisions

## 20 October 2026: verified cover display and public artist scope

Unverified track artwork and its album link are hidden until the personal winner
is available. Only fresh sourceVersion-3 selections display directly from cache;
older records remain hints. This supersedes the earlier retain-old-image policy.
Scroll insertion applies cached/shared pairs while detached and gives the first
ten cold rows at most four seconds of preparation, retaining serial pacing.

Public artist roots and their Tracks lists may read/save verified personal winners.
This artwork scope does not permit preference changes or native scrobble writes.
Only a verified empty personal history allows an exact public source-album relation;
such catalogue results remain in page memory, never the personal-winner cache.
Missing numbered variants are not mapped to neighbouring tracks by similarity.

## 19 October 2026: explicit scrolling consent and finite batches

The saved infiniteScroll flag controls whether loading is offered, not automatic
consent. Each fresh view starts with Yes / No / Always; choices are transient.
Always is bounded at ten total loaded pages, including the original page, and
requires a new choice at each further ten-page boundary. This bounds unattended
DOM growth; the user can explicitly approve another batch. No permanent setting
or storage migration is required. Errors/rate warnings end automatic consent.

History page numbers are offsets and can overlap after new plays arrive. Joins
discard already visible verified timestamp/artist/track identities, rather than
deduplicating song names. An unseen newer timestamp stops the insertion. Native
date headings/order are retained; unknown identities are never guessed or removed.

## 15 October 2026: finishing artwork, native editing and album-less rules

Scrobble edit fields are the artwork authority when available, ahead of rendered
canonical album links. Malformed native fields do not fall through to a guessed
album. Selection records carry sourceVersion 3; older records remain visible while
revalidated. Resolved image/link attributes are repaired locally when Last.fm's
lazy loader overwrites them, without rescanning every row for each attribute change.

Both omitted album fields are the already observed native representation of a
blank scrobble. Native track lookup and album-less readers opt into that adapter
case explicitly; one missing field or duplicate fields remain errors.

Album-less rules have a new worker-owned `lfmAlbumlessV1` key, scoped by profile.
No legacy data is migrated. Capture, historical discovery, candidate review and
real future corrections are separate operations. Corrections default off and
require explicit enablement in their settings page. Each rule's saved timestamp
excludes earlier plays, even when discovery found the track in old history.

Unlike normal user-driven editing, the opted-in future-rule engine submits a
single-play native Last.fm form. It first obtains the actual dialog, validates
all original/current pairs against the fetched play, clears only album fields,
removes bulk/rule flags, and reads back the exact play. It never invents a Save
Edit payload from a row or bypasses the shared network queue. Native manual edits
remain delegated to Last.fm; casing-only changes remain local.

An origin correction lock plus durable worker claim prevents cross-tab duplicate
submissions. Unknown write outcomes remain reserved/uncertain and cannot replay
automatically after closing a tab. Failures disable corrections for explicit
review. The browser must have a visible matching profile tab; this is not a remote
scrobbling service. Checks run every five minutes, continuing at most three pages.

Historical discovery is limited to explicit read-only batches of 20 pages with
12-second minimum pacing and saved per-page progress. It only prepares candidates;
the user chooses which become future rules. No full-history scan was run or
automated. Empty responses and rate limits stop without retries or skipped pages.
The prior rate-limit lesson still applies: batching is a limit, not a guarantee
that Last.fm will accept repeated scanning. Existing legacy scan progress remains
untouched and inactive. Real signed-in capture/correction remain unverified.

## 6 October 2026: personal track artwork

Artwork uses the configured profile's individual track-history pages, with the
user-confirmed `.col-main .metadata-display` scrobble total and existing named
edit-form fields. Album/album-artist pairs are counted without submitting edits.
The user confirmed that album-less Watch Me history rows omit BOTH album fields.
The read-only resolver supplies empty values in a detached copy in that case;
single missing fields remain validation errors and the shared edit adapter keeps
strict defaults, with explicit support for both omitted fields at callers above.
The resolver stops only at complete history or when the leader exceeds the
runner-up plus every unseen play. Incomplete totals, fields or pagination fail
without choosing a sampled winner. Ties use the native most-recent history order.

The chosen album's signed-in overview supplies the primary `.cover-art img`,
respecting preferred artwork; sharing metadata is used if that element is absent.
Later Similar Albums images are excluded. The user confirmed that their starred
LUV vs. the World 2 image is also the overview's primary cover. A blank winning
album uses the artist/track-title album page, confirmed
for Silentó / Watch Me (Whip / Nae Nae). Album-artist tags override track artist
for cover lookup when present. The image and its link change together.

One visible-track lookup runs per tab, shares the existing origin lock/throttle
and persistent rate-limit pause with scrolling, and cancels offscreen/background
work. Tab-local caches deduplicate tracks/albums. A worker-owned separate cache
key persists up to 1,000 resolved tracks, bounded to 500,000 JSON characters. It is scoped by
profile, artist and track, and never writes preference/undo/scan keys. Artwork
starts at document_start; known images and links apply as rows arrive. Records
are fresh for 24 hours; stale covers stay visible during a normal queued refresh.
First uncached resolution still needs server requests. Saved preferences/settings and
installation identity are untouched. Public album reads use a distinct guarded
page-fetch entry point, available only from the configured profile.

v0.6.5 adds resolved results to the current tab's cache as well as persistent
storage, so back/forward page restoration cannot requeue a known cover. Visible
album-less scrobbles have queue priority; album counting remains authoritative.
The existing Copy diagnostics button includes artwork/cache counts and errors,
replacing repeated requests for Console inspection when direct browser access fails.

v0.6.6 distinguishes a verified album-less scrobble row from a ranked track.
Both blank album fields in the native own-profile form select the title-album
cover directly, without all-time history counting; both omitted fields are
accepted only through an explicit read-only adapter option. Other edit callers
retain strict defaults, and single missing/duplicate fields remain invalid.
Album-less rows preempt unrelated active history work, retaining the shared
request throttle. Their cache key has an albumless suffix, so the ranked track's
all-time album winner is preserved. No existing preference/cache keys are migrated.

v0.6.7 waits for validated own-library scrobble fields before selecting an artwork
cache key. Rows may be parsed in stages; seeing an image is not evidence that its
form is complete. Existing image observations are reconsidered when later nodes
change their classification, and the final source startup rescans completed rows.
Known covers apply directly on metadata arrival; discovery remains queued only
for unknown/stale records. A staged-row rendering-frame test enforces this boundary.

v0.6.8 uses owned album track totals on unfiltered artist overviews to amortize
discovery across tracks. Complete ranked album lists must sum to their metadata
total; track winners use the same unaccounted-play bound as the history reader.
At most five album summaries/two pages per album are checked. Proven tracks publish
progressively using the own album-row image. Remaining tracks/ties use individual
history, which now accepts the real native album column and stable scrobble ids.
No track-row image is evidence of album identity. The sourceVersion 2 marker
revalidates older normal-track cache results while their pictures stay visible.

## 30 September 2026: coordinated local preferences

A Manifest V3 service worker is the sole writer of rules/settings. Each queued
operation reads the latest value and applies a targeted change. Same-rule edits
and imports can carry expected values to reject stale changes. Startup performs
no migration or writes. Unknown local storage keys survive backup and restore.

The shared adapter owns Last.fm URL parsing and named native form contracts.
Content owns display replacements/scrolling; native-edit owns menu/dialog
integration; settings/popup use the same storage API. Pages are fetched through
a bounded queue using an origin lock shared across tabs, with persistent
rate-limit stop. Normal manual editing stays with Last.fm's handler. The explicitly
enabled album-less engine is the single-play exception documented above.

Actual native dialog behavior still needs signed-in acceptance. Reconstructed
fixtures and isolated extension tests are recorded as distinct evidence.

## 30 September 2026: reviewed XML casing imports

Use an additive `exact: true` rule flag for imported preferences. It keeps an
explicit casing choice even when from/to are identical (including lowercase
or numeric titles); legacy unflagged rule semantics remain intact. Existing
preferences are not rewritten on startup.

The worker serializes a selected import as one rules-plus-undo write. The undo
record holds before/after values only for changed rules. Later manual mutations
mark the corresponding entries touched; full JSON replacement clears XML undo
and never revives an undo action from the backup. Revert cannot erase intervening changes, even if a user has
changed a value back to the imported spelling. Only the latest XML import has
an undo record. JSON backups include it and all legacy data.

The parser reads 64 KiB file slices with streaming UTF-8 decoding and validates
XML structure through the end of the file. Only the current track and unfinished
token are retained, then each track is parsed as a small XML dictionary. The
standard Apple DTD is accepted without loading it; custom entity declarations
are rejected. There is no total file-size cap; individual tracks/tokens are
limited to 16 MiB and nesting to 256 levels. Distinct review names remain in
memory. Progress yields per chunk and every 100 tracks; review uses 100-row pages.
References: https://developer.apple.com/library/archive/documentation/CoreFoundation/Conceptual/CFPropertyLists/Articles/XMLTags.html

# Architecture decisions

## 6 October 2026: personal track artwork

Artwork uses the configured profile's individual track-history pages, with the
user-confirmed `.col-main .metadata-display` scrobble total and existing named
edit-form fields. Album/album-artist pairs are counted without submitting edits.
The user confirmed that album-less Watch Me history rows omit BOTH album fields.
The read-only resolver supplies empty values in a detached copy in that case;
single missing fields remain validation errors and the shared edit adapter stays strict.
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

## 30 September 2026: coordinated local preferences

A Manifest V3 service worker is the sole writer of rules/settings. Each queued
operation reads the latest value and applies a targeted change. Same-rule edits
and imports can carry expected values to reject stale changes. Startup performs
no migration or writes. Unknown local storage keys survive backup and restore.

The shared adapter owns Last.fm URL parsing and named native form contracts.
Content owns display replacements/scrolling; native-edit owns menu/dialog
integration; settings/popup use the same storage API. Pages are fetched through
a bounded queue using an origin lock shared across tabs, with persistent
rate-limit stop. The extension never submits real scrobble edits itself.

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

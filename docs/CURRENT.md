# Current state — 15 October 2026

Installed candidate: **v0.7.0**, branch preferences-page.
Finishing baseline: 2180539 (v0.6.15).
Scrolling reactivation baseline: c4c0270 (v0.6.14).
Interaction/history baseline: 7366f06 (v0.6.13).
Unassisted maintenance baseline: 1f21384 (v0.6.12).
Cover recovery baseline: a60f097 (v0.6.11).
Placeholder correction baseline: e6d87ff (v0.6.10).
Startup correction baseline: 695e220 (v0.6.9).
Scrolling correction baseline: ff7ae0d (v0.6.8).
Correction baseline: ae100ec (v0.6.7).
Artwork feature baseline: 74ce8ba796c9d39e8c42a7a18060969935cd33c1 (v0.6.2).

## Artwork, native editing and album-less rules (v0.7.0)

Jay authorised this follow-up after the earlier allowance-reset work stopped.
The old reset watcher is paused and was not resumed for this task.

Artwork now counts native scrobble album fields before canonical rendered links.
The failing regression selected Canonical instead of Personal Album; the corrected
reader selects the raw scrobbled album. SourceVersion 3 results refresh older normal
selections without hiding cached covers. Cached images/links do not wait for the
lookup queue, and a Last.fm lazy-loader rewrite cannot overwrite a resolved result.
First-time uncached album selection still needs paced server requests. No instant
cold-load promise or invented replacement for genuinely missing album artwork.

Native Edit track lookup accepts the user-confirmed representation where both
blank album fields are omitted. It still delegates to Last.fm on the current page,
keeps the menu action first, and saves casing locally. Single missing fields and
mismatched identities fail explicitly. Normal edits stay with Last.fm's handler.

Album-less capture, discovery and correction use separate modules and a new
worker-owned lfmAlbumlessV1 key. Corrections start disabled. Capture reads back the
exact edited play before remembering a future-only rule. Enabled checks use the
real native single-play form, preserve artist/title, remove bulk-edit flags, and
verify both fields afterward. Cross-tab claims persist before writes; uncertain
writes stop for review and never replay automatically. Old scrobbles are excluded.
Only a visible own-profile tab checks recent plays, every five minutes. No change
is made by this extension while the browser is closed.

Discovery prepares selectable candidates in explicit read-only batches of up to
20 pages, at least 12 seconds apart. Confirmed per-page progress survives pauses;
empty responses/rate limits stop without retries or skipped pages. The panel has a
manual network-resume control that starts no work by itself. Existing legacy scan
records remain inactive and unchanged. No historical crawl or signed-in edit was run.

Focused storage, transport, capture, correction, discovery and UI regressions pass,
including actual unpacked-extension settings/default-off checks. Combined gate:
33/34 passed; extension timed out at the 30-second service-worker startup wait.
That exact suite passed unchanged on retry (14.6 seconds), having also passed the
preflight gate (27.3 seconds). Initial failure and retry logs are retained in
test-results/v070-combined.log and v070-extension-retry.log. Host CPU/memory probes
were unavailable in the sandbox, so load is not claimed as a confirmed cause.
All 34 suites are verified, including native/local edits, artwork, scrolling,
storage, XML apply/revert/large-file parsing and test-runner failure handling.
The long artwork fixture measured an 8.9 ms median refresh with five context reads
over five refreshes; this is DOM work, not a signed-in network timing claim.
Signed-in Last.fm dialog/capture/new-play
acceptance remains pending; the tests use isolated profiles and reconstructed forms.

The startup test exposed a pre-existing Supermium reload race, reproduced against
the untouched 2180539 source: Reload during navigation can omit document_idle.
The test now enforces no dependency crash/data loss during that race and verifies
activation after the supported Last.fm page refresh. It does not claim Reload alone
reinjects an already open tab. Existing preference, XML undo and legacy keys are not
migrated, and manifest permissions remain storage-only. Source rollback: 2180539.

## Scrolling reactivation (v0.6.15)

Switching scrolling off/on or reconnecting the same profile used to discard
pagination progress while retaining appended rows. A failing regression reproduced
requests 1, 2, 2. Scrolling now suspends its controls/requests while retaining the
next page and completion state associated with those rows. Reactivation continues
with page 3; completed views stay complete. Browser-history restoration uses the
same lifecycle. Each callback checks its own request identity so an obsolete
success or failure cannot append duplicates or replace newer loading status.

Five focused suites passed: scroll-toggle, scroll-history, library-scroll,
scrobble-sections and smoke. They cover settings/profile round trips, late
success/failure cancellation, completion, pagination, dated sections, rate pauses
and display-name profile isolation. Storage formats and permissions are unchanged.
These are isolated checks with mocked Last.fm responses, not signed-in acceptance.
The actual unpacked-extension startup suite also passed on an unchanged retry
(12.4 s), after its first run timed out at the 3-second artist-name assertion
while host CPU measured 100%. Both logs are retained in test-results; no assertion
deadline was relaxed. Preferences survived Reload and fresh navigation.

The bounded maintenance queue completed. Its requested reset watcher subsequently
observed an advanced reset timestamp and was paused before the v0.7.0 follow-up.

## Interaction and browser-history corrections (v0.6.14)

Browser-history restoration retained appended rows but discarded the scroller's
next-page and completed state. A failing lifecycle regression reproduced requests
1, 2, 2 and duplicate rows after returning. A persisted pagehide now aborts active
loading and disconnects observation while retaining pagination progress. Returning
continues with page 3; completed views remain complete. Pending requests can be
cancelled and resumed without appending a late response or losing existing rows.

Preference Save/Delete/Undo controls now share a busy guard. Keyboard focus returns
to the relevant row after Save/Cancel, to Undo after Delete, and to the restored row
after Undo. External updates retain focus on existing row actions. A newer search
keeps focus when a pending mutation finishes. Storage conflict checks still apply.

Backup previews now belong to the latest selected file. A controlled slow-file
regression first reproduced an older file replacing the newer preview. Obsolete
reads and parse errors are ignored; previewing still writes no preferences.

Focused interaction, options, settings, scrolling and dated-section checks pass.
The combined gate passed 22/25 suites. Album navigation, artwork-extension worker
startup and the startup-timing suite hit timeouts while the host measured 100% CPU
and 2.66 GB free memory. Those exact three suites then passed on retry without
source or timeout changes (album 27.7 s, artwork-extension 23.7 s, startup 14.8 s).
All 25 suites are verified, retaining the initial 22/25 result and three retries.
These checks use isolated browser profiles
and mocked Last.fm responses; signed-in Supermium acceptance is not claimed.

## First unassisted reliability pass (v0.6.13)

The artwork refresh previously rebuilt the full artist/album context for each
queued song. A 200-song isolated browser fixture reproduced 1,000 context reads
over five refreshes, with a 373.1 ms median refresh. The same fixture after batching
reads that context once per refresh (five reads total), with an 8.8 ms median.
Rows, covers, exact album proof and the existing network limits are preserved.
This measures CPU work on the fixture, not first-time cover discovery or signed-in
loading speed. Progressive album selection still passes its dedicated check.

Settings saves now retain text/checkbox changes entered after the save began,
with an unsaved note, instead of overwriting the newer draft when the earlier
save finishes. XML casing-choice redraws retain keyboard focus on the same row.
Both defects were reproduced with failing browser regressions before correction.

`node tests/run.cjs` provides a combined gate, explicit suite selection, a browser-
free subset and a suite list. Failure/timeout handling is verified with actual
child scripts. It never loads the installed signed-in browser profile.

The combined isolated-browser and unit gate passed all 22 suites, including the
actual unpacked extension, startup timing, artwork, scrolling, settings, storage,
XML parsing/import/revert and test-runner failure handling. The combined artwork
fixture measured 10.2 ms per refresh; the earlier paired run measured 8.8 ms.
Preferences, storage formats, installation
identity and manifest permissions are unchanged. Rollback source checkpoint:
1f21384. Scheduled work/reset monitoring is described in MAINTENANCE.md.

## Cover recovery across artists

The user reported that the hidden placeholders remained white spaces after waiting,
on several artists. A failing regression reproduced a genuine resolved cover being
kept hidden because apply() restored an inherited visibility:hidden style. Resolved
images now explicitly become visible; profile restoration still returns native styles.

The real public Dean Blunt overview lists LUCRE seventh, with cover
6da014dd54bb1082a3a51218fcbf7a89. Its owned album page confirms 120 plays,
including 18 each for lucre 5/6/7, 17 each for 2/3/4 and 15 for 1. The public
album overview returned HTTP 502 during inspection. Placeholder tracks now skip
the bounded shared counting optimization and read their individual scrobble history.
Once that proves the most-used album, an exact matching loaded album-row cover
can be reused regardless of its position. A public-cover failure can also use
the exact own-library album header after artist/title/link validation. Cancellation,
rate pauses, unrelated headers and generic images remain rejected.

The production page reader fetched the real public lucre 5 history and selected
LUCRE (18/18), reusing the seventh album row. The production UI then applied that
result as a temporary cache record to the real DOM with an inherited hidden style:
visibility was visible, naturalWidth 64, and the link pointed to the LUCRE album.
An inline browser screenshot visually confirmed the yellow LUCRE cover. This
used a separate signed-out browser and in-memory test storage, not the user's profile.

Eight focused suites passed: artwork, shared totals, placeholders, recovery,
actual-extension artwork, startup, adapter and artwork storage. Recovery tests
also use a second artist with several albums, selecting the six-play winner over
the four-play recent album, and check genuinely loaded linked images. No saved
preference/settings/undo/scan keys, permissions or installation identity changed.
Signed-in acceptance is pending the user's Reload and refresh without Console steps.

## Generic cover correction

Public Dean Blunt rows confirm the generic image hash
4128a6eb29f94943c9d206c08e625904 inside span.cover-art for lucre 5/6.
The actual lucre 5 public history contains 18 LUCRE plays, repeating the same
edit-scrobble ID across different timestamp titles. The current reader was run
against that real DOM and selected LUCRE (18/18); its cover input came from the
public artist overview's LUCRE row, not a signed-in cover fetch.

Generic covers are now rejected by source selection and ignored when reading
the separate artwork cache. Their track image is hidden while awaiting discovery;
they have priority over ordinary uncached track jobs. Real black album artwork
remains valid. Successful replacements convert non-clickable cover spans to
album links. Profile changes restore the original markup and visibility.
Failed shared counts fall back to individual history; aborts and rate limits
still stop requests. Native timestamps distinguish repeated edit IDs across pages.
The selected album's primary/sharing images are used, excluding Similar Albums.
If no genuine album image is available, the slot stays empty; no image is invented.

Focused placeholder, artwork, album totals, actual-extension artwork, startup,
adapter and artwork-storage checks pass. Tests cover stale generic cache entries,
span restoration, multi-page repeated IDs, missing artwork and rate-limit boundaries.
No preference/settings/undo/scan keys are changed or cleared. Signed-in acceptance
remains with Reload and refresh when convenient.

## Startup correction

Reproduced all four reported errors in the actual unpacked extension by blocking
a parser script and Reloading after document_start, before document_idle. The
new extension context ran the idle features without the early shared modules:
content.js lacked LastfmRules, native-edit.js lacked its rules API, and both
artwork readers lacked LastfmAdapter. The idle script group now includes its
shared dependencies and artwork initializer in order. Those four modules return
when already initialized, retaining early cached covers and avoiding duplicate
artwork observers. No storage keys, installed path, permissions or identity change.

The new startup browser regression passed after failing with the exact four
reported exceptions before the correction. It also checks fresh navigation and
preservation of all saved test storage. Actual-extension artwork and XML/settings
checks passed, along with rules, adapter and storage suites. The user's signed-in
profile remains untouched; acceptance follows Reload and refresh when convenient.

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

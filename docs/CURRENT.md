# Current state — 20 October 2026

Installed candidate: **v0.9.11 beta**, branch preferences-page.
Baseline: 9ae8197. Combined artwork feedback; one Reload version.

Unverified covers and album links remain hidden until the selected personal album
is proved. Fresh sourceVersion-3 winners apply immediately; stale records remain
hints. Scroll batches prepare cached/shared pairs while detached, then allow up
to four seconds for the first ten cold rows before insertion. New rows and image
attributes are processed locally rather than rescanning the growing table.

Exact personal album headers and validated track counts are reused across sibling
tracks, including detached ranked rows. Ranked lists make at most one new album
guess per track; one-play tracks use individual history unless existing counts
prove the winner. Missing blank-tag title albums do not trigger an additional
useless own-album request. Shared serial pacing, rate-limit pauses, scrolling
consent and checkpoints are unchanged.

Public artist roots and Tracks lists use personal winners. A verified empty
personal history permits only the exact track's explicit source-album association
from Last.fm, kept in page memory. Public artwork access does not grant native
editing, preference writes or other-profile access. Broken selected-image sizes
also recover on public artist lists.

Actual signed-in Supermium checks:

- Five actual Yes loads reached 300 Yeat rows with no page errors. The first
  inserted frame contained verified covers and album links for ranks 51–60,
  151–160 and 201–210, plus nine of ten sampled rows at 101–110. Cold ranks
  251–260 mostly remained hidden during their individual lookups. This is
  preparation evidence, not a guarantee that all 300 unseen covers load at once.
- Page-load elapsed times (including shared queue, network and preparation)
  were 2.8s, 8.4s, 2.4s, 6.4s and 11.5s. Two missing loose title-album pages
  terminated as unavailable rather than looking as though they were loading.
- Public William Basinski initially exposed a real worker scope failure:
  artwork-cache access was rejected because the worker's own URL is an extension
  URL. The URL guard now uses an explicit Last.fm base; a failing worker-origin
  regression and unpacked public-cover integration reproduce and verify the fix.
- Last.fm confirms no personal history or exact source-album association for
  dlp 1.1.1, dlp 1.1.2 and dlp 1.1.3. Those slots remain unavailable. The separate
  dlp 1.1 recording has album metadata; it is never substituted for these variants.
- The corrected public runtime settled on six personal winners with loaded 64px
  images and matching links, plus the exact public 92982 association for 92982.3.
  That catalogue-only result was absent from the personal-winner cache. On a
  cached revisit, all six personal pairs applied 301–368ms after their text, with
  cache access successful. Cold requests in this trace took roughly 5s per page
  including pacing; first-ever resolution still took over a minute for the list.
- A final-runtime Yes append inserted ranks 51–100 in 1.86s. Every sampled
  rank 51–60 had its verified personal cover URL and album link in the first
  insertion frame. Owned live-test tabs were closed afterward to stop test reads.

Evidence: test-results/batch-live.json, batch-live-300.png,
batch-public-live-worker-failure.json, batch-public-live.json,
batch-public-live.png, batch-public-revisit.json, batch-public-revisit.png, batch-final-scroll.json,
batch-public-details.json and batch-worker-origin-fixed.log.
Cold loose tracks can still require individual paced Last.fm responses. The
four-second preparation budget is not a promise of instant artwork. No whole
library crawl, storage migration, new permission or scrobble edit was made.
Old Last.fm tabs still need refresh after extension Reload to release old contexts.

Final combined gate: **56/56 suites passed** (test-results/v0911-combined.log),
including actual unpacked artwork/scroll, public selected-image recovery, native
editing, redirect, XML/undo, storage, startup and desktop/mobile release-site checks.
No test failures remained in that combined run. Earlier reproduced failures are
retained separately as evidence.

Windows independently extracted and hash-matched all 39 runtime files in the
278,938-byte ZIP (test-results/v0911-package-verification.json). ZIP SHA-256:
edce8395a06605760231cb5a7d122775031d5e31e69b4da8bacae98b313184e1.
Package: dist/lastfm-personal-library-0.9.11-beta.zip. No publication or push.
Rollback source: 9ae8197; the installed folder/identity/storage were retained.
Jay's normal browsing acceptance remains the final Reload check.

## v0.9.9 prior candidate — nearby artwork preparation

Baseline: b71710a. Bounded artwork preparation before rows enter the viewport.

Artwork previously started only within 100px of the viewport. The real signed-in
FiGure5 row took 13,432ms after scrolling into view to resolve I5U5WE5. The shared
request queue is serial and retains its 1,500ms pacing and rate-warning stops.

Already-loaded rows now start artwork resolution up to 1,200px below the screen.
Actual on-screen rows retain priority; an off-screen album-less row cannot cancel
a visible lookup. After choosing Always, next-page loading also starts 1,200px
ahead. Initial consent, Yes/No behavior and the 500/1,000-row checkpoints remain.
No whole-library crawl, request concurrency increase, storage migration or new
permission. Cached verified winners still use the existing immediate application.

Signed-in v0.9.9 verification in the installed Supermium profile:

- A new appended rank-51 row resolved to Snot or Not while still 471px below the
  viewport; the batch/album reads took about 8.5s, before the row entered view.
- Initially blank appended Versus resolved to MADNESS; its actual painted image
  was checked with a viewport capture. This was not a timed cold-row comparison.
- On a cached revisit, Lif3's cover applied/loaded 566ms after its text; FiGure5
  took 156ms. Scroll-added Versus applied after 68ms and loaded after 321ms.
- An invalidated hidden DCCXX profile context held the global request lock for
  over ten minutes after extension Reload. A normal-tab inventory missed it;
  direct target inspection found it. Refreshing that target, after confirming
  both checkboxes matched defaults and there was no unsaved input, released it.
  This candidate does not add automatic recovery for invalidated old contexts;
  existing Last.fm tabs still need refresh after an extension Reload.

The look-ahead and early-page-loading regressions both failed before their fixes.
Focused tests cover initial/appended preparation, visible priority (including
album-less cancellation), bounded distance, profile isolation and scroll consent.
Evidence: test-results/v099-live-before.json, v099-live-after.json,
v099-live-blank-ahead.json, v099-live-blank-window.png, v099-cached-timing.json,
v099-hidden-target.json, v099-focused.log and v099-priority-focused.log.

First-ever lookups can still take seconds, particularly on an immediate jump or
manual Yes load. Preparation reduces waiting while scrolling; it does not make
Last.fm responses instantaneous. No whole-library latency guarantee is claimed.

The first combined gate passed 54/54 suites. After the album-less priority guard,
53/54 passed; scroll-history missed a request because it installed its listener
after clicking Yes. Registering that listener before the click corrected the
test race, and its focused rerun passed. The other 53 suites need no rerun for
that test-only edit. Logs: v099-combined.log, v099-final-combined.log and
v099-scroll-history-fixed.log. All 54 suites are verified across these runs.
Windows independently extracted and hash-matched all 39 runtime files in the
268,957-byte ZIP (v099-package-verification.json). ZIP SHA-256:
c8e6eda41824d3bd6515294c497ab547f4c470b8734f676f9d12be57550c3c41.

## v0.9.8 prior candidate — signed-in artwork parsing

Baseline: 83cb6d8. Signed-in Supermium defect isolated and corrected.

The real signed-in history response for lucre 5 contained 18 valid LUCRE
scrobbles plus 49 empty rows in a chartlist__placeholder loading table.
The LUCRE album response contained seven valid tracks (120 plays in total)
plus six empty loading rows. Both artwork readers included these skeletons,
then rejected the response. Waiting could never resolve the hidden image.
Both readers now exclude only explicitly marked placeholder tables; validation
of every real row, exact artist/album identity and majority counts remains strict.

The regression reproducing those signed-in skeleton tables failed before the
fix, then all three focused artwork suites passed. Live v0.9.8 was reloaded in
the existing approved Supermium profile with identity/storage preserved:

- Initial lucre 5: LUCRE, 18/18, visible loaded 64px image and exact album link.
- The actual Yes button appended ranks 51–100. Rank 53, 3dash snow dubs stereo
  test1 new fx, initially had a hidden placeholder. Its normal queue rendered
  BM2  KWAKE DUBS 2021, matching all nine real scrobbles despite 49 skeletons.
- Both actual painted covers were checked with viewport screenshots. Initial
  compositor screenshots were unusable; direct viewport capture succeeded.

Local evidence: test-results/live-artwork-trace-20261020.jsonl,
v098-live-window.png, v098-live-scroll-window.png, v098-before.log and
v098-focused.log. Shared readers cover all artists and appended rows; the
synthetic mixed-library regression covers additional artists, cold history,
native scrobbles and profile isolation. This is not an audit of every library
track. Unseen albums still require paced requests; unavailable art is unresolved.

The final combined regression gate passed **53/53 suites**
(test-results/v098-combined.log). Windows independently extracted all 39
files from the 268,333-byte package and matched every SHA-256 to the source
audit (test-results/v098-package-verification.json). ZIP SHA-256:
412b77befd7e41ecdab22ca6a9d97eaf09907840b9e2230bd18c4ee0c1a40215.

## v0.9.7 prior candidate — signed-in acceptance failed

The shared album-count recovery was limited to an individual artist URL, and
only tracks already rendered could contribute saved album hints. It now also
runs on the mixed-artist library Tracks page. Saved hints from off-page tracks
are registered once per page generation, including artists reached by scrolling.
Each artist retains its own five-album candidate bound. Exact personal track
counts and album-header identity still prove each winner; matching song/album
names from another artist cannot contribute evidence. Cold tracks retain their
individual history lookup. No data migration, permission or request-pacing change.

The new actual-unpacked mixed-library regression fails on v0.9.6 and passes the
correction: initial rows, new artists after row 50, off-page legacy seeds, same
titles across artists, unrelated seeds, cold history, cached revisit and native
Scrobbles rows appended by scrolling. The latest scrobble's minority album must
not replace its track's most-used album. Six focused suites passed
(test-results/v097-focused.log). The final combined gate passed 53/53 suites
(test-results/v097-combined.log), including 101 uncached scroll-added tracks,
album-view covers, native editing, profile changes and preserved stored data.

Windows independently extracted all 39 files from the 268,275-byte v0.9.7 ZIP
and matched every SHA-256 against the source audit
(test-results/v097-package-verification.json). ZIP SHA-256:
105f5c0c003c302e991388e3da5eee463b2cfd9e2c327b25ef1682e0beb4ca7b.

The public DCCXX library Tracks page was reached and its 50-row artist/track
identities and data-stat-value counts inspected. It is logged out. Isolated
unpacked extension checks do not certify Jay's signed-in session. Cached covers
can paint immediately; discovering an unseen winner still requires Last.fm
responses. No guarantee is made for unavailable metadata or missing artwork.

## v0.9.6 evidence and prior acceptance history

Baseline: 7ffd7a9; focused legacy-cache correction, signed-in acceptance pending.

Read-only inspection reached the active Supermium extension's artwork storage.
Its lucre 7 record is dated 6 October and lacks sourceVersion; LUCRE siblings
are absent. v0.9.5 required a fresh sourceVersion 3 winner to seed album counts,
so its fixture did not represent this installed cache. No stored data was changed.

Legacy/stale non-fallback winners now supply album-name hints only. Exact current
own-library album counts must prove each track's winner; an exact album header
must provide fresh artwork before a hint can resolve anything. Old image URLs
are not promoted to verified artwork. Existing fresh-cover behavior, request
bounds, profile isolation, storage format and permissions remain intact.

The actual public source reader resolved lucre 5 to LUCRE (18/18), and the live
LUCRE album exposed matching track counts summing to 120. Both inspectors remain
logged out, so these reads do not certify the installed signed-in queue/forms.

The new unpacked regression fails against v0.9.5 and passes this correction:
legacy cache, refreshed image, initial/appended rows, majority proof, insufficient
counts, cached revisits and profile/preferences preservation. Four focused suites
passed (test-results/v096-focused.log). Final album-header rejection and release
checks passed 2/2 (test-results/v096-final.log). The 39-file ZIP was independently
extracted and all hashes matched (test-results/v096-package-verification.json).
ZIP SHA-256: a0157a2611c371c35c65ff96b35df99bf127eb7b164eb10e75138e461514bde6.
No full-suite rerun or
signed-in visual acceptance is claimed. Prior failed candidate follows.

**Live acceptance failed:** Jay's 20 October screenshot still shows blank
lucre 1–6 and A_X covers on Dean Blunt's full Tracks page. v0.9.5 is not an
accepted fix for this defect.

The earlier follow-up inspection could not reach the failing signed-in runtime: Computer
Use lists only the empty in-app browser/MCP Apps surfaces, and the running
Chrome/Supermium processes expose no remote-debugging-port flag. The separate
DevTools browser initially received Last.fm's Temporarily Unavailable page (body said
Error 503) for the exact Tracks URL. It subsequently recovered. That response does not establish
the cause in Jay's tab.

The v0.9.5 regression assumes a fresh sourceVersion 3, non-fallback LUCRE winner
is cached for lucre 7, and ranked rows expose data-stat-value. Neither assumption
has been observed in the failing signed-in tab. A visible lucre 7 cover alone
does not prove it can seed the shared album reader. Before another runtime fix,
inspect a failing row's job/error, the cached lucre 7 record's freshness/source,
and the actual history/album response and count markup. Preserve saved data;
do not repeat the short-ID/header theories, clear caches, or treat fixture
passes as evidence that this live defect is fixed.

Artist Tracks album-count reuse baseline: 6bcd73e (v0.9.4 beta).
Broken image recovery baseline: 9522e18 (v0.9.3 beta).
Redirect protection baseline: 2e7420f (v0.9.2 beta).
Scroll consent and page-overlap baseline: 881fe1b (v0.9.0 beta).
Library-wide XML casing framework baseline: b134285 (v0.8.3 beta).
Scrolling/artwork recovery baseline: ff6fc13 (v0.8.2 beta).
Artist Tracks correction baseline: c4ef360 (v0.8.1 beta).
Album-view correction baseline: b391802 (v0.8.0 beta).
Beta preparation baseline: 7de6c8d (v0.7.0).
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

## Artist Tracks album-count reuse (v0.9.5)

Dean Blunt's public Tracks page reproduces the native LUCRE placeholders. The
public lucre 5 history was read successfully: all 18 plays name LUCRE; the
album overview supplies image 6da014dd54bb1082a3a51218fcbf7a89. Subsequent history
reads returned HTTP 600 intermittently, also on normal navigation. One success
with Accept: text/html did not repeat, so headers were not changed. The initial
short-ID theory was disproved before any runtime change: that captured ID has
32 digits. Public inspection does not establish Jay's signed-in queue state.

Previously the shared album-count reader only worked on artist overview pages,
not /+tracks. A fresh, verified cached LUCRE track could already display, while
each blank sibling still needed its own failing history read. Artist Tracks
pages now seed up to five exact albums from fresh verified track winners on the
page. Existing bounded own-library album reads prove each new track's winner
against its all-time total, including appended rows. Thirteen of eighteen plays
prove a winner; five of eighteen do not. Ties/uncertainty retain the individual
history reader. Unfiltered views only; source identity, native fields, starred
cover, links, request pacing, rate-limit stops and data formats are preserved.

This reduces repeated history requests; it cannot reconstruct unavailable
metadata. With no fresh known album, or if both album and history requests fail,
the correct cover remains unresolved. No claim of universal instant loading or
signed-in acceptance is made. The original broader live blank-cover issue below
remains an acceptance item.

The new actual-unpacked regression fails on the previous runtime and passes
with shared album counts: initial and scroll-added tracks paint/link correctly
without their unavailable histories, insufficient counts never guess a winner,
and cached revisits/profile/preferences are preserved. Focused gate: 4/4 suites
(test-results/v095-known-before.log and v095-known-focused.log). The combined
gate passes 51/51 suites (test-results/v095-combined.log), including existing
artwork authority, native edits, scrolling, startup, storage and XML checks.
The actual public LUCRE 64s image also decoded successfully at 64x64.

Windows independently extracted the 39-file package; all files match the tested
source and package audit (test-results/v095-package-verification.json).
ZIP: 265,569 bytes; SHA-256
57ad63f41b2432a9328aebb61432385a4c0d742a6f896aabbf9530a531c51337.

Jay supplied a live screenshot confirming Drug Church's repaired portrait after
v0.9.4. That acceptance covers the portrait, not unresolved track placeholders.

## Broken artist and album images (v0.9.4)

The previous runtime had no handler for failed native image loads. A failing
actual-unpacked regression reproduced broken artist and album derivatives while
the same image remained available at another size. Recovery now checks native
load errors and failures already present at startup, including scroll-added rows
and failed responsive sources. It probes 300x300 then ar0 using the exact image
ID/file type, committing only a successfully decoded source. Personal artwork
uses that repaired source instead of repeatedly restoring the failed thumbnail.

Only the connected profile's chartlist/header images participate. Working images,
alt/title text, links, styling, selected photo/album identity and saved data stay
intact. Two probes per image ID, two active jobs, five-second probe deadlines,
256 in-memory jobs and viewport gating bound requests and memory. Failures do
not trigger history or HTML-page reads. Deleted/fully blocked images remain
unavailable; generic placeholders still belong to the existing selection logic.

The new real-unpacked image-recovery suite verifies native startup failures,
artist/album recovery, failed srcset and lazy-loader rewrites, scroll-added rows,
visible-element failure after a successful probe, personal-cover coexistence,
stale preference protection, offscreen deferral, finite failures and friend/data
isolation. Before log: test-results/v094-image-before.log. Focused integration
passes image-recovery and artwork-extension (v094-image-integration-final.log).
An initial focused run exposed an undefined-record comparison for non-CDN image
names; the guard was corrected before the final passing integration run.

Drug Church's public photo ID 6696583a8c279d9b0534d98d51140fe8 returned actual
JPEGs at avatar70s, 64s, 300x300 and ar0 during investigation. The original
signed-in failure could not be inspected: the attached DevTools browser has no
Last.fm session and direct public page fetches return a Client Challenge.
Therefore alternate-size recovery is verified in isolation, while Jay's actual
Drug Church page remains the Reload acceptance check.

A separate isolated unpacked-browser check forced the native thumbnails to fail,
then loaded the real public Drug Church portrait and Hygiene cover from Last.fm's
CDN. Both decoded at 300x300; the screenshot was visually checked
(test-results/v094-public-cdn.png and v094-public-cdn.json). This uses public
images in a constructed page, not Jay's signed-in library.

The 39-file package was independently extracted by Windows and every file/hash
matched the tested source (test-results/v094-package-verification.json).
ZIP: 264,067 bytes; SHA-256
c727a14fd59b8849b7ae3b4f9e435c690a873d809e234e35822296127c9518bb.
Final combined gate passed 50/50 suites (test-results/v094-combined.log),
including existing artwork, startup, redirect, scrolling, native editing,
storage and XML checks. No signed-in acceptance is implied by these checks.

## Artist redirect protection (v0.9.3)

Exact Travis Scott and Lucki links gain +noredirect in the connected profile
and their public music pages, including albums/tracks and scroll-added rows.
Already canonical Lucky Twice / Travi$ Scott links require validated original
native scrobble evidence before repair. Other profiles, genuine Lucky Twice,
image galleries and native edit forms retain their original behavior.

The shared read queue applies the same routing and rejects another returned
artist. Pagination accepts only equivalent direct/bypass paths, preserving
filter and page checks. The new default-on setting can restore native hrefs
immediately; old backups remain supported without a startup migration.
No permissions, identity, saved rules, XML undo or legacy record changes.
Scope, sources, acceptance and limits: docs/REDIRECT_PROTECTION.md.

Combined gate passed 49/49 suites (test-results/v093-combined.log), including
redirect URL/storage, actual unpacked scrolling, artwork read/native-edit,
settings, startup Reload and existing XML/artwork/history checks. Settings UI
was visually checked. Windows extracted all 38 runtime files and matched their
SHA-256 values to tested source (test-results/v093-package-verification.json).
ZIP: 255,909 bytes; SHA-256
e6ce50ca191e4c267964c5683ee342910705f0b9b29f414a3a33427b1817f4d5.
Signed-in Last.fm acceptance remains Jay's reload check; fixtures do not certify
Last.fm's actual catalogue, global statistics or account setting.

## Compact scroll prompt (v0.9.2)

Baseline: 7217c0d. Removed the explanatory hint beneath “Load next page?”
and prevented Yes / No / Always from wrapping onto separate lines. Loading
choices and ten-page checkpoints are unchanged.
Scroll-consent and release checks passed (2/2). The real content script and CSS
were visually checked at 770px panel width and a 360px viewport; all buttons
share a row. Rebuilt the 37-file v0.9.2 beta ZIP (246,526 bytes).

## Scroll consent and history overlap (v0.9.1)

Every fresh library view asks “Load next page?” with Yes / No / Always. Yes
loads one page, No stops this view and restores native pagination, and Always
enables automatic scrolling only to the next ten-page boundary. The initial
page counts, so the first checkpoint is 500 rows on a normal 50-row list, then
1000. No saved settings, preferences, XML undo or legacy scan formats changed.

A reproduced warning/resume fixture showed shifted offset pages repeating
already loaded plays and date headings. History joins now compare verified
timestamp/artist/track identities, omit overlaps and reject unseen out-of-order
rows before insertion. Genuine repeated listens at different timestamps remain.
Requests stay serialized; explicit resume is reserved before clearing a pause.
Constructed evidence does not establish the precise signed-in response Jay saw.

Focused checks: scroll-overlap and scroll-consent pass; existing library-scroll,
scroll-history, scroll-toggle, scrobble-sections and actual unpacked XML import
pass with explicit consent. Combined gate passed 46/46 suites (v091-combined.log).
Windows extracted and matched all 37 runtime files against the audit and tested
source (v091-package-verification.json). ZIP: 246,892 bytes; SHA-256
2c34bb349e7ae243abf8bd4a89b4c19302aad5d40c393cfda707c3b79d977ee1.
The actual unpacked prompt was visually checked (scroll-consent-panel.png).
Logs: test-results/v091-overlap-before.log, v091-scroll-focused.log and
v091-scroll-guards.log. No artwork correction or signed-in acceptance claimed.

## Library-wide XML casing framework (v0.9.0)

The existing streaming XML import now has artist, album, song and album-artist
selection controls spanning every result page and the active search. Display
names links directly to import. Exact source spelling is retained without title
case conversion. Existing differing preferences remain unchecked until selected;
conflicting XML casings require a choice. Apply and persistent selective Revert
reuse the unchanged sole-writer storage contract.

The XML adapter now uses a source-independent, versioned metadata collector;
Library Doctor can later supply the same reviewed name records. Only four name
fields enter the plan; private paths/IDs are discarded. No connection to Library
Doctor, new permissions, user-data migration or live music-library edits.
Contract and future integration boundary: docs/LIBRARY_CASING.md.

Focused checks passed: shared collector (5000 songs), existing 128 MiB parser,
review controls across search/pagination, and actual isolated unpacked import.
That integration verifies exact names on initial and real infinite-scroll rows,
friend isolation, persistent Revert, later manual edits and legacy-record
preservation. Logs: test-results/v090-casing-focused.log (collector/parser pass;
new fixture interaction assumptions corrected), v090-casing-ui.log (2/2 pass).
Combined regression gate passed: 44/44 suites (v090-combined.log). Windows
independently extracted and matched all 37 runtime files against the audit and
tested source (v090-package-verification.json). ZIP: 242,199 bytes; SHA-256
a1108ad66193dfb943b59bde71bc33762111c1a8a8417d8f463be68deffcb924.
Constructed tests do not certify signed-in Supermium or Doctor integration.

## Unresolved live artwork follow-up

Jay still sees blank covers around ranks 42/53/55/57 after infinite scrolling.
Investigation baseline: 8beff8c. No runtime correction or new release is claimed.
The actual-extension scrolling fixture now uses 101 distinct uncached tracks
instead of one repeated cached track. It exercises ordinary competing jobs as
well as the initial/imported placeholders and temporary-response recovery.
The focused actual-extension test passed (1/1, 35.165 seconds); log:
test-results/v084-uncached-scrolling.log. This does not reproduce the live fault.

The public full Tracks page is accessible and supplies the generic placeholder
for FiGure5 [INTERLUDE]. In its real CSS the hidden image remains a 32px box and
IntersectionObserver reports it intersecting, ruling out that simple visibility
hypothesis. Public history and artist-detail fetches return HTTP 600; they do not
show the signed-in failure. Native Computer Use lists Supermium but window
binding fails: "window id ... no longer belongs to Chrome; current owner is
Chrome". No native app input was sent. Jay asked us to collect the popup result
ourselves; the alternate browser connection also failed to answer within a
bounded 20-second check. No additional Console/reload homework is requested.
Runtime work waits for direct evidence of the failing queue/reader step.
Signed-in acceptance is open. The v0.9.0 XML framework leaves this artwork
behavior unchanged; no artwork fix is claimed.

## Scrolling/artwork recovery (v0.8.3)

Jay reports blanks after infinite scrolling starts. The real page-2/page-3
insertion test initially passed unchanged. A separate failing regression proved
that one temporary history error permanently stranded an otherwise resolvable
cover during scrolling. Recovery now waits ten seconds and retries once while
visible, using the existing paced queue. Other covers continue during backoff.
Metadata refusals, rate warnings and native writes do not auto-retry. Profile
changes cancel recovery; hidden tabs suspend it. Album selection is unchanged.

The new actual unpacked-extension integration covers 101 rows, a temporary
rank-42 failure, imported rows 53/55/57/101, loaded images and album links,
preference preservation and removal of completed scroll controls. Focused
guards cover persistent failure bounds, invalid metadata, rate stops, hidden
tabs and profile changes. All 42 suites are verified: the combined gate passed
41/42, with only the new test's first-install setup tab racing its Last.fm
navigation. The fixture now waits for that owned setup page before navigating;
its focused rerun passed (1/1), without a runtime change. Logs:
test-results/v083-combined.log and v083-scroll-startup.log. The original
temporary-response regression failed first (v083-transient-before.log).

Windows independently extracted and matched all 36 runtime files against the
audit and tested source. ZIP: 237,752 bytes; SHA-256
bde6d798574d2eacde9101db6523d87006dafc1b541d1064eff70379ed659ffb.
Report: test-results/v083-package-verification.json. The extracted package also
passed actual isolated-extension onboarding, profile/record preservation and
no-automatic-write checks (1/1; v083-extracted-install.log).

Chrome DevTools reached the public full Tracks list (50 native images). Public
track-history and album pages returned HTTP 600. Signed-in Supermium remains
unverified; this reproduced recovery defect is not a confirmed diagnosis of
Jay's current page. No Console homework, data migration, user-profile access,
scrobble edits, permissions change or publication. Rollback source: ff6fc13.

## Artist Tracks artwork (v0.8.2)

Jay reported a blank FiGure5 [INTERLUDE] cover on Homixide Gang's full Tracks
list despite 12 scrobbles tagged I5U5WE5. Public page inspection returned a
Client Challenge. A targeted regression reproduces the parser's rejection
when a native album tag is present but the album-artist tag is omitted.

Read-only lookup now validates a detached form copy with an empty album artist,
then uses the track artist for the tagged album. Raw tags remain authoritative;
malformed/duplicate fields still fail and native edit validation is unchanged.
The regression verifies rank 42, a later appended mixed-album row, actual image
loading and links, shared cover reuse, preference preservation and a cached
offscreen revisit without requests. Album-view behavior remains unchanged.

All 40 suites verified: the combined run passed 39/40; artwork's old negative
fixture still required the now-optional album-artist tag. That fixture now omits
the album tag instead, retaining the missing-album refusal check. Its focused
rerun passed (1/1). The new artist Tracks regression passed before that rerun;
all other combined suites, including actual extension injection, passed.
Independent Windows extraction verified all 36 runtime files against the audit
and tested source. ZIP: 236,622 bytes; SHA-256
028024b41dc85f11da6b3c01f8d391b6d8fb46dca02b6aef371565a05f745516.
Logs: test-results/v082-before.log, v082-artist-tracks.log, v082-combined.log,
v082-artwork-contract.log and v082-package-verification.json.
The extracted ZIP passed actual isolated-extension onboarding, profile/record
preservation and no-automatic-write checks (1/1 suite); log:
test-results/v082-extracted-install.log.
Signed-in acceptance remains pending; no Console diagnostics are requested.
Rollback source: c4ef360. No identity, permissions or storage formats changed.

## Album-view artwork (v0.8.1)

Jay reported inconsistent track covers on his DANGEROUS SUMMER album library
page. General per-track discovery was running without an album-view override.
A regression reproduced different-release covers and blank placeholders.

Exact own album views now verify the header's public album link against the URL,
then reuse its real cover for every main-column track row and image link, before
cache readiness or network scheduling. Guest artists, late rows and native lazy
rewrites are covered. Header preferred-cover changes refresh the rows. These
view-specific covers do not write the global winner cache or any preferences.
Artist/general lists retain most-scrobbled-album selection. Other profiles and
sidebars stay native. Missing or mismatched headers cannot supply another album.

Focused album-view and actual unpacked-extension checks pass. Combined gate:
39/39 suites passed, including native editing, artwork/cache isolation, XML,
scrolling, beta defaults/guards, packaging and startup. Independent Windows ZIP
extraction verified all 36 files against both the audit and tested source.
The ZIP is 235,934 bytes, SHA-256
8f0b03f295cb61b6f7af4be91d78095d6bdb1627067b4471b6702272ec0e9de9.
The extracted package passed actual isolated-extension onboarding, profile
isolation, preserved-record and no-automatic-write checks (1/1 suite).
Live public inspection returned Last.fm's Client Challenge; reconstructed fixtures
do not certify the current signed-in layout. Jay's one Reload and refresh remains
final acceptance. Logs: test-results/v081-combined.log, v081-focused.log,
v081-package-verification.json and v081-extracted-install.log.
Source rollback: b391802. No storage formats, identity or permissions changed.

## Public beta candidate (v0.8.0)

Jay authorised unassisted beta preparation with one version to Reload and test;
he will arrange the developer account. No public upload or submission was made.

Fresh installs now start disconnected and offer profile setup; existing settings
still retain DCCXX or the user's configured profile. XML selection waits for a
profile. Existing preferences, XML undo, artwork and legacy discovery records
are not migrated or reset. Automatic album-less correction and native capture
are unavailable in this beta. Both content and worker guards enforce this even
when an older saved enabled flag is true; saved records remain reviewable.

Original icons, local Help/Privacy, beta/version links, store text and three
1280 × 800 UI screenshots with fictional metadata are prepared. The static
download/privacy site is assembled in dist/site, with no external dependencies.
It was visually checked at desktop/mobile widths. Runtime distribution uses
an explicit 36-file allowlist, manifest at the ZIP root and per-file SHA-256.
The ZIP was independently expanded by Windows and every file hash verified.
The extracted package passed an actual isolated-extension installation check.

Combined gate: 36/38 passed initially. Artwork-extension and one library-scroll
fixture still assumed the old DCCXX default and timed out while disconnected.
Both fixtures now explicitly configure their intended profile and passed the
focused two-suite check; scroll-history fixtures were updated on the same basis
before their combined-run check. All 38 suites are verified. Initial failures
remain in test-results/v080-combined.log; focused and extracted-package logs are
v080-fixture-check.log and v080-extracted-install.log. Experimental album-less
algorithm tests explicitly override the beta gate in the test harness only.

Delivery: dist/lastfm-personal-library-0.8.0-beta.zip and matching checksum/audit;
release/PUBLISHING.md, STORE-LISTING.md and NOTES.md describe the handover.
The checksum is e1465f04d4bf25fcaf9b31cf691f76e391558d72d0d784701c3d8e7754617397.
Website address, real publisher/support information, live acceptance and store
submission remain publication gates. Jay's signed-in browser/storage was not
accessed. Export JSON, Reload the existing extension, then refresh Last.fm.
Cold artwork still needs paced requests; native editing/artwork need live testing.
Source rollback is 7de6c8d; an older enabled correction flag can become active
again in that version, so review/disable it before browsing after a rollback.

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

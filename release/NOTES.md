# v0.9.27 beta - Casing and compatibility

- Apply saved casing earlier during page parsing and before paints of newly inserted names; initial display reads no longer wait behind cache work.
- Fix a reproduced artwork/redirect observer loop that could stall pages.
- Preserve other extensions' text, hidden rows, cover styling and visibility choices.
- Live Debloater 1.6.9 checks passed, including navigation and appending rows. Current bleh 2026.1029.1 retained styling/casing and transformed appended rows; an earlier refresh passed, but final repeat checks found intermittent failure to initialise, also reproduced with LastWord disabled. Full repeatable bleh refresh compatibility is not claimed. The older installed bleh 2026.0729 also has independent startup errors. Temporary scripts were removed and original disabled states/settings restored.
- Saved preferences, cache, undo records and pauses are preserved. No new permissions, storage migrations or server-side edits.
- Automated checks: 75/75 suites passed across the final 74/75 run and an isolated rerun of the capacity test, which exceeded the aggregate runner timeout. The rerun saved 56,000 preferences plus undo (34,239,827 bytes) and preserved a later edit on undo. No single clean full-run claim. Private browser evidence is excluded from packages.
- Rollback source: v0.9.26 / 5df72e8.

# v0.9.26 beta - LastWord for Last.fm

Renamed the extension, its pages, diagnostics and store listing to LastWord for Last.fm. The logo, interface design, permissions and saved-data formats are unchanged. Existing backups and caches remain compatible.

# v0.9.25 beta — Remaster for Last.fm

- Renamed the extension and its visible pages, downloads and store materials to Remaster for Last.fm. Icons, layout, extension identity, permissions and storage formats are retained.
- Enabled infinite scrolling on native paginated chart lists across Last.fm profiles and public music, tag and chart pages, including when no personal profile is connected.
- Local casing, cache ownership, artwork permissions and native editing retain their existing profile boundaries. Requests remain GET-only and honour pacing and pauses.
- Installed Supermium verified: another profile and public tag list each grow from 50 to 100 rows; refresh retains scrolling availability. Saved data matches the private snapshot except normal request-pacing timestamps. Public music-page acceptance remains unverified after that page became unresponsive.
- All 71 suites pass across the full run and focused reruns of three updated expectations. New universal-scroll coverage includes foreign profiles, public charts, no connected profile, unchanged foreign names, target guards and opt-out.

# Chrome Web Store package · v0.9.24 beta

29 October 2026. Packaging baseline fa293fe. Runtime version and extension identity are retained. Updated privacy wording for universal redirect scope; no feature, permission or storage-format changes.

Includes current synthetic store screenshots, listing/reviewer text, storage/unlimitedStorage/alarms justifications, runtime file hashes and a separate store handoff ZIP. No personal XML, browser storage, profiles or logs are packaged. Public publisher/support details and a hosted privacy URL remain required; no Chrome submission is performed.

Source and packages are intended for the existing private GitHub repository. Previous versions are preserved. The installed browser and its saved records are left untouched. Kesha-specific source checks passed; new live Kesha verification remains pending. Existing signed-in v0.9.24 acceptance and limits are in docs/CURRENT.md.

---

# v0.9.24 local candidate — Settings buttons and music redirect protection

- Replace Settings navigation links with light-green buttons; simplify the
  Manage preferences label and remove the redundant cache navigation link.
- Put redirect description above its checkbox and independent save controls.
- Protect supported artist, song and album links for every artist, including
  appended rows and public music pages. Repair a changed artist only from
  matching original native row fields; never infer from display preferences.
- Reject protected read responses that change artist, song or album identity.
  Preserve native edit forms, GET-only transport, pacing and saved user data.
- Installed signed-in Supermium checks cover library refresh and real Yeat
  artist/album/song navigation. No Last.fm data edits or new permissions.
- Rollback: v0.9.23 checkpoint dd447bf. Not pushed or published.

# v0.9.23 local candidate — cleaner Settings

- Rename the Settings heading to Remaster for Last.fm; remove the top tagline and
  username helper line.
- Clarify the infinite-scroll label and move redirect protection into its own
  tile with independent save feedback. Drafts in the other tile are preserved.
  Existing Travis Scott/Lucki behavior is unchanged; no new artists are added.
- Use the supplied iTunes import description exactly.
- Remove Connection & artwork; keep confirmed artwork refresh and tab selection
  in collapsed Troubleshooting. Keep profile/preference status where relevant.
- Preserve extension identity, permissions, preferences, undo, cache and pauses.
- Rollback: v0.9.22 checkpoint f7f11dc. Local only; no GitHub publication.

# v0.9.22 local candidate — guided iTunes casing

- Three numbered, collapsible steps: cache Last.fm, import XML, review/accept.
  Explain background caching, XML export and partial-cache comparisons. Keep
  pause/resume and cache export/import; warn that 50,000+ scrobbles can take
  over 30 minutes and very large libraries several hours before rebuilding.
- Show Saving, preview updating and explicit Complete feedback after committing.
  Prevent duplicate submission; retain selections on failed saves; expose Undo.
- Remove the redundant infinite-scroll success message from the popup.
- Reuse a coherent worker cache view for read-only metadata. A 50,000-name,
  20-status-query test reduced full cache reads from 20 to 1 (~1.7s to ~0.24s).
  This measures local overhead, not end-to-end download speed. Request pacing,
  cooldowns and atomic page persistence stay unchanged.
- Preserve identity, permissions, storage and casing-only / GET-only boundaries.
- Source rollback point: v0.9.21, commit 51c8169. Not pushed or published.

# v0.9.21 local candidate — popup redesign

- Match the supplied popup layout: connected profile/avatar, persistent infinite
  scroll dropdown, green iTunes XML matching and Settings buttons, compact footer.
- Keep detailed connection/scroll status, preference counts and confirmed artwork
  refresh in Settings. Artwork refresh includes a connected Last.fm tab selector.
- Remove Albumless screens, capture, discovery, correction modules and store API.
  Reject old action messages and prevent removed feature modules being packaged.
- Preserve legacy storage, display preferences, XML undo, cache progress and jobs.
- No new permissions, extension identity change, Last.fm submissions or publishing.
- Source rollback point: v0.9.20, commit 2a1c59f.

# v0.9.20 local candidate — safer background cache

- First profile connection starts resumable background caching. Keep a connected
  Last.fm profile tab open; the comparison screen can close.
- Pause/Resume replaces Refresh cache. Advanced rebuild requires confirmation
  and retains the current cache until its replacement finishes.
- Export/import complete or partial cache JSON, with profile checks, preview,
  confirmation and failed-import preservation.
- Skip malformed rows, report their names/links/reasons, and retry missed pages.
- Reduce memory churn by excluding large cache/undo records from ordinary reads
  and avoiding cache rewrites for job metadata updates.
- Exact casing-only matching, GET-only transport and existing data are preserved.
  The alarms permission adds job wakeups without new website/account access.

# v0.9.19 local candidate — exact casing comparison

- Clean Before → After review hides unchanged and unscrobbled XML names.
- Exact spelling/artist matching preserves featuring text, punctuation and titles.
- Read-only Last.fm caching supports persistent pause/resume and labeled partial
  previews. Multiple XML files are read locally without uploads.
- Transport submissions are permanently blocked; retained substantive rename
  preferences cannot change displayed titles. Native site edits stay separate.
- Installed identity, preferences, undo, scan records and pauses are preserved.

# v0.9.18 local candidate — whole-library XML stylisations

- Older iTunes XML exports with the Apple Computer public identifier now scan.
- Select whole library reaches every review page and type. Review filters find
  casing conflicts, replacements, matching preferences and new names.
- Review and Apply confirmation report unresolved names and saved preferences
  that would be replaced. Conflicts still require an explicit casing choice.
- Approved `unlimitedStorage` supports the preferences and undo for large
  libraries. File reading and preference storage remain local; no new site access.
- v0.9.17's labels, artwork-refresh confirmation and test cleanup are retained.

# v0.9.17 local candidate — labels and safer artwork refresh

- The popup, Settings, Help and Privacy pages read their version label from the
  manifest (they previously showed v0.8.0 or v0.9.13).
- Refresh artwork asks for a second click before removing saved covers, because
  removed covers are not looked up again while artwork lookups are off.
- Test suites delete their temporary browser profiles. No behaviour, storage or
  permission changes otherwise.

# v0.9.16 local candidate — zero-request artwork

- v0.9.16 fixes an uncaught `known?.get is not a function` error in v0.9.15 when artwork lookups are off.

- Artwork no longer fetches Last.fm pages. Rows show Last.fm's own image and link,
  replaced only by saved personal winners, scrobble-row albums or the viewed album page.
- Last.fm's rate warning is now a timed cooldown (2–30 min) that ends automatically;
  answering Yes/Always to the next-page prompt no longer clears it.
- Background reads share a rolling request budget; the artwork cache holds 3,000 tracks.

# v0.9.14 local candidate — cold ranked acceptance pending

- Ranked discovery no longer chooses an arbitrary saved album when several
  candidates compete. A native row album link may choose one personal album read,
  but only verified personal counts can establish the winner and image/link pair.
- Duplicate native/saved album hints contribute their counts once. Existing
  placeholder priority, pacing, rate pauses and scroll consent remain intact.

The actual installed Supermium extension reports v0.9.14. Saved covers paint and
stored settings, rules and scan draft hashes match the pre-Reload state. Last.fm
paused reads during baseline tracing; that pause is retained. Cold first paint,
no wrong first-frame artwork, and live ranked rows 200–300 are not certified.
This candidate is local only. Detailed evidence and checks: docs/CURRENT.md.

## v0.9.13 beta

- Keeps a matching scrobbled-album cover visible while checking the track's
  most-used album. Verified winners still take precedence; unrelated compilation
  covers remain hidden. Temporary previews are not persisted as winner records.
- Applies the same display path to scroll-added scrobbles. Incomplete native forms
  cannot leave an image hidden without a resolution job.
- Removes the four-second artwork wait from pagination. Next-page requests run
  before queued artwork reads, retaining shared pacing and Last.fm's rate pause.

Installed-profile checks reached 199 scrobbles and traced an uncached appended
track through to its proved album cover. Sampled successful page appends took
1.4 and 2.5 seconds; network delays still vary. The full gate passed 59 suites,
with four focused suites rerun after restart and all 39 ZIP files independently
matched to source. Identity, stored preferences, XML undo and scan records remain.
Evidence, the retained server-error boundary and verification limits: docs/CURRENT.md.

## v0.9.12 beta

Fixes a freeze caused by artwork and redirect protection repeatedly rewriting
the same album link. Artwork accepts the protected URL for that exact album.
The correction also covers scroll-added rows and switching redirect protection
off and on. Stored preferences, import undo, scan records and permissions remain.
Cold artwork lookups still require Last.fm responses. Verification: docs/CURRENT.md.

## v0.9.11 beta — withdrawn

Artwork feedback combined into one Reload version:

- Unverified covers and album links stay hidden while the personal winner is found.
- Cached/shared covers apply before scroll-added text is inserted. The first ten
  cold rows get up to four seconds of preparation; other work continues nearby.
- Exact personal album headers/counts are reused across sibling tracks. One-play
  tracks avoid speculative album reads, and row updates avoid full-table rescans.
- Public artist pages and their Tracks lists use personal winners. Unheard tracks
  use only Last.fm's explicit exact-track album association, never a nearby variant.
- Broken selected-image sizes recover on public artist lists too.

Signed-in checks reached 300 Yeat rows and verified initial inserted image/link
pairs. Six personal Basinski covers applied 301–368ms after text on a cached
public revisit; another track used its exact public album relation. Three numbered
variants genuinely lacked that relation and stayed unavailable. Cold loose tracks
still require paced Last.fm requests and can take time. No instant-artwork promise
or whole-library audit is claimed. Identity, stored preferences, XML undo, legacy
records and permissions are preserved. Final checks and package audit: CURRENT.md.

## Included v0.9.9 nearby preparation

Already-loaded rows warm artwork up to 1,200px below the viewport, with on-screen
priority. Always begins consenting next-page loading at the same distance. Existing
Last.fm tabs need refresh after an extension Reload to release their old contexts.

## Included v0.9.8 signed-in parsing

Fixed a confirmed signed-in blank-cover failure: Last.fm includes empty loading
skeleton tables alongside complete album and track-history data. Both artwork
readers now exclude those marked tables while retaining strict real-row checks.
Verified in the installed Supermium profile: lucre 5 resolves to LUCRE (18/18),
and a genuinely blank rank-53 row appended by scrolling resolves to its album
BM2  KWAKE DUBS 2021 (9/9), with loaded images and correct album links.
The fix applies to all artists using these readers. No permissions, preference
formats or installation identity changed. Cold lookups still require responses.

## Included v0.9.7 library-wide artwork recovery

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

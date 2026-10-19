# Last.fm Personal Library

Private display preferences and continuous library scrolling for your own
Last.fm profile. Installed candidate: **v0.9.7 beta**.

Redirect protection keeps Travis Scott and Lucki navigation on `+noredirect`
routes in the connected profile and their public music pages. Album/track links,
scroll-added rows and artwork reads share the policy. Genuine Lucky Twice links
require original native scrobble evidence before any repair. Toggle in Settings;
see [scope and testing](docs/REDIRECT_PROTECTION.md).

## Public beta candidate

Fresh installations start disconnected and open profile setup. Existing saved
profiles and records are retained. Automatic album-less corrections and native
rule capture are unavailable in this beta, including for previously enabled
records. Manual Last.fm editing and local display preferences remain available.

The local ZIP, original store assets, static download site and submission draft
are prepared by `tools/package-beta.cjs`. See [release/PUBLISHING.md](release/PUBLISHING.md)
for delivery, publication gates and the one Reload test. Nothing has been publicly
uploaded or submitted; signed-in acceptance is still pending.

## Updating this installed copy

Export a JSON backup from **Settings and backup**, then click **Reload** on
this extension in Supermium's `chrome://extensions` and refresh your Last.fm
page. Keep this folder in place and keep the existing extension installed.
Its identity and stored preferences depend on that installation.
Startup dependencies also load before the idle features. Supermium can omit the
later scripts if Reload happens during navigation, so refresh Last.fm after Reload.
Already-started modules are reused, retaining early cached artwork application.

## Features

- **Broken image recovery:** Failed artist portraits and album thumbnails retry
  two alternate CDN sizes of the exact selected image. This covers headers and
  newly scrolled rows, preserves links and starred image identity, and leaves
  working images alone. Requests are bounded and only begin near the viewport.
  No history scan or additional Last.fm page requests are needed. Deleted images
  and images blocked at every size remain unavailable.
- **Personal track covers:** Visible track rows on your connected profile use
  the album from your own all-time scrobbles. Where multiple albums were tagged,
  the most-scrobbled album wins; exact ties use the most recently scrobbled album.
  On a specific album's library page, its verified header cover and album link
  instead apply to every track immediately, including guest artists and blank
  thumbnails. No history lookup or cache read is needed for this album context,
  and it does not replace saved all-time track winners used on other views.
  A winning blank album uses the public artist/track-title album page (for example,
  Silentó / Watch Me (Whip / Nae Nae)). Album-artist tags select compilation covers.
  The signed-in album overview's primary cover supplies your starred artwork.
  Both the thumbnail and cover link update, retaining native thumbnail size.
  Full artist Tracks lists can share exact album counts seeded by fresh verified
  track covers, proving several winners with fewer individual history reads.
  Initial and scroll-added rows use the same proof. Unavailable metadata can
  still leave unresolved covers; a shared album name alone is never enough.
  Generic music-note covers are hidden during lookup and never accepted as a
  resolved cover. Previously cached generic images are re-resolved. Placeholder
  spans become album links once the chosen cover is available; profile changes
  restore the original markup. If the selected album has no available artwork,
  its image slot remains empty. Similar Albums artwork is excluded.
  Resolved covers explicitly become visible even if an earlier page/script left
  their image hidden. Placeholder tracks go directly to their own scrobble history.
  After proving the winner, its matching album-row cover is reused from anywhere
  in the loaded library. The five-album counting limit does not restrict this reuse.
  If the public album cover request fails or supplies no artwork, the exact album's
  own-library header is checked, validating its artist, title and album link.
  On an all-time artist overview, shared album track totals resolve several
  tracks in one request. The album's already-loaded row supplies its cover;
  track-row video stills/compilation images are never used to choose an album.
  Proven tracks update progressively while other requests are still pending.
  This optimization checks at most five albums/two pages each. Unresolved tracks
  use their individual history, including the native scrobble album column.
  A failed aggregate also uses the individual history, unless loading is cancelled
  or Last.fm has asked for a rate-limit pause. Repeated edit IDs are distinguished
  by native scrobble timestamps when counting across pages.
  Lookups run one track at a time, only while visible, using the shared request
  throttle and rate-limit pause. A provable winner stops the track-history lookup
  early. A separate bounded local cache reuses resolved covers across visits.
  Cached images and album links apply during page loading; fresh records avoid
  lookup requests for 24 hours. Older records remain visible while refreshed.
  Older normal-track selections are verified once by the updated reader without
  clearing their images or any saved display preferences.
  Native edit fields take priority over canonical/redirected album links. A page's
  lazy loader cannot replace an already resolved image or its album link.
  An uncached track still needs a signed-in history/album lookup.
  Returning to a resolved page reuses its in-memory result immediately. Visible
  album-less scrobbles have lookup priority over other uncached tracks.
  A scrobble with verified blank album and album-artist fields requests the
  artist/title album cover directly, interrupting unrelated history work. It does
  not count track history. Its cache is separate from ranked-track album winners.
  Scrobble rows wait for their native fields before being classified; when Last.fm
  builds a row in stages, its cached cover applies as the fields arrive instead
  of triggering a fresh lookup under the wrong cache key.
  Incomplete/unverifiable histories retain the original cover with an explanatory
  hover title. Covers update gradually; background tabs stop looking up artwork.
- **iTunes XML import:** Open Settings and backup → Import iTunes XML. Choose
  a library XML export. Files are read incrementally, with no 50 MB file cap.
  A cancellable progress bar shows the file percentage and songs checked while
  the XML is scanned locally. The review shows all distinct artist, album, track
  and album-artist casing preferences, with search/filter and 100-row pages.
  Tick the names you want, choose between conflicting XML casings, and click
  Apply. Existing preferences that differ are initially unchecked. Duplicate
  names are combined; missing/invalid metadata is reported. Compilation albums
  can appear under both the track artist and album artist as separate scopes.
  Use the artist/album/song/album-artist group checkboxes to select across all
  results, including pages outside the active search. The XML's exact casing is
  used without title-case conversion. A fresh XML export after Library Doctor
  cleanup can be imported through this same flow. The source-independent casing
  builder is documented in [docs/LIBRARY_CASING.md](docs/LIBRARY_CASING.md);
  direct Library Doctor connection/sync is not enabled.
- **Revert XML import:** The last applied XML import can be reverted after
  closing/reopening the page or restarting the browser. Revert restores the
  overwritten preferences and removes new ones, preserving later manual edits.
  Applying another import replaces the previous undo record. Export JSON first
  for a lasting backup. Restoring a full JSON backup clears the XML undo action.
  If storage is full, Apply fails without a partial import.
  The original XML and its filename are not stored or uploaded; Last.fm is not
  contacted and its scrobble data is unchanged. These preferences match names
  ignoring case; they do not map different spellings or renamed artists.

- **Personal display names:** case-sensitive preferred names for artists,
  albums and tracks, applied only to your explicitly configured profile.
  Links, library headings and rows update immediately when preferences change.
- **Native editing:** Edit track is first in album-track menus. It checks at
  most three track-history pages, then delegates to Last.fm's native dialog
  on the current page. The lookup is cancellable. It asks before opening a
  scrobble tagged with another album. No iframe is used.
- **Local casing:** exact named original/current fields let casing-only edits
  save locally without submitting a Last.fm edit. Real edits use Last.fm's
  existing handler. Unsupported form layouts report the limitation. Album
  forms need the complete named original/current pairs; the live album layout
  remains unverified.
- **Keep scrolling:** Artists, Albums, Tracks, Scrobbles, artist Scrobbles,
  artist Tracks and artist Albums offer to append Last.fm's native rows. Nothing
  loads until you choose Yes (one page) or Always (automatic for this view).
  No pauses loading and restores native pagination. Always asks again at ten
  total pages, including the initial page, then each further ten-page boundary
  (about 500 rows per batch). A new view always asks first. The panel
  reports loading, paused and error states, then disappears after the last page.
  Copied stale controls are removed when a library container is replaced. Last.fm's pagination
  returns if loading fails or is disabled.
  Scrobbles retain every dated section in page order. A day spanning pages
  continues under its existing heading; the loading panel follows the final
  section. Failed or cancelled insertions roll back the complete added page.
  Overlapping scrobbles are matched by timestamp, artist and track, so a shifted
  page boundary cannot repeat an already displayed play. Unseen rows newer than
  the current history tail stop loading without changing the displayed history.
  Switching scrolling off/on, reconnecting the same profile or returning with
  browser Back retains loaded pages and continues from the next unseen page.
  Finished views remain finished; cancelled requests cannot replace newer work.
- **Request limits:** one request at a time across this extension's Last.fm
  tabs, at least 1.5 seconds between requests and a 15-second timeout. There
  are no automatic page retries. A rate-limit response pauses requests across
  tabs and reloads. After Last.fm's warning clears, click Resume loading in
  the scrolling panel to make one new attempt. No cooldown expiry is assumed.
- **Display name preferences:** Open Settings and backup → Manage artist, album
  and song preferences. The separate page groups Artists, Albums and Songs.
  Artists sort by preferred name; albums and songs sort by artist then preferred
  title. Album-artist rules are included under Artists. Search, type filters,
  inline editing and Undo delete remain available.
- **Settings:** the main page keeps profile/scrolling settings, import links and
  backup/restore controls. Simultaneous changes are coordinated by the background worker;
  conflicting edits are reported instead of replacing a newer preference.
- **Backup:** exports read current saved preferences and retain additional
  legacy storage. Imports replace display preferences/settings only after
  preview, and preserve existing extra storage. Nothing migrates or clears
  storage on startup.
- **Diagnostics:** the popup reports profile/page connection and provides
  Copy diagnostics with version, feature status and counts. It excludes
  scrobble titles, form values and security tokens.

## Album-less rules in this beta

Automatic correction and capture are unavailable in v0.8.0, even if saved records
from an earlier version were enabled. They cannot reserve or submit a correction.
Existing records are preserved without migration. The retained experimental
algorithm is tested separately with an explicit test-only override; those checks
do not mean that beta automation is available or signed-in verified.

Open **Settings and backup → Album-less tracks** to review/search/delete saved
rules or add a track for later use. Export JSON before modifying saved records.
A saved rule does not change any Last.fm play in this version.

Optional read-only discovery checks at most 20 pages per manually started batch,
at least 12 seconds apart. It pauses on unexpected responses or rate limits and
never skips a page or retries itself. Review the distinct candidates before
remembering them. **Review loaded plays** needs no extra page requests. A large
library remains expensive; this is not an unattended full-history crawler.
Requests share the artwork/scrolling lock and persistent rate-limit stop.

Normal scrobble edits still use Last.fm's editor when you explicitly submit it.
No signed-in edits or whole-library scans were performed during beta preparation.

## Verification

Run every suite with `node tests/run.cjs`; use `--list` to see suites, `--unit`
for the browser-free checks, or supply names such as `artwork-scan settings-drafts`.
The runner reports every failed suite, continues the remaining suites and exits
with failure if any check fails or times out. It does not install dependencies
or use your signed-in browser profile.

On this PC, the existing bundled Playwright runtime and installed Supermium can
be used from a fresh PowerShell session:

```powershell
$projectPath = 'C:\Users\jayco\Desktop\lastfm-personal-library\lastfm-personal-library'
if (!(Test-Path -LiteralPath (Join-Path $projectPath 'manifest.json'))) { throw 'Extension folder missing.' }
Set-Location -LiteralPath $projectPath
$env:NODE_PATH = 'C:\Users\jayco\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules'
$env:PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH = 'C:\Program Files\Supermium\chrome.exe'
if (!(Test-Path -LiteralPath $env:PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH)) { throw 'Supermium executable missing.' }
node tests/run.cjs
```

Success ends with all suites passed. If any suite fails, retain its named output;
no reload or account operation is needed for these checks.

The local checks pass in isolated Supermium profiles with website requests
intercepted. They cover rules, adapter fields, concurrent storage writes,
profile changes, redirects, native dialog delegation, casing/real edits,
menu order, title spacing, settings, scrolling and rate limits. An additional
check loads the actual unpacked extension and exercises its service worker,
content-script injection and two settings tabs.
Large-file checks include a constructed 128 MiB XML Blob and a 64 MiB XML file
through the actual extension file picker. They verify progress/cancellation,
complete-file validation and no storage writes during scanning. The user's own
larger export remains to be checked after Reload.

These are reconstructed fixtures using user-confirmed field names and paths,
not captured live Last.fm HTML. The signed-in Supermium profile is unavailable
to the browser connection. Opening Last.fm's actual edit dialog and checking
its album form remain user acceptance items; no live account edits were made.

Tests: `tests/rules.cjs`, `tests/adapter.cjs`, `tests/storage.cjs`,
`tests/smoke.cjs`, `tests/album.cjs`, `tests/library-scroll.cjs`, `tests/scrobble-sections.cjs`,
`tests/options.cjs`, `tests/extension.cjs`, `tests/itunes-parser.cjs`,
`tests/itunes-store.cjs`, `tests/itunes-ui.cjs`, `tests/artwork.cjs`,
`tests/artwork-store.cjs`, `tests/artwork-albums.cjs`, `tests/artwork-extension.cjs`,
`tests/artwork-album-view.cjs`,
`tests/artwork-placeholder.cjs`, `tests/artwork-recovery.cjs`, `tests/startup.cjs`,
`tests/artwork-scan.cjs`, `tests/settings-drafts.cjs`, `tests/runner.cjs`,
`tests/preferences-actions.cjs`, `tests/backup-preview.cjs`, `tests/scroll-history.cjs`,
`tests/scroll-toggle.cjs`, `tests/artwork-authority.cjs`, `tests/native-submit.cjs`,
`tests/albumless-store.cjs`, `tests/albumless-transport.cjs`, `tests/albumless-flow.cjs`,
`tests/albumless-capture.cjs`, `tests/albumless-scan.cjs`, `tests/albumless-ui.cjs`,
`tests/beta-store.cjs`, `tests/beta-onboarding.cjs`, `tests/release.cjs`, `tests/release-site.cjs`.
The startup check reloads the actual extension between
document_start and document_idle and checks for uncaught errors and storage preservation,
then verifies that the required Last.fm refresh activates the features. Reloading
an extension alone does not guarantee that an already open page receives its scripts.
Browser checks require Playwright
and `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` pointing to a Chromium executable.
`tests/extension.cjs` creates a disposable profile under ignored test-results.

## Rollback

The v0.8.3 scrolling/artwork recovery candidate starts from `ff6fc13` (v0.8.2 beta).
Temporary artwork read failures receive one delayed, visibility-scoped retry.
No preferences, record formats, native editing or extension permissions changed.

The v0.8.2 artist Tracks artwork fix starts from `c4ef360` (v0.8.1 beta).
It only extends read-only album lookup; native edit validation and storage
formats are unchanged.

The v0.8.1 album-view artwork fix starts from `b391802` (v0.8.0 beta).
It changes no saved track winners, preferences, XML undo or storage formats.

The v0.8.0 beta starts from `7de6c8d` (v0.7.0). Its source changes do not migrate
user data. Returning to an earlier version can reactivate a previously enabled
automation record: disable corrections in that version before browsing Last.fm.
Export JSON first; do not uninstall the extension or clear storage.

The v0.7.0 finishing work starts from `2180539` (v0.6.15). Source rollback leaves
the separate `lfmAlbumlessV1` records and all earlier storage intact. Disable future
corrections before returning to an older source version; no stored data needs clearing.

The personal-artwork change starts from `74ce8ba796c9d39e8c42a7a18060969935cd33c1`
(v0.6.2). Artwork caches exist only in the current tab and do not alter saved rules.

The scrobble date-section fix starts from `73946315be32a23c6f16c27b98b14cb738f2b3a7`
(v0.6.1). It changes no preference data or storage format.

The preferences-page/large-XML change starts from `1fd1c718ef1ad3d99f9a991d4c00dd72fb17dc59`
(v0.6.0) on `preferences-page`. It changes no stored-data format.

Git baseline `3a1042a0292190e18a9e66f46a46485ae8d23950` contains the exact
previous v0.3.4 files. The cleanup is a separate commit on `polish-reliability`.
The XML importer starts from `c6a83f5e708f385867726edd015d16d604570faf` (v0.5.0)
on `import-itunes-xml`. Imported rules carry an additive `exact: true` flag so
an all-lowercase or unchanged XML name remains an explicit preference. Existing
rules are not migrated. Export a backup before reverting to older source that
does not understand imported exact preferences.
Restoring source files does not restore or delete browser storage. The old
failed scan candidates remain in the ignored `.codex-backups` folder.

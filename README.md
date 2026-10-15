# Last.fm Personal Library

Private display preferences and continuous library scrolling for your own
Last.fm profile. Installed candidate: **v0.7.0**.

## Updating this installed copy

Export a JSON backup from **Settings and backup**, then click **Reload** on
this extension in Supermium's `chrome://extensions` and refresh your Last.fm
page. Keep this folder in place and keep the existing extension installed.
Its identity and stored preferences depend on that installation.
Startup dependencies also load before the idle features. Supermium can omit the
later scripts if Reload happens during navigation, so refresh Last.fm after Reload.
Already-started modules are reused, retaining early cached artwork application.

## Features

- **Personal track covers:** Visible track rows on your connected profile use
  the album from your own all-time scrobbles. Where multiple albums were tagged,
  the most-scrobbled album wins; exact ties use the most recently scrobbled album.
  A winning blank album uses the public artist/track-title album page (for example,
  Silentó / Watch Me (Whip / Nae Nae)). Album-artist tags select compilation covers.
  The signed-in album overview's primary cover supplies your starred artwork.
  Both the thumbnail and cover link update, retaining native thumbnail size.
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
  albums and tracks, applied only to your configured profile (default DCCXX).
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
  artist Tracks and artist Albums append Last.fm's native rows. The panel
  reports loading, paused and error states, then disappears after the last page.
  Copied stale controls are removed when a library container is replaced. Last.fm's pagination
  returns if loading fails or is disabled.
  Scrobbles retain every dated section in page order. A day spanning pages
  continues under its existing heading; the loading panel follows the final
  section. Failed or cancelled insertions roll back the complete added page.
  Switching scrolling off/on, reconnecting the same profile or returning with
  browser Back retains loaded pages and continues from the next unseen page.
  Finished views remain finished; cancelled requests cannot replace newer work.
- **Request limits:** one request at a time across this extension's Last.fm
  tabs, at least 1.5 seconds between requests and a 15-second timeout. There
  are no automatic retries. A rate-limit response pauses requests across
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

## Album-less rules

Open **Settings and backup → Album-less tracks**. Export JSON first, review your
rules, then explicitly enable future corrections. They start disabled. Existing
display preferences, XML undo and old scan records are preserved in their own keys;
the new page does not migrate or activate legacy rules/progress.

- In Last.fm's normal track editor, clear both album fields and tick the new
  **Remember blank album and album artist…** box before Save Edit. The extension
  saves a rule only after reading back that exact play with both fields blank.
  A rejected/unconfirmed edit saves no rule. Alternatively, add an artist/track
  manually in Album-less rules.
- Rules match artist and track ignoring case. Only plays timestamped after the
  rule was saved qualify. Corrections use Last.fm's native named form, remove
  bulk/automatic-edit flags, retain artist/title, and verify the exact play after
  saving. Older scrobbles are never corrected by these rules.
- Keep a visible tab on your connected Last.fm profile. Recent plays are checked
  every five minutes, at most three library pages per check. Catch-up progress
  persists between checks. This browser extension cannot correct plays while
  Supermium is closed or all matching tabs are hidden.
- **Open discovery and recent-play checks** offers read-only discovery, up to
  20 pages per manually started batch, at least 12 seconds apart. It pauses after
  each batch or unexpected response and never skips a page or retries itself.
  Review the distinct candidates and tick tracks before remembering rules.
  **Review loaded plays** needs no extra page requests. A 4,332-page library
  remains expensive; this is not an unattended full-history crawler.
- All requests share the artwork/scrolling network lock and persistent rate-limit
  stop. After a break, **Resume requests after a break** clears the stop without
  starting discovery. Last.fm has not certified any request rate as safe.
- A durable attempt record prevents duplicate saves across tabs/reloads. An
  uncertain write disables corrections and is never replayed automatically.
  Review its exact play before allowing another attempt. Disabling or deleting
  a rule affects future processing; it does not reverse a confirmed Last.fm edit.

No signed-in edits or whole-library scans were performed while building v0.7.0.
The normal dialog and one future-play correction remain live acceptance checks.

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
`tests/artwork-placeholder.cjs`, `tests/artwork-recovery.cjs`, `tests/startup.cjs`,
`tests/artwork-scan.cjs`, `tests/settings-drafts.cjs`, `tests/runner.cjs`,
`tests/preferences-actions.cjs`, `tests/backup-preview.cjs`, `tests/scroll-history.cjs`,
`tests/scroll-toggle.cjs`, `tests/artwork-authority.cjs`, `tests/native-submit.cjs`,
`tests/albumless-store.cjs`, `tests/albumless-transport.cjs`, `tests/albumless-flow.cjs`,
`tests/albumless-capture.cjs`, `tests/albumless-scan.cjs`, `tests/albumless-ui.cjs`.
The startup check reloads the actual extension between
document_start and document_idle and checks for uncaught errors and storage preservation,
then verifies that the required Last.fm refresh activates the features. Reloading
an extension alone does not guarantee that an already open page receives its scripts.
Browser checks require Playwright
and `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` pointing to a Chromium executable.
`tests/extension.cjs` creates a disposable profile under ignored test-results.

## Rollback

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

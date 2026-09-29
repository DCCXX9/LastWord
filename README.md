# Last.fm Personal Library

Private display preferences and continuous library scrolling for your own
Last.fm profile. Installed candidate: **v0.5.0**.

## Updating this installed copy

Export a JSON backup from **Settings and backup**, then click **Reload** on
this extension in Supermium's `chrome://extensions` and refresh your Last.fm
page. Keep this folder in place and keep the existing extension installed.
Its identity and stored preferences depend on that installation.

## Features

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
  reports loading, paused, error and finished states. Last.fm's pagination
  returns if loading fails or is disabled.
- **Request limits:** one request at a time across this extension's Last.fm
  tabs, at least 1.5 seconds between requests and a 15-second timeout. There
  are no automatic retries. A rate-limit response pauses requests across
  tabs and reloads. After Last.fm's warning clears, click Resume loading in
  the scrolling panel to make one new attempt. No cooldown expiry is assumed.
- **Settings:** search, type filters, inline editing, Undo delete and import
  previews. Simultaneous changes are coordinated by the background worker;
  conflicting edits are reported instead of replacing a newer preference.
- **Backup:** exports read current saved preferences and retain additional
  legacy storage. Imports replace display preferences/settings only after
  preview, and preserve existing extra storage. Nothing migrates or clears
  storage on startup.
- **Diagnostics:** the popup reports profile/page connection and provides
  Copy diagnostics with version, feature status and counts. It excludes
  scrobble titles, form values and security tokens.

The full-history album-less scanner and automatic scrobble corrections remain
removed following Last.fm's rate limit. Existing saved legacy keys are retained.

## Verification

The local checks pass in isolated Supermium profiles with website requests
intercepted. They cover rules, adapter fields, concurrent storage writes,
profile changes, redirects, native dialog delegation, casing/real edits,
menu order, title spacing, settings, scrolling and rate limits. An additional
check loads the actual unpacked extension and exercises its service worker,
content-script injection and two settings tabs.

These are reconstructed fixtures using user-confirmed field names and paths,
not captured live Last.fm HTML. The signed-in Supermium profile is unavailable
to the browser connection. Opening Last.fm's actual edit dialog and checking
its album form remain user acceptance items; no live account edits were made.

Tests: `tests/rules.cjs`, `tests/adapter.cjs`, `tests/storage.cjs`,
`tests/smoke.cjs`, `tests/album.cjs`, `tests/library-scroll.cjs`,
`tests/options.cjs`, `tests/extension.cjs`. Browser checks require Playwright
and `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` pointing to a Chromium executable.
`tests/extension.cjs` creates a disposable profile under ignored test-results.

## Rollback

Git baseline `3a1042a0292190e18a9e66f46a46485ae8d23950` contains the exact
previous v0.3.4 files. The cleanup is a separate commit on `polish-reliability`.
Restoring source files does not restore or delete browser storage. The old
failed scan candidates remain in the ignored `.codex-backups` folder.

# LastWord for Last.fm — repository guide

Verified on 6 November 2026. This is the existing **private** LastWord repository; its old repository name is retained to preserve links and history.

## Start here

- [Latest saved source: v0.9.27](https://github.com/DCCXX9/lastfm-personal-library/tree/codex/itunes-library-styling)
- [Current state and verification limits](https://github.com/DCCXX9/lastfm-personal-library/blob/codex/itunes-library-styling/docs/CURRENT.md)
- [Latest saved release and download ZIPs](https://github.com/DCCXX9/lastfm-personal-library/releases/tag/v0.9.27)
- [All previous releases](https://github.com/DCCXX9/lastfm-personal-library/releases)
- [Version history and recoverable snapshots](https://github.com/DCCXX9/lastfm-personal-library/blob/codex/itunes-library-styling/docs/VERSION_HISTORY.md)

**Important:** `main` currently contains older v0.9.17 application code. v0.9.27 is saved on `codex/itunes-library-styling` at `d89199b3a4d0005b1910d823cb8fc132b0cbc893`. Use the current-source link above when inspecting or downloading the latest code. This guide does not merge that development branch into main. An integration PR needs its own review and checks before Jay merges it.

The original Desktop checkout was not available at its previously recorded path during this check. The GitHub source and releases are verified; any newer uncommitted PC changes are **not** verified or backed up by this task.

## What the extension does

LastWord supplies local display casing, iTunes/Apple Music XML casing comparison, infinite scrolling, artwork handling and redirect protection. Personal display preferences remain scoped to the connected profile. Infinite scrolling supports native paginated chart lists across Last.fm.

Casing changes are cosmetic. XML matching requires the same names apart from letter casing; it must not remove featuring credits, punctuation or edition text. Local casing and import operations must not submit Last.fm edits or change scrobbles. Last.fm's separate native editing controls remain available to the user.

## Where the information lives

| Topic | Saved documentation |
| --- | --- |
| Current behavior, actual browser checks and outstanding limitations | [CURRENT.md](https://github.com/DCCXX9/lastfm-personal-library/blob/codex/itunes-library-styling/docs/CURRENT.md) |
| Casing comparison, cache and XML import | [LIBRARY_CASING.md](https://github.com/DCCXX9/lastfm-personal-library/blob/codex/itunes-library-styling/docs/LIBRARY_CASING.md) |
| Redirect behavior and supported scope | [REDIRECT_PROTECTION.md](https://github.com/DCCXX9/lastfm-personal-library/blob/codex/itunes-library-styling/docs/REDIRECT_PROTECTION.md) |
| Architecture decisions and reusable lessons | [DECISIONS.md](https://github.com/DCCXX9/lastfm-personal-library/blob/codex/itunes-library-styling/docs/DECISIONS.md), [MISTAKES.md](https://github.com/DCCXX9/lastfm-personal-library/blob/codex/itunes-library-styling/docs/MISTAKES.md) |
| Automated checks | [tests](https://github.com/DCCXX9/lastfm-personal-library/tree/codex/itunes-library-styling/tests), [test runner](https://github.com/DCCXX9/lastfm-personal-library/blob/codex/itunes-library-styling/tests/run.cjs) |
| Packaging, store materials and release notes | [PUBLISHING.md](https://github.com/DCCXX9/lastfm-personal-library/blob/codex/itunes-library-styling/release/PUBLISHING.md), [NOTES.md](https://github.com/DCCXX9/lastfm-personal-library/blob/codex/itunes-library-styling/release/NOTES.md), [release files](https://github.com/DCCXX9/lastfm-personal-library/tree/codex/itunes-library-styling/release) |
| Existing logo | [icons](https://github.com/DCCXX9/lastfm-personal-library/tree/codex/itunes-library-styling/icons) |
| Help and privacy policy source | [help.html](https://github.com/DCCXX9/lastfm-personal-library/blob/codex/itunes-library-styling/help.html), [privacy.html](https://github.com/DCCXX9/lastfm-personal-library/blob/codex/itunes-library-styling/privacy.html) |

Historical handovers and maintenance documents are records, not permission to resume old jobs.

## Continuing development

1. Read the current-state document on the latest source branch. Inspect branch, version, local changes and ownership before editing.
2. Create an issue and a separate branch for each task. Preserve unrelated changes. The existing main/development gap must be resolved explicitly; do not silently develop new features from the stale main code.
3. Reproduce bugs, make the smallest complete change, and run focused checks. On the v0.9.27 source, `node tests/run.cjs --list` lists suites and `node tests/run.cjs --unit` runs checks that do not need a browser. Browser suites require Playwright and an existing compatible Chromium browser; the runner checks these dependencies.
4. Verify user-visible behavior in the actual installed extension when relevant. Isolated browser tests do not prove signed-in Last.fm behavior.
5. Open a small draft PR with evidence, limitations and rollback instructions. Jay merges after review. Future release tags should be cut from the reviewed main branch; historical tags remain unchanged.

## Packaging and rollback

The saved source includes `tools/package-beta.cjs` and `tools/package-store.cjs`. On the current source, `node tools/package-store.cjs` prepares the store handoff; check the publishing document for dependencies and exact output names. Preparation is not Chrome Web Store submission.

v0.9.27 downloads are already attached to its private GitHub release, with checksum files. The recorded previous-version rollback is [v0.9.26](https://github.com/DCCXX9/lastfm-personal-library/releases/tag/v0.9.26). Keep historical tags and releases intact. Do not reinstall, change the extension identity or clear storage as a rollback shortcut.

## Saved data and privacy

GitHub stores code, documentation and release packages. It is **not** a backup of browser preferences or the downloaded Last.fm library cache.

- Keep the existing installed extension and its identity. Preserve preferences, XML undo, library cache, artwork records, scan records and network pauses.
- Export preferences through Settings & backup. Export the library cache separately through the cache controls. Keep those personal backups privately outside Git.
- Do not commit XML libraries, personal JSON exports, browser profiles, cookies, tokens, storage snapshots or private test logs. The saved source ignores test-results, dist, node_modules and local backup folders; review every proposed commit as well.
- This repository task does not access or modify the installed browser, preferences, cache, Last.fm data or Chrome listing.

## Known verification limits

v0.9.27's recorded tests passed across the full run and an isolated capacity rerun; it was not one clean full-suite run. Installed-browser evidence and cold artwork limits are in CURRENT.md. bleh initialization was intermittent, including with LastWord disabled; Jay cancelled further bleh work. No bleh patch was adopted, and seamless compatibility is not claimed.

This guide is an index to saved evidence, not a fresh functional acceptance test.

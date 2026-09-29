# Last.fm Personal Library

A private Chrome extension for display preferences on your own Last.fm profile.
Local casing preferences do not change Last.fm data; real scrobble edits use
Last.fm's normal forms. Friends' profiles and global music pages keep their
usual names.

## Install

1. Extract the ZIP to a permanent folder on your computer.
2. Open chrome://extensions, switch on **Developer mode**, and choose
   **Load unpacked**. Select the extracted lastfm-personal-library folder
   containing manifest.json.
3. Disable the old **Last.fm Infinite Artists** Tampermonkey script so it
   does not run alongside the extension.
4. Refresh your Last.fm page. The extension starts with DCCXX as its profile
   username. Use the extension icon → **Settings and backup** if your username
   differs.

## Use

- **Case-only track or album edit:** Enter your preferred capitalization in
  Last.fm's normal Edit Scrobble or Edit Album window, then click its normal
  **Save Edit** button. If Last.fm rejects only the casing change, the extension
  saves your display preference locally and shows a confirmation with a link
  to manage preferences.
- **Edit track from an album:** On an album in your own library, open a track's
  three-dot menu and choose **Edit track**. The extension uses the track's
  library link to find a scrobble tagged with that album and opens Last.fm's
  normal Edit Scrobble window on the current page. If Last.fm stored that
  scrobble under a different album name, the extension shows the actual tag
  and asks before opening its edit window.
- **Artist display name:** On your own Artists library, open an artist's
  three-dot menu and choose **Edit artist display name**. This is local to
  your profile because Last.fm has no equivalent artist-wide edit window.
- **Manage and back up:** The extension icon opens settings. You can search,
  edit and delete preferences, and export/import a JSON backup. The rules live in Chrome's
  extension-local storage; uninstalling the extension removes them unless
  you exported a backup.
- **Keep scrolling:** Scrolling near the end of Artists, Albums, Scrobbles,
  artist Tracks or artist Albums fetches the next page and appends its original
  Last.fm table rows. If it fails, the ordinary pagination remains available.
  Turn this off in settings if needed.

## Scope and performance

Names are matched without regard to capitalization, but the preferred display
is shown exactly as entered. Album and track rules are scoped to an artist.
The extension loads the rules once and looks up only the linked names present
on the current page, so thousands of saved rules do not mean thousands of
page edits on every visit.

The display layer changes visible linked names and library headings, not
Last.fm's data, URLs, statistics, sorting, search results, or other people's
views. A few unlinked labels or new Last.fm page layouts may need additional
selectors.

## Development checks

From this folder:

    node tests/rules.cjs
    node tests/smoke.cjs
    node tests/album.cjs
    node tests/library-scroll.cjs
    node tests/options.cjs

The browser checks require Playwright and a local Chromium installation.
They use synthetic Last.fm pages; they do not log into a real account.

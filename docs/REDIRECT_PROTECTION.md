# Artist redirect protection

Candidate: v0.9.3 beta. Baseline: `2e7420f`, installed `preferences-page` checkout.

## Contract

- Default on after a profile is configured; no startup migration or data writes.
- Exact artist identities `Travis Scott` and `Lucki` (case insensitive), never
  substring matching or display-preference aliases.
- Artist, album and track navigation in the connected profile and on these
  artists' public music pages gains `+noredirect` before the artist segment.
  Encoding, filters and fragments remain intact; image galleries and editing
  routes are excluded. Other profiles and genuine Lucky Twice stay native.
- The observed mappings are Travis Scott → Travi$ Scott and Lucki → Lucky Twice.
  An already canonicalized row link is repaired only with a unique validated
  native edit-scrobble form proving the original artist and matching track or
  album. Forms, their values and actions are never rewritten.
- Links added by the real scroller or Last.fm hydration receive the same policy.
  Normal, middle and context-menu clicks retain native browser behavior.
- The shared page queue protects read requests, including artwork album pages;
  a protected request returning another artist is rejected before insertion.
  Native POST actions and fields are unchanged. Request pacing, consent and
  rate-limit pauses remain enforced.
- Pagination accepts the direct and bypass spellings of the same protected path;
  artist, profile, page progression and query-filter checks remain strict.
- Settings changes restore exact original href attributes unless the site has
  since replaced them. `redirectProtection` is an optional Boolean in existing
  settings/backup v1; old backups remain accepted and default on. Stored rules,
  XML undo and legacy records are untouched.

Implementation: `redirects.js` loads once at document_start (also present in the
idle dependency list for extension Reload safety). It observes links rather than
intercepting HTTP traffic. No new browser permissions or remote code.

## Limits

This is navigation protection, not a repair to Last.fm's correction database.
Typed/external URLs may redirect on the server before the extension runs. An
already ambiguous canonical artist page without original scrobble evidence is
not remapped. Global statistics, wikis, other clients and historical tag merging
remain under Last.fm's control. Help links to the user's website correction
setting; changing it is the user's action, never an automatic account write.

Sources: [Last.fm's official explanation](https://support.last.fm/t/incorrect-artist-and-track-spellings-on-last-fm/193),
[Travis Scott report](https://support.last.fm/t/scrobbles-for-songs-are-gone-travis-scott-redirection/5167),
[Lucki report](https://support.last.fm/t/problem-with-artist-lucki-on-last-fm/118905).

## Acceptance evidence

`redirects` covers exact matches, encoded routes, aliases with/without evidence,
negative routes and pagination filter isolation. `redirect-browser` runs the
actual unpacked extension in an isolated Supermium profile, exercising real
scroll append through page 3, live settings changes/restoration, public navigation,
friend isolation, unchanged forms and retained records. `redirect-requests`
covers artwork reads, ignored-bypass rejection, native dialog delegation, native
POST preservation on a mocked endpoint and disabled protection. No signed-in
Last.fm session or real edit submission is used by these tests.

Jay's signed-in reload check remains necessary: navigate to Travis Scott and
Lucki from the library, open an album/track, and load one more page. The actual
catalogue response has not been certified by isolated fixtures.

Rollback: restore the candidate's files from baseline `2e7420f`, or switch off
Protect artist redirects in Settings. Keep the installed folder and its storage.

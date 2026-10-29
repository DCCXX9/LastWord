# Music redirect protection

Candidate: v0.9.24 beta. Baseline: `dd447bf`, `codex/itunes-library-styling`.

## Contract

- Default on after a profile is configured; no startup migration or data writes.
- Every supported artist, song and album link in the connected profile and on
  public music pages gains Last.fm's `+noredirect` segment. There is no artist
  allowlist. Existing identity, encoded tails, query filters and fragments stay
  intact. Other users' libraries, image galleries and native edit actions stay
  native. Genuine Lucky Twice remains Lucky Twice, with redirect protection.
- An already changed artist can be restored only in a named chart row cell with
  one validated native scrobble form. Song/album names must match the original
  fields ignoring case; album cells use the original album artist. Related/image
  links do not inherit row identity. No spelling, suffix or alias guesses, and
  display preferences are never identity evidence. Forms remain untouched.
- Scroll-added and hydrated links receive the same policy. Normal, middle and
  context-menu clicks retain native browser behavior.
- The shared GET queue protects library and artwork reads; a protected request
  returning another artist, song or album is rejected before use. Write requests
  remain hard-blocked. Existing pacing, consent and rate pauses remain enforced.
- Pagination accepts direct/bypass forms of the same path, with existing strict
  profile, identity, page progression and filter checks.
- Disabling protection restores exact original hrefs unless the site replaced
  them. Settings/backup format and all saved user records are unchanged.

Implementation: `redirects.js` observes links in the existing content script.
No new permissions, remote code, account settings or network interception.

## Limits

This protects navigation; it cannot repair Last.fm's correction database.
Typed/external URLs may redirect before the extension runs. Already changed
song/album names, and ambiguous artists without original scrobble evidence,
cannot be reconstructed safely. Global statistics, wiki/catalogue merges and
other clients remain controlled by Last.fm. Help links to the website's spelling
correction setting; the extension never changes that setting.

Source: [Last.fm's explanation](https://support.last.fm/t/incorrect-artist-and-track-spellings-on-last-fm/193).

## Acceptance

`redirects` tests arbitrary artists, Unicode, nested music routes, idempotence,
verified original identities, negative paths and pagination filter isolation.
`redirect-browser` uses the actual unpacked extension in isolated Supermium for
scroll append, arbitrary artist repair, genuine identities, album artist versus
track artist, unrelated links, public navigation, opt-out restoration, friend
isolation and unchanged native forms/storage. `redirect-requests` rejects wrong
artist/song/album responses and verifies native editing and GET-only transport.

Real installed signed-in Supermium v0.9.24: DCCXX, 4,780 preferences. Checked 350
protected library music links and persistence after refresh. Actual Yeat artist,
Alivë album and Always Alivë song pages retained their protected URL identity and
protected downstream links. No write requests occurred during those navigations.
All installed extension storage matched the pre-reload snapshot exactly.
Generic canonicalized-artist repair and foreign-profile isolation were exercised
in fixtures; an arbitrary real misdirected scrobble was not manufactured.
Private evidence: ignored `test-results/v24-live-navigation.json` and screenshots.

Rollback: v0.9.23 checkpoint `dd447bf`, or disable redirect protection in Settings.
Keep the installed extension directory and storage. Local candidate, unpublished.

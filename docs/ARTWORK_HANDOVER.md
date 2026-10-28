# Artwork loading handover — 20 October 2026

## Follow-up in v0.9.14

This handover was resumed. CURRENT.md now records real cold ranked baselines,
the request-selection correction and the installed paused v0.9.14 check. The
original acceptance criteria remain open. Last.fm's shared rate pause prevented
candidate cold/200–300-row verification and was retained. The source checkpoint
below remains the arrival baseline; do not treat this older status as the final
candidate verification. No background work or rate-pause reset is scheduled.

## Status: user acceptance failed; implementation stopped for a fresh chat

Jay reports that the installed v0.9.13 still takes **20–30 seconds** to replace
blank covers with the correct album image. The required result is for correct
covers to appear with the track text, including rows added by Keep Scrolling.
Do not describe v0.9.13 as having fixed that requirement. No runtime change was
made in this handover turn.

Latest screenshot:
`C:/Users/jayco/AppData/Local/Temp/codex-clipboard-b5a48927-85f0-4290-8cef-44a46afd1c3f.png`.
It shows a ranked Tracks table, apparently Lucki. Blank examples include
BIGGAVEL (23 scrobbles), BBY GOAT (22), NEEDED (22), STILL MISS YA (22),
BUSY DAY (21), SPARKS VISION (21), LOVE IS WAR (20), and OUTRO (19).
The exact URL was not supplied with this screenshot: establish it in the real
browser rather than assuming a route or artist capitalization.

## Checkout, ownership and checkpoint

- Installed checkout: `C:\Users\jayco\Desktop\lastfm-personal-library\lastfm-personal-library`.
- Branch: `preferences-page`.
- HEAD: `6af06f73ab396b3a468a8df5f26af5f0668de054` —
  `Keep scrobble covers visible and speed pagination in v0.9.13`.
- Working tree was clean before these handover documentation edits.
  Expected handover diff: this file, `docs/CURRENT.md`, `docs/MAINTENANCE.md` only.
- Previous runtime checkpoint: `c8349d8`, v0.9.12, which corrected the reproduced
  artwork/redirect observer freeze. It is not a checkpoint where this timing
  requirement was satisfied. Do not automatically roll back.
- This chat is stopping implementation and this handover assigns no workers.
  Recheck current ownership/diff on arrival before making changes.
- Last verified installed extension ID: `fpfeckjdjmlnnjbodagebgcdflmbkmik`.
  Last verified runtime: v0.9.13. Verify the actual loaded version again.
- Local beta: `dist/lastfm-personal-library-0.9.13-beta.zip`, 39 runtime files,
  281168 bytes, SHA-256
  `21d6cf39ead0dfcea9d9d8fe819808d12137e43f041b87d6715e217a866c557c`.
  Independent audit: `test-results/v0913-package-verification.json`.
  Nothing was pushed or published.

## Required behaviour

1. On personal ranked Tracks pages, use the album this user has scrobbled the
   track on most, with the corresponding album image **and album link**. Preserve
   the existing winner/tie rules. A global compilation or canonical single is
   not evidence of the user's album choice.
2. On an explicit personal album page, that selected album's header cover is
   appropriate for its track rows even if another album wins elsewhere.
3. Apply across artists and the whole library, initial and scroll-added rows.
   Verify the cold path separately from cached reloads. Jay wants the correct
   image with text, without a wrong compilation flashing first or a 20–30 second
   empty slot. If exact first-paint correctness requires information absent from
   the response/cache, establish that limit and a concrete design before making
   another timing promise. Holding the entire page for 30 seconds is not success.
4. Keep navigation responsive at 200–300 rows. Genuine missing artwork for an
   obscure/unreleased/incorrectly tagged release is a legitimate exception;
   queued, failed or unverified discovery is not proof that no artwork exists.
5. Public artist Tracks also need placeholder recovery where Last.fm has usable
   artwork, but public catalogue fallback must not overwrite personal evidence.

## What v0.9.13 actually proved — and what it did not

The last live investigation was on **Scrobbles history** at
`https://www.last.fm/user/DCCXX/library`, not the latest ranked Tracks table.
Unicorn Quest™, Paradise Island and Vida by The Avalanches had downloaded native
No Bad Memories images and valid scrobble album fields. The extension hid those
images while serial winner lookups waited. The native response contained them.

v0.9.13 permits a temporary native scrobble cover only when its link and label
match that exact row's scrobble tags. A proved most-used winner overrides it;
previews are not saved as winner facts. Detached scroll preparation no longer
waits four seconds, and navigation reads precede queued artwork reads.

Actual history checks reached 199 rows. Page two appended in 1424ms and page four
in 2522ms (requests approximately 893ms and 876ms). An earlier, different page
three batch took 6544ms, including a four-second preparation window. These are
not matched benchmarks or a whole-library speed guarantee. The first ten sampled
page-four covers were downloaded/visible when insertion was observed with
300ms polling; this does not prove the exact frame of text/image appearance.
An uncached appended Che — White Folk row retained its tagged Fully Loaded cover,
then the real resolver proved Fully Loaded at 1/1 and saved sourceVersion 3.

The three original rows had acquired winner cache entries during the earlier
trace. Showing them again was not a cold-cache ranked Tracks acceptance test.
The native scrobble preview requires per-row scrobble fields; inspect whether
those exist on the latest failing ranked page. Do not assume this history-only
verification exercised that page's path.

The background browser checks used temporary CDP focus emulation, restored
afterwards. Timer probes continued (maximum gaps 103.4ms initially, 399.3ms at
199 rows), but this does not certify Jay's foreground session or 300-row case.
One HTTP-200 page-three response failed the layout guard. Its body was not
retained; a single retry was valid and appended 49 rows. The retry breakpoint
is not evidence of the first response's cause. No table-selection patch was made.

## Current code path and unresolved questions

- `artwork.js`: `scan`, `scrobbleCover`, `prepareRows`, `pump`, `finish`, `apply`.
  Cached winners, selected-album covers and validated scrobble previews can be
  applied immediately. Unknown/unrelated images are withheld. `pump` has one
  running resolver, prioritizes visible jobs, and warms a nearby area through
  IntersectionObserver (bottom margin 1200px). Retryable failures can wait ten
  seconds. Hidden documents abort work. Inspect actual row/job state first.
- `artwork-source.js`: `resolve` first tries shared album evidence through
  `LastfmArtworkAlbums.resolve`, then individual personal track history. It counts
  exact scrobble albums and stops when remaining plays cannot change the winner,
  then resolves that album's cover. Missing public covers may use an exact personal
  album header. Cold history plus cover requests can require several network reads.
- `artwork-albums.js`: shared artist/album counts, saved seeds and exact proof;
  candidate counting is bounded to five albums. Inspect whether shared proof is
  available or being missed for the actual failing track. Do not guess one album
  for all tracks by an artist, particularly loose SoundCloud releases.
- `pages.js`: shared paced read queue, minimum interval 1500ms, cross-tab
  `navigator.locks`, persisted request/pause state, 15-second request timeout.
  Navigation priority skips queued artwork but does not preempt an active request
  or another tab's held lock. Preserve server rate pauses.
- `adapter.js`: `artworkFields` reads display evidence from native edit forms;
  partial album-artist handling is detached/read-only. Native write validation
  remains strict. `content.js` passes navigation priority to page loading.
- `redirects.js` and artwork URL comparison: preserve v0.9.12's URL identity fix.
  Artwork removing `+noredirect` while redirect protection adds it caused a
  MutationObserver feedback loop and froze Last.fm in v0.9.11.

Serial cold discovery, unavailable shared evidence, retries, cache freshness,
image decoding, stale contexts and inactive-document scheduling are investigation
branches. **None is a traced cause of the latest Lucki row yet.** Do not label
the delay solely a Last.fm problem or solely a CSS problem without a timeline.

## First action in the new chat

1. Read this file and CURRENT, verify checkout/branch/diff/owner, and establish
   access to the installed signed-in Supermium target before editing.
2. Choose one currently failing row such as BIGGAVEL or BBY GOAT. Record exact
   route, runtime version, track/artist identity, native metadata, cache record
   and provenance, queued/running/retry state and request timings. Do not clear
   storage to manufacture a cold run; find a naturally uncached row or use an
   isolated test profile for synthetic cold-path checks.
3. Trace album selection through response parsing/count proof, cover lookup,
   finish/apply, DOM src/srcset/link/style and image download/decode/paint. Measure
   text insertion/appearance to correct-image paint, separating queue wait,
   server latency, resolver work and rendering. Preserve wrong-compilation guards.
4. Repeat the same trace on a genuinely new scroll-added ranked row, including
   the third/fourth additional page and the 200–300-row case where Jay saw chugging.
   Use bounded reads, not a full-history scan. Record cache state in each sample.
5. Once the failing step is understood, add a failing regression at that boundary,
   make the smallest justified fix and verify the real path again. Synthetic
   passes, fast append timing and a cached screenshot are not live acceptance.
6. Deliver one verified candidate to Reload/test. If first-paint correctness cannot
   be demonstrated, report the specific remaining limitation rather than shipping
   another assumption-based fix. No unrelated features or cleanup.

## Live inspection access

- Supermium: `C:\Program Files\Supermium\chrome.exe`.
- Existing profile: `C:\Users\jayco\AppData\Local\Supermium\User Data\Default`.
- Previous localhost-only CDP endpoint: `http://127.0.0.1:9317`; availability must
  be rechecked. The user authorised closing/reopening this same profile with this
  connection. Do not kill an open browser, expose debugging remotely, copy the
  profile, or extract credentials. Request any new interruption if necessary.
- Existing ignored helper `test-results/cdp-direct.cjs` exports `targets()` and
  `connect(webSocketDebuggerUrl)`; connections expose `send`, `on`, `close`.
  Select only the owned Last.fm test target and its extension execution context.
- The standard DevTools MCP's separate profile did not establish access to this
  installed signed-in extension. Full Playwright CDP attachment previously hung
  on an unrelated stuck target; direct target WebSocket inspection worked.
- A second launch cannot add debugging to an already-running browser. Sandbox
  process inventory previously missed the interactive browser: do not infer it
  is closed from that alone. Hidden/background pages can throttle timers and
  intentionally pause artwork; distinguish that from a freeze.
- No Console homework for Jay. Keep trace data local/ignored; do not package raw
  signed-in HTML, diagnostics, profile data or user-library exports.

## Evidence and focused checks

Existing local, ignored evidence under `test-results/`:

- Before: `library-trace-before.json`, `library-observe-before.json`,
  `library-page-before.json`.
- v0.9.13 history: `library-verified-live.json`, `library-v0913.png`,
  `library-page-after1.json`, `library-page-after3.json`,
  `library-scroll-live.json`, `library-scroll-v0913.png`.
- Layout-guard limit: `library-page-after2.json`, `library-page3-source.json`,
  `library-page3-failure.json` (valid retry, not first failure body).
- Regressions: `library-red.log`, `library-focused.log`, `v0913-final.log`
  (59/59), `v0913-resumed-checks.log` (four focused suites after restart).
- Relevant tests: `tests/artwork-history-display.cjs`, `tests/artwork-batch.cjs`,
  `tests/page-priority.cjs`, existing authority/library/scroll/redirect regressions.

Known local test setup; no installs needed:

```powershell
$repo = 'C:\Users\jayco\Desktop\lastfm-personal-library\lastfm-personal-library'
if (-not (Test-Path -LiteralPath "$repo\tests\run.cjs")) { throw 'Wrong checkout' }
Set-Location -LiteralPath $repo
$env:NODE_PATH = 'C:/Users/jayco/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'
$env:PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH = 'C:/Program Files/Supermium/chrome.exe'
node tests/run.cjs artwork-history-display artwork-batch page-priority
```

Run a focused new regression for the reproduced ranked-row cause, then the
appropriate combined gate once stable. Do not rerun these passing history tests
as a substitute for tracing the new defect.

## Preservation and stopping rules

Preserve extension identity, chrome.storage.local preferences, XML undo and
legacy scan records. No clearing/migrating user data; risky storage changes need
a JSON export first. No scrobble edits, full-history scans, new permissions,
installs, destructive cleanup, publishing, pushes, PRs, external messages,
other-chat changes or subagents. Preserve unrelated dirty work. Retain scrolling
consent (Yes/No/Always), ten-page checkpoints, ordering/duplicate guards,
completion-panel removal and network pauses.

The old maintenance/reset heartbeat is paused and must stay paused. Earlier
allowance overrides were bounded candidate authorisations, not permission for
unlimited maintenance. The new chat should use the current task's budget rules.

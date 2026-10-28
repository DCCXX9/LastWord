# Blank ranked-row covers: root cause and fix (v0.9.15)

Written 20 October 2026. Read this before touching artwork, `pages.js` pausing,
or the scroll prompt. It supersedes the "why it keeps failing" parts of
`ARTWORK_FAILURE_REPORT.md`; that report's evidence remains valid.

## v0.9.15 decision: zero-request artwork by default

After testing the fix below, the user chose the simplest model: artwork fetches
**no Last.fm pages at all**. Each row shows Last.fm's own image and link (as
Last.fm does), replaced only by a cover the extension already knows:

- a saved personal winner from the cache (any age, since it cannot be refreshed);
- the exact album of a scrobble row, from that row's own edit fields;
- the selected album on an album page.

Unknown tracks keep Last.fm's image. Nothing is hidden beyond the few ms it
takes to read the saved covers. The lookup engine described below is kept,
off by default; setting the local storage key `lfmArtworkLookups` to `true`
re-enables it (the test harness does this for the lookup suites).
`tests/artwork-zero-request.cjs` covers the default.

## The bug in one sentence

The extension's own artwork lookups trip Last.fm's rate warning, and the
warning then switched artwork off **permanently** while hiding every unproved
image — so the user saw empty squares until something unrelated happened to
clear the pause.

## The five defects (all in code, all reproduced by `tests/artwork-rate-recovery.cjs`)

| # | Where | Defect | Effect the user saw |
|---|-------|--------|---------------------|
| 1 | `pages.js` | `lfmNetworkPause` was a Boolean latch with **no expiry**. Reload and time did nothing; the popup told the user to "leave the site for a while", which also did nothing. | Every uncached row on every artist stayed blank indefinitely after one warning. |
| 2 | `artwork.js` `pump()` catch | A lookup interrupted by the pause was marked `unavailable` (not retryable). `pump()` only ever restarts `waiting` jobs. `artwork-albums.js` `read()` also cached the failed album read, so later reads failed instantly. | Even after the pause was cleared, the rows in flight at the time stayed blank until a page reload. |
| 3 | `artwork.js` `hold()` | Unproved images were hidden with **no end condition**. Waiting, paused and failed looked identical (an empty square). Nothing woke the queue when the pause ended. | Downloaded native images hidden forever (`complete:true`, `visibility:hidden`, `href` removed) — the exact live state inspected at 05:01 UTC. |
| 4 | `content.js` | Answering **Yes / Always** to "Load next page?" called `loadMore(state, true)`, which silently ran `LastfmPages.resume()`. | Covers would sometimes "come back" after scrolling, burst a batch of requests, and trip the warning again. This intermittency is why each previous patch looked like it worked, then didn't. |
| 5 | `artwork.js` `scan()` | Cached winners older than 24 h were treated as unknown and hidden again; the cache held only 1,000 tracks (≈4 artists' ranked lists). | Every revisit after a day, or after browsing a few artists, was cold again — more requests, more blanks, more warnings. |

The underlying driver of (1)–(5) is that pacing was only a 1.5 s gap between
requests, i.e. ~25 requests/minute sustained for as long as the user browsed.

## The fix

**Request layer (`pages.js`)**
- A warning starts a **cooldown**: 2 min, doubling on repeat warnings within 6 h, max 30 min. It ends automatically. Legacy pauses with no `until` expire 2 min after `at` (this clears the user's stuck 04:45 UTC pause on load).
- `LastfmPages.onChange()` notifies consumers when a pause starts or ends (a timer fires at `until`), so queued work resumes without a reload.
- Background reads share a rolling **budget** (120 per 10 min; 60 for 6 h after a warning). It waits *outside* the cross-tab lock and wakes for navigation, so page navigation is never stuck behind it and is exempt from the budget (never from a pause).
- Pause errors carry `error.rateLimited = true` and the time requests resume.
- Explicit `resume()` ends the cooldown early but keeps the strike count.

**Artwork (`artwork.js`, `artwork-albums.js`)**
- A pause-interrupted job goes back to `waiting`; transient album-read failures are evicted.
- Unproved ranked rows are hidden for at most **1.5 s**. After that, or immediately while paused / after a real failure, Last.fm's own image and its own album link are shown at 60 % opacity with `data-lfm-artwork="unverified"` and an explanatory tooltip. The proved winner replaces it at full opacity when available.
- Never released: generic placeholder icons, and any row whose own scrobble fields contradict the native album (history rows) — those remain held exactly as before.
- Verified winners up to 30 days old display immediately and refresh at the lowest priority; cold rows are always processed first.
- `status()` now reports `held` and `unverified` counts.

**UI**
- Yes / Always no longer resume a pause; only **Resume loading / Try again** do.
- Popup shows the automatic resume time.
- Cache bound raised to 3,000 tracks / 1.5 M characters.

## The product trade-off this makes (deliberate)

The original acceptance asked for both "never flash a wrong compilation" and
"never leave long empty slots". For an uncached ranked row both cannot be met:
the winner is not in the page, and proving it needs paced network reads.
This fix chooses **no long empty slots**. A cold row may now show Last.fm's
image (visibly dimmed, honestly labelled) for a few seconds before the proved
winner replaces it. To restore the strict policy, set `GRACE = Infinity` in
`artwork.js` — but pauses will then blank rows again, by design.

## How to verify on the real installed extension

1. Load the candidate and **refresh** Last.fm (required after Reload, see MISTAKES.md).
2. Open DCCXX's Lil Ugly Mane `+tracks`. The stored pause is older than 2 min, so lookups start; within ~1.5 s every row with a native cover shows an image.
3. Popup → Copy diagnostics: `artwork.jobs.waiting` falls, `complete` rises, `unverified` falls to 0 as winners land.
4. If Last.fm warns again: rows stay visible (dimmed), the popup shows the resume time, and lookups restart on their own at that time.

## Regression test

`tests/artwork-rate-recovery.cjs` — five scenarios. Scenarios 1 and 2 fail on the
original v0.9.14 modules with the exact live symptom (`visible:"hidden", href:null`);
run `LFM_RATE_BASELINE=1 LFM_RATE_BASELINE_REF=<old commit> node tests/artwork-rate-recovery.cjs` to see it.
`tests/albumless-transport.cjs` was updated: the pause is now time-bounded, so its
second-request check runs on a real clock instead of a 20 s-per-call fake clock.

## Not changed / still open

- The cold proof is still several paced requests per track; covers are not instantly *correct* for uncached tracks — they are instantly *present*.
- Last.fm's real threshold is unknown. The budget constants are a reasoned guess; tune `BUDGET` in `pages.js` if warnings recur.

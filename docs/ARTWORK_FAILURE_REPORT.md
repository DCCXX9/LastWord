# Recurring Last.fm artwork failures: diagnosis and handover

Written 20 October 2026. This report is for a reader with no prior project context.
It records an unresolved defect, including a new read-only inspection of the
currently failing installed extension. It does not certify a fix.

## 1. Main finding

The extension is responsible for the blank artwork in the latest inspected page:
it deliberately hides unverified images, then cannot perform the requests needed
to release them because its shared, persisted Last.fm rate pause is active.

At **05:01:28 UTC / 16:01:28 Sydney time**, the installed v0.9.14 extension on
DCCXX's Lil Ugly Mane ranked Tracks page reported **50 waiting jobs, zero loading,
zero complete and zero unavailable**. All first 12 inspected native images had
downloaded successfully (`complete: true`, `naturalWidth: 64`), but their computed
visibility was `hidden` and their album links had no `href`.

This is strong evidence of intentional suppression of available image pixels,
rather than failed image downloads. It does **not** establish that those native
images belong to the user's most-scrobbled albums. That unresolved identity check
is precisely why the extension hides them.

The earlier 20–30-second problem has a related but different immediate cause:
when requests are allowed, exact personal album discovery can require several
serial, paced requests, while other rows wait behind the current resolver. Real
cold ranked rows took approximately 8–26 seconds in recent baseline traces.
With the rate pause active, that delay becomes an indefinite wait until normal
explicit resume. Reloading does not remove the stored pause.

The recurring engineering failure has been to fix particular mechanisms and
validate narrower cases without completing the original cold ranked acceptance
test. Improvements to history previews, cached reloads, synthetic fixtures and
scroll insertion were repeatedly insufficient to establish the requested result.

## 2. What this project does

Last.fm records music listening events, called scrobbles. A track can have been
scrobbled under several albums: an original album, a deluxe version, a compilation,
a single, or a differently tagged release. Last.fm's ordinary track image or
catalogue association need not reflect this particular user's listening history.

Remaster for Last.fm is a local Manifest V3 browser extension. It modifies
Last.fm's displayed pages, provides personal display-name/casing preferences and
continuous scrolling, and supports separate native editing and XML-related tools.
The artwork feature reads personal library pages to choose a track's album. It
does not need to edit scrobbles to display a cover.

The required artwork is **the album this user scrobbled the track on most**.
Both the image and its clickable album destination must identify that album.
The user wants the correct cover alongside the track text on initial and appended
ranked rows, across artists, without a wrong compilation flashing first and
without long empty slots. Navigation must remain responsive around 200–300 real
tracks. An explicit album page has its own selected-album context; it is not the
same problem as choosing a winner on a ranked Tracks page.

A genuinely nonexistent cover is an acceptable exception. A queued, paused,
failed or unverified lookup is not evidence that the album has no artwork.

## 3. Exact environment and source state

| Item | State at this report |
| --- | --- |
| Repository | `C:\Users\jayco\Desktop\lastfm-personal-library\lastfm-personal-library` |
| Branch | `preferences-page` |
| HEAD | `6af06f73ab396b3a468a8df5f26af5f0668de054` — v0.9.13 checkpoint |
| Current source/runtime | Uncommitted v0.9.14 candidate; actual installed runtime confirmed again |
| Browser | Installed, signed-in Supermium, not an isolated fixture browser |
| Browser executable | `C:\Program Files\Supermium\chrome.exe` |
| Profile | `C:\Users\jayco\AppData\Local\Supermium\User Data\Default` |
| Extension ID | `fpfeckjdjmlnnjbodagebgcdflmbkmik` |
| Current failing URL | `https://www.last.fm/user/DCCXX/library/music/Lil+Ugly+Mane/+tracks` |
| Inspection endpoint | Existing local CDP endpoint `http://127.0.0.1:9317` |
| Publication | No v0.9.14 ZIP, push or publication completed |

On arrival for the preceding investigation, only three handover documents differed
from HEAD: `docs/CURRENT.md`, `docs/MAINTENANCE.md` and new
`docs/ARTWORK_HANDOVER.md`. Ownership was checked; no competing active chat owned
the checkout. The subsequent runtime candidate is this investigation's work.

Before adding this report, the current diff contained:

```text
README.md
artwork-albums.js
artwork.js
docs/CURRENT.md
docs/MAINTENANCE.md
manifest.json
release/NOTES.md
release/PUBLISHING.md
tests/artwork-known-albums.cjs
tests/release.cjs
docs/ARTWORK_HANDOVER.md                 (new)
tests/artwork-ranked-scheduling.cjs      (new)
```

This report adds documentation and an ignored, read-only inspection helper and
JSON under `test-results/`. It changes no runtime behavior. A future model must
inspect the diff rather than assume HEAD represents the installed candidate.
Do not discard the handover documents or blindly roll back the whole tree.

## 4. Latest screenshot and live confirmation

The supplied screenshot shows DCCXX's Lil Ugly Mane Tracks list, 208 tracks
overall, with empty artwork slots next to Breezem Out, Bitch I'm Lugubrious,
Achilles Foot, Columns and the subsequent visible rows. The screenshot alone
cannot reveal whether images failed, were hidden or were waiting for metadata.

The live inspection resolved that ambiguity:

| Observation | Meaning and limits |
| --- | --- |
| Runtime `0.9.14`, expected extension ID | The installed candidate is actually running |
| `cacheReady: true`, 856 cached tracks, no cache error | Cache initialization succeeded; a large cache does not mean this page's rows have fresh winners |
| Jobs: 50 waiting / 0 loading / 0 complete / 0 unavailable | Current ranked jobs are unresolved and are not being processed |
| `LastfmPages.status().rateLimited: true` | A shared stop prevents artwork requests |
| Stored pause timestamp `2026-10-20T04:45:50.229Z` | Pause survives navigation and Reload; no expiry is implemented |
| First 12 images complete, width 64, computed visibility hidden | Available native pixels are suppressed by the extension |
| Those images' enclosing links have no `href` | The extension also withholds the unverified album destination |
| Artwork lastError null; page lastError empty | Empty local error strings do not prove a healthy queue; persisted pause is separate state |
| `document.hidden: true` during inspection | Background state is another current scheduling gate; it does not explain away the independent persisted pause |

For example, Breezem Out had a downloaded native image ending in
`fca5ea56d8dfc707040deb81cbefa1cc.jpg`, and Columns had one ending in
`c1c24ded825ba87f7e7225585fc511e9.jpg`. Both were hidden. These identifiers
demonstrate loaded sources; this report does not assign an album winner to them.

The inspection did not focus, refresh, scroll or resume the tab, issue Last.fm
page requests, clear storage, or change image styles. It cannot reconstruct the
exact compositor frame at the time the user captured the screenshot. Its matching
current route and row state directly establish the present blocking conditions.
Evidence: `test-results/artwork-report-current.json`.

## 5. How an image reaches the screen

### 5.1 Discover and classify the row

`manifest.json` loads the early artwork observer at `document_start` and the
page reader/resolver dependencies at `document_idle`, with duplicate-load guards.
`adapter.js` identifies the profile, artist, track, album and native fields.
`artwork.js` scans rows and associates images with jobs keyed by user/artist/track.

A fresh personal winner cache record (`sourceVersion: 3`, normally under 24 hours
old), a proved shared winner or an applicable selected-album cover can be used
immediately. A validated native **scrobble history** cover can be shown as a
temporary preview. That preview is not proof of the all-time winner and is not
persisted as one. Ranked rows often lack the exact scrobble fields needed for it.

Otherwise `artwork.js:64`, `hold()`, explicitly sets `visibility: hidden` and
removes the album link. Keeping an image's `src` does not make it visible.

### 5.2 Schedule a personal lookup

`artwork.js:112`, `pump()`, waits for cache readiness, a supported visible document,
resolver dependencies and an unpaused page reader. Only one artwork resolver runs
at a time. On-screen jobs are preferred; within candidates, albumless rows and
placeholder rows have priority. Nearby loaded rows can be warmed through an
IntersectionObserver with a 1200px lower margin. This does not fetch every later
page automatically or guarantee that new rows are already proved.

Hidden documents and stale generations cancel work. Some retryable failures wait
10 seconds for one retry. Scroll/visibility changes can abort active work and
require it to be attempted again. Waiting, retrying and paused rows can therefore
look equally blank to the user.

### 5.3 Prove which album wins

`artwork-albums.js` tries shared exact album counts. It bounds candidate discovery
to five albums and an album read to at most two pages; incomplete totals cannot
prove sibling tracks. Saved artwork seeds provide candidates, not current count
facts for every other track by the artist. The count records are page memory.

If shared counts cannot prove the winner, `artwork-source.js:98`, `resolve()`,
reads the user's own track history. It validates returned identity, personal
profile, totals and exact scrobble album fields, excluding loading skeletons.
It tallies album plus album artist, rejects overlapping/changing history and
stops when unseen plays cannot overturn the leader. At full-history ties the
native most-recent order determines the winner. This is bounded to the selected
track's needed proof, not permission to scan the whole library.

The basic proof is: the leading count must exceed the runner-up plus all unseen
plays, unless all plays have been read. A track with 120 total plays may need two
50-row history pages before that condition becomes true.

### 5.4 Obtain the chosen album's artwork

After proving the winner, the resolver may still need the exact own-album header
or public album page to obtain a usable image. Similar Albums images and unrelated
compilations are not acceptable substitutes. An absent image at one CDN size is
handled separately by `image-recovery.js`; that module cannot choose the user's
album winner.

### 5.5 Pace the network and obey Last.fm

`pages.js` serializes reads, uses a shared `navigator.locks` lock across tabs,
and reads persisted request/pause state. It enforces at least **1500ms after the
previous request completes**, in addition to response time. Requests time out
after 15 seconds. Navigation has priority over queued artwork, but does not
preempt an active request or another tab holding the lock.

HTTP 429 or Last.fm's page-request warning sets `lfmNetworkPause` in local storage.
The pause is Boolean with a timestamp and **has no automatic expiry**. Startup
also recognizes a warning already present in the document. `resume()` explicitly
removes the key. While paused, `pump()` returns without starting unknown jobs.
Cached winners can still display, making one cached page look fixed while a new
artist page remains completely blank. Preserving the rate pause is correct;
leaving its effect indistinguishable from missing artwork is an unresolved
behavioral problem.

### 5.6 Apply and actually display

`finish()` stores the proved record and calls `apply()` (`artwork.js:31`). Apply
sets image source, removes competing `srcset` values, explicitly restores visible
style and installs the matching album link. It accepts a redirect-protected URL
identifying the same album to avoid an observer feedback loop.

Correct metadata, a changed `src`, downloaded pixels, visible DOM styles and
actual painted output are separate milestones. The current screenshot failure
occurs before a winner reaches finish/apply; downloaded native pixels remain held.

## 6. What the previous cold traces actually established

These were actual installed **v0.9.13 baseline** measurements before the v0.9.14
request-selection change, not candidate performance claims:

| Ranked row | Observed delay to sampled verified display | Explanation established |
| --- | --- | --- |
| Lucki — Fast Car, rank 101 | 18.50s | Native image already downloaded but withheld; final winner Watch My Back |
| Lucki — GEMINI! OUTRO, rank 105 | 9.89s | Unrelated DR*GS R BAD album read, then three-play own history, then GEMINI! album |
| Lucki — Pick A Flaw, rank 157 | 8.17s | Cold proof/cover path; final Almost There |
| Deafheaven — Dream House, mixed list | About 9s | 100 of 120 personal plays read before Sunbather proof |
| Aphex Twin — Alberto Balsalm, mixed list | About 17s | 100 of 110 plays; also waited behind preceding work |
| Deafheaven — Luna, mixed list | About 26s | 100 of 101 plays; also waited behind preceding work |

In the detailed Lucki trace, responses took roughly 0.75–1.66 seconds, in addition
to the 1.5-second request gap. GEMINI! OUTRO's visible/downloaded sample followed
resolver finish by about 18ms. This supports queue/proof/network delay as the major
observed cost in that sample; it is not an exact GPU/compositor measurement or a
universal rendering benchmark. An aborted Watch My Back request was restarted
after scroll movement, adding work.

The mixed trace also observed native artwork before personal verification. It
did not establish that every such image was wrong, but it disproves any claim
that a universal no-unverified-first-frame guarantee was demonstrated.

Lucki ended at **184 real tracks**. Raw `<tr>` counts of 248/282 included 98 native
skeleton rows. They are not proof of a successful 200–300-track run. BIGGAVEL
and BBY GOAT were already cached on arrival, so revisiting them was not a cold test.

## 7. Why successive changes did not settle the problem

| Version/checkpoint | What changed or was learned | Why it did not close acceptance |
| --- | --- | --- |
| v0.9.5 | Synthetic artwork checks passed | Live Dean Blunt lucre 1–6 / A_X remained blank; real inspection access was blocked |
| v0.9.6–0.9.9 | Verified legacy hints, broader shared recovery, skeleton exclusion, nearby warming | Addressed specific missing-evidence/parsing/scheduling cases, not every cold ranked dependency |
| v0.9.11 / `618afce` | Prepared detached batches, shared counts and public fallback; real Yeat pagination reached 300 rows | Later cold rows still hidden; observer regression froze browsing, so candidate withdrawn |
| v0.9.12 / `c8349d8` | Fixed artwork/redirect URL feedback loop using equivalent album identity | Responsiveness fix; cached live checks and rate-blocked appends did not prove instant cold artwork |
| v0.9.13 / `6af06f7` | Kept validated native scrobble previews visible, removed four-second append wait, prioritized navigation | Verified Scrobbles history, not the user's failing cold ranked Tracks requirement |
| v0.9.14 / current diff | Avoids arbitrary competing saved-album reads; uses native same-artist album link only as a count-verified request hint; deduplicates album facts | Real Last.fm rate pause prevented candidate cold/300-row acceptance; current new artist remains hidden while paused |

Several causes present the same empty-square symptom: hidden styles, missing
dependency startup, stale/unavailable proof, skeleton parsing, serial jobs,
request failures, background cancellation, rate pause and genuinely absent art.
Treating “blank covers” as one fixed bug encouraged the next patch to address a
different layer while the user continued seeing the same result.

The v0.9.13 history fix was useful but particularly easy to overgeneralize:
history rows contain a specific scrobble's album fields. Ranked rows summarize a
track and need an all-time winner. A fast history preview cannot automatically
be promoted to that winner. Warm caches further concealed the unresolved path.

The v0.9.14 change removes one demonstrated wasteful read; it cannot eliminate
all necessary history and cover requests. It changed neither pacing nor the
global pause nor the hold-until-proof design. It must not be described as an
accepted artwork-loading solution.

## 8. Where the AI process fell short

1. **Acceptance did not consistently govern verification.** Passing fixtures,
   successful cached images, faster append timings and a correct history view
   were milestones. None was the requested first-time ranked-row experience.
2. **Real-target access came too late in earlier iterations.** In-app browser
   blocking, 503 responses and unavailable Supermium debugging left assumptions
   untested. The current local CDP connection now provides actual target access.
3. **Proof availability and presentation were not solved together.** Hiding wrong
   art protects correctness, but serial proof leaves visible holes. The design
   has no satisfactory observable pending/paused outcome for this requirement.
4. **Instrumentation had its own failures.** A mixed-list probe read a main-world
   variable from an extension world, losing its in-memory network buffer. DOM
   samples and resolver events were recovered, but the trace is incomplete.
   A later probe selected a subframe without the expected modules. Those errors
   belong to diagnostic scripts, not evidence of product exceptions. Collection
   errors also delayed stopping/collecting while normal extension work continued.
5. **Depth and paint claims needed tighter qualification.** Skeleton counts
   overstated real rows; sampled DOM/rAF visibility is not exact compositor paint.
   These limitations are now recorded, but should have constrained claims sooner.
6. **New patches introduced risk at shared boundaries.** The v0.9.11 URL observer
   loop froze browsing. A v0.9.14 queue-priority experiment broke scroll recovery
   and was removed. Fixing artwork must retain redirect and responsiveness checks.

This is not evidence that Last.fm alone causes the defect, or that all previous
work was ineffective. It is evidence that the final user-visible contract has
remained open while narrower fixes accumulated. The assistant should have made
that distinction clearer and avoided presenting another candidate as resolution.

## 9. Verification status and remaining uncertainty

The v0.9.14 regression fails against the v0.9.13 modules at the demonstrated
arbitrary-request boundary and passes on the candidate. It exercises native hints,
duplicate hints, unrelated albums, generic rows, detached cover/link pairs and
storage preservation. Those are synthetic responses and isolated profiles.

The first combined run passed 58/60 suites. The priority experiment caused the
artwork-scroll failure; restoring its original priority passed that suite. An
isolated fresh-install setup timeout in library-casing-extension passed unchanged
on retry. All 60 suites have passing results across runs; there was not one clean
60/60 combined run. This report required no new runtime test run.

The installed paused candidate previously displayed 25 cached cover/link pairs
with downloaded images and no recorded runtime exceptions. Preference-key hashes
matched before/after Reload for present settings, rules and albumlessScanDraft.
No separate XML undo key was present in that snapshot, so this was not a live undo
exercise; isolated regressions cover undo/legacy records.

Still unproved: v0.9.14 cold speed, reliable correct-image-with-text paint,
universal prevention of an unverified initial flash, and cold appended ranked
behavior through 200–300 actual tracks across artists. The current Lil Ugly Mane
winner identities were not fetched during this report. The exact server threshold
or duration behind Last.fm's request warning is unknown. Do not infer that the
minimum request interval guarantees immunity from rate limiting.

## 10. What a fresh AI should do next

Start with `docs/CURRENT.md`, this report and the current diff. Preserve the
installed identity/profile and read the newest live state before any patch.
The old handover's “no traced Lucki cause yet” text describes its earlier point
in time; the subsequent cold traces above supersede it.

Do not automatically clear or resume the rate pause. When normal read access is
available through the ordinary explicit resume path, perform a bounded trace on
one naturally uncached ranked row; do not clear storage to manufacture a cold row.
Capture the row's identity, native fields, winner cache freshness and provenance,
job transitions, queue/lock wait, requested URLs, response identity/totals/counts,
cover choice, final image and link, download/decode and visible output. Separate
text insertion, text appearance, apply and image appearance timestamps.

Instrument the main frame and the actual installed extension world explicitly.
Verify `chrome.runtime.id`, expected modules and frame ID before reading state.
Keep diagnostic events in a durable bounded buffer and close connections in a
finally path. Record foreground/background state; avoid leaving probes or reads
running after a collection error. Never log credentials or native edit tokens.

Repeat on consented scroll-added rows and a mixed-artist list through 300 **real,
non-skeleton** tracks, retaining normal checkpoints. Check both image and album
link against independently verified personal counts. Check responsiveness and
redirect opt-out/re-enable. Include a separate cached revisit, clearly labeled.
Stop when Last.fm asks for a break; report partial acceptance rather than resume
automatically or replace it with a fixture pass.

Before promising immediate cold artwork, confront the data dependency: if neither
the ranked response nor a valid cache contains the winner proof, the client must
obtain additional information. Several paced network reads cannot reliably
finish in the same first frame as already-rendered text. Concurrency or CSS alone
does not remove this requirement. Any design involving earlier bounded proof,
prepared next-page evidence or a clearer pending state needs an explicit account
of correctness, freshness, request cost and the user's first-paint requirement.
It is not permission for a full-library scan, a long page freeze, or guessing
from global catalogue art. A pending-state improvement alone would not meet the
original instant-correct-cover requirement either.

Only patch a demonstrated failing boundary, then repeat the same real cold test.
If the fundamental requirement needs a product tradeoff, explain that concrete
choice instead of claiming the next local optimization has solved it.

## 11. Evidence map and safety boundaries

Tracked source and documentation are available in the repository. The following
diagnostics are local, generally ignored `test-results/` files; a fresh model
without this filesystem will need the relevant evidence provided separately.

| Evidence | Use |
| --- | --- |
| `artwork-report-current.json` | New read-only current Lil Ugly Mane state, pause and first 12 hidden/downloaded rows |
| `ranked-deep-before.json` | Real v0.9.13 Lucki scheduling, requests and sampled display |
| `ranked-before.json`, `ranked-scroll-before.json` | Warm initial/page-two results; not cold acceptance |
| `ranked-mixed-baseline-recovered.json` | Recovered mixed cold DOM/resolver evidence; network buffer missing |
| `ranked-mixed-baseline.log` | Diagnostic world-selection failure |
| `ranked-candidate-paused.json`, `.png` | Prior v0.9.14 cached installed check while paused |
| `ranked-storage-before.json` | Non-artwork key hashes used for preservation comparison |
| `ranked-scheduling-red.log`, `v0914-ranked-final.log` | Baseline failure and candidate regression result |
| `v0914-combined.log`, `v0914-final-focused.log`, `v0914-final-rechecks.log` | Actual combined/retry test history |
| `library-trace-before.json`, `library-verified-live.json`, `library-scroll-live.json` | Earlier v0.9.13 history-specific investigation |
| `docs/ARTWORK_HANDOVER.md`, `docs/CURRENT.md` | Historical requirements and version-specific qualifications |

The latest supplied screenshot is in temporary storage:
`C:\Users\jayco\AppData\Local\Temp\codex-clipboard-a1b9cfef-e876-40b1-8fc5-658a9fd1bd0c.png`.
Its continued availability is not guaranteed by Git.

Preserve extension identity, preferences, XML undo and scan records. No storage
clearing, scrobble changes, full-history/library scans, installs, publishing,
subagents or user Console homework are authorized. Do not remove redirect-loop
protection, bypass request limits or skip scrolling consent/checkpoints.
No background retry or further work is scheduled by this report.

# Current state — 29 October 2026

## 29 October 2026: Chrome Web Store / private GitHub handoff

Packaging baseline fa293fea314aeea16081c6806b7fa438865ba759; clean existing
codex/itunes-library-styling worktree, no competing owner. Prepared v0.9.24
without changing its version, permissions, extension identity or saved data.
Updated store copy, reviewer instructions and permission justifications; refreshed
three 1280×800 screenshots from the actual extension in a network-blocked,
isolated synthetic profile. Original icons and promotional graphic retained.
Privacy wording now reflects universal artist/song/album redirect protection.
Added tools/package-store.cjs and corrected generated site's version footer.

Runtime ZIP: 41 files, 300,553 bytes; SHA-256
1b3bb098cbc49350204f56934d3f8159235eec1679c9f9d1dbeba1f6abb44efa.
Submission ZIP: 23 files, 956,005 bytes; SHA-256
137bcde1531b56861a34f1c381822ea64a7f20c32d6b90eca783bb1bbea64112.
Independent ZIP CRCs, exact source bytes, per-file hashes, inner/outer consistency,
checksum files and manifest summary limit verified. release, release-site,
beta-store, beta-onboarding, redirects and redirect-requests all pass (6/6).
The extracted upload ZIP separately passes actual-extension onboarding in an
isolated browser. Screenshots were visually inspected. Earlier full feature gate
and signed-in evidence are below; they were not rerun or relabelled as new live
acceptance. Kesha-specific source checks passed in the preceding task; a new
installed-browser Kesha check remains pending because access is unavailable.

Delivery: requested source branch, annotated v0.9.24 tag and ZIP/checksum assets
are prepared for the existing private DCCXX9/lastfm-personal-library prerelease.
No old branches/tags/releases are replaced. Publisher identity/support fields,
a publicly hosted privacy-policy URL and Chrome dashboard submission remain
pending; no store upload, website hosting or visibility change is performed.
Installed signed-in browser data, XML undo, caches and pauses are untouched.
Rollback for this packaging-only change: fa293fe. Release files: release/PUBLISHING.md.

## 29 October 2026: Settings buttons and universal music protection v0.9.24

Baseline: dd447bf95554c95c9e192f6b6e91ce9a2379eec7 on
codex/itunes-library-styling. Started clean, one worktree, no competing owner.
Settings navigation is presented as green buttons, including Manage preferences.
The duplicate Cache progress & backup link is removed. Redirect protection uses
matching tile spacing with its description above the checkbox and save control.

Protection no longer has an artist allowlist. All supported artist/song/album
links receive +noredirect in the configured profile and public music pages.
Artist repair uses only unique validated original native row fields in matching
named cells; song/album names must match, and album cells use album artist.
Unrelated links retain identity; ambiguous/changed titles are never guessed.
Protected GET responses changing artist, song or album identity are rejected.
Native form actions/fields, request pacing, pauses and permissions are unchanged.
See REDIRECT_PROTECTION.md for explicit limits.

Installed signed-in Supermium v0.9.24, same fpfeckjdjmlnnjbodagebgcdflmbkmik ID:
DCCXX, 4,780 preferences. Verified Settings desktop/mobile, green navigation,
removed redundant link and tile order. Verified 350 real protected library
links, refresh persistence and actual Yeat / Alivë / Always Alivë navigation
retaining requested identities and protected downstream links. Navigation sent
no write requests. All installed extension storage matched the original snapshot
exactly: preferences, XML undo, completed cache/jobs, legacy/scan records, artwork
and network pauses retained. Generic canonical artist repair and friend isolation
are fixture verified; no real misdirected scrobble was manufactured for testing.
Private evidence is ignored under test-results/pre-v24-* and v24-*.

All 70 suites pass across the full gate and focused reruns after updating six
artwork fixtures for the intentional protected URL policy. The image-recovery
fixture twice timed out waiting for the extension worker before assertions; a
diagnostic startup run and then the unchanged fixture passed. This remains a test
startup flake, not a diagnosed runtime failure. Added regressions cover arbitrary
artists, album artist separation, related links and wrong song/album responses.
The 41-file ZIP is 300,497 bytes, SHA-256
2f69f4f77381abf72e27bde0cc7854bb5d5968806ee95d251fc4ed9ec1569f6f.
Rollback: v0.9.23 checkpoint dd447bf. Local only, no push/publication or data edit.

## 29 October 2026: cleaner Settings v0.9.23

Baseline: f7f11dc00d98e4b5c03fdea239e0e7ca5a786709 on
codex/itunes-library-styling. Started clean; one worktree, no competing owner.
Settings now uses Jay's Last.fm tool without the top tagline or username helper.
Infinite scroll says Load more library pages as you scroll. Redirect protection
has its own tile, clear label and independent save; unsaved profile/scroll and
redirect drafts cannot commit or discard each other. Existing artist scope and
redirect implementation are unchanged. The iTunes import tile uses Jay's exact
supplied copy. Connection & artwork is removed; tab selection and the original
two-click artwork refresh live in collapsed Troubleshooting with relevant
missing-tab/pause guidance. Backups and preference management remain available.

Installed Supermium verification: same fpfeckjdjmlnnjbodagebgcdflmbkmik extension,
DCCXX / 4,780 preferences, v0.9.23. Checked heading, removed text/status fields,
separate form ownership, independent redirect save preserving an unsaved username,
reload, collapsed Troubleshooting and 390px mobile width. All installed storage
matched the pre-check snapshot exactly. XML undo, completed cache/jobs, scan/legacy records,
artwork and network pauses are preserved. Artwork refresh remains disabled when
no connected own-profile Last.fm tab is available; no personal covers were removed.
Its actual refresh/confirmation behavior is exercised in isolated extension tests.
No clearing, reinstall, Last.fm edits, scans, new permissions or publishing.
Private evidence: ignored test-results/pre-v23-* and test-results/v23-*.
Rollback: f7f11dc. All 14 relevant regression suites pass: options, popup,
artwork-refresh, redirect-browser, backup-preview, beta-onboarding, release,
release-site, extension, itunes-ui, itunes-feedback, startup, store-navigation
and beta-store. Initial artwork test still looked up a role inside the newly
collapsed section after reload; its hidden-control assertion now uses the ID.
An onboarding same-URL navigation race passed on rerun without product changes.
The 41-file ZIP is 299,506 bytes, SHA-256
6b17c82c6a6ba26d20e7e666281c5358b933af06b7ebb37ef9959545b669d20e.

## 29 October 2026: guided iTunes workflow v0.9.22

Baseline: 51c81698d92904c79f8d35c5424f6f44d587e460 on
codex/itunes-library-styling; started clean with one worktree and no competing
owner. Three collapsible numbered steps explain caching, iTunes XML export,
then Before/After review and acceptance. Completed cache opens the import step;
comparison opens review. Partial comparisons remain possible and explained.
Pause/resume, cache export/import, skipped rows and protected rebuild remain.
Rebuild warns that 50,000+ scrobbles may take over 30 minutes; large libraries
can take several hours. No network pacing or cooldown changes.

Apply/Undo paints Saving before calling the worker, disables review controls,
then shows preview updating and explicit Complete only after the commit. Errors
retain selections; a failed post-commit preview refresh still reports the saved
result accurately. Undo remains accessible. Popup scroll changes keep their
errors but no longer produce the redundant success message.

The worker reuses one committed cache view for read-only info/plan calls;
storage events update it and cache mutations invalidate it. Mutations continue
to read persisted storage and use the existing serialized atomic writer. The
50,000-name, 20-status-call probe first failed with 20 full cache reads / 1692ms;
it passes with 1 read / approximately 240ms. This is local metadata overhead,
not proof of faster whole-library download. Page writes, request count and
persistent Last.fm pauses are unchanged.

Installed Supermium verification used the same fpfeckjdjmlnnjbodagebgcdflmbkmik
extension and DCCXX profile. v0.9.22 shows all steps and XML instructions; the
completed cache contains 60,748 names with one skipped item. Real Library.xml
(55,835 songs) produces 30 review changes, 27 needing a casing choice. Cancelling
rebuild, runtime reload and real XML comparison preserve every storage key,
including 4,780 preferences, XML undo, cache/jobs and network pause records.
Personal Apply/Undo was not executed because it would replace the user's undo
journal. Delayed saving, failure, Complete and actual worker Apply/Undo are
verified in isolated browser/extension tests instead. Evidence and private
snapshots stay ignored under test-results/pre-v22-* and test-results/v22-*.

No Last.fm submissions, storage clearing, reinstall, new permission or publishing.
Rollback: 51c8169. Full regression: 69/70 passed; library-casing-extension
failed at extension service-worker startup (30-second timeout). Its focused rerun
passed unchanged, including partial/resume, exact casing, Apply/Undo and own-
profile isolation. The real toolbar popup saved/restored the scroll setting with
no redundant success message; all storage matched exactly afterwards. Opening
the popup over an extension page did not produce a toolbar target; bringing the
own Last.fm library tab forward did. No product fallback was added.
The 41-file local ZIP is 300,424 bytes, SHA-256
20ef0d4fb3393af3935e036a813832027c268b06b1e9b7f7d4f45dde99e305cc.

## 29 October 2026: popup redesign v0.9.21

Baseline: 2a1c59f on codex/itunes-library-styling; started clean with one
worktree and no competing checkout owner. Popup matches Jay's reference:
Jay's Last.fm tool heading, connected profile/avatar, persistent Enabled/Disabled
infinite-scroll dropdown, green XML matching and Settings buttons, compact footer.
The existing scrolling consent behavior remains unchanged. Connection/scroll
status and confirmed artwork refresh move into Settings; preference counts and
management remain there. Artwork refresh selects an own-profile tab and keeps
its existing two-click confirmation. No new permissions or extension identity.

Albumless tracks is removed: six source/UI files, content/worker entry points,
store API, capture hook, styles and dedicated experimental suites. Its old action
is rejected and packaging rejects removed feature modules. Legacy storage is
untouched and remains included in generic backups. Artwork handling for scrobbles
with a genuinely missing album remains unchanged; it does not edit scrobbles.

Live acceptance used the same installed signed-in Supermium extension
fpfeckjdjmlnnjbodagebgcdflmbkmik / DCCXX. The real toolbar popup showed the actual
profile image, supplied layout and 380 x 456 size without horizontal overflow.
The scroll dropdown saved, survived a popup reload and synchronized to Settings;
the original enabled setting was restored. The real Settings button opened the
page with 2,651 preferences, connection details and artwork refresh, with no
Albumless link. Initial checks needed to await saved settings/content-script
readiness; isolated test windows also took focus and closed the toolbar popup.
No implementation fallback was added for these verification timing issues.

All protected installed storage matches the pre-reload snapshot, including raw
settings, preferences, XML undo, legacy scans, artwork and network pause records.
The existing background cache was already running at this task's baseline and
remains running; its live progress/jobs/request pacing are allowed to advance.
Only the settings API's test-induced explicit default redirect flag was restored
to the original raw record after checking its values. No data was cleared,
reinstalled, submitted to Last.fm or published. Private live backups/evidence
remain ignored under test-results/pre-v21-* and test-results/v21-*.

Regression: 67/68 suites passed in the full run; the remaining older options
suite still expected a deliberately removed popup status field. After updating
that assertion and loading the shared status helper, options passes. Focused
popup, artwork refresh, beta onboarding/store, actual extension and release
checks also pass. The 41-file v0.9.21 ZIP is local only. Rollback: 2a1c59f.

## 29 October 2026: background cache candidate v0.9.20

Baseline: 35d74c3 on codex/itunes-library-styling; started clean with no competing
checkout owner. Includes the discussed background cache, safer rebuild, cache
export/import, malformed-row continuation/report/retry and memory-overhead work.
First profile connection starts a persisted job. The comparison screen can close;
a connected own-profile Last.fm tab is required. Alarms recover running jobs after
suspension; existing installations keep their current cache and paused state.
Pause/Resume is separate from Compare. Rebuild is under Advanced, confirms its
cost and keeps the usable cache until an atomic completed replacement. Cache JSON
supports complete/partial progress, profile/format validation, preview and explicit
confirmation. Invalid, canceled, stale or failed operations preserve existing data.

Malformed rows now record name/artist/link/page/reason and do not halt subsequent
rows/pages. Retry downloads affected pages only. Whole-page, sign-in and pagination
failures still pause safely; the paced GET queue and rate pauses remain intact.
Ordinary preference reads exclude cache/undo data; job guards read metadata only,
and pause/status changes no longer rewrite/broadcast the full cache. The obsolete
comparison polling client is removed. The alarms permission adds wakeups, with no
new website/account access. Exact casing-only matching and submission rejection
remain in force. No artwork work, reinstall, storage clearing or scrobble edits.

Installed signed-in Supermium (same extension fpfeckjdjmlnnjbodagebgcdflmbkmik,
DCCXX) preserved all storage across reload. The real cache advanced from page 548
to 556 after skipping `.` by `[The User]` on page 548; it now holds 27,712 names
and one skipped item. It continued after the extra comparison screen was closed.
The real Export cache button downloaded a valid 2,390,226-byte JSON file. Live
rebuild/import cancellation and wrong-profile rejection preserved all storage.
Reimporting the identical partial cache preserved names/cursors/skips, refreshed
its generation, and persisted after refresh; legacy missing empty skipped arrays
normalize to empty arrays. All 2,651 preferences, XML undo, scan records, artwork
records and network pause settings remained unchanged. Caching is left paused.

The actual 95,332,644-byte XML compared in about 20 seconds: 23 casing differences,
seven choices and a Partial library label, with no saved-storage changes. A 50 ms
UI heartbeat measured a maximum 104 ms gap; retained JS heap after collection was
about 15 MB. The intermittent page-unresponsive warning was not reproduced, so
the measured allocation fixes are not a claim that every browser hang is solved.
The full 1,024-page cache was not downloaded and no new preferences were applied.
Private evidence/backups stay ignored under test-results/v20-* and
test-results/pre-v20-installed-storage.json; never package or publish them.

Final full gate: 73/73 suites passed, including background work with UI closed,
retained rebuild/atomic swap, cache import/export guards, skip/retry, profile
isolation, native dialogs, GET-only transport and 56,000-name real extension
storage. Focused release/background/UI checks also pass after final packaging
and label changes. A 50,000-name test guards bounded ordinary reads and broadcasts.
The local package contains 45 allowlisted files; its generated download page now
points to its own version. Nothing was pushed or published. Rollback: 35d74c3.

## 29 October 2026: exact casing comparison candidate v0.9.19

Baseline: 3176b45 on codex/itunes-library-styling. Claude's v0.9.17 and the
v0.9.18 checkpoint remain intact. The importer now shows concise Before → After
rows, only for observed Last.fm names that differ from XML in letter casing.
Unchanged names, unscrobbled XML titles, punctuation/spacing differences and
featuring/edition suffix differences are excluded. Artist scope stays exact.

Compare libraries starts/resumes a persisted, own-profile, all-time cache of
tracks, albums and artists through the existing paced GET queue and pauses.
An incomplete cache previews only positively observed matches and is labeled
Partial library. Separate album-artist names are not inferred from these lists.
Opening the screen or choosing files alone starts no requests. XML stays local.

The shared transport hard-rejects submissions and uses literal GET fetches,
including for retained experimental callers. The renderer ignores substantive
rename rules retained in backups; new preference writes reject non-casing
changes. Existing records are preserved. Native Last.fm controls remain the
site's separate user action. No XML changes were saved in Jay's profile.

Installed Supermium read the real 55,835-song XML and cached 250 actual track
names over five pages, yielding nine before/after casing differences. The cache
cursor survived an extension reload; all preferences, undo, scan records and
pause state stayed unchanged. This is partial live acceptance, not a completed
1,024-page track cache or a real-profile import. Evidence stays ignored/local:
test-results/comparison-installed-result.json and comparison-installed-preview.png.
Last.fm double-escapes literal plus signs; parsing now verifies those links
without changing the raw name or relaxing XML identity matching.

All 69 suites passed across the full regression run and focused reruns. The
initial run found stale expectations for title replacement, POST transport and
the old XML-only interface, plus a service-worker startup timeout. Expectations
now cover the stricter behavior; the supported scrobbles-list GET route is
retained. Final isolated extension coverage verifies pause/reopen/resume, literal
plus signs, apply/undo, later manual edits, friend isolation and GET-only reads.
A separate 56,000-name capacity check persisted over 34 MB including cache/undo.
Rollback: 3176b45. No artwork work, publishing, reinstall or storage clearing.

## 28 October 2026: whole iTunes library styling candidate v0.9.18

Claude's clean v0.9.17 baseline is 17b1fc84ecf968ac698bd227d5bc52681e6403c1,
preserved on preferences-page. Work continues on codex/itunes-library-styling.
The existing whole-library importer rejected the supplied export's standard
legacy Apple Computer plist header. A narrow parser fix accepts that header,
retaining custom-DTD/entity rejection and zero external XML fetches.

The review now offers Select whole library and filters for unresolved choices,
saved-preference replacements, already matching names and new preferences.
Confirmation reports skipped conflicts and selected replacements. Jay explicitly
approved unlimitedStorage for local rules plus undo beyond the usual quota.
There is no storage migration or identity change; Claude's version labels,
artwork-refresh confirmation and disposable test-profile cleanup remain intact.

The actual 95 MB Library.xml scanned in installed signed-in Supermium v0.9.18:
55,835 songs, zero skipped, 69,085 distinct candidates and 42 casing conflicts.
Installed review verified all 42 conflicts, five possible replacements and
whole-library selection of 68,944 changes (99 preferences already match).
Apply confirmation was canceled. All stored keys hash-identical before/after;
zero network requests from the import. User preferences have NOT been imported.

In a disposable extension profile with networking blocked, the actual XML
completed scan, UI apply of 69,043 names, reload/persistent undo and full revert.
The 42 unresolved conflicts were skipped. A separate synthetic 56,000-song
capacity check saved 26,197,649 bytes including undo, then reverted 55,999 rules
while preserving a later manual edit, profile, scan records and pause settings.
These isolated apply checks do not claim a full import in the user's profile.

Regression: 66/68 suites passed on the full run. The onboarding suite encountered
an install-time options-page navigation collision; startup missed the initial
service-worker event. Both passed on focused reruns, with no source changes.
All 68 suites therefore passed across the full run and those two reruns.
The parser, review UI, 26 MB capacity, storage/undo, own-profile isolation,
native-dialog and release/package checks all passed.

Local evidence, excluded from Git: test-results/itunes-real-review-result.json,
itunes-installed-ui-result.json, itunes-installed-review.png and
itunes-real-roundtrip-result.json. The supplied XML and derived personal names
remain local. No server edits, Last.fm scans, artwork work or publishing.
Rollback baseline: 17b1fc8; recovery bundle:
.codex-backups/pre-itunes-library-20261028/history.bundle.

## 28 October 2026: close dialog after explicit casing save

SAVE CASING CHANGES now invokes the form's native non-submit Cancel control
after the local preference saves successfully. Last.fm closes its dialog and
backdrop while the success toast remains visible. A failed save retains the
dialog and entered values. Native SAVE EDIT/intercept behaviour is unchanged.

Verified in installed signed-in Supermium with real album and track dialogs,
reusing Jesus Is King and Lying 4 fun preferences. Both dialogs/backdrops closed,
the success toast remained, and casing persisted after refresh. Zero attempted
server edits; all stored keys matched the pre-save snapshot. Evidence:
test-results/close-casing-live-result.json. Focused dialog-close, native-album,
native-submit and native-toast tests passed, including simulated storage failure.
Rollback: .codex-backups/pre-close-casing-20261028/; branch preferences-page,
HEAD 6af06f7. Previous dirty work and installed identity/data are preserved.

## 28 October 2026: single animated local-save toast verified

Local casing saves now show only the top-right confirmation. Success notices
slide in, start sliding out after five seconds, and reset their timer on another
save. MANAGE PREFERENCES and DISMISS share a separate row and the casing button's
green colour, native font, 40px height and 3px corners. Reduced motion disables
the animation. Toast clicks stay inside the toast so dismissing it does not
trigger Last.fm's outside-dialog close handler. Error notices remain light red;
loading cancellation and manual error dismissal remain available.

The former inline confirmation's repeat-save guard now uses a WeakSet, cleared
on input changes. Regression coverage checks one confirmation, action layout,
expiry, replacement, dismissal, reduced motion and the retained guard. Existing
album, track, navigation and storage checks preserve native-edit/profile limits.

Verified in the installed signed-in Supermium native album dialog with the
existing Jesus Is King preference: matching button metrics, automatic expiry,
repeat saves, dismissal, reduced motion and casing after refresh. Zero attempted
server edits; all local storage keys matched the pre-save snapshot. Evidence:
test-results/save-toast-live-result.json and save-toast-live.png. Rollback for
this slice: .codex-backups/pre-save-toast-20261028/ (exact previous source/tests,
CURRENT.md and arrival diff). Branch preferences-page, HEAD 6af06f7; prior work
is preserved and no version, extension identity or storage migration changed.

## 28 October 2026: explicit casing save and green theme verified

Supported native album and track dialogs now add SAVE CASING CHANGES immediately
after SAVE EDIT. The local button copies the native button classes/inner label,
uses type=button, and enables only when all edits are casing-only. Input changes
update availability; unchanged, mixed and substantive edits cannot use it.
Saving uses the existing local preference path and own-profile checks. Native
editing and the existing casing-only submission safeguard remain available.

Extension pages, injected controls, focus indicators, notices and the toolbar
icon now use a pale green palette with dark green text. Light red is reserved
for errors; a paused scrolling state uses the normal green surface. Last.fm's
native controls retain their own styling. The icon capture helper reads the SVG
source so future captures retain the chosen palette. Help describes the new
button. No storage, identity, permissions or version changes were made.

Installed signed-in Supermium verification used the real Kanye West album
dialog. Both buttons measured 40px high with matching font, weight and 3px
corners. The new button was light green (#bceacb), on the same line as SAVE EDIT.
Desktop and 390px viewport captures showed all three controls fitting. Its local
save reused the existing Jesus Is King preference; zero server edits were
attempted and every stored key, including rules, matched the pre-save snapshot.
The casing persisted after refresh. All seven extension pages were checked;
popup/settings/preferences/XML screens and a temporary error appearance preview
were captured. The preview changed only the temporary popup DOM, then closed.
Evidence: test-results/green-casing-live-result.json, green-casing-presave.json,
green-casing-dialog.png, green-casing-dialog-narrow.png and green-casing-*.png.
The initial post-extension-reload tab lacked injected controls; a normal refresh
loaded them before the successful live test.

Ten focused suites passed: native-album, native-submit, album, store-navigation,
storage, beta-onboarding, options, itunes-ui, itunes-store and artwork-refresh.
The branch remains preferences-page at 6af06f7, preserving all earlier work.
Rollback snapshots are in .codex-backups/pre-green-casing-20261028/ for the
changed runtime/styles/help/icon sources and generated PNGs, capture helper,
tests and this document. No scans, server-side edits or publishing were done.

## 28 October 2026: album save after in-page navigation verified

The earlier album check used a directly loaded library page and missed Last.fm's
client-side navigation. In the reported Kanye West dialog, Chrome's sender.url
still identified the original /music/Kanye+West document, while sender.tab.url
correctly identified /user/DCCXX/library/music/Kanye+West/+albums. The worker
therefore rejected a valid local casing save at its own-profile boundary.

For same-origin Last.fm main-frame messages only, authorization now uses the
current Chrome-supplied tab URL. Child frames and foreign origins cannot borrow
that URL, and navigation away to another profile revokes mutation access.
The production correction is seven lines in background.js. No permissions,
identity, version, native form contracts or artwork behavior changed.

The new store-navigation test first failed with the reported profile rejection.
It now passes an actual loaded-extension public-document/pushState/native-save
flow and negative worker checks for friends, public pages, child frames and
foreign origins. Eight suites passed: store-navigation, native-album, storage,
native-submit, adapter, album, artwork-refresh and artwork-store.

Live signed-in Supermium followed real links from the public Kanye West artist
page to the own-library album list. The native Save edit saved JESUS IS KING as
Jesus Is King locally despite the stale public sender URL. The exact casing
persisted after refresh and was visually checked. Zero server edits were
attempted under an edit-request guard. Only that album rule changed; all six
other storage keys matched the immediate backup. Evidence:
test-results/album-profile-live-result.json, album-profile-presave.json,
album-profile-saved.png and album-profile-refreshed.png. An initial verification
tab lacked content scripts after extension reload; checking readiness on the
public document resolved the setup failure without another product patch.

Rollback: .codex-backups/pre-album-profile-20261028/background.js and CURRENT.md;
the new test is tests/store-navigation.cjs. The arrival patch preserves the
existing uncommitted work on preferences-page at 6af06f7. The saved Jesus Is King
preference can independently be removed in Manage preferences.

## 28 October 2026: popup artwork refresh verified

The popup now has Refresh artwork beneath Settings & backup. On the connected
profile, it removes saved artwork for tracks loaded on that page (including
albumless cache variants), suspends pending artwork work, and reloads the page.
It does not enable background artwork lookups, start scans or submit edits.
Other profiles and unrelated tracks retain their cache entries. A worker-side
profile and input check protects the serialized cache mutation.

The installed v0.9.16 extension in signed-in Supermium was refreshed in place.
HeliMAn had a saved single-cover fallback, while Last.fm's fresh markup already
contained LUH LEAKYZ Vol. 1. The installed popup document's actual button sent
the real content-script message with Last.fm as the active tab; no tab-query
override or fixture was used. Supermium did not expose chrome.action.openPopup
to automation, so the popup document was opened in a background extension tab
for this live check rather than the toolbar bubble.

Three matching cache records were removed (897 to 894). All six other existing
storage keys matched the backup exactly: settings, rules, scan draft, request
window, last page request and network pause. No XML undo key was present;
synthetic storage tests cover that boundary. HeliMAn displayed the album cover
and album link after the button reload and in a fresh library tab. A full native
viewport capture visually confirmed it; Supermium's element screenshot clips
were offset and are not visual evidence. No Last.fm POST or background history
lookup was observed during the recorded button refresh.

Eight focused suites passed: artwork-refresh, artwork-store,
artwork-zero-request, artwork-history-display, artwork-album-view, native-album,
storage and beta-onboarding. Evidence: test-results/artwork-refresh-live-result.json,
artwork-refresh-storage-before.json and artwork-refresh-visible-page.png.

The branch remains preferences-page at 6af06f7 with existing work preserved.
Source rollback is the exact pre-task snapshot in
.codex-backups/pre-artwork-refresh-20261028/ (popup.html, popup.js, store.js,
background.js, artwork.js, content.js and CURRENT.md), plus the new
tests/artwork-refresh.cjs. No identity/version change, reinstall or publishing.

## 28 October 2026: native album casing verified

Album casing work continued on preferences-page at 6af06f7, preserving the
arrival artwork candidate and handover/report documents. The actual installed
folder and extension fpfeckjdjmlnnjbodagebgcdflmbkmik reported **v0.9.16 beta**;
the older v0.9.14 notes below do not describe its current manifest version.

The signed-in Yeat Edit Album dialog exposes only album_name and
album_artist_name original/current pairs. The track adapter required artist_name
and returned null. Album dialogs now select an explicit two-pair contract and
scope album preferences using the original album artist. Track/correction callers
retain strict validation. Native album launchers are excluded from interception;
unchanged and mixed substantive edits keep Last.fm's normal handling.

The captured-form regression failed twice before the fix. Eight focused suites
passed: native-album, adapter, native-submit, album, albumless-transport,
albumless-capture, storage and rules. Coverage includes album/album-artist casing,
combined changes, unchanged/mixed pass-through, malformed fields and own-profile
isolation. No artwork work was resumed, and no version/identity change was made.

In installed signed-in Supermium, Save edit saved LUH LEAKYZ Vol. 1 as
Luh Leakyz Vol. 1 locally. An edit-request guard observed zero attempted server
edits. Exact casing persisted after refresh and was visually checked. Only the
requested album rule changed; all six other existing storage keys matched the
backup, including settings, scan draft, artwork cache and network pause. No XML
undo key was present; synthetic storage checks cover retained undo records.
The initial post-Reload check ran before content modules were ready; a fully
loaded refresh and explicit module readiness resolved verification without a
second product patch. Evidence: test-results/album-casing-live-result.json,
album-casing-native-form.html, album-casing-saved.png and album-casing-refreshed.png.

Rollback uses the exact pre-task adapter.js and native-edit.js snapshots in
.codex-backups/pre-album-casing-20261028/, preserving the existing artwork diff.
That directory also retains the arrival patch/status and CURRENT.md snapshot.
The one new local preference is independently removable in Manage preferences.

## v0.9.14 local candidate — cold ranked acceptance blocked

Continued from preferences-page at 6af06f7. Arrival diff was exactly the three
handover documents; no competing active chat owned this checkout. The installed
Supermium path and extension ID fpfeckjdjmlnnjbodagebgcdflmbkmik were verified.

Before changing runtime code, real v0.9.13 ranked Lucki rows were traced through
job scheduling, personal proof, fetches and sampled image/link rendering. Fast
Car (rank 101) stayed hidden for 18.50 seconds; GEMINI! OUTRO (rank 105) for
9.89 seconds. The latter first read unrelated DR*GS R BAD counts, then its own
three-play history, then the GEMINI! album. Responses took about 0.75–1.66 seconds
and retained the 1.5-second request gap. Its visible/downloaded sample followed
finish by about 18 ms. Pick A Flaw (rank 157) took 8.17 seconds. These are real
baseline samples, not candidate speed measurements or exact compositor timings.
Evidence: test-results/ranked-deep-before.json.

The Lucki list completed at 184 real tracks. Intermediate all-tr counts of 248
and 282 included 98 native skeleton rows; they are NOT evidence of 200–300 tracks.
BIGGAVEL and BBY GOAT already had fresh GEMINI! records on arrival and were warm.
Mixed-library baseline tracing separately found cold Dream House, Alberto Balsalm
and Luna rows, requiring 100/120, 100/110 and 100/101 personal scrobbles to prove
their albums. The sampled verification delays were about 9, 17 and 26 seconds.
Native artwork was observed before personal verification on that baseline; a
universal no-wrong-first-frame guarantee has not been established.
Evidence: test-results/ranked-mixed-baseline-recovered.json. Its network event
buffer was lost when the inspection script mistakenly read a main-world probe
from the extension world; recovered DOM/paint samples and resolver events remain.

Candidate change: skip arbitrary competing saved-album reads on ranked pages.
If the row supplies a same-artist native album link, treat it only as a request
hint: its verified own-library counts must prove the winner. Otherwise use the
authoritative track history. Native and saved hints for one album count once.
No new storage format, permissions, identity, rate policy or consent behavior.
The attempted change to placeholder priority was removed after the existing
scroll-recovery regression showed a delay; final priority matches v0.9.13.

Last.fm's real shared request warning stopped further baseline lookups. The pause
was NOT resumed or cleared. The installed v0.9.14 check while paused confirmed
25 visible/downloaded cached covers, album links and no runtime exceptions;
the screenshot was visually inspected. SHA-256 values for every present non-artwork
preference key (settings, rules, albumlessScanDraft) matched before/after Reload.
No separate XML undo key was present in that snapshot; synthetic checks cover
undo and legacy records. Evidence: test-results/ranked-storage-before.json,
ranked-candidate-paused.json and ranked-candidate-paused.png.

The new regression fails at the arbitrary-request assertion against 6af06f7's
v0.9.13 modules and passes on the candidate. It covers native/saved duplicate
hints, unrelated native albums, generic rows, detached appended cover/link pairs
and storage preservation. The first combined run passed 58/60 suites. The
placeholder-priority experiment failed artwork-scroll; restoring the original
priority passed that suite without changing its timeout. library-casing-extension
failed to find its isolated fresh-install setup page, then passed unchanged on
retry. The new ranked fixture was adjusted to exercise native-hint rows without
depending on the withdrawn priority experiment, and passed again. All 60 suites
have passing results across the combined run and focused rechecks; this was not
one clean 60/60 combined run. Logs: v0914-combined.log, v0914-final-focused.log,
v0914-ranked-final.log and v0914-final-rechecks.log under test-results/.

The final runtime was reloaded in the installed profile after restoring priority.
It again reported v0.9.14, 25 painted cached covers, no runtime exceptions and the
retained rate pause. Source remains uncommitted so the candidate can be reviewed;
baseline source rollback is 6af06f7, preserving the pre-existing handover documents.

**Acceptance remains open:** candidate cold timing, exact image-with-text paint,
wrong-first-frame prevention and 200–300 actual ranked rows across artists were
not proved. Cached reloads and fixtures do not satisfy those criteria. Do not
promise instant cold covers: a ranked response can lack the user's album proof.
The next live check needs normal read access after Last.fm's break, a naturally
uncached row, then consented pagination through 300 real (non-skeleton) rows.
Keep the shared pause until normal explicit resume; no background retry is armed.

## Latest user acceptance — unresolved; handed over

Jay reports that v0.9.13 still takes 20–30 seconds to show the correct artwork
alongside ranked track text. The latest screenshot appears to be Lucki's Tracks
table, with BIGGAVEL, BBY GOAT, NEEDED and other rows blank. Its exact route has
not been verified. This supersedes the earlier ready-for-Reload status.

The checks below proved native scrobble previews and faster appends on
DCCXX/library history; they did not prove cold ranked Tracks first-paint timing.
No further runtime patch was made. Jay requested a fresh-chat handover:
**ARTWORK_HANDOVER.md** records the exact baseline, code path, evidence limits,
inspection access and next trace. HEAD: 6af06f7, branch preferences-page;
handover-only documentation changes follow that clean checkpoint.

## v0.9.13 candidate — prior history verification, not final acceptance

Branch preferences-page; clean starting baseline c8349d8 (v0.9.12).
Jay authorised finishing verification after the earlier allowance checkpoint.

Signed-in tracing on DCCXX/library confirmed Unicorn Quest™, Paradise Island
and Vida had loaded No Bad Memories images and valid scrobble tags, but the
extension hid them while individual history requests waited in its serial queue.
The native response was not missing the images. A real page-three append took
6544ms, including about 1474ms for the request and the four-second preparation
window. Evidence: test-results/library-trace-before.json,
library-observe-before.json and library-page-before.json.

The candidate retains a native cover only when its album link and label match
that exact scrobble's tags, then replaces this temporary preview with the proved
most-used album. Previews are not persisted as winner records. Unrelated
compilations remain hidden. Detached scroll preparation no longer waits four
seconds, and pagination precedes queued artwork reads while preserving pacing
and rate pauses. Incomplete forms cannot create a permanently hidden jobless row.

The full regression gate passed 59/59 suites (test-results/v0913-final.log).
After the PC restart, the four focused artwork/history, batch, priority and
release suites passed again (test-results/v0913-resumed-checks.log).

The restarted installed profile confirmed runtime v0.9.13 and all three original
rows with visible, downloaded No Bad Memories covers and matching album links.
None of the initial 50 covers was hidden. The seven-second timer probe delivered
70 callbacks with a 103.4ms maximum gap. Because the launched browser window was
backgrounded, these probes used CDP focus emulation and restored it afterwards;
they do not replace Jay's foreground Reload acceptance.
Evidence: test-results/library-verified-live.json and library-v0913.png.

Actual pagination reached 199 rows. Page two appended in 1424ms and page four in
2522ms; their requests took approximately 893ms and 876ms respectively. These
are different batches from the earlier 6544ms page-three baseline, not a fixed
speedup guarantee. All first ten sampled page-four covers were downloaded and
visible as validated scrobble previews when insertion was observed. White Folk
initially had no winner cache record but retained its Fully Loaded cover/link;
the actual lookup then proved Fully Loaded at 1/1 scrobbles, saved sourceVersion
3 evidence and kept the same displayed image. The 199-row timer probe continued
with a maximum gap of 399.3ms. Evidence: test-results/library-page-after1.json,
library-page-after3.json, library-scroll-live.json and library-scroll-v0913.png.

One page-three HTTP-200 response failed the existing layout check before append.
The user's Try again action was exercised once: a valid response contained Today
and Yesterday sections and appended 49 rows with the existing order/duplicate
guards. A breakpoint trace confirmed tableIndex 0 and two valid source tables
on that retry; no speculative table-selection fix was made. The first failure's
body was not retained, so its server-side reason is unknown.
Evidence: test-results/library-page-after2.json and library-page3-failure.json.

The 39-file ZIP independently matches every source byte and recorded hash.
Archive size: 281168 bytes. SHA-256:
21d6cf39ead0dfcea9d9d8fe819808d12137e43f041b87d6715e217a866c557c.
Evidence: test-results/v0913-package-verification.json. Cold winner discovery
still needs paced Last.fm responses; unknown or unrelated images remain withheld.
Identity, preferences, undo data, scan records and network pauses were preserved.

## v0.9.12 verified checkpoint

Installed candidate: **v0.9.12 beta**, branch preferences-page. Baseline: 618afce.
v0.9.11 is withdrawn after Jay reported freezes during normal browsing.

The reproduced defect is an href feedback loop: artwork restored an unprotected
album URL while redirect protection immediately added +noredirect again. Both
MutationObservers ran repeatedly without yielding. Artwork now accepts the
protected URL when it identifies the exact same album. No resolver, pacing,
storage, native editing or scrolling policy was changed in this correction.

The bounded regression failed at 101 observer deliveries before the correction.
It now covers Travis Scott and Lucki cached winners, appended rows, and live
redirect opt-out/re-enable. An initial state-copy approach was discarded because
the option transition exposed the same race. The final fix compares URL identity.

The actual signed-in protected Lucki test became unresponsive after its initial
lookups; page inspection and a new Playwright connection timed out. Only that
owned test tab was closed. The recording also showed hidden recent-track covers.
In the corrected profile check, all 20 covers loaded and timer callbacks continued.
The artist overview remained responsive while cold lookups continued. A real
next-page attempt was stopped by Last.fm's shared rate warning; that pause is
retained, and this run does not certify a successful live scroll append.

The final fresh signed-in Lucki tab confirmed the active v0.9.12 runtime. Five
sampled personal Freewave 3 covers were loaded with protected album links; timer
callbacks continued (65 ticks, maximum gap 566ms during the seven-second probe).
Cached covers applied while the stored rate pause prevented further requests.
Evidence: test-results/freeze-final-live.json and freeze-final-clean.log.

The complete final gate passed 57/57 suites, including the combined observer
regression, scrolling, native editing, storage preservation and Reload startup.
Evidence: test-results/v0912-final-combined.log. Fixtures cover appended rows;
they do not replace the blocked live append check described above.

Package audit: all 39 ZIP entries match their source bytes and recorded hashes.
The v0.9.12 archive is 279154 bytes; SHA-256:
6c816c20893110259ba9c2076c536aac727484a5af37394932676870bbdd0104.
Evidence: test-results/v0912-package-verification.json.
Uncached metadata can still take time; this fix does not promise instant covers.
All original preferences, XML undo, legacy scan records and extension identity
are retained. The extension is returned to its original disabled state after
verification; Jay can Reload and re-enable the installed folder.

## v0.9.11 withdrawn candidate

Installed candidate: **v0.9.11 beta**, branch preferences-page.
Baseline: 9ae8197. Combined artwork feedback; one Reload version.

Unverified covers and album links remain hidden until the selected personal album
is proved. Fresh sourceVersion-3 winners apply immediately; stale records remain
hints. Scroll batches prepare cached/shared pairs while detached, then allow up
to four seconds for the first ten cold rows before insertion. New rows and image
attributes are processed locally rather than rescanning the growing table.

Exact personal album headers and validated track counts are reused across sibling
tracks, including detached ranked rows. Ranked lists make at most one new album
guess per track; one-play tracks use individual history unless existing counts
prove the winner. Missing blank-tag title albums do not trigger an additional
useless own-album request. Shared serial pacing, rate-limit pauses, scrolling
consent and checkpoints are unchanged.

Public artist roots and Tracks lists use personal winners. A verified empty
personal history permits only the exact track's explicit source-album association
from Last.fm, kept in page memory. Public artwork access does not grant native
editing, preference writes or other-profile access. Broken selected-image sizes
also recover on public artist lists.

Actual signed-in Supermium checks:

- Five actual Yes loads reached 300 Yeat rows with no page errors. The first
  inserted frame contained verified covers and album links for ranks 51–60,
  151–160 and 201–210, plus nine of ten sampled rows at 101–110. Cold ranks
  251–260 mostly remained hidden during their individual lookups. This is
  preparation evidence, not a guarantee that all 300 unseen covers load at once.
- Page-load elapsed times (including shared queue, network and preparation)
  were 2.8s, 8.4s, 2.4s, 6.4s and 11.5s. Two missing loose title-album pages
  terminated as unavailable rather than looking as though they were loading.
- Public William Basinski initially exposed a real worker scope failure:
  artwork-cache access was rejected because the worker's own URL is an extension
  URL. The URL guard now uses an explicit Last.fm base; a failing worker-origin
  regression and unpacked public-cover integration reproduce and verify the fix.
- Last.fm confirms no personal history or exact source-album association for
  dlp 1.1.1, dlp 1.1.2 and dlp 1.1.3. Those slots remain unavailable. The separate
  dlp 1.1 recording has album metadata; it is never substituted for these variants.
- The corrected public runtime settled on six personal winners with loaded 64px
  images and matching links, plus the exact public 92982 association for 92982.3.
  That catalogue-only result was absent from the personal-winner cache. On a
  cached revisit, all six personal pairs applied 301–368ms after their text, with
  cache access successful. Cold requests in this trace took roughly 5s per page
  including pacing; first-ever resolution still took over a minute for the list.
- A final-runtime Yes append inserted ranks 51–100 in 1.86s. Every sampled
  rank 51–60 had its verified personal cover URL and album link in the first
  insertion frame. Owned live-test tabs were closed afterward to stop test reads.

Evidence: test-results/batch-live.json, batch-live-300.png,
batch-public-live-worker-failure.json, batch-public-live.json,
batch-public-live.png, batch-public-revisit.json, batch-public-revisit.png, batch-final-scroll.json,
batch-public-details.json and batch-worker-origin-fixed.log.
Cold loose tracks can still require individual paced Last.fm responses. The
four-second preparation budget is not a promise of instant artwork. No whole
library crawl, storage migration, new permission or scrobble edit was made.
Old Last.fm tabs still need refresh after extension Reload to release old contexts.

Final combined gate: **56/56 suites passed** (test-results/v0911-combined.log),
including actual unpacked artwork/scroll, public selected-image recovery, native
editing, redirect, XML/undo, storage, startup and desktop/mobile release-site checks.
No test failures remained in that combined run. Earlier reproduced failures are
retained separately as evidence.

Windows independently extracted and hash-matched all 39 runtime files in the
278,938-byte ZIP (test-results/v0911-package-verification.json). ZIP SHA-256:
edce8395a06605760231cb5a7d122775031d5e31e69b4da8bacae98b313184e1.
Package: dist/lastfm-personal-library-0.9.11-beta.zip. No publication or push.
Rollback source: 9ae8197; the installed folder/identity/storage were retained.
Jay's normal browsing acceptance remains the final Reload check.

## v0.9.9 prior candidate — nearby artwork preparation

Baseline: b71710a. Bounded artwork preparation before rows enter the viewport.

Artwork previously started only within 100px of the viewport. The real signed-in
FiGure5 row took 13,432ms after scrolling into view to resolve I5U5WE5. The shared
request queue is serial and retains its 1,500ms pacing and rate-warning stops.

Already-loaded rows now start artwork resolution up to 1,200px below the screen.
Actual on-screen rows retain priority; an off-screen album-less row cannot cancel
a visible lookup. After choosing Always, next-page loading also starts 1,200px
ahead. Initial consent, Yes/No behavior and the 500/1,000-row checkpoints remain.
No whole-library crawl, request concurrency increase, storage migration or new
permission. Cached verified winners still use the existing immediate application.

Signed-in v0.9.9 verification in the installed Supermium profile:

- A new appended rank-51 row resolved to Snot or Not while still 471px below the
  viewport; the batch/album reads took about 8.5s, before the row entered view.
- Initially blank appended Versus resolved to MADNESS; its actual painted image
  was checked with a viewport capture. This was not a timed cold-row comparison.
- On a cached revisit, Lif3's cover applied/loaded 566ms after its text; FiGure5
  took 156ms. Scroll-added Versus applied after 68ms and loaded after 321ms.
- An invalidated hidden DCCXX profile context held the global request lock for
  over ten minutes after extension Reload. A normal-tab inventory missed it;
  direct target inspection found it. Refreshing that target, after confirming
  both checkboxes matched defaults and there was no unsaved input, released it.
  This candidate does not add automatic recovery for invalidated old contexts;
  existing Last.fm tabs still need refresh after an extension Reload.

The look-ahead and early-page-loading regressions both failed before their fixes.
Focused tests cover initial/appended preparation, visible priority (including
album-less cancellation), bounded distance, profile isolation and scroll consent.
Evidence: test-results/v099-live-before.json, v099-live-after.json,
v099-live-blank-ahead.json, v099-live-blank-window.png, v099-cached-timing.json,
v099-hidden-target.json, v099-focused.log and v099-priority-focused.log.

First-ever lookups can still take seconds, particularly on an immediate jump or
manual Yes load. Preparation reduces waiting while scrolling; it does not make
Last.fm responses instantaneous. No whole-library latency guarantee is claimed.

The first combined gate passed 54/54 suites. After the album-less priority guard,
53/54 passed; scroll-history missed a request because it installed its listener
after clicking Yes. Registering that listener before the click corrected the
test race, and its focused rerun passed. The other 53 suites need no rerun for
that test-only edit. Logs: v099-combined.log, v099-final-combined.log and
v099-scroll-history-fixed.log. All 54 suites are verified across these runs.
Windows independently extracted and hash-matched all 39 runtime files in the
268,957-byte ZIP (v099-package-verification.json). ZIP SHA-256:
c8e6eda41824d3bd6515294c497ab547f4c470b8734f676f9d12be57550c3c41.

## v0.9.8 prior candidate — signed-in artwork parsing

Baseline: 83cb6d8. Signed-in Supermium defect isolated and corrected.

The real signed-in history response for lucre 5 contained 18 valid LUCRE
scrobbles plus 49 empty rows in a chartlist__placeholder loading table.
The LUCRE album response contained seven valid tracks (120 plays in total)
plus six empty loading rows. Both artwork readers included these skeletons,
then rejected the response. Waiting could never resolve the hidden image.
Both readers now exclude only explicitly marked placeholder tables; validation
of every real row, exact artist/album identity and majority counts remains strict.

The regression reproducing those signed-in skeleton tables failed before the
fix, then all three focused artwork suites passed. Live v0.9.8 was reloaded in
the existing approved Supermium profile with identity/storage preserved:

- Initial lucre 5: LUCRE, 18/18, visible loaded 64px image and exact album link.
- The actual Yes button appended ranks 51–100. Rank 53, 3dash snow dubs stereo
  test1 new fx, initially had a hidden placeholder. Its normal queue rendered
  BM2  KWAKE DUBS 2021, matching all nine real scrobbles despite 49 skeletons.
- Both actual painted covers were checked with viewport screenshots. Initial
  compositor screenshots were unusable; direct viewport capture succeeded.

Local evidence: test-results/live-artwork-trace-20261020.jsonl,
v098-live-window.png, v098-live-scroll-window.png, v098-before.log and
v098-focused.log. Shared readers cover all artists and appended rows; the
synthetic mixed-library regression covers additional artists, cold history,
native scrobbles and profile isolation. This is not an audit of every library
track. Unseen albums still require paced requests; unavailable art is unresolved.

The final combined regression gate passed **53/53 suites**
(test-results/v098-combined.log). Windows independently extracted all 39
files from the 268,333-byte package and matched every SHA-256 to the source
audit (test-results/v098-package-verification.json). ZIP SHA-256:
412b77befd7e41ecdab22ca6a9d97eaf09907840b9e2230bd18c4ee0c1a40215.

## v0.9.7 prior candidate — signed-in acceptance failed

The shared album-count recovery was limited to an individual artist URL, and
only tracks already rendered could contribute saved album hints. It now also
runs on the mixed-artist library Tracks page. Saved hints from off-page tracks
are registered once per page generation, including artists reached by scrolling.
Each artist retains its own five-album candidate bound. Exact personal track
counts and album-header identity still prove each winner; matching song/album
names from another artist cannot contribute evidence. Cold tracks retain their
individual history lookup. No data migration, permission or request-pacing change.

The new actual-unpacked mixed-library regression fails on v0.9.6 and passes the
correction: initial rows, new artists after row 50, off-page legacy seeds, same
titles across artists, unrelated seeds, cold history, cached revisit and native
Scrobbles rows appended by scrolling. The latest scrobble's minority album must
not replace its track's most-used album. Six focused suites passed
(test-results/v097-focused.log). The final combined gate passed 53/53 suites
(test-results/v097-combined.log), including 101 uncached scroll-added tracks,
album-view covers, native editing, profile changes and preserved stored data.

Windows independently extracted all 39 files from the 268,275-byte v0.9.7 ZIP
and matched every SHA-256 against the source audit
(test-results/v097-package-verification.json). ZIP SHA-256:
105f5c0c003c302e991388e3da5eee463b2cfd9e2c327b25ef1682e0beb4ca7b.

The public DCCXX library Tracks page was reached and its 50-row artist/track
identities and data-stat-value counts inspected. It is logged out. Isolated
unpacked extension checks do not certify Jay's signed-in session. Cached covers
can paint immediately; discovering an unseen winner still requires Last.fm
responses. No guarantee is made for unavailable metadata or missing artwork.

## v0.9.6 evidence and prior acceptance history

Baseline: 7ffd7a9; focused legacy-cache correction, signed-in acceptance pending.

Read-only inspection reached the active Supermium extension's artwork storage.
Its lucre 7 record is dated 6 October and lacks sourceVersion; LUCRE siblings
are absent. v0.9.5 required a fresh sourceVersion 3 winner to seed album counts,
so its fixture did not represent this installed cache. No stored data was changed.

Legacy/stale non-fallback winners now supply album-name hints only. Exact current
own-library album counts must prove each track's winner; an exact album header
must provide fresh artwork before a hint can resolve anything. Old image URLs
are not promoted to verified artwork. Existing fresh-cover behavior, request
bounds, profile isolation, storage format and permissions remain intact.

The actual public source reader resolved lucre 5 to LUCRE (18/18), and the live
LUCRE album exposed matching track counts summing to 120. Both inspectors remain
logged out, so these reads do not certify the installed signed-in queue/forms.

The new unpacked regression fails against v0.9.5 and passes this correction:
legacy cache, refreshed image, initial/appended rows, majority proof, insufficient
counts, cached revisits and profile/preferences preservation. Four focused suites
passed (test-results/v096-focused.log). Final album-header rejection and release
checks passed 2/2 (test-results/v096-final.log). The 39-file ZIP was independently
extracted and all hashes matched (test-results/v096-package-verification.json).
ZIP SHA-256: a0157a2611c371c35c65ff96b35df99bf127eb7b164eb10e75138e461514bde6.
No full-suite rerun or
signed-in visual acceptance is claimed. Prior failed candidate follows.

**Live acceptance failed:** Jay's 20 October screenshot still shows blank
lucre 1–6 and A_X covers on Dean Blunt's full Tracks page. v0.9.5 is not an
accepted fix for this defect.

The earlier follow-up inspection could not reach the failing signed-in runtime: Computer
Use lists only the empty in-app browser/MCP Apps surfaces, and the running
Chrome/Supermium processes expose no remote-debugging-port flag. The separate
DevTools browser initially received Last.fm's Temporarily Unavailable page (body said
Error 503) for the exact Tracks URL. It subsequently recovered. That response does not establish
the cause in Jay's tab.

The v0.9.5 regression assumes a fresh sourceVersion 3, non-fallback LUCRE winner
is cached for lucre 7, and ranked rows expose data-stat-value. Neither assumption
has been observed in the failing signed-in tab. A visible lucre 7 cover alone
does not prove it can seed the shared album reader. Before another runtime fix,
inspect a failing row's job/error, the cached lucre 7 record's freshness/source,
and the actual history/album response and count markup. Preserve saved data;
do not repeat the short-ID/header theories, clear caches, or treat fixture
passes as evidence that this live defect is fixed.

Artist Tracks album-count reuse baseline: 6bcd73e (v0.9.4 beta).
Broken image recovery baseline: 9522e18 (v0.9.3 beta).
Redirect protection baseline: 2e7420f (v0.9.2 beta).
Scroll consent and page-overlap baseline: 881fe1b (v0.9.0 beta).
Library-wide XML casing framework baseline: b134285 (v0.8.3 beta).
Scrolling/artwork recovery baseline: ff6fc13 (v0.8.2 beta).
Artist Tracks correction baseline: c4ef360 (v0.8.1 beta).
Album-view correction baseline: b391802 (v0.8.0 beta).
Beta preparation baseline: 7de6c8d (v0.7.0).
Finishing baseline: 2180539 (v0.6.15).
Scrolling reactivation baseline: c4c0270 (v0.6.14).
Interaction/history baseline: 7366f06 (v0.6.13).
Unassisted maintenance baseline: 1f21384 (v0.6.12).
Cover recovery baseline: a60f097 (v0.6.11).
Placeholder correction baseline: e6d87ff (v0.6.10).
Startup correction baseline: 695e220 (v0.6.9).
Scrolling correction baseline: ff7ae0d (v0.6.8).
Correction baseline: ae100ec (v0.6.7).
Artwork feature baseline: 74ce8ba796c9d39e8c42a7a18060969935cd33c1 (v0.6.2).

## Artist Tracks album-count reuse (v0.9.5)

Dean Blunt's public Tracks page reproduces the native LUCRE placeholders. The
public lucre 5 history was read successfully: all 18 plays name LUCRE; the
album overview supplies image 6da014dd54bb1082a3a51218fcbf7a89. Subsequent history
reads returned HTTP 600 intermittently, also on normal navigation. One success
with Accept: text/html did not repeat, so headers were not changed. The initial
short-ID theory was disproved before any runtime change: that captured ID has
32 digits. Public inspection does not establish Jay's signed-in queue state.

Previously the shared album-count reader only worked on artist overview pages,
not /+tracks. A fresh, verified cached LUCRE track could already display, while
each blank sibling still needed its own failing history read. Artist Tracks
pages now seed up to five exact albums from fresh verified track winners on the
page. Existing bounded own-library album reads prove each new track's winner
against its all-time total, including appended rows. Thirteen of eighteen plays
prove a winner; five of eighteen do not. Ties/uncertainty retain the individual
history reader. Unfiltered views only; source identity, native fields, starred
cover, links, request pacing, rate-limit stops and data formats are preserved.

This reduces repeated history requests; it cannot reconstruct unavailable
metadata. With no fresh known album, or if both album and history requests fail,
the correct cover remains unresolved. No claim of universal instant loading or
signed-in acceptance is made. The original broader live blank-cover issue below
remains an acceptance item.

The new actual-unpacked regression fails on the previous runtime and passes
with shared album counts: initial and scroll-added tracks paint/link correctly
without their unavailable histories, insufficient counts never guess a winner,
and cached revisits/profile/preferences are preserved. Focused gate: 4/4 suites
(test-results/v095-known-before.log and v095-known-focused.log). The combined
gate passes 51/51 suites (test-results/v095-combined.log), including existing
artwork authority, native edits, scrolling, startup, storage and XML checks.
The actual public LUCRE 64s image also decoded successfully at 64x64.

Windows independently extracted the 39-file package; all files match the tested
source and package audit (test-results/v095-package-verification.json).
ZIP: 265,569 bytes; SHA-256
57ad63f41b2432a9328aebb61432385a4c0d742a6f896aabbf9530a531c51337.

Jay supplied a live screenshot confirming Drug Church's repaired portrait after
v0.9.4. That acceptance covers the portrait, not unresolved track placeholders.

## Broken artist and album images (v0.9.4)

The previous runtime had no handler for failed native image loads. A failing
actual-unpacked regression reproduced broken artist and album derivatives while
the same image remained available at another size. Recovery now checks native
load errors and failures already present at startup, including scroll-added rows
and failed responsive sources. It probes 300x300 then ar0 using the exact image
ID/file type, committing only a successfully decoded source. Personal artwork
uses that repaired source instead of repeatedly restoring the failed thumbnail.

Only the connected profile's chartlist/header images participate. Working images,
alt/title text, links, styling, selected photo/album identity and saved data stay
intact. Two probes per image ID, two active jobs, five-second probe deadlines,
256 in-memory jobs and viewport gating bound requests and memory. Failures do
not trigger history or HTML-page reads. Deleted/fully blocked images remain
unavailable; generic placeholders still belong to the existing selection logic.

The new real-unpacked image-recovery suite verifies native startup failures,
artist/album recovery, failed srcset and lazy-loader rewrites, scroll-added rows,
visible-element failure after a successful probe, personal-cover coexistence,
stale preference protection, offscreen deferral, finite failures and friend/data
isolation. Before log: test-results/v094-image-before.log. Focused integration
passes image-recovery and artwork-extension (v094-image-integration-final.log).
An initial focused run exposed an undefined-record comparison for non-CDN image
names; the guard was corrected before the final passing integration run.

Drug Church's public photo ID 6696583a8c279d9b0534d98d51140fe8 returned actual
JPEGs at avatar70s, 64s, 300x300 and ar0 during investigation. The original
signed-in failure could not be inspected: the attached DevTools browser has no
Last.fm session and direct public page fetches return a Client Challenge.
Therefore alternate-size recovery is verified in isolation, while Jay's actual
Drug Church page remains the Reload acceptance check.

A separate isolated unpacked-browser check forced the native thumbnails to fail,
then loaded the real public Drug Church portrait and Hygiene cover from Last.fm's
CDN. Both decoded at 300x300; the screenshot was visually checked
(test-results/v094-public-cdn.png and v094-public-cdn.json). This uses public
images in a constructed page, not Jay's signed-in library.

The 39-file package was independently extracted by Windows and every file/hash
matched the tested source (test-results/v094-package-verification.json).
ZIP: 264,067 bytes; SHA-256
c727a14fd59b8849b7ae3b4f9e435c690a873d809e234e35822296127c9518bb.
Final combined gate passed 50/50 suites (test-results/v094-combined.log),
including existing artwork, startup, redirect, scrolling, native editing,
storage and XML checks. No signed-in acceptance is implied by these checks.

## Artist redirect protection (v0.9.3)

Exact Travis Scott and Lucki links gain +noredirect in the connected profile
and their public music pages, including albums/tracks and scroll-added rows.
Already canonical Lucky Twice / Travi$ Scott links require validated original
native scrobble evidence before repair. Other profiles, genuine Lucky Twice,
image galleries and native edit forms retain their original behavior.

The shared read queue applies the same routing and rejects another returned
artist. Pagination accepts only equivalent direct/bypass paths, preserving
filter and page checks. The new default-on setting can restore native hrefs
immediately; old backups remain supported without a startup migration.
No permissions, identity, saved rules, XML undo or legacy record changes.
Scope, sources, acceptance and limits: docs/REDIRECT_PROTECTION.md.

Combined gate passed 49/49 suites (test-results/v093-combined.log), including
redirect URL/storage, actual unpacked scrolling, artwork read/native-edit,
settings, startup Reload and existing XML/artwork/history checks. Settings UI
was visually checked. Windows extracted all 38 runtime files and matched their
SHA-256 values to tested source (test-results/v093-package-verification.json).
ZIP: 255,909 bytes; SHA-256
e6ce50ca191e4c267964c5683ee342910705f0b9b29f414a3a33427b1817f4d5.
Signed-in Last.fm acceptance remains Jay's reload check; fixtures do not certify
Last.fm's actual catalogue, global statistics or account setting.

## Compact scroll prompt (v0.9.2)

Baseline: 7217c0d. Removed the explanatory hint beneath “Load next page?”
and prevented Yes / No / Always from wrapping onto separate lines. Loading
choices and ten-page checkpoints are unchanged.
Scroll-consent and release checks passed (2/2). The real content script and CSS
were visually checked at 770px panel width and a 360px viewport; all buttons
share a row. Rebuilt the 37-file v0.9.2 beta ZIP (246,526 bytes).

## Scroll consent and history overlap (v0.9.1)

Every fresh library view asks “Load next page?” with Yes / No / Always. Yes
loads one page, No stops this view and restores native pagination, and Always
enables automatic scrolling only to the next ten-page boundary. The initial
page counts, so the first checkpoint is 500 rows on a normal 50-row list, then
1000. No saved settings, preferences, XML undo or legacy scan formats changed.

A reproduced warning/resume fixture showed shifted offset pages repeating
already loaded plays and date headings. History joins now compare verified
timestamp/artist/track identities, omit overlaps and reject unseen out-of-order
rows before insertion. Genuine repeated listens at different timestamps remain.
Requests stay serialized; explicit resume is reserved before clearing a pause.
Constructed evidence does not establish the precise signed-in response Jay saw.

Focused checks: scroll-overlap and scroll-consent pass; existing library-scroll,
scroll-history, scroll-toggle, scrobble-sections and actual unpacked XML import
pass with explicit consent. Combined gate passed 46/46 suites (v091-combined.log).
Windows extracted and matched all 37 runtime files against the audit and tested
source (v091-package-verification.json). ZIP: 246,892 bytes; SHA-256
2c34bb349e7ae243abf8bd4a89b4c19302aad5d40c393cfda707c3b79d977ee1.
The actual unpacked prompt was visually checked (scroll-consent-panel.png).
Logs: test-results/v091-overlap-before.log, v091-scroll-focused.log and
v091-scroll-guards.log. No artwork correction or signed-in acceptance claimed.

## Library-wide XML casing framework (v0.9.0)

The existing streaming XML import now has artist, album, song and album-artist
selection controls spanning every result page and the active search. Display
names links directly to import. Exact source spelling is retained without title
case conversion. Existing differing preferences remain unchecked until selected;
conflicting XML casings require a choice. Apply and persistent selective Revert
reuse the unchanged sole-writer storage contract.

The XML adapter now uses a source-independent, versioned metadata collector;
Library Doctor can later supply the same reviewed name records. Only four name
fields enter the plan; private paths/IDs are discarded. No connection to Library
Doctor, new permissions, user-data migration or live music-library edits.
Contract and future integration boundary: docs/LIBRARY_CASING.md.

Focused checks passed: shared collector (5000 songs), existing 128 MiB parser,
review controls across search/pagination, and actual isolated unpacked import.
That integration verifies exact names on initial and real infinite-scroll rows,
friend isolation, persistent Revert, later manual edits and legacy-record
preservation. Logs: test-results/v090-casing-focused.log (collector/parser pass;
new fixture interaction assumptions corrected), v090-casing-ui.log (2/2 pass).
Combined regression gate passed: 44/44 suites (v090-combined.log). Windows
independently extracted and matched all 37 runtime files against the audit and
tested source (v090-package-verification.json). ZIP: 242,199 bytes; SHA-256
a1108ad66193dfb943b59bde71bc33762111c1a8a8417d8f463be68deffcb924.
Constructed tests do not certify signed-in Supermium or Doctor integration.

## Unresolved live artwork follow-up

Jay still sees blank covers around ranks 42/53/55/57 after infinite scrolling.
Investigation baseline: 8beff8c. No runtime correction or new release is claimed.
The actual-extension scrolling fixture now uses 101 distinct uncached tracks
instead of one repeated cached track. It exercises ordinary competing jobs as
well as the initial/imported placeholders and temporary-response recovery.
The focused actual-extension test passed (1/1, 35.165 seconds); log:
test-results/v084-uncached-scrolling.log. This does not reproduce the live fault.

The public full Tracks page is accessible and supplies the generic placeholder
for FiGure5 [INTERLUDE]. In its real CSS the hidden image remains a 32px box and
IntersectionObserver reports it intersecting, ruling out that simple visibility
hypothesis. Public history and artist-detail fetches return HTTP 600; they do not
show the signed-in failure. Native Computer Use lists Supermium but window
binding fails: "window id ... no longer belongs to Chrome; current owner is
Chrome". No native app input was sent. Jay asked us to collect the popup result
ourselves; the alternate browser connection also failed to answer within a
bounded 20-second check. No additional Console/reload homework is requested.
Runtime work waits for direct evidence of the failing queue/reader step.
Signed-in acceptance is open. The v0.9.0 XML framework leaves this artwork
behavior unchanged; no artwork fix is claimed.

## Scrolling/artwork recovery (v0.8.3)

Jay reports blanks after infinite scrolling starts. The real page-2/page-3
insertion test initially passed unchanged. A separate failing regression proved
that one temporary history error permanently stranded an otherwise resolvable
cover during scrolling. Recovery now waits ten seconds and retries once while
visible, using the existing paced queue. Other covers continue during backoff.
Metadata refusals, rate warnings and native writes do not auto-retry. Profile
changes cancel recovery; hidden tabs suspend it. Album selection is unchanged.

The new actual unpacked-extension integration covers 101 rows, a temporary
rank-42 failure, imported rows 53/55/57/101, loaded images and album links,
preference preservation and removal of completed scroll controls. Focused
guards cover persistent failure bounds, invalid metadata, rate stops, hidden
tabs and profile changes. All 42 suites are verified: the combined gate passed
41/42, with only the new test's first-install setup tab racing its Last.fm
navigation. The fixture now waits for that owned setup page before navigating;
its focused rerun passed (1/1), without a runtime change. Logs:
test-results/v083-combined.log and v083-scroll-startup.log. The original
temporary-response regression failed first (v083-transient-before.log).

Windows independently extracted and matched all 36 runtime files against the
audit and tested source. ZIP: 237,752 bytes; SHA-256
bde6d798574d2eacde9101db6523d87006dafc1b541d1064eff70379ed659ffb.
Report: test-results/v083-package-verification.json. The extracted package also
passed actual isolated-extension onboarding, profile/record preservation and
no-automatic-write checks (1/1; v083-extracted-install.log).

Chrome DevTools reached the public full Tracks list (50 native images). Public
track-history and album pages returned HTTP 600. Signed-in Supermium remains
unverified; this reproduced recovery defect is not a confirmed diagnosis of
Jay's current page. No Console homework, data migration, user-profile access,
scrobble edits, permissions change or publication. Rollback source: ff6fc13.

## Artist Tracks artwork (v0.8.2)

Jay reported a blank FiGure5 [INTERLUDE] cover on Homixide Gang's full Tracks
list despite 12 scrobbles tagged I5U5WE5. Public page inspection returned a
Client Challenge. A targeted regression reproduces the parser's rejection
when a native album tag is present but the album-artist tag is omitted.

Read-only lookup now validates a detached form copy with an empty album artist,
then uses the track artist for the tagged album. Raw tags remain authoritative;
malformed/duplicate fields still fail and native edit validation is unchanged.
The regression verifies rank 42, a later appended mixed-album row, actual image
loading and links, shared cover reuse, preference preservation and a cached
offscreen revisit without requests. Album-view behavior remains unchanged.

All 40 suites verified: the combined run passed 39/40; artwork's old negative
fixture still required the now-optional album-artist tag. That fixture now omits
the album tag instead, retaining the missing-album refusal check. Its focused
rerun passed (1/1). The new artist Tracks regression passed before that rerun;
all other combined suites, including actual extension injection, passed.
Independent Windows extraction verified all 36 runtime files against the audit
and tested source. ZIP: 236,622 bytes; SHA-256
028024b41dc85f11da6b3c01f8d391b6d8fb46dca02b6aef371565a05f745516.
Logs: test-results/v082-before.log, v082-artist-tracks.log, v082-combined.log,
v082-artwork-contract.log and v082-package-verification.json.
The extracted ZIP passed actual isolated-extension onboarding, profile/record
preservation and no-automatic-write checks (1/1 suite); log:
test-results/v082-extracted-install.log.
Signed-in acceptance remains pending; no Console diagnostics are requested.
Rollback source: c4ef360. No identity, permissions or storage formats changed.

## Album-view artwork (v0.8.1)

Jay reported inconsistent track covers on his DANGEROUS SUMMER album library
page. General per-track discovery was running without an album-view override.
A regression reproduced different-release covers and blank placeholders.

Exact own album views now verify the header's public album link against the URL,
then reuse its real cover for every main-column track row and image link, before
cache readiness or network scheduling. Guest artists, late rows and native lazy
rewrites are covered. Header preferred-cover changes refresh the rows. These
view-specific covers do not write the global winner cache or any preferences.
Artist/general lists retain most-scrobbled-album selection. Other profiles and
sidebars stay native. Missing or mismatched headers cannot supply another album.

Focused album-view and actual unpacked-extension checks pass. Combined gate:
39/39 suites passed, including native editing, artwork/cache isolation, XML,
scrolling, beta defaults/guards, packaging and startup. Independent Windows ZIP
extraction verified all 36 files against both the audit and tested source.
The ZIP is 235,934 bytes, SHA-256
8f0b03f295cb61b6f7af4be91d78095d6bdb1627067b4471b6702272ec0e9de9.
The extracted package passed actual isolated-extension onboarding, profile
isolation, preserved-record and no-automatic-write checks (1/1 suite).
Live public inspection returned Last.fm's Client Challenge; reconstructed fixtures
do not certify the current signed-in layout. Jay's one Reload and refresh remains
final acceptance. Logs: test-results/v081-combined.log, v081-focused.log,
v081-package-verification.json and v081-extracted-install.log.
Source rollback: b391802. No storage formats, identity or permissions changed.

## Public beta candidate (v0.8.0)

Jay authorised unassisted beta preparation with one version to Reload and test;
he will arrange the developer account. No public upload or submission was made.

Fresh installs now start disconnected and offer profile setup; existing settings
still retain DCCXX or the user's configured profile. XML selection waits for a
profile. Existing preferences, XML undo, artwork and legacy discovery records
are not migrated or reset. Automatic album-less correction and native capture
are unavailable in this beta. Both content and worker guards enforce this even
when an older saved enabled flag is true; saved records remain reviewable.

Original icons, local Help/Privacy, beta/version links, store text and three
1280 × 800 UI screenshots with fictional metadata are prepared. The static
download/privacy site is assembled in dist/site, with no external dependencies.
It was visually checked at desktop/mobile widths. Runtime distribution uses
an explicit 36-file allowlist, manifest at the ZIP root and per-file SHA-256.
The ZIP was independently expanded by Windows and every file hash verified.
The extracted package passed an actual isolated-extension installation check.

Combined gate: 36/38 passed initially. Artwork-extension and one library-scroll
fixture still assumed the old DCCXX default and timed out while disconnected.
Both fixtures now explicitly configure their intended profile and passed the
focused two-suite check; scroll-history fixtures were updated on the same basis
before their combined-run check. All 38 suites are verified. Initial failures
remain in test-results/v080-combined.log; focused and extracted-package logs are
v080-fixture-check.log and v080-extracted-install.log. Experimental album-less
algorithm tests explicitly override the beta gate in the test harness only.

Delivery: dist/lastfm-personal-library-0.8.0-beta.zip and matching checksum/audit;
release/PUBLISHING.md, STORE-LISTING.md and NOTES.md describe the handover.
The checksum is e1465f04d4bf25fcaf9b31cf691f76e391558d72d0d784701c3d8e7754617397.
Website address, real publisher/support information, live acceptance and store
submission remain publication gates. Jay's signed-in browser/storage was not
accessed. Export JSON, Reload the existing extension, then refresh Last.fm.
Cold artwork still needs paced requests; native editing/artwork need live testing.
Source rollback is 7de6c8d; an older enabled correction flag can become active
again in that version, so review/disable it before browsing after a rollback.

## Artwork, native editing and album-less rules (v0.7.0)

Jay authorised this follow-up after the earlier allowance-reset work stopped.
The old reset watcher is paused and was not resumed for this task.

Artwork now counts native scrobble album fields before canonical rendered links.
The failing regression selected Canonical instead of Personal Album; the corrected
reader selects the raw scrobbled album. SourceVersion 3 results refresh older normal
selections without hiding cached covers. Cached images/links do not wait for the
lookup queue, and a Last.fm lazy-loader rewrite cannot overwrite a resolved result.
First-time uncached album selection still needs paced server requests. No instant
cold-load promise or invented replacement for genuinely missing album artwork.

Native Edit track lookup accepts the user-confirmed representation where both
blank album fields are omitted. It still delegates to Last.fm on the current page,
keeps the menu action first, and saves casing locally. Single missing fields and
mismatched identities fail explicitly. Normal edits stay with Last.fm's handler.

Album-less capture, discovery and correction use separate modules and a new
worker-owned lfmAlbumlessV1 key. Corrections start disabled. Capture reads back the
exact edited play before remembering a future-only rule. Enabled checks use the
real native single-play form, preserve artist/title, remove bulk-edit flags, and
verify both fields afterward. Cross-tab claims persist before writes; uncertain
writes stop for review and never replay automatically. Old scrobbles are excluded.
Only a visible own-profile tab checks recent plays, every five minutes. No change
is made by this extension while the browser is closed.

Discovery prepares selectable candidates in explicit read-only batches of up to
20 pages, at least 12 seconds apart. Confirmed per-page progress survives pauses;
empty responses/rate limits stop without retries or skipped pages. The panel has a
manual network-resume control that starts no work by itself. Existing legacy scan
records remain inactive and unchanged. No historical crawl or signed-in edit was run.

Focused storage, transport, capture, correction, discovery and UI regressions pass,
including actual unpacked-extension settings/default-off checks. Combined gate:
33/34 passed; extension timed out at the 30-second service-worker startup wait.
That exact suite passed unchanged on retry (14.6 seconds), having also passed the
preflight gate (27.3 seconds). Initial failure and retry logs are retained in
test-results/v070-combined.log and v070-extension-retry.log. Host CPU/memory probes
were unavailable in the sandbox, so load is not claimed as a confirmed cause.
All 34 suites are verified, including native/local edits, artwork, scrolling,
storage, XML apply/revert/large-file parsing and test-runner failure handling.
The long artwork fixture measured an 8.9 ms median refresh with five context reads
over five refreshes; this is DOM work, not a signed-in network timing claim.
Signed-in Last.fm dialog/capture/new-play
acceptance remains pending; the tests use isolated profiles and reconstructed forms.

The startup test exposed a pre-existing Supermium reload race, reproduced against
the untouched 2180539 source: Reload during navigation can omit document_idle.
The test now enforces no dependency crash/data loss during that race and verifies
activation after the supported Last.fm page refresh. It does not claim Reload alone
reinjects an already open tab. Existing preference, XML undo and legacy keys are not
migrated, and manifest permissions remain storage-only. Source rollback: 2180539.

## Scrolling reactivation (v0.6.15)

Switching scrolling off/on or reconnecting the same profile used to discard
pagination progress while retaining appended rows. A failing regression reproduced
requests 1, 2, 2. Scrolling now suspends its controls/requests while retaining the
next page and completion state associated with those rows. Reactivation continues
with page 3; completed views stay complete. Browser-history restoration uses the
same lifecycle. Each callback checks its own request identity so an obsolete
success or failure cannot append duplicates or replace newer loading status.

Five focused suites passed: scroll-toggle, scroll-history, library-scroll,
scrobble-sections and smoke. They cover settings/profile round trips, late
success/failure cancellation, completion, pagination, dated sections, rate pauses
and display-name profile isolation. Storage formats and permissions are unchanged.
These are isolated checks with mocked Last.fm responses, not signed-in acceptance.
The actual unpacked-extension startup suite also passed on an unchanged retry
(12.4 s), after its first run timed out at the 3-second artist-name assertion
while host CPU measured 100%. Both logs are retained in test-results; no assertion
deadline was relaxed. Preferences survived Reload and fresh navigation.

The bounded maintenance queue completed. Its requested reset watcher subsequently
observed an advanced reset timestamp and was paused before the v0.7.0 follow-up.

## Interaction and browser-history corrections (v0.6.14)

Browser-history restoration retained appended rows but discarded the scroller's
next-page and completed state. A failing lifecycle regression reproduced requests
1, 2, 2 and duplicate rows after returning. A persisted pagehide now aborts active
loading and disconnects observation while retaining pagination progress. Returning
continues with page 3; completed views remain complete. Pending requests can be
cancelled and resumed without appending a late response or losing existing rows.

Preference Save/Delete/Undo controls now share a busy guard. Keyboard focus returns
to the relevant row after Save/Cancel, to Undo after Delete, and to the restored row
after Undo. External updates retain focus on existing row actions. A newer search
keeps focus when a pending mutation finishes. Storage conflict checks still apply.

Backup previews now belong to the latest selected file. A controlled slow-file
regression first reproduced an older file replacing the newer preview. Obsolete
reads and parse errors are ignored; previewing still writes no preferences.

Focused interaction, options, settings, scrolling and dated-section checks pass.
The combined gate passed 22/25 suites. Album navigation, artwork-extension worker
startup and the startup-timing suite hit timeouts while the host measured 100% CPU
and 2.66 GB free memory. Those exact three suites then passed on retry without
source or timeout changes (album 27.7 s, artwork-extension 23.7 s, startup 14.8 s).
All 25 suites are verified, retaining the initial 22/25 result and three retries.
These checks use isolated browser profiles
and mocked Last.fm responses; signed-in Supermium acceptance is not claimed.

## First unassisted reliability pass (v0.6.13)

The artwork refresh previously rebuilt the full artist/album context for each
queued song. A 200-song isolated browser fixture reproduced 1,000 context reads
over five refreshes, with a 373.1 ms median refresh. The same fixture after batching
reads that context once per refresh (five reads total), with an 8.8 ms median.
Rows, covers, exact album proof and the existing network limits are preserved.
This measures CPU work on the fixture, not first-time cover discovery or signed-in
loading speed. Progressive album selection still passes its dedicated check.

Settings saves now retain text/checkbox changes entered after the save began,
with an unsaved note, instead of overwriting the newer draft when the earlier
save finishes. XML casing-choice redraws retain keyboard focus on the same row.
Both defects were reproduced with failing browser regressions before correction.

`node tests/run.cjs` provides a combined gate, explicit suite selection, a browser-
free subset and a suite list. Failure/timeout handling is verified with actual
child scripts. It never loads the installed signed-in browser profile.

The combined isolated-browser and unit gate passed all 22 suites, including the
actual unpacked extension, startup timing, artwork, scrolling, settings, storage,
XML parsing/import/revert and test-runner failure handling. The combined artwork
fixture measured 10.2 ms per refresh; the earlier paired run measured 8.8 ms.
Preferences, storage formats, installation
identity and manifest permissions are unchanged. Rollback source checkpoint:
1f21384. Scheduled work/reset monitoring is described in MAINTENANCE.md.

## Cover recovery across artists

The user reported that the hidden placeholders remained white spaces after waiting,
on several artists. A failing regression reproduced a genuine resolved cover being
kept hidden because apply() restored an inherited visibility:hidden style. Resolved
images now explicitly become visible; profile restoration still returns native styles.

The real public Dean Blunt overview lists LUCRE seventh, with cover
6da014dd54bb1082a3a51218fcbf7a89. Its owned album page confirms 120 plays,
including 18 each for lucre 5/6/7, 17 each for 2/3/4 and 15 for 1. The public
album overview returned HTTP 502 during inspection. Placeholder tracks now skip
the bounded shared counting optimization and read their individual scrobble history.
Once that proves the most-used album, an exact matching loaded album-row cover
can be reused regardless of its position. A public-cover failure can also use
the exact own-library album header after artist/title/link validation. Cancellation,
rate pauses, unrelated headers and generic images remain rejected.

The production page reader fetched the real public lucre 5 history and selected
LUCRE (18/18), reusing the seventh album row. The production UI then applied that
result as a temporary cache record to the real DOM with an inherited hidden style:
visibility was visible, naturalWidth 64, and the link pointed to the LUCRE album.
An inline browser screenshot visually confirmed the yellow LUCRE cover. This
used a separate signed-out browser and in-memory test storage, not the user's profile.

Eight focused suites passed: artwork, shared totals, placeholders, recovery,
actual-extension artwork, startup, adapter and artwork storage. Recovery tests
also use a second artist with several albums, selecting the six-play winner over
the four-play recent album, and check genuinely loaded linked images. No saved
preference/settings/undo/scan keys, permissions or installation identity changed.
Signed-in acceptance is pending the user's Reload and refresh without Console steps.

## Generic cover correction

Public Dean Blunt rows confirm the generic image hash
4128a6eb29f94943c9d206c08e625904 inside span.cover-art for lucre 5/6.
The actual lucre 5 public history contains 18 LUCRE plays, repeating the same
edit-scrobble ID across different timestamp titles. The current reader was run
against that real DOM and selected LUCRE (18/18); its cover input came from the
public artist overview's LUCRE row, not a signed-in cover fetch.

Generic covers are now rejected by source selection and ignored when reading
the separate artwork cache. Their track image is hidden while awaiting discovery;
they have priority over ordinary uncached track jobs. Real black album artwork
remains valid. Successful replacements convert non-clickable cover spans to
album links. Profile changes restore the original markup and visibility.
Failed shared counts fall back to individual history; aborts and rate limits
still stop requests. Native timestamps distinguish repeated edit IDs across pages.
The selected album's primary/sharing images are used, excluding Similar Albums.
If no genuine album image is available, the slot stays empty; no image is invented.

Focused placeholder, artwork, album totals, actual-extension artwork, startup,
adapter and artwork-storage checks pass. Tests cover stale generic cache entries,
span restoration, multi-page repeated IDs, missing artwork and rate-limit boundaries.
No preference/settings/undo/scan keys are changed or cleared. Signed-in acceptance
remains with Reload and refresh when convenient.

## Startup correction

Reproduced all four reported errors in the actual unpacked extension by blocking
a parser script and Reloading after document_start, before document_idle. The
new extension context ran the idle features without the early shared modules:
content.js lacked LastfmRules, native-edit.js lacked its rules API, and both
artwork readers lacked LastfmAdapter. The idle script group now includes its
shared dependencies and artwork initializer in order. Those four modules return
when already initialized, retaining early cached covers and avoiding duplicate
artwork observers. No storage keys, installed path, permissions or identity change.

The new startup browser regression passed after failing with the exact four
reported exceptions before the correction. It also checks fresh navigation and
preservation of all saved test storage. Actual-extension artwork and XML/settings
checks passed, along with rules, adapter and storage suites. The user's signed-in
profile remains untouched; acceptance follows Reload and refresh when convenient.

## Scrolling completion correction

The loading panel is removed after the final page, retaining the completed
scroller state so later DOM changes cannot restart the original pagination.
A replacement library container discards copied extension controls before
creating its own panel. Loaded rows and date sections remain intact; pause,
retry and pagination restoration keep their existing behavior. No storage or
artwork changes. Focused browser regressions cover all supported library views,
completed-state mutations, cloned-container redraws, dated sections, cancellation,
retry, rate limits and profile/preference restoration. Signed-in acceptance remains
with the user's Reload and test, without Console steps or a reply deadline.

## Scope and ownership

Use the connected profile's most-scrobbled album for track artwork/link, with
the title-album fallback for verified album-less scrobbles. Preserve installation
identity, display preferences, XML revert records and scan progress. No scrobble
edits, full-library scans or unrelated UI changes.

- artwork-albums.js: shared artist-page album totals and existing album-row covers.
- artwork-source.js: individual histories/native album columns and cover fetches.
- artwork.js: early cached application, row readiness, progressive results/restoration.
- background.js: separate bounded cache writes; pages.js: shared request limits.

## Confirmed source contracts

The public DCCXX/Playboi Carti artist overview exposes all-time track totals in
data-stat-value and album covers in album rows. Its Music library contains
36 ranked tracks totaling 971 plays; the 2024 row has exactly 63. The 2024
history has total 63 and 50 Music rows on page 1, with native chartlist-album
links and stable 32-character hexadecimal data-edit-scrobble-id values.

On unfiltered own artist overviews, album lists are shared across track jobs.
Each complete list must sum to its metadata total and have unique track identities.
At most five displayed albums/two pages per album are read. A track wins only
when its album count exceeds the runner-up plus every unaccounted play.
Proven results publish immediately, without waiting for the original job to end.
The own album-row cover supplies the image. Filtered pages, large/incomplete
lists and unresolved ties use individual track histories.

The individual reader accepts the verified native album column, even when
edit forms are unavailable/incomplete. It keeps explicit album-artist tags when
their album matches that column. Track-row artwork never supplies album identity.
Exact history ties use native most-recent order.

Verified blank scrobble fields (including BOTH omitted album fields) select the
artist/title album directly. This has a separate cache key from ranked winners.
Single omitted fields remain strict in edit callers. Primary signed-in album
covers reflect starred artwork; Similar Albums images are excluded. Native
thumbnail size and original row styling remain intact.

## Loading and storage

Artwork starts at document_start. Scrobble rows wait for their native fields;
classification is reconsidered when later nodes arrive. Known covers apply
before network/visibility scheduling. Unknown covers still need discovery.
Artist batch counting reduces requests and reuses existing album pictures.

The separate cache retains up to 1,000 tracks/500,000 JSON characters. New results
carry sourceVersion 2. Old normal-track images remain visible during one background
verification; verified fresh records avoid requests for 24 hours. No saved
preference or cache key is cleared/migrated. Profile changes restore original
attributes. The request throttle, origin lock and rate-limit pause remain.

## Evidence and live acceptance

The 16-suite gate passed with isolated profiles/mocked Last.fm requests.
Focused follow-ups verify bounded album pagination and actual manifest injection.
Tests cover progressive MUSIC selection while another request is blocked, old
2024 title-album cache correction, zero-request warmed reloads, native-column
selection, date-filter rejection, incomplete totals, profile/storage preservation,
and day ordering. A staged-row test asserts the known cover at the first
rendering frame after metadata arrives.

The actual v0.6.8 selection module was executed against the real public DCCXX
artist page in a separate browser. It selected Music for 2024, counted 63 of 63,
and requested only the owned Music album list. Selected cover:
2fcb1df976faa7f06b07553484d4cd6d; link: /music/Playboi+Carti/Music.

The user accepted Myron's album/link and Watch Me's single cover/link, but reported
about ten seconds of loading on v0.6.7 and a wrong 2024 image. Signed-in v0.6.8
speed/artwork acceptance is pending their Reload and test, without Console steps
or a reply deadline. Direct Supermium window binding remains unavailable; public
library inspection through the separate browser now works.

Rollback: correction baseline above; complete artwork rollback uses the feature
baseline. Saved display preferences/settings are unaffected by source edits.

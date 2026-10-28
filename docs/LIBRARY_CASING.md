# iTunes casing comparison

Copy letter casing from selected XML exports onto the connected user's displayed
Last.fm names. This never changes scrobbles, XML or iTunes metadata.

## Review flow

Choose XML files, then Compare libraries. The screen warns that caching Last.fm
and comparing XML can take a while. The streaming XML reader supports standard
Apple and older Apple Computer plist headers, rejects custom DTDs/entities, and
never fetches external XML resources. XML locations, playlists and IDs are discarded.

The persisted Last.fm cache visits all-time track, album and artist lists through
the shared paced GET queue. Connecting a profile starts background caching;
existing installations retain their current progress and paused state. Keep an
own-profile Last.fm tab open. Closing the comparison screen does not stop the
job. Browser/tab closure preserves progress; a 30-second alarm resumes a running
job when a connected tab is available. Pause and Resume caching are separate
from XML comparison. Compare uses the current saved cache without restarting it.
Incomplete review is labeled Partial library and includes observed matches only.

Advanced → Rebuild cache requires confirmation, warns about the download time
and keeps the current cache available while a separate replacement is built.
Only a completed replacement becomes current. Pause/reopen resumes the draft.
Export cache saves a versioned JSON file, including partial progress and skipped
items. A draft can also be exported separately. Import validates the format,
profile, identities, sizes and progress, shows a preview, and requires confirmation
while caching is paused. A changed cache or failed validation/write keeps the old
one. Import changes no preferences, XML undo, scan records or network pauses.

Malformed individual rows are skipped with name, artist, source link, page and
reason. Verified rows and later pages continue. The skipped report is paginated;
Retry skipped items revisits only the affected pages and preserves the cursor.
Sign-in, whole-page structure and pagination failures still pause the job rather
than silently declaring an unverifiable library complete. Rate limits retain the
existing pause and pacing rules.

Review shows Type/artist, Before → After, selection, search and 100-row pages.
Before includes applicable existing local casing. Identical names are omitted.
Conflicting XML casings require a choice; replacements start unchecked. Save
casing changes confirms counts and writes local rules plus persistent undo.
Undo preserves subsequent manual edits. Existing backup/scan/pause state survives.

## Identity and cosmetic-only boundaries

Compare NFC-normalized names ignoring case only. Preserve punctuation, accents,
inner whitespace and suffixes; songs/albums also need the exact artist identity.
Song (feat. Artist) cannot match Song unless Song itself appears in the cache.
Unobserved XML names and ambiguous raw casings never create preferences.
Separate album-artist metadata cannot be proved by these aggregate lists, so it
is not imported speculatively; native manual album-artist casing still works.

library-cache.js owns parsing/comparison, library-cache-bridge.js reads raw lists
in the connected tab, library-cache-job.js coordinates persisted background work,
library-cache-store.js handles sole-writer operations, and cache-ui.js owns its
controls. background.js serializes storage changes. Last.fm's double-escaped literal plus
signs are decoded only for link verification; matching retains the raw plus sign.

Apply revalidates profile, cache generation, observed spelling, casing-only rules
and expected previous preferences. Rules and undo save atomically. The renderer
rejects substantive replacements even from old backups. pages.js uses literal
GET requests and unconditionally rejects edits/forms, including old experimental
correction callers. Normal native site edits remain separate user actions.
No reinstall or storage clearing is required. The new alarms permission wakes
resumable jobs; it adds no website or account access.

The approved unlimitedStorage permission supports large local caches, rules and
undo. Allocation failures surface without a partial preference transaction.
Cache metadata remains on this device. JSON backups can contain these records
and should be kept private. The original XML is never retained or uploaded.

Ordinary page preference reads exclude the library cache and XML undo. Per-page
job guards read settings/job metadata only. Pause and job-status updates write
only job metadata, avoiding whole-cache broadcasts to every open content script.
The old comparison polling loop has been removed. A 50,000-name regression guards
these allocation boundaries; this does not prove every possible browser hang is
resolved.

## Checks

Coverage includes exact intersection, unchanged exclusion, suffix/artist mismatch,
original/current Before values, profile/stale-cache guards, read-only transport,
pause/reopen/resume, apply/undo, later edits, infinite-scroll display, friend
isolation and large-storage capacity. Fixtures do not substitute for installed
signed-in acceptance. See CURRENT.md for actual results and full-cache limits.

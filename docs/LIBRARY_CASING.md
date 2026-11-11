# iTunes casing import

Copy letter casing from selected XML exports onto the connected user's displayed
Last.fm names. This never changes scrobbles, XML or iTunes metadata.

## Review flow

Read the XML, then review and save display preferences. You can start as soon as
you connect your profile. The Last.fm cache is a separate section. The streaming XML reader supports standard
Apple and older Apple Computer plist headers, rejects custom DTDs/entities, and
never fetches external XML resources. XML locations, playlists and IDs are discarded.

The persisted Last.fm cache visits all-time track, album and artist lists through
paced GET requests made by the background worker (no Last.fm tab is needed; a
hidden offscreen page parses them). Connecting a profile starts background
caching; existing installations retain their current progress and paused state,
and a job an older version stopped on an error resumes by itself. Every failure
retries (5 seconds rising to every 5 minutes); only Pause, a profile change or
completion stops a job. Caching waits while Last.fm pages are loading. Closing
the comparison screen does not stop the job; a 30-second alarm resumes it after
the browser restarts. Pause and Resume caching are separate
from XML import.

Advanced → Rebuild cache requires confirmation, warns about the download time
and warns that 50,000+ scrobbles can take over 30 minutes (large libraries can
take several hours). It keeps the current cache available while a separate replacement is built.
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

Review shows the type, artist, saved casing and iTunes casing, with selection,
search and 100-row pages. Identical saved preferences are omitted.
Conflicting XML casings require a choice; replacements start unchecked. Save
casing changes confirms counts and writes local rules plus persistent undo.
Saving feedback appears before the worker call, disables review changes and
duplicate Apply, then shows preview updating and explicit Complete after commit.
Failures retain selections. A post-commit preview failure reports that saving
succeeded and asks for a reload. Undo preserves subsequent manual edits. Existing backup/scan/pause state survives.

## Identity and cosmetic-only boundaries

Compare NFC-normalized names ignoring case only. Preserve punctuation, accents,
inner whitespace and suffixes; songs/albums also need the exact artist identity.
A rule for Song does not match Song (feat. Artist). Unplayed names are saved as
rules, ready to apply when an exact match appears. Album artists are imported
from explicit Album Artist fields.

library-cache.js parses ranked lists for the separate Last.fm cache.
library-cache-fetch.js reads pages and library-cache-job.js coordinates background
work. library-cache-store.js handles writes and cache-ui.js owns its controls.
Last.fm's double-escaped literal plus
signs are decoded only for link verification; matching retains the raw plus sign.

Apply revalidates the profile, casing-only identity and expected previous
preferences. Older open import screens can still use their cache-backed review. Rules and undo save atomically. The renderer
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
Read-only info/plan requests reuse a storage-coherent worker view; cache
mutations invalidate it and continue reading persisted state before writing.
A 50,000-name probe reduced 20 metadata reads to one (~1692ms to ~240ms), without
changing requests, pauses or per-page writes. This is not a full-download timing.
The old comparison polling loop has been removed. A 50,000-name regression guards
these allocation boundaries; this does not prove every possible browser hang is
resolved.

## Checks

Coverage includes a cache-free import, future-track display, identical saved
preference exclusion, exact artist and title matching, profile guards, read-only transport,
pause/reopen/resume, apply/undo, later edits, infinite-scroll display, friend
isolation and large-storage capacity. Fixtures do not substitute for installed
signed-in acceptance. See CURRENT.md for actual results and full-cache limits.

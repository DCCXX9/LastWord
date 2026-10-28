# iTunes casing comparison

Copy letter casing from selected XML exports onto the connected user's displayed
Last.fm names. This never changes scrobbles, XML or iTunes metadata.

## Review flow

Choose XML files, then Compare libraries. The screen warns that caching Last.fm
and comparing XML can take a while. The streaming XML reader supports standard
Apple and older Apple Computer plist headers, rejects custom DTDs/entities, and
never fetches external XML resources. XML locations, playlists and IDs are discarded.

The persisted Last.fm cache visits all-time track, album and artist lists through
the shared paced GET queue. Pause stops the active request; compare resumes at
the next unsaved page, including after reopening. Refresh cache starts a new
generation. Opening the screen or choosing files alone starts no requests.
Incomplete review is labeled Partial library and includes observed matches only.

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
in the connected tab, library-cache-client.js coordinates the XML screen, and
background.js is the sole storage writer. Last.fm's double-escaped literal plus
signs are decoded only for link verification; matching retains the raw plus sign.

Apply revalidates profile, cache generation, observed spelling, casing-only rules
and expected previous preferences. Rules and undo save atomically. The renderer
rejects substantive replacements even from old backups. pages.js uses literal
GET requests and unconditionally rejects edits/forms, including old experimental
correction callers. Normal native site edits remain separate user actions.
No reinstall, permission change or storage migration is required.

The approved unlimitedStorage permission supports large local caches, rules and
undo. Allocation failures surface without a partial preference transaction.
Cache metadata remains on this device. JSON backups can contain these records
and should be kept private. The original XML is never retained or uploaded.

## Checks

Coverage includes exact intersection, unchanged exclusion, suffix/artist mismatch,
original/current Before values, profile/stale-cache guards, read-only transport,
pause/reopen/resume, apply/undo, later edits, infinite-scroll display, friend
isolation and large-storage capacity. Fixtures do not substitute for installed
signed-in acceptance. See CURRENT.md for actual results and full-cache limits.

# Library casing import framework

Prepared from `b134285` on `preferences-page`. This extension owns local Last.fm
display preferences. Library Doctor owns its library cleanup and reviewed XML
export. This change does not connect the apps or write to iTunes/Last.fm.

## User flow

Settings or Display names → Import iTunes XML → local streaming scan → review →
Apply. Artist, album, song and album-artist checkboxes select across the entire
XML, independently of search and the 100-row review page. Individual row choices
remain available. Conflicting casings require a choice; different existing
preferences are initially unchecked. A group selection explicitly includes such
replacements. Apply still requires confirmation and has a persistent Revert.

Names are copied from the XML with outer whitespace removed and NFC Unicode
normalisation. There is no automatic title-case conversion. Rules match existing
names ignoring case, with artist scope for songs/albums. They apply across the
connected user's library, including later visits, new plays with matching names,
and infinite-scroll rows. They do not reconcile renamed tracks or alter raw tags.

## Shared adapter boundary (version 1)

Load `rules.js`, then `library-casing.js`. `LastfmLibraryCasing.VERSION` is 1.
`fromTracks(records)` accepts an array of plain metadata records using iTunes
field names: `Name`, `Artist`, optional `Album` and optional `Album Artist`.
The streaming interface is `createCollector()` with `addTrack(record)`,
`skipTrack(reason)`, `counts()` and `result()`.

`result()` returns `{songs,total,skipped,duplicates,candidates,issues}`. A candidate
has `{type,id,from,to,artist?,variants,occurrences}`. `type` uses the existing
artists/albums/tracks/albumArtists groups; `id` uses `LastfmRules.idFor`.
`from` is the normalised matching name; `to` retains source casing. Multiple
`variants` require user selection, regardless of their frequency in the XML.
Album candidates include track-artist and distinct album-artist scopes for
compilations. Missing/invalid required names skip the track; invalid optional
fields are reported and omitted.

Only these four name fields enter the plan. Paths, playlists, play counts,
persistent IDs and other private metadata are discarded. The builder has no
DOM, Chrome, network or storage dependencies. XML parsing remains a separate
incremental adapter with cancellation, progress and full-file validation.

A future Library Doctor adapter can pass its reviewed `track.values` records
to this boundary, or users can import a fresh XML export today. No native
messaging, localhost listener, automatic syncing, app launch or shared storage
is enabled. A direct hand-off format/transport must be agreed when that work is
requested; this is not a promise that arbitrary Doctor reports are importable.

## Persistence and limits

The existing sole-writer `itunes-apply` operation validates exact casing,
current profile and expected previous rules. Rules and undo are saved together.
Revert preserves subsequent manual edits. Storage keys/formats, permissions,
extension identity and legacy scan records are unchanged. No user-data
migration occurs. Only the latest XML import is reversible here; keep a JSON
backup for earlier states. Storage quota can still prevent an oversized plan
from being applied; it fails without a partial write.

Checks: shared-builder contract, existing 128 MiB streaming parser, review UI,
storage/undo guards, and actual isolated unpacked-extension import covering
initial and infinite-scroll rows plus friend isolation. These are constructed
fixtures, not proof of signed-in Supermium or Library Doctor integration.

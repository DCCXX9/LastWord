# Architecture decisions

## 30 September 2026: coordinated local preferences

A Manifest V3 service worker is the sole writer of rules/settings. Each queued
operation reads the latest value and applies a targeted change. Same-rule edits
and imports can carry expected values to reject stale changes. Startup performs
no migration or writes. Unknown local storage keys survive backup and restore.

The shared adapter owns Last.fm URL parsing and named native form contracts.
Content owns display replacements/scrolling; native-edit owns menu/dialog
integration; settings/popup use the same storage API. Pages are fetched through
a bounded queue using an origin lock shared across tabs, with persistent
rate-limit stop. The extension never submits real scrobble edits itself.

Actual native dialog behavior still needs signed-in acceptance. Reconstructed
fixtures and isolated extension tests are recorded as distinct evidence.

## 30 September 2026: reviewed XML casing imports

Use an additive `exact: true` rule flag for imported preferences. It keeps an
explicit casing choice even when from/to are identical (including lowercase
or numeric titles); legacy unflagged rule semantics remain intact. Existing
preferences are not rewritten on startup.

The worker serializes a selected import as one rules-plus-undo write. The undo
record holds before/after values only for changed rules. Later manual mutations
mark the corresponding entries touched; full JSON replacement clears XML undo
and never revives an undo action from the backup. Revert cannot erase intervening changes, even if a user has
changed a value back to the imported spelling. Only the latest XML import has
an undo record. JSON backups include it and all legacy data.

The parser reads 64 KiB file slices with streaming UTF-8 decoding and validates
XML structure through the end of the file. Only the current track and unfinished
token are retained, then each track is parsed as a small XML dictionary. The
standard Apple DTD is accepted without loading it; custom entity declarations
are rejected. There is no total file-size cap; individual tracks/tokens are
limited to 16 MiB and nesting to 256 levels. Distinct review names remain in
memory. Progress yields per chunk and every 100 tracks; review uses 100-row pages.
References: https://developer.apple.com/library/archive/documentation/CoreFoundation/Conceptual/CFPropertyLists/Articles/XMLTags.html

# Current state — 30 September 2026

Installed candidate: **v0.6.0**, branch `import-itunes-xml`.
Baseline: `c6a83f5e708f385867726edd015d16d604570faf` (v0.5.0).

## Scope

User requested iTunes XML upload, per-song scan progress, full review with
artist/album/track checkboxes, Apply and Revert. Allowed files: new itunes page,
parser/controller/styles and tests; options entry point; rules/store/background
for atomic selected imports and undo; manifest version; relevant README/docs.
Excluded: Last.fm requests/edits/scans, changing installation identity/path,
clearing/migrating current storage, unrelated UI and publication.

## Implementation

XML is parsed on-device; no file upload or retention. Every Tracks entry is
checked in cancellable batches. Duplicate identities are combined, casing
conflicts require a choice, invalid metadata is reported, and every candidate
is accessible through searchable/filterable 100-row pages. Existing differing
preferences default to unchecked. Exact casing includes lowercase targets.

Apply atomically saves selected rules and a persistent latest-import undo
record. Revert restores only imported entries untouched by subsequent manual
changes. Stale review, wrong profile, malformed import, duplicate entries and
quota failures do not partly write preferences. A new import replaces the
previous undo record. Existing legacy/scan storage is preserved.

All 11 local suites passed. Acceptance checks: parser progress/cancel/Unicode/duplicate/conflict cases;
selected apply/revert and concurrent edits; 2500-track storage fixture; options
and display regression; actual unpacked extension file input, review/apply,
lowercase Last.fm display fixture, reopening and revert. The final backup/undo
correction passed focused storage regressions. The import page was visually
inspected in isolated Supermium. Original personal
XML has not been supplied, so its contents are not independently verified.

The earlier native edit and scrolling features retain their prior evidence:
local isolated Supermium fixtures pass; real signed-in Last.fm dialog/album
layout remains an acceptance item because that profile is not connected.

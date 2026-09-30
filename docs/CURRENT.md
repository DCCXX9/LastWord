# Current state — 30 September 2026

Installed candidate: **v0.6.1**, branch `preferences-page`.
Baseline: `1fd1c718ef1ad3d99f9a991d4c00dd72fb17dc59` (v0.6.0).

## Scope

Move display-name management to a separate page, grouped/sorted by artist,
album and song, preserving edit/delete/Undo/search. User also reported an XML
larger than the arbitrary 50 MB upload limit; remove that restriction and use
incremental parsing with progress/cancellation for larger files.

Allowed files: options/preference HTML/JS/styles; native manage link; worker
page authorization; XML parser/controller/page; manifest version; related tests
and README/docs. Excluded: preference migration/reset, installation identity/path
changes, Last.fm data/network access, scrobble automation and unrelated features.

## Candidate

The main options page retains profile, scrolling, import and backup controls.
The dedicated preferences page groups Artists, Albums and Songs alphabetically;
albums/songs sort by artist then preferred title. Album-artist rules stay visible
under Artists. Existing local preferences and XML undo records are unchanged.

Large XML files are read incrementally instead of building one full XML DOM.
Progress reports bytes read and tracks checked, with cancellation. Display-name
aggregation still retains the distinct names needed for review. Apply remains
subject to Chrome's local storage capacity and remains atomic with undo.

## Verification and acceptance

All 11 regression suites pass in isolated Supermium profiles: rules, adapter,
storage, XML store/parser/UI, content smoke, album menus, scrolling, options,
and the actual unpacked-extension integration. The parser passed a constructed
128 MiB XML Blob with progress/cancel, split Unicode/XML tokens and malformed
tail checks. A 64 MiB file passed through the extension's actual file picker
to review without writing preferences. Apply/reopen/Revert passed separately.
Settings/preferences screenshots were inspected. A pending-save draft race and
a delayed dialog-close race were corrected and covered by focused checks.

User acceptance: Reload v0.6.1 in the existing installation, reopen Settings,
check the grouped preferences page, and scan the user's larger XML to review.
No personal XML was supplied; no signed-in Last.fm flows or live edits were
tested in this change. Export JSON before applying imported preferences.

Rollback: restore source from the baseline commit above. Browser preferences
and the storage format are unchanged by this source update.

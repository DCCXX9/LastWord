# Current state — 30 September 2026

Installed candidate: **v0.5.0**, branch `polish-reliability`.
Baseline: `3a1042a0292190e18a9e66f46a46485ae8d23950` (v0.3.4).

The six-part reliability/polish cleanup is implemented: serialized preference
writes, shared URL/form adapter, accessible controls and persistent notices,
settings/popup polish, scoped DOM updates and bounded requests, regression
checks plus safe diagnostics. The installed folder/identity and existing
storage format are preserved. No real profile storage was read or changed.

Allowed scope: manifest/content/native/rules/options/popup, new shared modules
and styles, focused tests, README/docs. Excluded: historical scanning,
album-less automation, real Last.fm edits, publication and unrelated data.

Passed: rules, adapter and storage checks; browser smoke, album, options and
library-scroll checks; actual unpacked-extension service-worker/injection test
in isolated Supermium. Settings and popup renders were visually inspected.
Fixtures are reconstructed from confirmed field names, not captured live HTML.

Acceptance pending in signed-in Supermium: Reload then refresh Last.fm; confirm
album Edit track opens its real dialog in place, and confirm the native album
form exposes the exact named pairs required for local casing. Browser connection
does not expose that profile. Export JSON before loading this candidate.

No full-history scanner or automatic scrobble edits are included. Old scan data
is preserved. A rate limit stops extension page requests until a manual retry.

Original ETA: 45–75 minutes / estimated 30k–60k processed tokens; measured token
counts unavailable. Work paused when the shared weekly meter crossed the initial
two-point cap; user then directed continuation. See chat for final meter cutoff.

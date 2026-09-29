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

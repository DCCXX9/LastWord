# Chrome Web Store handoff · v0.9.25 beta

## Outputs

- dist/remaster-for-lastfm-0.9.25-beta.zip: upload this ZIP to Chrome, not the outer submission bundle.
- dist/remaster-for-lastfm-0.9.25-beta.zip.sha256: package integrity check.
- dist/chrome-web-store-0.9.25-submission.zip: handoff bundle with the upload ZIP, checksum, per-file audit, listing/reviewer text, assets and a static privacy/download site.
- dist/chrome-web-store-0.9.25-submission.zip.sha256: handoff integrity check.

The runtime ZIP uses an explicit allowlist and excludes tests, profiles, logs, XML, backups and repository history. Store images contain fictional metadata only. Packaging does not change the installed extension identity, permissions or saved data.

## Delivery

Deliver the source branch/tag and packaged assets to the existing private DCCXX9/lastfm-personal-library repository as a v0.9.25 prerelease. Preserve previous branches/tags/releases. No force-push, public visibility change, Chrome submission or website hosting is part of this handoff.

## Submission still needed

Use STORE-LISTING.md for listing text, permission explanations and reviewer steps. Supply the real publisher account, support details and public privacy-policy URL, then complete the current Chrome dashboard disclosures and distribution settings. Store approval is not guaranteed by local checks.

Existing live checks and their limits are recorded in docs/CURRENT.md. Kesha's specific redirect cases pass focused source checks; a new installed-browser Kesha check remains pending because the live debugging endpoint is unavailable. Generic redirect navigation was previously checked in the installed browser. Store screenshots use an isolated extension with fictional data and all network access blocked.

A store installation may have a different extension ID and separate local storage. Export settings/preferences and library cache before switching, verify the new installation, and retain the existing unpacked installation until then. No key or update URL is added to the installed copy.

## Rebuild on this PC

```powershell
$projectPath = 'C:\Users\jayco\Desktop\lastfm-personal-library\lastfm-personal-library'
if (!(Test-Path -LiteralPath (Join-Path $projectPath 'manifest.json'))) { throw 'Extension folder missing.' }
Set-Location -LiteralPath $projectPath
$env:NODE_PATH = 'C:\Users\jayco\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules'
$env:PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH = 'C:\Program Files\Supermium\chrome.exe'
node tools/capture-beta.cjs
node tests/run.cjs release release-site beta-store beta-onboarding
node tools/package-store.cjs
```

Success prints validation PASS, both ZIP names and SHA-256 checksums. Upload only the inner extension ZIP to Chrome.

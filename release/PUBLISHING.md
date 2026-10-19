# Beta delivery and publication

## Jay's one local test version

The installed folder already contains **v0.9.4 beta**. Keep it in place.

1. Click Reload on the existing extension card in `chrome://extensions`.
   Refresh your own Last.fm library. Scroll to the bottom: Yes loads one page,
   No stops, and Always loads as you scroll until the next ten-page checkpoint.
   Confirm the history joins retain their chronological order.
2. Open the extension's Display names page → Import casing for your whole library
   from iTunes XML (or use Settings → Import your iTunes casing).
3. Choose an XML, review its names and choose artist/album/song groups or
   individual rows. Export JSON before replacing saved preferences, then Apply.
4. Refresh your own Last.fm library. Imported casing should appear on matching
   names, including rows loaded as you scroll. Revert last XML import is available
   on the import page; it preserves later manual preference edits.

No Console commands are needed. A screenshot or ordinary description of any
remaining problem is enough. Direct Library Doctor connection/sync is not yet
enabled; a fresh XML export after cleanup uses the same import flow today.
The previously reported live blank-artwork defect remains unresolved and is
unchanged by this scrolling update. Signed-in results are not certified by the
isolated regression tests.

## Prepared local outputs

| Output | Path relative to project |
| --- | --- |
| Upload / download ZIP | `dist/lastfm-personal-library-0.9.4-beta.zip` |
| ZIP checksum | `dist/lastfm-personal-library-0.9.4-beta.zip.sha256` |
| Per-file audit | `dist/package-manifest.json` |
| Static website including download and privacy page | `dist/site/` |
| Store copy and review instructions | `release/STORE-LISTING.md` |
| Store images | `release/assets/` |
| Candidate notes / limitations | `release/NOTES.md` |

The distribution contains only explicitly allowlisted runtime files. It excludes
tests, browser profiles, logs, backups, personal XML, Git history and local docs.
The installed folder is not moved or replaced to create the ZIP.

## Before any public upload

- Finish the signed-in acceptance above. Resolve material failures or narrow the
  public claim before publication.
- Supply the developer account and real publisher details. This work did not
  create an account, pay a fee, sign an agreement or submit a listing.
- Choose a real support channel and approved public site address. Add them to
  the website and privacy/contact text. Check the hosted privacy page is publicly
  reachable. The policy draft does not invent an identity or contact address.
- Review the listing/data disclosures against the final source. Review source
  ownership and any distribution terms you intend to offer; no open-source
  licence or public-source release has been granted by this preparation.
- Approve the exact public upload/submission. Nothing here is publicly hosted.

## Fastest route once approved

The static `dist/site/` can provide a beta ZIP download before a store listing is
approved. It uses manual unpacked installation, which asks testers to enable
Developer mode. It is not an automatic store installation/update channel.

For Chrome Web Store: register the developer account, create the listing, upload
the ZIP, add the provided images/copy and public policy/support URLs, complete
privacy/distribution settings, then submit for review. The review can take days
or longer; do not advertise a guaranteed release time.

A store installation will have its own identity and may have separate local
storage from Jay's unpacked installation. Export before moving between them and
verify the new copy before removing the old one. No extension key or update URL
has been added to this installed copy.

## Rebuild on this PC

From a fresh PowerShell session:

```powershell
$projectPath = 'C:\Users\jayco\Desktop\lastfm-personal-library\lastfm-personal-library'
if (!(Test-Path -LiteralPath (Join-Path $projectPath 'manifest.json'))) { throw 'Extension folder missing.' }
Set-Location -LiteralPath $projectPath
node tools/package-beta.cjs
node tests/release.cjs
```

Success prints the ZIP name, SHA-256 and package validation PASS. Do not copy the
whole workspace into an upload. Rebuilding after a runtime change changes the
checksum; use the regenerated `.sha256` and per-file manifest together.

Official guidance: [developer registration](https://developer.chrome.com/docs/webstore/register/),
[manual installation](https://developer.chrome.com/docs/extensions/how-to/distribute/install-extensions),
[review timing](https://developer.chrome.com/docs/webstore/review-process).

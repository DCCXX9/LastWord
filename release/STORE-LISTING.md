# Chrome Web Store listing · v0.9.25 beta

Prepared for submission; not submitted to Chrome. GitHub remains private.

## Listing fields

Name (from manifest): Remaster for Last.fm

Summary (from manifest): Personalise your Last.fm library with local display names, iTunes XML casing import and continuous scrolling.

Suggested category: Tools. Language: English.

## Description

Make your own Last.fm library display the letter casing you prefer, with local display preferences and library browsing tools.

- Save casing changes from Last.fm's native edit dialog using Save casing changes.
- Match an iTunes/Apple Music XML export against your cached Last.fm library. Review Before and After, select changes and save them locally.
- Only exact names differing in letter casing qualify for XML matching. Featuring credits, punctuation and edition suffixes are never removed.
- Cache your library in the background while a connected Last.fm profile tab is open. Pause, resume, export or import the cache. Large libraries can take several hours.
- Search and manage saved preferences; export and restore a JSON backup. Undo the latest XML import while preserving later manual changes.
- Load native paginated lists as you scroll across Last.fm profiles, music, tag and chart pages, with your consent.
- Keep supported artist, song and album links on their original pages using redirect protection.

The interface is labelled Remaster for Last.fm. Connect your Last.fm username in Settings; the extension never asks for your Last.fm password. Display preferences apply only to the profile you connect. XML files are processed on your device and are not uploaded to the developer.

Local casing changes affect how the website looks. They never edit or delete Last.fm scrobbles or change its catalogue. Last.fm's separate Save edit button retains its normal server-side behaviour; do not use it to save local casing.

Artwork support uses available Last.fm page data and cached covers. Missing data, page changes and request pauses may prevent a result. Redirect protection cannot repair Last.fm's catalogue, merged statistics or ambiguous artist identities; typed/external links can redirect before the extension runs.

Preferences stay in this browser installation. Export a backup before uninstalling or moving to a store installation. No advertising, analytics, developer-operated collection server or Chrome Sync.

Independent project. Not affiliated with or endorsed by Last.fm or Apple.

## Privacy practices and permission justifications

Single purpose: Personalise the connected user's Last.fm library presentation using local display preferences and library browsing controls.

- storage: Store profile settings, display preferences, XML undo, library cache/progress, skipped items, artwork records and request pauses locally. Retain legacy records without acting on removed features.
- unlimitedStorage: Whole-library preferences, library cache and the undo record can exceed Chrome's usual local storage quota. This enables local storage, not additional website access.
- alarms: Resume persisted background library caching after the extension worker is suspended, respecting saved pauses and request pacing.
- https://www.last.fm/* content-script access: Read the connected profile's library, native form metadata and public music pages; apply local display names, append library rows and protect original music links. The shared page transport permits GET only. No unrelated-site access.
- Remote code: No. All executable JavaScript is included in the ZIP.

Data processed: username, settings, selected XML music metadata, display preferences, Last.fm library names/counts/timestamps and native form metadata, local cache/progress/undo and voluntary diagnostics. Original XML files and filenames are not retained. Native security fields are not saved in preferences or diagnostics. Normal page/image requests go to Last.fm and its image hosts using the browser session. No automatic data reporting to the developer. User-requested JSON downloads can contain listening metadata and should be kept private.

Complete the dashboard's current data-category selections and Limited Use certifications against this inventory and privacy.html. Local processing does not justify claiming that no user data is processed.

## Reviewer instructions

1. Install the extension ZIP. A new installation starts disconnected. Open Settings and connect your own Last.fm username; no password is entered into the extension.
2. Keep that profile's Last.fm tab open to cache the library. Step 1 of iTunes casing shows progress, Pause/Resume and cache export/import. Advanced rebuild requires confirmation and retains the current cache until its replacement finishes.
3. Export your iTunes library using File → Library → Export Library…; choose the XML in Step 2 and Compare libraries. Step 3 shows only different casing for names observed in the cache. Review selected changes and confirm. Saving and Complete reflect the actual local storage operation. An incomplete cache only matches names cached so far.
4. Refresh the connected Last.fm library to see saved casing. Other users' libraries remain unchanged. Use Display names to manage preferences and Settings to export a backup. Undo the latest XML import from Backup & undo on the import screen.
5. If native edit access is available on your own Last.fm account, change only letter casing and use Save casing changes. Do not click Last.fm's Save edit during local-only testing. No reviewer credentials are bundled.
6. Open artist/song/album links from the connected profile or public music pages and check +noredirect remains in the URL. For example Kesha should remain Kesha, not Ke$ha. Direct external URL entry is outside this link-protection boundary.

## Supplied assets

Upload remaster-for-lastfm-0.9.25-beta.zip as the extension (manifest.json is at the root).
Use assets/icon128.png (128×128), assets/promo440.png (440×280), and the three 1280×800 screenshots in the submission bundle. Screenshots show actual extension pages in an isolated profile with fictional music metadata; they are not signed-in live acceptance evidence.

## Publisher fields still required

- Registered Chrome Web Store publisher and verified contact details.
- Publicly reachable privacy-policy URL serving the supplied privacy.html; a private GitHub URL is insufficient.
- Real support URL/contact and any required publisher identity disclosures.
- Final dashboard disclosures, distribution choices and submission/review.

No publisher identity, contact email or public URL has been invented. Preparing this bundle and pushing it to private GitHub does not submit it to Chrome or publish a website.

References: [ZIP preparation](https://developer.chrome.com/docs/webstore/prepare), [images](https://developer.chrome.com/docs/webstore/images), [privacy fields](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy).

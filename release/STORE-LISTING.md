# Store listing draft · v0.9.7 beta

Prepared for review, not submitted. Publisher account, public URLs and support
details must be supplied before publication. Do not enter invented details.

## Listing text

**Name:** Last.fm Personal Library

**Summary:** Personalise your Last.fm library with local display names, iTunes XML
casing import and continuous scrolling.

**Description:**

Make your own Last.fm library display the artist, album and song names you prefer.
Keep your choices locally in your browser, without changing Last.fm's catalogue.

- Choose case-sensitive display names for artists, albums and songs.
- Import an iTunes library XML locally, watch the scan progress, review the names
  and select which preferences to apply. Revert the latest import if needed.
- Search, edit and delete preferences on a separate Display names page.
- Keep scrolling through native Last.fm library rows, including dated Scrobbles.
- Export and restore a JSON backup.

Connect your Last.fm username in Settings. Personalisation applies only to that
profile. No extension password, developer account or analytics is required. XML
files are processed on your device and are not uploaded to the developer.

This is a beta. Personal track covers and native editing are included for testing.
Covers use your most-scrobbled album for the track and update the album link too.
On a specific album's library page, all tracks use that album's existing header
cover and link without history lookups.
Cached covers are reused; new selections require Last.fm requests and can take
time. Missing artwork and changes to Last.fm's pages can prevent a result.
Normal scrobble edits use Last.fm's editor and require the appropriate Last.fm
account access. Local display preferences do not submit scrobble edits.

Automatic album-less scrobble corrections are unavailable in this beta. Existing
saved rules and discovery records are retained for review. This version does not
automatically clear album fields while you listen.

Preferences stay in this browser installation and do not sync to other devices.
Export JSON before changing installations or uninstalling.

Independent project. Not affiliated with or endorsed by Last.fm or Apple.

## Assets

- Extension ZIP: `dist/lastfm-personal-library-0.9.7-beta.zip`
- Icon: `release/assets/icon128.png` (128 × 128 PNG)
- Small promotional tile: `release/assets/promo440.png` (440 × 280 PNG)
- Screenshots: `release/assets/setup.png`, `preferences.png`, `xml-review.png`
  (1280 × 800 PNG each).
- Screenshots show the actual extension UI with fictional music metadata. Do not
  label these as signed-in Last.fm screenshots or real-user acceptance evidence.

The icons and promotional graphic are original project artwork. No Last.fm logo,
Apple logo or third-party album artwork is included in these release assets.

## Privacy tab and permissions

**Single purpose:** Personalise the connected user's Last.fm library presentation
with locally saved display preferences and native library browsing controls.

**storage justification:** Save profile settings, display-name preferences, XML
undo, bounded artwork cache and request state in this browser installation, and
preserve existing album-less/discovery records. The extension does not use Sync.

**Last.fm site access justification:** Read the connected profile's library rows,
native edit forms, album tags and images to apply preferences, append the next
library page, select personal covers and open Last.fm's normal editor. The content
scripts match only `https://www.last.fm/*`. There is no unrelated-site access.

**Remote code:** None. Runtime JavaScript is packaged locally. Requests retrieve
Last.fm data and images; they do not download executable code.

**Data inventory for the publisher to disclose accurately:**

| Information | Processing / destination |
| --- | --- |
| Last.fm username, settings, display preferences | Local extension storage |
| Selected XML music metadata | Local parsing/review; applied rules and latest undo stored locally |
| Last.fm names, counts, timestamps, album tags, native form fields | Read from Last.fm; relevant artwork and request state cached locally |
| Native security fields | Used in memory with Last.fm's normal editor; not saved in preferences or diagnostics |
| Page / image requests | Last.fm and its image hosts receive normal browser requests and session credentials |
| JSON exports | Local download initiated by the user; may contain listening metadata and legacy records |
| Voluntary diagnostics | Clipboard only on request; username, counts and feature/error state; no automatic reporting |

There is no developer-operated collection endpoint, sale, advertising or analytics.
Review the current dashboard's data-category definitions against this inventory
and the privacy policy; do not claim the extension processes no user data merely
because processing is local. Complete the applicable limited-use certifications
only after verifying that the final listing, privacy policy and source agree.

Use the publicly hosted `privacy.html` as the policy URL. A local extension path
or a file on this PC is not a public privacy-policy URL. Add the real publisher
and support information to the site and policy before submission.

## Reviewer instructions

1. Install the package. Settings opens for a fresh installation; it starts with
   no connected profile and writes no initial preferences.
2. Enter a Last.fm username and select Connect profile. No password is requested
   by the extension. Opening that profile's library enables personalisation;
   other profiles are left unchanged.
3. Open Import iTunes XML and select an exported XML library. The scan is local;
   review/select names before Apply. No Last.fm write is needed to test this.
4. Open Display names to inspect groups/search/edit/delete. Export JSON from
   Settings. Revert the latest XML import on the import page.
5. Open the connected profile's library and scroll to load more native rows.
6. Artwork and normal editing need Last.fm page data; normal editing additionally
   needs a signed-in Last.fm account with editing access. Do not include Jay's
   account credentials in a reviewer note. Arrange reviewer access separately
   only if the store requests it.
7. Album-less automation is intentionally unavailable, including for previously
   enabled stored records. Read-only discovery requires an explicit start.

## Official submission references

- [Prepare the ZIP](https://developer.chrome.com/docs/webstore/prepare)
- [Image dimensions](https://developer.chrome.com/docs/webstore/images)
- [Privacy requirements](https://developer.chrome.com/docs/webstore/program-policies/privacy)
- [Privacy dashboard](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy)
- [Review process](https://developer.chrome.com/docs/webstore/review-process)

Store availability depends on review; preparing or submitting this ZIP does not
guarantee same-day approval.

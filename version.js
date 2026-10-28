/* Visible version labels come from the manifest so they cannot drift. The
   hosted privacy page has its version written in by tools/package-beta.cjs. */
for (const node of document.querySelectorAll('[data-version]')) node.textContent = 'v' + chrome.runtime.getManifest().version;

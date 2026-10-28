(() => {
  'use strict';
  const C = LastfmLibraryCache, S = LastfmStore;
  let controller = null;
  chrome.runtime.onMessage.addListener((message, sender, reply) => {
    if (!['lfm:library-page', 'lfm:library-cancel'].includes(message?.type)) return;
    // Supermium omits sender.url for tabs.sendMessage from an extension page,
    // but supplies its authenticated extension origin and ID.
    const origin = `chrome-extension://${chrome.runtime.id}`;
    if (sender.id !== chrome.runtime.id || !(sender.url === origin + '/itunes.html' ||
        !sender.url && sender.origin === origin)) {
      reply({ ok: false, error: 'Open the XML comparison screen to read library pages.' }); return;
    }
    if (message.type === 'lfm:library-cancel') { controller?.abort(); reply({ ok: true }); return; }
    (async () => {
      if (controller) throw new Error('A library page is already loading.');
      controller = new AbortController();
      try {
        const guard = async () => {
          const state = await S.read();
          if (state.settings.username !== message.username || !LastfmAdapter.ownProfile(location.href, message.username)) {
            throw new Error('Keep your connected Last.fm profile open while caching.');
          }
        };
        await guard();
        const result = await LastfmPages.get(C.url(message.username, message.group, message.page),
          { signal: controller.signal, beforeSend: guard });
        await guard();
        const data = C.parse(result.doc, result.url, message.username, message.group, message.page);
        return await S.cacheLibrary('page', { username: message.username, id: message.id, data });
      } finally { controller = null; }
    })().then(value => reply({ ok: true, value }), error => reply({ ok: false, error: error.message }));
    return true;
  });
})();


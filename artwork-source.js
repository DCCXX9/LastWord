(() => {
  'use strict';
  const A = LastfmAdapter, R = LastfmRules;
  const encode = value => encodeURIComponent(value).replace(/%20/g, '+');
  const norm = R.normalize;
  const check = signal => { if (signal?.aborted) throw new DOMException('Artwork lookup cancelled.', 'AbortError'); };
  const albumImages = new Map();

  function totalScrobbles(doc) {
    const values = [...doc.querySelectorAll('.col-main .metadata-display')];
    if (values.length !== 1) throw new Error('Last.fm’s track total could not be verified.');
    const text = values[0].textContent.trim();
    const total = Number(text.replace(/[,\s]/g, ''));
    if (!/^\d[\d,\s]*$/.test(text) || !Number.isSafeInteger(total)) {
      throw new Error('Last.fm’s track total could not be verified.');
    }
    return total;
  }

  async function albumCover(artist, album, username, signal) {
    const url = `${location.origin}/music/${encode(artist)}/${encode(album)}`;
    const key = username + ':' + url;
    if (!albumImages.has(key)) {
      const pending = LastfmPages.getAlbum(url, { signal }).then(page => {
        const item = A.musicItem(page.url);
        if (item?.type !== 'albums' || norm(item.artist) !== norm(artist) || norm(item.name) !== norm(album)) {
          throw new Error('Last.fm returned a different album.');
        }
        // The signed-in primary cover reflects the user's preferred artwork.
        // Similar Albums also uses cover-art, so only the first main cover is used.
        const primary = page.doc.querySelector('.cover-art img');
        const value = primary?.getAttribute('data-src') || primary?.getAttribute('src') ||
          page.doc.querySelector('meta[property="og:image"]')?.content;
        let image;
        try { image = new URL(value); } catch { throw new Error('This album has no available cover.'); }
        if (image.protocol !== 'https:' || image.hostname !== 'lastfm-img.freetls.fastly.net') {
          throw new Error('This album has no verified Last.fm cover.');
        }
        return { artist, album, image: image.href, url: page.url };
      });
      albumImages.set(key, pending);
      // An aborted viewport lookup can be attempted again when it becomes visible.
      pending.catch(error => { if (error.name === 'AbortError' && albumImages.get(key) === pending) albumImages.delete(key); });
    }
    const result = await albumImages.get(key);
    check(signal);
    return result;
  }

  async function resolve(item, username, signal) {
    const base = `${location.origin}/user/${encode(username)}/library/music/+noredirect/${encode(item.artist)}/_/${encode(item.name)}`;
    const albums = new Map(), timestamps = new Set();
    let url = base, total = null, scanned = 0, winner;
    for (let pageNumber = 1; url; pageNumber++) {
      check(signal);
      const page = await LastfmPages.get(url, { signal });
      const returned = A.musicItem(page.url);
      if (!A.ownProfile(page.url, username) || returned?.type !== 'tracks' ||
          norm(returned.artist) !== norm(item.artist) || norm(returned.name) !== norm(item.name)) {
        throw new Error('Last.fm returned a different track history.');
      }
      const count = totalScrobbles(page.doc);
      if (total !== null && total !== count) throw new Error('This track’s history changed during lookup. Refresh to try again.');
      total = count;
      const forms = [...page.doc.querySelectorAll('table.chartlist tr.chartlist-row form[data-edit-scrobble]')];
      if (!forms.length && total) throw new Error('This track’s scrobble album fields were unavailable.');
      const pageStamps = new Set();
      for (const form of forms) {
        // Confirmed on the signed-in Watch Me history: album-less rows omit
        // BOTH album inputs. Normalize that read-only representation locally;
        // retain strict validation when only one field is missing.
        let source = form;
        if (!form.querySelector('[name="album_name"],[name="album_artist_name"]')) {
          source = form.cloneNode(true);
          for (const name of ['album_name', 'album_artist_name']) {
            const input = page.doc.createElement('input'); input.name = name; input.value = '';
            source.append(input);
          }
        }
        const fields = A.editRow(source, page.url, username);
        if (!fields || norm(fields.artist) !== norm(item.artist) || norm(fields.track) !== norm(item.name)) {
          throw new Error('This track’s scrobble album fields could not be verified.');
        }
        const album = fields.album.trim(), artist = album ? fields.albumArtist.trim() || fields.artist.trim() : item.artist;
        const stamp = JSON.stringify([fields.timestamp, norm(album), norm(artist)]);
        if (timestamps.has(stamp)) throw new Error('This track’s history overlapped during lookup. Refresh to try again.');
        pageStamps.add(stamp);
        const key = JSON.stringify([norm(artist), norm(album)]);
        if (!albums.has(key)) albums.set(key, { album, artist, count: 0 });
        albums.get(key).count++;
        scanned++;
      }
      for (const stamp of pageStamps) timestamps.add(stamp);
      if (scanned > total) throw new Error('This track’s history did not match its total.');
      const ranked = [...albums.values()].sort((a, b) => b.count - a.count);
      winner = ranked[0];
      const remaining = total - scanned;
      // Every unseen play could belong to the runner-up (or an unseen album).
      // Stop early only when even that cannot overturn the leader. Ties at the
      // end use the most recently scrobbled album, the native history order.
      if (!remaining || winner?.count > (ranked[1]?.count || 0) + remaining) break;
      url = A.nextPage(page.doc, page.url);
      if (!url || Number(new URL(url).searchParams.get('page')) !== pageNumber + 1) {
        throw new Error('The complete track history could not be verified.');
      }
    }
    check(signal);
    const fallback = !winner?.album;
    const artist = fallback ? item.artist : winner.artist;
    const album = fallback ? item.name : winner.album;
    return { ...await albumCover(artist, album, username, signal), fallback, scanned, total };
  }
  globalThis.LastfmArtworkSource = Object.freeze({ resolve, clear: () => albumImages.clear() });
  globalThis.LastfmArtwork?.start();
})();

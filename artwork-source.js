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
  function renderedRow(row, base, expected) {
    const track = A.musicItem(row.querySelector('.chartlist-name a[href]'), base);
    const id = row.getAttribute('data-edit-scrobble-id'), cell = row.querySelector('.chartlist-album');
    if (track?.type !== 'tracks' || norm(track.artist) !== norm(expected.artist) || norm(track.name) !== norm(expected.name) ||
        !/^[a-f0-9]{32}$/i.test(id || '') || !cell) return null;
    const links = [...cell.querySelectorAll('a[href]')];
    const album = links.length === 1 ? A.musicItem(links[0], base) : null;
    if (links.length && album?.type !== 'albums' || !links.length && cell.textContent.trim()) return null;
    const time = row.querySelector('.chartlist-timestamp time[datetime]')?.getAttribute('datetime') ||
      row.querySelector('.chartlist-timestamp [title]')?.getAttribute('title');
    return { artist: track.artist, track: track.name, album: album?.name || '',
      albumArtist: album?.artist || '', timestamp: time || 'id:' + id };
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
        const primary = [...page.doc.querySelectorAll('.cover-art img')]
          .find(image => !image.closest('aside,.similar-albums'));
        const image = [primary?.getAttribute('data-src'), primary?.getAttribute('src'),
          page.doc.querySelector('meta[property="og:image"]')?.content].map(A.coverImage).find(Boolean);
        if (!image) throw new Error('This album has no available cover.');
        return { artist, album, image, url: page.url };
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
    let shared;
    try { shared = await globalThis.LastfmArtworkAlbums?.resolve(item, username, signal); }
    catch (error) {
      if (error.name === 'AbortError' || LastfmPages.status().rateLimited) throw error;
      // The bounded aggregate is an optimization; the track history is still authoritative.
    }
    if (shared) return shared;
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
      const rows = [...page.doc.querySelectorAll('table.chartlist tr.chartlist-row')];
      if (!rows.length && total) throw new Error('This track’s scrobble album fields were unavailable.');
      const pageStamps = new Set();
      for (const row of rows) {
        const form = row.querySelector('form[data-edit-scrobble]');
        // Confirmed on the signed-in Watch Me history: album-less rows omit
        // BOTH album inputs. Normalize that read-only representation locally;
        // retain strict validation when only one field is missing.
        let source = form;
        if (form && !form.querySelector('[name="album_name"],[name="album_artist_name"]')) {
          source = form.cloneNode(true);
          for (const name of ['album_name', 'album_artist_name']) {
            const input = page.doc.createElement('input'); input.name = name; input.value = '';
            source.append(input);
          }
        }
        const hidden = source && A.editRow(source, page.url, username);
        const fields = renderedRow(row, page.url, item) || hidden;
        if (fields && hidden && norm(hidden.artist) === norm(item.artist) && norm(hidden.track) === norm(item.name) &&
            norm(hidden.album) === norm(fields.album) && hidden.albumArtist.trim()) fields.albumArtist = hidden.albumArtist;
        if (!fields || norm(fields.artist) !== norm(item.artist) || norm(fields.track) !== norm(item.name)) {
          throw new Error('This track’s scrobble album fields could not be verified.');
        }
        const album = fields.album.trim(), artist = album ? fields.albumArtist.trim() || fields.artist.trim() : item.artist;
        const stamp = JSON.stringify([hidden?.timestamp || fields.timestamp, norm(album), norm(artist)]);
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
    return { ...await albumCover(artist, album, username, signal), fallback, scanned, total, sourceVersion: 2 };
  }
  async function forBlankScrobble(item, username, signal) {
    check(signal);
    return { ...await albumCover(item.artist, item.name, username, signal),
      fallback: true, scanned: 0, total: 0, sourceVersion: 2 };
  }
  globalThis.LastfmArtworkSource = Object.freeze({ resolve, forBlankScrobble, clear: () => {
    albumImages.clear(); globalThis.LastfmArtworkAlbums?.clear();
  } });
  globalThis.LastfmArtwork?.start();
})();

(() => {
  'use strict';
  const C = globalThis.LastfmLibraryCasing;
  const CHUNK = 64 * 1024;
  const ITEM_LIMIT = 16 * 1024 * 1024;
  const malformed = () => new Error('The XML file is malformed or incomplete. Export a fresh library XML from iTunes.');
  const check = signal => { if (signal?.aborted) throw new DOMException('Library scan cancelled.', 'AbortError'); };
  const yieldTask = () => new Promise(resolve => setTimeout(resolve, 0));
  const spelling = value => value.trim().normalize('NFC');
  const xmlChar = value => value === 9 || value === 10 || value === 13 ||
    value >= 32 && value <= 0xD7FF || value >= 0xE000 && value <= 0xFFFD || value >= 0x10000 && value <= 0x10FFFF;
  function entity(value) {
    if (/^&(amp|lt|gt|quot|apos);$/.test(value)) return;
    const number = /^&#(\d+);$/.exec(value) || /^&#x([\da-fA-F]+);$/.exec(value);
    if (!number || !xmlChar(parseInt(number[1], value.startsWith('&#x') ? 16 : 10))) throw malformed();
  }
  function validateDoctype(raw) {
    const apple = /^<!DOCTYPE\s+plist\s+PUBLIC\s+(["'])-\/\/Apple(?: Computer)?\/\/DTD PLIST 1\.0\/\/EN\1\s+(["'])https?:\/\/www\.apple\.com\/DTDs\/PropertyList-1\.0\.dtd\2\s*>$/;
    const system = /^<!DOCTYPE\s+plist\s+SYSTEM\s+(["'])https?:\/\/www\.apple\.com\/DTDs\/PropertyList-1\.0\.dtd\1\s*>$/;
    if (!apple.test(raw) && !system.test(raw)) throw new Error('Custom XML document types or entity declarations are not supported.');
  }
  function dictionary(dict) {
    const children = [...dict.children], fields = new Map();
    if (dict.tagName !== 'dict' || children.length % 2) throw malformed();
    for (let i = 0; i < children.length; i += 2) {
      const key = children[i];
      if (key.tagName !== 'key' || key.children.length || children[i + 1].tagName === 'key' || fields.has(key.textContent)) throw malformed();
      fields.set(key.textContent, children[i + 1]);
    }
    return fields;
  }
  function stringField(fields, name) {
    const value = fields.get(name);
    return !value ? '' : value.tagName === 'string' && !value.children.length ? spelling(value.textContent) : null;
  }
  function collector() {
    const data = C.createCollector();
    function consume(raw) {
      const doc = new DOMParser().parseFromString(raw, 'application/xml');
      if (doc.querySelector('parsererror')) throw malformed();
      let fields;
      try { fields = dictionary(doc.documentElement); }
      catch { data.skipTrack('Entries with invalid or duplicate fields were skipped.'); return; }
      data.addTrack(Object.fromEntries(['Name', 'Artist', 'Album', 'Album Artist']
        .map(name => [name, stringField(fields, name)])));
    }
    return { consume, counts: data.counts, result: data.result };
  }

  // Lexical and structural XML processing retains only one track and the current
  // unfinished token. Large Playlists/text values are checked and discarded.
  function xmlStream(consume) {
    const stack = [];
    let token = null, capture = null, seenRoot = false, seenDoctype = false, seenProlog = false, tracks = 0;
    let reference = '', textTail = '';
    const append = (target, part) => {
      target.length += part.length;
      if (target.length > ITEM_LIMIT) throw new Error('An individual XML token or track exceeds the 16 MB safety limit. The total library size is not limited.');
      target.parts.push(part);
    };
    function validateText(part, references = true) {
      if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/.test(part)) throw malformed();
      if (!references) return;
      if ((textTail + part.slice(0, 2)).includes(']]>') || part.includes(']]>')) throw malformed();
      textTail = (textTail + part.slice(-2)).slice(-2);
      let pos = 0;
      while (pos < part.length) {
        if (!reference) {
          pos = part.indexOf('&', pos);
          if (pos < 0) break;
          reference = '&'; pos++;
        }
        const end = part.indexOf(';', pos);
        if (end < 0) { reference += part.slice(pos); if (reference.length > 32) throw malformed(); break; }
        reference += part.slice(pos, end + 1); entity(reference); reference = ''; pos = end + 1;
      }
    }
    function text(part, cdata = false) {
      validateText(part, !cdata);
      const frame = stack.at(-1);
      if ((!frame || ['plist', 'dict', 'array'].includes(frame.name)) && part.trim()) throw malformed();
      if (frame?.rootKey) append(frame.keyText, cdata ? '<![CDATA[' + part + ']]>' : part);
      if (capture) append(capture, cdata ? '<![CDATA[' + part + ']]>' : part);
    }
    function tag(raw) {
      const match = /^<(\/?)([A-Za-z_:][\w.:-]*)([\s\S]*?)>$/.exec(raw);
      if (!match) throw malformed();
      const closing = Boolean(match[1]), name = match[2];
      let rest = match[3], self = false;
      if (closing) { if (rest.trim()) throw malformed(); return { name, closing }; }
      if (rest.endsWith('/')) { self = true; rest = rest.slice(0, -1); }
      const attr = /\s+([A-Za-z_:][\w.:-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/y, names = new Set();
      let offset = 0;
      while (rest.slice(offset).trim()) {
        attr.lastIndex = offset;
        const found = attr.exec(rest);
        if (!found || names.has(found[1])) throw malformed();
        names.add(found[1]); offset = attr.lastIndex;
        const value = found[2] ?? found[3];
        if (value.includes('<')) throw malformed();
        validateText(value);
        if (reference) throw malformed();
        textTail = '';
      }
      return { name, closing, self };
    }
    function close(name) {
      const frame = stack.pop(), parent = stack.at(-1);
      if (!frame || frame.name !== name || frame.name === 'dict' && frame.expectKey === false ||
          frame.name === 'plist' && frame.children !== 1) throw malformed();
      if (frame.rootKey) {
        const doc = new DOMParser().parseFromString('<key>' + frame.keyText.parts.join('') + '</key>', 'application/xml');
        if (doc.querySelector('parsererror')) throw malformed();
        parent.pendingKey = doc.documentElement.textContent;
      }
      if (frame.track) { consume(capture.parts.join('')); capture = null; return true; }
      return false;
    }
    function complete(raw, kind) {
      if (kind === 'doctype') {
        if (seenRoot || seenDoctype) throw malformed();
        validateDoctype(raw); seenDoctype = true; return false; // Never passed to DOMParser.
      }
      if (kind === 'cdata') { if (!stack.length) throw malformed(); text(raw.slice(9, -3), true); return false; }
      if (kind === 'comment' || kind === 'pi') {
        if (kind === 'pi' && !/^<\?[A-Za-z_:][\w.:-]*(?:\s[\s\S]*)?\?>$/.test(raw)) throw malformed();
        if (/^<\?xml(?:\s|\?)/i.test(raw)) {
          if (seenRoot || seenDoctype || seenProlog || stack.length ||
              new DOMParser().parseFromString(raw + '<root/>', 'application/xml').querySelector('parsererror')) throw malformed();
        }
        seenProlog = true;
        if (capture) append(capture, raw);
        return false;
      }
      const parsed = tag(raw);
      if (parsed.closing) { if (capture) append(capture, raw); return close(parsed.name); }
      const parent = stack.at(-1), name = parsed.name;
      if (!parent) {
        if (seenRoot || name !== 'plist') throw new Error('Choose an iTunes library XML file containing a plist dictionary.');
        seenRoot = true;
      } else {
        if (parent.name === 'key' || parent.name === 'plist' && (name !== 'dict' || parent.children)) throw malformed();
        parent.children++;
        if (parent.name === 'dict') {
          if (parent.expectKey !== (name === 'key')) throw malformed();
          parent.expectKey = !parent.expectKey;
        }
      }
      const frame = { name, children: 0, expectKey: true };
      frame.rootDict = parent?.name === 'plist';
      frame.rootKey = parent?.rootDict && name === 'key';
      if (frame.rootKey) frame.keyText = { parts: [], length: 0 };
      if (parent?.rootDict && name !== 'key' && parent.pendingKey === 'Tracks') {
        if (name !== 'dict' || ++tracks !== 1) throw new Error('This XML must contain one iTunes Tracks dictionary.');
        frame.tracks = true;
      }
      if (parent?.tracks && name !== 'key') { frame.track = true; capture = { parts: [], length: 0 }; }
      if (stack.length >= 256) throw new Error('The XML nesting is too deep for an iTunes library.');
      stack.push(frame);
      if (capture) append(capture, raw);
      return parsed.self ? close(name) : false;
    }
    function step(character) {
      if (token.head.length < 10) token.head += character;
      token.tail = (token.tail + character).slice(-3);
      if (!token.kind) {
        if (token.head.length === 2 && character !== '!') token.kind = character === '?' ? 'pi' : 'tag';
        else if (token.head.startsWith('<!')) {
          const forms = [['<!--', 'comment'], ['<![CDATA[', 'cdata'], ['<!DOCTYPE', 'doctype']];
          const found = forms.find(([prefix]) => token.head === prefix);
          if (found) token.kind = found[1];
          else if (!forms.some(([prefix]) => prefix.startsWith(token.head))) throw new Error('Unsupported XML declaration or entity declaration.');
        }
      }
      if (token.kind === 'comment') {
        if (token.commentDashes >= 2 && character !== '>') throw malformed();
        if (token.head !== '<!--') token.commentDashes = character === '-' ? (token.commentDashes || 0) + 1 : 0;
        return token.tail === '-->';
      }
      if (token.kind === 'cdata') return token.tail === ']]>';
      if (token.kind === 'pi') return token.tail.endsWith('?>');
      if (token.kind === 'tag' || token.kind === 'doctype') {
        if (token.quote) { if (character === token.quote) token.quote = ''; }
        else if (character === '"' || character === "'") token.quote = character;
        else if (token.kind === 'doctype' && character === '[') throw new Error('Internal XML declarations are not supported.');
        else if (character === '>') return true;
      }
      return false;
    }
    async function feed(chunk, tick) {
      let offset = 0;
      while (offset < chunk.length) {
        if (!token) {
          const start = chunk.indexOf('<', offset);
          const end = start < 0 ? chunk.length : start;
          text(chunk.slice(offset, end)); offset = end;
          if (start < 0) break;
          if (reference) throw malformed();
          textTail = ''; token = { parts: [], length: 0, head: '', tail: '', quote: '', kind: '' };
        }
        const start = offset;
        while (offset < chunk.length) {
          const done = step(chunk[offset++]);
          if (done) {
            append(token, chunk.slice(start, offset));
            const finishedTrack = complete(token.parts.join(''), token.kind); token = null;
            if (finishedTrack) await tick();
            break;
          }
        }
        if (token) append(token, chunk.slice(start, offset));
      }
    }
    return { feed, finish() {
      if (token || stack.length || reference || !seenRoot) throw malformed();
      if (tracks !== 1) throw new Error('This XML does not contain a single iTunes Tracks dictionary.');
    } };
  }
  async function scanFile(file, { onProgress, signal } = {}) {
    if (!file || typeof file.slice !== 'function' || !Number.isSafeInteger(file.size) || file.size < 0) throw new Error('Choose an iTunes library XML file.');
    const data = collector(), parser = xmlStream(data.consume), decoder = new TextDecoder('utf-8', { fatal: true });
    let bytesRead = 0;
    async function progress(done = false) {
      check(signal);
      const counts = data.counts();
      onProgress?.({ ...counts, total: done ? counts.processed : null, bytesRead, totalBytes: file.size });
      await yieldTask(); check(signal);
    }
    await progress();
    const tick = async () => { if (data.counts().processed % 100 === 0) await progress(); else check(signal); };
    for (let offset = 0; offset < file.size; offset += CHUNK) {
      check(signal);
      const buffer = await file.slice(offset, offset + CHUNK).arrayBuffer();
      check(signal); bytesRead += buffer.byteLength;
      let text;
      try { text = decoder.decode(buffer, { stream: true }); }
      catch { throw new Error('The library is not valid UTF-8 XML. Export it again from iTunes.'); }
      await parser.feed(text, tick); await progress();
    }
    let tail;
    try { tail = decoder.decode(); } catch { throw malformed(); }
    await parser.feed(tail, tick); parser.finish(); await progress(true);
    return data.result();
  }
  function scan(xmlText, options) {
    if (typeof xmlText !== 'string') return Promise.reject(new Error('Choose an iTunes library XML file.'));
    return scanFile(new Blob([xmlText], { type: 'application/xml' }), options);
  }
  globalThis.LastfmItunes = Object.freeze({ scan, scanFile });
})();

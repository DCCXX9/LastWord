const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const project = path.resolve(__dirname, '..');
const clone = value => value === undefined ? undefined : structuredClone(value);
let sequence = 0;

function createMockWorker(initialData = {}, options = {}) {
  const data = clone(initialData);
  const storageListeners = new Set();
  let onMessage;
  let writes = 0;
  const local = {
    async get(keys) {
      await Promise.resolve();
      if (keys == null) return clone(data);
      if (typeof keys === 'string') keys = [keys];
      if (Array.isArray(keys)) return Object.fromEntries(keys.filter(key => key in data).map(key => [key, clone(data[key])]));
      return Object.fromEntries(Object.entries(keys).map(([key, value]) => [key, clone(key in data ? data[key] : value)]));
    },
    async set(values) {
      await Promise.resolve();
      const changes = {};
      for (const [key, value] of Object.entries(values)) {
        changes[key] = { oldValue: clone(data[key]), newValue: clone(value) };
        Object.defineProperty(data, key, { value: clone(value), writable: true, configurable: true, enumerable: true });
      }
      writes++;
      for (const listener of storageListeners) listener(clone(changes), 'local');
    },
    async remove(keys) {
      const changes = {};
      for (const key of Array.isArray(keys) ? keys : [keys]) {
        changes[key] = { oldValue: clone(data[key]) };
        delete data[key];
      }
      for (const listener of storageListeners) listener(clone(changes), 'local');
    }
  };
  const chrome = {
    runtime: { id: 'test', onMessage: { addListener(listener) { onMessage = listener; } } },
    storage: { local, onChanged: {
      addListener(listener) { storageListeners.add(listener); },
      removeListener(listener) { storageListeners.delete(listener); }
    } }
  };
  const context = vm.createContext({ chrome, URL, console, setTimeout, clearTimeout, structuredClone,
    crypto: require('node:crypto').webcrypto });
  context.importScripts = (...files) => files.forEach(file => {
    vm.runInContext(fs.readFileSync(path.join(project, file), 'utf8'), context, { filename: file });
    // Explicitly exercise the retained experimental algorithm separately from
    // the shipped beta, whose real worker never has this test-only override.
    if (file === 'store.js' && options.experimentalAlbumless) vm.runInContext(
      'globalThis.LastfmStore=Object.freeze({...LastfmStore,FEATURES:{automaticCorrections:true}})',context);
  });
  context.importScripts('background.js');
  function send(message, sender = { id: 'test', url: 'chrome-extension://test/options.html' }) {
    return new Promise((resolve, reject) => {
      if (!onMessage(clone(message), clone(sender), result => resolve(clone(result)))) reject(new Error('Message was not handled.'));
    });
  }
  async function request(action, values = {}, sender) {
    const response = await send({ channel: 'lastfm-store-v1', action, ...values }, sender);
    if (!response.ok) throw new Error(response.error);
    return response.value;
  }
  return { data, send, request, chrome, externalSet: local.set, get writes() { return writes; } };
}

async function mockExtension(page, data = {}, options = {}) {
  // Most artwork suites exercise the optional background-lookup engine. The
  // shipped default (no key) is zero-request; pass {artworkLookups:false} or
  // set the key yourself to test that.
  if (!options.worker && options.artworkLookups !== false && !('lfmArtworkLookups' in data)) data = { ...data, lfmArtworkLookups: true };
  const worker = options.worker || createMockWorker(data, options);
  const binding = '__lastfmMock' + ++sequence;
  await page.exposeFunction(binding, async ({ action, value, url }) => {
    if (action === 'get') return worker.chrome.storage.local.get(value);
    if (action === 'set') return worker.externalSet(value);
    if (action === 'remove') return worker.chrome.storage.local.remove(value);
    const senderUrl = options.senderUrl || (url.startsWith('https://www.last.fm/')
      ? url : 'chrome-extension://test/options.html');
    return worker.send(value, { id: 'test', url: senderUrl });
  });
  await page.evaluate(({ binding, data, experimentalAlbumless }) => {
    window.testExperimentalAlbumless = !!experimentalAlbumless;
    const listeners = new Set();
    window.testData = data;
    window.saved = data;
    const invoke = (action, value) => window[binding]({ action, value, url: location.href });
    window.__lastfmStorageChanged = (changes, latest) => {
      window.testData = latest;
      window.saved = latest;
      for (const listener of listeners) listener(changes, 'local');
    };
    window.chrome = {
      runtime: {
        id: 'test',
        getURL: name => 'chrome-extension://test/' + name,
        getManifest: () => ({ version: '0.5.0' }),
        onMessage: { addListener() {} },
        sendMessage: value => invoke('send', value)
      },
      storage: {
        local: { get: keys => invoke('get', keys), set: values => invoke('set', values), remove: keys => invoke('remove', keys) },
        onChanged: {
          addListener: listener => listeners.add(listener),
          removeListener: listener => listeners.delete(listener)
        }
      }
    };
  }, { binding, data: clone(worker.data), experimentalAlbumless: options.experimentalAlbumless });
  worker.chrome.storage.onChanged.addListener(changes => {
    void page.evaluate(({ changes, data }) => window.__lastfmStorageChanged?.(changes, data),
      { changes, data: clone(worker.data) }).catch(() => {});
  });
  return worker;
}

async function loadScripts(page, files) {
  for (const file of files) {
    await page.addScriptTag({ path: path.join(project, file) });
    if (file === 'store.js') await page.evaluate(() => {
      if (window.testExperimentalAlbumless) globalThis.LastfmStore=Object.freeze({...LastfmStore,FEATURES:{automaticCorrections:true}});
    });
  }
}

function libraryCache(username, entries) {
  const groups = Object.fromEntries(['artists', 'albums', 'tracks'].map(type => [type, {page:2,total:1,done:true,items:{}}]));
  for (const entry of entries) if (groups[entry.type]) {
    const to = entry.rule.to, name = to === to.toUpperCase() ? to.toLowerCase() : to.toUpperCase();
    groups[entry.type].items[entry.id] = {name,...(entry.rule.artist ? {artist:entry.rule.artist} : {})};
  }
  return {version:1,profiles:{[username.toLowerCase()]:{id:'test-library',username,updatedAt:1,groups}}};
}
module.exports = { createMockWorker, mockExtension, loadScripts, libraryCache };

// Māka service worker.
// HTML is always served fresh from the network (bypassing the HTTP cache), with the
// last-seen copy kept only as an offline fallback — so a new Netlify deploy shows up
// on the next normal load, no hard-refresh needed. Static assets are cached.
var VERSION = '2025-07-02-1';
var CACHE = 'maka-' + VERSION;
var ASSETS = ['/manifest.json', '/icon-192.svg', '/icon-512.svg'];

self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ASSETS).catch(function () {}); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url;
  try { url = new URL(req.url); } catch (err) { return; }
  // Let cross-origin requests (Gemini, Supabase, fonts, CDNs) go straight to the network.
  if (url.origin !== location.origin) return;

  var isHTML = req.mode === 'navigate' || (req.headers.get('accept') || '').indexOf('text/html') !== -1;

  if (isHTML) {
    // Always fresh HTML: network first, bypassing the browser HTTP cache; fall back to cache offline.
    e.respondWith(
      fetch(req, { cache: 'no-store' }).then(function (resp) {
        var clone = resp.clone();
        caches.open(CACHE).then(function (c) { c.put(req, clone); });
        return resp;
      }).catch(function () {
        return caches.match(req).then(function (m) { return m || caches.match('/tool.html'); });
      })
    );
    return;
  }

  // Other same-origin assets: cache-first with network fallback (and refresh the cache).
  e.respondWith(
    caches.match(req).then(function (cached) {
      var network = fetch(req).then(function (resp) {
        var clone = resp.clone();
        caches.open(CACHE).then(function (c) { c.put(req, clone); });
        return resp;
      }).catch(function () { return cached; });
      return cached || network;
    })
  );
});

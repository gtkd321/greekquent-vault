// The Intermediate web app moved into the one Greekquent app. This worker replaces the old one, clears only
// the Intermediate cache, steps aside and sends open windows to the one app. Saved work is not in the cache and is not touched.
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k.indexOf('greekquent-intermediate-') === 0; }).map(function (k) { return caches.delete(k); })); })
    .then(function () { return self.registration.unregister(); })
    .then(function () { return self.clients.matchAll({ type: 'window' }); })
    .then(function (cs) { cs.forEach(function (c) { try { c.navigate(new URL('../', c.url).href); } catch (er) {} }); }));
});

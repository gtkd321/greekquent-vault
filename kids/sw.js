// Greekquent web app: works offline after the first visit. Network first for version.json, cache first for
// everything else (file names carry the version, so a new release is fetched fresh). Only this app's cache is used.
const CACHE = 'greekquent-kids-2026-11-18z-66b17e25';
// Other editions live in folders under this one and run their own worker. Leave their requests alone.
const SKIP = [];
const BASE = new URL('./', self.location).pathname;
self.addEventListener('install', e => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then(c => c.addAll(['./', 'index.html', 'app.css', 'shim.js', 'app.js', 'lib/js-yaml.min.js', 'lib/marked.umd.js', 'icon.svg', 'manifest.webmanifest']).catch(() => {}))); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('greekquent-kids-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  if (SKIP.some(d => u.pathname.startsWith(BASE + d))) return;
  const isVer = u.pathname.endsWith('/version.json') || u.pathname.endsWith('/') || u.pathname.endsWith('/index.html');
  if (isVer) {
    e.respondWith(fetch(e.request).then(r => { const c = r.clone(); const key = u.pathname.endsWith('version.json') ? 'version.json' : e.request; caches.open(CACHE).then(x => x.put(key, c)); return r; })
      .catch(() => caches.match(u.pathname.endsWith('version.json') ? 'version.json' : e.request, { ignoreSearch: true }).then(r => r || caches.match('index.html'))));
    return;
  }
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(r => { if (r.ok) { const c = r.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); } return r; })
    .catch(() => caches.match(e.request, { ignoreSearch: true }))));
});

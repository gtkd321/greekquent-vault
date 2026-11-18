// Greekquent moved to https://gtkd321.github.io/frequent/greek/. This worker steps aside; the new app clears the old offline copy itself.
// Progress lives in localStorage on the same origin and is never touched.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => { e.waitUntil((async () => {
  await self.registration.unregister();
  for (const c of await self.clients.matchAll({ type: 'window' })) c.navigate('https://gtkd321.github.io/frequent/greek/').catch(() => {});
})()); });

// Greekquent web app: the frame around the plugin (top bar, bottom buttons, side sheet), updates and backups.
(function () {
'use strict';
const G = window.GQW;
const $ = s => document.querySelector(s);
const ICONS = {
  house: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5"/><circle cx="17" cy="9" r="2.6"/><path d="M16.5 14.6c2.6.2 4.4 1.9 5 5.1"/>',
  list: '<path d="M9 6h11"/><path d="M9 12h11"/><path d="M9 18h11"/><circle cx="4.5" cy="6" r="1.3"/><circle cx="4.5" cy="12" r="1.3"/><circle cx="4.5" cy="18" r="1.3"/>',
  book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/><path d="M8 7h8"/>',
  'more-horizontal': '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>'
};
const icon = n => `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ''}</svg>`;

// The plugin was written for Obsidian. Here the parts that manage Obsidian's own panels have nothing to do,
// and updates come from the website instead of GitHub.
G.patch = P => {
  for (const m of ['pruneEmpty', 'fillBlankLookups', 'hideRibbon', 'hideLinkedView', 'oneTab', 'oneButton', 'fix', 'ensureLocalGraph', 'closeExtraTabs', 'setTabs', 'applyGraphLabels', 'dressGraph', 'importKeyNote'])
    P[m] = function () { return Promise.resolve(); };
  P.updateVault = async function (quiet) { return checkUpdate(!quiet); };
  P.keyModal = function () {};
};

// An old home-screen icon (the address before the move) shows the app inside a full-screen frame with ?home=1.
// Treat that as the home-screen app, and send text and phone links to the top page so Messages opens.
G.home = matchMedia('(display-mode: standalone)').matches || navigator.standalone || /[?&]home=1/.test(location.search);
if (window.top !== window) {
  const open = window.open.bind(window);
  window.open = (u, t, f) => { if (/^(sms|tel|mailto):/i.test(String(u))) { try { window.top.location.href = u; return null; } catch (e) {} } return open(u, t, f); };
}

// More menu: updates happen on their own and work saves itself, so neither needs a button. Backups do.
// "Put it on my home screen" shows only in a browser tab, where it matters most.
// The same three, for Settings and help on Class.
G.helpExtras = () => [...(G.home ? [] : [['Put it on my home screen', () => installHelp()]]), ['Save a copy of my work', () => G.backup()], ['Restore my work', () => G.restore()]];
G.menuHook = menu => {
  const i = menu.items.findIndex(x => x && x.title === 'Update vault');
  if (i < 0) return;
  const mk = (t, fn) => { const it = new (G.MenuItemClass)(); it.setTitle(t).onClick(fn); return it; };
  // A copy of your work as a file, and bringing it back: for a new phone or a new home-screen icon.
  const keep = [mk('Save a copy of my work', () => G.backup()), mk('Restore my work', () => G.restore())];
  menu.items.splice(i, 1, ...(G.home ? [] : [mk('Put it on my home screen', () => installHelp())]), ...keep);
};

function installHelp() {
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const m = new (G.ModalClass)(G.app);
  m.titleEl.setText('Put Greekquent on your home screen');
  const c = m.contentEl;
  if (G.installEvt) {
    c.createEl('p', { text: 'Tap Install. Greekquent then opens like an app and works without internet.' });
    const b = c.createEl('button', { text: 'Install', cls: 'mod-cta' }); b.onclick = async () => { m.close(); G.installEvt.prompt(); G.installEvt = null; };
  } else if (ios) {
    const ol = c.createEl('ol');
    for (const t of ['Open this page in Safari.', 'Tap Share (the square with the arrow).', 'Tap Add to Home Screen, then Add.']) ol.createEl('li', { text: t });
    c.createEl('p', { cls: 'gq-hint', text: 'Use it from the home screen icon. In a Safari tab, an iPhone can clear your colors and φόρα after a week away.' });
    c.createEl('p', { cls: 'gq-hint', text: 'Replacing an old icon? In the old one, tap Class, then Save a copy of my work. In the new one, tap Class, then Restore my work.' });
  } else {
    const ol = c.createEl('ol');
    for (const t of ['Open this page in Chrome.', 'Tap the menu (three dots).', 'Tap Install app or Add to Home screen.']) ol.createEl('li', { text: t });
  }
  c.createEl('p', { cls: 'gq-hint', text: 'Your work saves on this phone as you go.' });
  m.open();
}

let loaded = '';
// A new version downloads in full first (notes and plugin, into the offline cache), then switches in.
// Until it's all on the phone, the app keeps running the version it has, so opening it never waits on the download.
const NOTES_URL = v => 'notes.json?v=' + encodeURIComponent(v), PLUG_URL = v => 'vault/.obsidian/plugins/greekquent-student-layout/main.js?v=' + encodeURIComponent(v);
let fetching = null;
function prefetch(v) {
  if (localStorage.getItem('gqw:ready') === v) return Promise.resolve(true);
  if (fetching && fetching.v === v) return fetching.p;
  const p = Promise.all([fetch(NOTES_URL(v)).then(r => { if (!r.ok) throw 0; return r.arrayBuffer(); }), fetch(PLUG_URL(v)).then(r => { if (!r.ok) throw 0; return r.text(); })])
    .then(() => new Promise(r => setTimeout(r, 1500))).then(() => { try { localStorage.setItem('gqw:ready', v); } catch (e) {} return true; }).catch(() => false);
  fetching = { v, p }; return p;
}
// Old versions' notes leave the cache once a newer one is in use.
function tidyCache() {
  if (!window.caches) return;
  const keep = new Set([loaded, localStorage.getItem('gqw:ready')].filter(Boolean)), bases = [new URL('notes.json', location.href).href, new URL(PLUG_URL('x').split('?')[0], location.href).href];
  caches.keys().then(ks => ks.forEach(k => caches.open(k).then(c => c.keys().then(rs => rs.forEach(rq => {
    const [b, q] = rq.url.split('?'); if (!bases.includes(b) || !q) return; const v = new URLSearchParams(q).get('v'); if (v && !keep.has(v)) c.delete(rq);
  }))))).catch(() => {});
}
async function checkUpdate(loud, wait) {
  try {
    const r = await fetch('version.json?t=' + Date.now(), { cache: 'no-store' }); const v = (await r.json()).version;
    if (v && v !== loaded) {
      if (loud) new Notice('Updating. Your work stays as it is.');
      try { const reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration(); if (reg) await reg.update(); } catch (e) {}
      const ok = await prefetch(v);
      if (wait || (!loud && !ok)) return true; // ready for the next break; nothing changes on screen
      sessionStorage.setItem('gqw-updated', v);
      setTimeout(() => location.reload(), loud ? 700 : 0);
      return true;
    }
    if (loud) new Notice('You have the newest version (' + loaded + ').');
  } catch (e) { if (loud) new Notice('No internet right now. Greekquent still works; it updates next time you are online.'); }
  return false;
}

function frame() {
  const head = $('#gq-head'), title = $('#gq-title'), back = $('#gq-back');
  back.onclick = () => G.app.workspace.back();
  G.onHead = () => {
    const ws = G.app.workspace, v = ws.main.view;
    const t = v && v.getDisplayText ? v.getDisplayText() : '';
    title.textContent = t || 'Greekquent';
    back.hidden = !ws.stack.length;
    document.title = (t && t !== 'Today' ? t + ' · ' : '') + 'Greekquent Beginner';
    if (G.navSync) G.navSync();
  };
  // The phone's back button: a window's own history step closes just that window; closing a window with × takes its step back quietly.
  window.addEventListener('popstate', async () => { if (G.skipPop) { G.skipPop--; return; } G.popping = true; try { await G.app.workspace.back(); } finally { G.popping = false; } });
  // Bottom bar: Today, Words, Class. More sits at the top right. Words and Class appear once they are unlocked;
  // with only Today there is no bar at all.
  const nav = $('#gq-nav');
  for (const r of G.ribbon) {
    const more = r.title === 'More';
    // Everything that was in ⋯ now lives in the three tabs (Settings and help is at the bottom of Class).
    if (more) continue;
    const b = (more ? head : nav).createEl('button', { cls: more ? 'gq-headmore' : 'gq-navbtn', attr: { 'aria-label': r.title } });
    b.innerHTML = icon(r.icon) + (more ? '' : `<span>${r.title === 'Look up a word' ? 'Look up' : r.title}</span>`);
    b.onclick = e => r.cb(e); r.btn = b;
  }
  // Resources (verb tables and other reference pages) stay at the top right on every screen.
  const rs = head.createEl('button', { cls: 'gq-headmore gq-headres', attr: { 'aria-label': 'Resources: verb tables and more' } });
  rs.innerHTML = icon('book');
  rs.onclick = () => G.plugin && G.plugin.resourcesPop && G.plugin.resourcesPop();
  G.navSync = () => {
    let n = 0;
    for (const r of G.ribbon) { if (!r.btn || r.title === 'More') continue; const off = r.el.classList.contains('gq-hide'); r.btn.hidden = off; if (r.el.dataset.tour) r.btn.dataset.tour = r.el.dataset.tour; if (!off) n++; }
    document.body.classList.toggle('gq-nonav', n < 2); nav.hidden = n < 2;
    const v = G.app.workspace.main.view, on = G.plugin && G.plugin.tabFor ? G.plugin.tabFor(v) : '';
    for (const r of G.ribbon) if (r.btn && r.title !== 'More') { if (r.title === on) r.btn.setAttribute('aria-current', 'page'); else r.btn.removeAttribute('aria-current'); }
  };
  G.navSync();
  $('#gq-sheet-close').onclick = () => G.app.workspace.closeSheet();
  $('#gq-sheet-bg').onclick = () => G.app.workspace.closeSheet();
  // Links in notes: other notes open here; obsidian:// links go to the plugin; files open in a new tab.
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('a'); if (!a || e.defaultPrevented) return;
    const href = a.getAttribute('href') || '';
    if (a.classList.contains('internal-link') && a.dataset.href) {
      e.preventDefault();
      const ws = G.app.workspace, src = ws.getActiveFile() ? ws.getActiveFile().path : '';
      const f = G.resolveLink(a.dataset.href, src);
      if (!f) { new Notice(a.dataset.href + ' is not in this app yet.'); return; }
      ws.main.openFile(f);
      return;
    }
    if (href.startsWith('obsidian://')) { e.preventDefault(); proto(href); }
  });
}
function proto(href) {
  try {
    const u = new URL(href.replace(/^obsidian:\/\//, 'https://x/'));
    const action = u.pathname.replace(/^\//, '') || u.hostname; const p = { action };
    u.searchParams.forEach((v, k) => { p[k] = v; });
    const act = href.replace(/^obsidian:\/\//, '').split(/[?/]/)[0];
    if (G.proto[act]) { G.proto[act](p); return; }
    if (act === 'open' && p.file) { const f = G.resolveLink(p.file, ''); if (f) G.app.workspace.main.openFile(f); }
  } catch (e) { console.error(e); }
}

async function boot() {
  const status = $('#gq-boot-msg');
  try {
    const vr = await fetch('version.json?t=' + Date.now(), { cache: 'no-store' }).then(r => r.json()).catch(() => null);
    const net = vr && vr.version, have = localStorage.getItem('gqw:ready') || localStorage.getItem('gqw:lastver');
    // Every open starts on the newest release. If it is slow to arrive (over 8 seconds) or the phone is offline,
    // the copy already on this device opens instead and the new one switches in at the next break.
    if (!net && !have) throw new Error('offline before the first visit');
    const get = v => Promise.all([
      fetch(NOTES_URL(v)).then(r => { if (!r.ok) throw new Error('notes ' + r.status); return r.json(); }),
      fetch(PLUG_URL(v)).then(r => { if (!r.ok) throw new Error('plugin ' + r.status); return r.text(); })
    ]);
    let v = net || have, got = null;
    if (net && have && net !== have) {
      got = await Promise.race([get(net), new Promise((_, no) => setTimeout(() => no(new Error('slow')), 8000))]).catch(() => null);
      if (!got) v = have;
    }
    if (!got) { try { got = await get(v); } catch (e) { if (!net || v === net) throw e; v = net; got = await get(v); } }
    const [bundle, src] = got; loaded = v;
    try { localStorage.setItem('gqw:lastver', v); localStorage.setItem('gqw:ready', v); } catch (e) {}
    if (net && net !== v) setTimeout(() => prefetch(net), 4000); else setTimeout(tidyCache, 8000);
    bundle.version = v;
    const app = await G.start(bundle, src);
    G.ModalClass = window.GQW_obs.Modal; G.MenuItemClass = window.GQW_obs.MenuItem;
    app.workspace.mount($('#gq-main'), $('#gq-sheet'));
    app.workspace.sheetBody = $('#gq-sheet-body');
    frame();
    $('#gq-boot').remove();
    app.workspace.ready();
    const up = sessionStorage.getItem('gqw-updated'); if (up) { sessionStorage.removeItem('gqw-updated'); setTimeout(() => new Notice('Updated to ' + up + '. Your work is all here.'), 1500); }
    // A new release reaches an open tab or home-screen app without anyone tapping anything:
    // coming back to the tab, or a tab left open and untouched for 3 minutes (checked every 5), reloads onto it.
    // Never while someone is typing. Work and progress are saved on the device, so a reload loses nothing.
    let touched = Date.now();
    const typing = () => { const a = document.activeElement; return !!(a && (/^(INPUT|TEXTAREA)$/.test(a.tagName) || a.isContentEditable) && (a.value || a.textContent)); };
    ['pointerdown', 'keydown'].forEach(t => document.addEventListener(t, () => { touched = Date.now(); }, true));
    setInterval(() => { if (document.visibilityState === 'visible') checkUpdate(false, typing() || Date.now() - touched < 3 * 60 * 1000); }, 5 * 60 * 1000);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') checkUpdate(false, typing()); });
  } catch (e) {
    console.error(e);
    status.textContent = 'Greekquent could not start (' + (e && e.message || e) + '). Check the internet connection and open the link again.';
  }
}
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); G.installEvt = e; });
if ('serviceWorker' in navigator && location.protocol === 'https:' && window.top === window) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
boot();
})();

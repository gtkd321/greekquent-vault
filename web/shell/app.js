// Greekquent web app: the frame around the plugin (top bar, bottom buttons, side sheet), updates and backups.
(function () {
'use strict';
const G = window.GQW;
const $ = s => document.querySelector(s);
const ICONS = {
  house: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5"/><circle cx="17" cy="9" r="2.6"/><path d="M16.5 14.6c2.6.2 4.4 1.9 5 5.1"/>',
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

// More menu: updates happen on their own and work saves itself, so neither needs a button.
// "Put it on my home screen" shows only in a browser tab, where it matters most.
G.menuHook = menu => {
  const i = menu.items.findIndex(x => x && x.title === 'Update vault');
  if (i < 0) return;
  const home = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  if (home) { menu.items.splice(i, 1); return; }
  const it = new (G.MenuItemClass)(); it.setTitle('Put it on my home screen').onClick(() => installHelp());
  menu.items.splice(i, 1, it);
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
  } else {
    const ol = c.createEl('ol');
    for (const t of ['Open this page in Chrome.', 'Tap the menu (three dots).', 'Tap Install app or Add to Home screen.']) ol.createEl('li', { text: t });
  }
  c.createEl('p', { cls: 'gq-hint', text: 'Your work saves on this phone as you go.' });
  m.open();
}

let loaded = '';
async function checkUpdate(loud, wait) {
  try {
    const r = await fetch('version.json?t=' + Date.now(), { cache: 'no-store' }); const v = (await r.json()).version;
    if (v && v !== loaded) {
      if (loud) new Notice('Updating. Your work stays as it is.');
      try { const reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration(); if (reg) await reg.update(); } catch (e) {}
      if (wait) return true; // ready for the next break; nothing changes on screen
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
  };
  window.addEventListener('popstate', () => { G.app.workspace.back(); });
  const nav = $('#gq-nav');
  for (const r of G.ribbon) {
    const b = nav.createEl('button', { cls: 'gq-navbtn', attr: { 'aria-label': r.title } });
    b.innerHTML = icon(r.icon) + `<span>${r.title === 'Look up a word' ? 'Look up' : r.title}</span>`;
    b.onclick = e => r.cb(e);
  }
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
    let v = vr && vr.version;
    if (!v) v = localStorage.getItem('gqw:lastver');
    if (!v) throw new Error('offline before the first visit');
    loaded = v;
    const [bundle, src] = await Promise.all([
      fetch('notes.json?v=' + encodeURIComponent(v)).then(r => { if (!r.ok) throw new Error('notes ' + r.status); return r.json(); }),
      fetch('vault/.obsidian/plugins/greekquent-student-layout/main.js?v=' + encodeURIComponent(v)).then(r => r.text())
    ]);
    try { localStorage.setItem('gqw:lastver', v); } catch (e) {}
    bundle.version = v;
    const app = await G.start(bundle, src);
    G.ModalClass = window.GQW_obs.Modal; G.MenuItemClass = window.GQW_obs.MenuItem;
    app.workspace.mount($('#gq-main'), $('#gq-sheet'));
    app.workspace.sheetBody = $('#gq-sheet-body');
    frame();
    $('#gq-boot').remove();
    app.workspace.ready();
    const up = sessionStorage.getItem('gqw-updated'); if (up) { sessionStorage.removeItem('gqw-updated'); setTimeout(() => new Notice('Updated to ' + up + '. Your work is all here.'), 1500); }
    // Never reload under someone mid-activity. A new version is fetched quietly and switched in at a natural break:
    // the next launch, or coming back after 10+ minutes away.
    let away = 0;
    setInterval(() => checkUpdate(false, true), 30 * 60 * 1000);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') { away = Date.now(); return; }
      checkUpdate(false, Date.now() - away < 10 * 60 * 1000);
    });
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

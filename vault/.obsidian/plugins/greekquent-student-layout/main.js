const { Plugin, ItemView, Notice, requestUrl, MarkdownView, Modal } = require('obsidian');
// Greekquent Student Layout: keeps the student view simple.
// Turn this plugin off (Settings > Community plugins) to get the full Obsidian interface back.
const MOVE = ['search', 'tag', 'bookmarks', 'backlink', 'outgoing-link', 'outline', 'localgraph'];
const BLOCK = ['graph', 'all-properties'];   // the whole-vault graph and the properties list
const HIDE_RIBBON = ['graph:Open graph view', 'command-palette:Open command palette'];
const KEEP_RIBBON = ['greekquent-student-layout:Open word graph', 'greekquent-student-layout:Share feedback', 'greekquent-student-layout:Send homework', 'greekquent-student-layout:Update vault', 'greekquent-student-layout:Look up a word', 'greekquent-student-layout:Ask the group', 'greekquent-student-layout:Ask on video'];
// Feedback goes to the teacher by text message. Change the number here if it ever changes.
const FEEDBACK_SMS = '+18033990665';
const VAULT_RELEASE = '2026-11-14c';
// Weekly updates come from the teacher's GitHub repository (public, read-only for students).
const UPDATE_BASE = 'https://raw.githubusercontent.com/gtkd321/greekquent-vault/main/';
const MY_WORK = 'My Work/';
// Never touched by updates: the student's own work and their window layout.
const KEEP_LOCAL = p => p.startsWith(MY_WORK) || /^\.obsidian\/workspace(-mobile)?\.json$/.test(p) || p.startsWith('.trash/');
const INSTALLED = '.obsidian/greekquent-release.json';
// Ask the group: links point at the note on GitHub so anyone in GroupMe can open it, on any phone.
const NOTE_URL = 'https://github.com/gtkd321/greekquent-vault/blob/main/vault/';
// Paste the class GroupMe share link here (looks like https://groupme.com/join_group/...). Empty = no Join button.
const GROUPME_JOIN = '';
// Video questions: the public question library (GitHub Pages). Only the teacher adds clips, with the student's OK.
const QUESTIONS_URL = 'https://gtkd321.github.io/greekquent-questions/';
const VIDEO_MAX_S = 45;
const VIDEO_MAX_MB = 48;   // GroupMe takes videos up to about 50 MB
const NAME_KEY = 'greekquent-first-name';
const LOOKUPS = MY_WORK + 'Words I looked up.md';
const isGreek = t => /[\u0370-\u03ff\u1f00-\u1fff]/.test(t);
const fold = t => (t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ς/g, 'σ').trim();
const smsLink = body => `sms:${FEEDBACK_SMS}?&body=${encodeURIComponent(body)}`;

const HIDE_RIBBON_PREFIX = ['meld-encrypt:'];
const HIDE_COMMANDS = ['graph:open', 'graph:animate', 'canvas:new-file', 'file-explorer:new-file', 'file-explorer:new-file-in-new-pane', 'workspace:new-tab'];
const BANDS = ['0001-0150','0151-0300','0301-0450','0451-0600','0601-0750','0751-0900','0901-1050','1051-1200','1201-1350','1351-1500'];
const BAND_RGB = [0x1a9850,0x66bd63,0xa6d96a,0xd9ef8b,0xfee08b,0xfdae61,0xf46d43,0xd73027,0xa50026,0x7f0020];
const LOCAL_OPTIONS = {
  // Word web: only the words a note links to (its "Often appears with" list), not the hundreds of notes linking back.
  'collapse-filter': true, search: 'path:"Words/"', localJumps: 1, localBacklinks: false, localForelinks: true, localInterlinks: true,
  showTags: false, showAttachments: false, hideUnresolved: true, showOrphans: false,
  colorGroups: BANDS.map((b, i) => ({ query: 'tag:#band/' + b, color: { a: 1, rgb: BAND_RGB[i] } })),
  'collapse-color-groups': true, 'collapse-display': true, 'collapse-forces': true, showArrow: false, textFadeMultiplier: 0, nodeSizeMultiplier: 1, lineSizeMultiplier: 1,
  // Calm forces (Obsidian defaults: center 0.52, repel 10, link 1, distance 250).
  // Low repel + strong center = less push after a touch, so the graph settles sooner. It still breathes a little.
  centerStrength: 0.9, repelStrength: 3, linkStrength: 1, linkDistance: 120
};

// ---------- Word web: a full-screen, explore-in-place graph of "Often appears with" partners ----------
const WEB = 'greekquent-word-web';
const SVGNS = 'http://www.w3.org/2000/svg';
const bandColor = rank => '#' + BAND_RGB[Math.min(9, Math.max(0, Math.floor((rank - 1) / 150)))].toString(16).padStart(6, '0');
class WordWebView extends ItemView {
  // Calm motion: every move is one eased glide (no springs, no overshoot, no idle drift).
  constructor(leaf, plugin) { super(leaf); this.plugin = plugin; this.hist = []; this.pos = -1; this.nodes = new Map(); this.edges = new Map(); this.cam = { x: 0, y: 0, k: 1 }; this.anim = null; }
  getViewType() { return WEB; }
  getDisplayText() { const c = this.cur(); return c ? 'Word web: ' + c.replace(/^Words\//, '').replace(/\.md$/, '') : 'Word web'; }
  getIcon() { return 'waypoints'; }
  cur() { return this.hist[this.pos]; }
  getState() { return { path: this.cur() || '' }; }
  async setState(st, res) { if (st && st.path && st.path !== this.cur()) await this.go(st.path); return super.setState(st, res); }
  dur() { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 120 : 700; }
  info(path) {
    const f = this.app.vault.getAbstractFileByPath(path); if (!f) return null;
    const fm = (this.app.metadataCache.getFileCache(f) || {}).frontmatter || {};
    return { file: f, word: f.basename, en: fm.english || '', say: fm.pronunciation || '', rank: fm.rank || 1500 };
  }
  async partners(path) {
    if (!this.plugin.pcache) this.plugin.pcache = new Map();
    if (this.plugin.pcache.has(path)) return this.plugin.pcache.get(path);
    const f = this.app.vault.getAbstractFileByPath(path); if (!f) return [];
    const txt = await this.app.vault.cachedRead(f);
    const m = txt.match(/## Often appears with\n([\s\S]*?)(\n## |$)/);
    const out = [];
    if (m) for (const mm of m[1].matchAll(/\[\[([^\]|#]+)/g)) {
      const t = this.app.metadataCache.getFirstLinkpathDest(mm[1].trim(), path);
      if (t && t.path.startsWith('Words/') && !out.includes(t.path)) out.push(t.path);
    }
    this.plugin.pcache.set(path, out); return out;
  }
  async onOpen() {
    const root = this.contentEl; root.empty(); root.addClass('gq-web');
    const bar = root.createDiv('gq-web-bar');
    this.backBtn = bar.createEl('button', { text: '←', attr: { 'aria-label': 'Back' } });
    this.fwdBtn = bar.createEl('button', { text: '→', attr: { 'aria-label': 'Forward' } });
    this.titleEl = bar.createDiv('gq-web-title');
    this.sayBtn = bar.createEl('button', { text: 'Hear it', attr: { 'aria-label': 'Say the word' } });
    this.openBtn = bar.createEl('button', { text: 'Open note', attr: { 'aria-label': 'Open the word note' } });
    this.trail = root.createDiv('gq-web-trail');
    this.svg = root.createSvg('svg', { attr: { viewBox: '-520 -400 1040 800', class: 'gq-web-svg' } });
    this.view = this.svg.createSvg('g');
    this.edgeG = this.view.createSvg('g'); this.nodeG = this.view.createSvg('g');
    this.backBtn.onclick = () => this.step(-1); this.fwdBtn.onclick = () => this.step(1);
    this.openBtn.onclick = () => { const i = this.info(this.cur()); if (i) this.app.workspace.getLeaf('tab').openFile(i.file); };
    this.sayBtn.onclick = () => { const i = this.info(this.cur()); if (i && window.speechSynthesis) { const u = new SpeechSynthesisUtterance(i.word); u.lang = 'el-GR'; speechSynthesis.cancel(); speechSynthesis.speak(u); } };
    this.registerDomEvent(root, 'keydown', e => { if (e.key === 'ArrowLeft' || e.key === 'Backspace') { this.step(-1); e.preventDefault(); } if (e.key === 'ArrowRight') { this.step(1); e.preventDefault(); } });
    this.registerDomEvent(root, 'mouseup', e => { if (e.button === 3) this.step(-1); if (e.button === 4) this.step(1); });
    this.bindPointer(); root.tabIndex = 0;
    if (!this.cur()) { const a = this.app.workspace.getActiveFile(); await this.go(a && a.path.startsWith('Words/') ? a.path : (this.app.vault.getAbstractFileByPath('Words/θέλω.md') ? 'Words/θέλω.md' : this.app.vault.getMarkdownFiles().find(f => f.path.startsWith('Words/')).path)); }
  }
  // ---- pan, zoom, drag (direct manipulation: things move only while your finger or mouse moves them) ----
  toSvg(e) { const r = this.svg.getBoundingClientRect(); const vb = this.svg.viewBox.baseVal; const sc = Math.max(vb.width / r.width, vb.height / r.height); return { x: (e.clientX - r.left - r.width / 2) * sc, y: (e.clientY - r.top - r.height / 2) * sc }; }
  applyCam() { const c = this.cam; this.view.setAttr('transform', `translate(${c.x},${c.y}) scale(${c.k})`); }
  bindPointer() {
    const pts = new Map(); let drag = null, pinch = null;
    this.registerDomEvent(this.svg, 'pointerdown', e => {
      this.svg.setPointerCapture(e.pointerId); pts.set(e.pointerId, this.toSvg(e));
      const g = e.target.closest && e.target.closest('.gq-node');
      if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), k: this.cam.k }; drag = null; return; }
      drag = { start: this.toSvg(e), cam: { ...this.cam }, node: g ? g.dataset.path : null, moved: false };
      if (drag.node) { const n = this.nodes.get(drag.node); drag.n0 = { x: n.x, y: n.y }; }
    });
    this.registerDomEvent(this.svg, 'pointermove', e => {
      if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, this.toSvg(e));
      if (pinch && pts.size === 2) { const [a, b] = [...pts.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); this.cam.k = Math.min(2.5, Math.max(0.5, pinch.k * d / pinch.d)); this.applyCam(); return; }
      if (!drag) return; const p = this.toSvg(e); const dx = p.x - drag.start.x, dy = p.y - drag.start.y;
      if (Math.hypot(dx, dy) > 6) drag.moved = true; if (!drag.moved) return;
      if (drag.node) { const n = this.nodes.get(drag.node); n.x = drag.n0.x + dx / this.cam.k; n.y = drag.n0.y + dy / this.cam.k; this.paint(); }
      else { this.cam.x = drag.cam.x + dx; this.cam.y = drag.cam.y + dy; this.applyCam(); }
    });
    const up = e => {
      pts.delete(e.pointerId); if (pts.size < 2) pinch = null;
      if (drag && !drag.moved && drag.node) this.go(drag.node);
      if (pts.size === 0) drag = null;
    };
    this.registerDomEvent(this.svg, 'pointerup', up); this.registerDomEvent(this.svg, 'pointercancel', up);
    this.registerDomEvent(this.svg, 'wheel', e => { e.preventDefault(); const p = this.toSvg(e); const k0 = this.cam.k; const k = Math.min(2.5, Math.max(0.5, k0 * Math.exp(-e.deltaY * 0.0015))); this.cam.x = p.x - (p.x - this.cam.x) * k / k0; this.cam.y = p.y - (p.y - this.cam.y) * k / k0; this.cam.k = k; this.applyCam(); }, { passive: false });
    this.registerDomEvent(this.svg, 'dblclick', e => { if (!(e.target.closest && e.target.closest('.gq-node'))) this.glide(null); });
  }
  async step(d) { const n = this.pos + d; if (n < 0 || n >= this.hist.length) return; this.pos = n; await this.render(); }
  async go(path) { if (path === this.cur()) return; this.hist = this.hist.slice(0, this.pos + 1); this.hist.push(path); this.pos = this.hist.length - 1; await this.render(); }
  async layout(c) {
    const p1 = (await this.partners(c)).slice(0, 8);
    const lay = new Map(); lay.set(c, { x: 0, y: 0, ring: 0, parent: null });
    const R1 = 230, R2 = 360;
    // keep partners roughly where they already are, so the eye can follow them
    // the word you came from sits on the side you came from, so the move reads as one continuous step
    const prev = this.nodes.get(c); const from = this.lastCenter;
    let off = -Math.PI / 2;
    if (prev && from && p1.includes(from) && (prev.x || prev.y)) { p1.splice(p1.indexOf(from), 1); p1.unshift(from); off = Math.atan2(-prev.y, -prev.x); }
    this.lastCenter = c;
    p1.forEach((p, k) => { const a = off + k * 2 * Math.PI / Math.max(1, p1.length); lay.set(p, { x: R1 * Math.cos(a), y: R1 * Math.sin(a) * 0.82, ring: 1, a, parent: c }); });
    const edges = p1.map(p => [c, p]);
    for (const p of p1) {
      const a = lay.get(p).a; const kids = (await this.partners(p)).filter(q => !lay.has(q)).slice(0, 2);
      kids.forEach((q, j) => { const b = a + (j - (kids.length - 1) / 2) * 0.32; lay.set(q, { x: R2 * Math.cos(b), y: R2 * Math.sin(b) * 0.82, ring: 2, parent: p }); edges.push([p, q]); });
    }
    return { lay, edges };
  }
  async render() {
    if (!this.svg) return;
    const c = this.cur(), ci = this.info(c); if (!ci) return;
    const { lay, edges } = await this.layout(c);
    // nodes: existing ones glide from where they are; new ones grow out of their parent; leaving ones fade toward the center
    for (const [path, L] of lay) {
      const i = this.info(path); if (!i) continue;
      let n = this.nodes.get(path);
      if (!n) {
        const par = L.parent && this.nodes.get(L.parent);
        const g = this.nodeG.createSvg('g', { attr: { class: 'gq-node' } }); g.dataset.path = path;
        g.createSvg('circle'); g.createSvg('text', { attr: { class: 'gq-gr' } }); g.createSvg('text', { attr: { class: 'gq-en' } });
        g.addEventListener('pointerenter', () => this.hover(path, true)); g.addEventListener('pointerleave', () => this.hover(path, false));
        n = { g, x: par ? par.x : L.x * 0.6, y: par ? par.y : L.y * 0.6, r: 6, o: 0 }; this.nodes.set(path, n);
      }
      n.leaving = false; n.from = { x: n.x, y: n.y, r: n.r, o: n.o };
      n.to = { x: L.x, y: L.y, r: L.ring === 0 ? 46 : L.ring === 1 ? 30 : 18, o: L.ring === 2 ? 0.75 : 1 };
      n.g.setAttr('class', 'gq-node gq-ring' + L.ring);
      const [circ, gr, en] = n.g.children; circ.style.fill = bandColor(i.rank);
      gr.textContent = i.word; en.textContent = L.ring === 2 ? '' : i.en; n.ring = L.ring;
    }
    for (const [path, n] of this.nodes) if (!lay.has(path)) { n.leaving = true; n.from = { x: n.x, y: n.y, r: n.r, o: n.o }; n.to = { x: n.x * 0.85, y: n.y * 0.85, r: n.r * 0.6, o: 0 }; }
    const keep = new Set(edges.map(([a, b]) => a + '|' + b));
    for (const [a, b] of edges) { const k = a + '|' + b; if (!this.edges.has(k)) { const ln = this.edgeG.createSvg('line', { attr: { class: 'gq-edge' } }); this.edges.set(k, { ln, a, b, o: 0 }); } }
    for (const [k, e] of this.edges) { e.from = e.o; e.to = keep.has(k) ? (this.nodes.get(e.a).to.r > 20 && this.nodes.get(e.b).to.r > 20 ? 1 : 0.45) : 0; e.leaving = !keep.has(k); }
    this.titleEl.setText(`${ci.word} · ${ci.en}${ci.say ? ' · say it: ' + ci.say : ''} · #${ci.rank}`);
    this.backBtn.disabled = this.pos <= 0; this.fwdBtn.disabled = this.pos >= this.hist.length - 1;
    this.trail.setText(this.hist.slice(Math.max(0, this.pos - 6), this.pos + 1).map(h => h.replace(/^Words\//, '').replace(/\.md$/, '')).join('  ›  '));
    this.leaf.updateHeader && this.leaf.updateHeader();
    this.app.workspace.requestSaveLayout && this.app.workspace.requestSaveLayout();
    this.glide(true);
  }
  glide(nodesToo) {
    // one eased move for nodes, lines and camera together; ease-in-out, settles exactly (no bounce)
    const t0 = performance.now(), D = this.dur(); const cam0 = { ...this.cam };
    if (this.anim) cancelAnimationFrame(this.anim);
    const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const tick = now => {
      const t = Math.min(1, (now - t0) / D), e = ease(t);
      this.cam.x = cam0.x * (1 - e); this.cam.y = cam0.y * (1 - e); this.cam.k = cam0.k + (1 - cam0.k) * e; this.applyCam();
      if (nodesToo) {
        for (const n of this.nodes.values()) { n.x = n.from.x + (n.to.x - n.from.x) * e; n.y = n.from.y + (n.to.y - n.from.y) * e; n.r = n.from.r + (n.to.r - n.from.r) * e; n.o = n.from.o + (n.to.o - n.from.o) * e; }
        for (const ed of this.edges.values()) ed.o = ed.from + (ed.to - ed.from) * e;
      }
      this.paint();
      if (t < 1) this.anim = requestAnimationFrame(tick);
      else { this.anim = null; if (nodesToo) this.cleanup(); }
    };
    this.anim = requestAnimationFrame(tick);
  }
  cleanup() {
    for (const [p, n] of this.nodes) if (n.leaving) { n.g.remove(); this.nodes.delete(p); }
    for (const [k, e] of this.edges) if (e.leaving) { e.ln.remove(); this.edges.delete(k); }
  }
  paint() {
    for (const n of this.nodes.values()) {
      n.g.setAttr('transform', `translate(${n.x.toFixed(1)},${n.y.toFixed(1)})`); n.g.style.opacity = n.o.toFixed(3);
      const [circ, gr, en] = n.g.children; circ.setAttr('r', n.r.toFixed(1)); gr.setAttr('y', (n.r + 24).toFixed(1)); en.setAttr('y', (n.r + 46).toFixed(1));
    }
    for (const e of this.edges.values()) {
      const A = this.nodes.get(e.a), B = this.nodes.get(e.b); if (!A || !B) continue;
      e.ln.setAttr('x1', A.x.toFixed(1)); e.ln.setAttr('y1', A.y.toFixed(1)); e.ln.setAttr('x2', B.x.toFixed(1)); e.ln.setAttr('y2', B.y.toFixed(1));
      e.ln.style.opacity = e.o.toFixed(3);
    }
  }
  hover(path, on) {
    this.svg.toggleClass('gq-focus', on);
    for (const [p, n] of this.nodes) n.g.toggleClass('gq-lit', on && p === path);
    for (const e of this.edges.values()) e.ln.toggleClass('gq-lit', on && (e.a === path || e.b === path));
    if (on) for (const e of this.edges.values()) if (e.a === path || e.b === path) { const o = this.nodes.get(e.a === path ? e.b : e.a); o && o.g.addClass('gq-lit'); }
  }
}

// ---------- Look up a word: the 1,500 first, then a free translator for bonus words ----------
class LookupModal extends Modal {
  constructor(app, plugin) { super(app); this.plugin = plugin; }
  onOpen() {
    const c = this.contentEl; c.addClass('gq-modal'); this.titleEl.setText('Look up a word');
    this.input = c.createEl('input', { type: 'text', attr: { placeholder: 'Type English or Greek', autocapitalize: 'off', autocomplete: 'off', spellcheck: 'false' } });
    this.input.addClass('gq-input');
    const row = c.createDiv('gq-row');
    const lab = row.createEl('label'); this.guess = lab.createEl('input', { type: 'checkbox' }); lab.appendText(' Guess first (hide the answer until I try)');
    this.guess.checked = !!this.plugin.guessFirst;
    this.guess.onchange = () => { this.plugin.guessFirst = this.guess.checked; this.render(); };
    this.list = c.createDiv('gq-results');
    this.input.oninput = () => this.render();
    this.input.onkeydown = e => { if (e.key === 'Enter') { const b = this.list.querySelector('.gq-hit button, .gq-bonus button'); b && b.click(); } };
    this.plugin.wordIndex().then(() => this.render());
    setTimeout(() => this.input.focus(), 50);
  }
  render() {
    const q = this.input.value.trim(), L = this.list; L.empty();
    if (!q) { L.createDiv({ cls: 'gq-hint', text: 'Words from the 1,500 open in the word graph. Anything else is a bonus word.' }); return; }
    const hits = this.plugin.findWords(q);
    const hide = this.guess.checked;
    for (const w of hits) {
      const row = L.createDiv('gq-hit');
      const t = row.createDiv('gq-hit-text');
      const greekQuery = isGreek(q);
      if (hide) {
        // Guessing first (pretesting) helps the answer stick, even when the guess is wrong.
        t.createDiv({ cls: 'gq-hit-main', text: greekQuery ? `${w.word} = ?` : `${w.english} = ?` });
        t.createDiv({ cls: 'gq-hit-sub', text: `#${w.rank}  Say your guess out loud, then reveal.` });
        const r = row.createEl('button', { text: 'Reveal' });
        r.onclick = () => { this.plugin.logLookup(q, w); row.empty(); this.fill(row, w); };
      } else this.fill(row, w, q);
    }
    if (!hits.length) L.createDiv({ cls: 'gq-hint', text: 'Not in the 1,500.' });
    const b = L.createDiv('gq-bonus');
    b.createDiv({ cls: 'gq-hit-sub', text: hits.length ? 'Want a different word?' : 'Bonus word: look it up for free and add it to your notes if you like it.' });
    const tb = b.createEl('button', { text: `Translate "${q}"` });
    tb.onclick = () => { this.plugin.logLookup(q, null); window.open(this.plugin.translateUrl(q)); };
  }
  fill(row, w, q) {
    const t = row.createDiv('gq-hit-text');
    t.createDiv({ cls: 'gq-hit-main', text: `${w.word}  ·  ${w.english}` });
    t.createDiv({ cls: 'gq-hit-sub', text: `${w.pron ? 'say it: ' + w.pron + '  ·  ' : ''}#${w.rank} of 1,500${w.form ? '  ·  form: ' + w.form : ''}` });
    const g = row.createEl('button', { text: 'Word graph' });
    g.onclick = () => { if (q) this.plugin.logLookup(q, w); this.close(); this.plugin.openGraph(w.path); };
  }
  onClose() { this.contentEl.empty(); }
}

// ---------- Ask the group: a question about the note you are on, ready to paste into GroupMe ----------
class AskModal extends Modal {
  constructor(app, plugin, file) { super(app); this.plugin = plugin; this.file = file; }
  onOpen() {
    const c = this.contentEl; c.addClass('gq-modal'); this.titleEl.setText('Ask the group');
    const head = this.plugin.askHeader(this.file);
    c.createDiv({ cls: 'gq-hit-main', text: head });
    this.box = c.createEl('textarea', { attr: { rows: 4, placeholder: 'Your question (English or Greek)' } }); this.box.addClass('gq-input');
    const row = c.createDiv('gq-row');
    const send = row.createEl('button', { text: 'Share to GroupMe', cls: 'mod-cta' });
    send.onclick = async () => { await this.plugin.shareQuestion(head + '\n' + this.box.value.trim() + '\n' + this.plugin.noteUrl(this.file)); this.close(); };
    const vid = row.createEl('button', { text: 'Ask on video instead' });
    vid.onclick = () => { const t = this.box.value.trim(); this.close(); new VideoAskModal(this.app, this.plugin, this.file, t).open(); };
    if (GROUPME_JOIN) { const j = row.createEl('button', { text: 'Join the class group' }); j.onclick = () => window.open(GROUPME_JOIN); }
    c.createDiv({ cls: 'gq-hint', text: 'Pick GroupMe in the share menu. On a computer the message is copied: paste it into the class group.' });
    setTimeout(() => this.box.focus(), 50);
  }
  onClose() { this.contentEl.empty(); }
}

// ---------- Ask on video: record up to 45 seconds, then share the clip to the class GroupMe ----------
const pickMime = () => {
  if (typeof MediaRecorder === 'undefined') return null;
  for (const m of ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp8,opus', 'video/webm']) { try { if (MediaRecorder.isTypeSupported(m)) return m; } catch (e) {} }
  return '';
};
class VideoAskModal extends Modal {
  constructor(app, plugin, file, text) { super(app); this.plugin = plugin; this.file = file; this.text = text || ''; this.stream = null; this.rec = null; this.clip = null; this.url = null; this.tick = null; }
  onOpen() {
    const c = this.contentEl; c.addClass('gq-modal'); c.addClass('gq-video-modal'); this.titleEl.setText('Ask on video');
    this.head = this.plugin.askHeader(this.file).replace(/^Question about/, 'Video question about');
    c.createDiv({ cls: 'gq-hit-main', text: this.head });
    const stage = c.createDiv('gq-video-stage');
    this.vid = stage.createEl('video'); this.vid.setAttr('playsinline', ''); this.vid.muted = true; this.vid.autoplay = true;
    this.timer = stage.createDiv({ cls: 'gq-video-timer' });
    const row = c.createDiv('gq-row');
    this.recBtn = row.createEl('button', { text: `Record (${VIDEO_MAX_S} s)`, cls: 'mod-cta' });
    this.again = row.createEl('button', { text: 'Record again' }); this.again.hide();
    this.camBtn = row.createEl('button', { text: 'Use phone camera' });
    this.fileIn = c.createEl('input', { attr: { type: 'file', accept: 'video/*', capture: 'user' } }); this.fileIn.style.display = 'none';
    this.status = c.createDiv({ cls: 'gq-hint', text: 'Starting the camera…' });
    this.box = c.createEl('textarea', { attr: { rows: 2, placeholder: 'Type your question too (optional, helps classmates find it later)' } }); this.box.addClass('gq-input'); this.box.value = this.text;
    this.name = c.createEl('input', { attr: { type: 'text', placeholder: 'Your first name (shown on screen)', autocomplete: 'given-name' } }); this.name.addClass('gq-input');
    try { this.name.value = localStorage.getItem(NAME_KEY) || ''; } catch (e) {}
    const ok = (label) => { const l = c.createEl('label', { cls: 'gq-check' }); const b = l.createEl('input', { attr: { type: 'checkbox' } }); l.appendText(' ' + label); return b; };
    this.pub = ok('Add my video and first name to the public Greekquent question library (anyone online can watch it)');
    this.promo = ok('Use my clip in Greekquent promo videos');
    const send = c.createDiv('gq-row');
    this.sendBtn = send.createEl('button', { text: 'Share to GroupMe', cls: 'mod-cta' }); this.sendBtn.disabled = true;
    c.createDiv({ cls: 'gq-hint', text: 'Your video goes to the class GroupMe so everyone learns from it. Your teacher answers there and, if you say yes above, adds both to the question library. You can change your mind any time: just tell your teacher.' });
    this.recBtn.onclick = () => this.rec && this.rec.state === 'recording' ? this.stop() : this.start();
    this.again.onclick = () => this.reset();
    this.camBtn.onclick = () => this.fileIn.click();
    this.fileIn.onchange = () => { const f = this.fileIn.files && this.fileIn.files[0]; if (f) this.useFile(f); this.fileIn.value = ''; };
    this.sendBtn.onclick = () => this.send();
    this.camera();
  }
  async camera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || pickMime() === null) { this.noCamera(); return; }
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30, max: 30 } }, audio: { echoCancellation: true, noiseSuppression: true } });
      this.vid.srcObject = this.stream; this.vid.muted = true; this.vid.controls = false;
      this.status.setText(`Look at the camera, say the word, and ask your question. It stops by itself at ${VIDEO_MAX_S} seconds.`);
    } catch (e) { this.noCamera(); }
  }
  noCamera() { this.recBtn.hide(); this.camBtn.addClass('mod-cta'); this.status.setText(`Tap "Use phone camera" to record with your camera app. Keep it under ${VIDEO_MAX_S} seconds.`); }
  start() {
    if (!this.stream) { this.fileIn.click(); return; }
    const mime = pickMime(); this.chunks = [];
    try { this.rec = new MediaRecorder(this.stream, Object.assign({ videoBitsPerSecond: 1500000, audioBitsPerSecond: 96000 }, mime ? { mimeType: mime } : {})); }
    catch (e) { this.noCamera(); return; }
    this.rec.ondataavailable = ev => { if (ev.data && ev.data.size) this.chunks.push(ev.data); };
    this.rec.onstop = () => { const type = (this.rec.mimeType || mime || 'video/mp4').split(';')[0]; this.show(new Blob(this.chunks, { type }), this.secs); };
    this.rec.start(1000); this.t0 = Date.now(); this.secs = 0;
    this.recBtn.setText('Stop'); this.camBtn.hide(); this.timer.addClass('is-rec');
    const upd = () => { this.secs = Math.min(VIDEO_MAX_S, (Date.now() - this.t0) / 1000); this.timer.setText(`● ${Math.ceil(VIDEO_MAX_S - this.secs)} s left`); if (this.secs >= VIDEO_MAX_S) this.stop(); };
    upd(); this.tick = window.setInterval(upd, 250);
  }
  stop() { if (this.tick) { window.clearInterval(this.tick); this.tick = null; } this.timer.removeClass('is-rec'); this.timer.setText(''); if (this.rec && this.rec.state !== 'inactive') this.rec.stop(); }
  useFile(f) {
    const probe = document.createElement('video'); probe.preload = 'metadata'; const u = URL.createObjectURL(f);
    probe.onloadedmetadata = () => { const d = probe.duration; URL.revokeObjectURL(u);
      if (isFinite(d) && d > VIDEO_MAX_S + 2) { this.status.setText(`That video is ${Math.round(d)} seconds. Keep it to ${VIDEO_MAX_S} seconds and record again.`); return; }
      this.show(f, d); };
    probe.onerror = () => { URL.revokeObjectURL(u); this.show(f, 0); };
    probe.src = u;
  }
  show(blob, secs) {
    this.clip = blob; if (this.url) URL.revokeObjectURL(this.url); this.url = URL.createObjectURL(blob);
    this.vid.srcObject = null; this.vid.src = this.url; this.vid.muted = false; this.vid.autoplay = false; this.vid.controls = true;
    const mb = blob.size / 1e6;
    this.recBtn.hide(); this.camBtn.hide(); this.again.show();
    if (mb > VIDEO_MAX_MB) { this.sendBtn.disabled = true; this.status.setText(`This video is ${mb.toFixed(0)} MB, and GroupMe takes up to about 50 MB. Record a shorter one.`); return; }
    this.sendBtn.disabled = false;
    this.status.setText(`${secs ? Math.round(secs) + ' s · ' : ''}${mb.toFixed(1)} MB. Play it back, then share it.`);
  }
  reset() {
    this.clip = null; if (this.url) { URL.revokeObjectURL(this.url); this.url = null; }
    this.vid.removeAttribute('src'); this.vid.controls = false; this.vid.muted = true; this.vid.autoplay = true; this.sendBtn.disabled = true; this.again.hide();
    if (this.stream) { this.vid.srcObject = this.stream; this.recBtn.setText(`Record (${VIDEO_MAX_S} s)`); this.recBtn.show(); this.camBtn.show(); this.status.setText('Ready when you are.'); }
    else { this.camBtn.show(); this.fileIn.click(); }
  }
  async send() {
    if (!this.clip) return;
    const name = this.name.value.trim();
    if (this.pub.checked && !name) { new Notice('Type your first name, so it can be shown with your video.'); this.name.focus(); return; }
    try { if (name) localStorage.setItem(NAME_KEY, name); } catch (e) {}
    const yn = b => b ? 'yes' : 'no';
    const q = this.box.value.trim();
    const text = [this.head, q, `${name || 'A student'} · public library: ${yn(this.pub.checked)} · promo: ${yn(this.promo.checked)}`, this.plugin.noteUrl(this.file)].filter(Boolean).join('\n');
    const type = this.clip.type || 'video/mp4';
    const ext = /webm/.test(type) ? 'webm' : /quicktime/.test(type) ? 'mov' : 'mp4';
    const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
    const file = new File([this.clip], `greekquent-question-${stamp}.${ext}`, { type });
    if (await this.plugin.shareVideo(file, text)) this.close();
  }
  onClose() {
    if (this.tick) window.clearInterval(this.tick);
    try { if (this.rec && this.rec.state !== 'inactive') { this.rec.onstop = null; this.rec.stop(); } } catch (e) {}
    if (this.stream) this.stream.getTracks().forEach(t => t.stop());
    if (this.url) URL.revokeObjectURL(this.url);
    this.contentEl.empty();
  }
}

module.exports = class GreekquentStudentLayout extends Plugin {
  onload() {
    this.busy = false;
    document.body.classList.add('greekquent-student');
    this.registerView(WEB, leaf => new WordWebView(leaf, this));
    // Main graph: Obsidian's own local graph with calm forces, full tab. Word web stays as a backup command.
    this.addRibbonIcon('git-fork', 'Open word graph', () => this.openGraph());
    // Share feedback: opens Messages with the teacher's number filled in. The student types and taps Send.
    this.addRibbonIcon('message-square', 'Share feedback', () => this.feedback());
    this.addCommand({ id: 'share-feedback', name: 'Share feedback', callback: () => this.feedback() });
    // Send homework: texts the newest "## " section of My Work/Homework.md (or of the open My Work note).
    this.addRibbonIcon('send', 'Send homework', () => this.sendHomework());
    this.addCommand({ id: 'send-homework', name: 'Send homework', callback: () => this.sendHomework() });
    // Update vault: downloads only the files that changed. My Work is never touched.
    this.addRibbonIcon('refresh-cw', 'Update vault', () => this.updateVault(false));
    this.addCommand({ id: 'update-vault', name: 'Update vault', callback: () => this.updateVault(false) });
    // Look up a word: searches the 1,500 (and their verb forms) first; other words go to a free translator as bonus words.
    this.addRibbonIcon('search', 'Look up a word', () => new LookupModal(this.app, this).open());
    this.addCommand({ id: 'look-up-word', name: 'Look up a word', callback: () => new LookupModal(this.app, this).open() });
    // Ask the group: question about the open note, shared to GroupMe with a link to the note.
    this.addRibbonIcon('users', 'Ask the group', () => this.ask());
    this.addCommand({ id: 'ask-group', name: 'Ask the group about this note', callback: () => this.ask() });
    // Ask on video: record a question (up to 45 s) and share it to the class GroupMe.
    this.addRibbonIcon('video', 'Ask on video', () => this.askVideo());
    this.addCommand({ id: 'ask-video', name: 'Ask on video about this note', callback: () => this.askVideo() });
    // Student questions: video questions and answers from the public library, shown at the end of the matching note.
    this.registerMarkdownPostProcessor((el, ctx) => this.questionsBox(el, ctx));
    this.registerMarkdownCodeBlockProcessor('greekquent-questions', (src, el) => this.questionsIndex(el));
    this.registerEvent(this.app.metadataCache.on('changed', f => { if (f.path.startsWith('Words/')) this.words = null; }));
    // My Work notes open ready to type in.
    this.registerEvent(this.app.workspace.on('file-open', f => { if (f && f.path.startsWith(MY_WORK)) setTimeout(() => this.editMode(f), 50); }));
    this.addCommand({ id: 'open-word-graph', name: 'Open word graph', callback: () => this.openGraph() });
    this.addCommand({ id: 'open-word-web', name: 'Open word web (custom view)', callback: () => this.openWeb() });
    this.registerEvent(this.app.workspace.on('file-menu', (menu, file) => {
      if (file && file.path && file.path.startsWith('Words/')) menu.addItem(i => i.setTitle('Open word graph').setIcon('git-fork').onClick(() => this.openGraph(file.path)));
      if (file && file.extension === 'md' && !file.path.startsWith(MY_WORK)) menu.addItem(i => i.setTitle('Ask the group').setIcon('users').onClick(() => this.ask(file)));
      if (file && file.extension === 'md' && !file.path.startsWith(MY_WORK)) menu.addItem(i => i.setTitle('Ask on video').setIcon('video').onClick(() => this.askVideo(file)));
    }));
    this.app.workspace.onLayoutReady(async () => {
      for (const id of HIDE_COMMANDS) { try { this.app.commands.removeCommand(id); } catch (e) {} }
      this.hideRibbon();
      // Startup: tidy the sidebars quietly. Obsidian's default layout (fresh vault, new device) puts Search and
      // Bookmarks on the left; moving them used to pop the right sidebar open on Bookmarks.
      const wasCollapsed = this.app.workspace.rightSplit ? this.app.workspace.rightSplit.collapsed : true;
      await this.fix(true);
      await this.ensureLocalGraph();
      const rs = this.app.workspace.rightSplit;
      if (rs && wasCollapsed && !rs.collapsed) rs.collapse();
      this.registerEvent(this.app.workspace.on('layout-change', () => this.fix()));
      setTimeout(() => this.updateVault(true), 4000);   // quiet check at startup
    });
  }
  async openWeb(path) {
    const ws = this.app.workspace;
    const a = ws.getActiveFile();
    const start = path || (a && a.path.startsWith('Words/') ? a.path : null);
    let leaf = ws.getLeavesOfType(WEB)[0];
    if (!leaf) leaf = ws.getLeaf('tab');
    await leaf.setViewState({ type: WEB, active: true, state: start ? { path: start } : {} });
    ws.revealLeaf(leaf);
    if (ws.leftSplit && !ws.leftSplit.collapsed) ws.leftSplit.collapse();
    if (ws.rightSplit && !ws.rightSplit.collapsed) ws.rightSplit.collapse();
    leaf.view.contentEl.focus();
  }
  // ---------- Word graph: Obsidian's own local graph (native motion), dressed with the Word web's controls ----------
  wordPath(p) { if (p && p.startsWith('Words/')) return p; const f = this.app.vault.getAbstractFileByPath('Words/θέλω.md'); return f ? f.path : this.app.vault.getMarkdownFiles().find(f => f.path.startsWith('Words/')).path; }
  async openGraph(path) {
    const ws = this.app.workspace;
    const a = ws.getActiveFile();
    const file = this.wordPath(path || (a ? a.path : ''));
    let leaf = ws.getLeavesOfType('localgraph').find(l => l.getRoot() === ws.rootSplit);
    if (!leaf) leaf = ws.getLeaf('tab');
    ws.revealLeaf(leaf);
    if (ws.leftSplit && !ws.leftSplit.collapsed) ws.leftSplit.collapse();
    if (ws.rightSplit && !ws.rightSplit.collapsed) ws.rightSplit.collapse();
    await this.graphGo(leaf, file);
  }
  graphState(leaf) { if (!leaf.gq) leaf.gq = { hist: [], pos: -1 }; return leaf.gq; }
  async graphGo(leaf, path, fromHistory) {
    const st = this.graphState(leaf);
    if (!fromHistory && path !== st.hist[st.pos]) { st.hist = st.hist.slice(0, st.pos + 1); st.hist.push(path); st.pos = st.hist.length - 1; }
    const v = leaf.view, f = this.app.vault.getAbstractFileByPath(path);
    if (v && v.getViewType() === 'localgraph' && f) {
      // Same graph, new center: the native physics carries the words over to their new places.
      v.file = f; v.update(); this.app.workspace.setActiveLeaf(leaf, { focus: true }); this.app.workspace.requestSaveLayout();
    } else await leaf.setViewState({ type: 'localgraph', active: true, state: { file: path, options: LOCAL_OPTIONS } });
    // A brand-new graph tab can come up centered on whatever note was open; put it on the chosen word.
    if (f && leaf.view && leaf.view.getViewType() === 'localgraph' && leaf.view.file !== f) { leaf.view.file = f; leaf.view.update(); this.app.workspace.requestSaveLayout(); }
    this.dressGraph(leaf);
    this.followCenter(leaf, path);
  }
  followCenter(leaf, path) {
    // The camera eases onto the center word while the native physics settles, so the word you picked ends up in the middle.
    const st = this.graphState(leaf); if (st.follow) cancelAnimationFrame(st.follow);
    const t0 = performance.now(), D = 1800;
    const tick = now => {
      const v = leaf.view, r = v && v.renderer; if (!r || !r.nodes) return;
      const n = r.nodes.find(n => n.id === path);
      if (n && !r.dragNode && !r.panning) {
        const k = Math.min(1, (now - t0) / D), a = 0.06 + 0.24 * k;
        // Pan is in device pixels (Obsidian's resetPan uses width/2 * devicePixelRatio); CSS pixels here pulled the word to the upper left on phones.
        const dpr = window.devicePixelRatio || 1;
        const tx = r.width / 2 * dpr - n.x * r.scale, ty = r.height / 2 * dpr - n.y * r.scale;
        r.setPan(r.panX + (tx - r.panX) * a, r.panY + (ty - r.panY) * a); r.changed();
      }
      if (now - t0 < D) st.follow = requestAnimationFrame(tick); else st.follow = null;
    };
    st.follow = requestAnimationFrame(tick);
  }
  async graphStep(leaf, d) { const st = this.graphState(leaf); const n = st.pos + d; if (n < 0 || n >= st.hist.length) return; st.pos = n; await this.graphGo(leaf, st.hist[n], true); }
  dressGraph(leaf) {
    const v = leaf.view; if (!v || v.getViewType() !== 'localgraph') return;
    const st = this.graphState(leaf);
    const box = v.containerEl; box.addClass('gq-graph');
    if (!st.bar || !box.contains(st.bar)) {
      const wrap = createDiv('gq-graph-top'); box.insertBefore(wrap, v.contentEl);
      const bar = wrap.createDiv('gq-web-bar');
      st.back = bar.createEl('button', { text: '←', attr: { 'aria-label': 'Back' } });
      st.fwd = bar.createEl('button', { text: '→', attr: { 'aria-label': 'Forward' } });
      st.title = bar.createDiv('gq-web-title');
      const say = bar.createEl('button', { text: 'Hear it', attr: { 'aria-label': 'Say the word' } });
      const open = bar.createEl('button', { text: 'Open note', attr: { 'aria-label': 'Open the word note' } });
      const askb = bar.createEl('button', { text: 'Ask', attr: { 'aria-label': 'Ask the group about this word' } });
      askb.onclick = () => { const f = this.app.vault.getAbstractFileByPath(st.hist[st.pos]); if (f) this.ask(f); };
      const vidb = bar.createEl('button', { text: 'Video', attr: { 'aria-label': 'Ask on video about this word' } });
      vidb.onclick = () => { const f = this.app.vault.getAbstractFileByPath(st.hist[st.pos]); if (f) this.askVideo(f); };
      st.trail = wrap.createDiv('gq-web-trail'); st.bar = wrap;
      st.back.onclick = () => this.graphStep(leaf, -1); st.fwd.onclick = () => this.graphStep(leaf, 1);
      open.onclick = () => { const f = this.app.vault.getAbstractFileByPath(st.hist[st.pos]); if (f) this.app.workspace.getLeaf('tab').openFile(f); };
      say.onclick = () => { const f = this.app.vault.getAbstractFileByPath(st.hist[st.pos]); if (f && window.speechSynthesis) { const u = new SpeechSynthesisUtterance(f.basename); u.lang = 'el-GR'; speechSynthesis.cancel(); speechSynthesis.speak(u); } };
      box.tabIndex = 0;
      this.registerDomEvent(box, 'keydown', e => { if (e.target.closest && e.target.closest('input')) return; if (e.key === 'ArrowLeft' || e.key === 'Backspace') { this.graphStep(leaf, -1); e.preventDefault(); } if (e.key === 'ArrowRight') { this.graphStep(leaf, 1); e.preventDefault(); } });
      this.registerDomEvent(box, 'mouseup', e => { if (e.button === 3) this.graphStep(leaf, -1); if (e.button === 4) this.graphStep(leaf, 1); });
    }
    // Clicking a word moves the graph to it (like the Word web) instead of opening the note.
    // Clicking a word moves the graph to it. The note opens from the toolbar's Open note button.
    const r = v.renderer;
    if (r && !r.gqHooked) { r.gqHooked = true; r.onNodeClick = (e, id) => { if (id && id.startsWith('Words/')) this.graphGo(leaf, id); }; }

    const f = this.app.vault.getAbstractFileByPath(st.hist[st.pos] || '');
    const fm = f ? ((this.app.metadataCache.getFileCache(f) || {}).frontmatter || {}) : {};
    if (f && !v.gqTitled) { v.gqTitled = true; const base = v.getDisplayText.bind(v); v.getDisplayText = () => v.file ? 'Word graph: ' + v.file.basename : base(); }
    leaf.updateHeader && leaf.updateHeader();
    if (f) st.title.setText(`${f.basename}${fm.english ? ' · ' + fm.english : ''}${fm.pronunciation ? ' · say it: ' + fm.pronunciation : ''}${fm.rank ? ' · #' + fm.rank : ''}`);
    st.back.disabled = st.pos <= 0; st.fwd.disabled = st.pos >= st.hist.length - 1;
    st.trail.setText(st.hist.slice(Math.max(0, st.pos - 6), st.pos + 1).map(h => h.replace(/^Words\//, '').replace(/\.md$/, '')).join('  ›  '));
    box.focus();
  }
  // ---------- Look up helpers ----------
  async wordIndex() {
    if (this.words) return this.words;
    if (this.indexing) return this.indexing;
    this.indexing = (async () => {
      const out = [];
      for (const f of this.app.vault.getMarkdownFiles()) {
        if (!f.path.startsWith('Words/')) continue;
        const fm = (this.app.metadataCache.getFileCache(f) || {}).frontmatter || {};
        if (!fm.rank) continue;
        const w = { path: f.path, word: f.basename, english: String(fm.english || ''), pron: fm.pronunciation || '', rank: +fm.rank, lessons: fm.lessons || [], forms: [] };
        // Verb forms from the conjugation table (bold cells), so "θέλουμε" finds θέλω.
        try { const txt = await this.app.vault.cachedRead(f); const m = txt.split('## Conjugation')[1]; if (m) for (const b of m.split('\n## ')[0].matchAll(/\*\*([^*]+)\*\*/g)) b[1].split(/\s+/).forEach(x => { if (isGreek(x) && x !== 'θα') w.forms.push(x); }); } catch (e) {}
        w.k = fold(w.word); w.e = fold(w.english.replace(/[()"]/g, ' ')); w.fk = [...new Set(w.forms.map(fold))];
        out.push(w);
      }
      out.sort((a, b) => a.rank - b.rank);
      this.words = out; this.indexing = null; return out;
    })();
    return this.indexing;
  }
  findWords(q) {
    if (!this.words) return [];
    const k = fold(q), res = [];
    for (const w of this.words) {
      let score = 0, form = '';
      if (isGreek(q)) {
        if (w.k === k) score = 100; else if (w.fk.includes(k)) { score = 90; form = w.forms.find(x => fold(x) === k); } else if (k.length >= 2 && w.k.startsWith(k)) score = 50; else if (k.length >= 3 && w.fk.some(x => x.startsWith(k))) score = 30;
      } else {
        const words = w.e.split(/[^a-z']+/).filter(Boolean);
        const bare = w.e.replace(/^(i|to|the|a|an) /, '');
        if (w.e === k || bare === k) score = 100; else if (words.includes(k)) score = 80; else if (k.length >= 3 && words.some(x => x.startsWith(k))) score = 40; else if (k.includes(' ') && w.e.includes(k)) score = 60;
      }
      if (score) res.push({ ...w, score: score - w.rank / 10000, form });
    }
    return res.sort((a, b) => b.score - a.score).slice(0, 8);
  }
  translateUrl(q) { const gr = isGreek(q); return `https://translate.google.com/?sl=${gr ? 'el' : 'en'}&tl=${gr ? 'en' : 'el'}&text=${encodeURIComponent(q)}&op=translate`; }
  async logLookup(q, w) {
    // Every look-up is saved in My Work, so it can come back as review (and the teacher can see what students reach for).
    const ad = this.app.vault.adapter, day = window.moment ? window.moment().format('YYYY-MM-DD') : new Date().toISOString().slice(0, 10);
    let txt = ''; try { txt = await ad.read(LOOKUPS); } catch (e) { txt = '# Words I looked up\n\nEvery word you look up lands here. Words from the 1,500 link to their notes. Bonus words are yours to keep: add the Greek next to them.\n'; }
    if (!txt.includes('\n## ' + day)) txt = txt.replace(/\s*$/, '\n\n## ' + day + '\n');
    const line = w ? `- ${q} → [[${w.word}]] (${w.english}, #${w.rank})` : `- ${q} → bonus word: `;
    const today = txt.slice(txt.lastIndexOf('\n## '));
    if (today.split('\n').some(l => l.trim() === line.trim())) return;
    if (!(await ad.exists(MY_WORK.slice(0, -1)))) await ad.mkdir(MY_WORK.slice(0, -1));
    await ad.write(LOOKUPS, txt.replace(/\s*$/, '\n') + line + '\n');
  }
  // ---------- Ask on video helpers ----------
  askVideo(file) {
    const f = file || this.app.workspace.getActiveFile();
    if (!f || f.extension !== 'md') { new Notice('Open a word or lesson note first, then tap Ask on video.'); return; }
    if (f.path.startsWith(MY_WORK)) { new Notice('My Work notes are private. Open a word or lesson note instead.'); return; }
    new VideoAskModal(this.app, this, f).open();
  }
  async shareVideo(file, text) {
    const mobile = document.body.classList.contains('is-mobile') || /Android|iPhone|iPad/.test(navigator.userAgent);
    // Copy the message first: some apps drop the text when a video is attached, so it can be pasted as a caption.
    try { navigator.clipboard.writeText(text); } catch (e) {}
    if (mobile && navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], text }); new Notice('If the message is missing in GroupMe, paste it: it is copied.', 8000); return true; }
      catch (e) { if (e && e.name === 'AbortError') return false; }
    }
    if (mobile) {
      // Phone without file sharing: save into My Work, which the Files app (iPhone) or file manager (Android) can open.
      const dir = MY_WORK + 'Video questions';
      try { if (!this.app.vault.getAbstractFileByPath(dir)) await this.app.vault.createFolder(dir);
        await this.app.vault.createBinary(`${dir}/${file.name}`, await file.arrayBuffer());
        new Notice(`Saved to ${dir}/${file.name} and copied the message. In GroupMe, attach the video from Files and paste the message.`, 15000); return true; }
      catch (e) { new Notice('Could not save the video. Record it with the camera app and send it in GroupMe instead.', 10000); return false; }
    }
    // Computer: download the video and copy the message.
    const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = file.name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
    new Notice(`Saved ${file.name} and copied the message. In GroupMe, attach the video and paste the message.`, 12000);
    return true;
  }
  async questions() {
    if (this.qs && Date.now() - this.qsAt < 30 * 60 * 1000) return this.qs;
    if (this.qsLoading) return this.qsLoading;
    this.qsLoading = (async () => {
      try { const r = await requestUrl({ url: QUESTIONS_URL + 'questions.json?t=' + Date.now() }); this.qs = Array.isArray(r.json) ? r.json : []; this.qsAt = Date.now(); try { localStorage.setItem('greekquent-questions', JSON.stringify(this.qs)); } catch (e) {} }
      catch (e) { if (!this.qs) { try { this.qs = JSON.parse(localStorage.getItem('greekquent-questions') || '[]'); } catch (_) { this.qs = []; } this.qsAt = Date.now() - 25 * 60 * 1000; } }
      this.qsLoading = null; return this.qs;
    })();
    return this.qsLoading;
  }
  questionsFor(path, qs) { const base = path.split('/').pop().replace(/\.md$/, ''); return qs.filter(q => q.note === path || (path.startsWith('Words/') && q.word === base)); }
  questionCard(parent, q) {
    const card = parent.createDiv('gq-qcard');
    card.createDiv({ cls: 'gq-qhead', text: `${q.name || 'A student'} asks about ${q.word || (q.note || '').replace(/\.md$/, '')}${q.lesson ? ' · Lesson ' + q.lesson : ''}` });
    if (q.question_text) card.createDiv({ cls: 'gq-qtext', text: q.question_text });
    const v = card.createEl('video'); v.controls = true; v.preload = 'none'; v.setAttr('playsinline', ''); v.src = QUESTIONS_URL + q.question; if (q.thumb) v.poster = QUESTIONS_URL + q.thumb;
    const row = card.createDiv('gq-row');
    const bq = row.createEl('button', { text: 'Question' }); bq.addClass('mod-cta');
    const ba = row.createEl('button', { text: q.answer ? 'Answer' : 'Answer coming soon' }); ba.disabled = !q.answer;
    let onAnswer = false;
    const show = ans => { onAnswer = ans; v.src = QUESTIONS_URL + (ans ? q.answer : q.question); v.poster = (ans ? q.answer_thumb : q.thumb) ? QUESTIONS_URL + (ans ? q.answer_thumb : q.thumb) : '';
      bq.toggleClass('mod-cta', !ans); ba.toggleClass('mod-cta', ans); v.play().catch(() => {}); };
    bq.onclick = () => show(false); ba.onclick = () => show(true);
    v.addEventListener('ended', () => { if (!onAnswer && q.answer) show(true); });   // question rolls into the answer
  }
  questionsBox(el, ctx) {
    if (!ctx || !ctx.sourcePath || ctx.sourcePath.startsWith(MY_WORK)) return;
    const info = ctx.getSectionInfo && ctx.getSectionInfo(el); if (!info) return;
    const lines = info.text.split('\n'); let last = lines.length - 1; while (last > 0 && !lines[last].trim()) last--;
    if (info.lineEnd < last) return;   // only after the note's last section
    const box = el.createDiv('gq-questions'); box.hide();
    this.questions().then(qs => {
      const list = this.questionsFor(ctx.sourcePath, qs || []); if (!list.length) return;
      box.show(); box.createEl('h3', { text: `Student questions (${list.length})` });
      list.slice().reverse().forEach(q => this.questionCard(box, q));
    });
  }
  questionsIndex(el) {
    const wrap = el.createDiv('gq-questions gq-questions-all');
    const top = wrap.createDiv('gq-row');
    const s = top.createEl('input', { attr: { type: 'search', placeholder: 'Search the questions: νερό, water, past tense…' } }); s.addClass('gq-input');
    const web = top.createEl('button', { text: 'Open the library in a browser' }); web.onclick = () => window.open(QUESTIONS_URL);
    const list = wrap.createDiv(); list.createDiv({ cls: 'gq-hint', text: 'Loading questions…' });
    this.questions().then(qs => {
      const all = (qs || []).slice().sort((a, b) => (b.added || '').localeCompare(a.added || '') || (b.id || '').localeCompare(a.id || ''));
      const draw = () => {
        list.empty(); const t = fold(s.value);
        const hits = all.filter(q => !t || fold([q.word, q.english, q.question_text, q.name, q.lesson ? 'lesson ' + q.lesson : ''].join(' ')).includes(t));
        if (!all.length) { list.createDiv({ cls: 'gq-hint', text: 'No video questions yet. Be the first: open a word and tap Ask on video (camera button).' }); return; }
        if (!hits.length) { list.createDiv({ cls: 'gq-hint', text: 'No questions match. Try the Greek word without accents, or the English meaning.' }); return; }
        list.createDiv({ cls: 'gq-hint', text: `${hits.length} of ${all.length} questions, newest first` });
        hits.forEach(q => this.questionCard(list, q));
      };
      s.oninput = draw; draw();
    });
  }
  // ---------- Ask the group helpers ----------
  ask(file) {
    const f = file || this.app.workspace.getActiveFile();
    if (!f || f.extension !== 'md') { new Notice('Open a word or lesson note first, then tap Ask the group.'); return; }
    if (f.path.startsWith(MY_WORK)) { new Notice('My Work notes are private, so they cannot be linked. Open a word or lesson note instead.'); return; }
    new AskModal(this.app, this, f).open();
  }
  askHeader(f) {
    const fm = (this.app.metadataCache.getFileCache(f) || {}).frontmatter || {};
    const les = Array.isArray(fm.lessons) && fm.lessons.length ? `, first seen in Lesson ${fm.lessons[0]}` : '';
    return fm.english ? `Question about ${f.basename} (${fm.english}${les}):` : `Question about "${f.basename}":`;
  }
  noteUrl(f) { return NOTE_URL + f.path.split('/').map(encodeURIComponent).join('/'); }
  async shareQuestion(text) {
    const mobile = document.body.classList.contains('is-mobile') || /Android|iPhone|iPad/.test(navigator.userAgent);
    if (mobile && navigator.share) { try { await navigator.share({ text }); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
    try { await navigator.clipboard.writeText(text); new Notice('Copied. Open GroupMe and paste it into the class group.', 8000); }
    catch (e) { new Notice('Could not copy. Select the text and copy it by hand.'); }
  }
  async feedback() {
    let rel = VAULT_RELEASE; try { rel = JSON.parse(await this.app.vault.adapter.read(INSTALLED)).release || rel; } catch (e) {}
    window.open(smsLink(`Greekquent feedback (vault of ${rel}): `));
  }
  editMode(f) {
    const v = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (v && v.file === f && v.getMode() !== 'source') { const st = v.leaf.getViewState(); st.state = { ...st.state, mode: 'source', source: false }; v.leaf.setViewState(st); }
  }
  async sendHomework() {
    const a = this.app.workspace.getActiveFile();
    const f = a && a.path.startsWith(MY_WORK) ? a : this.app.vault.getAbstractFileByPath(MY_WORK + 'Homework.md');
    if (!f) { new Notice('No homework note found in My Work.'); return; }
    let txt = (await this.app.vault.read(f)).replace(/^---[\s\S]*?---\n/, '');
    const parts = txt.split(/\n(?=## )/); let body = parts.length > 1 ? parts[parts.length - 1] : txt;
    body = body.trim();
    if (!body || /^## [^\n]*$/.test(body)) { new Notice('Write your homework under the newest heading first.'); return; }
    if (body.length > 3000) { body = body.slice(0, 3000); new Notice('Homework is long, so only the first 3,000 characters were added. Send the rest in a second text.'); }
    window.open(smsLink(`Greekquent homework (${f.basename}):\n${body}`));
  }
  async sha(buf) { const h = await crypto.subtle.digest('SHA-256', buf); return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, '0')).join(''); }
  async updateVault(quiet) {
    if (this.updating) return; this.updating = true;
    const ad = this.app.vault.adapter;
    try {
      if (UPDATE_BASE.includes('OWNER/REPO')) { if (!quiet) new Notice('Updates are not set up yet.'); return; }
      let man;
      try { man = (await requestUrl({ url: UPDATE_BASE + 'manifest.json?t=' + Date.now() })).json; }
      catch (e) { if (!quiet) new Notice('Could not reach the update server. Check your internet connection and try again.'); return; }
      let mine = {}; try { mine = JSON.parse(await ad.read(INSTALLED)); } catch (e) {}
      if (mine.release === man.release) { if (!quiet) new Notice(`Already up to date (release ${man.release}).`); return; }
      if (quiet) { const n = new Notice(`A Greekquent update (${man.release}) is ready. Tap here to install it.`, 0); n.noticeEl.onclick = () => { n.hide(); this.updateVault(false); }; return; }
      const note = new Notice('Updating Greekquent...', 0);
      const want = Object.entries(man.files).filter(([p]) => !KEEP_LOCAL(p));
      let changed = 0, removed = 0, config = false;
      for (let i = 0; i < want.length; i++) {
        const [p, meta] = want[i];
        let same = false;
        if (await ad.exists(p)) { try { same = (await this.sha(await ad.readBinary(p))) === meta.sha256; } catch (e) {} }
        if (same) continue;
        const r = await requestUrl({ url: UPDATE_BASE + 'vault/' + p.split('/').map(encodeURIComponent).join('/') + '?v=' + meta.sha256.slice(0, 12) });
        const dir = p.split('/').slice(0, -1).join('/');
        if (dir && !(await ad.exists(dir))) await ad.mkdir(dir);
        await ad.writeBinary(p, r.arrayBuffer); changed++; if (p.startsWith('.obsidian/plugins/')) config = true;
        note.setMessage(`Updating Greekquent... ${changed} file${changed === 1 ? '' : 's'}`);
      }
      // Files the teacher removed since the last update (only files that came from an update, never My Work).
      for (const p of Object.keys(mine.files || {})) if (!man.files[p] && !KEEP_LOCAL(p) && await ad.exists(p)) { await ad.remove(p); removed++; }
      await ad.write(INSTALLED, JSON.stringify({ release: man.release, files: man.files }));
      note.hide();
      new Notice(`Greekquent updated to ${man.release}: ${changed} changed, ${removed} removed. Your My Work folder was not touched.` + (config ? ' Close and reopen Obsidian to finish.' : ''), 12000);
    } finally { this.updating = false; }
  }
  onunload() { document.body.classList.remove('greekquent-student'); }
  hideRibbon() {
    // Same as right-click > hide on the ribbon, so it also applies to the mobile ribbon menu.
    const r = this.app.workspace.leftRibbon;
    if (!r || !r.items) return;
    let changed = false;
    for (const it of r.items) {
      if ((HIDE_RIBBON.includes(it.id) || HIDE_RIBBON_PREFIX.some(p => it.id.startsWith(p))) && !it.hidden) { it.hidden = true; changed = true; }
    }
    if (changed) { try { r.load(r.serialize()); } catch (e) {} try { r.onChange(true); } catch (e) {} }
  }
  async ensureLocalGraph() {
    const ws = this.app.workspace;
    const have = ws.getLeavesOfType('localgraph');
    if (have.length) {
      for (const l of have) { const vs = l.getViewState(); vs.state = { ...(vs.state || {}), options: LOCAL_OPTIONS }; await l.setViewState(vs); }
      return;
    }
    const leaf = ws.getRightLeaf(false);
    if (!leaf) return;
    const file = ws.getActiveFile();
    await leaf.setViewState({ type: 'localgraph', active: false, state: { file: file ? file.path : '', options: LOCAL_OPTIONS } });
  }
  async fix(quiet) {
    if (this.busy) return;
    const ws = this.app.workspace;
    const strays = [], blocked = [];
    ws.iterateAllLeaves(l => {
      const t = l.view.getViewType();
      if (BLOCK.includes(t)) blocked.push(l);
      else if (l.getRoot() === ws.leftSplit && MOVE.includes(t)) strays.push({ leaf: l, shown: !quiet && l.view.containerEl.isShown() });
    });
    if (!strays.length && !blocked.length) return;
    this.busy = true;
    try {
      for (const leaf of blocked) leaf.detach();
      for (const { leaf, shown } of strays) {
        const vs = leaf.getViewState();
        const existing = ws.getLeavesOfType(vs.type).find(l => l !== leaf && l.getRoot() === ws.rightSplit);
        leaf.detach();
        const target = existing || ws.getRightLeaf(false);
        await target.setViewState({ ...vs, active: shown });
        if (shown) ws.revealLeaf(target);   // only when the student just opened it (e.g. clicked a tag)
      }
      const fe = ws.getLeavesOfType('file-explorer')[0];
      if (fe && quiet) ws.leftSplit.children && fe.parent && fe.parent.selectTab && fe.parent.selectTab(fe);
      if (!ws.getLeavesOfType('file-explorer').length) await ws.getLeftLeaf(false).setViewState({ type: 'file-explorer' });
    } finally { setTimeout(() => { this.busy = false; }, 300); }
  }
};

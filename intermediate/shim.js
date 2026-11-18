// Greekquent web app: a small stand-in for the parts of Obsidian the Greekquent plugin uses,
// so the same plugin (Today, word notes, games, Word web, φόρα) runs in a phone browser.
// The notes come from the Beginner vault. Everything the learner writes (My Work, colors, φόρα)
// stays on this device in localStorage and is never touched by updates.
(function () {
'use strict';
const OV = 'gqi:f:', DIRK = 'gqi:dirs', DATAK = 'gqi:data';
const PLUGIN_DIR = '.obsidian/plugins/greekquent-student-layout';
const G = window.GQW = { handlers: {}, views: {}, codeProc: {}, postProc: [], ribbon: [], commands: {}, proto: {} };

// ---------- DOM helpers Obsidian adds to every element ----------
const EP = Element.prototype;
function mk(tag, o, parent) {
  if (typeof o === 'string') o = { cls: o };
  o = o || {};
  const svgTags = /^(svg|g|path|circle|line|rect|text|polyline|polygon|ellipse|defs|tspan)$/;
  const e = svgTags.test(tag) && parent && parent.namespaceURI === 'http://www.w3.org/2000/svg' ? document.createElementNS('http://www.w3.org/2000/svg', tag) : document.createElement(tag);
  if (o.cls) { const c = Array.isArray(o.cls) ? o.cls : String(o.cls).split(/\s+/); for (const x of c) if (x) e.classList.add(x); }
  if (o.text != null) e.textContent = o.text;
  if (o.href != null) e.setAttribute('href', o.href);
  if (o.type != null) e.setAttribute('type', o.type);
  if (o.value != null) e.value = o.value;
  if (o.placeholder != null) e.setAttribute('placeholder', o.placeholder);
  if (o.title != null) e.setAttribute('title', o.title);
  if (o.attr) for (const [k, v] of Object.entries(o.attr)) if (v !== null && v !== undefined && v !== false) e.setAttribute(k, v === true ? '' : v);
  if (o.prepend && parent) parent.prepend(e); else if (parent) parent.appendChild(e);
  return e;
}
EP.createEl = function (t, o, cb) { const e = mk(t, o, this); if (cb) cb(e); return e; };
EP.createDiv = function (o, cb) { return this.createEl('div', o, cb); };
EP.createSpan = function (o, cb) { return this.createEl('span', o, cb); };
EP.empty = function () { while (this.firstChild) this.removeChild(this.firstChild); };
EP.setText = function (t) { this.textContent = t == null ? '' : t; };
EP.appendText = function (t) { this.appendChild(document.createTextNode(t)); };
EP.addClass = function (...c) { for (const x of c.flatMap(s => String(s).split(/\s+/))) if (x) this.classList.add(x); };
EP.addClasses = function (c) { this.addClass(...c); };
EP.removeClass = function (...c) { for (const x of c) if (x) this.classList.remove(x); };
EP.toggleClass = function (c, on) { for (const x of [].concat(c)) this.classList.toggle(x, !!on); };
EP.hasClass = function (c) { return this.classList.contains(c); };
EP.setAttr = function (k, v) { if (v === null || v === false) this.removeAttribute(k); else this.setAttribute(k, v === true ? '' : v); };
EP.getText = function () { return this.textContent; };
EP.hide = function () { this.style.display = 'none'; };
EP.show = function () { this.style.display = ''; };
EP.isShown = function () { return this.style.display !== 'none'; };
EP.detach = function () { this.remove(); };
EP.onClickEvent = function (cb) { this.addEventListener('click', cb); };
if (!Element.prototype.doc) Object.defineProperty(EP, 'doc', { get() { return document; } });
window.createEl = (t, o, cb) => { const e = mk(t, o, null); if (cb) cb(e); return e; };
window.createDiv = (o, cb) => window.createEl('div', o, cb);
window.createSpan = (o, cb) => window.createEl('span', o, cb);
window.createFragment = cb => { const f = document.createDocumentFragment(); if (cb) cb(f); return f; };
DocumentFragment.prototype.createEl = EP.createEl; DocumentFragment.prototype.createDiv = EP.createDiv; DocumentFragment.prototype.createSpan = EP.createSpan;
window.activeDocument = document; window.activeWindow = window;

// ---------- Events ----------
class Events {
  on(name, cb) { (this._ev = this._ev || {})[name] = (this._ev[name] || []).concat([cb]); return { e: this, name, cb }; }
  off(name, cb) { if (this._ev && this._ev[name]) this._ev[name] = this._ev[name].filter(x => x !== cb); }
  offref(r) { if (r) this.off(r.name, r.cb); }
  trigger(name, ...a) { for (const cb of (this._ev && this._ev[name]) || []) { try { cb(...a); } catch (e) { console.error(e); } } }
}

// ---------- Storage on this device ----------
const ls = (() => { try { const s = window.localStorage; s.setItem('gqi:t', '1'); s.removeItem('gqi:t'); return s; } catch (e) { const m = {}; return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: k => { delete m[k]; }, key: i => Object.keys(m)[i], get length() { return Object.keys(m).length; } }; } })();
G.storageOk = ls !== null && typeof window.localStorage !== 'undefined';
function ovKeys() { const out = []; for (let i = 0; i < ls.length; i++) { const k = ls.key(i); if (k && k.startsWith(OV)) out.push(k.slice(OV.length)); } return out; }
try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {}); } catch (e) {}

// ---------- Vault ----------
const BASE = {};          // path -> text, from the bundle
let STATIC = new Set();   // other files in the vault (json, html, pdf, csv), fetched when needed
const files = new Map(), folders = new Map();
function tfile(path) {
  let f = files.get(path); if (f) return f;
  const name = path.split('/').pop(), dot = name.lastIndexOf('.');
  f = { path, name, basename: dot > 0 ? name.slice(0, dot) : name, extension: dot > 0 ? name.slice(dot + 1) : '', stat: { ctime: 0, mtime: Date.now(), size: 0 }, vault: null };
  Object.defineProperty(f, 'parent', { get: () => folder(path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '') });
  files.set(path, f); return f;
}
function folder(path) {
  let d = folders.get(path); if (d) return d;
  d = { path, name: path.split('/').pop() || '', isRoot: () => path === '' };
  Object.defineProperty(d, 'children', { get: () => [...allPaths()].filter(p => p.startsWith(path ? path + '/' : '') && !p.slice(path ? path.length + 1 : 0).includes('/')).map(tfile) });
  folders.set(path, d); return d;
}
function dirs() { let d = []; try { d = JSON.parse(ls.getItem(DIRK) || '[]'); } catch (e) {} return new Set(d); }
function addDir(p) { const d = dirs(); let cur = ''; for (const part of p.split('/')) { cur = cur ? cur + '/' + part : part; d.add(cur); } ls.setItem(DIRK, JSON.stringify([...d])); }
function hasDir(p) {
  if (p === '' || p === '/') return true; if (dirs().has(p)) return true;
  const pre = p.replace(/\/$/, '') + '/';
  for (const x of allPaths()) if (x.startsWith(pre)) return true;
  return false;
}
function allPaths() { const s = new Set(Object.keys(BASE)); for (const k of ovKeys()) s.add(k); for (const k of STATIC) s.add(k); return s; }
function mdPaths() { return [...allPaths()].filter(p => p.endsWith('.md') && !p.startsWith('.')); }
function readSync(p) { const o = ls.getItem(OV + p); if (o !== null) return o; return BASE[p]; }
function toDataUrl(p, buf) {
  const u = new Uint8Array(buf); let b = ''; for (let i = 0; i < u.length; i += 0x8000) b += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
  const ext = (p.split('.').pop() || '').toLowerCase(), mime = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }[ext] || 'application/octet-stream';
  return 'data:' + mime + ';base64,' + btoa(b);
}
function existsFile(p) { return ls.getItem(OV + p) !== null || p in BASE || STATIC.has(p); }
const metaCache = new Map();
let linkIndex = null, resolved = null;
function splitFm(t) {
  t = t || '';
  if (!t.startsWith('---\n') && !t.startsWith('---\r\n')) return { fm: null, body: t, fmText: '', lines: 0 };
  const end = t.indexOf('\n---', 3); if (end < 0) return { fm: null, body: t, fmText: '', lines: 0 };
  const fmText = t.slice(4, end); let after = t.indexOf('\n', end + 4); if (after < 0) after = t.length; else after += 1;
  let fm = null; try { fm = window.jsyaml.load(fmText) || {}; } catch (e) { fm = {}; }
  const head = t.slice(0, after);
  return { fm, body: t.slice(after), fmText, lines: head.split('\n').length - 1 };
}
const WL = /!?\[\[([^\]\n]+?)\]\]/g;
function wikiTarget(inner) { const s = inner.replace(/\\\|/g, '|'); const i = s.indexOf('|'); const t = i < 0 ? s : s.slice(0, i); return { target: t.trim(), alias: i < 0 ? null : s.slice(i + 1).trim() }; }
function getCache(path) {
  if (metaCache.has(path)) return metaCache.get(path);
  const t = readSync(path); if (t === undefined) return null;
  const s = splitFm(t), links = [];
  for (const m of s.body.matchAll(WL)) { const w = wikiTarget(m[1]); links.push({ link: w.target.split('#')[0], original: m[0], displayText: w.alias || w.target }); }
  const headings = [...s.body.matchAll(/^(#{1,6}) (.+)$/gm)].map(m => ({ level: m[1].length, heading: m[2].trim() }));
  const c = { frontmatter: s.fm || undefined, links, headings };
  metaCache.set(path, c); return c;
}
function buildIndex() {
  linkIndex = new Map();
  for (const p of allPaths()) { const name = p.split('/').pop(); const key = name.toLowerCase(); const noExt = key.replace(/\.md$/, '');
    for (const k of [key, noExt]) { const a = linkIndex.get(k); if (!a) linkIndex.set(k, [p]); else if (!a.includes(p)) a.push(p); } }
}
function resolveLink(link, src) {
  link = String(link || '').split('#')[0].split('^')[0].trim(); if (!link) return null;
  try { link = decodeURIComponent(link); } catch (e) {}
  if (existsFile(link)) return tfile(link);
  if (existsFile(link + '.md')) return tfile(link + '.md');
  if (src && src.includes('/')) { const d = src.slice(0, src.lastIndexOf('/') + 1); if (existsFile(d + link)) return tfile(d + link); if (existsFile(d + link + '.md')) return tfile(d + link + '.md'); }
  if (!linkIndex) buildIndex();
  const base = link.split('/').pop().toLowerCase();
  const c = linkIndex.get(base) || linkIndex.get(base.replace(/\.md$/, ''));
  if (!c || !c.length) return null;
  const md = c.filter(p => p.endsWith('.md'));
  const pick = (link.includes('/') && c.find(p => p.toLowerCase().endsWith(link.toLowerCase() + '.md') || p.toLowerCase().endsWith(link.toLowerCase()))) || md[0] || c[0];
  return tfile(pick);
}
function resolvedLinks() {
  if (resolved) return resolved;
  resolved = {};
  for (const p of mdPaths()) { const c = getCache(p); const o = {}; for (const l of (c && c.links) || []) { const f = resolveLink(l.link, p); if (f) o[f.path] = (o[f.path] || 0) + 1; } resolved[p] = o; }
  return resolved;
}

class MetadataCache extends Events {
  getFileCache(f) { return f && f.path ? getCache(f.path) : null; }
  getCache(p) { return getCache(p); }
  getFirstLinkpathDest(link, src) { return resolveLink(link, src); }
  get resolvedLinks() { return resolvedLinks(); }
  get unresolvedLinks() { return {}; }
  fileToLinktext(f) { return f.basename; }
}
const metadataCache = new MetadataCache();

function changed(path, isNew) {
  metaCache.delete(path); if (isNew) linkIndex = null;
  if (resolved && path.endsWith('.md')) { const c = getCache(path); const o = {}; for (const l of (c && c.links) || []) { const f = resolveLink(l.link, path); if (f) o[f.path] = (o[f.path] || 0) + 1; } resolved[path] = o; }
  const f = tfile(path); f.stat.mtime = Date.now();
  setTimeout(() => { vault.trigger(isNew ? 'create' : 'modify', f); if (path.endsWith('.md')) { const t = readSync(path); metadataCache.trigger('changed', f, t, getCache(path)); metadataCache.trigger('resolved'); } }, 0);
}
function writeSync(p, data) {
  const isNew = !existsFile(p);
  try { ls.setItem(OV + p, data); } catch (e) { new Notice('This phone is out of room for Greekquent notes. Back up your work from More.'); throw e; }
  if (p.includes('/')) addDir(p.slice(0, p.lastIndexOf('/')));
  changed(p, isNew); return tfile(p);
}
async function fetchStatic(p, kind) {
  const r = await fetch('vault/' + p.split('/').map(encodeURIComponent).join('/') + '?v=' + encodeURIComponent(G.version || ''));
  if (!r.ok) { const e = new Error('not found: ' + p); e.status = r.status; throw e; }
  return kind === 'bin' ? r.arrayBuffer() : r.text();
}
const adapter = {
  async exists(p) { p = norm(p); return existsFile(p) || hasDir(p); },
  async read(p) { p = norm(p); const t = readSync(p); if (t !== undefined) return t; if (STATIC.has(p)) return fetchStatic(p); throw new Error('ENOENT: ' + p); },
  async write(p, d) { writeSync(norm(p), String(d)); },
  async append(p, d) { p = norm(p); writeSync(p, (readSync(p) || '') + d); },
  async mkdir(p) { addDir(norm(p)); },
  async list(p) { p = norm(p).replace(/\/$/, ''); const pre = p ? p + '/' : ''; const fl = new Set(), fd = new Set(); for (const x of allPaths()) if (x.startsWith(pre)) { const rest = x.slice(pre.length); if (rest.includes('/')) fd.add(pre + rest.split('/')[0]); else fl.add(x); } for (const d of dirs()) if (d.startsWith(pre) && !d.slice(pre.length).includes('/') && d !== p) fd.add(d); return { files: [...fl], folders: [...fd] }; },
  async remove(p) { p = norm(p); ls.removeItem(OV + p); delete BASE[p]; metaCache.delete(p); linkIndex = null; resolved = null; },
  async rmdir() {},
  async readBinary(p) { p = norm(p); const t = readSync(p); if (t !== undefined) { if (t.startsWith('data:')) { const b = atob(t.slice(t.indexOf(',') + 1)), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u.buffer; } return new TextEncoder().encode(t).buffer; } return fetchStatic(p, 'bin'); },
  async writeBinary(p, buf) { writeSync(norm(p), toDataUrl(p, buf)); },
  getResourcePath(p) { p = norm(p); const t = ls.getItem(OV + p); if (t && t.startsWith('data:')) return t; return 'vault/' + p; },
  getName() { return 'Greekquent Intermediate'; }
};
function norm(p) { return String(p || '').replace(/^\/+/, '').replace(/\/+$/, ''); }

class Vault extends Events {
  constructor() { super(); this.adapter = adapter; this.configDir = '.obsidian'; }
  getName() { return 'Greekquent Intermediate'; }
  getAbstractFileByPath(p) { p = norm(p); if (existsFile(p)) return tfile(p); if (hasDir(p)) return folder(p); return null; }
  getFileByPath(p) { p = norm(p); return existsFile(p) ? tfile(p) : null; }
  getMarkdownFiles() { return mdPaths().map(tfile); }
  getFiles() { return [...allPaths()].filter(p => !p.startsWith('.')).map(tfile); }
  getAllLoadedFiles() { return this.getFiles(); }
  getRoot() { return folder(''); }
  async cachedRead(f) { return adapter.read(f.path); }
  async read(f) { return adapter.read(f.path); }
  async modify(f, d) { writeSync(f.path, String(d)); }
  async process(f, fn) { const t = await adapter.read(f.path); const n = fn(t); writeSync(f.path, n); return n; }
  async append(f, d) { writeSync(f.path, (readSync(f.path) || '') + d); }
  async create(p, d) { p = norm(p); if (existsFile(p)) throw new Error('File already exists.'); return writeSync(p, String(d || '')); }
  async createBinary(p, buf) { p = norm(p); return writeSync(p, toDataUrl(p, buf)); }
  async createFolder(p) { addDir(norm(p)); return folder(norm(p)); }
  async delete(f) { await adapter.remove(f.path); this.trigger('delete', f); }
  async trash(f) { return this.delete(f); }
  async rename(f, np) { const t = readSync(f.path); await adapter.remove(f.path); writeSync(np, t || ''); }
}
const vault = new Vault();

const fileManager = {
  async processFrontMatter(f, fn) {
    const t = readSync(f.path) || '';
    const s = splitFm(t); const fm = s.fm || {};
    fn(fm);
    const y = window.jsyaml.dump(fm, { lineWidth: -1, noRefs: true });
    writeSync(f.path, '---\n' + y + '---\n' + (s.fm ? s.body : t));
  },
  generateMarkdownLink(f) { return '[[' + f.basename + ']]'; },
  async renameFile(f, np) { return vault.rename(f, np); },
  async trashFile(f) { return vault.delete(f); }
};

// ---------- Markdown ----------
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const CB = [];
function prep(md) {
  return md.replace(WL, (all, inner) => {
    const w = wikiTarget(inner), label = w.alias || w.target.split('#')[0].split('/').pop().replace(/\.md$/, '') || w.target;
    return `<a class="internal-link" data-href="${esc(w.target)}" href="#">${esc(label)}</a>`;
  }).replace(/(^|\s)==([^=\n]+)==/g, '$1<mark>$2</mark>');
}
const renderer = {
  code(tok) {
    const lang = (tok.lang || '').trim();
    if (G.codeProc[lang]) { CB.push([lang, tok.text]); return `<div class="block-language-${esc(lang)} gq-cbp" data-cb="${CB.length - 1}"></div>`; }
    return false;
  },
  blockquote(tok) {
    const lines = tok.raw.replace(/\n+$/, '').split('\n').map(l => l.replace(/^ {0,3}> ?/, ''));
    const m = lines[0].match(/^\[!([\w-]+)\]([-+]?)\s*(.*)$/);
    if (!m) return false;
    const type = m[1].toLowerCase(), fold = m[2], title = m[3] || type.charAt(0).toUpperCase() + type.slice(1);
    const inner = window.marked.parse(lines.slice(1).join('\n'));
    const t = `<div class="callout-title"><div class="callout-icon"></div><div class="callout-title-inner">${window.marked.parseInline(title)}</div>${fold ? '<div class="callout-fold"></div>' : ''}</div>`;
    if (fold) return `<details class="callout is-collapsible${fold === '-' ? ' is-collapsed' : ''}" data-callout="${esc(type)}"${fold === '+' ? ' open' : ''}><summary>${t}</summary><div class="callout-content">${inner}</div></details>`;
    return `<div class="callout" data-callout="${esc(type)}">${t}<div class="callout-content">${inner}</div></div>`;
  },
  link(tok) {
    const href = tok.href || '';
    if (/^(https?:|mailto:|sms:|tel:)/.test(href)) return `<a href="${esc(href)}" class="external-link" target="_blank" rel="noopener">${this.parser.parseInline(tok.tokens)}</a>`;
    if (/^obsidian:/.test(href)) return `<a href="${esc(href)}" class="gq-proto">${this.parser.parseInline(tok.tokens)}</a>`;
    return false;
  }
};
let markedReady = false;
function setupMarked() { if (markedReady) return; markedReady = true; window.marked.use({ gfm: true, breaks: false, renderer }); }
// Render markdown into el the way Obsidian does: one block per section, then the plugin's processors.
async function renderMarkdown(md, el, sourcePath, comp, fullText, lineOffset) {
  setupMarked();
  const s = splitFm(md); const body = s.fm ? s.body : md; const off = (lineOffset || 0) + (s.fm ? s.lines : 0);
  const text = fullText != null ? fullText : md;
  const toks = window.marked.lexer(prep(body));
  let line = off;
  const secs = [];
  for (const tok of toks) {
    const n = (tok.raw.match(/\n/g) || []).length;
    if (tok.type !== 'space') {
      const arr = [tok]; arr.links = toks.links;
      const d = el.createDiv();
      CB.length = 0;
      d.innerHTML = window.marked.parser(arr);
      const cbs = CB.slice();
      const end = line + (tok.raw.replace(/\n+$/, '').match(/\n/g) || []).length;
      secs.push({ d, start: line, end, cbs });
    }
    line += n;
  }
  const info = new WeakMap();
  for (const sc of secs) info.set(sc.d, { text, lineStart: sc.start, lineEnd: sc.end });
  const ctx = { sourcePath: sourcePath || '', frontmatter: s.fm, getSectionInfo: e => info.get(e) || null, addChild() {}, docId: String(Math.random()) };
  for (const sc of secs) {
    for (const ph of sc.d.querySelectorAll('.gq-cbp')) {
      const [lang, src] = sc.cbs[+ph.dataset.cb] || [];
      if (!lang) continue;
      try { await G.codeProc[lang](src, ph, ctx); } catch (e) { console.error(e); }
    }
  }
  for (const sc of secs) for (const pp of G.postProc) { try { await pp(sc.d, ctx); } catch (e) { console.error(e); } }
}

// ---------- Workspace: one main page, a side sheet for "More", and a back stack ----------
class Component { load() {} unload() {} onload() {} onunload() {} addChild(c) { return c; } removeChild() {} register(cb) { (this._reg = this._reg || []).push(cb); } registerEvent() {} registerDomEvent(el, ev, cb, o) { el.addEventListener(ev, cb, o); (this._dom = this._dom || []).push([el, ev, cb, o]); } registerInterval(id) { return id; } }
class ItemView extends Component {
  constructor(leaf) { super(); this.leaf = leaf; this.app = leaf.app; this.containerEl = createDiv('workspace-leaf-content'); this.contentEl = this.containerEl.createDiv('view-content'); this.navigation = true; }
  getViewType() { return 'empty'; } getDisplayText() { return ''; } getIcon() { return ''; } getState() { return {}; }
  async setState() {} async onOpen() {} async onClose() {}
  addAction() { return createDiv(); }
  _close() { for (const [el, ev, cb, o] of this._dom || []) el.removeEventListener(ev, cb, o); this._dom = []; for (const f of this._reg || []) { try { f(); } catch (e) {} } this._reg = []; }
}
class MarkdownView extends ItemView {
  constructor(leaf) { super(leaf); this.file = null; this.mode = 'preview'; this.containerEl.addClass('mod-markdown'); }
  getViewType() { return 'markdown'; }
  getDisplayText() { return this.file ? this.file.basename.replace(/-student$/, '').replace(/^\d\d /, '') : ''; }
  getState() { return { file: this.file ? this.file.path : '', mode: this.mode, source: false }; }
  getMode() { return this.mode; }
  get editor() { const v = this; return { getValue: () => v.ta ? v.ta.value : readSync(v.file.path), setValue: t => { if (v.ta) v.ta.value = t; }, focus: () => v.ta && v.ta.focus() }; }
  async setState(st) {
    const f = st && st.file ? tfile(st.file) : this.file; const mode = (st && st.mode) || 'preview';
    const same = f === this.file && mode === this.mode && this.rendered;
    this.file = f; this.mode = mode; if (!same) await this.render();
  }
  async render() {
    this.rendered = true;
    const c = this.contentEl; c.empty(); c.scrollTop = 0;
    if (!this.file) return;
    const text = await adapter.read(this.file.path).catch(() => '');
    if (this.mode === 'source') {
      const wrap = c.createDiv('gq-w-edit');
      const top = wrap.createDiv('gq-w-edittop'); top.createSpan({ cls: 'gq-hint', text: 'Typing. Saved on this phone as you go.' });
      const done = top.createEl('button', { text: 'Done', cls: 'mod-cta' });
      const ta = this.ta = wrap.createEl('textarea', { cls: 'gq-w-ta', attr: { 'aria-label': 'Note text', spellcheck: 'false', lang: 'el' } }); ta.value = text;
      let t = 0; const save = () => { clearTimeout(t); writeSync(this.file.path, ta.value); };
      ta.addEventListener('input', () => { clearTimeout(t); t = setTimeout(save, 600); });
      done.onclick = async () => { save(); this.ta = null; this.mode = 'preview'; await this.render(); };
      return;
    }
    this.ta = null;
    const pv = c.createDiv('markdown-preview-view markdown-rendered markdown-reading-view');
    const sizer = pv.createDiv('markdown-preview-sizer markdown-preview-section');
    if (this.file.path.startsWith('My Work/')) { const r = sizer.createDiv('gq-w-editbar'); const b = r.createEl('button', { text: 'Edit', cls: 'gq-mini' }); b.onclick = async () => { this.mode = 'source'; await this.render(); }; }
    await renderMarkdown(text, sizer, this.file.path, this, text, 0);
  }
}
class Leaf extends Events {
  constructor(ws, root, side) { super(); this.ws = ws; this.app = ws.app; this.root = root; this.side = !!side; this.view = new ItemView(this); this.containerEl = createDiv('workspace-leaf'); this.containerEl.appendChild(this.view.containerEl); this.hist = []; this.isDeferred = false; }
  getRoot() { return this.root; }
  getViewState() { return { type: this.view.getViewType(), state: this.view.getState() }; }
  async setViewState(vs, res) {
    if (!vs || !vs.type) return;
    if (!this.side && !this._nohist && this.view && this.view.getViewType() !== 'empty') { const cur = this.getViewState(); const k = x => JSON.stringify([x.type, (x.state || {}).file || '', (x.state || {}).mode || 'preview', (x.state || {}).app || '', (x.state || {}).hash || '', (x.state || {}).path || '']); if (k(cur) !== k({ type: vs.type, state: vs.state || {} })) this.ws.pushHist(this, cur); }
    this._nohist = false;
    const st = vs.state || {};
    if (this.view.getViewType() !== vs.type) {
      try { this.view._close(); await this.view.onClose(); } catch (e) {}
      const make = vs.type === 'markdown' ? (l => new MarkdownView(l)) : G.views[vs.type];
      this.view = make ? make(this) : new ItemView(this);
      this.containerEl.empty(); this.view.containerEl.setAttr('data-type', vs.type); this.containerEl.appendChild(this.view.containerEl);
      if (this.view.contentEl && vs.type !== 'markdown') this.view.containerEl.addClass('gq-w-' + vs.type);
      await this.view.onOpen();
    }
    await this.view.setState(st, res || {});
    if (!this.side) { this.ws.afterMain(this); if (vs.type === 'markdown' && this.view.file) this.ws.fileOpened(this.view.file); }
    this.ws.trigger('layout-change');
  }
  async openFile(f, o) { const st = (o && o.state) || {}; if (f && f.extension && f.extension !== 'md') { window.open('vault/' + f.path.split('/').map(encodeURIComponent).join('/'), '_blank'); return; } await this.setViewState({ type: 'markdown', state: { file: f.path, mode: st.mode === 'source' ? 'source' : 'preview' }, active: true }); }
  detach() {}
  updateHeader() { this.ws.paintHead(); }
  async loadIfDeferred() {}
  setPinned() {} togglePinned() {} setGroup() {}
  getDisplayText() { return this.view.getDisplayText(); }
}
class Split { constructor(ws, side) { this.ws = ws; this.side = side; this.collapsed = true; this.children = []; } collapse() { if (this.side) this.ws.closeSheet(); this.collapsed = true; } expand() { this.collapsed = false; if (this.side) this.ws.openSheet(); } toggle() { this.collapsed ? this.expand() : this.collapse(); } }
class Workspace extends Events {
  constructor(app) {
    super(); this.app = app; this.layoutReady = false;
    this.rootSplit = { type: 'root' }; this.leftSplit = new Split(this, false); this.rightSplit = new Split(this, true); this.leftRibbon = { collapsed: false };
    this.main = new Leaf(this, this.rootSplit); this.sideLeaf = null; this.activeLeaf = this.main; this.lastFile = null; this.stack = [];
    this.containerEl = document.body;
  }
  mount(mainEl, sheetEl) { this.mainEl = mainEl; this.sheetEl = sheetEl; mainEl.appendChild(this.main.containerEl); }
  getLeaf() { return this.main; }
  createLeafInParent() { return this.main; }
  getMostRecentLeaf() { return this.main; }
  getUnpinnedLeaf() { return this.main; }
  getRightLeaf() { if (!this.sideLeaf) { this.sideLeaf = new Leaf(this, this.rightSplit, true); this.sheetBody.appendChild(this.sideLeaf.containerEl); } return this.sideLeaf; }
  getLeftLeaf() { return this.getRightLeaf(); }
  getLeavesOfType(t) { return [this.main, this.sideLeaf].filter(l => l && l.view && l.view.getViewType() === t); }
  iterateAllLeaves(cb) { for (const l of [this.main, this.sideLeaf]) if (l) cb(l); }
  iterateRootLeaves(cb) { cb(this.main); }
  getActiveFile() { return this.main.view instanceof MarkdownView && this.main.view.file ? this.main.view.file : this.lastFile; }
  getActiveViewOfType(T) { const v = this.main.view; return v instanceof T ? v : null; }
  setActiveLeaf(l) { if (l && !l.side) this.activeLeaf = l; }
  revealLeaf(l) { if (l && l.side) this.openSheet(); }
  onLayoutReady(cb) { if (this.layoutReady) setTimeout(cb, 0); else (this._ready = this._ready || []).push(cb); }
  ready() { this.layoutReady = true; for (const cb of this._ready || []) { try { const r = cb(); if (r && r.catch) r.catch(e => console.error(e)); } catch (e) { console.error(e); } } this._ready = []; }
  requestSaveLayout() {} changeLayout() {} getLayout() { return {}; }
  async openLinkText(link, src, newLeaf, o) { const f = resolveLink(link, src); if (f) await this.main.openFile(f, o); else new Notice(link + ' is not in this app yet.'); }
  fileOpened(f) { this.lastFile = f; this.trigger('file-open', f); this.trigger('active-leaf-change', this.main); }
  pushHist(leaf, vs) { this.stack.push(vs); if (this.stack.length > 60) this.stack.shift(); try { history.pushState({ gq: this.stack.length }, ''); } catch (e) {} this.paintHead(); }
  async back() {
    if (this.sheetOpen) { this.closeSheet(); return true; }
    const vs = this.stack.pop(); if (!vs) return false;
    this.main._nohist = true; await this.main.setViewState(vs); return true;
  }
  afterMain() { this.closeSheet(); this.mainEl && (this.mainEl.scrollTop = 0); this.paintHead(); }
  paintHead() { if (G.onHead) G.onHead(); }
  openSheet() { if (!this.sheetEl) return; this.sheetOpen = true; this.rightSplit.collapsed = false; this.sheetEl.classList.add('is-open'); document.body.classList.add('gq-w-sheet'); }
  closeSheet() { if (!this.sheetEl) return; this.sheetOpen = false; this.rightSplit.collapsed = true; this.sheetEl.classList.remove('is-open'); document.body.classList.remove('gq-w-sheet'); }
}

// ---------- Modal, Menu, Notice ----------
class Modal extends Component {
  constructor(app) { super(); this.app = app; this.containerEl = createDiv('modal-container mod-dim'); this.containerEl.createDiv('modal-bg').onclick = () => this.close(); this.modalEl = this.containerEl.createDiv('modal'); const x = this.modalEl.createDiv({ cls: 'modal-close-button', attr: { role: 'button', 'aria-label': 'Close' } }); x.textContent = '×'; x.onclick = () => this.close(); this.titleEl = this.modalEl.createDiv('modal-title'); this.contentEl = this.modalEl.createDiv('modal-content'); this.scope = { register() {} }; this.shouldRestoreSelection = false; }
  open() { document.body.appendChild(this.containerEl); this._esc = e => { if (e.key === 'Escape') this.close(); }; document.addEventListener('keydown', this._esc); G.modals.push(this); try { const r = this.onOpen(); if (r && r.catch) r.catch(e => console.error(e)); } catch (e) { console.error(e); } }
  close() { if (!this.containerEl.isConnected) return; document.removeEventListener('keydown', this._esc); G.modals = G.modals.filter(m => m !== this); try { this.onClose(); } catch (e) {} this.containerEl.remove(); }
  setTitle(t) { this.titleEl.setText(t); return this; }
  setContent(c) { this.contentEl.empty(); if (typeof c === 'string') this.contentEl.setText(c); else this.contentEl.appendChild(c); return this; }
  onOpen() {} onClose() {}
}
G.modals = [];
class MenuItem { constructor() { this.title = ''; this.cb = null; } setTitle(t) { this.title = t; return this; } setIcon(i) { this.icon = i; return this; } onClick(cb) { this.cb = cb; return this; } setChecked(c) { this.checked = c; return this; } setSection() { return this; } setDisabled(d) { this.disabled = d; return this; } setIsLabel() { return this; } setWarning() { return this; } }
class Menu extends Component {
  constructor() { super(); this.items = []; G.lastMenu = this; }
  addItem(cb) { const i = new MenuItem(); cb(i); this.items.push(i); return this; }
  addSeparator() { this.items.push(null); return this; }
  setNoIcon() { return this; } setUseNativeMenu() { return this; }
  showAtMouseEvent() { this.show(); } showAtPosition() { this.show(); }
  show() {
    if (G.menuHook) G.menuHook(this);
    const bg = createDiv('gq-w-menubg'); const m = bg.createDiv({ cls: 'menu gq-w-menu', attr: { role: 'menu' } });
    const close = () => bg.remove(); bg.onclick = e => { if (e.target === bg) close(); };
    for (const i of this.items) {
      if (!i) { m.createDiv('menu-separator'); continue; }
      const b = m.createEl('button', { cls: 'menu-item', text: i.title, attr: { role: 'menuitem' } }); if (i.disabled) b.disabled = true;
      b.onclick = e => { close(); if (i.cb) i.cb(e); };
    }
    const c = m.createEl('button', { cls: 'menu-item gq-w-menuclose', text: 'Close' }); c.onclick = close;
    document.body.appendChild(bg); this.el = bg;
  }
  hide() { if (this.el) this.el.remove(); }
  onHide() {}
}
class Notice {
  constructor(msg, ms) {
    let box = document.querySelector('.notice-container'); if (!box) box = document.body.createDiv('notice-container');
    this.noticeEl = box.createDiv('notice'); this.setMessage(msg);
    this.noticeEl.onclick = () => this.hide();
    if (ms !== 0) this.t = setTimeout(() => this.hide(), ms || 4500);
  }
  setMessage(m) { this.noticeEl.empty(); if (m instanceof Node) this.noticeEl.appendChild(m); else this.noticeEl.setText(m); return this; }
  hide() { clearTimeout(this.t); this.noticeEl.remove(); }
}
async function requestUrl(o) {
  if (typeof o === 'string') o = { url: o };
  const r = await fetch(o.url, { method: o.method || 'GET', headers: o.headers, body: o.body });
  const buf = await r.arrayBuffer(); const text = new TextDecoder().decode(buf);
  const res = { status: r.status, headers: Object.fromEntries(r.headers.entries()), arrayBuffer: buf, text, get json() { return JSON.parse(text); } };
  if (r.status >= 400 && o.throw !== false) { const e = new Error('Request failed, status ' + r.status); e.status = r.status; throw e; }
  return res;
}

// ---------- Plugin base ----------
class Plugin extends Component {
  constructor(app, manifest) { super(); this.app = app; this.manifest = manifest; }
  registerView(type, fn) { G.views[type] = fn; }
  addRibbonIcon(icon, title, cb) { const r = { icon, title, cb }; G.ribbon.push(r); const e = createDiv(); r.el = e; return e; }
  addCommand(c) { G.commands[c.id] = c; return c; }
  addSettingTab() {} addStatusBarItem() { return createDiv(); }
  registerMarkdownCodeBlockProcessor(lang, fn) { G.codeProc[lang] = fn; }
  registerMarkdownPostProcessor(fn) { G.postProc.push(fn); }
  registerObsidianProtocolHandler(action, fn) { G.proto[action] = fn; }
  registerExtensions() {} registerEditorExtension() {}
  async loadData() { try { return JSON.parse(ls.getItem(DATAK) || 'null'); } catch (e) { return null; } }
  async saveData(d) { ls.setItem(DATAK, JSON.stringify(d)); }
}
const MarkdownRenderer = {
  async render(app, md, el, path, comp) { await renderMarkdown(md, el, path, comp, md, 0); },
  async renderMarkdown(md, el, path, comp) { await renderMarkdown(md, el, path, comp, md, 0); }
};
const obsidian = { Plugin, ItemView, MarkdownView, Modal, Menu, MenuItem, Notice, requestUrl, MarkdownRenderer, Component, Events, TFile: Object, TFolder: Object, Platform: { isMobile: true, isPhone: true, isDesktop: false, isIosApp: false, isAndroidApp: false }, setIcon() {}, normalizePath: norm, debounce: (f, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => f(...a), ms); }; } };
window.Notice = Notice; window.GQW_obs = obsidian;

// ---------- Backups ----------
G.backup = () => {
  const out = { app: 'Greekquent Intermediate web', made: new Date().toISOString(), files: {} , dirs: [...dirs()] };
  for (const k of ovKeys()) out.files[k] = ls.getItem(OV + k);
  const d = ls.getItem(DATAK); if (d) out.data = d;
  const blob = new Blob([JSON.stringify(out, null, 1)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'Greekquent my work ' + new Date().toISOString().slice(0, 10) + '.json';
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
  new Notice('Saved a copy of your work. Keep the file; Restore my work brings it back on any phone.');
};
G.restore = () => {
  const i = document.createElement('input'); i.type = 'file'; i.accept = '.json,application/json';
  i.onchange = async () => {
    const f = i.files && i.files[0]; if (!f) return;
    try {
      const d = JSON.parse(await f.text()); if (!d || !d.files) throw new Error('not a backup');
      let n = 0; for (const [p, t] of Object.entries(d.files)) { if (typeof t !== 'string') continue; const mine = ls.getItem(OV + p); if (mine !== null && mine !== t && mine.length > t.length) continue; ls.setItem(OV + p, t); n++; }
      for (const x of d.dirs || []) addDir(x); if (d.data && !ls.getItem(DATAK)) ls.setItem(DATAK, d.data);
      new Notice(`Brought back ${n} note${n === 1 ? '' : 's'}. Reloading.`); setTimeout(() => location.reload(), 900);
    } catch (e) { new Notice('That file is not a Greekquent backup.'); }
  };
  i.click();
};

// ---------- Start ----------
G.start = async function (bundle, pluginSrc) {
  for (const [p, t] of Object.entries(bundle.notes)) BASE[p] = t;
  STATIC = new Set(bundle.static || []);
  G.version = bundle.version;
  const app = { vault, metadataCache, fileManager, workspace: null, commands: null, setting: { open() {}, openTabById() {} }, plugins: { plugins: {}, enabledPlugins: new Set() }, internalPlugins: { getPluginById: () => null, plugins: {} }, isMobile: true, loadLocalStorage: k => ls.getItem('gqi:ls:' + k), saveLocalStorage: (k, v) => ls.setItem('gqi:ls:' + k, v) };
  app.workspace = new Workspace(app);
  app.commands = { executeCommandById: id => { const c = G.commands[id]; if (c) { (c.callback || c.checkCallback || (() => {}))(); return true; } return false; }, removeCommand: id => { delete G.commands[id]; }, commands: G.commands };
  vault.app = app; G.app = app;
  const module = { exports: {} };
  const req = n => { if (n === 'obsidian') return obsidian; throw new Error('No module ' + n); };
  new Function('require', 'module', 'exports', pluginSrc + '\n//# sourceURL=greekquent-plugin.js')(req, module, module.exports);
  const P = module.exports;
  G.patch && G.patch(P.prototype);
  const plugin = new P(app, { id: 'greekquent-student-layout', name: 'Greekquent', dir: PLUGIN_DIR, version: bundle.version });
  G.plugin = plugin;
  await plugin.onload();
  return app;
};
G.ls = ls; G.readSync = readSync; G.tfile = tfile; G.resolveLink = resolveLink; G.MarkdownView = MarkdownView; G.renderMarkdown = renderMarkdown;
})();

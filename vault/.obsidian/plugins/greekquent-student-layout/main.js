const { Plugin, ItemView, Notice, requestUrl, MarkdownView, MarkdownRenderer, Modal, Menu } = require('obsidian');
// Greekquent Student Layout: keeps the student view simple.
// Turn this plugin off (Settings > Community plugins) to get the full Obsidian interface back.
const MOVE = ['search', 'tag', 'bookmarks', 'backlink', 'outgoing-link', 'outline', 'localgraph'];
const BLOCK = ['graph', 'all-properties'];   // the whole-vault graph and the properties list
const HIDE_RIBBON = ['graph:Open graph view', 'command-palette:Open command palette', 'switcher:Open quick switcher'];
// Left toolbar: Today, Look up, Ask, More. Everything else lives in More and in the command palette.
// Feedback goes to the teacher by text message. Change the number here if it ever changes.
const FEEDBACK_SMS = '+18033990665';
const VAULT_RELEASE = '2026-11-17k';
// Weekly updates come from the teacher's GitHub repository (public, read-only for students).
const UPDATE_BASE = 'https://raw.githubusercontent.com/gtkd321/greekquent-vault/main/';
const MY_WORK = 'My Work/';
// Never touched by updates: the student's own work and their window layout.
const KEEP_LOCAL = p => p.startsWith(MY_WORK) || /^\.obsidian\/workspace(-mobile)?\.json$/.test(p) || p.startsWith('.trash/') || /\/data\.json$/.test(p) && p.startsWith('.obsidian/plugins/greekquent-student-layout/');
// Teacher copy: updates come from a private repo, read with a read-only key the teacher pastes in (stored only on this device).
const TEACHER_API = 'https://api.github.com/repos/gtkd321/greekquent-teacher-vault/contents/';
const TOKEN_URL = 'https://github.com/settings/personal-access-tokens/new?name=Greekquent+teacher+updates&description=Read+the+private+teacher+vault&expires_in=366&contents=read';
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
const PROGRESS = MY_WORK + 'My progress.md';      // word colors (red, yellow, green) live in this note's properties
const MISSES = MY_WORK + 'Game misses.md';
const CARDS = MY_WORK + 'My word cards.md';   // chunks and sentences students add to word notes
const TODAY = 'Today.md';
const WHATS_NEW = "Extras/What's New.md";
const SETUP = 'Extras/Setting up.md';
const INDEX = 'Extras/00 Greekquent Index.md';
const GAMES = 'Extras/09 Games.md';
const EXTRAS = 'Extras/';
// Editions of the student vault. Beginner has this file ({"edition": "beginner"}) and updates from the beginner/ folder of the same repo.
// No file = the Intermediate edition (Beginner and Intermediate scripts, with a switch between them).
const EDITION_MARK = '.obsidian/greekquent-edition.json';
// Side panel: the extras of the page you are on. The main page keeps only the parts most people use.
const MORE = 'greekquent-more';
const SIDE_WORD = ['Pair it with', 'Often appears with', 'Together in the story', 'Appears in scripts'];
const SIDE_LESSON = ['Review from earlier lessons', 'Boards and reading'];
const SIDE_CALLOUT = ['Fluent in a Year', 'Group meet prompt', 'Word links', 'Complete Greek'];
// Only the teacher's copy has this file. It turns Update vault off there, so teacher notes are never touched.
const TEACHER_MARK = '.obsidian/greekquent-teacher.json';
// Only the kids' copy has this file. It switches on the kid Today, hides the grown-up tools, and points updates at the kids repo.
// It also holds the week-to-lesson schedule: {"schedule": [[week, lesson], ...]}.
const KIDS_MARK = '.obsidian/greekquent-kids.json';
const KIDS_BASE = 'https://raw.githubusercontent.com/gtkd321/greekquent-kids-vault/main/';
// Fluent in a Year: week 1 starts Monday, Oct 26, 2026. Mon to Sat are word days, Sunday is review.
const COURSE_START = [2026, 9, 26];
const COUSINS_URL = 'https://greekquent-cousins.pplx.app/';
// Animated scenes and the text adventure exist for these days so far.
const STORY_URL = 'https://www.perplexity.ai/computer/a/greekquent-story-lines-1bIJ0178Q2KldfTqtqgKZA';
const SCENE_DAYS = 300;
const GIAGIA_URL = 'https://www.perplexity.ai/computer/a/greekquent-giagia-T2tsaLMvQiuN84Ng0un.IA';
const BUZZER_URL = 'https://www.perplexity.ai/computer/a/greekquent-buzzer-f3uOHxBFS6Ko8YnCc99fzw';
const COLORS = [['red', "Don't have it"], ['yellow', 'Kind of'], ['green', 'Have it']];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
// Voices read a capital Η or Ο standing alone as a letter name ("ita", "omikron"). It is always the article, so lowercase it for the voice only.
const ttsFix = t => String(t).replace(/(^|[^\p{L}])([ΗΟ])(?=[^\p{L}]|$)/gu, (m, a, b) => a + b.toLowerCase());
const say = w => { if (!window.speechSynthesis) return; const u = new SpeechSynthesisUtterance(ttsFix(w)); u.lang = 'el-GR'; speechSynthesis.cancel(); speechSynthesis.speak(u); };
const isGreek = t => /[\u0370-\u03ff\u1f00-\u1fff]/.test(t);
const fold = t => (t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ς/g, 'σ').trim();
// Gender agreement. The article and describing words take the gender of the noun they go with:
// ο μεγάλος δρόμος, η μεγάλη πόλη, το μεγάλο σπίτι. agree(lemma, 'm' | 'f' | 'n') gives the matching form, or null if the word never changes.
const AGREE_SPECIAL = { 'ο, η, το': ['ο', 'η', 'το'], 'ένας, μία, ένα': ['ένας', 'μία', 'ένα'], 'κανένας': ['κανένας', 'καμία', 'κανένα'], 'κανείς': ['κανείς', 'καμία', 'κανένα'], 'καθένας': ['καθένας', 'καθεμία', 'καθένα'], 'πολύς': ['πολύς', 'πολλή', 'πολύ'], 'δικός μου': ['δικός μου', 'δική μου', 'δικό μου'] };
// Describing words in -ής: ο/η ασφαλής, το ασφαλές. Other words ending in -ης (επίσης, μαθητής) never change.
const AGREE_ES = new Set(['ασφαλής', 'ειλικρινής', 'πλήρης', 'σαφής']);
const AGREE_NEVER = new Set(['εκτός', 'εμπρός', 'προς', 'φέτος', 'έγκυος', 'κάθε', 'μπλε', 'δωρεάν']);
const agree = (lemma, g) => {
  const i = g === 'm' ? 0 : g === 'f' ? 1 : g === 'n' ? 2 : -1; if (i < 0) return null;
  if (AGREE_SPECIAL[lemma]) return AGREE_SPECIAL[lemma][i];
  if (AGREE_NEVER.has(lemma) || /[\s,]/.test(lemma)) return null;
  let m = AGREE_ES.has(lemma) && lemma.match(/^(.+)(ής|ης)$/);
  if (m) return i < 2 ? lemma : m[1] + (m[2] === 'ής' ? 'ές' : 'ες');
  m = lemma.match(/^(.+)(ος|ός)$/); if (!m) return null;
  const st = m[1], acc = m[2] === 'ός';
  if (i === 0) return lemma; if (i === 2) return st + (acc ? 'ό' : 'ο');
  return st + (/[αεηιουωάέήίόύώϊϋ]$/.test(st) ? (acc ? 'ά' : 'α') : (acc ? 'ή' : 'η'));
};
// The words that go in front of the article: αυτό το κινητό, όλη η μέρα.
const AGREE_BEFORE_ARTICLE = new Set(['αυτός', 'εκείνος', 'όλος']);
const smsLink = body => `sms:${FEEDBACK_SMS}?&body=${encodeURIComponent(body)}`;

const HIDE_RIBBON_PREFIX = ['meld-encrypt:'];
const HIDE_COMMANDS = ['graph:open', 'graph:animate', 'canvas:new-file', 'file-explorer:new-file', 'file-explorer:new-file-in-new-pane', 'workspace:new-tab'];
const BANDS = ['0001-0150','0151-0300','0301-0450','0451-0600','0601-0750','0751-0900','0901-1050','1051-1200','1201-1350','1351-1500'];
const BAND_RGB = [0x1a9850,0x66bd63,0xa6d96a,0xd9ef8b,0xfee08b,0xfdae61,0xf46d43,0xd73027,0xa50026,0x7f0020];
const TYPE_COLORS = [['tag:#verb', 0x2b6cb0], ['tag:#noun-m', 0x8e44ad], ['tag:#noun-f', 0x8e44ad], ['tag:#noun-n', 0x8e44ad], ['tag:#noun-pl', 0x8e44ad], ['tag:#adjective', 0xe67e22], ['tag:#adverb', 0x16a085]];
const LOCAL_OPTIONS = {
  // Word web: only the words a note links to (its "Pair it with" and "Often appears with" lists), not the hundreds of notes linking back.
  'collapse-filter': true, search: 'path:"Words/"', localJumps: 1, localBacklinks: false, localForelinks: true, localInterlinks: true,
  showTags: false, showAttachments: false, hideUnresolved: true, showOrphans: false,
  // Colored by word type, so a verb's partners stand out: nouns to do it to, describing words, how/when/where words.
  colorGroups: TYPE_COLORS.map(([q, rgb]) => ({ query: q, color: { a: 1, rgb } })),
  'collapse-color-groups': true, 'collapse-display': true, 'collapse-forces': true, showArrow: false, textFadeMultiplier: 0, nodeSizeMultiplier: 1, lineSizeMultiplier: 1,
  // Calm forces (Obsidian defaults: center 0.52, repel 10, link 1, distance 250).
  // Low repel + strong center = less push after a touch, so the graph settles sooner. It still breathes a little.
  centerStrength: 0.9, repelStrength: 3, linkStrength: 1, linkDistance: 120
};

// ---------- Old Word web tabs (saved in older layouts) turn into the word graph ----------
const WEB = 'greekquent-word-web';
class OldWebView extends ItemView {
  constructor(leaf, plugin) { super(leaf); this.plugin = plugin; this.path = ''; }
  getViewType() { return WEB; }
  getDisplayText() { return 'Word graph'; }
  getIcon() { return 'git-fork'; }
  async setState(st, res) { if (st && st.path) this.path = st.path; return super.setState(st, res); }
  async onOpen() { setTimeout(() => this.plugin.graphGo(this.leaf, this.plugin.wordPath(this.path)), 50); }
}

// ---------- Story Lines and Γιαγιά live inside the vault and open here, offline, in the same page ----------
const APPV = 'greekquent-app';
const APPS = { story: { file: 'storylines.html', title: 'Story Lines', icon: 'clapperboard' }, giagia: { file: 'giagia.html', title: 'Γιαγιά', icon: 'gamepad-2' } };
class AppView extends ItemView {
  constructor(leaf, plugin) { super(leaf); this.plugin = plugin; this.which = 'story'; this.hash = ''; this.shown = ''; }
  getViewType() { return APPV; }
  getDisplayText() { return (APPS[this.which] || APPS.story).title; }
  getIcon() { return (APPS[this.which] || APPS.story).icon; }
  getState() { return { app: this.which, hash: this.hash }; }
  async setState(st, res) { if (st && st.app) { this.which = st.app; this.hash = st.hash || ''; } await super.setState(st, res); await this.render(); }
  async onOpen() { await this.render(); }
  async render() {
    const key = this.which + this.hash; if (key === this.shown) return; this.shown = key;
    const c = this.contentEl; c.empty(); c.addClass('gq-appview');
    const a = APPS[this.which] || APPS.story;
    let html = '';
    try { html = await this.app.vault.adapter.read(this.plugin.manifest.dir + '/apps/' + a.file); }
    catch (e) { c.createDiv({ cls: 'gq-hint', text: 'This one is still on its way. Tap More, then Update vault.' }); this.shown = ''; return; }
    html = html.replace('<!--GQ_START-->', '<script>window.GQ_HASH=' + JSON.stringify(this.hash) + ';</script>');
    const f = c.createEl('iframe', { cls: 'gq-appframe', attr: { title: a.title } });
    f.srcdoc = html;
  }
}

// ---------- Sparks: three words that keep turning up together ----------
class MoreView extends ItemView {
  constructor(leaf, plugin) { super(leaf); this.plugin = plugin; }
  getViewType() { return MORE; }
  getDisplayText() { return 'More on this page'; }
  getIcon() { return 'panel-right'; }
  async onOpen() {
    // Links in the panel open in the main pane, never inside the panel.
    this.registerDomEvent(this.contentEl, 'click', e => {
      const a = e.target.closest && e.target.closest('a.internal-link'); if (!a) return;
      e.preventDefault(); e.stopPropagation();
      const ws = this.app.workspace, link = (a.getAttribute('data-href') || a.getAttribute('href') || '').split('#')[0];
      const f = this.app.metadataCache.getFirstLinkpathDest(link, this.plugin.moreFile || ''); if (!f) return;
      const leaf = (ws.getMostRecentLeaf && ws.getMostRecentLeaf(ws.rootSplit)) || ws.getLeaf(false);
      leaf.openFile(f, { state: { mode: 'preview' } }).then(() => ws.setActiveLeaf(leaf, { focus: true }));
    });
    this.paint();
  }
  paint() { this.plugin.renderMore(this); }
  async onClose() { this.contentEl.empty(); }
}
class SparkModal extends Modal {
  constructor(app, plugin, words) { super(app); this.plugin = plugin; this.words = words; }
  onOpen() {
    const c = this.contentEl; c.addClass('gq-modal', 'gq-pair'); this.titleEl.setText('One sentence, three words');
    const names = this.words.map(p => p.replace(/^Words\//, '').replace(/\.md$/, ''));
    const labels = this.plugin.sparkLabels(this.words);
    const meta = names.map((n, i) => { const f = this.app.vault.getAbstractFileByPath(this.words[i]); const fm = f ? ((this.app.metadataCache.getFileCache(f) || {}).frontmatter || {}) : {}; return fm.english || ''; });
    const list = c.createDiv('gq-spark-words');
    labels.forEach((n, i) => { const b = list.createEl('button', { text: n + (meta[i] ? ' · ' + meta[i] : ''), cls: 'gq-mini' }); b.onclick = () => say(n); });
    const day = this.plugin.sparkDay(this.words);
    if (day) {
      const sb = c.createDiv('gq-spark-story');
      this.plugin.beatIndex().then(b => { const x = b[day]; if (!x) { sb.remove(); return; } sb.createDiv({ cls: 'gq-hint', text: 'In the story, day ' + day + ':' }); const q = sb.createDiv({ cls: 'gq-spark-line', text: x.gr }); sb.createDiv({ cls: 'gq-hint', text: x.en }); q.onclick = () => say(x.gr); }).catch(() => sb.remove());
    }
    c.createDiv({ cls: 'gq-hint', text: 'These three keep turning up together in real Greek. Say one sentence that uses all three, then write it down. Any word form counts.' });
    const ta = c.createEl('textarea', { attr: { rows: '2', placeholder: 'Γράψε εδώ...', autocapitalize: 'sentences', spellcheck: 'false' } }); ta.addClass('gq-input');
    const res = c.createDiv('gq-hint');
    const stem = t => fold(t).replace(/^(ο|η|το) /, '').split(/[ ,]/)[0].slice(0, Math.max(3, Math.min(5, fold(t).length - 2)));
    const check = () => { res.empty(); const t = fold(ta.value); const got = names.map(n => t.includes(stem(n))); res.setText(labels.map((n, i) => (got[i] ? '✓ ' : '· ') + n).join('   ')); return got; };
    ta.oninput = check; check();
    const row = c.createDiv('gq-row');
    const h = row.createEl('button', { text: 'Hear it' }); h.onclick = () => ta.value.trim() && say(ta.value.trim());
    const sv = row.createEl('button', { text: 'Save to My pairs', cls: 'mod-cta' });
    sv.onclick = () => { const t = ta.value.trim(); if (!t) { new Notice('Write a sentence first.'); return; } this.plugin.savePair(t, '', names, true); this.close(); };
  }
  onClose() { this.contentEl.empty(); }
}

// ---------- Look up a word: the 1,500 first, then a free translator for bonus words, right here in Obsidian ----------
class LookupModal extends Modal {
  constructor(app, plugin) { super(app); this.plugin = plugin; this.tr = null; this.timer = 0; }
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
    this.input.onkeydown = e => {
      if (e.key !== 'Enter') return;
      const b = this.list.querySelector('.gq-hit button'); if (b) { b.click(); return; }
      clearTimeout(this.timer); this.translate(true);
    };
    this.plugin.wordIndex().then(() => this.render());
    setTimeout(() => this.input.focus(), 50);
  }
  render() {
    const q = this.input.value.trim(), L = this.list; L.empty(); clearTimeout(this.timer);
    if (!q) { L.createDiv({ cls: 'gq-hint', text: 'Words from the 1,500 open in the word graph. Anything else is a bonus word, translated right here.' }); return; }
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
    this.bonus = L.createDiv('gq-bonus');
    if (hits.length) {
      this.bonus.createDiv({ cls: 'gq-hit-sub', text: 'Want a different word?' });
      const tb = this.bonus.createEl('button', { text: `Translate "${q}"` });
      tb.onclick = () => this.translate(true);
    } else {
      // No match in the 1,500: translate on its own once the student stops typing.
      this.bonus.createDiv({ cls: 'gq-hit-sub', text: 'Bonus word: translating...' });
      this.timer = setTimeout(() => this.translate(false), 700);
    }
  }
  async translate(save) {
    const q = this.input.value.trim(); if (!q || !this.bonus) return;
    const box = this.bonus; box.empty(); box.createDiv({ cls: 'gq-hit-sub', text: 'Translating...' });
    const tr = await this.plugin.translate(q);
    if (q !== this.input.value.trim() || box !== this.bonus) return;   // the student kept typing
    box.empty(); this.tr = tr;
    if (!tr) {
      box.createDiv({ cls: 'gq-hit-sub', text: 'Could not translate right now (are you online?). Press Enter to save it to Words I looked up. The Greek is added the next time you open Obsidian online.' });
      if (save) this.plugin.logLookup(q, null, null);
      return;
    }
    const t = box.createDiv('gq-hit-text');
    const gr = tr.greek;
    t.createDiv({ cls: 'gq-hit-main', text: tr.fromGreek ? `${q}  ·  ${tr.text}` : `${tr.text}  ·  ${q}` });
    if (tr.say) t.createDiv({ cls: 'gq-hit-sub', text: 'say it: ' + tr.say });
    for (const a of tr.alts.slice(0, 3)) t.createDiv({ cls: 'gq-hit-sub', text: `${a.pos}: ${a.terms.slice(0, 4).join(', ')}` });
    const inList = this.plugin.findWords(gr).find(w => fold(w.word) === fold(gr));
    t.createDiv({ cls: 'gq-hit-sub', text: inList ? `It is #${inList.rank} of the 1,500.` : 'Bonus word, saved to Words I looked up.' });
    const btns = box.createDiv('gq-btns');
    const h = btns.createEl('button', { text: 'Hear it' }); h.onclick = () => say(gr);
    if (inList) { const g = btns.createEl('button', { text: 'Word graph' }); g.onclick = () => { this.plugin.logLookup(q, inList); this.close(); this.plugin.openGraph(inList.path); }; }
    if (save) this.plugin.logLookup(q, inList || null, inList ? null : tr);
  }
  fill(row, w, q) {
    const t = row.createDiv('gq-hit-text');
    const m = t.createDiv({ cls: 'gq-hit-main' }); const c = this.plugin.colorOf(w.word); m.createSpan({ cls: 'gq-dot gq-' + (c || 'new'), attr: { 'aria-label': c ? c + ' word' : 'new word' } }); m.appendText(`${w.word}  ·  ${w.english}`);
    t.createDiv({ cls: 'gq-hit-sub', text: `${w.pron ? 'say it: ' + w.pron + '  ·  ' : ''}#${w.rank} of 1,500${w.form ? '  ·  form: ' + w.form : ''}` });
    if (w.cognates) t.createDiv({ cls: 'gq-hit-sub', text: `English cognates: ${w.cognates}${w.via ? '  (you typed a cousin: ' + w.via + ')' : ''}` });
    const g = row.createEl('button', { text: 'Word graph' });
    g.onclick = () => { if (q) this.plugin.logLookup(q, w); this.close(); this.plugin.openGraph(w.path); };
  }
  onClose() {
    clearTimeout(this.timer);
    // The translation on screen when the student closes is the one they meant, so it is saved (half-typed words are not).
    const q = this.input && this.input.value.trim(), tr = this.tr;
    if (q && tr && tr.q === q) {
      const w = this.plugin.findWords(tr.greek).find(x => fold(x.word) === fold(tr.greek));
      this.plugin.logLookup(q, w || null, w ? null : tr);
    }
    this.contentEl.empty();
  }
}

// ---------- Add to this card: your own chunks and sentences for a word ----------
class CardModal extends Modal {
  constructor(app, plugin, word) { super(app); this.plugin = plugin; this.word = word; this.kind = 'chunk'; }
  onOpen() {
    const c = this.contentEl; c.addClass('gq-modal'); this.titleEl.setText(`Add to ${this.word}`);
    const kinds = c.createDiv('gq-btns');
    const kb = [['chunk', 'Chunk'], ['sentence', 'Sentence']].map(([k, t]) => { const b = kinds.createEl('button', { text: t }); b.onclick = () => { this.kind = k; paint(); }; return [k, b]; });
    const hint = c.createDiv('gq-hint');
    const paint = () => {
      kb.forEach(([k, b]) => b.toggleClass('mod-cta', k === this.kind));
      hint.setText(this.kind === 'chunk' ? `A chunk is a short piece you say as one, like "Έχεις τον…;" (Do you have the…?).` : `A sentence is a whole line you would really say, with ${this.word} in it.`);
      this.gr.setAttr('placeholder', this.kind === 'chunk' ? 'Greek chunk' : 'Greek sentence');
    };
    this.gr = c.createEl('textarea', { attr: { rows: 2, autocapitalize: 'off', spellcheck: 'false' } }); this.gr.addClass('gq-input');
    this.en = c.createEl('input', { type: 'text', attr: { placeholder: 'English (or leave empty and tap Translate)', autocapitalize: 'off' } }); this.en.addClass('gq-input');
    paint();
    const msg = c.createDiv('gq-hint');
    const row = c.createDiv('gq-btns');
    const tb = row.createEl('button', { text: 'Translate' });
    tb.onclick = async () => {
      const g = this.gr.value.trim(), e = this.en.value.trim();
      if (!g && !e) { msg.setText('Type the Greek or the English first.'); return; }
      msg.setText('Translating...');
      const tr = await this.plugin.translate(g || e);
      if (!tr) { msg.setText('Could not translate right now. You can still save it.'); return; }
      if (g) this.en.value = tr.fromGreek ? tr.text : this.en.value; else this.gr.value = tr.greek;
      msg.setText(tr.say ? 'say it: ' + tr.say : '');
    };
    const hb = row.createEl('button', { text: 'Hear it' }); hb.onclick = () => this.gr.value.trim() && say(this.gr.value.trim());
    const sv = row.createEl('button', { text: 'Save', cls: 'mod-cta' });
    sv.onclick = async () => {
      const g = this.gr.value.trim();
      if (!g) { msg.setText('Type the Greek first.'); return; }
      if (!isGreek(g)) { msg.setText('The first box is for the Greek. Tap Translate to fill it in.'); return; }
      await this.plugin.saveCard(this.word, this.kind, g, this.en.value.trim());
      this.close();
    };
    setTimeout(() => this.gr.focus(), 50);
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

// ---------- Pair it: build a sentence from a word's partners (all from the 1,500) ----------
const PAIRS_NOTE = MY_WORK + 'My pairs.md';
const PAIR_GOAL = 5;   // sentences a week
const WHO = [['εγώ', 'I', 0], ['εσύ', 'you', 1], ['αυτός', 'he', 2], ['αυτή', 'she', 2], ['εμείς', 'we', 3], ['εσείς', 'you all', 4], ['αυτοί', 'they', 5],
  ['η μαμά μου', 'my mom', 2], ['ο φίλος μου', 'my friend', 2], ['τα παιδιά', 'the kids', 5]];
const s3 = w => ({ have: 'has', do: 'does', go: 'goes' })[w] || (/(s|sh|ch|x|z|o)$/.test(w) ? w + 'es' : /[^aeiou]y$/.test(w) ? w.slice(0, -1) + 'ies' : w + 's');
function enVerb(pred, p, neg) {
  const ws = pred.split(' '), w = ws[0], rest = ws.slice(1).join(' ');
  let f;
  if (w === 'am') f = (p === 0 ? 'am' : p === 2 ? 'is' : 'are') + (neg ? ' not' : '');
  else if (w === 'can') f = neg ? "can't" : 'can';
  else if (w === "can't") f = neg ? 'can' : "can't";
  else if (neg) f = (p === 2 ? "doesn't " : "don't ") + w;
  else f = p === 2 ? s3(w) : w;
  return (f + ' ' + rest).trim();
}
const DEGREE = ['πολύ', 'πάρα πολύ', 'λίγο', 'πραγματικά', 'πάντα', 'ακόμα', 'σίγουρα', 'μάλλον', 'ειλικρινά', 'σοβαρά', 'επιτέλους'];
const cap1 = t => t ? t[0].toUpperCase() + t.slice(1) : t;
class PairModal extends Modal {
  constructor(app, plugin, word, pre) { super(app); this.plugin = plugin; this.word = word; this.pre = pre || null; }
  async onOpen() {
    this.contentEl.addClass('gq-modal', 'gq-pair');
    this.data = await this.plugin.pairData();
    this.render();
  }
  render() {
    const c = this.contentEl; c.empty();
    const v = this.data && this.data.v[this.word];
    if (v) this.verbView(c, v); else this.wordView(c);
    this.ownBox(c);
  }
  chips(parent, label, items, sel, pick) {
    const row = parent.createDiv('gq-prow'); row.createDiv({ cls: 'gq-plabel', text: label });
    const box = row.createDiv('gq-chips');
    items.forEach((it, i) => { const b = box.createEl('button', { text: it, cls: 'gq-chip' + (i === sel ? ' is-on' : '') }); b.setAttr('aria-pressed', String(i === sel)); b.onclick = () => pick(i === sel && i !== 0 ? 0 : i); });
  }
  verbView(c, v) {
    this.titleEl.setText('Build a sentence with ' + this.word);
    if (!this.st) {
      this.st = { who: 0, w: 0, h: 0, neg: false };
      if (this.pre && this.pre[0] === 'w') this.st.w = this.pre[1] + 1;
      if (this.pre && this.pre[0] === 'h') this.st.h = this.pre[1] + 1;
    }
    const st = this.st, who = v.imp ? WHO.slice(0, 7) : WHO;
    c.createDiv({ cls: 'gq-hint', text: 'Tap one from each row. Every word here is from the 1,500.' });
    this.chips(c, 'Who', who.map(x => x[0]), st.who, i => { st.who = i; this.render(); });
    this.chips(c, 'What', ['(nothing)'].concat(v.w.map(x => x[0])), st.w, i => { st.w = i; this.render(); });
    this.chips(c, 'How, when, where', ['(nothing)'].concat(v.h.map(x => x[0])), st.h, i => { st.h = i; if (i && v.h[i - 1][3]) st.neg = true; this.render(); });
    const nr = c.createDiv('gq-prow'); const lab = nr.createEl('label'); const cb = lab.createEl('input', { type: 'checkbox' }); cb.checked = st.neg; lab.appendText(' Not (δεν)');
    cb.onchange = () => { st.neg = cb.checked; this.render(); };
    const [gw, ew, p] = who[st.who], it = st.w ? v.w[st.w - 1] : null, a = st.h ? v.h[st.h - 1] : null;
    const pron = st.who < 7;   // pronouns are usually dropped in Greek; people stay
    // Describing words agree with who: κουρασμένος, κουρασμένη, κουρασμένοι, κουρασμένα.
    const agree = g => { const st0 = g.slice(0, -2), vow = /[ιεί]$/.test(st0), w0 = who[st.who][0];
      if (w0 === 'αυτή' || w0 === 'η μαμά μου') return st0 + (vow ? 'α' : 'η');
      if (w0 === 'τα παιδιά') return st0 + 'α';
      if (p >= 3) return st0 + 'οι';
      return g; };
    const obj = it ? (it[3] ? 'να ' + it[3][p] : (it[4] ? agree(it[0]) : it[0])) : '';
    // Words like πολύ go right after the verb when a να or ότι part follows: Θέλω πολύ να πάω.
    const early = a && it && (it[3] || /^(ότι|πως|αν|τι|γιατί|που) /.test(it[0])) && DEGREE.includes(a[0]);
    const gr = cap1([pron ? '' : gw, st.neg ? 'δεν' : '', v.f[p]].concat(early ? [a[0], obj] : [obj, a ? a[0] : '']).filter(Boolean).join(' ')) + '.';
    let pred = it && it[1].startsWith('!') ? it[1].slice(1) : (v.en + (it ? ' ' + it[1] : ''));
    if (/^can to /.test(pred)) pred = pred.replace(' to ', ' ');
    const really = early && a[0] === 'πολύ';
    const en = cap1(`${ew} ${really ? 'really ' : ''}${enVerb(pred, p, st.neg)}${a && !really ? ' ' + a[1] : ''}`) + '.';
    const out = c.createDiv('gq-pout'); out.createDiv({ cls: 'gq-pgr', text: gr }); out.createDiv({ cls: 'gq-pen', text: en + '  (word by word, roughly)' });
    if (pron) out.createDiv({ cls: 'gq-hint', text: `Greek usually leaves out ${gw}: the verb ending already says who.` });
    const row = c.createDiv('gq-row');
    const h = row.createEl('button', { text: 'Hear it' }); h.onclick = () => say(gr);
    const sh = row.createEl('button', { text: 'Surprise me' }); sh.onclick = () => { st.who = Math.floor(Math.random() * who.length); st.w = v.w.length ? 1 + Math.floor(Math.random() * v.w.length) : 0; st.h = v.h.length ? 1 + Math.floor(Math.random() * v.h.length) : 0; st.neg = !!(st.h && v.h[st.h - 1][3]); this.render(); };
    const sv = row.createEl('button', { text: 'Save to My pairs', cls: 'mod-cta' }); sv.onclick = () => this.plugin.savePair(gr, en, [this.word, it && it[2], a && a[2]].filter(Boolean), false);
  }
  wordView(c) {
    this.titleEl.setText('Pair ' + this.word);
    const x = this.data && this.data.x[this.word];
    if (!x) { c.createDiv({ cls: 'gq-hint', text: 'No ready-made pairs for this word yet. Write your own below.' }); return; }
    if (x.l.length) {
      c.createDiv({ cls: 'gq-hint', text: 'Pick a verb to build with:' });
      const box = c.createDiv('gq-chips');
      for (const [verb, k, i] of x.l) {
        const vv = this.data.v[verb]; if (!vv) continue;
        const part = k === 'w' ? vv.w[i][0] : vv.h[i][0];
        const b = box.createEl('button', { text: `${verb} ${part}`, cls: 'gq-chip' });
        b.onclick = () => { this.word = verb; this.pre = [k, i]; this.st = null; this.render(); };
      }
    }
    if (x.c.length) {
      c.createDiv({ cls: 'gq-hint', text: 'Chunks: tap to hear, then save the ones you can say.' });
      const box = c.createDiv('gq-chips');
      for (const [g, e] of x.c) {
        const b = box.createEl('button', { text: g, cls: 'gq-chip', attr: { 'aria-label': e } });
        b.onclick = () => { say(g); this.picked = [g, e]; this.render(); };
      }
      if (this.picked) {
        const out = c.createDiv('gq-pout'); out.createDiv({ cls: 'gq-pgr', text: this.picked[0] }); out.createDiv({ cls: 'gq-pen', text: this.picked[1] });
        const sv = c.createDiv('gq-row').createEl('button', { text: 'Save to My pairs', cls: 'mod-cta' }); sv.onclick = () => this.plugin.savePair(this.picked[0], this.picked[1], [this.word], false);
      }
    }
  }
  ownBox(c) {
    const box = c.createDiv('gq-pown');
    box.createDiv({ cls: 'gq-tsub', text: 'Your own pair (counts double)' });
    box.createDiv({ cls: 'gq-hint', text: `Pair ${this.word} with a word we did not list, or build a longer sentence.` });
    const ta = box.createEl('textarea', { attr: { rows: '2', placeholder: 'Γράψε εδώ...', autocapitalize: 'sentences', spellcheck: 'false' } }); ta.addClass('gq-input');
    if (this.ownText) ta.value = this.ownText;
    const res = box.createDiv('gq-hint');
    const check = () => {
      this.ownText = ta.value; res.empty();
      const toks = ta.value.split(/[^\u0370-\u03ff\u1f00-\u1fffA-Za-z]+/).filter(t => isGreek(t));
      const inList = [], bonus = [];
      const ART = /^(ο|η|το|οι|τα|τον|την|τη|του|της|των|τους|τις|στο|στη|στην|στον|στα|στις|στους|στου|στης|σ)$/; for (const t of toks) { if (ART.test(t.toLowerCase())) continue; const hit = this.plugin.findWords(t)[0]; if (hit && hit.score >= 89) { if (!inList.includes(hit.word)) inList.push(hit.word); } else if (!bonus.includes(t)) bonus.push(t); }
      if (inList.length) res.appendText('In the 1,500: ' + inList.join(', ') + '. ');
      if (bonus.length) res.appendText('Bonus words: ' + bonus.join(', ') + '.');
      return inList;
    };
    ta.oninput = check; this.plugin.wordIndex().then(check);
    const row = box.createDiv('gq-row');
    const h = row.createEl('button', { text: 'Hear it' }); h.onclick = () => ta.value.trim() && say(ta.value.trim());
    const sv = row.createEl('button', { text: 'Save my pair' }); sv.onclick = () => { const t = ta.value.trim(); if (!t) { new Notice('Write a sentence first.'); return; } const ws = check(); this.plugin.savePair(t, '', [this.word].concat(ws.filter(w => w !== this.word)), true); ta.value = ''; this.ownText = ''; check(); };
  }
  onClose() { this.contentEl.empty(); }
}

module.exports = class GreekquentStudentLayout extends Plugin {
  onload() {
    this.busy = false; this.todayEls = new Set(); this.bars = new Set(); this.cardBoxes = new Set();
    document.body.classList.add('greekquent-student');
    this.registerView(WEB, leaf => new OldWebView(leaf, this));
    this.registerView(APPV, leaf => new AppView(leaf, this));
    this.registerView(MORE, leaf => new MoreView(leaf, this));
    // The graph redraws its labels now and then (zoom, new data). Put the agreeing forms back each time.
    this.registerInterval(window.setInterval(() => this.app.workspace.iterateAllLeaves(l => { if (l.gq && l.view && l.view.getViewType && l.view.getViewType() === 'localgraph') this.applyGraphLabels(l); }), 800));
    this.registerEvent(this.app.metadataCache.on('changed', f => { if (f.path.startsWith('Words/')) { this.infoCache = null; this.coCache = null; } }));
    // The in-vault games send results here instead of through an obsidian:// link.
    this.registerDomEvent(window, 'message', e => {
      const d = e.data; if (!d || d.gq !== 'obsidian' || typeof d.url !== 'string') return;
      try { const u = new URL(d.url); const p = {}; u.searchParams.forEach((v, k) => { p[k] = v; }); this.fromGame(p); } catch (err) {}
    });
    // Left toolbar: four buttons. Today is the start screen; More holds the rest.
    this.addRibbonIcon('house', 'Today', () => this.openToday());
    this.addRibbonIcon('search', 'Look up a word', () => new LookupModal(this.app, this).open());
    this.addRibbonIcon('users', 'Ask', () => this.ask());
    this.addRibbonIcon('more-horizontal', 'More', evt => this.moreMenu(evt));
    this.addCommand({ id: 'open-today', name: 'Open Today', callback: () => this.openToday() });
    this.addCommand({ id: 'share-feedback', name: 'Share feedback', callback: () => this.feedback() });
    this.addCommand({ id: 'send-homework', name: 'Send homework', callback: () => this.sendHomework() });
    this.addCommand({ id: 'update-vault', name: 'Update vault', callback: () => this.updateVault(false) });
    this.addCommand({ id: 'look-up-word', name: 'Look up a word', callback: () => new LookupModal(this.app, this).open() });
    this.addCommand({ id: 'ask-group', name: 'Ask the group about this note', callback: () => this.ask() });
    this.addCommand({ id: 'ask-video', name: 'Ask on video about this note', callback: () => this.askVideo() });
    // Today page, word color bar, and misses sent back from the games.
    this.registerMarkdownCodeBlockProcessor('greekquent-today', (src, el, ctx) => { this.todayEls.add(el); this.renderToday(el); });
    this.registerMarkdownPostProcessor((el, ctx) => this.wordBar(el, ctx));
    this.registerMarkdownPostProcessor((el, ctx) => this.cardBox(el, ctx));
    this.registerMarkdownPostProcessor((el, ctx) => this.sideHide(el, ctx));
    this.registerMarkdownPostProcessor((el, ctx) => this.lessonTop(el, ctx));
    this.addCommand({ id: 'more-on-page', name: 'More on this page', callback: () => this.showMore() });
    this.addCommand({ id: 'add-to-card', name: 'Add a chunk or sentence to this word', callback: () => { const f = this.app.workspace.getActiveFile(); if (!f || !f.path.startsWith('Words/')) { new Notice('Open a word note first.'); return; } new CardModal(this.app, this, f.basename).open(); } });
    this.registerObsidianProtocolHandler('greekquent', p => p.open ? this.openApp(p.open, p.hash || '') : this.fromGame(p));
    this.registerEvent(this.app.workspace.on('file-open', f => { if (f && f.path === TODAY) this.refreshToday(); }));
    // Student questions: video questions and answers from the public library, shown at the end of the matching note.
    this.registerMarkdownPostProcessor((el, ctx) => this.questionsBox(el, ctx));
    this.registerMarkdownCodeBlockProcessor('greekquent-questions', (src, el) => this.questionsIndex(el));
    // Classroom Greek and other phrase lists: one line per phrase, "Greek | English | gesture", each with a Hear button.
    this.registerMarkdownCodeBlockProcessor('greekquent-say', (src, el) => this.sayList(el, src));
    this.registerEvent(this.app.metadataCache.on('changed', f => { if (f.path.startsWith('Words/')) this.words = null; if (f.path.startsWith('Fluent in a Year/')) this.beats = null; }));
    this.registerEvent(this.app.metadataCache.on('changed', f => { if (f.path === CARDS || f.path === PAIRS_NOTE) this.refreshCards(); }));
    // Word cards opened from the graph fade in (about a fifth of a second) instead of flashing in.
    this.registerDomEvent(document, 'pointerdown', e => { if (e.target.closest && e.target.closest('.workspace-leaf-content[data-type="localgraph"], .workspace-leaf-content[data-type="graph"]')) this.graphTouch = Date.now(); }, true);
    this.registerEvent(this.app.workspace.on('file-open', f => {
      if (!f || !f.path.startsWith('Words/') || Date.now() - (this.graphTouch || 0) > 1500) return;
      this.graphTouch = 0;
      const v = this.app.workspace.getActiveViewOfType(MarkdownView); if (!v) return;
      const el = v.containerEl; el.removeClass('gq-fade'); void el.offsetWidth; el.addClass('gq-fade');
      setTimeout(() => el.removeClass('gq-fade'), 400);
    }));
    // My Work notes open ready to type in.
    this.registerEvent(this.app.workspace.on('file-open', f => { if (f && f.path.startsWith(MY_WORK)) setTimeout(() => this.editMode(f), 50); }));
    this.addCommand({ id: 'open-word-graph', name: 'Open word graph', callback: () => this.openGraph() });
    this.registerEvent(this.app.workspace.on('file-menu', (menu, file) => {
      if (file && file.path && file.path.startsWith('Words/')) menu.addItem(i => i.setTitle('Open word graph').setIcon('git-fork').onClick(() => this.openGraph(file.path)));
    }));
    this.app.workspace.onLayoutReady(async () => {
      this.pruneEmpty(['Scripts/Kid variants/x', 'Scripts/Student/x']);
      setTimeout(() => this.fillBlankLookups().catch(() => {}), 4000);
      this.isTeacher = await this.app.vault.adapter.exists(TEACHER_MARK);
      this.isKids = !!(await this.kidsInfo()); document.body.classList.toggle('gq-kids', this.isKids);
      for (const id of HIDE_COMMANDS) { try { this.app.commands.removeCommand(id); } catch (e) {} }
      this.hideRibbon();
      try { this.edition = (JSON.parse(await this.app.vault.adapter.read(EDITION_MARK)) || {}).edition || 'intermediate'; } catch (e) { this.edition = 'intermediate'; }
      this.oneTab(); this.oneButton();
      this.applyScripts();
      this.registerEvent(this.app.metadataCache.on('changed', f => { if (f.path === PROGRESS) this.applyScripts(); }));
      this.registerEvent(this.app.workspace.on('file-open', () => this.paintMore()));
      this.registerEvent(this.app.metadataCache.on('changed', f => { if (this.moreFile && f.path === this.moreFile) this.paintMore(); }));
      // Startup: tidy the sidebars quietly. Obsidian's default layout (fresh vault, new device) puts Search and
      // Bookmarks on the left; moving them used to pop the right sidebar open on Bookmarks.
      const wasCollapsed = this.app.workspace.rightSplit ? this.app.workspace.rightSplit.collapsed : true;
      await this.fix(true);
      await this.ensureLocalGraph();
      await this.ensureMore();
      const rs = this.app.workspace.rightSplit;
      if (rs && wasCollapsed && !rs.collapsed) rs.collapse();
      this.registerEvent(this.app.workspace.on('layout-change', () => this.fix()));
      await this.openToday(true);
      setTimeout(() => this.updateVault(true), 4000);   // quiet check at startup
    });
  }
  // ---------- Pair it ----------
  async pairData() {
    if (this.pairs) return this.pairs;
    try { this.pairs = JSON.parse(await this.app.vault.adapter.read(this.manifest.dir + '/pairs.json')); } catch (e) { this.pairs = { v: {}, x: {} }; }
    return this.pairs;
  }
  openPair(word, pre) { new PairModal(this.app, this, word, pre).open(); }
  // A leaf in the main pane. Buttons in the side panel must never open things inside the side panel.
  mainLeaf(newTab) {
    const ws = this.app.workspace;
    const root = ws.getMostRecentLeaf && ws.getMostRecentLeaf(ws.rootSplit);
    if (root && ws.activeLeaf !== root && ws.activeLeaf && ws.activeLeaf.getRoot && ws.activeLeaf.getRoot() !== ws.rootSplit) ws.setActiveLeaf(root, { focus: false });
    let leaf = newTab ? ws.getLeaf('tab') : ws.getLeaf(false);
    if (leaf.getRoot && leaf.getRoot() !== ws.rootSplit) { try { leaf.detach(); } catch (e) {} leaf = root && !newTab ? root : ws.createLeafInParent(ws.rootSplit, 0); }
    return leaf;
  }
  async openApp(which, hash) {
    const ws = this.app.workspace, leaf = this.mainLeaf(false);
    await leaf.setViewState({ type: APPV, active: true, state: { app: which, hash: hash || '' } });
    ws.revealLeaf(leaf);
  }
  // "Often appears with" links of a word note, as note paths. Read once, then remembered.
  async coList(path) {
    if (!this.coCache) this.coCache = new Map();
    if (this.coCache.has(path)) return this.coCache.get(path);
    const f = this.app.vault.getAbstractFileByPath(path); let out = [];
    if (!this.storyDays) this.storyDays = new Map();
    if (f) {
      const t = await this.app.vault.cachedRead(f);
      const m = t.match(/## Often appears with\n([\s\S]*?)(?:\n\n|\n#|$)/); if (m) out = [...m[1].matchAll(/\[\[([^\]|#]+)/g)].map(x => 'Words/' + x[1] + '.md');
      // Words that turn up together in this year's story. Each line ends with the days, so a spark can show the scene.
      const s = t.match(/## Together in the story\n([\s\S]*?)(?:\n\n|\n#|$)/);
      if (s) for (const x of s[1].matchAll(/\[\[([^\]|#]+)[^\n]*?· day ([\d, ]+)/g)) {
        const q = 'Words/' + x[1] + '.md'; if (!out.includes(q)) out.push(q);
        const days = x[2].split(',').map(d => +d.trim()).filter(Boolean);
        this.storyDays.set(path + '\t' + q, days); this.storyDays.set(q + '\t' + path, days);
      }
    }
    this.coCache.set(path, out); return out;
  }
  // What a word note is: its name, its gender if it's a noun, its form with the article, and whether it changes to agree.
  wordInfo(path) {
    if (!this.infoCache) this.infoCache = new Map();
    if (this.infoCache.has(path)) return this.infoCache.get(path);
    const f = this.app.vault.getAbstractFileByPath(path);
    const fm = f ? ((this.app.metadataCache.getFileCache(f) || {}).frontmatter || {}) : {};
    const name = path.replace(/^Words\//, '').replace(/\.md$/, '');
    const tags = [].concat(fm.tags || []).join(' '), al = [].concat(fm.aliases || []);
    const g = (tags.match(/noun-([mfn])\b/) || [])[1] || '';
    const noun = g ? (al.find(a => /^(ο|η|το) /.test(a)) || ({ m: 'ο ', f: 'η ', n: 'το ' })[g] + name) : '';
    const changes = !g && !/verb|adverb|noun/.test(tags) && agree(name, 'n') !== null && (agree(name, 'f') !== name || agree(name, 'n') !== name);
    const info = { path, name, g, noun, changes, english: fm.english || '' };
    this.infoCache.set(path, info); return info;
  }
  // How a word reads next to a noun of gender g: nouns keep their article, describing words take g.
  agreeLabel(path, g) {
    const w = this.wordInfo(path);
    if (w.g) return w.noun;
    if (w.changes && g) return agree(w.name, g) || w.name;
    return w.name;
  }
  // A short phrase for a describing word with a noun: μεγάλο σπίτι, ένα σπίτι, αυτό το σπίτι, το σπίτι.
  agreePhrase(adj, noun) {
    const a = this.wordInfo(adj), n = this.wordInfo(noun); if (!n.g) return '';
    const form = agree(a.name, n.g); if (!form) return '';
    const bare = n.noun.replace(/^(ο|η|το) /, '');
    if (a.name === 'ο, η, το') return n.noun;
    if (AGREE_BEFORE_ARTICLE.has(a.name)) return form + ' ' + n.noun;
    if (a.name === 'ποιος') return form + ' ' + bare + ';';
    return form + ' ' + bare;
  }
  // Graph labels follow the center word: tap a noun and the describing words around it switch to its gender.
  setGraphLabels(leaf, path) {
    const st = this.graphState(leaf), c = this.wordInfo(path);
    st.labelG = c.g; st.labels = new Map();
    this.applyGraphLabels(leaf);
  }
  applyGraphLabels(leaf) {
    const st = leaf.gq, v = leaf.view, r = v && v.renderer; if (!st || !st.labels || !r || !Array.isArray(r.nodes)) return;
    try {
      let touched = false;
      for (const n of r.nodes) {
        if (!n || typeof n.id !== 'string' || !n.id.startsWith('Words/')) continue;
        let t = st.labels.get(n.id); if (t === undefined) { t = this.agreeLabel(n.id, st.labelG); st.labels.set(n.id, t); }
        if (n.gqLabel !== t) { n.gqLabel = t; n.getDisplayText = () => t; touched = true; }
        if (n.text && n.text.text !== t) { n.text.text = t; touched = true; }
      }
      if (touched && r.changed) r.changed();
    } catch (e) { /* labels are a bonus; the graph still works */ }
  }
  // The agreement strip under the graph title.
  paintAgree(leaf, path) {
    const st = this.graphState(leaf); if (!st.agree) return;
    const box = st.agree; box.empty(); box.hide();
    const c = this.wordInfo(path), links = Object.keys((this.app.metadataCache.resolvedLinks || {})[path] || {}).filter(p => p.startsWith('Words/') && p !== path);
    let head = '', items = [];
    if (c.g) { head = 'Agrees with ' + c.noun + ':'; items = links.filter(p => this.wordInfo(p).changes).map(p => this.agreePhrase(p, path)); }
    else if (c.changes) { head = c.name + ' changes with the noun:'; items = links.filter(p => this.wordInfo(p).g).map(p => this.agreePhrase(path, p)); }
    items = [...new Set(items.filter(Boolean))].slice(0, 8); if (!items.length) return;
    box.show(); box.createSpan({ cls: 'gq-agree-t', text: head });
    for (const t of items) { const b = box.createEl('button', { text: t, cls: 'gq-mini' }); b.onclick = () => say(t); }
  }
  // A spark: the center word plus two of its partners that also link to each other. A closed triangle in the graph.
  async sparks(path) {
    const co = await this.coList(path), sets = new Map(), res = [];
    for (const a of co) sets.set(a, new Set(await this.coList(a)));
    for (let i = 0; i < co.length; i++) for (let j = i + 1; j < co.length; j++) {
      const a = co[i], b = co[j], ab = sets.get(a).has(b), ba = sets.get(b).has(a); if (!ab && !ba) continue;
      const back = (sets.get(a).has(path) ? 1 : 0) + (sets.get(b).has(path) ? 1 : 0);
      const story = ['\t' + a, '\t' + b].some(x => this.storyDays.has(path + x)) || this.storyDays.has(a + '\t' + b);
      res.push({ words: [path, a, b], story, score: (ab && ba ? 2 : 1) + back + (story ? 0.5 : 0) - (i + j) * 0.05 });
    }
    return res.sort((x, y) => y.score - x.score).slice(0, 6);
  }
  // Three words as they'd sit together: the describing words take the gender of the first noun.
  sparkLabels(words) { const n = words.map(p => this.wordInfo(p)).find(w => w.g); return words.map(p => this.agreeLabel(p, n ? n.g : '')); }
  // A story day where at least two of the three words met.
  sparkDay(words) {
    const sd = this.storyDays || new Map();
    for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) { const d = sd.get(words[i] + '\t' + words[j]); if (d && d.length) return d[0]; }
    return 0;
  }
  lightSpark(leaf, words) {
    const v = leaf.view; if (!v || v.getViewType() !== 'localgraph') return;
    try {
      const st = v.getState(), opts = { ...LOCAL_OPTIONS, ...(st.options || {}) };
      const base = TYPE_COLORS.map(([q, rgb]) => ({ query: q, color: { a: 1, rgb } }));
      opts.colorGroups = words ? [{ query: words.map(w => `path:"${w}"`).join(' OR '), color: { a: 1, rgb: 0xf2b705 } }, ...base] : base;
      v.setState({ ...st, options: opts }, { history: false });
    } catch (e) { /* the graph still works without the glow */ }
  }
  async paintSpark(leaf, path) {
    const st = this.graphState(leaf); if (!st.spark) return;
    const box = st.spark; box.empty(); box.hide();
    if (st.sparkT) clearTimeout(st.sparkT);
    const list = await this.sparks(path).catch(() => []);
    if (st.hist[st.pos] !== path) return;
    if (st.lit) { this.lightSpark(leaf, null); st.lit = false; }
    if (!list.length) return;
    let i = 0;
    const draw = () => {
      box.empty(); box.show();
      const sp = list[i], names = this.sparkLabels(sp.words);
      box.createSpan({ cls: 'gq-spark-t', text: (sp.story ? 'Story spark: ' : 'Spark: ') + names.join(' · ') });
      const hb = box.createEl('button', { text: 'Hear', cls: 'gq-mini' }); hb.onclick = () => say(names.join(', '));
      const mk = box.createEl('button', { text: 'One sentence', cls: 'gq-mini' }); mk.onclick = () => new SparkModal(this.app, this, sp.words).open();
      if (list.length > 1) { const nx = box.createEl('button', { text: 'Another', cls: 'gq-mini' }); nx.onclick = () => { i = (i + 1) % list.length; draw(); this.lightSpark(leaf, list[i].words); st.lit = true; }; }
    };
    draw();
    // Let the words settle first, then light up the three so the triangle pops out of the graph.
    st.sparkT = setTimeout(() => { if (st.hist[st.pos] === path) { this.lightSpark(leaf, list[i].words); st.lit = true; } }, 1400);
  }
  async savePair(gr, en, words, own) {
    const ad = this.app.vault.adapter, day = ymd(new Date());
    let txt = ''; try { txt = await ad.read(PAIRS_NOTE); } catch (e) { txt = '# My pairs\n\nSentences you built with the Pair it tool. Your own sentences count double on the Today page. Send them with Send homework while this note is open.\n'; }
    if (!txt.includes('\n## ' + day)) txt = txt.replace(/\s*$/, '\n\n## ' + day + '\n');
    if (!(await ad.exists(MY_WORK.slice(0, -1)))) await ad.mkdir(MY_WORK.slice(0, -1));
    const links = [...new Set(words)].map(w => `[[${w}]]`).join(' ');
    await ad.write(PAIRS_NOTE, txt.replace(/\s*$/, '\n') + `- ${own ? 'Own: ' : ''}${gr.replace(/\n+/g, ' ')}${en ? ' (' + en + ')' : ''} · ${links}\n`);
    const n = await this.pairCount();
    new Notice(`Saved. ${n.points} pair point${n.points === 1 ? '' : 's'} this week.`);
    this.refreshToday();
    this.refreshCards();
  }
  async pairCount() {
    let txt = ''; try { txt = await this.app.vault.adapter.read(PAIRS_NOTE); } catch (e) { return { n: 0, own: 0, points: 0, words: 0 }; }
    const cut = ymd(new Date(Date.now() - 6 * 864e5)); let n = 0, own = 0; const words = new Set();
    for (const sec of txt.split(/\n(?=## )/)) {
      const m = sec.match(/^## (\d{4}-\d{2}-\d{2})/); if (!m || m[1] < cut) continue;
      for (const line of sec.split('\n')) { if (!line.startsWith('- ')) continue; n++; if (line.startsWith('- Own: ')) own++; for (const x of line.matchAll(/\[\[([^\]|#]+)/g)) words.add(x[1]); }
    }
    return { n, own, points: n + own, words: words.size };
  }
  // ---------- Word graph: Obsidian's own local graph (native motion), dressed with the Word web's controls ----------
  wordPath(p) { if (p && p.startsWith('Words/')) return p; const f = this.app.vault.getAbstractFileByPath('Words/θέλω.md'); return f ? f.path : this.app.vault.getMarkdownFiles().find(f => f.path.startsWith('Words/')).path; }
  async openGraph(path) {
    const ws = this.app.workspace;
    const a = ws.getActiveFile();
    const file = this.wordPath(path || (a ? a.path : ''));
    let leaf = ws.getLeavesOfType('localgraph').find(l => l.getRoot() === ws.rootSplit);
    if (!leaf) leaf = this.mainLeaf(true);
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
    this.setGraphLabels(leaf, path);
    this.paintAgree(leaf, path);
    this.paintSpark(leaf, path);
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
      this.applyGraphLabels(leaf);
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
      const pairb = bar.createEl('button', { text: 'Build a sentence', attr: { 'aria-label': 'Build a sentence with this word' } });
      pairb.onclick = () => { const f = this.app.vault.getAbstractFileByPath(st.hist[st.pos]); if (f) this.openPair(f.basename); };
      const askb = bar.createEl('button', { text: 'Ask', attr: { 'aria-label': 'Ask the group about this word' } });
      askb.onclick = () => { const f = this.app.vault.getAbstractFileByPath(st.hist[st.pos]); if (f) this.ask(f); };
      st.trail = wrap.createDiv('gq-web-trail'); st.agree = wrap.createDiv('gq-agree'); st.agree.hide(); st.spark = wrap.createDiv('gq-spark'); st.spark.hide(); st.bar = wrap;
      const key = wrap.createDiv('gq-web-key');
      for (const [cls, t] of [['v', 'verbs (doing)'], ['n', 'nouns (things, people)'], ['a', 'describing words'], ['d', 'how, when, where'], ['o', 'little words']]) { const s = key.createSpan('gq-key'); s.createSpan('gq-kdot gq-k' + cls); s.appendText(t); }
      st.back.onclick = () => this.graphStep(leaf, -1); st.fwd.onclick = () => this.graphStep(leaf, 1);
      open.onclick = () => { const f = this.app.vault.getAbstractFileByPath(st.hist[st.pos]); if (f) this.app.workspace.getLeaf('tab').openFile(f); };
      say.onclick = () => { const f = this.app.vault.getAbstractFileByPath(st.hist[st.pos]); if (f) say(f.basename); };
      box.tabIndex = 0;
      this.registerDomEvent(box, 'keydown', e => { if (e.target.closest && e.target.closest('input')) return; if (e.key === 'ArrowLeft' || e.key === 'Backspace') { this.graphStep(leaf, -1); e.preventDefault(); } if (e.key === 'ArrowRight') { this.graphStep(leaf, 1); e.preventDefault(); } });
      this.registerDomEvent(box, 'mouseup', e => { if (e.button === 3) this.graphStep(leaf, -1); if (e.button === 4) this.graphStep(leaf, 1); });
    }
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
        const w = { path: f.path, word: f.basename, english: String(fm.english || ''), pron: fm.pronunciation || '', rank: +fm.rank, lessons: fm.lessons || [], kid: fm.kid_lessons || [], forms: [], cognates: String(fm.cognates || '') };
        // Verb forms from the conjugation table (bold cells), so "θέλουμε" finds θέλω.
        try { const txt = await this.app.vault.cachedRead(f); const m = txt.split('## Conjugation')[1]; if (m) for (const b of m.split('\n## ')[0].matchAll(/\*\*([^*]+)\*\*/g)) b[1].split(/\s+/).forEach(x => { if (isGreek(x) && x !== 'θα') w.forms.push(x); }); } catch (e) {}
        w.k = fold(w.word); w.e = fold(w.english.replace(/[()"]/g, ' ')); w.c = w.cognates.toLowerCase().split(/,\s*/).map(x => x.replace(/-$/, '')).filter(Boolean); w.fk = [...new Set(w.forms.map(fold))];
        out.push(w);
      }
      out.sort((a, b) => a.rank - b.rank);
      this.words = out; this.indexing = null; return out;
    })();
    return this.indexing;
  }
  findWords(q) {
    if (!this.words) return [];
    const k = fold(q), res = [], reds = new Set(this.colors().red);
    for (let w of this.words) {
      let score = 0, form = '';
      if (isGreek(q)) {
        if (w.k === k) score = 100; else if (w.fk.includes(k)) { score = 90; form = w.forms.find(x => fold(x) === k); } else if (k.length >= 2 && w.k.startsWith(k)) score = 50; else if (k.length >= 3 && w.fk.some(x => x.startsWith(k))) score = 30;
      } else {
        const words = w.e.split(/[^a-z']+/).filter(Boolean);
        const bare = w.e.replace(/^(i|to|the|a|an) /, '');
        if (w.e === k || bare === k) score = 100; else if (words.includes(k)) score = 80; else if (k.length >= 3 && words.some(x => x.startsWith(k))) score = 40; else if (k.includes(' ') && w.e.includes(k)) score = 60;
        if (score < 70 && w.c.some(c => c === k || (k.length >= 4 && c.startsWith(k)))) { score = 70; form = ''; w = { ...w, via: w.c.find(c => c === k || c.startsWith(k)) }; }
      }
      if (score && reds.has(w.word)) score += 5;   // red words (don't have it yet) come up first
      if (score) res.push({ ...w, score: score - w.rank / 10000, form });
    }
    return res.sort((a, b) => b.score - a.score).slice(0, 8);
  }
  async translate(q) {
    // Free, no account or key. Google's web translator first, MyMemory if that fails. Works on Android, iPhone and computers.
    this.trCache = this.trCache || new Map();
    if (this.trCache.has(q)) return this.trCache.get(q);
    const fromGreek = isGreek(q), sl = fromGreek ? 'el' : 'en', tl = fromGreek ? 'en' : 'el';
    let out = null;
    try {
      const r = await requestUrl({ url: `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&dt=bd&dt=rm&q=${encodeURIComponent(q)}`, throw: false });
      const d = r.status === 200 ? r.json : null;
      if (d && d[0]) {
        const text = d[0].filter(x => x && x[0]).map(x => x[0]).join('').trim();
        const rm = d[0].find(x => x && (x[2] || x[3])) || [];
        const alts = (d[1] || []).map(x => ({ pos: x[0], terms: x[1] || [] })).filter(a => a.terms.length);
        if (text) out = { q, text, fromGreek, greek: fromGreek ? q : text, say: (fromGreek ? rm[3] : rm[2]) || '', alts };
      }
    } catch (e) {}
    if (!out) {
      try {
        const r = await requestUrl({ url: `https://api.mymemory.translated.net/get?langpair=${sl}|${tl}&q=${encodeURIComponent(q)}`, throw: false });
        const text = r.status === 200 && r.json && r.json.responseData && r.json.responseData.translatedText;
        if (text) out = { q, text: String(text).trim(), fromGreek, greek: fromGreek ? q : String(text).trim(), say: '', alts: [] };
      } catch (e) {}
    }
    if (out) this.trCache.set(q, out);
    return out;
  }
  bonusLine(q, tr) {
    if (!tr) return `- ${q} → bonus word: `;
    const say = tr.say ? ` · say it: ${tr.say}` : '';
    return tr.fromGreek ? `- ${q} → bonus word: ${q} · ${tr.text}${say}` : `- ${q} → bonus word: ${tr.text}${say}`;
  }
  async logLookup(q, w, tr) {
    // Every look-up is saved in My Work, so it can come back as review (and the teacher can see what students reach for).
    const ad = this.app.vault.adapter, day = window.moment ? window.moment().format('YYYY-MM-DD') : new Date().toISOString().slice(0, 10);
    let txt = ''; try { txt = await ad.read(LOOKUPS); } catch (e) { txt = '# Words I looked up\n\nEvery word you look up lands here, with the Greek. Words from the 1,500 link to their notes. Bonus words are yours to keep.\n'; }
    if (!txt.includes('\n## ' + day)) txt = txt.replace(/\s*$/, '\n\n## ' + day + '\n');
    const line = w ? `- ${q} → [[${w.word}]] (${w.english}, #${w.rank})` : this.bonusLine(q, tr);
    const today = txt.slice(txt.lastIndexOf('\n## ')).split('\n');
    if (today.some(l => l.trim() === line.trim())) return;
    // A bonus word saved earlier today without its Greek gets the Greek added, not a second line.
    const blank = `- ${q} → bonus word:`;
    if (tr && today.some(l => l.trim() === blank)) {
      const at = txt.lastIndexOf('\n## '), head = txt.slice(0, at), tail = txt.slice(at).split('\n').map(l => l.trim() === blank ? line : l).join('\n');
      await ad.write(LOOKUPS, head + tail); return;
    }
    if (!w && !tr && today.some(l => l.startsWith(`- ${q} → bonus word: `) && l.trim() !== blank)) return;
    if (!(await ad.exists(MY_WORK.slice(0, -1)))) await ad.mkdir(MY_WORK.slice(0, -1));
    await ad.write(LOOKUPS, txt.replace(/\s*$/, '\n') + line + '\n');
  }
  async fillBlankLookups() {
    // Older look-ups saved only the English. Add the Greek to those lines; nothing else in the note changes.
    const f = this.app.vault.getAbstractFileByPath(LOOKUPS); if (!f || !f.extension) return;
    const txt = await this.app.vault.read(f);
    const todo = [...new Set(txt.split('\n').map(l => l.match(/^- (.+?) → bonus word:\s*$/)).filter(Boolean).map(m => m[1].trim()))].slice(0, 40);
    if (!todo.length) return;
    const found = new Map();
    for (const q of todo) { const tr = await this.translate(q); if (tr) found.set(q, tr); }
    if (!found.size) return;
    await this.app.vault.process(f, cur => cur.split('\n').map(l => {
      const m = l.match(/^- (.+?) → bonus word:\s*$/); const tr = m && found.get(m[1].trim());
      return tr ? this.bonusLine(m[1].trim(), tr) : l;
    }).join('\n'));
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
        if (!all.length) { list.createDiv({ cls: 'gq-hint', text: 'No video questions yet. Be the first: open a word, tap Ask, then Ask on video instead.' }); return; }
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
    if (!f || f.extension !== 'md' || f.path === TODAY) { new Notice('Open a word or lesson note first, then tap Ask.'); return; }
    if (f.path.startsWith(MY_WORK)) { new Notice('My Work notes are private, so they cannot be linked. Open a word or lesson note instead.'); return; }
    new AskModal(this.app, this, f).open();
  }
  askHeader(f) {
    const fm = (this.app.metadataCache.getFileCache(f) || {}).frontmatter || {};
    const les = Array.isArray(fm.lessons) && fm.lessons.length ? `, first seen in Lesson ${fm.lessons[0]}` : '';
    return fm.english ? `Question about ${f.basename} (${fm.english}${les}):` : `Question about "${f.basename}":`;
  }
  noteUrl(f) { return (this.edition === 'beginner' ? NOTE_URL.replace(/vault\/$/, 'beginner/vault/') : NOTE_URL) + f.path.split('/').map(encodeURIComponent).join('/'); }
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
  // Fallback for devices where the key box is awkward: a note "My Work/Teacher key.md" holding the key is moved into settings and deleted.
  async importKeyNote() {
    const ad = this.app.vault.adapter, p = MY_WORK + 'Teacher key.md';
    try {
      if (!(await ad.exists(p))) return;
      const m = (await ad.read(p)).match(/(github_pat_[A-Za-z0-9_]{20,}|gh[pousr]_[A-Za-z0-9]{20,})/);
      if (!m) { new Notice('My Work/Teacher key has no GitHub key in it yet. Paste the key into that note, then try again.', 10000); return; }
      const d = (await this.loadData()) || {}; d.teacherKey = m[1]; await this.saveData(d);
      const f = this.app.vault.getAbstractFileByPath(p); if (f) await this.app.vault.delete(f, true); else await ad.remove(p);
      new Notice('Teacher update key saved. The Teacher key note was deleted.', 8000);
    } catch (e) {}
  }
  async teacherKey() { try { const d = await this.loadData(); return (d && d.teacherKey) || ''; } catch (e) { return ''; } }
  async channel() {
    const ad = this.app.vault.adapter;
    const BASE = (await ad.exists(KIDS_MARK)) ? KIDS_BASE : this.edition === 'beginner' ? UPDATE_BASE + 'beginner/' : UPDATE_BASE;
    if (!(await ad.exists(TEACHER_MARK))) return { teacher: false, man: () => ({ url: BASE + 'manifest.json?t=' + Date.now() }), file: (p, sha) => ({ url: BASE + 'vault/' + p.split('/').map(encodeURIComponent).join('/') + '?v=' + sha.slice(0, 12) }) };
    await this.importKeyNote();
    const key = await this.teacherKey(); if (!key) return { teacher: true, missing: true };
    const headers = { Authorization: 'Bearer ' + key, Accept: 'application/vnd.github.raw', 'X-GitHub-Api-Version': '2022-11-28' };
    return { teacher: true, man: () => ({ url: TEACHER_API + 'manifest.json?ref=main&t=' + Date.now(), headers }), file: p => ({ url: TEACHER_API + 'vault/' + p.split('/').map(encodeURIComponent).join('/') + '?ref=main', headers }) };
  }
  keyModal() {
    const plugin = this, m = new Modal(this.app);
    m.titleEl.setText('Teacher update key');
    const c = m.contentEl;
    c.createEl('p', { text: 'Your teacher vault updates from a private GitHub repo. Paste a read-only GitHub key here once. It stays on this device and is never part of an update or a zip.' });
    const ol = c.createEl('ol');
    const li1 = ol.createEl('li'); li1.appendText('Open '); const a = li1.createEl('a', { text: 'this GitHub page', href: TOKEN_URL }); a.onclick = e => { e.preventDefault(); window.open(TOKEN_URL); }; li1.appendText(' (it is filled in for you).');
    ol.createEl('li', { text: 'Under Repository access choose Only select repositories, then greekquent-teacher-vault.' });
    ol.createEl('li', { text: 'Check that Contents says Read-only, then tap Generate token and copy it.' });
    ol.createEl('li', { text: 'Come back here (if this window closed, tap More, Teacher update key again). Tap Paste key, or paste into the box, then tap Save. Do this once on each device.' });
    const inp = c.createEl('input', { type: 'text', attr: { placeholder: 'github_pat_...', autocomplete: 'off', autocorrect: 'off', autocapitalize: 'off', spellcheck: 'false', style: 'width:100%;margin:8px 0;font-family:var(--font-monospace)' } });
    const row = c.createDiv({ attr: { style: 'display:flex;gap:8px;flex-wrap:wrap' } });
    const paste = row.createEl('button', { text: 'Paste key' });
    paste.onclick = async () => { try { const t = (await navigator.clipboard.readText()).trim(); if (!t) { new Notice('The clipboard is empty. Copy the key on GitHub first.'); return; } inp.value = t; } catch (e) { new Notice('Could not read the clipboard. Long-press the box and choose Paste instead.'); } };
    const save = row.createEl('button', { text: 'Save', cls: 'mod-cta' });
    const clear = row.createEl('button', { text: 'Remove key' });
    save.onclick = async () => { const v = inp.value.trim(); if (!v) { new Notice('Paste the key first.'); return; } const d = (await this.loadData()) || {}; d.teacherKey = v; await this.saveData(d); m.close(); new Notice('Key saved. Checking for a teacher update...'); this.updateVault(false); };
    c.createEl('p', { text: 'Other way: make a note in My Work named Teacher key, paste the key into it, then tap More, Update vault. The key is saved and that note is deleted.', attr: { style: 'font-size:var(--font-ui-small);color:var(--text-muted)' } });
    this.teacherKey().then(k => { if (k) c.createEl('p', { text: 'A key is saved on this device (ends in ' + k.slice(-4) + ').', attr: { style: 'font-size:var(--font-ui-small)' } }); });
    clear.onclick = async () => { const d = (await this.loadData()) || {}; delete d.teacherKey; await this.saveData(d); m.close(); new Notice('Teacher update key removed from this device.'); };
    m.open(); setTimeout(() => inp.focus(), 50);
  }
  async updateVault(quiet) {
    if (this.updating) return; this.updating = true;
    const ad = this.app.vault.adapter;
    try {
      if (UPDATE_BASE.includes('OWNER/REPO')) { if (!quiet) new Notice('Updates are not set up yet.'); return; }
      const ch = await this.channel();
      if (ch.missing) { if (!quiet) { new Notice('This is the teacher copy. Add your teacher update key first.'); this.keyModal(); } return; }
      let man;
      try { man = (await requestUrl(ch.man())).json; }
      catch (e) {
        if (ch.teacher && e && (e.status === 401 || e.status === 403 || e.status === 404)) { if (!quiet) { new Notice('GitHub did not accept the teacher update key (it may have expired). Make a new one and paste it in.', 12000); this.keyModal(); } return; }
        if (!quiet) new Notice('Could not reach the update server. Check your internet connection and try again.'); return; }
      if (!man || !man.files) { if (!quiet) new Notice('The update server sent something unexpected. Try again later.'); return; }
      let mine = {}; try { mine = JSON.parse(await ad.read(INSTALLED)); } catch (e) {}
      if (mine.release === man.release) { if (!quiet) new Notice(`Already up to date (release ${man.release}).`); return; }
      if (quiet) { this.updateReady = man.release; this.refreshToday(); const n = new Notice(`A Greekquent update is ready. Tap here to install it in the background.`, 10000); n.noticeEl.onclick = () => { n.hide(); this.updateVault(false); }; return; }
      // Runs in the background: a short heads-up, then a small progress chip that never blocks taps.
      new Notice('Updating in the background. Keep working.', 4000);
      const note = this.chip('Updating...');
      const want = Object.entries(man.files).filter(([p]) => !KEEP_LOCAL(p));
      let changed = 0, removed = 0, config = false, stale = 0;
      for (let i = 0; i < want.length; i++) {
        const [p, meta] = want[i];
        let same = false;
        if (await ad.exists(p)) { try { same = (await this.sha(await ad.readBinary(p))) === meta.sha256; } catch (e) {} }
        if (same) continue;
        let r; try { r = await requestUrl(ch.file(p, meta.sha256)); } catch (e) { stale++; continue; }
        // GitHub can serve a cached old copy for a few minutes after a publish. Only write files that match the manifest.
        if ((await this.sha(r.arrayBuffer)) !== meta.sha256) { stale++; continue; }
        const dir = p.split('/').slice(0, -1).join('/');
        if (dir && !(await ad.exists(dir))) await ad.mkdir(dir);
        await ad.writeBinary(p, r.arrayBuffer); changed++; if (p.startsWith('.obsidian/plugins/')) config = true;
        note.setText(`Updating... ${Math.round((i + 1) / want.length * 100)}%`);
      }
      if (stale) {
        note.remove();
        new Notice(`Greekquent update: ${changed} file${changed === 1 ? '' : 's'} updated, ${stale} still on the way from GitHub. Tap Update vault again in about 5 minutes. Your My Work folder was not touched.`, 15000);
        return;
      }
      // Files the teacher removed since the last update (only files that came from an update, never My Work).
      const gone = [];
      for (const p of Object.keys(mine.files || {})) if (!man.files[p] && !KEEP_LOCAL(p) && await ad.exists(p)) { await ad.remove(p); removed++; gone.push(p); }
      await this.pruneEmpty(gone);
      await ad.write(INSTALLED, JSON.stringify({ release: man.release, files: man.files }));
      note.remove(); this.updateReady = null; this.refreshToday();
      const done = new Notice(`Greekquent updated. My Work was not touched.` + (config ? ' Close and reopen Obsidian to finish.' : '') + ' Tap to see what\'s new.', 8000);
      done.noticeEl.onclick = () => { done.hide(); this.openNote(WHATS_NEW); };
    } finally { this.updating = false; const c = document.querySelector('.gq-upd'); if (c) c.remove(); }
  }
  chip(t) { let c = document.querySelector('.gq-upd'); if (!c) c = document.body.createDiv({ cls: 'gq-upd', attr: { role: 'status', 'aria-live': 'polite' } }); c.setText(t); return c; }
  // ---------- One page at a time: links open in the same tab, Back and Forward move through them ----------
  oneTab() {
    const ws = this.app.workspace, orig = ws.getLeaf;
    if (!orig || ws.gqOrigGetLeaf) return;
    ws.gqOrigGetLeaf = orig;
    ws.getLeaf = (newLeaf, dir) => {
      if ((newLeaf === true || newLeaf === 'tab') && this.colors().tabs !== 'on') return orig.call(ws, false);
      return orig.call(ws, newLeaf, dir);
    };
    this.register(() => { if (ws.gqOrigGetLeaf) { ws.getLeaf = ws.gqOrigGetLeaf; delete ws.gqOrigGetLeaf; } });
    this.registerEvent(ws.on('layout-change', () => { clearTimeout(this.tabT); this.tabT = setTimeout(() => this.closeExtraTabs(), 400); }));
    this.closeExtraTabs();
  }
  // Tabs left over from before (or opened some other way) close. Notes save on their own, so nothing is lost.
  closeExtraTabs() {
    if (this.colors().tabs === 'on' || this.busy) return;
    const ws = this.app.workspace, leaves = [];
    ws.iterateRootLeaves(l => leaves.push(l));
    if (leaves.length < 2) return;
    const keep = (ws.getMostRecentLeaf && ws.getMostRecentLeaf(ws.rootSplit)) || leaves[0];
    for (const l of leaves) if (l !== keep && !(l.getViewState && l.getViewState().pinned)) l.detach();
  }
  async setTabs(on) {
    const f = await this.progressFile();
    await this.app.fileManager.processFrontMatter(f, fm => { if (on) fm.tabs = 'on'; else delete fm.tabs; });
    new Notice(on ? 'Tabs allowed. Long-press a link to open it in a new tab.' : 'One page at a time: links open in the same tab. Use Back and Forward.', 5000);
    if (!on) setTimeout(() => this.closeExtraTabs(), 300);
  }
  // Phone bar: Back, Forward and one button. Tap it to find a note; touch and hold for the rest.
  oneButton() {
    if (!document.body.classList.contains('is-mobile')) return;
    let tries = 0;
    const mount = () => {
      const back = document.querySelector('.mobile-navbar-action-back');
      if (!back || !back.parentElement) { if (++tries < 20) setTimeout(mount, 500); return; }
      if (back.parentElement.querySelector('.gq-navbtn')) return;
      const b = back.parentElement.createDiv({ cls: 'mobile-navbar-action gq-navbtn clickable-icon', attr: { 'aria-label': 'Find a note. Touch and hold for more.', role: 'button', tabindex: '0' } });
      try { require('obsidian').setIcon(b, 'search'); } catch (e) { b.setText('Find'); }
      let t = 0, held = false;
      const down = () => { held = false; clearTimeout(t); t = setTimeout(() => { held = true; if (navigator.vibrate) navigator.vibrate(15); this.navMenu(b); }, 450); };
      const up = e => { clearTimeout(t); if (held) { e.preventDefault(); return; } this.cmd('switcher:open'); };
      b.addEventListener('pointerdown', down);
      b.addEventListener('pointerup', up);
      b.addEventListener('pointercancel', () => clearTimeout(t));
      b.addEventListener('contextmenu', e => e.preventDefault());
      // Only hide Obsidian's buttons once ours is in place, so a renamed bar is left alone.
      document.body.classList.add('gq-onebar');
      this.register(() => { b.remove(); document.body.classList.remove('gq-onebar'); });
    };
    mount();
  }
  cmd(id) { try { this.app.commands.executeCommandById(id); } catch (e) {} }
  navMenu(anchor) {
    const m = new Menu();
    m.addItem(i => i.setTitle('Find a note').setIcon('search').onClick(() => this.cmd('switcher:open')));
    m.addItem(i => i.setTitle('Search inside notes').setIcon('text-search').onClick(() => this.cmd('global-search:open')));
    m.addItem(i => i.setTitle('Look up a word').setIcon('book-open').onClick(() => new LookupModal(this.app, this).open()));
    m.addItem(i => i.setTitle('Today').setIcon('house').onClick(() => this.openToday()));
    m.addItem(i => i.setTitle('Ask').setIcon('users').onClick(() => this.ask()));
    m.addSeparator();
    m.addItem(i => i.setTitle('More').setIcon('more-horizontal').onClick(() => this.moreMenu()));
    const r = anchor.getBoundingClientRect();
    m.showAtPosition({ x: r.left, y: r.top });
  }
  // ---------- More menu (left toolbar) ----------
  moreMenu(evt) {
    const m = new Menu();
    m.addItem(i => i.setTitle('More on this page').setIcon('panel-right').onClick(() => this.showMore()));
    m.addItem(i => i.setTitle('Word graph').setIcon('git-fork').onClick(() => this.openGraph()));
    m.addItem(i => i.setTitle('Send homework').setIcon('send').onClick(() => this.sendHomework()));
    m.addItem(i => i.setTitle('Ask on video').setIcon('video').onClick(() => this.askVideo()));
    m.addSeparator();
    m.addItem(i => i.setTitle('Share feedback').setIcon('message-square').onClick(() => this.feedback()));
    m.addItem(i => i.setTitle("What's new").setIcon('sparkles').onClick(() => this.openNote(WHATS_NEW)));
    m.addItem(i => i.setTitle('Setting up').setIcon('help-circle').onClick(() => this.openNote(SETUP)));
    m.addItem(i => i.setTitle('Update vault').setIcon('refresh-cw').onClick(() => this.updateVault(false)));
    m.addItem(i => i.setTitle(this.colors().tabs === 'on' ? 'Tabs: turn off' : 'Allow tabs').setIcon('copy').onClick(() => this.setTabs(this.colors().tabs !== 'on')));
    if (this.isTeacher) m.addItem(i => i.setTitle('Teacher update key').setIcon('key').onClick(() => this.keyModal()));
    if (evt && evt.clientX !== undefined) m.showAtMouseEvent(evt); else m.showAtPosition({ x: 60, y: 200 });
  }
  async openNote(path) {
    let f = this.app.vault.getAbstractFileByPath(path);
    if (!f) { const name = path.split('/').pop().replace(/\.md$/, ''); f = this.app.vault.getMarkdownFiles().find(x => x.basename === name); if (f) path = f.path; }
    if (!f) { new Notice(`${path.replace(/\.md$/, '')} is not in this vault yet. Tap Update vault.`); return; }
    const ws = this.app.workspace;
    let leaf = ws.getLeavesOfType('markdown').find(l => l.view.file && l.view.file.path === path);
    if (!leaf) { const a = ws.getMostRecentLeaf && ws.getMostRecentLeaf(ws.rootSplit); leaf = a && a.view && a.view.getViewType() === 'empty' ? a : this.mainLeaf(true); await leaf.openFile(f, { state: { mode: 'preview' } }); }
    ws.setActiveLeaf(leaf, { focus: true }); ws.revealLeaf(leaf);
    return leaf;
  }
  async openToday(startup) {
    if (!this.app.vault.getAbstractFileByPath(TODAY)) { if (!startup) new Notice('Today is not in this vault yet. Tap More, then Update vault.'); return; }
    await this.openNote(TODAY); this.refreshToday();
  }
  // ---------- Word colors: red = don't have it, yellow = kind of, green = have it, no color = new ----------
  colors() {
    const f = this.app.vault.getAbstractFileByPath(PROGRESS);
    const fm = f ? ((this.app.metadataCache.getFileCache(f) || {}).frontmatter || {}) : {};
    const list = k => Array.isArray(fm[k]) ? fm[k].map(String) : [];
    return { red: list('red'), yellow: list('yellow'), green: list('green'), setup_seen: !!fm.setup_seen, fiay: fm.fiay === true || fm.fiay === 'on', scripts: fm.scripts === 'intermediate' ? 'intermediate' : 'beginner', last_beat: Math.max(0, parseInt(fm.last_beat, 10) || 0), track: String(fm.track || ''), tabs: String(fm.tabs || '') };
  }
  colorOf(word) { const c = this.colors(); return COLORS.map(x => x[0]).find(k => c[k].includes(word)) || ''; }
  async progressFile() {
    let f = this.app.vault.getAbstractFileByPath(PROGRESS);
    if (f) return f;
    if (!this.app.vault.getAbstractFileByPath(MY_WORK.slice(0, -1))) await this.app.vault.createFolder(MY_WORK.slice(0, -1));
    return this.app.vault.create(PROGRESS, '---\nred: []\nyellow: []\ngreen: []\n---\n# My progress\n\nYour word colors live in this note. Change them with the color buttons on any word note: red = don\'t have it, yellow = kind of, green = have it. Tap a color again to clear it. The Today page counts them.\n');
  }
  async setColor(word, color) {
    const f = await this.progressFile();
    await this.app.fileManager.processFrontMatter(f, fm => {
      for (const [k] of COLORS) { fm[k] = (Array.isArray(fm[k]) ? fm[k] : []).map(String).filter(w => w !== word); }
      if (color) fm[color].push(word);
    });
    // The metadata cache catches up a moment later; repaint after it does.
    setTimeout(() => { this.paintBars(); this.refreshToday(); }, 300);
  }
  async setupSeen() { const f = await this.progressFile(); await this.app.fileManager.processFrontMatter(f, fm => { fm.setup_seen = true; }); setTimeout(() => this.refreshToday(), 300); }
  // ---------- My word cards: chunks and sentences added to word notes ----------
  cardLine(kind, gr, en) { const clean = t => t.replace(/\s+/g, ' ').replace(/\*\*/g, '').trim(); return `- ${kind === 'sentence' ? 'Sentence: ' : ''}**${clean(gr)}**${en ? ' — ' + clean(en) : ''}`; }
  async myCards(word) {
    let txt = ''; try { txt = await this.app.vault.adapter.read(CARDS); } catch (e) {}
    const out = [];
    for (const sec of txt.split(/\n(?=## )/)) {
      const m = sec.match(/^## (.+)/); if (!m || fold(m[1]) !== fold(word)) continue;
      for (const l of sec.split('\n').slice(1)) {
        const x = l.match(/^- (Sentence: )?(?:\*\*)?(.+?)(?:\*\*)?(?: — (.*))?$/); if (!x || !x[2].trim()) continue;
        out.push({ kind: x[1] ? 'sentence' : 'chunk', gr: x[2].replace(/\*\*/g, '').trim(), en: (x[3] || '').trim() });
      }
    }
    // Sentences built with Build a sentence (My pairs) show on every word they use.
    let pt = ''; try { pt = await this.app.vault.adapter.read(PAIRS_NOTE); } catch (e) {}
    const seen = new Set(out.map(o => fold(o.gr)));
    for (const l of pt.split('\n')) {
      const x = l.match(/^- (Own: )?(.+?)(?: \((.*)\))? · (.*\[\[.*)$/); if (!x) continue;
      const links = [...x[4].matchAll(/\[\[([^\]|#]+)/g)].map(m => fold(m[1]));
      if (!links.includes(fold(word)) || seen.has(fold(x[2]))) continue;
      seen.add(fold(x[2])); out.push({ kind: x[1] ? 'own' : 'built', gr: x[2].trim(), en: (x[3] || '').trim() });
    }
    return out;
  }
  async saveCard(word, kind, gr, en) {
    const line = this.cardLine(kind, gr, en);
    const ad = this.app.vault.adapter;
    let txt = ''; try { txt = await ad.read(CARDS); } catch (e) { txt = '# My word cards\n\nChunks and sentences you added to word notes. Each one shows on its word note under Chunks. You can fix or delete lines here.\n'; }
    const secs = txt.split(/\n(?=## )/); let done = false;
    for (let k = 0; k < secs.length; k++) {
      const m = secs[k].match(/^## (.+)/); if (!m || fold(m[1]) !== fold(word)) continue;
      if (!secs[k].split('\n').some(l => l.trim() === line)) secs[k] = secs[k].replace(/\s*$/, '\n') + line + '\n';
      done = true; break;
    }
    if (!done) secs.push(`## ${word}\n${line}\n`);
    if (!(await ad.exists(MY_WORK.slice(0, -1)))) await ad.mkdir(MY_WORK.slice(0, -1));
    await ad.write(CARDS, secs.map(x => x.replace(/\s*$/, '')).join('\n\n') + '\n');
    new Notice(`Added to ${word}. It is saved in My Work, so updates never erase it.`);
    this.refreshCards(word);
  }
  cardBox(el, ctx) {
    if (!ctx || !ctx.sourcePath || !ctx.sourcePath.startsWith('Words/')) return;
    const h = [...el.querySelectorAll('h2')].find(x => x.textContent.trim() === 'Chunks'); if (!h || el.querySelector('.gq-cards')) return;
    const word = ctx.sourcePath.slice(6).replace(/\.md$/, '');
    const box = createDiv('gq-cards'); h.after(box);
    const rec = { word, box }; this.cardBoxes.add(rec); this.paintCards(rec);
  }
  async paintCards(rec) {
    const box = rec.box, list = await this.myCards(rec.word); box.empty();
    if (list.length) {
      box.createEl('strong', { text: 'Yours' });
      const ul = box.createEl('ul');
      for (const it of list) {
        const li = ul.createEl('li');
        const tag = { sentence: 'Sentence: ', built: 'Built: ', own: 'Built (my own): ' }[it.kind]; if (tag) li.appendText(tag);
        li.createEl('strong', { text: it.gr }); if (it.en) li.appendText(' — ' + it.en);
        const hb = li.createEl('button', { text: 'Hear', cls: 'gq-mini', attr: { 'aria-label': 'Say it' } }); hb.onclick = () => say(it.gr);
      }
    }
    const row = box.createDiv('gq-btns');
    const add = row.createEl('button', { text: 'Add a chunk or sentence' }); add.onclick = () => new CardModal(this.app, this, rec.word).open();
    if (list.some(x => x.kind === 'chunk' || x.kind === 'sentence')) { const o = row.createEl('button', { text: 'Edit mine' }); o.onclick = () => this.openNote(CARDS); }
    if (list.some(x => x.kind === 'built' || x.kind === 'own')) { const o = row.createEl('button', { text: 'My pairs' }); o.onclick = () => this.openNote(PAIRS_NOTE); }
  }
  refreshCards(word) { for (const r of [...this.cardBoxes]) { if (!r.box.isConnected) { this.cardBoxes.delete(r); continue; } if (!word || r.word === word) this.paintCards(r); } }
  wordBar(el, ctx) {
    if (!ctx || !ctx.sourcePath || !ctx.sourcePath.startsWith('Words/')) return;
    const p = el.querySelector('p'); if (!p || !/say it:/.test(p.textContent) || el.querySelector('.gq-wordbar')) return;
    const word = ctx.sourcePath.slice(6).replace(/\.md$/, '');
    const bar = createDiv('gq-wordbar'); p.after(bar);
    const hear = bar.createEl('button', { text: 'Hear it', attr: { 'aria-label': 'Say the word' } }); hear.onclick = () => say(word);
    const mo = bar.createEl('button', { text: 'More ›', attr: { 'aria-label': 'More on this word: pairs, word graph, scripts' } }); mo.onclick = () => this.showMore();
    const grp = bar.createDiv({ cls: 'gq-colors', attr: { role: 'group', 'aria-label': 'How well do you know it?' } });
    const btns = COLORS.map(([k, label]) => { const b = grp.createEl('button', { text: label, cls: 'gq-c gq-' + k }); b.onclick = () => this.setColor(word, this.colorOf(word) === k ? '' : k); return [k, b]; });
    const rec = { word, btns, el: bar }; this.bars.add(rec); this.paintBar(rec);
  }
  paintBar(rec) { const c = this.colorOf(rec.word); for (const [k, b] of rec.btns) { b.toggleClass('is-on', c === k); b.setAttr('aria-pressed', String(c === k)); } }
  paintBars() { for (const r of [...this.bars]) { if (!r.el.isConnected) { this.bars.delete(r); continue; } this.paintBar(r); } }
  // ---------- Games send missed words back: obsidian://greekquent?game=Cousins&misses=χρόνος,σπίτι ----------
  async fromGame(p) {
    const words = String(p.misses || '').split(',').map(w => w.trim()).filter(Boolean).slice(0, 60);
    if (!words.length) { this.openToday(); return; }
    const ad = this.app.vault.adapter, day = ymd(new Date()), game = String(p.game || 'Game').replace(/[^\w ]/g, '').slice(0, 20) || 'Game';
    let txt = ''; try { txt = await ad.read(MISSES); } catch (e) { txt = '# Game misses\n\nWords you missed in the Greekquent games. They show up on the Today page for two weeks.\n'; }
    if (!txt.includes('\n## ' + day)) txt = txt.replace(/\s*$/, '\n\n## ' + day + '\n');
    if (!(await ad.exists(MY_WORK.slice(0, -1)))) await ad.mkdir(MY_WORK.slice(0, -1));
    await ad.write(MISSES, txt.replace(/\s*$/, '\n') + `- ${game}: ${words.join(', ')}\n`);
    new Notice(`Saved ${words.length} missed word${words.length === 1 ? '' : 's'} for review.`);
    this.openToday();
  }
  // ---------- Today page ----------
  refreshToday() { for (const el of [...this.todayEls]) { if (!el.isConnected) { this.todayEls.delete(el); continue; } this.renderToday(el); } }
  async recentWords(path, days) {
    // Words from dated "## YYYY-MM-DD" sections of a My Work note, newest first.
    let txt = ''; try { txt = await this.app.vault.adapter.read(path); } catch (e) { return []; }
    const cut = ymd(new Date(Date.now() - days * 864e5)), out = [];
    for (const sec of txt.split(/\n(?=## )/).reverse()) {
      const m = sec.match(/^## (\d{4}-\d{2}-\d{2})/); if (!m || m[1] < cut) continue;
      for (const line of sec.split('\n').slice(1)) {
        const links = [...line.matchAll(/\[\[([^\]|#]+)/g)].map(x => x[1].trim());
        if (links.length) links.forEach(w => out.push(w));
        else { const g = line.match(/^- [^:]+: (.+)$/); if (g) g[1].split(' · ')[0].split(',').forEach(w => out.push(w.trim())); }
      }
    }
    return out;
  }
  async weekNote(n) {
    for (const f of this.app.vault.getMarkdownFiles()) {
      if (!f.path.startsWith('Fluent in a Year/')) continue;
      const fm = (this.app.metadataCache.getFileCache(f) || {}).frontmatter || {};
      if (+fm.fiay_week === n) return { file: f, fm };
    }
    return null;
  }
  async weekDays(file) {
    const txt = await this.app.vault.cachedRead(file), days = {};
    let cur = null;
    for (const line of txt.split('\n')) {
      const h = line.match(/^> \[!todo\]-?\s*(Mon|Tue|Wed|Thu|Fri|Sat)\b(.*)$/); if (h) { cur = h[1]; const dn = h[2].match(/day (\d+)/); days[cur] = { label: (h[1] + h[2]).trim(), n: dn ? +dn[1] : 0, words: [] }; continue; }
      if (!line.startsWith('>')) { cur = null; continue; }
      const tl = cur && line.match(/^> \*\*Today's line:\*\*\s*(.+?)\s*\(([^()]*)\)\s*$/);
      if (tl) { days[cur].line = { gr: tl[1].trim(), en: tl[2].trim() }; continue; }
      const w = cur && line.match(/^> - \[\[([^\]|]+)(?:\|([^\]]+))?\]\] \*\*([^*]+)\*\*/);
      if (w) days[cur].words.push({ word: w[1].trim(), label: (w[2] || w[1]).trim(), en: w[3].trim() });
    }
    return days;
  }
  // Remove folders left empty by an update (never My Work, .obsidian, or the vault root).
  async pruneEmpty(paths) {
    const ad = this.app.vault.adapter, dirs = new Set();
    for (const p of paths) { let d = p.split('/').slice(0, -1).join('/'); while (d) { dirs.add(d); d = d.split('/').slice(0, -1).join('/'); } }
    for (const d of [...dirs].sort((a, b) => b.length - a.length)) {
      if (!d || d.startsWith('.') || d === MY_WORK.replace(/\/$/, '') || d.startsWith(MY_WORK)) continue;
      try { if (!(await ad.exists(d))) continue; const l = await ad.list(d); if (!l.files.length && !l.folders.length) await ad.rmdir(d, true); } catch (e) {}
    }
  }
  lessonPage(n) {
    const nn = String(n).padStart(2, '0'), fs = this.app.vault.getMarkdownFiles();
    const beg = fs.find(f => /^Scripts\/(Beginner|Student)\//.test(f.path) && f.basename.startsWith('L' + nn + ' '));
    if (!this.showSwitch() || this.colors().scripts !== 'intermediate') return beg;
    return fs.find(f => f.path.startsWith('Scripts/Intermediate/') && f.basename.startsWith('I' + nn + ' ')) || beg;
  }
  gameUrl(base, words) { return base + '#w=' + encodeURIComponent(words.join(',')); }
  wordList(parent, words) {
    const ul = parent.createEl('ul', { cls: 'gq-tlist' });
    for (const w of words) {
      const li = ul.createEl('li'); const c = this.colorOf(w.word);
      li.createSpan({ cls: 'gq-dot gq-' + (c || 'new') });
      const a = li.createEl('a', { text: w.label || w.word, cls: 'internal-link', href: '#' }); a.onclick = e => { e.preventDefault(); this.app.workspace.openLinkText(w.word, TODAY, false); };
      if (w.en) li.appendText('  ' + w.en);
    }
  }
  playRow(parent, words) {
    const row = parent.createDiv('gq-row'); const list = words.map(w => w.word);
    const b = row.createEl('button', { text: 'Play Buzzer with these' }); b.onclick = () => window.open(this.gameUrl(BUZZER_URL, list));
    const c = row.createEl('button', { text: 'Play Cousins with these' }); c.onclick = () => window.open(this.gameUrl(COUSINS_URL, list));
    const y = row.createEl('button', { text: 'Play Γιαγιά with these' }); y.onclick = () => this.openApp('giagia', '#w=' + encodeURIComponent(list.join(',')));
  }
  // ---------- Daily story: one line a day, same people all week ----------
  // Every word day (1 to 300) has one line. last_beat in My progress is the last line the student said.
  async beatIndex() {
    if (this.beats) return this.beats;
    const out = {};
    for (const f of this.app.vault.getMarkdownFiles()) {
      if (!f.path.startsWith('Fluent in a Year/')) continue;
      const fm = (this.app.metadataCache.getFileCache(f) || {}).frontmatter || {}; if (!+fm.fiay_week) continue;
      const days = await this.weekDays(f); const list = Object.values(days).filter(d => d.n && d.line).sort((a, b) => a.n - b.n);
      list.forEach((d, i) => { out[d.n] = { n: d.n, week: +fm.fiay_week, file: f, i: i + 1, of: list.length, gr: d.line.gr, en: d.line.en, words: d.words, label: d.label, lesson: +fm.lesson || 0 }; });
    }
    return this.beats = out;
  }
  // Highlight the day's words inside the line (matched on the start of the word, accents ignored).
  lineEl(parent, gr, words) {
    const stems = (words || []).map(w => fold((w.label || w.word).replace(/^(ο|η|το|οι|τα|τον|την)\s+/i, '').split(/[ ,]/)[0])).filter(x => x.length > 1).map(x => x.length > 4 ? x.slice(0, x.length - 2) : x);
    const el = parent.createDiv('gq-line'); el.setAttr('lang', 'el');
    for (const part of gr.split(/(\s+)/)) {
      const f = fold(part.replace(/[^\p{L}]/gu, ''));
      if (f && stems.some(st => f.startsWith(st))) el.createEl('strong', { text: part }); else el.appendText(part);
    }
    return el;
  }
  hearBtn(parent, text, label) { const b = parent.createEl('button', { text: label || 'Hear it', cls: 'gq-mini' }); b.onclick = () => say(text); return b; }
  async saidBeat(n) {
    const f = await this.progressFile();
    await this.app.fileManager.processFrontMatter(f, fm => { fm.last_beat = n; });
    setTimeout(() => this.refreshToday(), 300);
  }
  async storyCard(box, beats, cal, isSun, col) {
    const last = col.last_beat;
    // Behind = they said a line before, then missed days. New students start at today's line.
    const behind = last && last < cal - 1 ? cal - 1 - last : 0;
    const n = behind ? last + 1 : cal, b = beats[n]; if (!b) return;
    if (isSun && beats[cal]) {
      const card = box.createDiv('gq-tcard gq-story'), head = card.createDiv('gq-thead'), b = beats[cal];
      head.createEl('strong', { text: 'This week\'s story' });
      card.createDiv({ cls: 'gq-hint', text: 'Sunday: read the whole story aloud, top to bottom.' });
      const lines = Object.values(beats).filter(x => x.week === b.week).sort((a, c) => a.n - c.n);
      const ol = card.createEl('ol', { cls: 'gq-storylist' });
      for (const x of lines) { const li = ol.createEl('li'); this.lineEl(li, x.gr, x.words); li.createDiv({ cls: 'gq-hint', text: x.en }); }
      const row = card.createDiv('gq-row'); this.hearBtn(row, lines.map(x => x.gr).join(' '), 'Hear the whole story');
      this.popBtn(row, 'Read it line by line', () => this.popLines(`This week's story · week ${b.week}`, lines, 'Say each line with the voice.'));
      if (lines[0] && lines[0].n <= SCENE_DAYS) this.sceneRow(card, lines[0].n, true);
      if (!behind) return;
    }
    const card = box.createDiv('gq-tcard gq-story');
    const head = card.createDiv('gq-thead');
    head.createEl('strong', { text: behind ? 'Pick up where you left off' : 'Today\'s conversation' });
    head.createSpan({ cls: 'gq-hint', text: `  · week ${b.week}, day ${b.i} of ${b.of}` });
    if (behind) {
      const h = card.createDiv({ cls: 'gq-hint', text: `You are ${behind} day${behind === 1 ? '' : 's'} behind. No rush: one or two a day, or ` });
      const j = h.createEl('a', { text: 'jump to today', href: '#' }); j.onclick = e => { e.preventDefault(); this.saidBeat(cal - 1); }; h.appendText('.');
    }
    const T = await this.storyTurns();
    let turns = T[n]; if (!turns || !turns.length || turns.map(x => x[1]).join(' — ') !== b.gr) turns = [['', b.gr, b.en]];
    // Wrong-answer tiles come from the rest of this week's story, so they look like real choices.
    const pool = Object.values(beats).filter(x => x.week === b.week && x.n !== n).flatMap(x => (T[x.n] || [['', '', x.en]]).map(y => y[2]));
    const before = Object.values(beats).filter(x => x.week === b.week && x.n < n).sort((p, q) => p.n - q.n);
    this.todayBeat = { b, n, before, done: last >= n };
    this.convoGame(card, turns, n, b.words, last >= n, pool, () => { if (this.colors().last_beat < n) this.saidBeat(n); });
    return b;
  }
  // One sentence at a time: the Greek on top, the English built underneath from word tiles (tap or drag). Then the next sentence opens.
  convoGame(card, turns, n, words, done, pool, onDone) {
    const key = 'gq-convo-' + this.app.vault.getName() + '-' + n; let store = null; try { store = window.localStorage; } catch (e) {}
    let saved = null; try { saved = store && store.getItem(key); } catch (e) {} if (saved === undefined) saved = null;
    let i = saved === null ? (done ? turns.length : 0) : Math.min(+saved || 0, turns.length);
    const save = () => { try { if (store) store.setItem(key, String(i)); } catch (e) {} };
    const toks = s => String(s).replace(/[“”"«»]/g, '').split(/\s+/).map(w => w.replace(/^[^\p{L}\p{N}']+|[^\p{L}\p{N}']+$/gu, '')).filter(Boolean);
    const norm = w => w.toLowerCase().replace(/’/g, "'");
    let seed = n * 97 + 13; const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    const wrap = card.createDiv('gq-convo');
    const paint = () => {
      wrap.empty(); seed = n * 97 + 13 + i * 7;
      for (let k = 0; k < Math.min(i, turns.length); k++) {
        const x = turns[k], r = wrap.createDiv('gq-cv-done');
        if (x[0]) r.createSpan({ cls: 'gq-cbwho', text: x[0] + ': ' });
        r.createSpan({ text: x[1], attr: { lang: 'el' } }); r.createDiv({ cls: 'gq-hint', text: x[2] });
      }
      if (i >= turns.length) {
        const row = wrap.createDiv('gq-row');
        this.hearBtn(row, turns.map(x => x[1]).join(' '), 'Hear it all');
        row.createSpan({ cls: 'gq-hint', text: 'Done for today. Say it out loud once.' });
        const again = row.createEl('button', { text: 'Play again', cls: 'gq-mini' }); again.onclick = () => { i = 0; save(); paint(); };
        return;
      }
      const x = turns[i], cur = wrap.createDiv('gq-cv-now');
      cur.createDiv({ cls: 'gq-hint', text: (turns.length > 1 ? `Sentence ${i + 1} of ${turns.length}` : 'One sentence') + (x[0] ? ` · ${x[0]}` : '') });
      const gl = this.lineEl(cur, x[1], words); gl.addClass('gq-cv-gr');
      const hr = cur.createDiv('gq-row'); this.hearBtn(hr, x[1]);
      const target = toks(x[2]), want = new Set(target.map(norm));
      const extra = [...new Set(pool.flatMap(toks).filter(w => !want.has(norm(w)) && w.length > 1))];
      const nExtra = Math.min(extra.length, Math.max(3, Math.min(6, Math.ceil(target.length / 2))));
      const picks = []; while (picks.length < nExtra && extra.length) picks.push(extra.splice(Math.floor(rnd() * extra.length), 1)[0]);
      const tiles = [...target, ...picks].map((w, k) => ({ w, k })).sort(() => rnd() - 0.5);
      const ans = cur.createDiv({ cls: 'gq-cv-ans', attr: { 'aria-label': 'Your English' } });
      const bank = cur.createDiv({ cls: 'gq-cv-bank', attr: { 'aria-label': 'Word tiles' } });
      cur.createDiv({ cls: 'gq-hint gq-cv-help', text: 'Tap the English words in order (or drag them up). Tap a word again to take it back.' });
      const placed = [];
      const place = tl => { if (tl.used) return; tl.used = true; tl.btn.addClass('gq-used'); const c = ans.createEl('button', { text: tl.w, cls: 'gq-tile' }); tl.clone = c; placed.push(tl); bindDrag(c, () => unplace(tl), bank); ans.removeClass('gq-bad'); };
      const unplace = tl => { if (!tl.used) return; tl.used = false; tl.btn.removeClass('gq-used'); tl.clone.remove(); placed.splice(placed.indexOf(tl), 1); ans.removeClass('gq-bad'); };
      // Tap moves a tile; dragging it onto the other area does the same (pointer events work with touch and mouse).
      const bindDrag = (el, act, dest) => {
        let sx = 0, sy = 0, drag = false, id = null;
        el.onpointerdown = e => { sx = e.clientX; sy = e.clientY; drag = false; id = e.pointerId; try { el.setPointerCapture(id); } catch (er) {} };
        el.onpointermove = e => { if (id !== e.pointerId) return; const dx = e.clientX - sx, dy = e.clientY - sy; if (!drag && Math.hypot(dx, dy) > 8) { drag = true; el.addClass('gq-drag'); } if (drag) el.style.transform = `translate(${dx}px, ${dy}px)`; };
        el.onpointerup = e => {
          if (id !== e.pointerId) return; id = null;
          if (!drag) { act(); return; }
          el.removeClass('gq-drag'); el.style.transform = '';
          const r = dest.getBoundingClientRect();
          if (e.clientX >= r.left - 20 && e.clientX <= r.right + 20 && e.clientY >= r.top - 24 && e.clientY <= r.bottom + 24) act();
        };
        el.onpointercancel = () => { id = null; drag = false; el.removeClass('gq-drag'); el.style.transform = ''; };
      };
      for (const tl of tiles) { tl.btn = bank.createEl('button', { text: tl.w, cls: 'gq-tile' }); bindDrag(tl.btn, () => place(tl), ans); }
      const row = cur.createDiv('gq-row'); let misses = 0;
      const chk = row.createEl('button', { text: 'Check', cls: 'mod-cta' });
      const show = row.createEl('button', { text: 'Show me', cls: 'gq-mini' }); show.style.display = 'none';
      const en = cur.createDiv({ cls: 'gq-hint gq-cv-en', text: x[2] }); en.style.display = 'none';
      show.onclick = () => { en.style.display = ''; show.remove(); };
      chk.onclick = () => {
        const got = placed.map(tl => norm(tl.w)).join(' ');
        if (got === target.map(norm).join(' ')) {
          ans.addClass('gq-ok'); chk.disabled = true; say(x[1]);
          setTimeout(() => { i++; save(); paint(); if (i >= turns.length) onDone(); }, 900);
        } else { misses++; ans.removeClass('gq-bad'); void ans.offsetWidth; ans.addClass('gq-bad'); if (misses >= 2) show.style.display = ''; }
      };
    };
    paint();
  }
  // Fluent in a Year words, one at a time. Marking a color moves to the next word; the dots jump to any of them.
  wordStep(card, words, key) {
    if (!words.length) return;
    let i = this.wsIdx && this.wsIdx.key === key ? this.wsIdx.i : 0; if (i >= words.length) i = 0;
    const box = card.createDiv('gq-wstep');
    const go = k => { i = k; this.wsIdx = { key, i }; paint(); };
    const paint = () => {
      box.empty(); const w = words[i];
      const dots = box.createDiv({ cls: 'gq-wdots', attr: { role: 'tablist' } });
      words.forEach((x, k) => { const d = dots.createEl('button', { cls: 'gq-wdot gq-' + (this.colorOf(x.word) || 'new') + (k === i ? ' is-on' : ''), attr: { 'aria-label': `Word ${k + 1} of ${words.length}` } }); d.onclick = () => go(k); });
      box.createDiv({ cls: 'gq-hint', text: `Word ${i + 1} of ${words.length}` });
      const g = box.createDiv({ cls: 'gq-wbig', attr: { lang: 'el' } });
      const a = g.createEl('a', { text: w.label || w.word, cls: 'internal-link', href: '#' }); a.onclick = e => { e.preventDefault(); this.app.workspace.openLinkText(w.word, TODAY, false); };
      const en = box.createDiv({ cls: 'gq-hint gq-wen', text: w.en || '' }); en.style.visibility = 'hidden';
      const r = box.createDiv('gq-row'); this.hearBtn(r, w.label || w.word);
      const m = r.createEl('button', { text: 'Show meaning', cls: 'gq-mini' }); m.onclick = () => { en.style.visibility = ''; m.remove(); };
      const cr = box.createDiv({ cls: 'gq-colors gq-wcolors', attr: { role: 'group', 'aria-label': 'How well do you know it?' } });
      for (const [k, label] of COLORS) {
        const b = cr.createEl('button', { text: label, cls: 'gq-c gq-' + k + (this.colorOf(w.word) === k ? ' is-on' : '') });
        b.onclick = () => { this.wsIdx = { key, i: Math.min(i + 1, words.length - 1) }; if (this.colorOf(w.word) !== k) this.setColor(w.word, k); if (i + 1 < words.length) go(i + 1); else paint(); };
      }
      if (i === words.length - 1 && words.every(x => this.colorOf(x.word))) box.createDiv({ cls: 'gq-hint', text: 'All marked. Red ones come back in Review.' });
    };
    this.wsIdx = { key, i }; paint();
  }
  // This week in class: the lesson page and the opening rally, in one card.
  async classCard(box, wk, week) {
    const n = Number(wk && wk.fm.lesson) || 0, next = n || Number(((await this.weekNote(week + 1)) || { fm: {} }).fm.lesson) || 0;
    if (!next) return;
    const f = this.lessonPage(next);
    const c = box.createDiv('gq-tcard gq-class'), h = c.createDiv('gq-thead');
    h.createEl('strong', { text: n ? `This week in class · Lesson ${n}` : `No class this week · next is Lesson ${next}` });
    const r = c.createDiv('gq-row');
    if (f) { const lb = r.createEl('button', { text: 'Lesson page' }); lb.onclick = () => this.openNote(f.path); }
    const pairs = f ? this.rallyPairs(await this.app.vault.cachedRead(f)) : [];
    if (pairs.length) this.popBtn(r, `Practice the rally (${pairs.length})`, () => this.popRally(next, pairs));
    const cg = r.createEl('button', { text: 'Classroom Greek', cls: 'gq-mini' }); cg.onclick = () => this.openNote(EXTRAS + '11 Classroom Greek.md');
  }
  async setFiay(on) {
    const f = await this.progressFile();
    await this.app.fileManager.processFrontMatter(f, fm => { if (on) fm.fiay = true; else delete fm.fiay; });
    setTimeout(() => this.refreshToday(), 300);
  }
  // Watch the line as a short cartoon, or play it as a text adventure. Opens inside the vault, offline.
  sceneRow(card, n, week) {
    if (n > SCENE_DAYS) return;
    const r = card.createDiv('gq-row');
    const w = r.createEl('button', { text: week ? 'Watch the week' : 'Watch it', cls: 'gq-mini' }); w.onclick = () => this.openApp('story', '#d=' + n);
    const a = r.createEl('button', { text: 'Play it as a text adventure', cls: 'gq-mini' }); a.onclick = () => this.openApp('story', '#play&d=' + n);
  }
  // Comebacks: lines said 1, 3 and 7 lines ago return as a quick quiz. English first, then the Greek.
  // Who says what in each story line (lines.json, built with the Story Lines app). Missing or out of date: plain line.
  async storyTurns() { if (!this.turnsP) this.turnsP = this.app.vault.adapter.read(this.manifest.dir + '/lines.json').then(JSON.parse).catch(() => ({})); return this.turnsP; }
  // A comeback is one exchange: hear the lines before yours in Greek, then say the last one from its English.
  comebackTurns(b, T) {
    const t = (T || {})[b.n];
    if (!t || !t.length || t.map(x => x[1]).join(' — ') !== b.gr) return { ctx: [], who: '', gr: b.gr, en: b.en };
    const last = t[t.length - 1];
    return { ctx: t.slice(0, -1).map(x => ({ who: x[0], g: x[1], e: x[2] })), who: last[0], gr: last[1], en: last[2] };
  }
  cbPrompt(el, c, big) {
    for (const x of c.ctx) { const d = el.createDiv(big ? 'gq-cbctx gq-pop-ctx' : 'gq-cbctx'); d.createSpan({ cls: 'gq-cbwho', text: x.who + ': ' }); d.createSpan({ text: x.g, attr: { lang: 'el', title: x.e } }); }
    const y = el.createDiv(big ? 'gq-pop-big gq-pop-en' : 'gq-cbyou');
    if (c.who) y.createSpan({ cls: 'gq-cbwho', text: (c.ctx.length ? 'You, as ' + c.who : c.who) + ': ' });
    y.appendText(c.en);
  }
  async comebackCard(box, beats, col, cal) {
    const last = Math.min(col.last_beat, (cal || 1e9) - 1); if (last < 1) return;
    const due = [last, last - 2, last - 6].filter(k => k >= 1 && beats[k]).map(k => beats[k]);
    if (!due.length) return;
    const T = await this.storyTurns(), cbs = due.map(b => this.comebackTurns(b, T));
    const card = box.createDiv('gq-tcard gq-comeback');
    card.createDiv({ cls: 'gq-thead' }).createEl('strong', { text: 'Comebacks' });
    card.createDiv({ cls: 'gq-hint', text: cbs.some(c => c.ctx.length) ? 'Read or hear the line, then answer it in Greek. Tap to check.' : 'Say it in Greek first, then tap to check.' });
    const shown = cbs.slice(0, 1);   // one on the page; Quiz me runs them all
    for (const c of shown) {
      const r = card.createDiv('gq-cbrow'); this.cbPrompt(r, c, false);
      const g = r.createDiv({ cls: 'gq-line gq-cbgr', text: c.gr, attr: { lang: 'el' } }); g.style.display = 'none';
      const row = r.createDiv('gq-row');
      if (c.ctx.length) this.hearBtn(row, c.ctx.map(x => x.g).join(' '), 'Hear the line');
      const s = row.createEl('button', { text: 'Show my answer', cls: 'gq-mini' }); s.onclick = () => { g.style.display = ''; s.remove(); say(c.gr); };
      if (!c.ctx.length) { s.setText('Show Greek'); this.hearBtn(row, c.gr, 'Hear'); }
    }
    const qr = card.createDiv('gq-row'); this.popBtn(qr, cbs.length > 1 ? `Quiz me (${cbs.length})` : 'Quiz me', () => this.popComebacks(cbs));
  }
  async renderToday(el) {
    // Each render builds off-screen and swaps in at the end; only the newest render for a container wins.
    const tok = el.gqTok = (el.gqTok || 0) + 1;
    const kids = await this.kidsInfo(); if (kids) return this.renderKidsToday(el, tok, kids);
    {
      const words = await this.wordIndex(); const byWord = new Map(words.map(w => [w.word, w]));
      const col = this.colors(); this.todayPlay = []; this.reviewPlay = [];
      const box = createDiv('gq-today');
      const now = new Date(); now.setHours(0, 0, 0, 0);
      const start = new Date(COURSE_START[0], COURSE_START[1], COURSE_START[2]);
      const dd = Math.floor((now - start) / 864e5);
      const week = dd < 0 ? 1 : Math.floor(dd / 7) + 1, dow = now.getDay();
      box.createEl('h2', { text: `Today · ${now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}` });
      if (this.showSwitch()) this.scriptSwitch(box);
      if (!col.setup_seen) {
        const s = box.createDiv('gq-tcard gq-tnew'); s.createSpan({ text: 'New here? ' });
        const a = s.createEl('a', { text: 'Read Setting up', href: '#' }); a.onclick = e => { e.preventDefault(); this.setupSeen(); this.openNote(SETUP); };
        s.createSpan({ text: ' (2 minutes). ' }); const x = s.createEl('button', { text: 'Got it' }); x.onclick = () => this.setupSeen();
      }
      const wk = await this.weekNote(week);
      if (wk) {
        const days = await this.weekDays(wk.file);
        const beats = await this.beatIndex(), dayNow = days[DAYS[dd < 0 ? 1 : (dow || 6)]];
        const cal = dd < 0 ? 1 : (dayNow && dayNow.n) || Math.max(0, ...Object.keys(beats).map(Number).filter(k => beats[k].week < week));
        this.todayBeat = null;
        if (cal) await this.storyCard(box, beats, cal, dd >= 0 && dow === 0, col);
        // Comebacks open once today's conversation is done.
        if (!cal || col.last_beat >= cal) await this.comebackCard(box, beats, col, cal);
        await this.classCard(box, wk, week);
        // Fluent in a Year is optional: its words show here only for students who turn it on.
        if (col.fiay) {
          const card = box.createDiv('gq-tcard gq-fiay'), head = card.createDiv('gq-thead');
          const title = (wk.file.basename.replace(/^FY\d+\s*/, '') || '').replace(/ no class this week$/, '');
          head.createEl('strong', { text: `Fluent in a Year · week ${week}` }); head.createSpan({ cls: 'gq-hint', text: '  · ' + title + (dd < 0 ? ' · starts Monday, Oct 26' : '') });
          let list = [], label = '';
          if (dd >= 0 && dow === 0) { list = Object.values(days).flatMap(d => d.words); label = `Sunday review: this week's ${list.length} words`; }
          else { const d = days[DAYS[dd < 0 ? 1 : dow]]; if (d) { list = d.words; label = `Today's words · ${d.label}`; } }
          if (list.length) { card.createDiv({ cls: 'gq-tsub', text: label }); this.wordStep(card, list, ymd(now) + ':' + list.length); this.todayPlay = list; }
          else card.createDiv({ cls: 'gq-hint', text: 'No new words today.' });
          const r = card.createDiv('gq-row');
          const wl = r.createEl('button', { text: 'This week\'s page', cls: 'gq-mini' }); wl.onclick = () => this.openNote(wk.file.path);
          const off = r.createEl('a', { text: 'Hide on Today', href: '#', cls: 'gq-hint' }); off.onclick = e => { e.preventDefault(); this.setFiay(false); };
        }
      } else box.createDiv({ cls: 'gq-tcard gq-hint', text: 'The year is finished. Keep reviewing your red and yellow words below.' });
      // Review: red words, game misses and look-ups from the last two weeks, in the 1,500.
      const seen = new Set(), rev = [];
      const add = w => { const x = byWord.get(w); if (x && !seen.has(w) && !col.green.includes(w)) { seen.add(w); rev.push({ word: w, en: x.english }); } };
      (await this.recentWords(MISSES, 14)).forEach(add); col.red.forEach(add); (await this.recentWords(LOOKUPS, 14)).forEach(add);
      if (rev.length) {
        const rc = box.createDiv('gq-tcard');
        rc.createDiv({ cls: 'gq-thead' }).createEl('strong', { text: `Review (${rev.length})` });
        rc.createDiv({ cls: 'gq-hint', text: 'Words you marked red, missed in a game, or looked up.' });
        this.wordList(rc, rev.slice(0, 8));
        if (rev.length > 8) rc.createDiv({ cls: 'gq-hint', text: `${rev.length - 8} more in the side panel.` });
      }
      this.reviewPlay = rev.slice(0, 40); this.todayWeek = wk;
      const foot = box.createDiv('gq-hint gq-tfoot');
      const mo = foot.createEl('button', { text: 'More: story, games, colors, tools ›', cls: 'gq-mini' }); mo.onclick = () => this.showMore();
      if (!col.fiay && wk) { const fy = foot.createEl('button', { text: 'Doing Fluent in a Year? Show its words', cls: 'gq-mini' }); fy.onclick = () => this.setFiay(true); }
      if (this.updateReady && !this.updating) { const up = foot.createEl('button', { text: 'Install update', cls: 'gq-mini' }); up.onclick = () => this.updateVault(false); }
      // Slides are parked (deckify below) until they come back for specific moments, not all of Today.
      if (tok === el.gqTok) { el.empty(); el.appendChild(box); this.paintMore(); }
    }
  }
  // ---------- Kids' copy ----------
  async kidsInfo() {
    if (this.kidsP === undefined) this.kidsP = (async () => { const ad = this.app.vault.adapter; if (!(await ad.exists(KIDS_MARK))) return null; try { return JSON.parse(await ad.read(KIDS_MARK)) || {}; } catch (e) { return {}; } })();
    return this.kidsP;
  }
  kidFile(n) {
    const nn = 'K' + String(n).padStart(2, '0') + ' ';
    return this.app.vault.getMarkdownFiles().find(x => x.path.startsWith('Scripts/Kid/') && x.basename.startsWith(nn));
  }
  // One lesson a week, on the same weeks as class. Weeks with no class keep last week's game.
  kidWeek(info) {
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const dd = Math.floor((now - new Date(COURSE_START[0], COURSE_START[1], COURSE_START[2])) / 864e5);
    const week = dd < 0 ? 1 : Math.floor(dd / 7) + 1, sch = (info && info.schedule) || [];
    let lesson = 1, fresh = dd < 0 || !sch.length;
    for (const [w, l] of sch) { if (w <= week) { lesson = l; fresh = w === week; } }
    return { week, lesson, fresh, dow: dd < 0 ? 1 : now.getDay(), before: dd < 0 };
  }
  kidSection(txt, name) { const s = txt.split(/\n## /).find(x => x.startsWith(name)); return s ? s.slice(name.length) : ''; }
  kidLines(sec) { return [...sec.matchAll(/^- ([^:*]+):\s*\*\*(.+?)\*\*\s*(?:—\s*(.+))?$/gm)].map(m => ({ who: m[1].trim(), gr: m[2].trim(), en: (m[3] || '').trim() })); }
  async renderKidsToday(el, tok, info) {
    const box = createDiv('gq-today gq-kids-today'), col = this.colors(), wk = this.kidWeek(info);
    const f = this.kidFile(wk.lesson);
    const now = new Date();
    box.createEl('h2', { text: `Today · ${now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}` });
    if (!col.setup_seen) {
      const s = box.createDiv('gq-tcard gq-tnew'); s.createSpan({ text: 'Grown-ups: ' });
      const a = s.createEl('a', { text: 'read Setting up', href: '#' }); a.onclick = e => { e.preventDefault(); this.setupSeen(); this.openNote(SETUP); };
      s.createSpan({ text: ' first (2 minutes). ' }); const x = s.createEl('button', { text: 'Got it' }); x.onclick = () => this.setupSeen();
    }
    if (!f) { box.createDiv({ cls: 'gq-tcard', text: 'This lesson is not in the vault yet. Tap More, then Update vault.' }); if (tok === el.gqTok) { el.empty(); el.appendChild(box); } return; }
    const txt = await this.app.vault.cachedRead(f), title = f.basename.replace(/^K\d+\s*/, '').replace(/-student$/, '');
    // 1. The game
    const g = box.createDiv('gq-tcard gq-kid'), gh = g.createDiv('gq-thead');
    gh.createEl('strong', { text: `This week's game: ${title}` });
    gh.createSpan({ cls: 'gq-hint', text: `  · lesson ${wk.lesson}` + (wk.before ? ' · class starts Oct 26' : '') });
    const game = (txt.match(/\*\*The game:\*\*\s*(.+)/) || [])[1]; if (game) g.createDiv({ cls: 'gq-kidgame', text: game });
    if (!wk.fresh && !wk.before) g.createDiv({ cls: 'gq-hint', text: 'No class this week. Play last week\'s game again: it is easier the second time.' });
    const r1 = g.createDiv('gq-row'); const ob = r1.createEl('button', { text: 'Open the lesson', cls: 'mod-cta' }); ob.onclick = () => this.openNote(f.path);
    // 2. Say it: one more line each day of the week (Sunday shows them all)
    const lines = this.kidLines(this.kidSection(txt, 'Say it'));
    if (lines.length) {
      const c = box.createDiv('gq-tcard gq-kid'); c.createDiv({ cls: 'gq-thead' }).createEl('strong', { text: 'Say it together' });
      const k = wk.dow === 0 ? lines.length - 1 : (Math.max(1, wk.dow) - 1) % lines.length;
      c.createDiv({ cls: 'gq-hint', text: wk.dow === 0 ? 'Sunday: say the whole game, top to bottom.' : 'One new line today. Say the ones before it too.' });
      const ol = c.createEl('ol', { cls: 'gq-storylist' });
      lines.slice(0, k + 1).forEach((l, i) => { const li = ol.createEl('li', { cls: i === k ? 'gq-now' : '' }); li.createSpan({ cls: 'gq-hint', text: l.who + ': ' }); li.createSpan({ text: l.gr, attr: { lang: 'el' } }); if (l.en) li.createDiv({ cls: 'gq-hint', text: l.en }); });
      const r = c.createDiv('gq-row'); this.hearBtn(r, lines[k].gr); this.hearBtn(r, lines.slice(0, k + 1).map(l => l.gr).join(' '), 'Hear them all');
      this.popBtn(r, 'One line at a time', () => this.popLines('Say it together', lines.slice(0, k + 1)));
    }
    // 3. Swap: the kid is the teacher
    const sw = this.kidLines(this.kidSection(txt, 'You are the teacher'));
    if (sw.length) {
      const c = box.createDiv('gq-tcard gq-kid'); c.createDiv({ cls: 'gq-thead' }).createEl('strong', { text: 'Now you are the teacher' });
      c.createDiv({ cls: 'gq-hint', text: 'Swap. The kid asks the questions. The grown-up gets one wrong on purpose. Catch it.' });
      const ol = c.createEl('ol', { cls: 'gq-storylist gq-plain' });
      for (const l of sw) { const li = ol.createEl('li'); li.createSpan({ text: l.gr, attr: { lang: 'el' } }); if (l.en) li.createDiv({ cls: 'gq-hint', text: l.en }); }
    }
    // 4. This week's words, nouns first, with the colors
    const words = (await this.wordIndex()).filter(w => (w.kid || []).includes(wk.lesson));
    if (words.length) {
      const c = box.createDiv('gq-tcard gq-kid'); c.createDiv({ cls: 'gq-thead' }).createEl('strong', { text: `This week's words (${words.length})` });
      c.createDiv({ cls: 'gq-hint', text: 'Hear it, say it, then pick a color: red is not yet, yellow is kind of, green is got it.' });
      const ul = c.createEl('ul', { cls: 'gq-kidwords' });
      words.forEach((w, i) => {
        const li = ul.createEl('li'), top = li.createDiv('gq-kidword');
        const a = top.createEl('a', { text: w.word, cls: 'internal-link', href: '#', attr: { lang: 'el' } }); a.onclick = e => { e.preventDefault(); this.openNote(w.path); };
        top.createSpan({ cls: 'gq-hint', text: '  ' + w.english });
        const r = li.createDiv('gq-row'); this.hearBtn(r, w.word, 'Hear');
        const btns = COLORS.map(([k, label]) => { const b = r.createEl('button', { cls: 'gq-c gq-mini gq-' + k, text: { red: 'Not yet', yellow: 'Kind of', green: 'Got it' }[k], attr: { 'aria-label': label } }); return [k, b]; });
        let cur = this.colorOf(w.word);
        const paint = () => { for (const [k, b] of btns) b.toggleClass('is-on', cur === k); };
        for (const [k, b] of btns) b.onclick = () => { cur = cur === k ? '' : k; paint(); this.setColor(w.word, cur); };
        paint(); if (i >= 6) li.style.display = 'none';
      });
      if (words.length > 6) { const r = c.createDiv('gq-row'), m = r.createEl('button', { text: `Show all ${words.length}`, cls: 'gq-mini' }); m.onclick = () => { for (const li of ul.children) li.style.display = ''; r.remove(); }; }
    }
    // 5. Moves
    const mv = [...this.kidSection(txt, 'Do the moves').matchAll(/^- \*\*(.+?)\*\*:\s*(.+)$/gm)];
    if (mv.length) {
      const c = box.createDiv('gq-tcard gq-kid'); c.createDiv({ cls: 'gq-thead' }).createEl('strong', { text: 'Do the moves' });
      c.createDiv({ cls: 'gq-hint', text: 'Do the move every time you say it.' });
      const ul = c.createEl('ul', { cls: 'gq-storylist gq-plain' });
      if (mv.length > 8) c.createDiv({ cls: 'gq-hint', text: `The first 8 of ${mv.length}. The rest are on the lesson page.` });
      for (const m of mv.slice(0, 8)) { const li = ul.createEl('li'); li.createSpan({ text: m[1], attr: { lang: 'el' } }); li.createDiv({ cls: 'gq-hint', text: m[2] }); }
    }
    // Small buttons under the cards
    const tc = box.createDiv('gq-tcard gq-row gq-ttools');
    const tool = (t, fn, cls) => { const b = tc.createEl('button', { text: t, cls: cls || '' }); b.onclick = fn; };
    tool('Play Γιαγιά', () => this.openApp('giagia', '#k=' + wk.lesson), 'mod-cta');
    tool('All lessons', () => this.openNote('Lessons.md'));
    tool('Look up a word', () => new LookupModal(this.app, this).open());
    let rel = VAULT_RELEASE; try { rel = JSON.parse(await this.app.vault.adapter.read(INSTALLED)).release || rel; } catch (e) {}
    const foot = box.createDiv('gq-hint');
    const wn = foot.createEl('a', { text: "What's new", href: '#' }); wn.onclick = e => { e.preventDefault(); this.openNote(WHATS_NEW); };
    foot.appendText(` · vault ${rel} · `);
    if (this.updateReady && !this.updating) { const up = foot.createEl('a', { text: 'Install update', href: '#' }); up.onclick = e => { e.preventDefault(); this.updateVault(false); }; foot.appendText(' · '); }
    const gu = foot.createEl('a', { text: 'For grown-ups', href: '#' }); gu.onclick = e => { e.preventDefault(); this.openNote(SETUP); };
    // Slides parked here too: the kids Today is a plain list of cards.
    if (tok === el.gqTok) { el.empty(); el.appendChild(box); }
  }
  // ---------- Pop-out card: one big card in front of the page, for a few focused moments ----------
  // Used for today's line, comebacks, the Sunday read-through and the kid lines. Everything else stays in the list.
  // steps: [{ label, build(el, api) }]. api.next(), api.close(). Esc, arrows, swipe, tap outside to close.
  pop(title, steps, onClose) {
    if (!steps.length) return;
    const old = document.querySelector('.gq-pop'); if (old) old.remove();
    const ov = document.body.createDiv({ cls: 'gq-pop', attr: { role: 'dialog', 'aria-modal': 'true', 'aria-label': title } });
    const card = ov.createDiv('gq-pop-card');
    const top = card.createDiv('gq-pop-top'); top.createSpan({ cls: 'gq-pop-title', text: title });
    const x = top.createEl('button', { text: '×', cls: 'gq-pop-x', attr: { 'aria-label': 'Close' } });
    const body = card.createDiv('gq-pop-body');
    const nav = card.createDiv('gq-pop-nav');
    const prev = nav.createEl('button', { text: '‹', cls: 'gq-pop-arrow', attr: { 'aria-label': 'Back' } });
    const count = nav.createDiv('gq-pop-count');
    const next = nav.createEl('button', { text: '›', cls: 'gq-pop-arrow', attr: { 'aria-label': 'Next' } });
    let i = 0;
    const close = () => { document.removeEventListener('keydown', key, true); ov.addClass('gq-pop-out'); setTimeout(() => ov.remove(), 200); if (onClose) onClose(); };
    const api = { next: () => go(i + 1, 1), close };
    const go = (k, dir) => {
      if (k < 0 || k >= steps.length) return;
      i = k; body.empty(); body.removeClass('gq-pop-l', 'gq-pop-r'); void body.offsetWidth; body.addClass(dir < 0 ? 'gq-pop-l' : 'gq-pop-r');
      steps[i].build(body.createDiv('gq-pop-step'), api);
      count.setText(steps.length > 1 ? `${steps[i].label || ''}${steps[i].label ? ' · ' : ''}${i + 1} of ${steps.length}` : (steps[i].label || ''));
      prev.disabled = i === 0; next.disabled = i === steps.length - 1;
      nav.toggleClass('gq-pop-one', steps.length < 2);
    };
    const key = e => {
      if (e.key === 'Escape') { close(); e.preventDefault(); e.stopPropagation(); }
      else if (e.key === 'ArrowRight') { go(i + 1, 1); e.preventDefault(); } else if (e.key === 'ArrowLeft') { go(i - 1, -1); e.preventDefault(); }
    };
    document.addEventListener('keydown', key, true);
    prev.onclick = () => go(i - 1, -1); next.onclick = () => go(i + 1, 1); x.onclick = close;
    ov.addEventListener('click', e => { if (e.target === ov) close(); });
    let sx = 0, sy = 0;
    card.addEventListener('touchstart', e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
    card.addEventListener('touchend', e => { const t = e.changedTouches[0] || {}, dx = t.clientX - sx, dy = t.clientY - sy; if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.3) { e.stopPropagation(); go(i + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1); } });
    go(0, 1); setTimeout(() => x.focus(), 50);
    return api;
  }
  popBtn(row, text, fn) { const b = row.createEl('button', { text, cls: 'gq-mini gq-popbtn' }); b.onclick = fn; return b; }
  // Today's line: listen, say it from memory, then mark it said.
  popLine(b, n, done) {
    const big = (el, t) => this.lineEl(el.createDiv('gq-pop-big'), t, b.words);
    this.pop(`Today's line · week ${b.week}`, [
      { label: 'Listen', build: (el, api) => { el.createDiv({ cls: 'gq-hint', text: 'Hear it, then say it out loud with the voice.' }); big(el, b.gr); const r = el.createDiv('gq-row'); this.hearBtn(r, b.gr); say(b.gr); const nx = r.createEl('button', { text: 'Ready', cls: 'mod-cta' }); nx.onclick = api.next; } },
      { label: 'From memory', build: (el, api) => { el.createDiv({ cls: 'gq-hint', text: 'Say it in Greek without looking, then check.' }); el.createDiv({ cls: 'gq-pop-big gq-pop-en', text: b.en }); const g = el.createDiv('gq-pop-big gq-pop-hide'); this.lineEl(g, b.gr, b.words); const r = el.createDiv('gq-row'); const c = r.createEl('button', { text: 'Check', cls: 'mod-cta' }); c.onclick = () => { g.removeClass('gq-pop-hide'); say(b.gr); c.remove(); const nx = r.createEl('button', { text: 'Next', cls: 'mod-cta' }); nx.onclick = api.next; }; } },
      { label: 'Done', build: (el, api) => { big(el, b.gr); el.createDiv({ cls: 'gq-hint', text: b.en });
        const r = el.createDiv('gq-row');
        if (done) r.createSpan({ cls: 'gq-hint', text: 'Already marked as said.' }); else { const ok = r.createEl('button', { text: 'I said it', cls: 'mod-cta' }); ok.onclick = () => { this.saidBeat(n); api.close(); }; }
        if (n <= SCENE_DAYS) { const w = r.createEl('button', { text: 'Watch it' }); w.onclick = () => { api.close(); this.openApp('story', '#d=' + n); }; } } }
    ]);
  }
  // ---------- Immersion: Classroom Greek and the weekly rally ----------
  sayList(el, src) {
    const ul = el.createEl('ul', { cls: 'gq-say' });
    for (const row of src.split('\n').map(x => x.trim()).filter(Boolean)) {
      const [gr, en, gest] = row.split('|').map(x => (x || '').trim());
      const li = ul.createEl('li'); const top = li.createDiv('gq-say-top');
      this.hearBtn(top, gr.replace(/«…»|…/g, ' ').replace(/\s+/g, ' ').trim(), 'Hear');
      top.createEl('strong', { text: gr, attr: { lang: 'el' } }); if (en) top.createSpan({ cls: 'gq-say-en', text: en });
      if (gest) li.createDiv({ cls: 'gq-hint gq-say-g', text: gest });
    }
  }
  // Rally lines live under "## Rally" on the lesson page: "- Teacher: **…** — …" and "- You: **…** or **…** — …".
  rallyPairs(txt) {
    const lines = this.kidLines(this.kidSection(txt, 'Rally')), out = [];
    for (const l of lines) {
      const alts = l.gr.split(/\*\*\s*or\s*\*\*/).map(x => x.trim()).filter(Boolean);
      if (/^teacher/i.test(l.who)) out.push({ t: l.gr, ten: l.en, you: [], yen: '' });
      else if (out.length) { const p = out[out.length - 1]; p.you = alts; p.yen = l.en; }
    }
    return out.filter(p => p.you.length);
  }
  async rallyCard(sp, n) {
    const f = n && this.lessonPage(n); if (!f) return;
    const pairs = this.rallyPairs(await this.app.vault.cachedRead(f)); if (!pairs.length) return;
    const c = sp.createDiv('gq-tcard'), h = c.createDiv('gq-thead');
    h.createEl('strong', { text: `This week's rally · Lesson ${n}` });
    c.createDiv({ cls: 'gq-hint', text: `Class opens with ${pairs.length} questions in Greek. Hear each one, answer out loud, then check.` });
    const r = c.createDiv('gq-row'); this.popBtn(r, 'Practice my side', () => this.popRally(n, pairs));
    const cg = r.createEl('button', { text: 'Classroom Greek', cls: 'gq-mini' }); cg.onclick = () => this.openNote(EXTRAS + '11 Classroom Greek.md');
  }
  // The student's side: hear the teacher, answer from memory, check. Then swap and ask.
  popRally(n, pairs) {
    const steps = pairs.map((p, k) => ({ label: 'Teacher asks', build: (el, api) => {
      el.createDiv({ cls: 'gq-hint', text: 'Listen, then answer out loud in Greek.' });
      el.createDiv({ cls: 'gq-pop-big', text: p.t, attr: { lang: 'el' } }); say(p.t);
      const en = el.createDiv({ cls: 'gq-hint gq-pop-hide', text: p.ten });
      const ans = el.createDiv('gq-pop-hide gq-rally-ans');
      for (const y of p.you) { const a = ans.createDiv('gq-pop-big gq-pop-ans'); a.createSpan({ text: y, attr: { lang: 'el' } }); }
      if (p.yen) ans.createDiv({ cls: 'gq-hint', text: p.yen });
      const r = el.createDiv('gq-row'); this.hearBtn(r, p.t, 'Hear again');
      const m = r.createEl('button', { text: 'What does it mean?', cls: 'gq-mini' }); m.onclick = () => { en.removeClass('gq-pop-hide'); m.remove(); };
      const s = r.createEl('button', { text: 'Check my answer', cls: 'mod-cta' });
      s.onclick = () => { ans.removeClass('gq-pop-hide'); say(p.you[0]); s.remove(); if (p.you.length > 1) this.hearBtn(r, p.you.join(' '), 'Hear both'); const nx = r.createEl('button', { text: 'Next', cls: 'mod-cta' }); nx.onclick = api.next; };
    } }));
    steps.push({ label: 'Swap', build: (el, api) => {
      el.createDiv({ cls: 'gq-hint', text: 'Now you ask. Say each question out loud, as if to the teacher.' });
      const ol = el.createEl('ol', { cls: 'gq-storylist gq-pop-list' }); for (const p of pairs) ol.createEl('li', { text: p.t, attr: { lang: 'el' } });
      const r = el.createDiv('gq-row'); this.hearBtn(r, pairs.map(p => p.t).join(' '), 'Hear them all');
      const d = r.createEl('button', { text: 'Done', cls: 'mod-cta' }); d.onclick = api.close;
    } });
    this.pop(`Rally · Lesson ${n}`, steps);
  }
  // Comebacks: English first, say it, then reveal the Greek. One at a time.
  popComebacks(due) {
    const steps = due.map((c, k) => ({ label: 'Comeback', build: (el, api) => {
      el.createDiv({ cls: 'gq-hint', text: c.ctx.length ? 'Listen, then answer in Greek.' : 'Say it in Greek first.' });
      this.cbPrompt(el, c, true); if (c.ctx.length) say(c.ctx.map(x => x.g).join(' '));
      const g = el.createDiv({ cls: 'gq-pop-big gq-pop-hide', text: c.gr, attr: { lang: 'el' } });
      const r = el.createDiv('gq-row'); if (c.ctx.length) this.hearBtn(r, c.ctx.map(x => x.g).join(' '), 'Hear the line');
      const s = r.createEl('button', { text: c.ctx.length ? 'Show my answer' : 'Show Greek', cls: 'mod-cta' });
      s.onclick = () => { g.removeClass('gq-pop-hide'); say(c.gr); s.remove(); this.hearBtn(r, c.gr, 'Hear again'); const nx = r.createEl('button', { text: k === due.length - 1 ? 'Done' : 'Next', cls: 'mod-cta' }); nx.onclick = k === due.length - 1 ? api.close : api.next; };
    } }));
    this.pop('Comebacks', steps);
  }
  // A list of lines, one per card, then the whole thing. Sunday read-through and the kid lines.
  popLines(title, lines, hint) {
    const steps = lines.map(l => ({ label: l.who || 'Line', build: el => {
      if (hint) el.createDiv({ cls: 'gq-hint', text: hint });
      if (l.who) el.createDiv({ cls: 'gq-hint', text: l.who + ':' });
      const g = el.createDiv('gq-pop-big'); if (l.words) this.lineEl(g, l.gr, l.words); else g.createSpan({ text: l.gr, attr: { lang: 'el' } });
      if (l.en) el.createDiv({ cls: 'gq-hint', text: l.en });
      this.hearBtn(el.createDiv('gq-row'), l.gr); say(l.gr);
    } }));
    steps.push({ label: 'All together', build: (el, api) => {
      el.createDiv({ cls: 'gq-hint', text: 'Now the whole thing, top to bottom.' });
      const ol = el.createEl('ol', { cls: 'gq-storylist gq-pop-list' }); for (const l of lines) ol.createEl('li', { text: l.gr, attr: { lang: 'el' } });
      const r = el.createDiv('gq-row'); this.hearBtn(r, lines.map(l => l.gr).join(' '), 'Hear it all'); const d = r.createEl('button', { text: 'Done', cls: 'mod-cta' }); d.onclick = api.close;
    } });
    this.pop(title, steps);
  }
  // ---------- Slides (parked): one big card at a time, fading in, with Back and Next. Not used on Today since 2026-11-17d. ----------
  // The cards are the same as before; only the frame changes. The tool buttons and footer stay small underneath.
  deckify(box) {
    const slides = [];
    const take = c => {
      if (!c.classList || !c.classList.contains('gq-tcard') || c.classList.contains('gq-ttools') || c.classList.contains('gq-tnew')) return;
      const strong = c.querySelector('.gq-thead strong');
      let label = strong ? strong.textContent : c.classList.contains('gq-tnext') ? 'Ready for more' : 'Today';
      if (/^Week \d+/.test(label)) label = "Today's words";
      label = label.replace(/\s*[(·].*$/, '').trim();
      c.dataset.slide = label; c.addClass('gq-slide'); slides.push(c);
    };
    for (const ch of [...box.children]) {
      if (ch.tagName === 'DIV' && !ch.className) { [...ch.children].forEach(take); if (!ch.children.length) ch.remove(); continue; }
      take(ch);
    }
    if (slides.length < 2) return;
    const deck = createDiv('gq-deck'); deck.tabIndex = 0;
    const nav = deck.createDiv('gq-deck-nav');
    const prev = nav.createEl('button', { text: '‹', cls: 'gq-deck-arrow', attr: { 'aria-label': 'Previous card' } });
    const dots = nav.createDiv('gq-deck-dots');
    const next = nav.createEl('button', { text: '›', cls: 'gq-deck-arrow', attr: { 'aria-label': 'Next card' } });
    const stage = createDiv('gq-deck-stage'); deck.insertBefore(stage, nav);
    const first = slides[0]; first.parentElement.insertBefore(deck, first);
    for (const c of slides) stage.appendChild(c);
    const list = slides;
    if (list.length < 2) { deck.addClass('gq-deck-one'); }
    // Stay on the same card when Today redraws (after marking a color, saying a line). Start fresh each day.
    const today = ymd(new Date());
    if (this.deckDay !== today) { this.deckDay = today; this.deckKey = ''; }
    let i = Math.max(0, list.findIndex(c => c.dataset.slide === this.deckKey));
    const dotEls = list.map((c, k) => { const d = dots.createEl('button', { cls: 'gq-deck-dot', attr: { 'aria-label': c.dataset.slide } }); d.onclick = () => go(k); return d; });
    const paint = () => {
      dots.setAttr('aria-label', `${list[i].dataset.slide}, ${i + 1} of ${list.length}`);
      prev.disabled = i === 0; next.disabled = i === list.length - 1;
      dotEls.forEach((d, k) => d.toggleClass('is-on', k === i));
    };
    for (const c of slides) c.addClass('gq-off');
    list[i].removeClass('gq-off'); list[i].addClass('gq-on'); paint();
    const go = (k, dir) => {
      if (k < 0 || k >= list.length || k === i) return;
      dir = dir || (k > i ? 1 : -1);
      const out = list[i], inn = list[k], h0 = stage.offsetHeight;
      out.removeClass('gq-on'); out.style.transform = ''; out.style.opacity = '';
      out.addClass('gq-leaving', dir > 0 ? 'gq-to-left' : 'gq-to-right');
      inn.removeClass('gq-off', 'gq-from-left', 'gq-from-right'); inn.addClass('gq-on', dir > 0 ? 'gq-from-right' : 'gq-from-left');
      i = k; this.deckKey = inn.dataset.slide; paint();
      // Ease the height between cards of different sizes.
      const h1 = inn.offsetHeight; stage.style.height = h0 + 'px'; void stage.offsetHeight; stage.style.height = h1 + 'px';
      setTimeout(() => { out.removeClass('gq-leaving', 'gq-to-left', 'gq-to-right'); out.addClass('gq-off'); inn.removeClass('gq-from-left', 'gq-from-right'); stage.style.height = ''; }, 380);
    };
    prev.onclick = () => go(i - 1); next.onclick = () => go(i + 1);
    deck.addEventListener('keydown', e => {
      if (e.target.closest && e.target.closest('input, textarea, select')) return;
      if (e.key === 'ArrowRight') { go(i + 1); e.preventDefault(); } if (e.key === 'ArrowLeft') { go(i - 1); e.preventDefault(); }
    });
    // Swipe on phones (Android and iPhone). The card follows the finger a little; Obsidian's sidebar swipe is kept out of it.
    let sx = 0, sy = 0, horiz = null;
    stage.addEventListener('touchstart', e => { const t = e.touches[0]; sx = t.clientX; sy = t.clientY; horiz = null; }, { passive: true });
    stage.addEventListener('touchmove', e => {
      const t = e.touches[0], dx = t.clientX - sx, dy = t.clientY - sy;
      if (horiz === null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) horiz = Math.abs(dx) > Math.abs(dy) * 1.3;
      if (!horiz) return; e.stopPropagation();
      const c = list[i]; c.style.transition = 'none'; c.style.transform = `translateX(${dx * 0.35}px)`; c.style.opacity = String(1 - Math.min(0.35, Math.abs(dx) / 600));
    }, { passive: true });
    stage.addEventListener('touchend', e => {
      const c = list[i]; c.style.transition = ''; c.style.transform = ''; c.style.opacity = '';
      if (!horiz) return; e.stopPropagation();
      const dx = (e.changedTouches[0] || {}).clientX - sx;
      if (dx < -50) go(i + 1, 1); else if (dx > 50) go(i - 1, -1);
    });
  }
  // ---------- Beginner / Intermediate scripts (Intermediate edition only) ----------
  showSwitch() { return !this.isTeacher && !this.isKids && this.edition !== 'beginner' && !!this.app.vault.getAbstractFileByPath('Scripts/Intermediate'); }
  scriptSwitch(parent) {
    const sw = parent.createDiv({ cls: 'gq-sw', attr: { role: 'radiogroup', 'aria-label': 'Which scripts' } });
    for (const [k, label] of [['beginner', 'Beginner'], ['intermediate', 'Intermediate']]) {
      const b = sw.createEl('button', { text: label, attr: { role: 'radio', 'data-scripts': k } }); b.onclick = () => this.setScripts(k);
    }
    this.paintScripts();
    return sw;
  }
  paintScripts() {
    const v = this.colors().scripts;
    for (const b of document.querySelectorAll('.gq-sw button')) { const on = b.getAttribute('data-scripts') === v; b.classList.toggle('is-on', on); b.setAttribute('aria-checked', String(on)); }
  }
  // Shows one scripts folder in the sidebar (CSS on data-path, so it survives folder opens and redraws).
  applyScripts() {
    let st = document.getElementById('gq-scripts-view');
    if (!this.showSwitch()) { if (st) st.remove(); return; }
    const other = this.colors().scripts === 'intermediate' ? 'Scripts/Beginner' : 'Scripts/Intermediate';
    if (!st) { st = document.createElement('style'); st.id = 'gq-scripts-view'; document.head.appendChild(st); }
    st.textContent = `.nav-files-container .tree-item:has(> .tree-item-self[data-path="${other}"]) { display: none; }\n`;
    this.paintScripts();
  }
  async setScripts(v) {
    if (this.colors().scripts === v && this.scriptsNow === v) return;
    this.scriptsNow = v;
    // On a lesson page, jump to the same lesson at the other level (L05 <-> I05).
    const f = this.app.workspace.getActiveFile(), m = f && f.path.startsWith('Scripts/') && f.basename.match(/^([LI])(\d\d) /);
    const pf = await this.progressFile();
    await this.app.fileManager.processFrontMatter(pf, fm => { fm.scripts = v; });
    setTimeout(() => { this.applyScripts(); this.refreshToday(); }, 250);
    for (const b of document.querySelectorAll('.gq-sw button')) b.classList.toggle('is-on', b.getAttribute('data-scripts') === v);
    if (m && (m[1] === 'I') !== (v === 'intermediate')) {
      const want = (v === 'intermediate' ? 'I' : 'L') + m[2] + ' ', dir = v === 'intermediate' ? 'Scripts/Intermediate/' : 'Scripts/Beginner/';
      const g = this.app.vault.getMarkdownFiles().find(x => x.path.startsWith(dir) && x.basename.startsWith(want));
      if (g) { const leaf = this.mainLeaf(false); await leaf.openFile(g, { state: { mode: 'preview' } }); }
      else new Notice(`Lesson ${+m[2]} has no ${v} page yet.`);
    }
  }
  // ---------- Side panel: More on this page ----------
  isStudentScript(p) { return !!p && p.startsWith('Scripts/') && /-student\.md$/.test(p); }
  sideRules(p) {
    if (!p || this.isKids) return null;   // the kids' copy has no side panel
    if (p.startsWith('Words/')) return { h2: SIDE_WORD, callouts: [] };
    if (this.isStudentScript(p)) return { h2: SIDE_LESSON, callouts: SIDE_CALLOUT };
    return null;
  }
  // Which source lines move to the side panel, and the parts to show there. A part ends at the next ## heading or a --- line.
  sideMap(text, rules) {
    if (this.sideMemo && this.sideMemo.text === text && this.sideMemo.rules === rules) return this.sideMemo;
    const lines = text.split('\n'), hidden = new Array(lines.length).fill(false), parts = [];
    let i = 0;
    if (lines[0] === '---') { i = 1; while (i < lines.length && lines[i] !== '---') i++; i++; }
    let sec = null, call = null;
    for (; i < lines.length; i++) {
      const L = lines[i], h = L.match(/^## (.+?)\s*$/);
      if (call && !L.startsWith('>')) call = null;
      if (h) { call = null; sec = rules.h2.includes(h[1]) ? { title: h[1], body: [] } : null; if (sec) parts.push(sec); }
      else if (/^---\s*$/.test(L)) { sec = null; call = null; }
      else if (!sec && !call) {
        const c = L.match(/^> \[!\w+\][-+]?\s*(.*)$/);
        if (c && rules.callouts.some(x => c[1].startsWith(x))) { call = { title: c[1].replace(/\s*\(optional[^)]*\)\s*$/, '').replace(/:.*$/, '').trim(), body: [] }; parts.push(call); hidden[i] = true; continue; }
      }
      if (sec) { hidden[i] = true; if (!h) sec.body.push(L); }
      else if (call) { hidden[i] = true; call.body.push(L.replace(/^> ?/, '')); }
    }
    return this.sideMemo = { text, rules, hidden, parts: parts.map(x => ({ title: x.title, md: x.body.join('\n').trim() })).filter(x => x.md) };
  }
  sideHide(el, ctx) {
    const rules = ctx && this.sideRules(ctx.sourcePath); if (!rules) return;
    const info = ctx.getSectionInfo && ctx.getSectionInfo(el); if (!info || !info.text) return;
    if (this.sideMap(info.text, rules).hidden[info.lineStart]) el.addClass('gq-aside');
  }
  // Top of a lesson page: the Beginner / Intermediate switch (Intermediate edition) and the side panel button.
  lessonTop(el, ctx) {
    const p = ctx && ctx.sourcePath; if (!p || !p.startsWith('Scripts/')) return;
    const lesson = this.isStudentScript(p), index = /^Scripts\/01 Lesson Scripts\.md$/.test(p);
    if (!lesson && !index) return;
    const h1 = el.querySelector('h1'); if (!h1 || el.querySelector('.gq-ltop')) return;
    const sw = this.showSwitch(); if (!sw && !lesson) return;
    const row = createDiv('gq-ltop'); h1.after(row);
    if (sw) this.scriptSwitch(row);
    if (lesson) { const b = row.createEl('button', { text: 'More on this lesson ›', cls: 'gq-mini' }); b.onclick = () => this.showMore(); }
  }
  async ensureMore() {
    const ws = this.app.workspace; if (this.isKids || ws.getLeavesOfType(MORE).length) return;
    const leaf = ws.getRightLeaf(false); if (leaf) await leaf.setViewState({ type: MORE, active: false });
  }
  async showMore() {
    await this.ensureMore();
    const leaf = this.app.workspace.getLeavesOfType(MORE)[0]; if (!leaf) return;
    this.app.workspace.revealLeaf(leaf); this.paintMore();
  }
  paintMore() {
    clearTimeout(this.moreT);
    this.moreT = setTimeout(() => { for (const l of this.app.workspace.getLeavesOfType(MORE)) if (l.view && l.view.paint) l.view.paint(); }, 120);
  }
  async renderMd(md, el, path, comp) {
    const R = MarkdownRenderer; if (!R) { el.setText(md); return; }
    if (R.render) await R.render(this.app, md, el, path, comp); else await R.renderMarkdown(md, el, path, comp);
  }
  async renderMore(view) {
    const tok = view.tok = (view.tok || 0) + 1;
    const c = createDiv('gq-more'), f = this.app.workspace.getActiveFile();
    this.moreFile = f ? f.path : '';
    const head = c.createDiv('gq-more-head');
    head.createEl('strong', { text: f ? (f.path === TODAY ? 'Today' : f.basename.replace(/-student$/, '')) : 'More on this page' });
    const tools = c.createDiv('gq-row gq-more-tools');
    const btn = (t, fn) => { const b = tools.createEl('button', { text: t, cls: 'gq-mini' }); b.onclick = fn; };
    if (!f) c.createDiv({ cls: 'gq-hint', text: 'Open a note to see more about it here.' });
    else if (f.path === TODAY) await this.todayExtras(c, btn);
    else if (f.path.startsWith('Words/')) {
      btn('Hear it', () => say(f.basename));
      btn('Word graph', () => this.openGraph(f.path));
      btn('Build a sentence', () => this.openPair(f.basename));
      btn('Add a chunk', () => new CardModal(this.app, this, f.basename).open());
      btn('Ask the group', () => this.ask(f));
    } else {
      btn('Ask the group', () => this.ask(f));
      if (this.isStudentScript(f.path)) btn('Send homework', () => this.sendHomework());
      btn('Look up a word', () => new LookupModal(this.app, this).open());
    }
    const rules = f && f.extension === 'md' && this.sideRules(f.path);
    if (rules) {
      const parts = this.sideMap(await this.app.vault.cachedRead(f), rules).parts;
      for (const p of parts) {
        const d = c.createEl('details', { cls: 'gq-more-sec' }); d.createEl('summary', { text: p.title });
        await this.renderMd(p.md, d.createDiv('gq-more-body markdown-rendered'), f.path, view);
      }
      if (!parts.length) c.createDiv({ cls: 'gq-hint', text: 'Nothing else on this page.' });
    }
    // Extras: every other article, one tap away (the same notes as the Extras folder).
    const ex = this.app.vault.getMarkdownFiles().filter(x => x.path.startsWith(EXTRAS) && x.path.split('/').length === 2).sort((a, b) => a.basename.localeCompare(b.basename));
    if (ex.length) {
      const d = c.createEl('details', { cls: 'gq-more-sec' }); d.createEl('summary', { text: 'Extras' });
      const ul = d.createEl('ul', { cls: 'gq-tlist' });
      for (const x of ex) { const a = ul.createEl('li').createEl('a', { text: x.basename.replace(/^\d\d /, '').replace(/-student$/, ''), href: '#' }); a.onclick = e => { e.preventDefault(); this.openNote(x.path); }; }
    }
    if (tok === view.tok) { view.contentEl.empty(); view.contentEl.appendChild(c); }
  }
  // Today's side panel: games with today's words, Pair it points, colors, tools, and the vault version.
  async todayExtras(box, btn) {
    const col = this.colors(), words = await this.wordIndex(), wk = this.todayWeek;
    btn('Look up a word', () => new LookupModal(this.app, this).open());
    btn('Word graph', () => this.openGraph());
    btn('Games', () => this.openNote(GAMES));
    btn('Send homework', () => this.sendHomework());
    btn('My homework', () => this.openNote(MY_WORK + 'Homework.md'));
    const sec = (title, open) => { const d = box.createEl('details', { cls: 'gq-more-sec' }); if (open) d.open = true; d.createEl('summary', { text: title }); return d.createDiv('gq-more-body'); };
    const tb = this.todayBeat;
    if (tb) {
      const s = sec("Today's story", true);
      const r = s.createDiv('gq-row');
      if (tb.n <= SCENE_DAYS) { const w = r.createEl('button', { text: 'Watch it', cls: 'gq-mini' }); w.onclick = () => this.openApp('story', '#d=' + tb.n); const a = r.createEl('button', { text: 'Play it as a text adventure', cls: 'gq-mini' }); a.onclick = () => this.openApp('story', '#play&d=' + tb.n); }
      this.popBtn(r, 'Say it line by line', () => this.popLine(tb.b, tb.n, tb.done));
      if (tb.before.length) { s.createDiv({ cls: 'gq-tsub', text: `Story so far this week (${tb.before.length})` }); for (const x of tb.before) { const d = s.createDiv('gq-sofarline'); d.createSpan({ text: x.gr, attr: { lang: 'el' } }); d.createDiv({ cls: 'gq-hint', text: x.en }); } }
    }
    if ((this.reviewPlay || []).length > 8) { const s = sec(`All review words (${this.reviewPlay.length})`); this.wordList(s, this.reviewPlay); }
    if ((this.todayPlay || []).length || (this.reviewPlay || []).length) {
      const g = sec('Play with your words', true);
      if ((this.todayPlay || []).length) { g.createDiv({ cls: 'gq-tsub', text: "Today's words" }); this.playRow(g, this.todayPlay); }
      if ((this.reviewPlay || []).length) { g.createDiv({ cls: 'gq-tsub', text: 'Review words' }); this.playRow(g, this.reviewPlay); }
    }
      // Pair it: sentences built this week (own sentences count double)
      const pc = await this.pairCount(), pk = sec(`Pair it · ${pc.points} point${pc.points === 1 ? '' : 's'} this week`);
      const pbar = pk.createDiv('gq-tbar'); const done = pk.createDiv(); pbar.createDiv('gq-seg gq-pairseg').style.flexGrow = String(Math.min(pc.n, PAIR_GOAL)); pbar.createDiv('gq-seg gq-new').style.flexGrow = String(Math.max(0, PAIR_GOAL - pc.n)); done.remove();
      pk.createDiv({ cls: 'gq-hint', text: pc.n ? `${pc.n} sentence${pc.n === 1 ? '' : 's'} (${pc.own} your own) using ${pc.words} words. Goal: ${PAIR_GOAL} a week. Your own sentences count double.` : `Build ${PAIR_GOAL} sentences this week: pick a word, then pair it with who, what, and how or when. Your own sentences count double.` });
      const prow = pk.createDiv('gq-row');
      const todayWords = (wk && Object.values(await this.weekDays(wk.file)).flatMap(d => d.words).map(w => w.word)) || [];
      const pd = await this.pairData();
      const pickWord = () => { const pool = todayWords.filter(w => pd.v[w] || pd.x[w]); const all = Object.keys(pd.v); const p = pool.length ? pool : all; return p[Math.floor(Math.random() * p.length)] || 'θέλω'; };
      const pb1 = prow.createEl('button', { text: todayWords.length ? 'Pair a word from this week' : 'Pair a word' }); pb1.onclick = () => this.openPair(pickWord());
      const pb2 = prow.createEl('button', { text: 'My pairs' }); pb2.onclick = async () => { if (!(await this.app.vault.adapter.exists(PAIRS_NOTE))) { new Notice('Save a sentence first.'); return; } this.openNote(PAIRS_NOTE); };
    const n = { green: col.green.length, yellow: col.yellow.length, red: col.red.length }; const total = words.length || 1500;
    n.new = Math.max(0, total - n.green - n.yellow - n.red);
    const cc = sec('My colors');
    const bar = cc.createDiv('gq-tbar');
    for (const k of ['green', 'yellow', 'red', 'new']) { const seg = bar.createDiv('gq-seg gq-' + k); seg.style.flexGrow = String(n[k]); }
    cc.createDiv({ cls: 'gq-hint', text: `Have it ${n.green} · Kind of ${n.yellow} · Don't have it ${n.red} · Not marked ${n.new}. Mark words with the color buttons on each word note.` });
    let rel = VAULT_RELEASE; try { rel = JSON.parse(await this.app.vault.adapter.read(INSTALLED)).release || rel; } catch (e) {}
    const foot = box.createDiv('gq-hint gq-more-foot');
    const wn = foot.createEl('a', { text: "What's new", href: '#' }); wn.onclick = e => { e.preventDefault(); this.openNote(WHATS_NEW); };
    foot.appendText(` · vault ${rel}${this.edition === 'beginner' ? ' (Beginner)' : ''} · `);
    if (this.updateReady && !this.updating) { const up = foot.createEl('a', { text: 'Install update', href: '#' }); up.onclick = e => { e.preventDefault(); this.updateVault(false); }; foot.appendText(' · '); }
    const ix = foot.createEl('a', { text: 'Index', href: '#' }); ix.onclick = e => { e.preventDefault(); this.openNote(INDEX); };
  }
  // The newest lesson so far: this week's, or the last week that had class.
  async currentLesson() {
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const dd = Math.floor((now - new Date(COURSE_START[0], COURSE_START[1], COURSE_START[2])) / 864e5);
    for (let w = dd < 0 ? 1 : Math.floor(dd / 7) + 1; w >= 1; w--) { const wk = await this.weekNote(w); if (wk && +wk.fm.lesson) return +wk.fm.lesson; }
    return 1;
  }
  onunload() {
    document.body.classList.remove('greekquent-student');
    for (const id of ['gq-layout-dim', 'gq-scripts-view']) { const st = document.getElementById(id); if (st) st.remove(); }
    const pp = document.querySelector('.gq-pop'); if (pp) pp.remove();
  }
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

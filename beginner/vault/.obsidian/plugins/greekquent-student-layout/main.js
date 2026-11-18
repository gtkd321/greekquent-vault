const { Plugin, ItemView, Notice, requestUrl, MarkdownView, MarkdownRenderer, Modal, Menu, Platform } = require('obsidian');
// Greekquent Student Layout: keeps the student view simple.
// Turn this plugin off (Settings > Community plugins) to get the full Obsidian interface back.
const MOVE = ['search', 'tag', 'bookmarks', 'backlink', 'outgoing-link', 'outline', 'localgraph'];
const BLOCK = ['graph', 'all-properties'];   // the whole-vault graph and the properties list
const HIDE_RIBBON = ['graph:Open graph view', 'command-palette:Open command palette', 'switcher:Open quick switcher'];
// Left toolbar: Today, Look up, Ask, More. Everything else lives in More and in the command palette.
// Feedback goes to the teacher by text message. Change the number here if it ever changes.
const FEEDBACK_SMS = '+18033990665';
const VAULT_RELEASE = '2026-11-18v';
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
const WORDSV = 'greekquent-words';
const CLASSV = 'greekquent-class';
const TEACHER_SMS = '+18033990665';
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
// Animated scenes and the text adventure exist for these days so far.
const SCENE_DAYS = 300;
const COLORS = [['red', "Don't have it"], ['yellow', 'Kind of'], ['green', 'Have it']];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
// Voices read a capital Η or Ο standing alone as a letter name ("ita", "omikron"). It is always the article, so lowercase it for the voice only.
const ttsFix = t => String(t).replace(/(^|[^\p{L}])([ΗΟ])(?=[^\p{L}]|$)/gu, (m, a, b) => a + b.toLowerCase());
// Speaking right after cancel() is dropped on some phones (iPhone, some Android), so wait a moment when something is still talking.
// The utterance is kept in a variable so it is not cleaned up before it speaks.
let sayU = null, sayVoice = null;
const greekVoice = () => { try { if (!sayVoice) sayVoice = (speechSynthesis.getVoices() || []).find(v => /^el/i.test(v.lang)) || null; } catch (e) {} return sayVoice; };
const say = w => {
  const ss = window.speechSynthesis; if (!ss || !w) return;
  const u = new SpeechSynthesisUtterance(ttsFix(w)); u.lang = 'el-GR'; const v = greekVoice(); if (v) u.voice = v; sayU = u;
  const go = () => { try { ss.resume(); } catch (e) {} ss.speak(u); };
  if (ss.speaking || ss.pending) { ss.cancel(); setTimeout(go, 80); } else go();
};
// In a phrase a word can change: σε + το = στο, μεγάλος → μεγάλο. Say so, so a new student isn't puzzled.
const wwFold = t => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/ς/g, 'σ');
const wwForm = (lab, phrase) => {
  const bare = lab.replace(/^(ο|η|το|οι|τα) /, ''), toks = phrase.split(/[\s,.;!·?«»]+/).filter(Boolean), f = wwFold(bare);
  if (toks.some(t => wwFold(t) === f)) return '';
  if (f === 'σε') { const t = toks.find(t => /^σ(το|τον|την|τη|τα|τις|τους|τ')$/i.test(t)); if (t) return `Here σε joins the next word: σε + ${t.slice(1)} = ${t}.`; }
  let best = '', n = 0; for (const t of toks) { const g = wwFold(t); let k = 0; while (k < g.length && k < f.length && g[k] === f[k]) k++; if (k > n) { n = k; best = t; } }
  return n >= 3 ? `Here it is ${best}: the ending changes to fit.` : '';
};
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

// ---------- Word web: the center word and up to 9 partners on springs that settle and stop ----------
// Tap a word to move there, hold it to see its links (and hear the pairing), drag it to play.
// No endless physics: once nothing moves for a moment the web is perfectly still until touched.
const WEB = 'greekquent-word-web';
const WEB_MAX = 9;
const WEB_ORDER = { v: 0, n: 1, d: 2, o: 3, a: 4 };
const SVGNS = 'http://www.w3.org/2000/svg';
// Split a pairing line at ' · ', but not inside the English in parentheses, e.g. (arrive · almost).
const splitDots = s => { const out = []; let d = 0, cur = ''; for (let i = 0; i < s.length; i++) { const ch = s[i]; if (ch === '(') d++; else if (ch === ')') d = Math.max(0, d - 1); if (!d && s.startsWith(' · ', i)) { out.push(cur); cur = ''; i += 2; continue; } cur += ch; } out.push(cur); return out; };
// The kids' hello song: an original tune, played by the phone itself (no audio files, works offline).
// Each note is [syllable, MIDI pitch, beats]; a null syllable is a rest. Every syllable sits on a beat, and stressed syllables land on strong beats.
// Kids dessert words: a treat after the lesson. Never tested, never colored. [Greek, English, sounds like English]
// ---------- Say it: the phone's own speech to text checks a word or line said out loud, for bonus φόρα ----------
// Chrome on Android and Safari on iPhone have it built in. Where it is missing or fails (Obsidian on a computer, some Android apps),
// the button falls back to a text box, so the keyboard's microphone can do the listening instead.
const SRec = () => window.SpeechRecognition || window.webkitSpeechRecognition || null;
const foldG = t => String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ς/g, 'σ').replace(/[^\p{L}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
const SMALL_W = new Set(['ο', 'η', 'το', 'οι', 'τα', 'τον', 'την', 'του', 'τησ', 'των', 'ενασ', 'μια', 'μια', 'ενα']);
const near = (a, b) => { if (a === b) return true; if (Math.abs(a.length - b.length) > 1 || a.length < 4) return false; let i = 0, j = 0, e = 0; while (i < a.length && j < b.length) { if (a[i] === b[j]) { i++; j++; continue; } if (++e > 1) return false; if (a.length > b.length) i++; else if (b.length > a.length) j++; else { i++; j++; } } return e + (a.length - i) + (b.length - j) <= 1; };
// True when what was heard holds the target: every word of one or two words, three of four in a longer line. Small words like ο and το are left out.
const heardIt = (target, alts) => {
  let tw = foldG(target).split(' ').filter(Boolean); const content = tw.filter(w => !SMALL_W.has(w)); if (content.length) tw = content;
  return (alts || []).some(a => { const hw = foldG(a).split(' ').filter(Boolean); const n = tw.filter(w => hw.some(h => near(w, h))).length; return tw.length <= 2 ? n === tw.length : n / tw.length >= 0.75; });
};
// Listening always ends: a hard stop after 7 seconds even when the phone never reports back (some phones and home-screen apps hang there).
// A hang is reported as 'hang', and the caller switches that device to the keyboard microphone.
const listenGreek = () => new Promise((res, rej) => {
  const R = SRec(); if (!R) { rej('none'); return; }
  let r, out = null, over = false; try { r = new R(); } catch (e) { rej('none'); return; }
  const end = (ok, v) => { if (over) return; over = true; clearTimeout(t1); clearTimeout(t2); r.onresult = r.onerror = r.onend = null; try { r.abort(); } catch (e) {} ok ? res(v) : rej(v); };
  r.lang = 'el-GR'; r.interimResults = false; r.maxAlternatives = 5; r.continuous = false;
  const t1 = setTimeout(() => { try { r.stop(); } catch (e) {} }, 6000);
  const t2 = setTimeout(() => end(false, out ? 'late' : 'hang'), 8000);
  r.onresult = e => { out = []; for (const x of e.results) for (const y of x) out.push(y.transcript); end(true, out); };
  r.onerror = e => end(false, e.error || 'error');
  r.onend = () => end(true, out || []);
  // Start a moment after any speaking stops, so the voice and the microphone don't fight over the audio.
  setTimeout(() => { if (over) return; try { r.start(); } catch (e) { end(false, 'busy'); } }, 250);
});
// Kids start with the letters: each one's sound, a word that starts with it, and four sets of six. No two letters in a set share a sound.
// [lower, upper, sound, like, word, English, syllable to say]
const LETTERS = [["α", "Α", "a", "father", "άλογο", "horse", ""], ["ε", "Ε", "e", "egg", "ελέφαντας", "elephant", ""], ["ο", "Ο", "o", "octopus", "ομπρέλα", "umbrella", ""], ["μ", "Μ", "m", "moon", "μήλο", "apple", "μα"], ["π", "Π", "p", "pig", "πάπια", "duck", "πα"], ["τ", "Τ", "t", "top", "τυρί", "cheese", "τα"], ["ι", "Ι", "ee", "see", "ιππότης", "knight", ""], ["κ", "Κ", "k", "kite", "κότα", "hen", "κα"], ["λ", "Λ", "l", "lion", "λεμόνι", "lemon", "λα"], ["ν", "Ν", "n", "nose", "νερό", "water", "να"], ["σ", "Σ", "s", "sun", "σκύλος", "dog", "σα"], ["ρ", "Ρ", "r", "a quick tap of the tongue", "ρολόι", "clock", "ρα"], ["β", "Β", "v", "van", "βάρκα", "boat", "βα"], ["γ", "Γ", "gh", "a soft, breathy g", "γάτα", "cat", "γα"], ["δ", "Δ", "th", "this", "δέντρο", "tree", "δα"], ["φ", "Φ", "f", "fish", "φίδι", "snake", "φα"], ["χ", "Χ", "h", "a scratchy h, like clearing your throat", "χαρτί", "paper", "χα"], ["υ", "Υ", "ee", "see", "ύπνος", "sleep", ""], ["η", "Η", "ee", "see", "ήλιος", "sun", ""], ["ζ", "Ζ", "z", "zoo", "ζάχαρη", "sugar", "ζα"], ["θ", "Θ", "th", "thin", "θάλασσα", "sea", "θα"], ["ξ", "Ξ", "ks", "box", "ξύλο", "wood", "ξα"], ["ψ", "Ψ", "ps", "tops", "ψάρι", "fish", "ψα"], ["ω", "Ω", "o", "octopus", "ώρα", "time, hour", ""]].map(([l, u, s, h, w, en, syl]) => ({ l, u, s, h: h.includes(' ') ? h : 'like ' + h, w, en, say: syl ? syl + ', ' + w : w }));
const LETTER_SETS = [0, 1, 2, 3].map(i => LETTERS.slice(i * 6, i * 6 + 6));
const DESSERT = [["ο σούπερ ήρωας", "superhero", 1], ["ο Σπάιντερμαν", "Spider-Man", 1], ["η αράχνη", "spider", 0], ["ο ιστός", "web", 0], ["η κάπα", "cape", 0], ["η στολή", "costume, suit", 0], ["η υπερδύναμη", "superpower", 0], ["αόρατος", "invisible", 0], ["το ρομπότ", "robot", 1], ["ο δεινόσαυρος", "dinosaur", 1], ["ο δράκος", "dragon", 0], ["το φάντασμα", "ghost", 0], ["ο πειρατής", "pirate", 1], ["ο θησαυρός", "treasure", 0], ["ο πύραυλος", "rocket", 0], ["ο αστροναύτης", "astronaut", 1], ["ο εξωγήινος", "alien", 0], ["ο νίντζα", "ninja", 1], ["ο ιππότης", "knight", 0], ["το σπαθί", "sword", 0], ["η ασπίδα", "shield", 0], ["ο μονόκερος", "unicorn", 0], ["ο καρχαρίας", "shark", 0], ["το λιοντάρι", "lion", 0], ["ο ελέφαντας", "elephant", 1], ["η μαϊμού", "monkey", 0], ["το φίδι", "snake", 0], ["ο βάτραχος", "frog", 0], ["η πεταλούδα", "butterfly", 0], ["το παγωτό", "ice cream", 0], ["η καραμέλα", "candy", 1], ["η τούρτα", "birthday cake", 0], ["το μπαλόνι", "balloon", 1], ["το ποδήλατο", "bike", 0], ["το τρένο", "train", 1], ["το ελικόπτερο", "helicopter", 1], ["ο λουκουμάς", "honey doughnut", 0]];
const DESSERT_FILE = 'My Work/My dessert words.md';
// Momentum (φόρα): points for practice that builds memory, fading by 1/7 each day.
// Spaced recall and colors that stick count most; repeats on the same day count nothing; at most MO_CAP points a day.
const MO_FILE = MY_WORK + 'My momentum.md';
const MO_CAP = 40, MO_KEEP = 6 / 7;
const CARD_DIR = MY_WORK + 'Card photos/';
const HELLO_SONG = [
  { gr: 'Γεια σας, γεια σας, φίλοι!', en: 'Hi, hi, friends!', move: 'Big wave to everyone', chords: [60, 65],
    notes: [['Γεια ', 67, 1], ['σας, ', 67, 1], ['γεια ', 64, 1], ['σας, ', 64, 1], ['φί', 69, 1], ['λοι!', 67, 2], [null, 0, 1]] },
  { gr: 'Γεια σου, γεια σου, εσύ!', en: 'Hi, hi, you!', move: 'Small wave, then point to one person', chords: [60, 67],
    notes: [['Γεια ', 67, 1], ['σου, ', 67, 1], ['γεια ', 64, 1], ['σου, ', 64, 1], ['ε', 60, 1], ['σύ!', 62, 2], [null, 0, 1]] },
  { gr: 'Τι έχεις; Τι έχεις;', en: 'What do you have? What do you have?', move: 'Palms up, shoulders up', chords: [60, 65],
    notes: [['Τι ', 64, 1], ['έ', 67, 1], ['χεις; ', 67, 2], ['Τι ', 64, 1], ['έ', 69, 1], ['χεις;', 65, 2]] },
  { gr: 'Ώρα για ελληνικά!', en: 'Time for Greek!', move: 'Tap your wrist, then both arms up', chords: [60, 60],
    notes: [['Ώ', 72, 1], ['ρα ', 69, 1], ['για ', 67, 1], ['ελ', 64, 1], ['λη', 62, 1], ['νι', 64, 1], ['κά!', 60, 2]] },
];
// SVG made with plain DOM calls, so the web draws the same on every Obsidian version and phone.
const svgEl = (parent, tag, cls, attrs) => { const el = document.createElementNS(SVGNS, tag); if (cls) el.setAttribute('class', cls); for (const [k, v] of Object.entries(attrs || {})) el.setAttribute(k, String(v)); parent.appendChild(el); return el; };
class WordWebView extends ItemView {
  constructor(leaf, plugin) { super(leaf); this.plugin = plugin; this.path = ''; this.hist = []; this.pos = -1; this.nodes = new Map(); this.edges = []; this.raf = 0; this.data = new Map(); }
  getViewType() { return WEB; }
  getDisplayText() { return this.path ? 'Word web: ' + this.path.replace(/^Words\//, '').replace(/\.md$/, '') : 'Word web'; }
  getIcon() { return 'git-fork'; }
  getState() { return { path: this.path }; }
  async setState(st, res) { await super.setState(st, res); if (st && st.path && st.path !== this.path) await this.go(st.path); }
  async onOpen() {
    const box = this.contentEl; box.empty(); box.addClass('gq-ww');
    const bar = box.createDiv('gq-web-bar');
    for (const ev of ['pointerdown', 'mousedown', 'touchstart', 'touchmove', 'wheel']) bar.addEventListener(ev, e => e.stopPropagation(), { passive: true });
    this.titleEl = bar.createDiv({ cls: 'gq-web-title gq-say', attr: { role: 'button', 'aria-label': 'Touch to listen' } });
    this.titleEl.onclick = () => this.path && say(this.label(this.path));
    this.back = bar.createEl('button', { text: '←', attr: { 'aria-label': 'Back' } }); this.back.onclick = () => this.step(-1);
    this.fwd = bar.createEl('button', { text: '→', attr: { 'aria-label': 'Forward' } }); this.fwd.onclick = () => this.step(1);
    const open = bar.createEl('button', { text: 'Word card' }); open.onclick = () => { const f = this.file(); if (!f) return; const ws = this.app.workspace; const l = ws.getLeavesOfType('markdown').find(x => x.getRoot && x.getRoot() === ws.rootSplit) || this.plugin.mainLeaf(true); l.openFile(f); ws.setActiveLeaf(l, { focus: true }); };
    const pairb = bar.createEl('button', { text: 'Build a sentence' }); pairb.onclick = () => { const f = this.file(); if (f) this.plugin.openPair(f.basename); };
    const askb = bar.createEl('button', { text: 'Ask' }); askb.onclick = () => { const f = this.file(); if (f) this.plugin.ask(f); };
    this.trail = box.createDiv('gq-web-trail');
    this.agree = box.createDiv('gq-agree'); this.agree.hide();
    box.createDiv({ cls: 'gq-hint gq-ww-help', text: 'Tap a word to move there. Double-tap a thing to hear more than one. Hold a word to see its links. Drag to play.' });
    this.stage = box.createDiv('gq-ww-stage');
    this.svg = svgEl(this.stage, 'svg', '', { 'aria-label': 'Word web' });
    this.gE = svgEl(this.svg, 'g'); this.gN = svgEl(this.svg, 'g');
    // The word card sits at the top, over the buttons and the instructions, so it never hides words in the web.
    this.chip = box.createDiv('gq-ww-chip');
    const key = box.createDiv('gq-web-key');
    for (const [cls, tx] of [['v', 'verbs (doing)'], ['n', 'nouns (things, people)'], ['a', 'describing words'], ['d', 'how, when, where'], ['o', 'little words']]) { const s = key.createSpan('gq-key'); s.createSpan('gq-kdot gq-k' + cls); s.appendText(tx); }
    // Swipes inside the web are for the web, not for opening Obsidian's side panels.
    for (const ev of ['touchstart', 'touchmove', 'touchend']) this.stage.addEventListener(ev, e => { e.stopPropagation(); if (ev === 'touchmove') e.preventDefault(); }, { passive: false });
    this.registerDomEvent(window, 'resize', () => this.path && this.go(this.path, false));
    this.ro = new ResizeObserver(() => { const r = this.stage.getBoundingClientRect(); if (this.path && r.width && (Math.abs(r.width - this.Wd) > 20 || Math.abs(r.height - this.Ht) > 20)) this.go(this.path, false); });
    this.ro.observe(this.stage);
    if (this.path) { const p = this.path; this.path = ''; this.go(p); }
  }
  async onClose() { if (this.raf) cancelAnimationFrame(this.raf); this.raf = 0; if (this.ro) this.ro.disconnect(); }
  file() { return this.path ? this.app.vault.getAbstractFileByPath(this.path) : null; }
  label(p) { return this.plugin.agreeLabel(p, this.centerG || ''); }
  // What a word note offers the web: kind, rank, meaning, and its partners with the phrase that joins them.
  async info(p) {
    if (this.data.has(p)) return this.data.get(p);
    const f = this.app.vault.getAbstractFileByPath(p); if (!f) return null;
    const fm = (this.app.metadataCache.getFileCache(f) || {}).frontmatter || {};
    const tags = [].concat(fm.tags || []).join(' ');
    const t = /\bverb\b/.test(tags) ? 'v' : /noun/.test(tags) ? 'n' : /adjective/.test(tags) ? 'a' : /adverb/.test(tags) ? 'd' : 'o';
    const txt = await this.app.vault.cachedRead(f);
    const res = name => { const d = this.app.metadataCache.getFirstLinkpathDest(name, p); return d && d.path.startsWith('Words/') && d.path !== p ? d.path : null; };
    const pair = [], co = [];
    const pm = txt.match(/## Pair it with\n([\s\S]*?)(?:\n## |$)/);
    if (pm) for (const line of pm[1].split('\n')) {
      const c = line.match(/^- \*\*(.+?):\*\*\s*(.*)/); if (!c || c[1] === 'Try') continue;
      for (const part of splitDots(c[2])) {
        const l = part.match(/\[\[([^\]|#]+)(?:\|([^\]]+))?\]\]/); if (!l) continue; const q = res(l[1]); if (!q) continue;
        const en = (part.match(/\(([^)]*)\)\s*$/) || [])[1] || '';
        const phrase = part.replace(/\[\[([^\]|#]+)\|([^\]]+)\]\]/g, '$2').replace(/\[\[([^\]|#]+)\]\]/g, '$1').replace(/\s*\([^)]*\)\s*$/, '').trim();
        pair.push({ k: q, cat: c[1], phrase: phrase.replace(/\s*\([^)]*\)/g, '').replace(/\s+/g, ' ').trim(), en });
      }
    }
    // A partner listed alone ("σπίτι") borrows its chunk from this page ("στο σπίτι (at home)"), so the web shows real use.
    const ch = (txt.match(/^- \*\*Chunks:\*\*\s*(.*)$/m) || [])[1];
    if (ch) { const chunks = splitDots(ch).map(x => ({ ph: x.replace(/\s*\([^)]*\)\s*$/, '').trim(), en: (x.match(/\(([^)]*)\)\s*$/) || [])[1] || '' }));
      for (const x of pair) { const bare = wwFold(x.k.split('/').pop().replace(/\.md$/, '')); if (wwFold(x.phrase) !== bare || bare.length < 3) continue;
        const hit = chunks.find(c => c.ph.split(/\s+/).some(t => { const g = wwFold(t); return g === bare || (g.length >= 4 && bare.startsWith(g.slice(0, 4)) && g.slice(0, 3) === bare.slice(0, 3)); }));
        if (hit) { x.phrase = hit.ph; x.en = x.en || hit.en; } } }
    const cm = txt.match(/## Often appears with\n([\s\S]*?)(?:\n## |$)/);
    if (cm) for (const x of cm[1].matchAll(/\[\[([^\]|#]+)/g)) { const q = res(x[1]); if (q && !co.includes(q)) co.push(q); }
    const w = { p, t, r: +fm.rank || 9999, e: String(fm.english || ''), say: fm.pronunciation || '', pl: String(fm.plural || ''), already: /noun-pl/.test(tags), pair, co };
    this.data.set(p, w); return w;
  }
  async partners(c) {
    await this.plugin.loadVerbs();
    const w = await this.info(c); if (!w) return [];
    const groups = new Map();
    for (const x of w.pair) { if (!groups.has(x.cat)) groups.set(x.cat, []); groups.get(x.cat).push({ ...x }); }
    const lists = [...groups.entries()].map(([cat, l]) => cat === 'Who' ? l.slice(0, 1) : l); lists.push(w.co.map(k => ({ k, phrase: '', en: '' })));
    const out = [], seen = new Set([c]);
    for (let round = 0; out.length < WEB_MAX && lists.some(l => l.length > round); round++)
      for (const l of lists) { const x = l[round]; if (x && !seen.has(x.k) && out.length < WEB_MAX) { seen.add(x.k); out.push(x); } }
    const name = c.replace(/^Words\//, '').replace(/\.md$/, ''), stem = fold(name).slice(0, Math.max(3, name.length - 2));
    for (const x of out) {
      x.w = await this.info(x.k);
      if (!x.phrase && x.w) { const back = x.w.pair.find(p => p.k === c); if (back) { x.phrase = back.phrase; x.en = back.en; } }
      // να + the form learners already know: μπορώ να δω becomes μπορώ να βλέπω (the one-time form is kept for the chip).
      if (x.phrase) { const e = this.plugin.easyVerbs(x.phrase); if (e !== x.phrase) { x.once = x.phrase; x.phrase = e; } }
      if (x.phrase && w.t === 'v' && !fold(x.phrase).includes(stem)) { x.phrase = name + ' ' + x.phrase; if (x.once) x.once = name + ' ' + x.once; }
    }
    return out.filter(x => x.w);
  }
  linked(a, b) { const A = this.data.get(a), B = this.data.get(b); return !!((A && (A.pair.some(p => p.k === b) || A.co.includes(b))) || (B && (B.pair.some(p => p.k === a) || B.co.includes(a)))); }
  step(d) { const n = this.pos + d; if (n < 0 || n >= this.hist.length) return; this.pos = n; this.go(this.hist[n], false); }
  async go(p, push = true) {
    if (!p || !this.stage) { this.path = p || this.path; return; }
    const w = await this.info(p); if (!w) return;
    if (push && this.hist[this.pos] !== p) { this.hist = this.hist.slice(0, this.pos + 1); this.hist.push(p); this.pos = this.hist.length - 1; if (this.hist.length > 1) this.plugin.moAdd('web', p); }
    this.path = p; this.centerG = this.plugin.wordInfo(p).g;
    const r = this.stage.getBoundingClientRect(); this.Wd = r.width || 360; this.Ht = r.height || 480;
    const cx = this.Wd / 2, cy = this.Ht / 2;
    const list = (await this.partners(p)).sort((a, b) => WEB_ORDER[a.w.t] - WEB_ORDER[b.w.t] || a.w.r - b.w.r);
    for (let i = 1; i < list.length; i++) if (nearTwin(list[i - 1].k, list[i].k)) { const j = list.findIndex((y, m) => m > i && y.w.t === list[i].w.t && !nearTwin(list[i - 1].k, y.k)); if (j > i) [list[i], list[j]] = [list[j], list[i]]; }
    this.plugin.whereSet({ kind: 'web', path: p, label: 'Word web · ' + p.replace(/^Words\//, '').replace(/\.md$/, '') });
    const R = Math.min(this.Wd * 0.40, this.Ht * 0.38, 260), n = list.length || 1, nv = list.filter(x => x.w.t === 'v').length;
    const rot = -Math.PI / 2 - (nv ? (nv - 1) / 2 : 0) * (2 * Math.PI / n);
    list.forEach((x, i) => { const a = rot + i * 2 * Math.PI / n, rr = R * (i % 2 ? 0.86 : 1); x.tx = Math.cos(a) * rr; x.ty = Math.sin(a) * rr * (this.Ht > this.Wd ? 1.08 : 0.9); });
    const keep = new Set([p, ...list.map(x => x.k)]), from = this.nodes.get(p);
    const ox = from ? from.x : cx, oy = from ? from.y : cy;
    for (const m of this.nodes.values()) if (!keep.has(m.k)) { m.dead = true; m.top = 0; const dx = m.x - ox, dy = m.y - oy, d = Math.hypot(dx, dy) || 1; m.free = true; m.tx = m.x + dx / d * 120 - cx; m.ty = m.y + dy / d * 120 - cy; }
    this.center = from && !from.dead ? from : (from && from.g.remove(), this.mk(p, w, cx, cy));
    Object.assign(this.center, { dead: false, top: 1, tx: 0, ty: 0, free: false, x0: null });
    for (const x of list) {
      let m = this.nodes.get(x.k);
      if (!m || m.dead) { if (m) m.g.remove(); m = this.mk(x.k, x.w, ox + (Math.random() - .5) * 6, oy + (Math.random() - .5) * 6); }
      Object.assign(m, { dead: false, top: 1, tx: x.tx, ty: x.ty, free: false, x0: x });
    }
    for (const m of this.nodes.values()) { m.g.classList.toggle('is-center', m === this.center); if (!m.dead) m.t.textContent = this.label(m.k); }
    this.edges = list.map(x => ({ a: p, b: x.k, inter: false }));
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) if (this.linked(list[i].k, list[j].k)) this.edges.push({ a: list[i].k, b: list[j].k, inter: true });
    while (this.gE.firstChild) this.gE.firstChild.remove(); for (const e of this.edges) e.el = svgEl(this.gE, 'line', 'gq-ww-edge' + (e.inter ? ' is-inter' : ''));
    this.paintTop(w); this.unhold(); this.kick();
    this.leaf.updateHeader && this.leaf.updateHeader(); this.app.workspace.requestSaveLayout();
  }
  mk(k, w, x, y) {
    const g = svgEl(this.gN, 'g', 'gq-ww-node');
    svgEl(g, 'circle', 'gq-ww-ring', { r: 15 });
    svgEl(g, 'circle', 'gq-ww-dot gq-ww-' + w.t, { r: 9 });
    const t = svgEl(g, 'text', '', { y: 28, lang: 'el' }); t.textContent = this.label(k);
    svgEl(g, 'circle', 'gq-ww-hit', { r: 30 });
    const m = { k, g, t, x, y, vx: 0, vy: 0, tx: 0, ty: 0, op: 0, top: 1, dead: false };
    this.bind(m); this.nodes.set(k, m); return m;
  }
  kick() { this.quiet = 0; if (!this.raf) this.raf = requestAnimationFrame(() => this.tick()); }
  tick() {
    this.raf = 0; const cx = this.Wd / 2, cy = this.Ht / 2, live = [...this.nodes.values()], drag = this.drag, c = this.center; let energy = 0;
    const bx = c ? c.x : cx, by = c ? c.y : cy;
    for (const m of live) {
      if (drag && m === drag) continue;
      const gx = m === c ? cx : m.free ? cx + m.tx : bx + m.tx, gy = m === c ? cy : m.free ? cy + m.ty : by + m.ty, k = m === c ? 0.05 : 0.07;
      m.vx += (gx - m.x) * k; m.vy += (gy - m.y) * k;
    }
    for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) {
      const a = live[i], b = live[j]; if (a.dead || b.dead) continue;
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1;
      if (d < 62) { const f = (62 - d) / d * 0.12; a.vx -= dx * f; a.vy -= dy * f; b.vx += dx * f; b.vy += dy * f; }
    }
    if (drag) for (const e of this.edges) { const o = e.a === drag.k ? this.nodes.get(e.b) : e.b === drag.k ? this.nodes.get(e.a) : null; if (!o) continue;
      const dx = drag.x - o.x, dy = drag.y - o.y, d = Math.hypot(dx, dy) || 1, f = (d - 140) / d * 0.02; o.vx += dx * f; o.vy += dy * f; }
    for (const m of live) {
      if (m !== drag) { m.vx *= 0.78; m.vy *= 0.78; m.x += m.vx; m.y += m.vy; }
      m.op += (m.top - m.op) * 0.18; energy += Math.abs(m.vx) + Math.abs(m.vy) + Math.abs(m.top - m.op) * 10;
      if (m.dead && m.op < 0.02) { m.g.remove(); this.nodes.delete(m.k); continue; }
      m.g.setAttribute('transform', `translate(${m.x.toFixed(1)},${m.y.toFixed(1)})`); m.g.style.opacity = m.op.toFixed(3);
    }
    for (const e of this.edges) { const a = this.nodes.get(e.a), b = this.nodes.get(e.b); if (!a || !b || !e.el) continue;
      e.el.setAttribute('x1', a.x.toFixed(1)); e.el.setAttribute('y1', a.y.toFixed(1)); e.el.setAttribute('x2', b.x.toFixed(1)); e.el.setAttribute('y2', b.y.toFixed(1)); e.el.style.opacity = Math.min(a.op, b.op).toFixed(3); }
    this.quiet = energy < 0.15 ? this.quiet + 1 : 0;
    if (this.quiet < 20 || drag) this.raf = requestAnimationFrame(() => this.tick());
  }
  bind(m) {
    m.g.addEventListener('pointerdown', e => {
      e.preventDefault(); e.stopPropagation(); try { m.g.setPointerCapture(e.pointerId); } catch (er) {}
      const d = { m, sx: e.clientX, sy: e.clientY, moved: false, id: e.pointerId };
      d.t = setTimeout(() => { if (!d.moved && this.down === d) this.hold(m); }, 420); this.down = d; this.drag = null;
    });
    m.g.addEventListener('pointermove', e => {
      const d = this.down; if (!d || d.id !== e.pointerId) return;
      if (!d.moved && !this.held && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > 8) { d.moved = true; clearTimeout(d.t); this.drag = m; this.kick(); }
      if (this.drag === m) { const r = this.stage.getBoundingClientRect(); m.x = e.clientX - r.left; m.y = e.clientY - r.top; m.vx = m.vy = 0; }
    });
    m.g.addEventListener('pointerup', e => {
      const d = this.down; if (!d || d.id !== e.pointerId) return; this.down = null; clearTimeout(d.t);
      if (this.held) { this.unhold(); return; }
      if (this.drag) { this.drag = null; this.kick(); return; }
      // Double-tap: hear the plural. A single tap waits a moment before moving, so the second tap can land.
      const now = Date.now(), lt = this.lastTap;
      if (lt && lt.k === m.k && now - lt.t < 320) { clearTimeout(lt.go); this.lastTap = null; this.plural(m); if (m !== this.center) this.go(m.k); return; }
      say(this.label(m.k));
      this.lastTap = { k: m.k, t: now, go: m === this.center ? 0 : setTimeout(() => { this.lastTap = null; this.go(m.k); }, 320) };
      if (m === this.center) { m.vy -= 6; this.kick(); }
    });
    m.g.addEventListener('pointercancel', () => { if (this.down) clearTimeout(this.down.t); this.down = null; this.drag = null; this.unhold(); this.kick(); });
  }
  hold(m) {
    this.held = m; m.g.classList.add('is-held'); if (navigator.vibrate) try { navigator.vibrate(10); } catch (e) {}
    const near = new Set([m.k]);
    for (const e of this.edges) { const on = e.a === m.k || e.b === m.k; e.el.classList.toggle('is-hot', on); e.el.classList.toggle('is-dim', !on); if (on) { near.add(e.a); near.add(e.b); } }
    for (const o of this.nodes.values()) o.g.classList.toggle('is-dim', !near.has(o.k));
    const w = this.data.get(m.k) || {}, x = m.x0; this.chip.empty();
    this.chip.createEl('b', { text: this.label(m.k), attr: { lang: 'el' } }); this.chip.appendText(' · ' + (w.e || '') + (w.say ? ' · say it: ' + w.say : ''));
    if (x && x.phrase && m !== this.center) {
      const d = this.chip.createDiv({ attr: { lang: 'el' } }); d.appendText(x.phrase); if (x.en) d.createSpan({ cls: 'gq-hint', text: '  (' + x.en + ')' });
      // The word first, then the phrase, so what you hear starts with what you see.
      const lab = this.label(m.k), same = wwFold(x.phrase) === wwFold(lab) || wwFold(x.phrase) === wwFold(lab.replace(/^(ο|η|το|οι|τα) /, ''));
      // Say the word on its own only when the phrase doesn't already contain it (εγώ → "Εγώ θέλω να πάω", not "εγώ. Εγώ θέλω…").
      const bareF = wwFold(lab.replace(/^(ο|η|το|οι|τα) /, '')), inside = x.phrase.split(/[\s,.;!·?«»]+/).some(t => wwFold(t) === bareF);
      // A changed form inside (μεγάλος → μεγάλο σπίτι) also plays just the phrase; otherwise the word leads into it (θέλω + να πάω).
      const changed = !inside && !!wwForm(lab, x.phrase);
      if (same) d.remove(); say(same || inside || changed ? x.phrase : lab + ' ' + x.phrase);
      const form = !same && (wwForm(lab, x.phrase) || (this.center && wwForm(this.label(this.center.k), x.phrase))); if (form) this.chip.createDiv({ cls: 'gq-hint', text: form });
      if (x.once) { const o = this.chip.createDiv({ cls: 'gq-hint' }); o.appendText('for one time: '); o.createSpan({ text: x.once, attr: { lang: 'el' } }); }
    }

    else say(this.label(m.k));
    const others = [...near].filter(k => k !== m.k && k !== this.center.k).length;
    this.chip.createDiv({ cls: 'gq-hint', text: m === this.center ? `${this.nodes.size - 1} words go with it` : others ? `Also goes with ${others} of the words here` : 'Goes with the word in the middle' });
    this.chipPlace(); this.chip.addClass('is-on');
  }
  // The card's bottom edge sits just above the web: it covers the instructions, never the words.
  chipPlace() { const c = this.chip; if (!c || !this.stage) return; c.style.top = Math.max(4, this.stage.offsetTop - c.offsetHeight - 4) + 'px'; }
  // Plural of a noun: spoken, and shown in the chip for a moment.
  plural(m) {
    const w = this.data.get(m.k) || {}; this.chip.empty(); clearTimeout(this.plTimer);
    if (w.pl) { this.chip.createEl('b', { text: w.pl, attr: { lang: 'el' } }); this.chip.appendText('  · more than one'); say(w.pl); }
    else if (w.already) { this.chip.createEl('b', { text: this.label(m.k), attr: { lang: 'el' } }); this.chip.appendText('  · already plural'); say(this.label(m.k)); }
    else this.chip.appendText(w.t === 'n' ? 'This one usually has no plural.' : 'Double-tap a thing or a person (a purple word) to hear its plural.');
    this.chipPlace(); this.chip.addClass('is-on'); this.plTimer = setTimeout(() => { if (!this.held) this.chip.removeClass('is-on'); }, 2200);
  }
  unhold() {
    if (this.held) this.held.g.classList.remove('is-held'); this.held = null;
    for (const e of this.edges) if (e.el) { e.el.classList.remove('is-hot', 'is-dim'); }
    for (const o of this.nodes.values()) o.g.classList.remove('is-dim');
    this.chip && this.chip.removeClass('is-on');
  }
  paintTop(w) {
    const name = this.path.replace(/^Words\//, '').replace(/\.md$/, '');
    this.titleEl.empty(); this.titleEl.createSpan({ text: this.label(this.path), attr: { lang: 'el' } });
    this.titleEl.createSpan({ cls: 'gq-hint', text: `  · ${w.e}${w.say ? ' · say it: ' + w.say : ''}${w.r < 9999 ? ' · #' + w.r : ''}` });
    this.back.disabled = this.pos <= 0; this.fwd.disabled = this.pos >= this.hist.length - 1;
    this.trail.empty();
    const from = Math.max(0, this.pos - 6);
    this.hist.slice(from, this.pos + 1).forEach((h, i, a) => { const el = this.trail.createEl('a', { text: h.replace(/^Words\//, '').replace(/\.md$/, ''), href: '#', attr: { lang: 'el' } }); el.onclick = ev => { ev.preventDefault(); this.pos = from + i; this.go(h, false); }; if (i < a.length - 1) this.trail.appendText('  ›  '); });
    // The agreement strip: a noun shows the describing words in its gender, and the other way round.
    this.plugin.paintAgreeBox(this.agree, this.path);
    void name;
  }
}

// ---------- Story Lines, Γιαγιά, Buzzer and Cousins live inside the vault and open here, offline, in the same page ----------
const APPV = 'greekquent-app';
const APPS = { story: { file: 'storylines.html', title: 'Story Lines', icon: 'clapperboard' }, giagia: { file: 'giagia.html', title: 'Γιαγιά', icon: 'gamepad-2' }, buzzer: { file: 'buzzer.html', title: 'Buzzer', icon: 'zap' }, cousins: { file: 'cousins.html', title: 'Cousins', icon: 'users' } };
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
    const f = c.createEl('iframe', { cls: 'gq-appframe', attr: { title: a.title, allow: 'microphone; autoplay' } });
    f.srcdoc = html;
  }
}


// ---------- Words tab: search on top, then the whole list (or the Word web) ----------
class WordsView extends ItemView {
  constructor(leaf, plugin) { super(leaf); this.plugin = plugin; }
  getViewType() { return WORDSV; }
  getDisplayText() { return 'Words'; }
  getIcon() { return 'list'; }
  async onOpen() { this.plugin.tourHit('words'); await this.plugin.renderWords(this.contentEl); }
  async onClose() { this.contentEl.empty(); }
}
// ---------- Class tab: this week's lesson, homework, practice together, the teacher ----------
class ClassView extends ItemView {
  constructor(leaf, plugin) { super(leaf); this.plugin = plugin; }
  getViewType() { return CLASSV; }
  getDisplayText() { return 'Class'; }
  getIcon() { return 'users'; }
  async onOpen() { this.plugin.tourHit('class'); await this.plugin.renderClass(this.contentEl); }
  async onClose() { this.contentEl.empty(); }
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
// ---------- Your world: a small pixel scene on the φόρα card ----------
// Green words build it (it never shrinks). φόρα only sets the mood: a quiet night, an evening, a sunny day, a festival.
const WORLDS = {
  village: { name: 'Village', eras: [
    { name: 'Ancient village', items: [['house', 'το σπίτι'], ['tree', 'η ελιά'], ['temple', 'ο ναός'], ['house', 'η αυλή'], ['amphora', 'ο αμφορέας'], ['temple', 'η αγορά']] },
    { name: 'Byzantine town', items: [['church', 'η εκκλησία'], ['house', 'το σπίτι'], ['cypress', 'το κυπαρίσσι'], ['house', 'ο φούρνος'], ['church', 'το μοναστήρι'], ['cypress', 'ο κήπος']] },
    { name: 'Island harbor', items: [['cube', 'το σπίτι'], ['mill', 'ο μύλος'], ['boat', 'η βάρκα'], ['cube', 'το καφενείο'], ['church', 'το εκκλησάκι'], ['boat', 'το καΐκι']] },
    { name: 'Modern city', items: [['block', 'η πολυκατοικία'], ['kiosk', 'το περίπτερο'], ['block', 'το γραφείο'], ['tree', 'το πάρκο'], ['block', 'το σχολείο'], ['bus', 'το λεωφορείο']] }] },
  grove: { name: 'Olive grove', eras: [
    { name: 'Young grove', items: [['sapling', 'το δεντράκι'], ['sapling', 'η ελιά'], ['sapling', 'το χώμα'], ['sapling', 'το νερό'], ['sapling', 'ο ήλιος'], ['sapling', 'το χωράφι']] },
    { name: 'First harvest', items: [['olives', 'οι ελιές'], ['basket', 'το καλάθι'], ['olives', 'το λιόδεντρο'], ['basket', 'το δίχτυ'], ['olives', 'η συγκομιδή'], ['donkey', 'το γαϊδουράκι']] },
    { name: 'The press', items: [['press', 'το λιοτρίβι'], ['olives', 'οι ελιές'], ['jar', 'το πιθάρι'], ['basket', 'το καλάθι'], ['jar', 'το λάδι'], ['donkey', 'το γαϊδουράκι']] },
    { name: 'The tasting', items: [['table', 'το τραπέζι'], ['bottle', 'το μπουκάλι'], ['olives', 'το λιόδεντρο'], ['bottle', 'το λάδι'], ['table', 'το ψωμί'], ['bottle', 'η γεύση']] }] },
  // Dance: the easiest world. Every φόρα point is a step (not only green words), and the floor fills with the dances you learn.
  dance: { name: 'Dance', eras: [{ name: 'Πανηγύρι', items: [] }] },
  pet: { name: 'Pet', eras: [
    { name: 'Little Φοράκι', items: [] }, { name: 'Φοράκι grows', items: [] }, { name: 'Φοράκι in a hat', items: [] }, { name: 'Φοράκι the great', items: [] }] },
};
const W_W = 160, W_H = 56;
function worldMood(today, score) { return score >= 25 || today >= 25 ? 3 : today >= 1 || score >= 10 ? 2 : score >= 3 ? 1 : 0; }
const MOODS = ['A quiet night', 'An evening', 'A sunny day', 'A festival'];
// The world grows fast at first and slower later: item k needs total x (k/23)^2 green words (3, 12, 26, 46, 71 ... 1,500).
// Each gap is a little longer than the one before (rewards that start often and thin out gradually), and early words count for more anyway.
const W_STAGES = 24;
const worldNeed = (k, total) => Math.max(k, Math.ceil(total * Math.pow(k / (W_STAGES - 1), 2)));
function worldStage(green, total) {
  let idx = 1; while (idx < W_STAGES && green >= worldNeed(idx, total)) idx++;
  const f = Math.max(0, Math.min(1, green / Math.max(1, total)));
  return { f, era: Math.floor((idx - 1) / 6), n: (idx - 1) % 6 + 1, idx, next: idx < W_STAGES ? worldNeed(idx, total) : 0 };
}
// Dance names, in the order you learn them. DANCE_PATH below has their real steps.
const DANCES = [[0, 'syrtos', 'ο συρτός'], [0, 'kalamatianos', 'ο καλαματιανός'], [0, 'tsamiko', 'το τσάμικο'], [0, 'hasapiko', 'το χασάπικο'], [0, 'zeibekiko', 'το ζεϊμπέκικο']];
// Now and then (about one day in four, after a first week) the καλαματιανός brings a guest dance from somewhere in Greece.
const GUEST_DANCES = [['ikariotiko', 'το ικαριώτικο'], ['pentozali', 'η πεντοζάλη'], ['ballos', 'ο μπάλος'], ['hasaposerviko', 'το χασαποσέρβικο'], ['pontiako', 'το ποντιακό'], ['sousta', 'η σούστα'], ['tsakonikos', 'ο τσακώνικος']];
// Learning a dance: every φόρα point is a step toward the dance you are learning, and a dance is learned after its real steps:
// ο συρτός 6 (its walking steps), ο καλαματιανός 12, το τσάμικο 12, το χασάπικο 21, το ζεϊμπέκικο 9 (one 9/8 figure, made up as you go).
// Points per step grow from 1 to 3 (1:1, 1:1, 2:1, 2:1, 3:1), so the first dances come within a day and later ones take longer.
// After all five the round starts again at 3 points a step, and each dance you learn again stacks (καλαματιανός x2).
// Total points: 6, 18, 42, 84, 111, then 180 more a round.
const DANCE_PATH = [['syrtos', 6, 1], ['kalamatianos', 12, 1], ['tsamiko', 12, 2], ['hasapiko', 21, 2], ['zeibekiko', 9, 3]];
function danceNow(total) {
  let left = Math.max(0, Math.floor(+total || 0)), learned = 0;
  for (let round = 0; round < 200; round++) for (let i = 0; i < DANCE_PATH.length; i++) {
    const [k, n, r0] = DANCE_PATH[i], r = round ? 3 : r0, cost = n * r;
    if (left < cost) return { k, n, r, steps: Math.floor(left / r), more: cost - left, learned, round };
    left -= cost; learned++;
  }
  return { k: 'zeibekiko', n: 9, r: 3, steps: 9, more: 0, learned, round: 200 };
}
const DANCE_NAME = Object.fromEntries([...DANCES.map(d => [d[1], d[2]]), ...GUEST_DANCES]);
const dayHash = t => { let h = 7; for (const ch of String(t)) h = (h * 31 + ch.charCodeAt(0)) % 100003; return h; };
// Words that sound almost the same (η ώρα, η χώρα) are kept apart when they are new.
const twinKey = p => fold(String(p).replace(/^Words\//, '').replace(/\.md$/, '')).replace(/^(ο|η|το|οι|τα) /, '');
function nearTwin(a, b) {
  const x = twinKey(a), y = twinKey(b); if (x.length < 3 || y.length < 3 || x === y || Math.abs(x.length - y.length) > 1) return false;
  let i = 0; while (i < x.length && x[i] === y[i]) i++;
  let j = 0; while (j < x.length - i && j < y.length - i && x[x.length - 1 - j] === y[y.length - 1 - j]) j++;
  return Math.max(x.length, y.length) - i - j <= 1;
}
function drawDancers(ctx, n, t) {
  const R = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };
  const cols = ['#1d4fa0', '#c0392b', '#2e7d32', '#7b3fa0', '#e0802a', '#1d4fa0', '#c0392b'], x0 = Math.round((W_W - n * 9) / 2) + Math.round(Math.sin(t * Math.PI * 2) * 3);
  for (let i = 0; i < n; i++) {
    const up = (Math.floor(t * 14) + i) % 2, x = x0 + i * 9, y = 44 - up;
    R(x + 1, y, 2, 2, '#f1c27d'); R(x, y + 2, 4, 5, cols[i % cols.length]); R(x + (up ? 0 : 1), y + 7, 1, 3, '#3a2a1a'); R(x + 3 - (up ? 0 : 1), y + 7, 1, 3, '#3a2a1a');
    if (i < n - 1) R(x + 4, y + 3, 5, 1, '#f1c27d');
  }
  R(x0 - 2, 44 - (Math.floor(t * 14) % 2), 2, 1, '#ffffff');   // the leader's handkerchief
}
function worldPaint(ctx, w, st, mood, t) {
  const R = (x, y, ww, hh, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), ww, hh); };
  const sky = [['#141b38', '#2a3466'], ['#5a4a8a', '#e9896a'], ['#5fb4f0', '#a9ddff'], ['#4aa8f0', '#bfe6ff']][mood];
  for (let y = 0; y < 44; y++) { const k = y / 43; const a = sky[0], b = sky[1]; const mix = i => Math.round(parseInt(a.substr(i, 2), 16) * (1 - k) + parseInt(b.substr(i, 2), 16) * k); ctx.fillStyle = `rgb(${mix(1)},${mix(3)},${mix(5)})`; ctx.fillRect(0, y, W_W, 1); }
  if (mood === 0) { for (const [x, y] of [[12, 6], [40, 12], [70, 4], [101, 9], [130, 5], [150, 14], [88, 16]]) if ((Math.floor(t * 6) + x) % 5) R(x, y, 1, 1, '#fff'); R(132, 6, 6, 6, '#f3efd1'); R(134, 6, 4, 4, '#141b38'); }
  else { const sy = mood === 1 ? 30 - t * 4 : 12 - t * 4, sx = mood === 1 ? 128 : 22; R(sx, sy, 8, 8, mood === 1 ? '#ffb347' : '#ffe14d'); R(sx - 1, sy + 1, 10, 6, mood === 1 ? '#ffb347' : '#ffe14d'); R(sx + 1, sy - 1, 6, 10, mood === 1 ? '#ffb347' : '#ffe14d'); }
  if (mood >= 2) for (const [x, y] of [[50, 8], [104, 14]]) { const cx = x + ((t * 10) % 20); R(cx, y, 14, 3, '#fff'); R(cx + 3, y - 2, 7, 2, '#fff'); }
  const sea = w === 'village' && st.era === 2;
  if (sea) { R(0, 40, 64, 16, '#2b7bb9'); for (let x = 0; x < 64; x += 8) R(x + ((t * 16) % 8), 44 + (x % 16 ? 0 : 4), 4, 1, '#8fd0ff'); R(64, 40, 96, 16, '#d9c79a'); R(64, 40, 96, 2, '#bba57a'); }
  else { const g = w === 'grove' ? ['#8a6a3a', '#6f5530'] : st.era === 3 && w === 'village' ? ['#9a9a9a', '#7c7c7c'] : ['#6aa84f', '#4f8a3a']; R(0, 42, W_W, 14, g[0]); R(0, 42, W_W, 2, g[1]); for (let x = 3; x < W_W; x += 11) R(x, 48 + (x % 3), 2, 1, g[1]); }
  const lit = mood <= 1 ? '#ffd860' : '#6b8fb3';
  const D = {
    house: (x, y) => { R(x, y - 10, 12, 10, '#e8d8b0'); R(x - 1, y - 14, 14, 4, '#c0502a'); R(x + 1, y - 16, 10, 2, '#c0502a'); R(x + 5, y - 5, 3, 5, '#6b4a2a'); R(x + 1, y - 8, 3, 2, lit); },
    temple: (x, y) => { R(x - 1, y - 2, 18, 2, '#e8e2d0'); for (let i = 0; i < 4; i++) R(x + 1 + i * 4, y - 12, 2, 10, '#f4f0e4'); R(x - 1, y - 14, 18, 2, '#e8e2d0'); R(x + 2, y - 17, 12, 3, '#e8e2d0'); R(x + 5, y - 19, 6, 2, '#e8e2d0'); },
    tree: (x, y) => { R(x + 4, y - 6, 2, 6, '#6b4a2a'); R(x, y - 13, 10, 7, '#5d8a3a'); R(x + 2, y - 15, 6, 2, '#5d8a3a'); R(x + 2, y - 11, 2, 1, '#8fbf5a'); },
    amphora: (x, y) => { R(x + 2, y - 8, 5, 7, '#c0602a'); R(x + 3, y - 10, 3, 2, '#c0602a'); R(x + 1, y - 9, 1, 3, '#c0602a'); R(x + 7, y - 9, 1, 3, '#c0602a'); R(x + 3, y - 1, 3, 1, '#c0602a'); R(x + 2, y - 5, 5, 1, '#1d1d1d'); },
    church: (x, y) => { R(x, y - 10, 14, 10, '#f4f0e4'); R(x + 3, y - 15, 8, 5, '#2f6fbf'); R(x + 5, y - 17, 4, 2, '#2f6fbf'); R(x + 6, y - 20, 2, 3, '#e0b030'); R(x + 5, y - 6, 4, 6, '#8a5a2a'); R(x + 2, y - 8, 2, 2, lit); R(x + 10, y - 8, 2, 2, lit); },
    cypress: (x, y) => { R(x + 3, y - 3, 2, 3, '#6b4a2a'); R(x + 2, y - 15, 4, 12, '#2f5a2a'); R(x + 3, y - 18, 2, 3, '#2f5a2a'); },
    cube: (x, y) => { R(x, y - 11, 12, 11, '#fbfbf4'); R(x, y - 12, 12, 1, '#dcdcd0'); R(x + 4, y - 6, 4, 6, '#2f6fbf'); R(x + 1, y - 9, 2, 2, '#2f6fbf'); R(x + 9, y - 9, 2, 2, '#2f6fbf'); },
    mill: (x, y, t) => { R(x + 2, y - 14, 8, 14, '#fbfbf4'); R(x + 1, y - 16, 10, 2, '#a0522d'); R(x + 5, y - 5, 2, 5, '#6b4a2a'); const a = t * 6, cx = x + 6, cy = y - 15; for (let k = 0; k < 4; k++) { const an = a + k * Math.PI / 2; for (let r = 2; r < 8; r++) R(cx + Math.cos(an) * r, cy + Math.sin(an) * r, 1, 1, '#d8cfb0'); } },
    boat: (x, y, t) => { const by = 46 + Math.round(Math.sin(t * 8 + x) * 1); const bx = x > 64 ? 10 + (x % 40) : x; R(bx, by, 14, 3, '#c0392b'); R(bx + 1, by + 3, 12, 1, '#8a2a20'); R(bx + 6, by - 8, 1, 8, '#6b4a2a'); R(bx + 7, by - 7, 5, 6, '#fbfbf4'); },
    block: (x, y) => { R(x, y - 22, 14, 22, '#cfcabd'); for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) R(x + 2 + c * 4, y - 20 + r * 4, 2, 2, (r + c + x) % 3 ? lit : '#5a7090'); },
    kiosk: (x, y) => { R(x, y - 9, 10, 9, '#3f8f5a'); R(x - 1, y - 11, 12, 2, '#e0b030'); R(x + 2, y - 7, 6, 3, '#fff2b0'); },
    bus: (x, y, t) => { const bx = 70 + ((t * 60) % 90) - 20; R(bx, y - 9, 20, 8, '#2f6fbf'); for (let i = 0; i < 4; i++) R(bx + 2 + i * 4, y - 8, 3, 3, '#cfe8ff'); R(bx + 3, y - 1, 3, 2, '#222'); R(bx + 14, y - 1, 3, 2, '#222'); },
    sapling: (x, y, t, k) => { const h = 3 + Math.min(8, k * 1.5); R(x + 4, y - h, 1, h, '#6b4a2a'); R(x + 2, y - h - 2, 5, 3, '#6aa84f'); },
    olives: (x, y) => { D.tree(x, y); for (const [a, b] of [[2, -12], [6, -10], [4, -8], [7, -13]]) R(x + a, y + b, 1, 1, '#3a2a4a'); },
    basket: (x, y) => { R(x + 1, y - 5, 8, 5, '#b8873a'); R(x + 2, y - 7, 6, 1, '#b8873a'); R(x + 2, y - 6, 6, 1, '#3a2a4a'); },
    donkey: (x, y, t) => { const dx = x + Math.round(Math.sin(t * 3) * 3); R(dx, y - 7, 10, 4, '#8a8a8a'); R(dx + 9, y - 10, 3, 4, '#8a8a8a'); R(dx + 9, y - 12, 1, 2, '#8a8a8a'); R(dx + 1, y - 3, 1, 3, '#5a5a5a'); R(dx + 8, y - 3, 1, 3, '#5a5a5a'); },
    press: (x, y, t) => { R(x, y - 12, 16, 12, '#d9c7a0'); R(x - 1, y - 14, 18, 2, '#a0522d'); const a = t * 5; R(x + 7 + Math.round(Math.cos(a) * 4), y - 7, 3, 3, '#7a7a7a'); R(x + 3, y - 4, 10, 2, '#8a6a3a'); },
    jar: (x, y) => { R(x + 1, y - 9, 7, 9, '#b0603a'); R(x + 2, y - 11, 5, 2, '#b0603a'); R(x + 2, y - 6, 5, 1, '#e8d8b0'); },
    table: (x, y) => { R(x, y - 6, 14, 2, '#8a5a2a'); R(x + 1, y - 4, 1, 4, '#6b4a2a'); R(x + 12, y - 4, 1, 4, '#6b4a2a'); R(x + 3, y - 8, 3, 2, '#e8c070'); R(x + 8, y - 9, 2, 3, '#7a9a2a'); },
    bottle: (x, y) => { R(x + 2, y - 9, 4, 9, '#5f7f1f'); R(x + 3, y - 12, 2, 3, '#5f7f1f'); R(x + 3, y - 13, 2, 1, '#c0392b'); R(x + 2, y - 6, 4, 2, '#f4f0e4'); },
  };
  if (w === 'pet') { petPaint(R, st, mood, t); return; }
  const items = WORLDS[w].eras[st.era].items.slice(0, st.n), slots = sea ? [70, 90, 110, 130, 76, 120] : [8, 32, 56, 82, 106, 132];
  items.forEach(([kind], i) => {
    const appear = Math.min(1, Math.max(0, (t - i * 0.08) * 5)); if (appear <= 0) return;
    const isNew = i === items.length - 1, hop = isNew ? -Math.round(Math.abs(Math.sin(Math.min(1, t * 1.6) * Math.PI * 2)) * 4 * (1 - Math.min(1, t))) : 0;
    let x = slots[i]; if (sea && kind === 'boat') x = i * 13 + 4;
    ctx.globalAlpha = appear; D[kind](x, 44 + hop, t, st.n); ctx.globalAlpha = 1;
    if (isNew && t > 0.4 && t < 0.9 && Math.floor(t * 20) % 2) { R(x + 6, 20 + hop, 1, 1, '#fff'); R(x + 2, 24, 1, 1, '#fff'); R(x + 11, 23, 1, 1, '#fff'); }
  });
  // A walker crosses, like the map in old console games.
  if (mood >= 1) { const px = Math.round(-6 + t * 172) % 172, leg = Math.floor(t * 12) % 2; R(px, 37, 3, 3, '#f0c8a0'); R(px, 40, 3, 4, w === 'grove' ? '#2f6fbf' : '#c0392b'); R(px + (leg ? 0 : 2), 44, 1, 2, '#333'); }
  if (mood === 3) for (let k = 0; k < 18; k++) { const cx = (k * 37 + t * 40) % W_W, cy = (k * 13 + t * 50) % 40; R(cx, cy, 2, 1, ['#e74c3c', '#f1c40f', '#2ecc71', '#3498db', '#fff'][k % 5]); }
}
function petPaint(R, st, mood, t) {
  const cx = 80, base = 44;
  if (st.f === 0) { const wob = Math.round(Math.sin(t * 20) * (t < 0.6 ? 1 : 0)); R(cx - 5 + wob, base - 14, 10, 14, '#fbf4e0'); R(cx - 6 + wob, base - 10, 12, 8, '#fbf4e0'); R(cx - 3 + wob, base - 9, 2, 2, '#e0b030'); R(cx + 2 + wob, base - 5, 2, 2, '#e0b030'); return; }
  const s = 1 + st.era * 0.35, hop = mood >= 2 ? Math.round(Math.abs(Math.sin(t * Math.PI * (mood === 3 ? 6 : 3))) * 5) : 0;
  const W = Math.round(14 * s), H = Math.round(12 * s), x = cx - W / 2, y = base - H - hop, fur = '#f2a65a', ear = '#d9823a';
  R(cx - W / 2 + 2, base, W - 4, 2, 'rgba(0,0,0,0.2)');
  R(x, y + 2, W, H - 2, fur); R(x + 1, y + 1, W - 2, 1, fur); R(x + 1, y - 2, 3, 3, ear); R(x + W - 4, y - 2, 3, 3, ear);
  R(x + 3, y + H - 4, W - 6, 3, '#fbe0c0');
  const blink = Math.floor(t * 10) % 9 === 0, ey = y + Math.round(H * 0.35);
  if (mood === 0 || blink) { R(x + 3, ey + 1, 3, 1, '#222'); R(x + W - 6, ey + 1, 3, 1, '#222'); }
  else { R(x + 3, ey, 2, 3, '#222'); R(x + W - 5, ey, 2, 3, '#222'); R(x + 3, ey, 1, 1, '#fff'); R(x + W - 5, ey, 1, 1, '#fff'); }
  R(cx - 1, ey + 3, 2, 1, mood >= 2 ? '#c0392b' : '#8a4a2a');
  R(x + 1, ey + 4, 2, 1, '#f08a8a'); R(x + W - 3, ey + 4, 2, 1, '#f08a8a');
  R(x + W, y + H - 6 + Math.round(Math.sin(t * 8)), 4, 2, fur);
  if (st.era === 2) { R(cx - 3, y - 4, 6, 2, '#2f6fbf'); R(cx - 1, y - 6, 2, 2, '#2f6fbf'); }
  if (st.era >= 3) { R(cx - 4, y - 8, 8, 2, '#e0b030'); R(cx - 4, y - 10, 2, 2, '#e0b030'); R(cx - 1, y - 11, 2, 3, '#e0b030'); R(cx + 2, y - 10, 2, 2, '#e0b030'); }
  if (mood === 0) for (let k = 0; k < 3; k++) { const zy = y - 6 - k * 5 - Math.round(t * 4); R(x + W + 3 + k * 3, zy, 3, 1, '#fff'); R(x + W + 5 + k * 3, zy + 1, 1, 1, '#fff'); R(x + W + 3 + k * 3, zy + 2, 3, 1, '#fff'); }
  if (mood === 3) for (let k = 0; k < 3; k++) { const ny = 20 - ((t * 30 + k * 10) % 18); R(30 + k * 40, ny, 2, 2, '#fff'); R(32 + k * 40, ny - 4, 1, 5, '#fff'); }
  // toys appear as the pet grows
  const toys = Math.min(5, Math.floor(st.f * 20));
  for (let k = 0; k < toys; k++) { const tx = [20, 130, 40, 112, 145][k]; R(tx, base - 4, 4, 4, ['#e74c3c', '#3498db', '#f1c40f', '#9b59b6', '#2ecc71'][k]); }
}

class PaperModal extends Modal {
  constructor(app, plugin, list) { super(app); this.plugin = plugin; this.list = list; this.i = 0; this.got = 0; this.miss = []; }
  onOpen() { this.contentEl.addClass('gq-modal', 'gq-paper-m'); this.titleEl.setText('Paper round'); this.draw(); }
  draw() {
    const c = this.contentEl; c.empty(); const P = this.plugin;
    if (this.i >= this.list.length) {
      P.paperDone = ymd(new Date()); P.progressFile().then(f => this.app.fileManager.processFrontMatter(f, fm => { fm.paper_done = P.paperDone; }));
      c.createDiv({ cls: 'gq-paper-big', text: this.got ? `${this.got} of ${this.list.length}` : 'Done' });
      c.createDiv({ cls: 'gq-hint', text: this.miss.length ? `Put these back in the red pile: ${this.miss.join(', ')}.` : 'Every card came back. Move a card up a pile by changing its color on its word note.' });
      const b = c.createEl('button', { text: 'Close', cls: 'mod-cta' }); b.onclick = () => this.close(); return;
    }
    const [w, pile] = this.list[this.i];
    c.createDiv({ cls: 'gq-hint', text: `Card ${this.i + 1} of ${this.list.length} · ${pile} pile` });
    const t = c.createDiv({ cls: 'gq-paper-big gq-say', text: w, attr: { lang: 'el', role: 'button', 'aria-label': 'Hear it' } }); t.onclick = () => say(w);
    c.createDiv({ cls: 'gq-hint', text: 'Find this card, say the other side out loud, then flip it.' });
    const row = c.createDiv('gq-row gq-paper-btns');
    const g = row.createEl('button', { text: 'Got it', cls: 'gq-c gq-green' }); g.onclick = () => { P.moAdd('recall', w); this.got++; this.next(); };
    const n = row.createEl('button', { text: 'Not yet', cls: 'gq-c gq-red' }); n.onclick = () => { this.miss.push(w); if (P.colorOf(w) && P.colorOf(w) !== 'red') P.setColor(w, 'red'); this.next(); };
    const s = row.createEl('button', { text: 'Not here' }); s.onclick = () => this.next();
  }
  next() { this.i++; this.draw(); }
  onClose() { this.contentEl.empty(); this.plugin.refreshToday && this.plugin.refreshToday(); }
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
        t.createDiv({ cls: 'gq-hit-sub', text: `${this.plugin.isKids ? '' : '#' + w.rank + '  '}Say your guess out loud, then reveal.` });
        const r = row.createEl('button', { text: 'Reveal' });
        r.onclick = () => { this.plugin.logLookup(q, w); this.plugin.moAdd('try', 'look:' + w.word); row.empty(); this.fill(row, w); };
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
    t.createDiv({ cls: 'gq-hit-sub', text: inList ? (this.plugin.isKids ? 'It is one of your words.' : `It is #${inList.rank} of the 1,500.`) : 'Bonus word, saved to Words I looked up.' });
    const btns = box.createDiv('gq-btns');
    const h = btns.createEl('button', { text: 'Hear it' }); h.onclick = () => say(gr);
    if (inList) { const g = btns.createEl('button', { text: 'Word web' }); g.onclick = () => { this.plugin.logLookup(q, inList); this.close(); this.plugin.openGraph(inList.path); }; }
    if (save) this.plugin.logLookup(q, inList || null, inList ? null : tr);
  }
  fill(row, w, q) {
    const t = row.createDiv('gq-hit-text');
    const m = t.createDiv({ cls: 'gq-hit-main' }); const c = this.plugin.colorOf(w.word); m.createSpan({ cls: 'gq-dot gq-' + (c || 'new'), attr: { 'aria-label': c ? c + ' word' : 'new word' } }); m.appendText(`${w.word}  ·  ${w.english}`);
    t.createDiv({ cls: 'gq-hit-sub', text: [w.pron ? 'say it: ' + w.pron : '', this.plugin.isKids ? '' : '#' + w.rank + ' of 1,500', w.form ? 'form: ' + w.form : ''].filter(Boolean).join('  ·  ') });
    if (w.cognates) t.createDiv({ cls: 'gq-hit-sub', text: `English cognates: ${w.cognates}${w.via ? '  (you typed a cousin: ' + w.via + ')' : ''}` });
    const g = row.createEl('button', { text: 'Word web' });
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
    send.onclick = async () => { this.plugin.moAdd('did', 'ask', 2); await this.plugin.shareQuestion(head + '\n' + this.box.value.trim() + '\n' + this.plugin.noteUrl(this.file)); this.close(); };
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
    this.registerView(WEB, leaf => new WordWebView(leaf, this));
    this.registerView(APPV, leaf => new AppView(leaf, this));
    this.registerView(MORE, leaf => new MoreView(leaf, this));
    this.registerView(WORDSV, leaf => new WordsView(leaf, this));
    this.registerView(CLASSV, leaf => new ClassView(leaf, this));
    // The graph redraws its labels now and then (zoom, new data). Put the agreeing forms back each time.
    this.registerInterval(window.setInterval(() => this.app.workspace.iterateAllLeaves(l => { if (l.gq && l.view && l.view.getViewType && l.view.getViewType() === 'localgraph') this.applyGraphLabels(l); }), 800));
    this.registerEvent(this.app.metadataCache.on('changed', f => { if (f.path.startsWith('Words/')) { this.infoCache = null; this.coCache = null; } }));
    // The in-vault games send results here instead of through an obsidian:// link.
    this.registerDomEvent(window, 'message', e => {
      const d = e.data; if (d && d.gq === 'said' && typeof d.w === 'string' && d.w) { this.moAdd('said', 'said:' + d.w.slice(0, 80)); return; }
      if (d && d.gq === 'mo' && typeof d.w === 'string' && d.w) { this.moAdd('recall', d.w.split(',')[0].trim().replace(/^(ο|η|το|οι|τα) /, '').slice(0, 80)); return; }
      if (!d || d.gq !== 'obsidian' || typeof d.url !== 'string') return;
      try { const u = new URL(d.url); const p = {}; u.searchParams.forEach((v, k) => { p[k] = v; }); this.fromGame(p); } catch (err) {}
    });
    // Left toolbar: four buttons. Today is the start screen; More holds the rest.
    this.addRibbonIcon('house', 'Today', () => this.openToday());
    // Words and Class show up once they have something in them (reveal by doing). Today and More are always there.
    this.rib = { words: this.addRibbonIcon('list', 'Words', () => this.openWords()), class: this.addRibbonIcon('users', 'Class', () => this.openClass()) };
    this.tabsSync();
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
    this.registerMarkdownPostProcessor((el, ctx) => this.stackTables(el, ctx));
    this.addCommand({ id: 'more-on-page', name: 'More on this page', callback: () => this.showMore() });
    this.addCommand({ id: 'add-to-card', name: 'Add a chunk or sentence to this word', callback: () => { const f = this.app.workspace.getActiveFile(); if (!f || !f.path.startsWith('Words/')) { new Notice('Open a word note first.'); return; } new CardModal(this.app, this, f.basename).open(); } });
    this.registerObsidianProtocolHandler('greekquent', p => p.open ? this.openApp(p.open, p.hash || '') : this.fromGame(p));
    this.registerEvent(this.app.workspace.on('file-open', f => { if (f && f.path === TODAY) this.refreshToday(); }));
    // Where you left off: the last lesson or article (and its section), game, or Word web word. Today offers it back in one tap.
    this.registerEvent(this.app.workspace.on('file-open', f => { if (f && (this.isStudentScript(f.path) || (f.path.startsWith(EXTRAS) && f.path.split('/').length === 2 && !/What's New|Index/.test(f.path)))) this.whereSet({ kind: 'page', path: f.path, label: f.basename.replace(/^\d\d /, '').replace(/-student$/, '') }); }));
    this.registerDomEvent(document, 'scroll', e => {
      clearTimeout(this.whereT); const el = e.target; if (!el || !el.querySelectorAll) return;
      this.whereT = setTimeout(() => {
        const w = this.whereGet(), f = this.app.workspace.getActiveFile(); if (!w || w.kind !== 'page' || !f || f.path !== w.path) return;
        const top = el.getBoundingClientRect ? el.getBoundingClientRect().top : 0; let h = '';
        for (const x of el.querySelectorAll('h2')) { if (x.getBoundingClientRect().top - top < 140) h = x.textContent.trim(); else break; }
        if (h !== (w.h || '')) this.whereSet({ ...w, h, label: f.basename.replace(/^\d\d /, '').replace(/-student$/, '') + (h ? ' · ' + h : '') });
      }, 700);
    }, true);
    this.applyCalm();
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
    this.hideLinkedView();
    this.addCommand({ id: 'open-word-graph', name: 'Open word web', callback: () => this.openGraph() });
    this.registerEvent(this.app.workspace.on('file-menu', (menu, file) => {
      if (file && file.path && file.path.startsWith('Words/')) menu.addItem(i => i.setTitle('Open word web').setIcon('git-fork').onClick(() => this.openGraph(file.path)));
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
    if (which !== 'story') this.tourHit('game');
    const ws = this.app.workspace, leaf = this.mainLeaf(false);
    const names = { giagia: 'the Γιαγιά game', buzzer: 'the buzzer game', cousins: 'the cousins game', story: 'the story cartoon', storylines: 'Story Lines' };
    if (names[which]) this.whereSet({ kind: 'app', app: which, hash: hash || '', label: names[which] });
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
  paintAgree(leaf, path) { const st = this.graphState(leaf); if (st.agree) this.paintAgreeBox(st.agree, path); }
  paintAgreeBox(box, path) {
    box.empty(); box.hide();
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
    this.moAdd(own ? 'own' : 'built', gr);
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
    this.tourHit('web');
    const ws = this.app.workspace;
    const a = ws.getActiveFile();
    const file = this.wordPath(path || (a ? a.path : ''));
    let leaf = ws.getLeavesOfType(WEB).find(l => l.getRoot() === ws.rootSplit);
    if (!leaf) leaf = this.mainLeaf(true);
    if (ws.leftSplit && !ws.leftSplit.collapsed) ws.leftSplit.collapse();
    if (ws.rightSplit && !ws.rightSplit.collapsed) ws.rightSplit.collapse();
    try {
      // A tab Obsidian has not loaded yet (deferred) has no web inside it; load it first.
      if (leaf.isDeferred && leaf.loadIfDeferred) await leaf.loadIfDeferred();
      if (leaf.view && leaf.view.getViewType() === WEB && typeof leaf.view.go === 'function') { ws.setActiveLeaf(leaf, { focus: true }); ws.revealLeaf(leaf); await leaf.view.go(file); return; }
      await leaf.setViewState({ type: WEB, active: true, state: { path: file } });
      ws.revealLeaf(leaf);
      if (leaf.view && typeof leaf.view.go === 'function' && leaf.view.path !== file) await leaf.view.go(file);
    } catch (e) { console.error('Greekquent word web', e); new Notice('The word web could not open this word (' + String((e && e.message) || e).slice(0, 120) + '). Send your teacher a screenshot of this message.', 15000); }
  }
  // Obsidian's own "Open linked view" (local graph, backlinks, outline) only confuses here; the Word web replaces it.
  hideLinkedView() {
    const proto = Menu.prototype, plugin = this, NO = /^open (linked view|local graph|backlinks|outgoing links|outline|linked mentions)/i;
    const clean = menu => {
      if (!menu || !Array.isArray(menu.items)) return;
      menu.items = menu.items.filter(it => { const tx = ((it.titleEl || it.dom || {}).textContent || '').trim(); if (NO.test(tx)) { if (it.dom) it.dom.remove(); return false; } return true; });
      // Drop a separator left doubled or dangling at either end.
      const isSep = it => it && !it.titleEl && it.dom && it.dom.classList && it.dom.classList.contains('menu-separator');
      menu.items = menu.items.filter((it, i, a) => { const drop = isSep(it) && (i === 0 || i === a.length - 1 || isSep(a[i - 1])); if (drop && it.dom) it.dom.remove(); return !drop; });
    };
    for (const m of ['showAtPosition', 'showAtMouseEvent']) {
      const orig = proto[m]; if (typeof orig !== 'function' || orig.gqWrapped) continue;
      const wrap = function (...a) { try { clean(this); } catch (e) {} return orig.apply(this, a); };
      wrap.gqWrapped = true; proto[m] = wrap;
      plugin.register(() => { if (proto[m] === wrap) proto[m] = orig; });
    }
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
      // Taps on the bar are the bar's alone: they don't reach the graph's pan and zoom or the phone's swipe for side panels.
      for (const ev of ['pointerdown', 'mousedown', 'touchstart', 'touchmove', 'wheel']) wrap.addEventListener(ev, e => e.stopPropagation(), { passive: true });
      st.back = bar.createEl('button', { text: '←', attr: { 'aria-label': 'Back' } });
      st.fwd = bar.createEl('button', { text: '→', attr: { 'aria-label': 'Forward' } });
      st.title = bar.createDiv('gq-web-title');
      const sayb = bar.createEl('button', { text: 'Hear it', attr: { 'aria-label': 'Say the word' } });
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
      sayb.onclick = () => { const f = this.app.vault.getAbstractFileByPath(st.hist[st.pos]); if (f) say(f.basename); };
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
    if (f) st.title.setText(`${f.basename}${fm.english ? ' · ' + fm.english : ''}${fm.pronunciation ? ' · say it: ' + fm.pronunciation : ''}${fm.rank && !this.isKids ? ' · #' + fm.rank : ''}`);
    st.back.disabled = st.pos <= 0; st.fwd.disabled = st.pos >= st.hist.length - 1;
    st.trail.setText(st.hist.slice(Math.max(0, st.pos - 6), st.pos + 1).map(h => h.replace(/^Words\//, '').replace(/\.md$/, '')).join('  ›  '));
    if (!document.body.classList.contains('is-mobile')) box.focus();
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
    const md = this.moData().days, mo = this.moScore(md), w7 = new Date(); w7.setDate(w7.getDate() - 7);
    this.moAdd('did', 'homework', 3); this.moFlush();
    window.open(smsLink(`Greekquent homework (${f.basename}):\n${body}\n\nΦόρα ${mo} (${mo - this.moScore(md, w7) >= 0 ? '+' : ''}${mo - this.moScore(md, w7)} this week)`));
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
      for (const p of Object.keys(mine.files || {})) if (!man.files[p] && !KEEP_LOCAL(p) && await ad.exists(p)) {
        // A note someone wrote in is moved into My Work instead of deleted.
        let edited = false; if (p.endsWith('.md')) { try { edited = (await this.sha(await ad.readBinary(p))) !== mine.files[p].sha256; } catch (e) {} }
        if (edited) { const q = MY_WORK + 'Kept from updates/' + p, d = q.split('/').slice(0, -1).join('/'); try { if (!(await ad.exists(d))) await ad.mkdir(d); if (!(await ad.exists(q))) { await ad.write(q, await ad.read(p)); } } catch (e) { continue; } }
        await ad.remove(p); removed++; gone.push(p);
      }
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
    m.addItem(i => i.setTitle('Words').setIcon('list').onClick(() => this.openWords()));
    m.addItem(i => i.setTitle('Class').setIcon('users').onClick(() => this.openClass()));
    m.addItem(i => i.setTitle('Ask').setIcon('message-circle').onClick(() => this.ask()));
    m.addSeparator();
    m.addItem(i => i.setTitle('More').setIcon('more-horizontal').onClick(() => this.moreMenu()));
    const r = anchor.getBoundingClientRect();
    m.showAtPosition({ x: r.left, y: r.top });
  }
  // ---------- More menu (left toolbar) ----------
  moreMenu(evt) {
    const m = new Menu();
    if (document.body.classList.contains('gq-nonav')) m.addItem(i => i.setTitle('Today').setIcon('house').onClick(() => this.openToday()));
    m.addItem(i => i.setTitle('More on this page').setIcon('panel-right').onClick(() => this.showMore()));
    m.addItem(i => i.setTitle('Look up a word').setIcon('search').onClick(() => new LookupModal(this.app, this).open()));
    m.addItem(i => i.setTitle('Word web').setIcon('git-fork').onClick(() => this.openGraph()));
    m.addItem(i => i.setTitle('Ask about this note').setIcon('message-circle').onClick(() => this.ask()));
    m.addItem(i => i.setTitle('Send homework').setIcon('send').onClick(() => this.sendHomework()));
    m.addSeparator();
    m.addItem(i => i.setTitle('Share feedback').setIcon('message-square').onClick(() => this.feedback()));
    m.addItem(i => i.setTitle("What's new").setIcon('sparkles').onClick(() => this.openNote(WHATS_NEW)));
    m.addItem(i => i.setTitle('Setting up').setIcon('help-circle').onClick(() => this.openNote(SETUP)));
    m.addItem(i => i.setTitle(this.tourLeft() ? 'Take the tour' : 'Take the tour again').setIcon('map').onClick(() => this.tourStart()));
    m.addItem(i => i.setTitle('Update vault').setIcon('refresh-cw').onClick(() => this.updateVault(false)));
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
    return { red: list('red'), yellow: list('yellow'), green: list('green'), setup_seen: !!fm.setup_seen, world: typeof fm.world === 'string' ? fm.world : '', fiay: fm.fiay === true || fm.fiay === 'on', scripts: this.scriptsNow || (fm.scripts === 'intermediate' ? 'intermediate' : 'beginner'), last_beat: Math.max(0, parseInt(fm.last_beat, 10) || 0), story_at: fm.story_at === undefined || fm.story_at === null || fm.story_at === '' ? null : Math.max(0, parseInt(fm.story_at, 10) || 0), track: String(fm.track || ''), tabs: '' };
  }
  cards() { const f = this.app.vault.getAbstractFileByPath(PROGRESS); const fm = f ? ((this.app.metadataCache.getFileCache(f) || {}).frontmatter || {}) : {}; return this.cardsNow || (Array.isArray(fm.cards) ? fm.cards.map(String) : []); }
  async setCard(word, on) {
    const f = await this.progressFile(); let list = [];
    await this.app.fileManager.processFrontMatter(f, fm => { list = Array.isArray(fm.cards) ? fm.cards.map(String).filter(w => w !== word) : []; if (on) list.push(word); fm.cards = list; });
    this.cardsNow = list; setTimeout(() => { this.cardsNow = null; }, 3000);
    if (on) this.moAdd('card', word);
    this.paintBars();
  }
  cardPhoto(word) { return CARD_DIR + word.replace(/[\\/:*?"<>|#^\[\]]/g, '_') + '.jpg'; }
  // A photo of the card, made small (about 40 KB) so it fits on any phone.
  pickPhoto(word, done) {
    const inp = createEl('input', { attr: { type: 'file', accept: 'image/*', capture: 'environment' } });
    inp.onchange = async () => {
      const file = inp.files && inp.files[0]; if (!file) return;
      try {
        const url = URL.createObjectURL(file), img = new Image();
        await new Promise((ok, bad) => { img.onload = ok; img.onerror = bad; img.src = url; });
        const k = Math.min(1, 640 / Math.max(img.width, img.height)), cv = createEl('canvas');
        cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k); cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height); URL.revokeObjectURL(url);
        const blob = await new Promise(r => cv.toBlob(r, 'image/jpeg', 0.7)), buf = await blob.arrayBuffer();
        const ad = this.app.vault.adapter; if (!(await ad.exists(CARD_DIR.slice(0, -1)))) await ad.mkdir(CARD_DIR.slice(0, -1));
        await ad.writeBinary(this.cardPhoto(word), buf); this.photoT = Date.now();
        new Notice('Card photo saved.'); done && done();
      } catch (e) { new Notice('That photo did not save. Try again, or skip it. The paper card is what counts.'); }
    };
    inp.click();
  }
  colorOf(word) { const c = this.colors(); return COLORS.map(x => x[0]).find(k => c[k].includes(word)) || ''; }
  async progressFile() {
    let f = this.app.vault.getAbstractFileByPath(PROGRESS);
    if (f) return f;
    if (!this.app.vault.getAbstractFileByPath(MY_WORK.slice(0, -1))) await this.app.vault.createFolder(MY_WORK.slice(0, -1));
    return this.app.vault.create(PROGRESS, '---\nred: []\nyellow: []\ngreen: []\n---\n# My progress\n\nYour word colors live in this note. Change them with the color buttons on any word note: red = don\'t have it, yellow = kind of, green = have it. Tap a color again to clear it. The Today page counts them.\n');
  }
  // ---------- Momentum ----------
  moData() {
    const f = this.app.vault.getAbstractFileByPath(MO_FILE);
    const fm = f ? ((this.app.metadataCache.getFileCache(f) || {}).frontmatter || {}) : {};
    const obj = k => (fm[k] && typeof fm[k] === 'object' && !Array.isArray(fm[k])) ? fm[k] : {};
    const mem = this.moMem && Date.now() - this.moMem.t < 15000 ? this.moMem : null;
    return { days: mem ? mem.days : obj('days'), got: obj('got'), up: obj('up'), met: obj('met'), dance: mem && mem.dance ? mem.dance : obj('dance'), steps: mem && mem.steps !== undefined ? +mem.steps : (fm.steps !== undefined && fm.steps !== null && Number.isFinite(+fm.steps) ? +fm.steps : Object.values(obj('days')).reduce((a, v) => a + (+v || 0), 0)), firsts: mem && mem.firsts ? mem.firsts : obj('firsts') };
  }
  // φόρα on a day = sum of each day's points x (6/7)^(days since).
  moScore(days, at) {
    const t = at || new Date(); t.setHours(12, 0, 0, 0); let m = 0;
    for (const [d, p] of Object.entries(days || {})) { const [y, mo, da] = d.split('-').map(Number); const k = Math.round((t - new Date(y, mo - 1, da, 12)) / 864e5); if (k >= 0) m += (+p || 0) * Math.pow(MO_KEEP, k); }
    return Math.round(m);
  }
  moAdd(kind, key, extra) { this.tourEv(kind, String(key || '')); (this.moQ = this.moQ || []).push([kind, String(key || ''), extra || '']); clearTimeout(this.moT); this.moT = setTimeout(() => this.moFlush(), 1200); }
  async moFlush() {
    const q = this.moQ || []; this.moQ = []; if (!q.length) return;
    let f = this.app.vault.getAbstractFileByPath(MO_FILE);
    if (!f) {
      if (!this.app.vault.getAbstractFileByPath(MY_WORK.slice(0, -1))) await this.app.vault.createFolder(MY_WORK.slice(0, -1));
      f = await this.app.vault.create(MO_FILE, '---\ndays: {}\n---\n# My momentum\n\nΠήρες φόρα; This note keeps your φόρα (momentum). The app fills it in, so there is nothing to type here.\n\n- Getting a word right again on a later day: 3. The first time: 1. The same word twice in one day: 0.\n- A color you moved up that is still right two days later: 5. A word you mark for the first time: 1.\n- Your own sentence in My pairs: 3. A built one: 1. A story puzzle line: 1, or 3 on a later day.\n- Comebacks, today\'s line and the rally: Had it counts like a word. Not yet: 1 for trying.\n- A finished read-through, rally swap, song or kid card: 2. Homework sent: 3. A question to the class: 2. Once a day each.\n- Guess first in Look up: 1. A new word in the Word web: 1, up to 5 a day.\n- At most 40 a day. Each day off, your φόρα fades by a seventh, so it comes back fast.\n');
    }
    const today = ymd(new Date()), gap = d => { const [a, b, c] = String(d).split('-').map(Number); const n = new Date(); n.setHours(12, 0, 0, 0); return Math.round((n - new Date(a, b - 1, c, 12)) / 864e5); };
    let gained = 0; const danced = [];
    await this.app.fileManager.processFrontMatter(f, fm => {
      for (const k of ['days', 'got', 'up', 'met', 'made', 'tried', 'did', 'web', 'said']) if (!fm[k] || typeof fm[k] !== 'object' || Array.isArray(fm[k])) fm[k] = {};
      // tried and did only need today; yesterday's entries go.
      for (const k of ['tried', 'did', 'said']) for (const x of Object.keys(fm[k])) if (fm[k][x] !== today) delete fm[k][x];
      let pts = 0;
      for (const [kind, key, extra] of q) {
        if (kind === 'recall') {
          const last = fm.got[key]; if (last !== today) pts += last ? 3 : 1; fm.got[key] = today;
          if (fm.up[key] && gap(fm.up[key]) >= 2) { pts += 5; delete fm.up[key]; }
        } else if (kind === 'up') { if (!fm.met[key]) { fm.met[key] = today; pts += 1; } fm.up[key] = today; }
        else if (kind === 'down') delete fm.up[key];
        else if (kind === 'own') pts += 3;
        else if (kind === 'built') pts += 1;
        else if (kind === 'card') { if (!fm.made[key]) { fm.made[key] = today; pts += 1; } }
        // Tried from memory but missed it: 1, once a day per item. Trying is the work that makes it stick.
        else if (kind === 'try') { if (fm.tried[key] !== today && fm.got[key] !== today) { fm.tried[key] = today; pts += 1; } }
        // Finished something (a read-through, the rally, the song, homework sent): its points, once a day.
        else if (kind === 'did') { if (fm.did[key] !== today) { fm.did[key] = today; pts += Math.max(1, Math.min(5, +extra || 1)); } }
        // Said out loud and the phone heard it: 2, once a day per word or line, up to 8 a day.
        else if (kind === 'said') { const n = Object.keys(fm.said).length; if (!fm.said[key] && n < 8) { fm.said[key] = today; pts += 2; } }
        // A new word explored in the Word web: 1, once per word, up to 5 a day.
        else if (kind === 'web') { const n = Object.values(fm.web).filter(d => d === today).length; if (!fm.web[key] && n < 5) { fm.web[key] = today; pts += 1; } }
      }
      // Steps carry across days (fm.steps never resets). The first time, start from the points already in My momentum, quietly.
      if (!Number.isFinite(+fm.steps) || fm.steps === null || fm.steps === '') fm.steps = Object.values(fm.days || {}).reduce((a, v) => a + (+v || 0), 0);
      const before = +fm.days[today] || 0, now = Math.min(MO_CAP, before + pts); gained = now - before;
      if (now) fm.days[today] = now;
      for (const d of Object.keys(fm.days)) if (gap(d) > 60) delete fm.days[d];
      // Steps: finishing a dance's real steps adds it to the collection and dates the first time. A guest dance can still visit on a big day.
      for (const k of ['dance', 'firsts', 'danced']) if (!fm[k] || typeof fm[k] !== 'object' || Array.isArray(fm[k])) fm[k] = {};
      const add = k => { if (fm.danced[k] === today) return; fm.danced[k] = today; fm.dance[k] = (+fm.dance[k] || 0) + 1; if (!fm.firsts[k]) fm.firsts[k] = today; danced.push(DANCE_NAME[k]); };
      const was = danceNow(fm.steps); fm.steps = (+fm.steps || 0) + gained; const is = danceNow(fm.steps);
      for (let j = was.learned; j < is.learned; j++) { const k = DANCE_PATH[j % DANCE_PATH.length][0]; fm.dance[k] = (+fm.dance[k] || 0) + 1; if (!fm.firsts[k]) fm.firsts[k] = today; danced.push(DANCE_NAME[k]); }
      if (now >= 12 && Object.keys(fm.days).length >= 7 && dayHash(today) % 4 === 0) add(GUEST_DANCES[dayHash(today + 'g') % GUEST_DANCES.length][0]);
      this.moMem = { days: { ...fm.days }, steps: fm.steps, dance: { ...fm.dance }, firsts: { ...fm.firsts }, t: Date.now() };
    });
    if (danced.length) this.danceAt = Date.now();
    if (gained) { this.moPaint(); this.moToast(gained, danced.length ? 'you danced ' + danced.join(' and ') : ''); }
  }
  // A small "+3 φόρα" at the top for a moment, so the points are felt where the work happens.
  moToast(n, extra) {
    const old = document.querySelector('.gq-mo-toast'); if (old) old.remove();
    const t = document.body.createDiv({ cls: 'gq-mo-toast' + (extra ? ' is-dance' : ''), text: `+${n} φόρα` + (extra ? ' · ' + extra : ''), attr: { role: 'status' } });
    const k = extra ? 2800 : 1300; setTimeout(() => t.addClass('is-out'), k); setTimeout(() => t.remove(), k + 400);
  }
  // "We did it" on a kid card: 2 φόρα, once a day.
  didBtn(c, key) { const b = c.createDiv('gq-row').createEl('button', { text: 'We did it', cls: 'gq-mini' }); b.onclick = () => { this.moAdd('did', key, 2); b.setText('Done today'); b.disabled = true; }; }
  // After a reveal: did you have it? Had it counts as recall; Not yet still earns a point for trying.
  hadIt(r, key, after) {
    const y = r.createEl('button', { text: 'Had it', cls: 'mod-cta' }); const n = r.createEl('button', { text: 'Not yet' });
    y.onclick = () => { this.moAdd('recall', key); after(); }; n.onclick = () => { this.moAdd('try', key); after(); };
  }
  async setWorld(w) { this.worldNow = w; if (w) this.tourHit('world'); const f = await this.progressFile(); await this.app.fileManager.processFrontMatter(f, fm => { if (w) fm.world = w; else delete fm.world; }); this.moPaint(); }
  worldDraw(c, todayPts, score) {
    const w = this.worldNow !== undefined ? this.worldNow : this.colors().world;
    if (!w || !WORLDS[w]) {
      const r = c.createDiv('gq-world-pick'); r.createSpan({ cls: 'gq-hint', text: 'Pick a world to grow: ' });
      for (const k of ['dance', 'village', 'grove', 'pet']) { const b = r.createEl('button', { text: WORLDS[k].name, cls: 'gq-mini' }); b.onclick = () => this.setWorld(k); }
      return;
    }
    if (w === 'dance') { this.danceWorld(c, todayPts, score); return; }
    if (!this.words && !this.worldWait) { this.worldWait = true; this.wordIndex().then(() => this.moPaint()); }
    const total = this.words ? this.words.length : 1500, green = this.colors().green.length, st = worldStage(green, total), mood = worldMood(todayPts, score);
    const box = c.createDiv('gq-world'), cv = box.createEl('canvas', { cls: 'gq-world-cv', attr: { width: W_W, height: W_H, role: 'img', 'aria-label': `${WORLDS[w].eras[st.era].name}. ${MOODS[mood]}.` } });
    const ctx = cv.getContext('2d'); if (!ctx) return; ctx.imageSmoothingEnabled = false;
    const items = w === 'pet' ? [] : WORLDS[w].eras[st.era].items.slice(0, st.n);
    const cap = box.createDiv({ cls: 'gq-hint gq-world-cap' });
    const name = w === 'pet' ? (st.f === 0 ? 'An egg. Turn a word green to hatch it' : WORLDS.pet.eras[st.era].name) : WORLDS[w].eras[st.era].name;
    cap.appendText(`${name} · ${MOODS[mood].toLowerCase()} · ${st.idx} of ${W_STAGES}`);
    const more = st.next - green;
    cap.appendText(st.next ? ` · ${more} more green word${more === 1 ? '' : 's'} to grow` : ' · all grown. Θα τα πούμε.');
    // A new piece of the world: say its name, and date it in My momentum so the teacher can see how the pace feels.
    if (this.words) {
      const fs = this.moData().firsts || {}, top = Math.max(1, ...Object.keys(fs).filter(k => k.startsWith('world ')).map(k => +k.slice(6) || 0));
      if (st.idx > top && this.worldRec !== st.idx) {
        this.worldRec = st.idx; const it = items[st.n - 1];
        if (top > 1 || st.idx > 2) cap.prepend(createSpan({ cls: 'gq-world-new', text: w === 'pet' ? 'Φοράκι grew. ' : `New: ${it ? it[1] : WORLDS[w].eras[st.era].name}. ` }));
        const f = this.app.vault.getAbstractFileByPath(MO_FILE);
        if (f) this.app.fileManager.processFrontMatter(f, fm => { if (!fm.firsts || typeof fm.firsts !== 'object' || Array.isArray(fm.firsts)) fm.firsts = {}; for (let k = top + 1; k <= st.idx; k++) if (!fm.firsts['world ' + k]) fm.firsts['world ' + k] = ymd(new Date()); }).catch(() => {});
      }
    }
    const word = box.createDiv({ cls: 'gq-world-say', attr: { lang: 'el' } });
    const greens = this.colors().green; let k = 0;
    const speak = () => {
      const list = w === 'pet' ? (greens.length ? greens : ['γεια σου']) : items.map(x => x[1]);
      if (!list.length) return; const t = list[(k++ + Math.floor(Math.random() * list.length)) % list.length];
      word.setText(w === 'pet' ? `Φοράκι says: ${t}` : t); say(t);
    };
    const reduce = (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) || this.calmOn();
    // Today's dances step across the front of the world: two dancers, plus one for each dance done today.
    const nd = danceNow(this.moData().steps).learned, crew = nd ? Math.min(7, 2 + nd) : 0, long = Date.now() - (this.danceAt || 0) < 8000;
    const run = () => {
      cancelAnimationFrame(cv._raf); const t0 = performance.now(), dur = long && crew ? 6000 : 3000;
      const step = now => { const t = Math.min(1, (now - t0) / dur); worldPaint(ctx, w, st, mood, t); if (crew) drawDancers(ctx, crew, t * dur / 3000); if (t < 1 && cv.isConnected) cv._raf = requestAnimationFrame(step); };
      if (reduce) { worldPaint(ctx, w, st, mood, 1); if (crew) drawDancers(ctx, crew, 1); } else { step(t0); }
    };
    cv.onclick = () => { run(); speak(); };
    run();
  }
  // The Dance world: a festival floor. One dancer for you, one more for each dance learned (up to 7).
  // Under them, one mark for each step of the dance you are learning; tap and they dance the steps you have so far.
  danceWorld(c, todayPts, score) {
    const d = danceNow(this.moData().steps), mood = worldMood(todayPts, score), name = DANCE_NAME[d.k], crew = Math.min(7, 1 + d.learned);
    const box = c.createDiv('gq-world'), cv = box.createEl('canvas', { cls: 'gq-world-cv', attr: { width: W_W, height: W_H, role: 'img', 'aria-label': `Πανηγύρι. Learning ${name}: step ${d.steps} of ${d.n}.` } });
    const ctx = cv.getContext('2d'); if (!ctx) return; ctx.imageSmoothingEnabled = false;
    const cap = box.createDiv({ cls: 'gq-hint gq-world-cap' }); cap.appendText('Learning ');
    const nm = cap.createSpan({ cls: 'gq-say', text: name, attr: { lang: 'el' } }); nm.onclick = () => say(name);
    cap.appendText(` · step ${d.steps} of ${d.n} · ${d.r === 1 ? 'every φόρα point is a step' : d.r + ' φόρα a step'} · ${d.more} more to learn it`);
    if (d.learned) cap.appendText(` · ${d.learned} learned`);
    const st = { era: 0, n: 0, idx: 1, f: 0 }, R = (x, y, ww, hh, col) => { ctx.fillStyle = col; ctx.fillRect(Math.round(x), Math.round(y), ww, hh); };
    const marks = t => {
      for (let x = 4; x < W_W; x += 10) R(x, 3 + (x % 20 ? 1 : 0), 2, 2, ['#ffd860', '#ff7a6b', '#8fd0ff'][(x / 10 | 0) % 3]);   // festival lights
      const gap = Math.min(7, Math.floor((W_W - 8) / d.n)), x0 = Math.round((W_W - gap * d.n) / 2), lit = Math.round(d.steps * Math.min(1, t));
      for (let i = 0; i < d.n; i++) R(x0 + i * gap, 52, gap - 2, 2, i < lit ? '#ffd860' : 'rgba(0,0,0,0.35)');
    };
    const reduce = (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) || this.calmOn();
    const run = () => {
      cancelAnimationFrame(cv._raf); const t0 = performance.now(), dur = Math.max(1200, d.steps * 420);
      const frame = now => { const t = Math.min(1, (now - t0) / dur); worldPaint(ctx, 'dance', st, mood, 1); marks(t); drawDancers(ctx, crew, d.steps ? t * d.steps / 7 : 0); if (t < 1 && cv.isConnected) cv._raf = requestAnimationFrame(frame); };
      if (reduce) { worldPaint(ctx, 'dance', st, mood, 1); marks(1); drawDancers(ctx, crew, 0); } else frame(t0);
    };
    cv.onclick = () => { run(); say(name); };
    run();
  }
  // The card at the top of Today. The same question the teacher asks in class.
  moCard(box) {
    const c = box.createDiv('gq-tcard gq-mo'); c.dataset.tour = 'mo'; this.moEl = c; this.moDraw(c);
  }
  // Redraw every φόρα card on screen. Obsidian can build Today twice at once, so a single saved element
  // may be the copy that was thrown away; points and a new world would then land where nobody sees them.
  moPaint() { const els = new Set([...document.querySelectorAll('.gq-tcard.gq-mo')]); if (this.moEl && this.moEl.isConnected) els.add(this.moEl); for (const c of els) this.moDraw(c); }
  moDraw(c) {
    c.empty(); const { days } = this.moData(), now = new Date(), m = this.moScore(days, new Date());
    // Before the first point: one quiet line. The full card (world, bars) arrives with the first φόρα.
    if (!Object.keys(days || {}).length) {
      c.addClass('is-fresh'); const top = c.createDiv('gq-mo-top');
      const q = top.createDiv({ cls: 'gq-mo-q gq-say', text: 'Πήρες φόρα;', attr: { lang: 'el', role: 'button', 'aria-label': 'Hear it' } }); q.onclick = () => say('Πήρες φόρα;');
      top.createDiv({ cls: 'gq-mo-n', text: '0', attr: { 'aria-label': 'Momentum 0' } });
      this.worldDraw(c, 0, 0);
      c.createDiv({ cls: 'gq-hint', text: 'φόρα means momentum. Do the story puzzle to start your world. Every point is a step: 6 steps and you know ο συρτός.' });
      return;
    }
    c.removeClass('is-fresh');
    const wk = new Date(); wk.setDate(wk.getDate() - 7); const gain = m - this.moScore(days, wk), todayPts = +days[ymd(now)] || 0;
    const top = c.createDiv('gq-mo-top');
    const q = top.createDiv({ cls: 'gq-mo-q gq-say', text: 'Πήρες φόρα;', attr: { lang: 'el', role: 'button', 'aria-label': 'Hear it' } }); q.onclick = () => say('Πήρες φόρα;');
    top.createDiv({ cls: 'gq-mo-n', text: String(m), attr: { 'aria-label': `Momentum ${m}` } });
    this.worldDraw(c, todayPts, m);
    c.createDiv({ cls: 'gq-hint', text: `Did you get going? · ${todayPts ? '+' + todayPts + ' today' : 'nothing yet today'} · ${gain >= 0 ? '+' : ''}${gain} this week` });
    this.stepsRow(c, todayPts);
    const bars = c.createDiv({ cls: 'gq-mo-bars', attr: { 'aria-hidden': 'true' } });
    for (let k = 13; k >= 0; k--) { const d = new Date(); d.setDate(d.getDate() - k); const p = +days[ymd(d)] || 0; const b = bars.createDiv('gq-mo-bar' + (k === 0 ? ' is-today' : '')); b.style.height = Math.max(3, Math.round(30 * p / MO_CAP)) + 'px'; }
    c.createDiv({ cls: 'gq-mo-barcap', text: 'Your last 2 weeks. Today is blue; taller means more φόρα.' });
    const ans = todayPts >= 15 ? 'Ναι, πήρα φόρα.' : todayPts ? 'Λίγο.' : 'Όχι ακόμα, αλλά θα πάρω.';
    const a = c.createDiv({ cls: 'gq-hint gq-say', attr: { lang: 'el' } }); a.appendText('Say it: '); a.createSpan({ text: ans, cls: 'gq-mo-ans' }); a.onclick = () => say(ans);
    const d = c.createEl('details', { cls: 'gq-mo-how' }); d.createEl('summary', { text: 'How φόρα works' });
    const ul = d.createEl('ul');
    for (const t of [
      'Remembering a word on a later day earns the most.',
      'Everything else you finish adds a little: puzzles, sentences, songs, homework.',
      'A day off fades it a bit, so a little every day wins.',
      'Every point is also a step (βήμα) toward the dance you are learning. Steps add up across days: ο συρτός has 6, ο καλαματιανός 12, and later dances take 2 or 3 points a step.']) ul.createEl('li', { text: t });
    if (this.colors().world) { const li = ul.createEl('li'); li.appendText(this.colors().world === 'dance' ? 'Your dance floor grows with every point and never shrinks. ' : 'Your world grows with green words and never shrinks. '); const ch = li.createEl('a', { text: 'Change my world', href: '#' }); ch.onclick = e => { e.preventDefault(); this.setWorld(''); }; }
  }
  // ---------- Paper round: the app keeps the schedule, the paper cards do the work ----------
  // Red pile every day, yellow every other day, green on Sundays. A card with no color yet sits in the red pile.
  paperPiles(dd) {
    const dow = new Date().getDay(), piles = ['red']; if (((dd % 2) + 2) % 2 === 0) piles.push('yellow'); if (dow === 0) piles.push('green');
    const by = { red: [], yellow: [], green: [] }; for (const w of this.cards()) by[this.colorOf(w) || 'red'].push(w);
    return { piles, by, list: piles.flatMap(k => by[k].map(w => [w, k])) };
  }
  paperCard(box, dd) {
    const n = this.cards().length; if (!n && !this.colors().setup_seen) return;
    const c = box.createDiv('gq-tcard gq-paper'); c.dataset.tour = 'paper';
    const h = c.createDiv('gq-thead'); h.createEl('strong', { text: 'Paper round' });
    if (!n) { c.createDiv({ cls: 'gq-hint', text: 'Made a paper card? Tap On paper on that word\'s note. Then the app tells you which pile to pull each day.' }); return; }
    const { piles, by, list } = this.paperPiles(dd), pf = this.app.vault.getAbstractFileByPath(PROGRESS), done = (this.paperDone || String(((pf && this.app.metadataCache.getFileCache(pf)) || {}).frontmatter?.paper_done || '')) === ymd(new Date());
    h.createSpan({ cls: 'gq-hint', text: ` · ${n} card${n === 1 ? '' : 's'}` });
    c.createDiv({ cls: 'gq-hint', text: done ? 'Done for today. Θα τα πούμε.' : list.length ? `Today: your ${piles.filter(k => by[k].length).join(' and ')} pile${piles.filter(k => by[k].length).length > 1 ? 's' : ''}, ${list.length} card${list.length === 1 ? '' : 's'}.` : `Today is the ${piles.join(' and ')} pile, and it is empty. Nice.` });
    if (list.length && !done) { const b = c.createEl('button', { text: 'Start', cls: 'mod-cta' }); b.onclick = () => new PaperModal(this.app, this, list).open(); }
  }
  async setColor(word, color) {
    const was = this.colorOf(word), R = { '': 0, red: 1, yellow: 2, green: 3 };
    if (R[color || ''] > R[was]) this.moAdd('up', word); else if (R[color || ''] < R[was]) this.moAdd('down', word);
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
    const web = bar.createEl('button', { text: 'Word web', attr: { 'aria-label': 'See the words that go with it' } }); web.onclick = () => this.openGraph(ctx.sourcePath);
    const mo = bar.createEl('button', { text: 'More ›', attr: { 'aria-label': 'More on this word: pairs, games, scripts' } }); mo.onclick = () => this.showMore();
    const card = this.isKids ? null : bar.createEl('button', { text: 'On paper', cls: 'gq-card-btn', attr: { 'aria-label': 'I made a paper card for this word' } }); card && (card.onclick = () => this.setCard(word, !this.cards().includes(word)));
    // The colors get their own row, so the three choices read as one question.
    const grp = bar.createDiv({ cls: 'gq-colors', attr: { role: 'group', 'aria-label': 'How well do you know it?' } });
    const btns = COLORS.map(([k, label]) => { const b = grp.createEl('button', { text: label, cls: 'gq-c gq-' + k }); b.onclick = () => this.setColor(word, this.colorOf(word) === k ? '' : k); return [k, b]; });
    const photo = createDiv('gq-card-row'); bar.after(photo);
    const rec = { word, btns, el: bar, card, photo }; this.bars.add(rec); this.paintBar(rec);
  }
  paintBar(rec) {
    const c = this.colorOf(rec.word); for (const [k, b] of rec.btns) { b.toggleClass('is-on', c === k); b.setAttr('aria-pressed', String(c === k)); }
    if (!rec.card) return; const on = this.cards().includes(rec.word); rec.card.toggleClass('is-on', on); rec.card.setAttr('aria-pressed', String(on));
    this.paintPhoto(rec, on);
  }
  async paintPhoto(rec, on) {
    const row = rec.photo, ad = this.app.vault.adapter, p = this.cardPhoto(rec.word); row.empty(); if (!on) return;
    if (await ad.exists(p)) {
      const img = row.createEl('img', { cls: 'gq-card-img', attr: { alt: 'Your card for ' + rec.word, src: (u => u.startsWith('data:') || !this.photoT ? u : u + (u.includes('?') ? '&' : '?') + this.photoT)(ad.getResourcePath(p)) } });
      const r = row.createEl('a', { text: 'New photo', href: '#', cls: 'gq-hint' }); r.onclick = e => { e.preventDefault(); this.pickPhoto(rec.word, () => this.paintPhoto(rec, true)); };
      img.onclick = () => img.toggleClass('is-big', !img.hasClass('is-big'));
    } else {
      const a = row.createEl('a', { text: 'Add a photo of your card', href: '#', cls: 'gq-hint' }); a.onclick = e => { e.preventDefault(); this.pickPhoto(rec.word, () => this.paintPhoto(rec, true)); };
      row.createSpan({ cls: 'gq-hint', text: ' (optional)' });
    }
  }
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
  wordList(parent, words) {
    const ul = parent.createEl('ul', { cls: 'gq-tlist' });
    for (const w of words) {
      const li = ul.createEl('li'); const c = this.colorOf(w.word);
      li.createSpan({ cls: 'gq-dot gq-' + (c || 'new') });
      const a = li.createEl('a', { text: w.label || w.word, cls: 'internal-link', href: '#' }); a.onclick = e => { e.preventDefault(); this.app.workspace.openLinkText(w.word, TODAY, false); };
      if (w.en) li.appendText('  ' + w.en);
    }
  }
  // Verb forms after να: the one-time form (δω) mapped to the form learners know (βλέπω). From Wiktionary data, in verbs.json.
  loadVerbs() { if (!this.verbsP) this.verbsP = Promise.resolve().then(() => this.app.vault.adapter.read(this.manifest.dir + '/verbs.json')).then(t => { this.verbMap = JSON.parse(t); }).catch(() => { this.verbMap = {}; }); return this.verbsP; }
  easyVerbs(s) { const M = this.verbMap || {}; return s.replace(/(^|\s)να (\S+?)([.,;!?…]?)(?=\s|$)/g, (all, a, w, p) => M[w] ? `${a}να ${M[w]}${p}` : all); }
  gamesNote() { return this.isKids ? 'Games.md' : GAMES; }
  // A word and the words it goes with (from its card), for a game round.
  async webWords(path) {
    const name = p => p.replace(/^Words\//, '').replace(/\.md$/, '');
    const co = (await this.coList(path)).filter(p => this.app.vault.getAbstractFileByPath(p));
    return [name(path), ...co.slice(0, 8).map(name)];
  }
  playRow(parent, words) {
    const row = parent.createDiv('gq-row'); const list = words.map(w => w.word);
    const b = row.createEl('button', { text: 'Play Buzzer with these' }); b.onclick = () => this.openApp('buzzer', '#w=' + encodeURIComponent(list.join(',')));
    const c = row.createEl('button', { text: 'Play Cousins with these' }); c.onclick = () => this.openApp('cousins', '#w=' + encodeURIComponent(list.join(',')));
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
    this.moAdd('did', 'beat:' + n, 1);
    setTimeout(() => this.refreshToday(), 300);
  }
  // The story puzzle goes at each student's own pace, from part 1. story_at in My progress = parts finished.
  async setStory(k) {
    const f = await this.progressFile();
    await this.app.fileManager.processFrontMatter(f, fm => { fm.story_at = k; if (!(parseInt(fm.last_beat, 10) >= k)) fm.last_beat = k; });
  }
  storyWeeks(beats) {
    const out = [];
    for (const k of Object.keys(beats).map(Number).sort((a, b) => a - b)) { const b = beats[k]; if (!out.length || out[out.length - 1].week !== b.week) out.push({ week: b.week, first: k, title: b.file.basename.replace(/^FY\d+\s*/, '').replace(/ no class this week$/, '') }); }
    return out;
  }
  startMenu(evt, beats) {
    const m = new Menu();
    m.addItem(i => i.setTitle('From the very beginning').onClick(async () => { await this.setStory(0); this.refreshToday(); }));
    for (const w of this.storyWeeks(beats)) m.addItem(i => i.setTitle(`Week ${w.week}: ${w.title}`).onClick(async () => { await this.setStory(w.first - 1); this.refreshToday(); }));
    m.showAtMouseEvent(evt);
  }
  async storyCard(box, beats, cal, isSun, col) {
    const days = Object.keys(beats).map(Number).sort((a, b) => a - b); if (!days.length) return;
    const at = col.story_at || 0;
    let idx = days.findIndex(k => k > at); const finished = idx < 0; if (finished) idx = days.length - 1;
    const n = days[idx], b = beats[n], doneN = days.filter(k => k <= at).length;
    const card = box.createDiv('gq-tcard gq-story'); card.dataset.tour = 'story';
    const head = card.createDiv('gq-thead');
    head.createEl('strong', { text: 'Story puzzle' });
    head.createSpan({ cls: 'gq-hint', text: `  · part ${idx + 1} of ${days.length} · about ${this.est('story', 2)} min` });
    this.storyEl = card; this.storyInfo = { due: !finished && at < cal, part: idx + 1 };
    // How long a part really takes this student: from the first tap to the last sentence.
    card.addEventListener('pointerdown', () => { if (!this.tStory) this.tStory = Date.now(); }, true);
    const bar = card.createDiv({ cls: 'gq-sbar', attr: { role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(days.length), 'aria-valuenow': String(doneN) } });
    bar.createDiv('gq-sbar-in').style.width = (100 * doneN / days.length).toFixed(1) + '%';
    const wk = this.storyWeeks(beats).find(w => w.week === b.week);
    card.createDiv({ cls: 'gq-hint', text: `${doneN} done · week ${b.week}${wk && wk.title ? ': ' + wk.title.replace(/\bWhats\b/g, "What's") : ''}` });
    if (col.story_at === null && col.last_beat > 1 && beats[col.last_beat + 1]) {
      const h = card.createDiv({ cls: 'gq-hint' }); h.appendText('Already in the story? ');
      const j = h.createEl('a', { text: `Continue from part ${days.indexOf(col.last_beat + 1) + 1}`, href: '#' }); j.onclick = async e => { e.preventDefault(); await this.setStory(col.last_beat); this.refreshToday(); };
    }
    const T = await this.storyTurns();
    let turns = T[n]; if (!turns || !turns.length || turns.map(x => x[1]).join(' — ') !== b.gr) turns = [['', b.gr, b.en]];
    // Wrong-answer tiles come from the rest of this week's story, so they look like real choices.
    const pool = Object.values(beats).filter(x => x.week === b.week && x.n !== n).flatMap(x => (T[x.n] || [['', x.gr || '', '']]).map(y => y[1]));
    const before = Object.values(beats).filter(x => x.week === b.week && x.n < n).sort((p, q) => p.n - q.n);
    this.todayBeat = { b, n, before, done: at >= n };
    const next = finished ? null : () => this.refreshToday();
    this.convoGame(card, turns, n, b.words, at >= n, pool, () => { if (this.tStory) { this.timeRec('story', (Date.now() - this.tStory) / 1000); this.tStory = 0; } this.markDone('story'); return this.setStory(Math.max(n, this.colors().story_at || 0)); }, next, finished);
    const r = card.createDiv('gq-row gq-sstart');
    const st = r.createEl('a', { text: doneN ? 'Start somewhere else' : 'Know some Greek already? Start further in', href: '#', cls: 'gq-hint' }); st.onclick = e => { e.preventDefault(); this.startMenu(e, beats); };
    return b;
  }
  // One sentence at a time: the Greek on top, the English built underneath from word tiles (tap or drag). Then the next sentence opens.
  convoGame(card, turns, n, words, done, pool, onDone, next, last) {
    const key = 'gq-convo-' + this.app.vault.getName() + '-' + n; let store = null; try { store = window.localStorage; } catch (e) {}
    let saved = null; try { saved = store && store.getItem(key); } catch (e) {} if (saved === undefined) saved = null;
    let i = saved === null ? (done ? turns.length : 0) : Math.min(+saved || 0, turns.length);
    const save = () => { try { if (store) store.setItem(key, String(i)); } catch (e) {} };
    const toks = s => String(s).replace(/[“”"«»]/g, '').split(/\s+/).map(w => w.replace(/^[^\p{L}\p{N}']+|[^\p{L}\p{N}']+$/gu, '')).filter(Boolean);
    const norm = w => w.toLowerCase().replace(/’/g, "'");
    let seed = n * 97 + 13; const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    // Flexible word order: small words (articles, prepositions, να/θα/δεν, μου/σου) stay glued to their word;
    // one chunk may move to another place in its clause; a question word stays first.
    const FWD = new Set("ο η το οι τα τον την τη του της των τους τις στο στη στην στον στα στους στις στου στης σε σ' από απ' με για χωρίς μέχρι προς ως να θα δεν μην μη ας".split(' '));
    const BACK = new Set(['μου', 'σου', 'μας', 'σας']), BOTH = new Set(['και', 'κι', 'ή', 'ούτε']);
    const QW = new Set('πού τι ποιος ποια ποιο ποιοι ποιες ποιον ποιας ποιου πότε πώς γιατί πόσο πόση πόσα πόσοι πόσες μήπως'.split(' '));
    const clausesOf = g => String(g).split(/[,.;;!:·…?]+/).map(c => toks(c).map(norm)).filter(c => c.length).map(ws => {
      const ch = [[ws[0]]];
      for (let k = 1; k < ws.length; k++) {
        const a = ws[k - 1], b = ws[k];
        const glue = FWD.has(a) || BOTH.has(a) || BOTH.has(b) || (BACK.has(b) && !FWD.has(a));
        if (glue) ch[ch.length - 1].push(b); else ch.push([b]);
      }
      return { n: ws.length, ch: ch.map(c => c.join(' ')), pin: QW.has(ws[0]) };
    });
    const oneMove = (tg, s, pin) => {
      const key = s.join('|'); if (tg.join('|') === key) return true;
      if (pin && s[0] !== tg[0]) return false;
      if (tg.length <= 3) return [...s].sort().join('|') === [...tg].sort().join('|');
      for (let a = 0; a < tg.length; a++) { const rest = tg.slice(0, a).concat(tg.slice(a + 1)); for (let b = 0; b <= rest.length; b++) { if (b === a) continue; const c = rest.slice(0, b).concat([tg[a]], rest.slice(b)); if (c.join('|') === key) return true; } }
      return false;
    };
    const accepts = (got, greek) => {
      const cl = clausesOf(greek); let pos = 0;
      if (got.length !== cl.reduce((s, c) => s + c.n, 0)) return false;
      for (const c of cl) {
        const seg = got.slice(pos, pos + c.n); pos += c.n; let ok = false;
        const walk = (k, left, acc) => {
          if (ok) return; if (k === seg.length) { if (!left.length && oneMove(c.ch, acc, c.pin)) ok = true; return; }
          for (let q = 0; q < left.length; q++) { const w = left[q].split(' '); if (seg.slice(k, k + w.length).join(' ') === left[q]) walk(k + w.length, left.slice(0, q).concat(left.slice(q + 1)), acc.concat([left[q]])); }
        };
        walk(0, c.ch, []); if (!ok) return false;
      }
      return true;
    };
    const wrap = card.createDiv('gq-convo');
    // Keep drags and swipes on the tiles from opening Obsidian's side panels on phones.
    const stopT = e => e.stopPropagation();
    for (const ev of ['touchstart', 'touchend', 'pointerdown', 'pointermove', 'pointerup']) wrap.addEventListener(ev, stopT, { passive: true });
    wrap.addEventListener('touchmove', e => { e.stopPropagation(); if (e.target && e.target.closest && e.target.closest('.gq-tile, .gq-cv-ans, .gq-cv-bank')) e.preventDefault(); }, { passive: false });
    const paint = () => {
      wrap.empty(); seed = n * 97 + 13 + i * 7;
      for (let k = 0; k < Math.min(i, turns.length); k++) {
        const x = turns[k], r = wrap.createDiv('gq-cv-done');
        if (x[0]) r.createSpan({ cls: 'gq-cbwho', text: x[0] + ': ' });
        const gl = this.lineEl(r, x[1], words); gl.addClass('gq-say'); gl.onclick = () => say(x[1]); r.createDiv({ cls: 'gq-hint', text: x[2] });
      }
      if (i >= turns.length) {
        const row = wrap.createDiv('gq-row');
        if (next) { const nx = row.createEl('button', { text: 'Next part ›', cls: 'mod-cta' }); nx.onclick = next; }
        row.createSpan({ cls: 'gq-hint', text: last ? 'You finished the whole story. Touch a line to listen.' : 'Touch a line to listen, then say it out loud. One or two parts a day is plenty.' });
        const again = row.createEl('button', { text: 'Play again', cls: 'gq-mini' }); again.onclick = () => { i = 0; save(); paint(); };
        return;
      }
      const x = turns[i], cur = wrap.createDiv('gq-cv-now');
      cur.createDiv({ cls: 'gq-hint', text: (turns.length > 1 ? `Sentence ${i + 1} of ${turns.length}` : 'One sentence') + (x[0] ? ` · ${x[0]}` : '') });
      cur.createDiv({ cls: 'gq-cv-gr gq-cv-prompt', text: x[2] });
      const target = toks(x[1]), want = new Set(target.map(norm));
      const extra = [...new Set(pool.flatMap(toks).filter(w => !want.has(norm(w)) && w.length > 1))];
      const nExtra = Math.min(extra.length, Math.max(3, Math.min(6, Math.ceil(target.length / 2))));
      const picks = []; while (picks.length < nExtra && extra.length) picks.push(extra.splice(Math.floor(rnd() * extra.length), 1)[0]);
      const tiles = [...target, ...picks].map((w, k) => ({ w, k }));
      for (let a = tiles.length - 1; a > 0; a--) { const b = Math.floor(rnd() * (a + 1)); [tiles[a], tiles[b]] = [tiles[b], tiles[a]]; }
      if (tiles.slice(0, target.length).every((tl, k) => tl.w === target[k])) tiles.push(tiles.shift());
      const ans = cur.createDiv({ cls: 'gq-cv-ans', attr: { 'aria-label': 'Your Greek', lang: 'el' } });
      const bank = cur.createDiv({ cls: 'gq-cv-bank', attr: { 'aria-label': 'Greek word tiles', lang: 'el' } });
      cur.createDiv({ cls: 'gq-hint gq-cv-help', text: 'Build it in Greek: touch a word to hear it and add it (or drag it up). Touch it again to take it back.' });
      const placed = [];
      const place = tl => { if (tl.used) return; say(tl.w); tl.used = true; tl.btn.addClass('gq-used'); const c = ans.createEl('button', { text: tl.w, cls: 'gq-tile' }); tl.clone = c; placed.push(tl); bindDrag(c, () => unplace(tl), bank); ans.removeClass('gq-bad'); };
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
      const hint = cur.createDiv({ cls: 'gq-hint gq-say', text: 'Touch here to hear the whole line in Greek.' }); hint.style.display = 'none'; hint.onclick = () => say(x[1]);
      const show = row.createEl('button', { text: 'Show me', cls: 'gq-mini' }); show.style.display = 'none';
      this.sayIt(row, x[1], 'said:π:' + n + ':' + i, 'Say the line · +2');
      const fb = cur.createDiv('gq-hint gq-cv-fb');
      const en = this.lineEl(cur, x[1], words); en.addClass('gq-cv-en'); en.addClass('gq-say'); en.onclick = () => say(x[1]); en.style.display = 'none';
      show.onclick = () => { en.style.display = ''; show.remove(); };
      chk.onclick = () => {
        const got = placed.map(tl => norm(tl.w)), exact = got.join(' ') === target.map(norm).join(' ');
        if (exact || accepts(got, x[1])) {
          ans.addClass('gq-ok'); chk.disabled = true; say(x[1]); fb.empty();
          if (!exact) { fb.createDiv({ text: 'Also right. The line says:' }); this.lineEl(fb, x[1], words); }
          this.moAdd('recall', 'π:' + n + ':' + i);
          setTimeout(() => { i++; save(); if (i >= turns.length) onDone(); paint(); }, exact ? 900 : 2600);
        } else { misses++; fb.empty(); if (got.length === target.length && [...got].sort().join(' ') === target.map(norm).sort().join(' ')) fb.setText('All the right words. Try another order: keep small words like ο, στο, να and δεν with the word after them.'); ans.removeClass('gq-bad'); void ans.offsetWidth; ans.addClass('gq-bad'); if (misses >= 1) hint.style.display = ''; if (misses >= 2) show.style.display = ''; }
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
      const g = box.createDiv({ cls: 'gq-wbig gq-say', text: w.label || w.word, attr: { lang: 'el', role: 'button', 'aria-label': 'Touch to listen' } }); g.onclick = () => say(w.label || w.word);
      box.createDiv({ cls: 'gq-hint', text: 'Touch the word to listen.' });
      const en = box.createDiv({ cls: 'gq-hint gq-wen', text: w.en || '' }); en.style.visibility = 'hidden';
      const r = box.createDiv('gq-row');
      const m = r.createEl('button', { text: 'Show meaning', cls: 'gq-mini' }); m.onclick = () => { en.style.visibility = ''; m.remove(); }; this.thinkBeat(m, 'Guess first');
      const nt = r.createEl('button', { text: 'Word note', cls: 'gq-mini' }); nt.onclick = () => this.app.workspace.openLinkText(w.word, TODAY, false);
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
    const pt = this.together();
    if (pt.when) { const t = c.createDiv('gq-row gq-together'); t.createSpan({ cls: 'gq-hint', text: `Practice together · ${pt.when}` }); if (pt.link) { const j = t.createEl('button', { text: 'Join', cls: 'gq-mini' }); j.onclick = () => window.open(pt.link, '_blank'); } }
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
    const last = col.story_at !== null ? col.story_at : Math.min(col.last_beat, (cal || 1e9) - 1); if (last < 1) return;
    const due = [last, last - 2, last - 6].filter(k => k >= 1 && beats[k]).map(k => beats[k]);
    if (!due.length) return;
    const T = await this.storyTurns(), cbs = due.map(b => this.comebackTurns(b, T));
    const card = box.createDiv('gq-tcard gq-comeback'); this.cbList = cbs;
    const ch = card.createDiv('gq-thead'); ch.createEl('strong', { text: 'Comebacks' }); ch.createSpan({ cls: 'gq-hint', text: `  · about ${Math.max(1, Math.round(cbs.length * 0.5))} min` });
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
  // ---------- Focus helpers: the app holds the plan, the time and the place you left off ----------
  progFm() { const f = this.app.vault.getAbstractFileByPath(PROGRESS); return f ? ((this.app.metadataCache.getFileCache(f) || {}).frontmatter || {}) : {}; }
  lsKey(k) { return 'gq-' + k + '-' + this.app.vault.getName(); }
  lsGet(k, d) { try { const v = JSON.parse(window.localStorage.getItem(this.lsKey(k)) || 'null'); return v === null ? d : v; } catch (e) { return d; } }
  lsSet(k, v) { try { window.localStorage.setItem(this.lsKey(k), JSON.stringify(v)); } catch (e) {} }
  // Minutes: the middle of this student's last few times, or a starting guess.
  est(kind, def) { const a = (this.lsGet('mins', {})[kind] || []).slice().sort((x, y) => x - y); return a.length < 2 ? def : Math.max(1, Math.round(a[Math.floor(a.length / 2)] / 60)); }
  timeRec(kind, secs) { if (!(secs > 15 && secs < 900)) return; const L = this.lsGet('mins', {}); L[kind] = [...(L[kind] || []), Math.round(secs)].slice(-7); this.lsSet('mins', L); }
  doneToday(k) { return this.lsGet('done', {})[k] === ymd(new Date()); }
  markDone(k) { const d = this.lsGet('done', {}); d[k] = ymd(new Date()); this.lsSet('done', d); }
  whereSet(w) { this.lsSet('where', { ...w, t: Date.now() }); }
  whereGet() { const w = this.lsGet('where', null); return w && Date.now() - w.t < 4 * 864e5 ? w : null; }
  async whereGo(w) {
    if (w.kind === 'app') return this.openApp(w.app, w.hash);
    if (w.kind === 'web') return this.openGraph(w.path);
    const f = this.app.vault.getAbstractFileByPath(w.path); if (!f) return;
    await this.mainLeaf(false).openFile(f, { state: { mode: 'preview' } });
    if (w.h) setTimeout(() => { const t = [...document.querySelectorAll('.markdown-reading-view h2, .markdown-preview-view h2, .gq-w-page h2, h2')].find(x => x.textContent.trim() === w.h && x.offsetParent); if (t) t.scrollIntoView({ block: 'start' }); }, 500);
  }
  // A short pause before the answer can be shown: guessing first is what makes it stick.
  thinkBeat(b, label) {
    const t = b.textContent; b.disabled = true; b.addClass('is-think'); b.setText(label + '…');
    setTimeout(() => { if (!b.isConnected) return; b.disabled = false; b.removeClass('is-think'); b.setText(t); }, 1800);
  }
  focusCard(el) {
    if (!el) return; el.scrollIntoView({ behavior: this.calmOn() ? 'auto' : 'smooth', block: 'start' });
    el.removeClass('gq-pulse'); void el.offsetWidth; el.addClass('gq-pulse'); setTimeout(() => el.removeClass('gq-pulse'), 1800);
  }
  calmOn() { return this.calmNow !== undefined ? this.calmNow : this.progFm().calm === true; }
  applyCalm() { document.body.classList.toggle('gq-calm', this.calmOn()); }
  async setCalm(on) { this.calmNow = on; this.applyCalm(); const f = await this.progressFile(); await this.app.fileManager.processFrontMatter(f, fm => { if (on) fm.calm = true; else delete fm.calm; }); this.moPaint(); this.paintMore(); }
  together() { const f = this.app.vault.getAbstractFileByPath(EXTRAS + 'Practice together.md'); const fm = f ? ((this.app.metadataCache.getFileCache(f) || {}).frontmatter || {}) : {}; return { when: fm.when ? String(fm.when) : '', link: fm.link ? String(fm.link) : '' }; }
  planNowGet() { return this.planNow !== undefined ? this.planNow : (typeof this.progFm().plan === 'string' ? this.progFm().plan : ''); }
  async setPlan(p) { this.planNow = p; if (p) this.tourHit('plan'); const f = await this.progressFile(); await this.app.fileManager.processFrontMatter(f, fm => { if (p) fm.plan = p; else delete fm.plan; }); this.refreshToday(); this.paintMore(); }
  // A daily calendar event at the plan's usual time. Works in Android and iPhone calendars; no notifications to set up.
  planIcs(plan) {
    const t = { coffee: '0800', breakfast: '0800', 'the bus': '0730', lunch: '1230', dinner: '1900' }[plan] || '0900', ds = ymd(new Date()).replace(/-/g, '');
    const esc = x => String(x).replace(/([,;\\])/g, '\\$1');
    const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Greekquent//Practice//EN', 'BEGIN:VEVENT', `UID:gq-practice-${ds}@greekquent`, `DTSTAMP:${ds}T000000`, `DTSTART:${ds}T${t}00`, 'DURATION:PT5M', 'RRULE:FREQ=DAILY',
      `SUMMARY:${esc('Greek after ' + plan + ': today\'s line')}`, 'DESCRIPTION:Open Greekquent. One line is enough.', 'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Greek time', 'TRIGGER:PT0M', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' })); a.download = 'Greekquent practice.ics'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    new Notice('Open the file to add it to your calendar. Change the time there if you like.');
  }
  planRow(c) {
    const plan = this.planNowGet(), d = c.createDiv('gq-plan');
    if (plan) {
      d.createSpan({ cls: 'gq-plan-say', text: `After ${plan}: today's line. ` });
      const ch = d.createEl('a', { text: 'Change', href: '#', cls: 'gq-hint' }); ch.onclick = e => { e.preventDefault(); this.setPlan(''); };
      if (window.GQW || !(Platform && Platform.isMobileApp)) { d.createSpan({ cls: 'gq-hint', text: ' · ' }); const k = d.createEl('a', { text: 'Add to my calendar', href: '#', cls: 'gq-hint' }); k.onclick = e => { e.preventDefault(); this.planIcs(plan); }; }
      return;
    }
    if (this.lsGet('planlater', 0) > Date.now()) { d.remove(); return; }
    d.createSpan({ cls: 'gq-hint', text: 'When will you practice? After ' });
    const r = d.createDiv('gq-row gq-plan-chips');
    for (const p of ['coffee', 'breakfast', 'the bus', 'lunch', 'dinner']) { const b = r.createEl('button', { text: p, cls: 'gq-mini' }); b.onclick = () => this.setPlan(p); }
    const o = r.createEl('button', { text: 'something else', cls: 'gq-mini' });
    o.onclick = () => { r.empty(); const i = r.createEl('input', { type: 'text', attr: { placeholder: 'the gym, work, walking the dog', 'aria-label': 'After what?' } }); const s = r.createEl('button', { text: 'Save', cls: 'mod-cta' }); s.onclick = () => { const v = i.value.trim().replace(/^after\s+/i, ''); if (v) this.setPlan(v.slice(0, 40)); }; i.onkeydown = e => { if (e.key === 'Enter') s.click(); }; i.focus(); };
    const l = r.createEl('a', { text: 'Not now', href: '#', cls: 'gq-hint' }); l.onclick = e => { e.preventDefault(); this.lsSet('planlater', Date.now() + 7 * 864e5); d.remove(); };
  }
  // The top of Today: one thing to do now and about how long it takes. After a few days away, just one line.
  async nextCard(box, ctx) {
    const c = createDiv('gq-tcard gq-next'); c.dataset.tour = 'next';
    const { days } = this.moData(), today = ymd(new Date());
    const past = Object.keys(days || {}).filter(d => d !== today && +days[d] > 0).sort(), last = past[past.length - 1];
    const away = last && !(+days[today] > 0) ? Math.round((new Date(today + 'T12:00') - new Date(last + 'T12:00')) / 864e5) : 0;
    const steps = [], si = this.storyInfo, rev = ctx.rev || [];
    if (si && si.due && this.storyEl) steps.push({ label: `Story puzzle, part ${si.part}`, min: this.est('story', 2), go: () => this.focusCard(this.storyEl) });
    if (this.cbList && this.cbList.length && !this.doneToday('cb')) steps.push({ label: 'A comeback', min: 1, go: () => this.popComebacks(this.cbList.slice(0, 1)) });
    if (rev.length && this.revEl && !this.doneToday('rev')) { const n = Math.min(8, rev.length); steps.push({ label: `${n} review word${n === 1 ? '' : 's'}`, min: Math.max(1, Math.round(n * 12 / 60)), go: () => { this.markDone('rev'); this.focusCard(this.revEl); } }); }
    const head = c.createDiv('gq-thead'), line = c.createDiv('gq-next-line'), r = c.createDiv('gq-row'), s = steps[0];
    if (s && away >= 2) { head.createEl('strong', { text: 'Welcome back' }); line.setText('Just one line today?'); }
    else if (s) { head.createEl('strong', { text: 'Next' }); line.setText(`${s.label} · about ${s.min} min`); }
    else { head.createEl('strong', { text: 'Done for today' }); line.setText('Θα τα πούμε. One more? Pick one.'); line.setAttr('lang', 'el'); }
    if (s) { const b = r.createEl('button', { text: away >= 2 ? 'One line' : 'Start', cls: 'mod-cta' }); b.onclick = () => { this.tourHit('next'); s.go(); }; }
    else for (const [t, fn] of this.choiceTwo(rev)) { const b = r.createEl('button', { text: t }); b.onclick = () => { this.tourHit('next'); fn(); }; }
    this.tourLine(c);
    const wh = this.whereGet();
    if (wh) { const d = c.createDiv('gq-hint gq-next-back'); d.appendText('Back to where you were: '); const a = d.createEl('a', { text: wh.label, href: '#' }); a.onclick = e => { e.preventDefault(); this.whereGo(wh); }; }
    if (!ctx.fresh || this.planNowGet() || this.tourIs('plan')) this.planRow(c);
    const first = box.querySelector(':scope > .gq-tcard'); if (first) box.insertBefore(c, first); else box.appendChild(c);
  }
  // Two different kinds of thing, a new pair each day, so it never feels like the same list.
  choiceTwo(rev) {
    const green = this.colors().green, pick = green.length ? green[Math.floor(Math.random() * green.length)] : 'θέλω';
    const pool = [['Word web', () => this.openGraph()], ['Play Γιαγιά', () => this.openApp('giagia', rev.length ? '#w=' + encodeURIComponent(rev.slice(0, 8).map(x => x.word).join(',')) : '')],
      ['Walk mode', () => this.walkMode()], ['Build a sentence', () => this.openPair(pick)]];
    const pt = this.together(); if (pt.when && pt.link) pool.push(['Practice together', () => window.open(pt.link, '_blank')]);
    const k = Math.floor(Date.now() / 864e5) % pool.length; return [pool[k], pool[(k + 1) % pool.length]];
  }
  // Steps and dances on the φόρα card: how many steps today, the next dance, and the collection.
  stepsRow(c, todayPts) {
    const d = danceNow(this.moData().steps), row = c.createDiv('gq-hint gq-steps');
    row.appendText(`Βήματα (steps) today: ${todayPts}`);
    const w = this.worldNow !== undefined ? this.worldNow : this.colors().world;
    if (w !== 'dance') { row.appendText(' · learning '); const n = row.createSpan({ cls: 'gq-say', text: DANCE_NAME[d.k], attr: { lang: 'el' } }); n.onclick = () => say(DANCE_NAME[d.k]); row.appendText(`: step ${d.steps} of ${d.n}`); }
    const got = Object.entries(this.moData().dance || {}).filter(([k, v]) => DANCE_NAME[k] && +v > 0);
    if (!got.length) return;
    const order = [...DANCES.map(d => d[1]), ...GUEST_DANCES.map(d => d[0])]; got.sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]));
    const box = c.createDiv({ cls: 'gq-dances', attr: { 'aria-label': 'Your dances' } });
    for (const [k, v] of got) { const b = box.createEl('button', { cls: 'gq-dance' + (GUEST_DANCES.some(g => g[0] === k) ? ' is-guest' : ''), attr: { lang: 'el' } }); b.createSpan({ text: DANCE_NAME[k] }); if (+v > 1) b.createSpan({ cls: 'gq-dance-n', text: ' ×' + v }); b.onclick = () => say(DANCE_NAME[k]); }
  }
  // Make it stick: one small step for one red word. A gesture, a picture, an own sentence or an English look-alike.
  stickRow(card, w) {
    if (!w || this.doneToday('stick')) return;
    const tips = ['Make up a gesture for it and do it while you say it.', 'Picture it somewhere real, then say it out loud.', 'Say a short sentence of your own with it.', 'Find an English word it sounds like, and link the two.'];
    const d = card.createDiv('gq-stick'); d.createSpan({ cls: 'gq-stick-h', text: 'Make it stick: ' });
    const g = d.createSpan({ text: w.word, cls: 'gq-say', attr: { lang: 'el' } }); g.onclick = () => say(w.word);
    d.appendText(` (${w.en}). ${tips[(Math.floor(Date.now() / 864e5) + dayHash(w.word)) % tips.length]}`);
    const r = d.createDiv('gq-row'), y = r.createEl('button', { text: 'Did it', cls: 'gq-mini' }), n = r.createEl('a', { text: 'Skip', href: '#', cls: 'gq-hint' });
    y.onclick = () => { this.moAdd('did', 'stick', 1); this.markDone('stick'); d.remove(); };
    n.onclick = e => { e.preventDefault(); this.markDone('stick'); d.remove(); };
  }
  // Focus, in Today's side panel: calm mode, an optional sound, walk mode, the plan and the tips.
  focusSec(s) {
    const r = s.createDiv('gq-row');
    const calm = r.createEl('button', { text: this.calmOn() ? 'Calm mode: on' : 'Calm mode: off', cls: 'gq-mini' + (this.calmOn() ? ' is-on' : '') }); calm.onclick = () => this.setCalm(!this.calmOn());
    const snd = r.createEl('button', { text: this.noise ? 'Focus sound: on' : 'Focus sound: off', cls: 'gq-mini' + (this.noise ? ' is-on' : '') }); snd.onclick = () => { const on = this.toggleNoise(); snd.setText(on ? 'Focus sound: on' : 'Focus sound: off'); snd.toggleClass('is-on', on); };
    const wk = r.createEl('button', { text: 'Walk mode', cls: 'gq-mini' }); wk.onclick = () => this.walkMode();
    s.createDiv({ cls: 'gq-hint', text: 'Calm mode stops the moving parts. Focus sound is a soft hiss (pink noise) that helps some people and bothers others, so it is off until you turn it on. Walk mode plays your Greek hands-free.' });
    const plan = this.planNowGet(); if (plan) s.createDiv({ cls: 'gq-hint', text: `Your plan: after ${plan}, today's line.` });
    if (!this.app.vault.getAbstractFileByPath(EXTRAS + '13 Focus tips.md')) return;
    const tip = s.createEl('a', { text: 'Focus tips', href: '#', cls: 'gq-hint' }); tip.onclick = e => { e.preventDefault(); this.openNote(EXTRAS + '13 Focus tips.md'); };
  }
  // A soft pink-noise loop, made on the device (no file, no download). Off by default; it stops when you turn it off or close the app.
  toggleNoise() {
    if (this.noise) { try { this.noise.src.stop(); this.noise.ctx.close(); } catch (e) {} this.noise = null; return false; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) { new Notice('This device cannot play the focus sound.'); return false; }
    const ctx = new AC(), n = ctx.sampleRate * 6, buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1; b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852; b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898; d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11; b6 = w * 0.115926; }
    const fade = Math.floor(ctx.sampleRate * 0.05); for (let i = 0; i < fade; i++) { const k = i / fade; d[i] *= k; d[n - 1 - i] *= k; }
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true; const g = ctx.createGain(); g.gain.value = 0.22; src.connect(g); g.connect(ctx.destination); src.start();
    this.noise = { ctx, src }; return true;
  }
  sayP(t, lang) {
    return new Promise(res => {
      const ss = window.speechSynthesis; if (!ss || !t) return res();
      const u = new SpeechSynthesisUtterance(lang === 'el' ? ttsFix(t) : t); u.lang = lang === 'el' ? 'el-GR' : 'en-US'; if (lang === 'el') { const v = greekVoice(); if (v) u.voice = v; } sayU = u;
      let done = false; const fin = () => { if (!done) { done = true; res(); } }; u.onend = fin; u.onerror = fin; setTimeout(fin, 1800 + String(t).length * 110);
      try { ss.resume(); ss.speak(u); } catch (e) { fin(); }
    });
  }
  // Walk mode: hands-free. The Greek, a pause to say it yourself, the English, the Greek again. This week's story and your review words.
  walkItems() {
    const tb = this.todayBeat, out = [];
    if (tb) for (const x of [...tb.before, tb.b]) if (x && x.gr) out.push({ gr: x.gr.replace(/ — /g, ' '), en: x.en || '' });
    for (const w of [...(this.todayPlay || []), ...(this.reviewPlay || [])].slice(0, 20)) out.push({ gr: w.label || w.word, en: w.en || w.english || '' });
    return out.slice(0, 30);
  }
  walkMode() {
    const items = this.walkItems(); if (!items.length) { new Notice('Open Today first, or do a story part, so walk mode has Greek to play.'); return; }
    const m = new Modal(this.app); m.titleEl.setText('Walk mode'); m.modalEl.addClass('gq-walk');
    const c = m.contentEl; c.createDiv({ cls: 'gq-hint', text: 'Hands-free: the Greek, a pause to say it yourself, the English, then the Greek again. Keep the screen on.' });
    const gr = c.createDiv({ cls: 'gq-walk-gr', attr: { lang: 'el' } }), en = c.createDiv('gq-walk-en'), pos = c.createDiv('gq-hint');
    const r = c.createDiv('gq-row'), pb = r.createEl('button', { text: 'Start', cls: 'mod-cta' }), sb = r.createEl('button', { text: 'Stop' });
    let run = false, alive = true, i = 0, lock = null, t0 = 0, paid = false, gen = 0;
    const wait = ms => new Promise(res => setTimeout(res, ms));
    const pay = () => { if (!paid && t0 && Date.now() - t0 > 120000) { paid = true; this.moAdd('did', 'walk', 2); } };
    const loop = async g => {
      while (run && alive && g === gen) {
        const x = items[i % items.length]; pos.setText(`${(i % items.length) + 1} of ${items.length}`); gr.setText(x.gr); en.setText('');
        await this.sayP(x.gr, 'el'); if (g !== gen || !run) break; await wait(2600); if (g !== gen || !run) break;
        en.setText(x.en); if (x.en) await this.sayP(x.en, 'en'); await wait(700); if (g !== gen || !run) break;
        await this.sayP(x.gr, 'el'); await wait(1500); i++; pay();
      }
    };
    pb.onclick = async () => {
      run = !run; pb.setText(run ? 'Pause' : 'Go on');
      if (run) { if (!t0) t0 = Date.now(); try { if (navigator.wakeLock) lock = await navigator.wakeLock.request('screen'); } catch (e) {} loop(++gen); }
      else { gen++; try { speechSynthesis.cancel(); } catch (e) {} }
    };
    sb.onclick = () => m.close();
    m.onClose = () => { alive = false; run = false; gen++; pay(); try { speechSynthesis.cancel(); if (lock) lock.release(); } catch (e) {} };
    m.open();
  }
  async renderToday(el) {
    // Each render builds off-screen and swaps in at the end; only the newest render for a container wins.
    const tok = el.gqTok = (el.gqTok || 0) + 1;
    const kids = await this.kidsInfo(); if (kids) return this.renderKidsToday(el, tok, kids);
    {
      const words = await this.wordIndex(); const byWord = new Map(words.map(w => [w.word, w]));
      const col = this.colors(); this.todayPlay = []; this.reviewPlay = []; this.revEl = null;
      const box = createDiv('gq-today');
      const now = new Date(); now.setHours(0, 0, 0, 0);
      const start = new Date(COURSE_START[0], COURSE_START[1], COURSE_START[2]);
      const dd = Math.floor((now - start) / 864e5);
      const week = dd < 0 ? 1 : Math.floor(dd / 7) + 1, dow = now.getDay();
      box.createDiv({ cls: 'gq-edition', text: 'Greekquent ' + this.editionName() });
      box.createEl('h2', { text: `Today · ${now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}` });
      if (this.showSwitch()) this.scriptSwitch(box);
      const moFresh = !Object.keys(this.moData().days || {}).length;
      if (!moFresh) this.moCard(box);
      this.paperCard(box, dd);
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
        this.todayBeat = null; this.storyEl = null; this.storyInfo = null; this.cbList = null;
        if (cal) await this.storyCard(box, beats, cal, dd >= 0 && dow === 0, col);
        if (moFresh) this.moCard(box);
        // Comebacks bring back earlier parts of the story the student has finished.
        if (col.story_at) await this.comebackCard(box, beats, col, cal);
        if (!this.tabOn('class')) await this.classCard(box, wk, week);
        // Fluent in a Year is optional: its words show here only for students who turn it on.
        if (col.fiay) {
          const card = box.createDiv('gq-tcard gq-fiay'), head = card.createDiv('gq-thead');
          const title = (wk.file.basename.replace(/^FY\d+\s*/, '') || '').replace(/ no class this week$/, '');
          head.createEl('strong', { text: `Fluent in a Year · week ${week}` }); head.createSpan({ cls: 'gq-hint', text: '  · ' + title.replace(/\bWhats\b/g, "What's") + (dd < 0 ? ' · starts Monday, Oct 26' : '') });
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
        const rc = box.createDiv('gq-tcard gq-review'); this.revEl = rc;
        const rh = rc.createDiv('gq-thead'); rh.createEl('strong', { text: `Review (${rev.length})` }); rh.createSpan({ cls: 'gq-hint', text: `  · about ${Math.max(1, Math.round(Math.min(8, rev.length) * 12 / 60))} min` });
        rc.createDiv({ cls: 'gq-hint', text: 'Words you marked red, missed in a game, or looked up.' });
        this.stickRow(rc, rev.find(x => col.red.includes(x.word)));
        this.wordList(rc, rev.slice(0, 8));
        if (rev.length > 8) rc.createDiv({ cls: 'gq-hint', text: `${rev.length - 8} more in the side panel.` });
      }
      this.reviewPlay = rev.slice(0, 40); this.todayWeek = wk;
      await this.nextCard(box, { rev, fresh: moFresh });
      const foot = box.createDiv('gq-hint gq-tfoot');
      const mo = foot.createEl('button', { text: 'More: story, games, colors, tools ›', cls: 'gq-mini' }); mo.onclick = () => this.showMore();
      if (!col.fiay && wk) { const fy = foot.createEl('button', { text: 'Doing Fluent in a Year? Show its words', cls: 'gq-mini' }); fy.onclick = () => this.setFiay(true); }
      if (this.updateReady && !this.updating) { const up = foot.createEl('button', { text: 'Install update', cls: 'gq-mini' }); up.onclick = () => this.updateVault(false); }
      // Slides are parked (deckify below) until they come back for specific moments, not all of Today.
      if (tok === el.gqTok) { el.empty(); el.appendChild(box); this.paintMore(); this.tabsSync(); this.tourShow(); }
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
  // ---------- Kids: the hello song ----------
  helloSong(box) {
    const c = box.createDiv('gq-tcard gq-kid gq-song'), h = c.createDiv('gq-thead');
    h.createEl('strong', { text: 'Hello song' }); h.createSpan({ cls: 'gq-hint', text: '  · sing it together to start, and do the moves' });
    const rows = HELLO_SONG.map(l => {
      const r = c.createDiv('gq-song-line'), g = r.createDiv({ cls: 'gq-song-gr', attr: { lang: 'el' } });
      const syl = l.notes.filter(n => n[0]).map(n => g.createSpan({ cls: 'gq-syl', text: n[0] }));
      r.createDiv({ cls: 'gq-hint gq-song-move', text: l.move + ' · ' + l.en });
      return { r, syl };
    });
    const row = c.createDiv('gq-row');
    const play = row.createEl('button', { text: 'Sing the hello song', cls: 'mod-cta' });
    const slow = row.createEl('button', { text: 'Slower', cls: 'gq-mini' });
    const words = row.createEl('button', { text: 'Hear the words', cls: 'gq-mini' });
    c.createDiv({ cls: 'gq-hint', text: 'No sound? Turn the phone volume up and check it is not on silent.' });
    const stop = () => { if (this.songStop) { this.songStop(); this.songStop = null; } };
    const run = async bpm => {
      stop();
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) { new Notice('This device cannot play the tune. Sing it with Hear the words.'); return; }
      const ctx = new AC();
      // Phones start the audio clock only after resume; schedule from the real clock once it runs.
      try { if (ctx.state !== 'running') await ctx.resume(); } catch (e) {}
      const beat = 60 / bpm, t0 = ctx.currentTime + 0.2, events = [];
      const out = ctx.createGain(); out.gain.value = 0.9; out.connect(ctx.destination);
      const hz = m => 440 * Math.pow(2, (m - 69) / 12);
      const tone = (m, at, dur, type, vol) => {
        const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.value = hz(m);
        g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(vol, at + 0.015);
        g.gain.exponentialRampToValueAtTime(vol * 0.55, at + Math.min(0.2, dur * 0.5)); g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
        o.connect(g); g.connect(out); o.start(at); o.stop(at + dur + 0.05);
      };
      for (let i = 0; i < 4; i++) tone(84, t0 + i * beat, 0.06, 'square', 0.05);
      let at = t0 + 4 * beat;
      HELLO_SONG.forEach((l, li) => {
        const start = at; let k = 0;
        l.chords.forEach((root, bi) => { const b = start + bi * 4 * beat; tone(root - 12, b, 1.9 * beat, 'sine', 0.22); tone(root - 5, b + 2 * beat, 1.9 * beat, 'sine', 0.16); });
        for (const [s, m, d] of l.notes) { if (s) { tone(m, at, d * beat * 0.92, 'triangle', 0.32); events.push({ at, li, idx: k++ }); } at += d * beat; }
      });
      const end = at;
      const clear = () => { for (const x of rows) { x.r.classList.remove('is-now'); x.syl.forEach(s => s.classList.remove('is-on')); } };
      // The highlight follows the audio clock itself, minus the time sound takes to reach the speaker, so it cannot drift.
      const lag = (ctx.outputLatency || 0) + (ctx.baseLatency || 0);
      let next = 0, raf = 0, curLine = -1;
      const frame = () => {
        const now = ctx.currentTime - lag;
        while (next < events.length && events[next].at <= now + 0.01) {
          const ev = events[next++];
          if (ev.li !== curLine) { clear(); rows[ev.li].r.classList.add('is-now'); curLine = ev.li; }
          rows[ev.li].syl[ev.idx].classList.add('is-on');
        }
        if (now < end + 0.1) raf = requestAnimationFrame(frame);
        else { clear(); play.setText('Sing it again'); this.songStop = null; this.moAdd('did', 'song', 2); try { ctx.close(); } catch (e) {} }
      };
      raf = requestAnimationFrame(frame);
      play.setText('Stop');
      this.songStop = () => { cancelAnimationFrame(raf); clear(); play.setText('Sing the hello song'); try { ctx.close(); } catch (e) {} };
    };
    play.onclick = () => { if (this.songStop) stop(); else run(112); };
    slow.onclick = () => run(84);
    words.onclick = () => { stop(); say(HELLO_SONG.map(l => l.gr).join(' ')); };
  }
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
    this.helloSong(box); if (box.lastElementChild) box.lastElementChild.dataset.tour = 'hello';
    // Starting out: the song, the letters and φόρα only, until the first letter set is done (or a grown-up opens the rest).
    const pf = this.progFm(), lDone = this.lettersDone(), simple = !this.kidFullNow && !pf.kid_full && !lDone.length && !this.moHasDays();
    this.kidSimpleOn = simple;
    if (lDone.length < LETTER_SETS.length) this.lettersCard(box);
    this.moCard(box);
    if (simple) {
      const c = box.createDiv('gq-tcard gq-kid gq-kidrest');
      c.createDiv({ cls: 'gq-hint', text: 'After the first letters, the rest of today opens: the lesson game, the story puzzle and this week\'s words.' });
      const b = c.createDiv('gq-row').createEl('button', { text: 'Show the rest of today', cls: 'gq-mini' }); b.onclick = () => this.kidFull();
      this.kidFoot(box, el, tok, col, wk); return;
    }
    if (!f) { box.createDiv({ cls: 'gq-tcard', text: 'This lesson is not in the vault yet. Tap More, then Update vault.' }); if (tok === el.gqTok) { el.empty(); el.appendChild(box); } return; }
    const txt = await this.app.vault.cachedRead(f), title = f.basename.replace(/^K\d+\s*/, '').replace(/-student$/, '');
    // 1. The game
    const g = box.createDiv('gq-tcard gq-kid'), gh = g.createDiv('gq-thead'); g.dataset.tour = 'game';
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
      // 2b. Story puzzle: the lines learned so far, built from word tiles (drag or tap). Each new day adds the new line.
      const turns = lines.slice(0, k + 1).filter(l => l.en).map(l => [l.who, l.gr, l.en]);
      if (turns.length) {
        const pz = box.createDiv('gq-tcard gq-kid gq-story'); pz.dataset.tour = 'puzzle';
        pz.createDiv({ cls: 'gq-thead' }).createEl('strong', { text: 'Story puzzle' });
        pz.createDiv({ cls: 'gq-hint', text: 'Read the English. Drag the Greek words up to finish the line, or just tap them.' });
        const pool = lines.map(l => l.gr).concat(this.kidLines(this.kidSection(txt, 'You are the teacher')).map(l => l.gr));
        this.convoGame(pz, turns, 5000 + wk.lesson, [], false, pool, () => {}, null, false);
      }
    }
    // 3. Swap: the kid is the teacher
    const sw = this.kidLines(this.kidSection(txt, 'You are the teacher'));
    if (sw.length) {
      const c = box.createDiv('gq-tcard gq-kid'); c.dataset.tour = 'teacher'; c.createDiv({ cls: 'gq-thead' }).createEl('strong', { text: 'Now you are the teacher' });
      c.createDiv({ cls: 'gq-hint', text: 'Swap. The kid asks the questions. The grown-up gets one wrong on purpose. Catch it.' });
      const ol = c.createEl('ol', { cls: 'gq-storylist gq-plain' });
      for (const l of sw) { const li = ol.createEl('li'); li.createSpan({ text: l.gr, attr: { lang: 'el' } }); if (l.en) li.createDiv({ cls: 'gq-hint', text: l.en }); }
      this.didBtn(c, 'teacher:' + wk.lesson);
    }
    // 4. This week's words, nouns first, with the colors
    const words = (await this.wordIndex()).filter(w => (w.kid || []).includes(wk.lesson));
    if (words.length) {
      const c = box.createDiv('gq-tcard gq-kid'); c.dataset.tour = 'words'; c.createDiv({ cls: 'gq-thead' }).createEl('strong', { text: `This week's words (${words.length})` });
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
      this.didBtn(c, 'moves:' + wk.lesson);
    }
    const nb = box.childElementCount; await this.dessertCard(box); if (box.childElementCount > nb) box.lastElementChild.dataset.tour = 'dessert';
    // Small buttons under the cards
    const tc = box.createDiv('gq-tcard gq-row gq-ttools'); tc.dataset.tour = 'tools';
    const tool = (t, fn, cls) => { const b = tc.createEl('button', { text: t, cls: cls || '' }); b.onclick = fn; };
    tool('Play Γιαγιά', () => this.openApp('giagia', '#k=' + wk.lesson), 'mod-cta'); tc.lastElementChild.dataset.tour = 'giagia';
    tool('All lessons', () => this.openNote('Lessons.md'));
    tool('Look up a word', () => new LookupModal(this.app, this).open());
    if (lDone.length >= LETTER_SETS.length) this.lettersCard(box);
    await this.kidFoot(box, el, tok, col, wk);
  }
  async kidFoot(box, el, tok, col, wk) {
    let rel = VAULT_RELEASE; try { rel = JSON.parse(await this.app.vault.adapter.read(INSTALLED)).release || rel; } catch (e) {}
    const foot = box.createDiv('gq-hint');
    const wn = foot.createEl('a', { text: "What's new", href: '#' }); wn.onclick = e => { e.preventDefault(); this.openNote(WHATS_NEW); };
    foot.appendText(` · vault ${rel} · `);
    if (this.updateReady && !this.updating) { const up = foot.createEl('a', { text: 'Install update', href: '#' }); up.onclick = e => { e.preventDefault(); this.updateVault(false); }; foot.appendText(' · '); }
    const gu = foot.createEl('a', { text: 'For grown-ups', href: '#' }); gu.onclick = e => { e.preventDefault(); this.openNote(SETUP); };
    // Slides parked here too: the kids Today is a plain list of cards.
    if (tok === el.gqTok) { el.empty(); el.appendChild(box); this.tabsSync(); this.kidLesson = wk.lesson; if (col.setup_seen) { if (this.tourState().at === undefined) this.tourState().at = 0; this.tourShow(); } }
  }
  moHasDays() { const f = this.app.vault.getAbstractFileByPath(MO_FILE); const fm = f ? ((this.app.metadataCache.getFileCache(f) || {}).frontmatter || {}) : {}; return !!((this.moMem && Object.keys(this.moMem.days || {}).length) || (fm.days && typeof fm.days === 'object' && Object.keys(fm.days).length)); }
  async kidFull() { this.kidFullNow = true; const f = await this.progressFile(); await this.app.fileManager.processFrontMatter(f, fm => { fm.kid_full = true; }); this.refreshToday(); }
  lettersDone() { const v = this.lettersNow || this.progFm().letters; return Array.isArray(v) ? v.map(Number).filter(n => n >= 1 && n <= LETTER_SETS.length) : []; }
  // Letters and sounds: tap a sound card to hear it, drag each letter onto the sound it makes (or tap the letter, then the sound).
  // A right match on the first try is a recall (γράμμα:β), so a letter remembered on a later day is worth 3 like a word. A set done: 2 φόρα, once a day.
  lettersCard(box) {
    const c = box.createDiv('gq-tcard gq-kid gq-abc'); c.dataset.tour = 'letters';
    const stopT = e => e.stopPropagation();
    for (const ev of ['touchstart', 'touchend', 'pointerdown', 'pointermove', 'pointerup']) c.addEventListener(ev, stopT, { passive: true });
    c.addEventListener('touchmove', e => { e.stopPropagation(); if (e.target && e.target.closest && e.target.closest('.gq-abc-tile')) e.preventDefault(); }, { passive: false });
    const draw = () => {
      c.empty(); clearTimeout(this.abcDemo);
      const done = this.lettersDone(), all = LETTER_SETS.length;
      let n = this.letterSet; if (!n) { const i = LETTER_SETS.findIndex((x, k) => !done.includes(k + 1)); n = i < 0 ? 1 : i + 1; }
      const h = c.createDiv('gq-thead'); h.createEl('strong', { text: 'Letters and sounds' });
      h.createSpan({ cls: 'gq-hint', text: done.length >= all ? '  · all 24 letters done' : `  · set ${n} of ${all}` });
      c.createDiv({ cls: 'gq-hint', text: 'Tap a sound to hear it. Drag each letter onto the sound it makes, or tap a letter, then its sound.' });
      const sets = c.createDiv('gq-row gq-abc-sets');
      LETTER_SETS.forEach((x, i) => { const b = sets.createEl('button', { cls: 'gq-mini' + (i + 1 === n ? ' is-on' : '') + (done.includes(i + 1) ? ' is-done' : ''), text: x.map(y => y.l).join(' '), attr: { lang: 'el', 'aria-label': `Set ${i + 1}` + (done.includes(i + 1) ? ', done' : '') } }); b.onclick = () => { this.letterSet = i + 1; draw(); }; });
      const set = LETTER_SETS[n - 1], miss = new Map(); let left = set.length, sel = null;
      const bank = c.createDiv('gq-abc-bank'), grid = c.createDiv('gq-abc-grid');
      const cards = this.shuf(set.slice()).map(x => {
        const k = grid.createDiv({ cls: 'gq-abc-card', attr: { role: 'button', tabindex: '0', 'aria-label': `Sound: ${x.s}, ${x.h}` } }); k.gqL = x;
        k.createDiv({ cls: 'gq-abc-slot', attr: { lang: 'el' } });
        const t = k.createDiv('gq-abc-txt'); const tb = t.createDiv('gq-abc-top'); tb.createEl('b', { text: x.s }); tb.createSpan({ cls: 'gq-abc-hear', text: 'Hear' }); t.createSpan({ cls: 'gq-hint', text: x.h });
        const act = () => { if (sel && !k.hasClass('is-ok')) { const s0 = sel; sel = null; s0.removeClass('is-sel'); match(s0, k); } else say(x.say); };
        k.onclick = act; k.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(); } };
        return k;
      });
      const match = (tile, k) => {
        const x = tile.gqL;
        if (k.gqL === x) {
          k.addClass('is-ok'); k.querySelector('.gq-abc-slot').setText(x.l); k.createDiv({ cls: 'gq-abc-word', text: `${x.w} · ${x.en}`, attr: { lang: 'el' } });
          tile.addClass('gq-used'); say(x.say); if (!miss.get(x.l)) this.moAdd('recall', 'γράμμα:' + x.l);
          const sw = k.createDiv('gq-abc-say'); this.sayIt(sw, x.w, 'said:' + x.w, `Say ${x.w}`); sw.onclick = e => e.stopPropagation();
          if (--left === 0) finish();
        } else {
          miss.set(x.l, (miss.get(x.l) || 0) + 1); k.addClass('is-no'); tile.addClass('is-no'); setTimeout(() => { k.removeClass('is-no'); tile.removeClass('is-no'); }, 500);
          if (miss.get(x.l) >= 2) { const r = cards.find(q => q.gqL === x); if (r) r.addClass('is-hint'); }
        }
      };
      for (const x of this.shuf(set.slice())) {
        const b = bank.createEl('button', { cls: 'gq-abc-tile', attr: { lang: 'el', 'aria-label': `Letter ${x.u} ${x.l}` } }); b.gqL = x;
        b.createSpan({ cls: 'gq-abc-big', text: x.l }); b.createSpan({ cls: 'gq-abc-up', text: x.u });
        let sx = 0, sy = 0, drag = false, id = null;
        b.onpointerdown = e => { sx = e.clientX; sy = e.clientY; drag = false; id = e.pointerId; try { b.setPointerCapture(id); } catch (er) {} };
        b.onpointermove = e => { if (id !== e.pointerId) return; const dx = e.clientX - sx, dy = e.clientY - sy; if (!drag && Math.hypot(dx, dy) > 8) { drag = true; b.addClass('gq-drag'); } if (drag) b.style.transform = `translate(${dx}px, ${dy}px)`; };
        b.onpointerup = e => {
          if (id !== e.pointerId) return; id = null;
          if (!drag) { if (sel === b) { sel = null; b.removeClass('is-sel'); return; } if (sel) sel.removeClass('is-sel'); sel = b; b.addClass('is-sel'); return; }
          drag = false; b.removeClass('gq-drag'); b.style.transform = '';
          const k = cards.find(q => { if (q.hasClass('is-ok')) return false; const r = q.getBoundingClientRect(); return e.clientX >= r.left - 6 && e.clientX <= r.right + 6 && e.clientY >= r.top - 6 && e.clientY <= r.bottom + 6; });
          if (k) { if (sel) { sel.removeClass('is-sel'); sel = null; } match(b, k); }
        };
        b.onpointercancel = () => { id = null; drag = false; b.removeClass('gq-drag'); b.style.transform = ''; };
      }
      const r = c.createDiv('gq-row');
      const demo = r.createEl('button', { text: 'Show me first', cls: 'gq-mini' });
      demo.onclick = () => {
        let i = 0; const tiles = [...bank.children];
        const step = () => {
          c.querySelectorAll('.is-demo').forEach(q => q.removeClass('is-demo')); if (i >= set.length) return;
          const x = set[i++], t = tiles.find(q => q.gqL === x), k = cards.find(q => q.gqL === x);
          if (t) t.addClass('is-demo'); if (k) k.addClass('is-demo'); say(x.say); this.abcDemo = setTimeout(step, 2200);
        };
        step();
      };
      const fin = c.createDiv('gq-abc-fin');
      const finish = async () => {
        const f = await this.progressFile(); let list = [];
        await this.app.fileManager.processFrontMatter(f, fm => { list = Array.isArray(fm.letters) ? fm.letters.map(Number) : []; if (!list.includes(n)) list.push(n); list.sort(); fm.letters = list; });
        this.lettersNow = list; setTimeout(() => { this.lettersNow = null; }, 3000);
        this.moAdd('did', 'letters:' + n, 2); this.tourHit('letters');
        demo.remove(); bank.style.display = 'none'; fin.empty(); fin.createDiv({ cls: 'gq-abc-yay', text: `Μπράβο. All ${set.length} letters in set ${n}.` });
        const fr = fin.createDiv('gq-row');
        const nx = LETTER_SETS.findIndex((x, k) => !list.includes(k + 1));
        if (nx >= 0) { const b = fr.createEl('button', { text: `Next: set ${nx + 1}`, cls: 'mod-cta' }); b.onclick = () => { this.letterSet = nx + 1; draw(); }; }
        const g = fr.createEl('button', { text: 'Play Γιαγιά with these letters', cls: nx >= 0 ? '' : 'mod-cta' }); g.onclick = () => this.openApp('giagia', '#L=' + n);
        const a = fr.createEl('button', { text: 'Again', cls: 'gq-mini' }); a.onclick = () => draw();
        if (this.kidSimpleOn) { this.kidSimpleOn = false; this.kidFullNow = true; const m = fin.createDiv('gq-hint', d => d.setText('The rest of today is open now, below.')); setTimeout(() => this.refreshToday(), 4000); }
      };
      if (done.length >= all) { const g = r.createEl('button', { text: 'Play Γιαγιά with all the letters', cls: 'gq-mini' }); g.onclick = () => this.openApp('giagia', '#L=all'); }
    };
    draw();
  }
  // A "Say it" button: listen, then +2 φόρα when the phone hears the target. key keeps it to once a day.
  sayIt(parent, target, key, label) {
    const w = parent.createSpan('gq-sayit');
    const b = w.createEl('button', { text: label || 'Say it · +2', cls: 'gq-mini gq-sayit-b', attr: { 'aria-label': 'Say it out loud for 2 bonus φόρα' } });
    const fb = w.createSpan({ cls: 'gq-hint gq-sayit-fb' });
    const win = () => { b.setText('Heard it · +2'); b.addClass('is-ok'); b.disabled = true; fb.setText(''); this.moAdd('said', key); };
    const typed = () => {
      b.remove(); fb.setText('');
      const i = w.createEl('input', { cls: 'gq-sayit-in', attr: { type: 'text', lang: 'el', placeholder: 'Tap the mic on the keyboard and say it', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false' } });
      const chk = () => { if (!i.value.trim()) return; if (heardIt(target, [i.value])) { i.disabled = true; w.createSpan({ cls: 'gq-hint', text: ' Heard it · +2' }); this.moAdd('said', key); } else fb.setText(' Not quite. Try again.'); };
      i.onchange = chk; i.onkeydown = e => { if (e.key === 'Enter') chk(); };
      w.appendChild(fb);
    };
    if (!SRec() || this.lsGet('sroff', 0)) { b.onclick = typed; return w; }
    b.onclick = async () => {
      if (b.hasClass('is-live')) return;
      try { window.speechSynthesis && speechSynthesis.cancel(); } catch (e) {}
      b.addClass('is-live'); b.setText('Listening…'); fb.setText('Say it now.');
      try {
        const alts = await listenGreek(); b.removeClass('is-live');
        if (heardIt(target, alts)) win();
        else { b.setText(label || 'Say it · +2'); fb.setText(alts.length ? ` Heard "${alts[0]}". Try again.` : ' Nothing heard. Try again, a little louder.'); }
      } catch (e) {
        b.removeClass('is-live'); b.setText(label || 'Say it · +2');
        if (e === 'no-speech' || e === 'aborted' || e === 'late') fb.setText(' Nothing heard. Try again.');
        // Blocked or not working here (Obsidian on a computer blocks it): use the keyboard's microphone instead, from now on.
        else { this.lsSet('sroff', 1); typed(); if (e === 'not-allowed' && window.GQW) fb.setText(' The microphone is blocked for this site. A grown-up can allow it in the browser settings.'); }
      }
    };
    return w;
  }
  shuf(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  // ---------- The tour: the fun first, the useful bits in between, on the real screens ----------
  // Each step is done by doing it (finish a line, pick a color, open a game), worth 2 φόρα once, ever.
  // Steps can be done in any order and on different days. Numbered dots let a teacher say "everyone on step 4" in class.
  // My progress: tour_at = the step showing (99 = closed), tour_done = the steps done.
  tourSteps() {
    if (this.isKids) {
      const k = this.kidLesson || 1;
      return [
        { k: 'hello', at: ['hello'], t: 'Start with a song', b: 'Sing the hello song together and do the moves. It starts every lesson.', ev: 'song' },
        { k: 'letters', at: ['letters'], t: 'Letters and sounds', b: 'Tap a sound to hear it. Drag each letter onto the sound it makes. Finish one set of six.', ev: 'letters' },
        { k: 'giagia', at: ['giagia'], t: 'Γιαγιά', b: 'Find 7 notebooks before Γιαγιά feeds you. Use the arrows or swipe. Come back here when you are done.', go: ['Play Γιαγιά', () => this.openApp('giagia', '#k=' + k)], ev: 'game' },
        { k: 'puzzle', at: ['puzzle'], t: 'Story puzzle', b: 'Drag the Greek words up to finish the line, or tap them. Finish one line.', ev: 'story' },
        { k: 'mo', at: ['mo'], t: 'Πήρες φόρα;', b: 'Right answers give you φόρα (momentum) and steps. Pick a world. Green words make it grow.', ev: 'world' },
        { k: 'words', at: ['words'], t: "This week's words", b: 'Hear each word, then pick a color: red is not yet, yellow is kind of, green is got it.', ev: 'up' },
        { k: 'teacher', at: ['teacher'], t: 'Now you are the teacher', b: 'Swap. The kid asks. The grown-up gets one wrong on purpose. Catch it. Then tap We did it.', ev: 'teacher' },
        { k: 'web', at: ['tab-words'], t: 'Word web', b: 'Tap a word to go there, double-tap to hear more than one, hold to see what it goes with.', go: ['Open the Word web', () => this.openGraph()], ev: 'web' },
        { k: 'class', at: ['tab-class'], t: 'Class', b: "This week's lesson and game, and a way to text the teacher.", go: ['Open Class', () => this.openClass()], ev: 'class', tab: 'class' }
      ];
    }
    return [
      { k: 'next', at: ['next'], t: 'Start here', b: 'Next always shows one thing to do now and about how long it takes. Tap Start.', ev: 'next' },
      { k: 'story', at: ['story'], t: 'Story puzzle', b: 'Finish one line: put the Greek words in order, then say it out loud.', ev: 'story' },
      { k: 'world', at: ['mo'], t: 'Πήρες φόρα;', b: 'Everything you do adds φόρα (momentum) and steps, and steps become dances. Pick a world. Green words make it grow.', ev: 'world' },
      { k: 'words', at: ['tab-words'], t: 'Words', b: 'All the words in one list, most frequent first. Find one you know and tap its color: red, yellow or green.', go: ['Open Words', () => this.openWords()], ev: 'up', tab: 'words' },
      { k: 'web', at: ['tab-words'], t: 'Word web', b: 'See what a word goes with. Tap a word to go there. Hold it to hear a phrase.', go: ['Open the Word web', () => this.openGraph()], ev: 'web' },
      { k: 'game', at: [], t: 'Γιαγιά', b: 'A quick game with your words. Come back here when you are done.', go: ['Play Γιαγιά', () => this.openApp('giagia', '')], ev: 'game' },
      { k: 'class', at: ['tab-class'], t: 'Class', b: "This week's lesson, the rally, homework, practice together and your teacher, in one place.", go: ['Open Class', () => this.openClass()], ev: 'class', tab: 'class' },
      { k: 'plan', at: ['next'], t: 'Pick your moment', b: 'Choose when you practice: after coffee, after the bus. Doing it after something you already do makes it easy to start.', ev: 'plan' },
      { k: 'focus', at: [], t: 'Focus', b: 'The side panel has Calm mode, Focus sound, and Walk mode for practicing on the move.', go: ['Open the side panel', () => this.showMore()], ev: 'more' }
    ];
  }
  tourState() {
    if (!this.tour) { const fm = this.progFm(); this.tour = { at: fm.tour_at === undefined || fm.tour_at === null ? undefined : parseInt(fm.tour_at, 10), done: Array.isArray(fm.tour_done) ? fm.tour_done.map(String) : [], seen: Array.isArray(fm.tour_seen) ? fm.tour_seen.map(String) : [] }; }
    return this.tour;
  }
  tourLeft() { const d = this.tourState().done; return this.tourSteps().filter(x => x.ev && !d.includes(x.k)).length; }
  tourOpen() { const a = this.tourState().at; return a !== undefined && a < 99; }
  tourIs(k) { if (!this.tourOpen()) return false; const st = this.tourSteps()[this.tourState().at]; return !!st && st.k === k; }
  async tourSave() { const t = this.tourState(), f = await this.progressFile(); await this.app.fileManager.processFrontMatter(f, fm => { if (t.at === undefined) delete fm.tour_at; else fm.tour_at = t.at; fm.tour_done = [...t.done]; fm.tour_seen = [...(t.seen || [])]; }); }
  // Kept for older calls: set the step showing.
  async tourSet(n) { this.tourState().at = n; await this.tourSave(); }
  async tourStart(n) {
    const t = this.tourState(), steps = this.tourSteps();
    this.lsSet('tourlater', 0); this.tourMin = false;
    t.at = n !== undefined ? n : Math.max(0, steps.findIndex(x => x.ev && !t.done.includes(x.k)));
    await this.tourSave(); await this.openToday(); setTimeout(() => this.tourShow(), 400);
  }
  // The work itself counts: these come from φόρα events and from opening things.
  tourEv(kind, key) {
    if (kind === 'did' && key.startsWith('tour:')) return;
    if (kind === 'up') this.tourHit('up');
    else if ((kind === 'recall' || kind === 'try') && key.startsWith('π:')) this.tourHit('story');
    else if (kind === 'did' && key.startsWith('beat:')) this.tourHit('story');
    else if (kind === 'did' && key === 'song') this.tourHit('song');
    else if (kind === 'did' && key.startsWith('teacher:')) this.tourHit('teacher');
  }
  tourHit(ev) {
    const t = this.tourState(), steps = this.tourSteps();
    const st = steps.find(x => x.ev === ev && !t.done.includes(x.k)); if (!st) return;
    // Only while the tour has been started at least once, so students who never take it see no change.
    if (t.at === undefined) return;
    t.done.push(st.k); this.moAdd('did', 'tour:' + st.k, 2);
    const cur = steps[t.at]; if (cur && cur.k === st.k) { const nx = steps.findIndex((x, i) => i > t.at && !(x.ev && t.done.includes(x.k))); t.at = nx < 0 ? 99 : nx; }
    this.tourSave(); setTimeout(() => this.tourShow(), 300);
  }
  // A line on the Next card: start the tour, or pick it up again.
  tourLine(c) {
    const t = this.tourState(), left = this.tourLeft(), all = this.tourSteps().filter(x => x.ev).length;
    if (!left || this.tourOpen() || this.lsGet('tourlater', 0) > Date.now()) return;
    const d = c.createDiv('gq-hint gq-tour-line');
    if (!t.done.length) d.appendText(`New here? Take the tour · about 5 min · up to ${all * 2} φόρα. `);
    else d.appendText(`Tour: ${all - left} of ${all} done. `);
    const a = d.createEl('a', { text: t.done.length ? 'Keep going' : 'Start the tour', href: '#' }); a.onclick = e => { e.preventDefault(); this.tourStart(); };
  }
  tourShow() {
    document.querySelectorAll('.gq-tour-on').forEach(x => x.removeClass('gq-tour-on'));
    const old = document.querySelector('.gq-tour'); if (old) old.remove();
    const t = this.tourState(); if (!this.tourOpen()) return;
    const steps = this.tourSteps(); if (t.at >= steps.length) { t.at = 99; this.tourSave(); return; }
    const st = steps[t.at];
    // Seen: the step was shown. Its dot turns yellow (kind of) until it is tried, then green.
    if (!t.seen) t.seen = []; if (!t.seen.includes(st.k)) { t.seen.push(st.k); this.tourSave(); }
    if (st.tab) this.tabReveal(st.tab);
    const vis = el => el && (el.offsetParent !== null || el.getClientRects().length);
    let el = null; for (const k of st.at || []) { el = [...document.querySelectorAll(`[data-tour="${k}"]`)].find(vis); if (el) break; }
    // Kids starting out see only the first cards; a step further down opens the rest of today.
    if (!el && this.isKids && this.kidSimpleOn && (st.at || []).some(k => !k.startsWith('tab-'))) { this.kidSimpleOn = false; this.kidFull(); return; }
    if (el) { el.addClass('gq-tour-on'); if (!el.closest('#gq-nav') && !el.closest('.side-dock-ribbon')) { el.style.scrollMarginTop = '12px'; setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60); } }
    const tip = document.body.createDiv({ cls: 'gq-tour' + (this.tourMin ? ' is-min' : ''), attr: { role: 'dialog', 'aria-label': 'Tour' } });
    const done = k => t.done.includes(k);
    if (this.tourMin) {
      const b = tip.createEl('button', { cls: 'gq-tour-pill', text: `Tour · step ${t.at + 1}: ${st.t}` }); b.onclick = () => { this.tourMin = false; this.tourShow(); };
      return;
    }
    const top = tip.createDiv('gq-tour-top');
    top.createSpan({ cls: 'gq-tour-step', text: `Step ${t.at + 1} of ${steps.length}` });
    const mn = top.createEl('button', { cls: 'gq-tour-x', text: '–', attr: { 'aria-label': 'Make the tour small' } }); mn.onclick = () => { this.tourMin = true; this.tourShow(); };
    const dots = tip.createDiv({ cls: 'gq-tour-dots', attr: { 'aria-label': 'Tour steps' } });
    steps.forEach((x, i) => { const d = dots.createEl('button', { text: String(i + 1), cls: 'gq-tour-dot' + (i === t.at ? ' is-at' : '') + (x.ev && done(x.k) ? ' is-done' : (t.seen.includes(x.k) && i !== t.at ? ' is-seen' : '')), attr: { 'aria-label': `Step ${i + 1}: ${x.t}` + (done(x.k) ? ', done' : t.seen.includes(x.k) ? ', seen, not tried yet' : '') } }); d.onclick = () => { t.at = i; this.tourSave(); this.tourShow(); }; });
    tip.createDiv({ cls: 'gq-tour-t', text: st.t + (st.ev && done(st.k) ? ' · done' : ''), attr: { lang: 'el' } });
    tip.createDiv({ text: st.b });
    if (st.ev && !done(st.k)) tip.createDiv({ cls: 'gq-hint', text: 'Try it to finish this step: +2 φόρα.' });
    if (this.tourSkipped) { tip.createDiv({ cls: 'gq-hint gq-tour-skipped', text: `Step ${this.tourSkipped} stays yellow until you try it. Tap its dot any time.` }); this.tourSkipped = 0; }
    if (t.seen.some(k => !done(k) && k !== st.k)) tip.createDiv({ cls: 'gq-hint gq-tour-key', text: 'Green: tried it · Yellow: seen, not tried yet' });
    const r = tip.createDiv('gq-row'), last = t.at === steps.length - 1;
    if (st.go) { const a = r.createEl('button', { text: st.go[0], cls: 'mod-cta' }); a.onclick = () => { this.tourMin = true; this.tourShow(); st.go[1](); }; }
    const nx = r.createEl('button', { text: last ? 'Done' : 'Next', cls: st.go ? '' : 'mod-cta' });
    // Next skips steps already tried. A step left untried stays yellow, and saying so keeps it a choice, not a slip.
    const nxi = steps.findIndex((x, i) => i > t.at && !(x.ev && done(x.k)));
    if (nxi < 0) nx.setText('Done');
    nx.onclick = () => { if (st.ev && !done(st.k)) this.tourSkipped = t.at + 1; t.at = nxi < 0 ? 99 : nxi; this.tourSave(); if (nxi < 0) { this.tourSkipped = 0; this.tourBye(); } this.tourShow(); };
    const sk = r.createEl('button', { text: last ? 'Close' : 'Later', cls: 'gq-mini gq-tour-skip' }); sk.onclick = () => { t.at = 99; this.lsSet('tourlater', Date.now() + 3 * 864e5); this.tourSave(); this.tourShow(); this.refreshToday(); };
  }
  tourBye() { const left = this.tourLeft(); new Notice(left ? `Tour closed. ${left} step${left === 1 ? '' : 's'} still to try, any time: More, then Take the tour.` : 'Tour done. Θα τα πούμε.'); this.refreshToday(); }
  // ---------- Tabs: Today, Words, Class, More. Words and Class appear once there is something in them. ----------
  tabOn(k) { const t = this.progFm().tabs; return (this.tabsNow || (Array.isArray(t) ? t : [])).includes(k); }
  async tabReveal(k) {
    if (this.tabOn(k)) return; const t = this.progFm().tabs; this.tabsNow = [...new Set([...(this.tabsNow || (Array.isArray(t) ? t : [])), k])];
    const f = await this.progressFile(); await this.app.fileManager.processFrontMatter(f, fm => { fm.tabs = [...this.tabsNow]; });
    this.tabsSync(); const el = this.rib && this.rib[k]; if (el) { el.addClass('gq-pulse'); setTimeout(() => el.removeClass('gq-pulse'), 4000); }
    const nav = document.querySelector(`#gq-nav [data-tour="tab-${k}"]`); if (nav) { nav.addClass('gq-pulse'); setTimeout(() => nav.removeClass('gq-pulse'), 4000); }
  }
  tabsSync() {
    if (!this.rib) return;
    const col = this.colors(); const n = col.red.length + col.yellow.length + col.green.length;
    if (n && !this.tabOn('words')) { this.tabReveal('words'); return; }
    if (!this.tabOn('class') && (this.together().when || (this.progFm().homework_sent))) { this.tabReveal('class'); return; }
    for (const k of ['words', 'class']) { const el = this.rib[k]; if (el) { el.toggleClass('gq-hide', !this.tabOn(k)); el.dataset.tour = 'tab-' + k; } }
    if (window.GQW && window.GQW.navSync) window.GQW.navSync();
  }
  // Which tab a view belongs to, for the web app's bottom bar.
  tabFor(v) {
    const t = v && v.getViewType ? v.getViewType() : '';
    if (t === WORDSV || t === WEB) return 'Words';
    if (t === CLASSV) return 'Class';
    if (t === 'markdown' && v.file && v.file.path === TODAY) return 'Today';
    if (t === 'markdown' && v.file && v.file.path.startsWith('Words/')) return 'Words';
    return '';
  }
  async openTab(type) {
    const ws = this.app.workspace; let leaf = ws.getLeavesOfType(type).find(l => l.getRoot() === ws.rootSplit);
    if (!leaf) { leaf = this.mainLeaf(false); await leaf.setViewState({ type, active: true }); }
    else if (leaf.view && leaf.view.onOpen) await leaf.view.onOpen();
    ws.revealLeaf(leaf); ws.setActiveLeaf && ws.setActiveLeaf(leaf, { focus: true });
  }
  async openWords() { await this.tabReveal('words'); await this.openTab(WORDSV); }
  async openClass() { await this.tabReveal('class'); await this.openTab(CLASSV); }
  // ---------- Words: find a word, then the list like a spreadsheet you color in ----------
  async renderWords(el) {
    const st = this.wv = this.wv || { q: '', show: 'all', block: 0, cover: false };
    el.empty(); el.addClass('gq-words'); const box = el.createDiv('gq-words-in');
    const words = await this.wordIndex(); const total = words.length, BL = 100;
    const head = box.createDiv('gq-words-head');
    const q = head.createEl('input', { type: 'search', cls: 'gq-input', attr: { placeholder: 'Find a word: English or Greek', 'aria-label': 'Find a word', autocapitalize: 'off', autocomplete: 'off', spellcheck: 'false' } }); q.value = st.q;
    const seg = head.createDiv({ cls: 'gq-seg', attr: { role: 'group', 'aria-label': 'View' } });
    const bl = seg.createEl('button', { text: 'List', cls: 'is-on' });
    const bw = seg.createEl('button', { text: 'Web' }); bw.onclick = () => { const h = st.q ? this.findWords(st.q)[0] : null; this.openGraph(h ? h.path : (this.lastWebPath || '')); };
    bl.onclick = () => {};
    const sum = box.createDiv('gq-words-sum'), bar = box.createDiv({ cls: 'gq-words-bar', attr: { 'aria-hidden': 'true' } });
    const filt = box.createDiv('gq-row gq-words-filt'), list = box.createDiv('gq-words-list'), more = box.createDiv('gq-row gq-words-more');
    const count = () => {
      const c = this.colors(), g = c.green.length, y = c.yellow.length, r = c.red.length;
      sum.empty(); sum.createSpan({ cls: 'gq-g', text: `${g} green` }); sum.appendText(' · '); sum.createSpan({ cls: 'gq-y', text: `${y} yellow` }); sum.appendText(' · '); sum.createSpan({ cls: 'gq-r', text: `${r} red` }); sum.appendText(` · of ${total.toLocaleString('en-US')}`);
      bar.empty(); for (const [k, n] of [['green', g], ['yellow', y], ['red', r]]) if (n) bar.createDiv({ cls: 'gq-' + k, attr: { style: `width:${(100 * n / total).toFixed(2)}%` } });
    };
    const chip = (k, label) => { const b = filt.createEl('button', { text: label, cls: 'gq-mini' + (st.show === k ? ' is-on' : '') }); b.onclick = () => { st.show = k; st.block = 0; this.renderWords(el); }; };
    chip('all', 'All'); chip('none', 'No color'); chip('red', 'Red'); chip('yellow', 'Yellow'); chip('green', 'Green');
    const cv = filt.createEl('label', { cls: 'gq-cover' }); const cb = cv.createEl('input', { type: 'checkbox' }); cb.checked = st.cover; cv.appendText(' Cover English');
    cb.onchange = () => { st.cover = cb.checked; draw(); };
    const ORDER = ['red', 'yellow', 'green'];
    const draw = () => {
      count(); list.empty(); more.empty();
      const c = this.colors(), of = w => this.colorOf(w.word);
      let rows = st.q ? this.findWords(st.q) : words;
      if (st.show !== 'all') rows = rows.filter(w => (of(w) || 'none') === st.show);
      const pages = Math.max(1, Math.ceil(rows.length / BL)); if (st.block >= pages) st.block = 0;
      const page = rows.slice(st.block * BL, st.block * BL + BL);
      if (!page.length) { list.createDiv({ cls: 'gq-hint', text: st.q ? 'Not in the list. Try Look up in More for any other word.' : 'No words here yet.' }); }
      if (st.cover && page.length) list.createDiv({ cls: 'gq-hint', text: 'Say the English out loud, then tap to check. Had it or Not yet counts like any recall.' });
      const tb = list.createEl('table', { cls: 'gq-sheet' });
      const hr = tb.createEl('thead').createEl('tr'); for (const h of ['#', 'Greek', 'English', 'Color']) hr.createEl('th', { text: h });
      const body = tb.createEl('tbody');
      for (const w of page) {
        const tr = body.createEl('tr'), k = of(w);
        tr.createEl('td', { cls: 'gq-sheet-n', text: this.isKids ? '' : String(w.rank) });
        const g = tr.createEl('td', { cls: 'gq-sheet-gr', attr: { lang: 'el' } }); const a = g.createEl('a', { text: w.word, href: '#' }); a.onclick = e => { e.preventDefault(); say(w.word); this.openNote(w.path); };
        const en = tr.createEl('td', { cls: 'gq-sheet-en' });
        if (st.cover) {
          const r = en.createEl('button', { text: 'Tap to check', cls: 'gq-mini gq-sheet-peek' });
          r.onclick = () => { en.empty(); en.appendText(w.english + ' '); const rr = en.createSpan('gq-sheet-had'); this.hadIt(rr, w.word, () => { rr.remove(); }); rr.querySelectorAll('button').forEach(b => b.addClass('gq-mini')); };
        } else en.setText(w.english);
        const cc = tr.createEl('td', { cls: 'gq-sheet-c' });
        const cbtn = cc.createEl('button', { cls: 'gq-cell gq-' + (k || 'new'), attr: { 'aria-label': `${w.word}: ${k || 'no color'}. Tap to change.` } }); cbtn.setText(k ? COLORS.find(x => x[0] === k)[1] : 'Tap');
        cbtn.onclick = async () => { const nx = ORDER[(ORDER.indexOf(k) + 1) % 3]; await this.setColor(w.word, nx); setTimeout(draw, 150); };
      }
      if (pages > 1) {
        const p = more.createEl('button', { text: '‹', cls: 'gq-mini', attr: { 'aria-label': 'Previous 100' } }); p.disabled = st.block === 0; p.onclick = () => { st.block--; draw(); list.scrollIntoView({ block: 'start' }); };
        more.createSpan({ cls: 'gq-hint', text: `${st.block * BL + 1}–${Math.min(rows.length, st.block * BL + BL)} of ${rows.length}` });
        const n = more.createEl('button', { text: '›', cls: 'gq-mini', attr: { 'aria-label': 'Next 100' } }); n.disabled = st.block >= pages - 1; n.onclick = () => { st.block++; draw(); list.scrollIntoView({ block: 'start' }); };
      }
    };
    let tm = 0; q.oninput = () => { clearTimeout(tm); tm = setTimeout(() => { st.q = q.value.trim(); st.block = 0; draw(); }, 200); };
    draw();
    box.createDiv({ cls: 'gq-hint gq-words-foot', text: 'Red: don\'t have it. Yellow: kind of. Green: have it. A color you move up that still holds two days later earns φόρα.' });
  }
  // ---------- Class: the latest lesson, practice and the teacher ----------
  async renderClass(el) {
    el.empty(); el.addClass('gq-classv'); const box = el.createDiv('gq-today gq-class-in');
    box.createEl('h2', { text: 'Class' });
    if (this.isKids) {
      const info = await this.kidsInfo(), wk = info ? this.kidWeek(info) : null, f = wk ? this.kidFile(wk.lesson) : null;
      const c = box.createDiv('gq-tcard'); c.createDiv({ cls: 'gq-thead' }).createEl('strong', { text: wk ? `This week · Lesson ${wk.lesson}` : 'This week' });
      const r = c.createDiv('gq-row'); if (f) { const b = r.createEl('button', { text: 'Lesson page', cls: 'mod-cta' }); b.onclick = () => this.openNote(f.path); }
    } else {
      const now = new Date(); now.setHours(0, 0, 0, 0);
      const dd = Math.floor((now - new Date(COURSE_START[0], COURSE_START[1], COURSE_START[2])) / 864e5), week = dd < 0 ? 1 : Math.floor(dd / 7) + 1;
      const wk = await this.weekNote(week);
      if (wk) await this.classCard(box, wk, week); else box.createDiv({ cls: 'gq-tcard gq-hint', text: 'The year is finished.' });
    }
    const c = box.createDiv('gq-tcard'); c.createDiv({ cls: 'gq-thead' }).createEl('strong', { text: 'Homework and your teacher' });
    const r = c.createDiv('gq-row');
    const h = r.createEl('button', { text: 'Send homework' }); h.onclick = () => this.sendHomework();
    const t = r.createEl('button', { text: 'Text your teacher' }); t.onclick = () => window.open('sms:' + TEACHER_SMS, '_self');
    c.createDiv({ cls: 'gq-hint', text: 'To ask about a word or a lesson, open its note, then More, then Ask about this note.' });
    const pt = this.together(); if (this.isKids && !pt.when) return;
    const p = box.createDiv('gq-tcard'); p.createDiv({ cls: 'gq-thead' }).createEl('strong', { text: 'Practice together' });
    p.createDiv({ cls: 'gq-hint', text: pt.when ? `Weekly drop-in · ${pt.when}` : 'Practicing next to someone makes it easier to start. Ask your teacher for a drop-in time.' });
    const pr = p.createDiv('gq-row');
    if (pt.link) { const j = pr.createEl('button', { text: 'Join', cls: 'mod-cta' }); j.onclick = () => window.open(pt.link, '_blank'); }
    if (this.app.vault.getAbstractFileByPath(EXTRAS + 'Practice together.md')) { const m = pr.createEl('button', { text: 'How it works', cls: 'gq-mini' }); m.onclick = () => this.openNote(EXTRAS + 'Practice together.md'); }
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
  // Dessert word: one word from the jar, then say it, make up a move, and draw it.
  async myDesserts() {
    const f = this.app.vault.getAbstractFileByPath(DESSERT_FILE); if (!f) return [];
    const t = await this.app.vault.cachedRead(f), out = [];
    for (const m of t.matchAll(/^\s*[-*]\s*(.+?)\s+[–—=-]\s+(.+?)\s*$/gm)) out.push([m[1], m[2], 0, 1]);
    return out;
  }
  async addDessert(gr, en) {
    const line = `- ${gr} – ${en}`, ad = this.app.vault.adapter;
    if (!(await ad.exists('My Work'))) await ad.mkdir('My Work');
    if (await ad.exists(DESSERT_FILE)) { const t = await ad.read(DESSERT_FILE); await ad.write(DESSERT_FILE, t.replace(/\n*$/, '\n') + line + '\n'); }
    else await ad.write(DESSERT_FILE, '# My dessert words\n\nOur own treats for the jar. One per line: Greek – English.\n\n' + line + '\n');
  }
  async dessertCard(box) {
    const c = box.createDiv('gq-tcard gq-kid gq-dessert'); c.createDiv({ cls: 'gq-thead' }).createEl('strong', { text: 'Dessert word' });
    c.createDiv({ cls: 'gq-hint', text: 'A treat after the lesson. Pick one, say it, make up a move, draw it.' });
    const show = c.createDiv('gq-dshow'), r = c.createDiv('gq-row');
    const pick = r.createEl('button', { text: 'Pick a dessert word', cls: 'mod-cta' });
    const add = r.createEl('button', { text: 'Add our own', cls: 'gq-mini' });
    let last = '';
    pick.onclick = async () => {
      const jar = DESSERT.concat(await this.myDesserts()).filter(x => x[0] !== last);
      const w = jar[Math.floor(Math.random() * jar.length)]; last = w[0]; show.empty();
      const b = show.createEl('button', { cls: 'gq-dword', text: w[0], attr: { lang: 'el', 'aria-label': 'Hear ' + w[0] } }); b.onclick = () => say(w[0]);
      show.createDiv({ cls: 'gq-den', text: w[1] + (w[2] ? '  ·  sounds like English' : '') + (w[3] ? '  ·  one of ours' : '') });
      say(w[0]); pick.setText('Another one');
      this.drawPad(show);
    };
    add.onclick = () => {
      if (c.querySelector('.gq-dadd')) return;
      const f = c.createDiv('gq-dadd gq-row');
      const g = f.createEl('input', { attr: { type: 'text', placeholder: 'Greek (δράκος)', lang: 'el', 'aria-label': 'Greek word' } });
      const e = f.createEl('input', { attr: { type: 'text', placeholder: 'English (dragon)', 'aria-label': 'English' } });
      const s = f.createEl('button', { text: 'Put it in the jar', cls: 'gq-mini' });
      s.onclick = async () => { const a = g.value.trim(), b = e.value.trim(); if (!a || !b) { new Notice('Type the Greek and the English.'); return; } await this.addDessert(a, b); new Notice(`${a} is in the jar. It is saved in My Work, My dessert words.`); f.remove(); };
      g.focus();
    };
  }
  // A small place to draw with a finger or a mouse. Not saved.
  drawPad(parent) {
    const wrap = parent.createDiv('gq-dpad'), cv = wrap.createEl('canvas', { attr: { width: 600, height: 320, 'aria-label': 'Draw it here' } });
    const x = cv.getContext('2d'); if (!x) return; let down = false;
    x.lineWidth = 6; x.lineCap = 'round'; x.lineJoin = 'round'; x.strokeStyle = getComputedStyle(document.body).getPropertyValue('--text-normal') || '#222';
    const at = ev => { const b = cv.getBoundingClientRect(); return [(ev.clientX - b.left) * cv.width / b.width, (ev.clientY - b.top) * cv.height / b.height]; };
    cv.onpointerdown = ev => { down = true; cv.setPointerCapture && cv.setPointerCapture(ev.pointerId); x.beginPath(); x.moveTo(...at(ev)); };
    cv.onpointermove = ev => { if (!down) return; x.lineTo(...at(ev)); x.stroke(); };
    cv.onpointerup = cv.onpointercancel = () => { down = false; };
    const r = wrap.createDiv('gq-row'); const cl = r.createEl('button', { text: 'Clear', cls: 'gq-mini' }); cl.onclick = () => x.clearRect(0, 0, cv.width, cv.height);
    r.createSpan({ cls: 'gq-hint', text: 'Draw it here, or on paper.' });
  }
  popBtn(row, text, fn) { const b = row.createEl('button', { text, cls: 'gq-mini gq-popbtn' }); b.onclick = fn; return b; }
  // Today's line: listen, say it from memory, then mark it said.
  popLine(b, n, done) {
    const big = (el, t) => this.lineEl(el.createDiv('gq-pop-big'), t, b.words);
    this.pop(`Today's line · week ${b.week}`, [
      { label: 'Listen', build: (el, api) => { el.createDiv({ cls: 'gq-hint', text: 'Hear it, then say it out loud with the voice.' }); big(el, b.gr); const r = el.createDiv('gq-row'); this.hearBtn(r, b.gr); say(b.gr); const nx = r.createEl('button', { text: 'Ready', cls: 'mod-cta' }); nx.onclick = api.next; } },
      { label: 'From memory', build: (el, api) => { el.createDiv({ cls: 'gq-hint', text: 'Say it in Greek without looking, then check.' }); el.createDiv({ cls: 'gq-pop-big gq-pop-en', text: b.en }); const g = el.createDiv('gq-pop-big gq-pop-hide'); this.lineEl(g, b.gr, b.words); const r = el.createDiv('gq-row'); const c = r.createEl('button', { text: 'Check', cls: 'mod-cta' }); c.onclick = () => { g.removeClass('gq-pop-hide'); say(b.gr); c.remove(); this.hadIt(r, 'line:' + b.gr.slice(0, 80), api.next); }; } },
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
      s.onclick = () => { ans.removeClass('gq-pop-hide'); say(p.you[0]); s.remove(); if (p.you.length > 1) this.hearBtn(r, p.you.join(' '), 'Hear both'); this.hadIt(r, 'rally:' + p.t.slice(0, 80), api.next); };
    } }));
    steps.push({ label: 'Swap', build: (el, api) => {
      el.createDiv({ cls: 'gq-hint', text: 'Now you ask. Say each question out loud, as if to the teacher.' });
      const ol = el.createEl('ol', { cls: 'gq-storylist gq-pop-list' }); for (const p of pairs) ol.createEl('li', { text: p.t, attr: { lang: 'el' } });
      const r = el.createDiv('gq-row'); this.hearBtn(r, pairs.map(p => p.t).join(' '), 'Hear them all');
      const d = r.createEl('button', { text: 'Done', cls: 'mod-cta' }); d.onclick = () => { this.moAdd('did', 'rally-swap:' + n, 2); api.close(); };
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
      this.thinkBeat(s, 'Say it out loud first');
      s.onclick = () => { g.removeClass('gq-pop-hide'); say(c.gr); s.remove(); this.hearBtn(r, c.gr, 'Hear again'); this.hadIt(r, 'cb:' + c.gr.slice(0, 80), k === due.length - 1 ? () => { this.markDone('cb'); api.close(); this.refreshToday(); } : api.next); };
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
      const r = el.createDiv('gq-row'); this.hearBtn(r, lines.map(l => l.gr).join(' '), 'Hear it all'); const d = r.createEl('button', { text: 'Done', cls: 'mod-cta' }); d.onclick = () => { this.moAdd('did', 'lines:' + title, 2); api.close(); };
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
  editionName() { return this.isTeacher ? 'Teacher' : this.isKids ? 'Kids' : this.edition === 'beginner' ? 'Beginner' : 'Intermediate'; }
  // The level you picked stays lit. Right after a tap, the saved setting can take a moment to reach Obsidian's cache, so the tap wins.
  paintScripts() {
    const v = this.scriptsNow || this.colors().scripts;
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
    if (lesson) { const b = row.createEl('button', { text: 'More on this lesson ›', cls: 'gq-mini' }); b.onclick = () => this.showMore(); this.lessonJump(row, p); }
  }
  // Lesson tables with three or more columns stack into one card per row on a phone (CSS does the stacking).
  stackTables(el, ctx) {
    const p = ctx && ctx.sourcePath; if (!p || !p.startsWith('Scripts/')) return;
    for (const t of el.querySelectorAll('table')) {
      const hs = [...t.querySelectorAll('thead th')].map(h => h.textContent.trim()); if (hs.length < 3 || t.hasClass('gq-stack')) continue;
      t.addClass('gq-stack');
      for (const tr of t.querySelectorAll('tbody tr')) [...tr.children].forEach((td, i) => { if (i >= 2 && hs[i]) td.setAttr('data-label', hs[i]); });
    }
  }
  // "On this page": the main sections of a long lesson, folded, so it costs one line.
  lessonJump(row, path) {
    const c = this.app.metadataCache.getCache(path), hs = ((c && c.headings) || []).filter(h => h.level === 2); if (hs.length < 4) return;
    const d = row.parentElement.createEl('details', { cls: 'gq-jump' }); row.after(d); d.createEl('summary', { text: 'On this page' });
    const ul = d.createEl('ul');
    for (const h of hs) {
      const a = ul.createEl('li').createEl('a', { text: h.heading, href: '#' });
      a.onclick = e => {
        e.preventDefault(); d.open = false;
        const root = row.closest('.markdown-preview-view, .markdown-reading-view, .view-content') || document;
        const t = [...root.querySelectorAll('h2')].find(x => x.textContent.trim() === h.heading.trim());
        if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); else this.app.workspace.openLinkText(path + '#' + h.heading, path);
      };
    }
  }
  async ensureMore() {
    const ws = this.app.workspace; if (this.isKids || ws.getLeavesOfType(MORE).length) return;
    const leaf = ws.getRightLeaf(false); if (leaf) await leaf.setViewState({ type: MORE, active: false });
  }
  async showMore() {
    this.tourHit('more');
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
      btn('Build a sentence', () => this.openPair(f.basename));
      btn('Play Γιαγιά with this word', async () => this.openApp('giagia', '#w=' + encodeURIComponent((await this.webWords(f.path)).join(','))));
      btn('Games', () => this.openNote(this.gamesNote()));
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
    // The Kids vault keeps its few extra pages (Games, Setting up, What's New, Lessons) at the top level.
    const ex = this.app.vault.getMarkdownFiles().filter(x => this.isKids ? x.path.split('/').length === 1 && x.path !== TODAY : x.path.startsWith(EXTRAS) && x.path.split('/').length === 2).sort((a, b) => a.basename.localeCompare(b.basename));
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
    btn('Word web', () => this.openGraph());
    btn('Games', () => this.openNote(this.gamesNote()));
    btn('Send homework', () => this.sendHomework());
    btn('My homework', () => this.openNote(MY_WORK + 'Homework.md'));
    const sec = (title, open) => { const d = box.createEl('details', { cls: 'gq-more-sec' }); if (open) d.open = true; d.createEl('summary', { text: title }); return d.createDiv('gq-more-body'); };
    this.focusSec(sec('Focus'));
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
    foot.appendText(` · vault ${rel} (${this.editionName()}) · `);
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

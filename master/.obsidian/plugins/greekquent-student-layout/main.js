const { Plugin, ItemView, Notice, requestUrl, MarkdownView, MarkdownRenderer, Modal, Menu, Platform } = require('obsidian');
// Greekquent Student Layout: keeps the student view simple.
// Turn this plugin off (Settings > Community plugins) to get the full Obsidian interface back.
const MOVE = ['search', 'tag', 'bookmarks', 'backlink', 'outgoing-link', 'outline', 'localgraph'];
const BLOCK = ['graph', 'all-properties'];   // the whole-vault graph and the properties list
const HIDE_RIBBON = ['graph:Open graph view', 'command-palette:Open command palette', 'switcher:Open quick switcher'];
// Left toolbar: Today, Look up, Ask, More. Everything else lives in More and in the command palette.
// Feedback goes to the teacher by text message. Change the number here if it ever changes.
const FEEDBACK_SMS = '+18033990665';
// © 2026 Daniel Houlis. All rights reserved. Greekquent™ and Frequent™ are trademarks of Daniel Houlis.
const VAULT_RELEASE = '2026-11-25f';
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
const WATCH = 'Extras/Watch list.md';   // the free videos for the Watch this card: a table the teacher can add rows to
const FOCI = [['listen', 'Understanding people'], ['speak', 'Speaking without freezing'], ['read', 'Reading Greek'], ['trip', 'Greek for a trip'], ['verbs', 'Verbs'], ['mix', 'Mix it up']];
const WLEV = ['ears', 'a1', 'a2'];
// Language Transfer's own app: downloads ahead and keeps playing with the screen locked.
const LT_APP = /android/i.test((typeof navigator !== 'undefined' && navigator.userAgent) || '') ? 'https://play.google.com/store/apps/details?id=org.languagetransfer' : 'https://apps.apple.com/us/app/language-transfer/id1519599004';
const ltPlayer = n => 'https://w.soundcloud.com/player/?url=' + encodeURIComponent(ltTrackUrl(n)) + '&auto_play=true&visual=false&show_comments=false&show_user=false&show_reposts=false&show_teaser=false&hide_related=true&color=%23315f9e';
// Glue for the color builder: whole little words that join two ready-made pieces.
const GLUE = [['και', 'and'], ['αλλά', 'but'], ['γιατί', 'because'], ['μετά', 'then']];
const CARD_IDEAS = EXTRAS + '14 Card ideas.md', COPYRIGHT_NOTE = EXTRAS + 'Copyright.md';
const COPYRIGHT = '© 2026 Daniel Houlis. All rights reserved. Greekquent™ and Frequent™ are trademarks of Daniel Houlis.';
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
// Voices read a capital vowel standing alone as a letter name ("κεφαλαίο άλφα", "ita", "omikron"). Alone it is a sound or a word
// (Α! Ε; Η, Ο, Ω!). A short cry like Ωχ, Αχ or Ωπ is read letter by letter too. Lowercase these for the voice only: Α! is heard as "a!".
// Some phones still read a lone α! or ε, (lowercase too) as άλφα or έψιλον, so a lone α or ε is doubled for the voice: αα, εε.
const ttsFix = t => String(t).replace(/(^|[^\p{L}])([ΑαΆάΕεΈέ])(?=\s*[!,.;…·]|\s*$)/gu, (m, a, b) => a + (/[ΑαΆά]/.test(b) ? 'αα' : 'εε')).replace(/(^|[^\p{L}])([ΑΕΗΙΟΥΩΆΈΉΊΌΎΏ][βγδζθκλμνξπρστφχψς]{0,2})(?=[^\p{L}]|$)/gu, (m, a, b) => a + b.toLowerCase()).replace(/^\s*([αεηιουωάέήίόύώ][βγδζθκλμνξπρστφχψς]{0,2})\s*$/u, '$1!');
// Speaking right after cancel() is dropped on some phones (iPhone, some Android), so wait a moment when something is still talking.
// The utterance is kept in a variable so it is not cleaned up before it speaks.
let sayU = null, sayVoice = null;
const isGreekT = t => /[\u0370-\u03ff\u1f00-\u1fff]/.test(String(t));
// Greek voice: one on the phone itself first (works offline and starts faster), Google's next, then any Greek voice.
const greekVoice = () => { try { if (!sayVoice) { const el = (speechSynthesis.getVoices() || []).filter(v => /^el/i.test(v.lang)); sayVoice = el.find(v => v.localService && /google/i.test(v.name)) || el.find(v => v.localService) || el.find(v => /google/i.test(v.name)) || el[0] || null; } } catch (e) {} return sayVoice; };
const gqUA = () => { try { return navigator.userAgent || ''; } catch (e) { return ''; } };
const gqAndroid = () => /Android/i.test(gqUA());
// An app's built-in browser on Android (Obsidian, GroupMe, Facebook, Instagram, Gmail): Android's WebView has no speech,
// so the page goes quiet. Spotted by "; wv)" in the browser name, or no speech at all.
const gqWebView = () => /; wv\)|FBAN|FBAV|Instagram|GroupMe|Line\//i.test(gqUA());
let gqVoicesSeen = false;
const noSpeech = () => { try { if (!window.speechSynthesis || typeof SpeechSynthesisUtterance === 'undefined') return true; if (gqWebView() && !gqVoicesSeen && !(speechSynthesis.getVoices() || []).length && Date.now() - gqT0 > 2500) return true; } catch (e) { return true; } return false; };
const gqT0 = Date.now();
// What the voice did last time, for the sound check: started, an error, or nothing at all.
let sayLast = null;
// Speak one utterance, the same way everywhere. Android fixes: a longer gap after cancel() (a quick speak after it is dropped),
// and a watchdog: Chrome on Android can get stuck after the app was in the background (it says it is speaking, nothing plays).
// If a fresh line has not started after 2.5 s, cancel and say it once more.
const speakU = u => {
  const ss = window.speechSynthesis; if (!ss) return;
  let started = false; sayU = u; sayLast = { at: Date.now(), ok: null, err: '' };
  u.addEventListener('start', () => { started = true; if (sayU === u) sayLast = { at: Date.now(), ok: true, err: '' }; });
  u.addEventListener('error', e => { if (sayU === u && e && e.error !== 'interrupted' && e.error !== 'canceled') sayLast = { at: Date.now(), ok: false, err: String(e.error || 'error') }; });
  const go = retry => {
    try { ss.resume(); } catch (e) {}
    try { ss.speak(u); } catch (e) { sayLast = { at: Date.now(), ok: false, err: 'speak failed' }; return; }
    if (!retry) setTimeout(() => { if (!started && sayU === u) { try { ss.cancel(); } catch (e) {} setTimeout(() => { if (sayU === u) go(true); }, 200); } }, 2500);
  };
  let busy = false; try { busy = ss.speaking || ss.pending; } catch (e) {}
  if (busy) { try { ss.cancel(); } catch (e) {} setTimeout(() => { if (sayU === u) go(false); }, gqAndroid() ? 250 : 80); } else go(false);
};
// Greek voice off (this device): phones keep speaking in silent mode, because Android's ringer switch does not mute media.
const gqQuiet = () => { try { return window.localStorage.getItem('gq-quiet') === '1'; } catch (e) { return false; } };
// No Greek voice on this phone (common on Android with Samsung's engine, or Google's without Greek installed): the phone's
// default voice then spells Greek out letter by letter. Stay quiet instead and show how to add a Greek voice, once per visit.
// Only when the phone has listed its voices; an empty list just means they have not loaded yet.
const noGreekVoice = () => { try { const v = speechSynthesis.getVoices() || []; return v.length > 0 && !v.some(x => /^el/i.test(x.lang)); } catch (e) { return false; } };
const say = w => {
  if (!w || gqQuiet()) return;
  if (noSpeech()) { if (window.gqNoVoice) window.gqNoVoice(); return; }
  if (noGreekVoice() && isGreekT(w)) { if (window.gqNoVoice) window.gqNoVoice(); return; }
  const u = new SpeechSynthesisUtterance(ttsFix(w)); u.lang = 'el-GR'; const v = greekVoice(); if (v) try { u.voice = v; } catch (e) {}
  speakU(u);
};
// Phones (iPhone most of all, some Android too) keep the voice locked until a tap speaks once. A word the app plays by itself,
// like the first Listen question in a quiz, was then silent until Hear it again. The first tap anywhere speaks a silent blank,
// which unlocks the voice for the rest of the visit. Nothing is heard.
(() => { try {
  if (typeof document === 'undefined' || !window.speechSynthesis || typeof SpeechSynthesisUtterance === 'undefined') return;
  const wake = () => { ['touchend', 'click', 'keydown'].forEach(t => document.removeEventListener(t, wake, true)); try { const ss = window.speechSynthesis; if (ss.speaking || ss.pending) return; const u = new SpeechSynthesisUtterance(' '); u.volume = 0; u.lang = 'el-GR'; ss.speak(u); ss.getVoices(); } catch (e) {} };
  ['touchend', 'click', 'keydown'].forEach(t => document.addEventListener(t, wake, true));
} catch (e) {} })();
// The same voice rules inside the games (Γιαγιά, Story Lines, buzzer, cousins): runs in the game's frame.
// Greek voice off means quiet; no Greek voice tells the vault (it shows how to add one); a stuck Android voice gets one retry.
function gqFrameVoice() {
  try {
    var ss = window.speechSynthesis; if (!ss) { try { parent.postMessage({ gq: 'novoice' }, '*'); } catch (e) {} return; }
    var sp = ss.speak.bind(ss), cur = null, android = /Android/i.test(navigator.userAgent || '');
    var pickV = function () { var el = (ss.getVoices() || []).filter(function (v) { return /^el/i.test(v.lang); }); return el.filter(function (v) { return v.localService && /google/i.test(v.name); })[0] || el.filter(function (v) { return v.localService; })[0] || el.filter(function (v) { return /google/i.test(v.name); })[0] || el[0] || null; };
    ss.speak = function (u) {
      var q = false; try { q = localStorage.getItem('gq-quiet') === '1'; } catch (e) {} if (q) return;
      var greek = /[\u0370-\u03ff\u1f00-\u1fff]/.test(u.text || '');
      try { var vs = ss.getVoices() || []; if (vs.length && greek && !vs.some(function (v) { return /^el/i.test(v.lang); })) { parent.postMessage({ gq: 'novoice' }, '*'); return; } if (greek && (!u.voice || !/^el/i.test(u.voice.lang))) { var gv = pickV(); if (gv) try { u.voice = gv; } catch (e) {} u.lang = 'el-GR'; } } catch (e) {}
      var started = false, fresh = !(ss.speaking || ss.pending); cur = u;
      u.addEventListener('start', function () { started = true; });
      sp(u);
      if (fresh) setTimeout(function () { if (!started && cur === u) { try { ss.cancel(); } catch (e) {} setTimeout(function () { if (cur === u) sp(u); }, android ? 250 : 120); } }, 2500);
    };
  } catch (e) {}
}
// In a phrase a word can change: σε + το = στο, μεγάλος → μεγάλο. Say so, so a new student isn't puzzled.
const wwFold = t => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/ς/g, 'σ');
const wwForm = (lab, phrase) => {
  const bare = lab.replace(/^(ο|η|το|οι|τα) /, ''), toks = phrase.split(/[\s,.;!·?«»]+/).filter(Boolean), f = wwFold(bare);
  if (toks.some(t => wwFold(t) === f)) return '';
  if (f === 'σε') { const t = toks.find(t => /^σ(το|τον|την|τη|τα|τις|τους|τ')$/i.test(t)); if (t) return `Here σε joins the next word: σε + ${t.slice(1)} = ${t}.`; }
  let best = '', n = 0; for (const t of toks) { const g = wwFold(t); let k = 0; while (k < g.length && k < f.length && g[k] === f[k]) k++; if (k > n) { n = k; best = t; } }
  return n >= 3 ? `Here it is ${best}: the ending changes to fit.` : '';
};
// Does a phrase already hold the verb, in any form? Then the web says the phrase as it is, without the verb in front
// (είμαι + αυτός → "αυτός είναι ο φίλος μου", not "είμαι αυτός είναι ο φίλος μου"). είμαι changes its whole shape, so it has a list.
const VERB_FORMS = { 'είμαι': ['ειμαι', 'εισαι', 'ειναι', 'ειμαστε', 'ειστε', 'εισαστε', 'ημουν', 'ημουνα', 'ησουν', 'ησουνα', 'ηταν', 'ητανε', 'ημασταν', 'ησασταν'] };
const hasVerb = (name, phrase) => {
  const f = fold(name), toks = fold(phrase).split(/[\s,.;!·?«»;]+/).filter(Boolean);
  if (VERB_FORMS[name]) return toks.some(t => VERB_FORMS[name].includes(t));
  const st = f.replace(/(ομαι|αμαι|ουμαι|ω)$/, ''), s = st.length >= 2 ? st : f.slice(0, 3);
  return toks.some(t => t.startsWith(s));
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
// The object form (after a verb: Θέλω τον καφέ). Only the singular. Neuter never changes, feminine changes only η → τη(ν).
// τον and έναν always keep the ν; τη(ν) keeps it before a vowel or κ π τ ξ ψ μπ ντ γκ τσ τζ (Greek school grammar, §4.5).
const keepN = next => { const f = fold(next || ''); return !f || /^([αεηιουω]|μπ|ντ|γκ|τσ|τζ|[κπτξψ])/.test(f); };
const ACC_SPECIAL = { 'ο': 'τον', 'ένας': 'έναν', 'κανένας': 'κανέναν', 'κανείς': 'κανέναν', 'καθένας': 'καθέναν', 'πολύς': 'πολύ', 'δικός μου': 'δικό μου', 'ποιος': 'ποιον', 'αυτός': 'αυτόν', 'εκείνος': 'εκείνον' };
// A describing word or article that already agrees (μεγάλος, η, μία) → its object form. next = the word after it, for τη(ν).
const accWord = (form, g, next) => {
  if (g === 'n' || !form) return form;
  if (g === 'f') return form === 'η' ? (keepN(next) ? 'την' : 'τη') : form;
  if (ACC_SPECIAL[form]) return ACC_SPECIAL[form];
  const m = form.match(/^(.+?)(ος|ός|ής|ης)$/); if (!m) return form;
  return m[1] + ({ 'ος': 'ο', 'ός': 'ό', 'ής': 'ή', 'ης': 'η' })[m[2]];
};
// A noun with its article (ο καφές, η πόλη) → τον καφέ, την πόλη. Masculine endings: -ος -ας -ης -ές -ούς lose the ς.
const accNoun = (noun, g) => {
  const m = (noun || '').match(/^(ο|η|το) (\S+)(.*)$/); if (!m || g === 'n') return noun;
  let w = m[2];
  if (g === 'm') w = w.replace(/(ος|ός|ας|άς|ης|ής|ές|ούς)$/, x => x.slice(0, -1));
  else if (/(ος|ός)$/.test(w)) w = w.replace(/ς$/, '');
  return accWord(m[1], g, w) + ' ' + w + m[3];
};
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
// Word families (Word web, Family): words built on one root, hand-checked. A | marks where a prefix ends, for "περι (around) + μένω".
const FAMILIES = [["stay",["μένω","περι|μένω","παρα|μένω"]],["carry, bring",["φέρνω","κατα|φέρνω","ανα|φέρω","μετα|φέρω","προσ|φέρω","προ|φέρω","υπο|φέρω","φορά","ανα|φορά","δια|φορά","μετα|φορά","προσ|φορά","προ|φορά"]],["put, place",["θέση","υπο|θέτω","υπό|θεση","έκ|θεση","διά|θεση","επί|θεση","επί|θετο","απο|θήκη","συν|θήκη"]],["stand",["στάση","στέκομαι","από|σταση","κατά|σταση","παρά|σταση","κατά|στημα","σύ|στημα","διά|στημα","προ|στατεύω","προ|στασία","εργοστάσιο"]],["way, road",["οδός","είσ|οδος","έξ|οδος","περί|οδος","οδηγώ","οδηγία"]],["being",["ουσία","παρ|ουσία","περι|ουσία","εξ|ουσία"]],["call",["καλώ","παρα|καλώ","προ|καλώ","απο|καλώ","καλεσμένος","κλήση","εκ|κλησία"]],["take",["λαμβάνω","ανα|λαμβάνω","επανα|λαμβάνω","κατα|λαβαίνω"]],["have, hold",["έχω","προσ|έχω","αντ|έχω","συν|έχεια","συν|εχίζω","σχέση","υπό|σχεση","υπό|σχομαι","έν|οχος"]],["come",["έρχομαι","προ|έρχομαι"]],["follow",["ακολουθώ","εξ|ακολουθώ","παρα|κολουθώ"]],["write, draw",["γράφω","γράμμα","γραμμή","πρό|γραμμα","γραφείο","έγ|γραφο","αντί|γραφο","φωτογραφία","δημοσιογράφος","συγ|γραφέας","ζωγραφική"]],["step, put",["βάζω","δια|βάζω"]],["know",["γνωρίζω","ανα|γνωρίζω","γνωστός","γνώμη","συγ|γνώμη"]],["seek, ask for",["ζητάω","ζήτημα","συ|ζητάω","συ|ζήτηση"]],["ask",["ρωτάω","ερώτηση","ανα|ρωτιέμαι"]],["luck, chance",["τύχη","τυχερός","α|τύχημα","επι|τυχία","πετυχαίνω","ευ|τυχία","ευ|τυχώς","δυσ|τυχώς","ευ|τυχισμένος"]],["voice, sound",["φωνή","φωνάζω","συμ|φωνώ","συμ|φωνία","σύμ|φωνα με","τηλέ|φωνο","τηλε|φωνώ","τηλε|φώνημα"]],["common, shared",["κοινός","κοινωνία","κοινωνικός","κοινότητα","επι|κοινωνία","επι|κοινωνώ"]],["danger",["κίνδυνος","επι|κίνδυνος"]],["law",["νόμος","νόμιμος","νομικός","παρά|νομος"]],["foreign, guest",["ξένος","παρά|ξενος","ξενοδοχείο"]],["sleep",["ύπνος","ξυπνάω","έξ|υπνος"]],["middle",["μέσα","μέσος","μέσω","ανά|μεσα","αμέσως"]],["other",["άλλος","αλλού","εξ|άλλου"]],["show",["δείχνω","δείγμα","παρά|δειγμα"]],["give",["δίνω","δόση","παρά|δοση"]],["send",["στέλνω","στολή","απο|στολή"]],["sign, mark",["σήμα","σημάδι","σημείο","σημείωμα","σημαίνει","σημασία","σημαντικός","διά|σημος","επί|σημος"]],["appear, show",["φαίνομαι","εμ|φανίζομαι","εξ|αφανίζομαι","επι|φάνεια","προ|φανώς","φαντάζομαι","φαντασία","φανταστικός"]],["space, place",["χώρος","χώρα","χωριό","χωράφι","χωρίζω","χωρίς","ξεχωριστός","προ|χωράω"]],["friend, love",["φίλος","φίλη","φιλί","φιλία"]],["light",["φως","φώτα","φωτιά","φωτογραφία"]],["joy, grace",["χαρά","χαρούμενος","χάρη","χαριτωμένος","ευ|χαριστώ","ευ|χαρίστηση","συγ|χαρητήρια"]],["sibling",["αδερφός","αδερφή","αδέρφια"]],["look, think",["σκέφτομαι","σκέψη","επί|σκεψη","επι|σκέπτης"]],["spirit, mind",["θυμάμαι","θυμίζω","θυμωμένος","επι|θυμία"]],["trust, faith",["πίστη","πιστεύω","πιστός","α|πίστευτος","εμ|πιστεύομαι","εμ|πιστοσύνη"]],["turn",["επι|στρέφω","επι|στροφή","κατα|στρέφω","κατα|στροφή"]],["value, honor",["τιμή","πολύ|τιμος","προ|τιμώ","εκ|τιμώ","τιμωρία"]],["begin, lead",["αρχή","αρχίζω","αρχαίος","αρχηγός","δήμαρχος","υπ|άρχω"]],["facing",["απ|αντάω","απ|άντηση","συν|αντάω","συν|άντηση","εν|άντια","εν|αντίον","απ|έναντι"]],["run, way",["δρόμος","διά|δρομος","αεροδρόμιο"]],["ground",["πεδίο","επί|πεδο"]],["taste, meal",["γεύμα","από|γευμα"]],["feel, suffer",["παθαίνω","συμ|παθώ","προσ|παθώ","προσ|πάθεια"]],["cause, claim",["αιτία","απ|αιτώ"]],["decide",["απόφαση","αποφασίζω"]],["word, reason",["λόγος","λόγω","λογικός","λογική","επι|λογή","δικαιολογία","λογαριασμός","υπο|λογιστής"]],["more",["πλέον","επι|πλέον"]],["up",["πάνω","παρα|πάνω"]],["little",["λίγο","παρα|λίγο"]],["accuse",["κατηγορώ","κατηγορία"]],["direct",["δι|εύθυνση","κατ|εύθυνση"]],["advise",["συμβουλή","συμβούλιο"]],["fall",["περί|πτωση","σύμ|πτωση"]],["quiet",["ησυχία","αν|ησυχώ"]],["patience",["υπομονή","αν|υπομονώ"]],["turn, around",["γύρω","γυρίζω"]],["eye",["μάτι","ματιά"]],["measure",["μέτρο","μετράω"]],["love",["αγάπη","αγαπάω"]],["help",["βοήθεια","βοηθάω"]],["work",["δουλειά","δουλεύω"]],["wish",["ευχή","εύχομαι"]],["heat",["ζέστη","ζεσταίνω"]],["theory, view",["θεωρία","θεωρώ"]],["hunt",["κυνήγι","κυνηγάω"]],["function",["λειτουργία","λειτουργώ"]],["win",["νίκη","νικάω"]],["travel",["ταξίδι","ταξιδεύω"]],["sing",["τραγούδι","τραγουδάω"]],["clean",["καθαρά","καθαρίζω","καθαρός"]],["calm",["ήρεμα","ηρεμώ"]],["gather",["μαζί","μαζεύω"]]];
// Language Transfer: the track where each of the 1,500 is first heard (matched from the course transcripts by form and stem, so close, not exact). Track numbers only.
const LT_FIRST = {"περιμένω":2,"μένω":2,"δεν":2,"με":2,"τι":3,"για":3,"που":3,"γιατί":3,"πού":3,"ξέρω":4,"εγώ":4,"κανείς":4,"καλά":4,"κάνω":4,"τώρα":4,"αλάτι":5,"νερό":5,"να":5,"θέλω":5,"εδώ":6,"σε":6,"κινητό":7,"όχι":8,"σύστημα":8,"έχω":8,"αυτοκίνητο":8,"είμαι":8,"αυτός":8,"πρόγραμμα":8,"βιβλίο":8,"πρόβλημα":8,"προσπαθώ":9,"προς":9,"πάθος":9,"προσέχω":9,"προσπάθεια":9,"μπορώ":10,"εσύ":10,"βλέπω":11,"και":11,"ψυχή":13,"από":13,"δρόμος":13,"άντρας":13,"καφές":13,"μεγάλος":14,"κόσμος":14,"πόλη":14,"ή":14,"καλημέρα":16,"σήμερα":16,"σπίτι":16,"μετά":16,"καλός":16,"μέρα":16,"εκεί":16,"πράγμα":17,"παράδειγμα":17,"κάτι":17,"πάλι":17,"ναι":18,"νικάω":18,"λαός":18,"κατά":19,"καταφέρνω":19,"τρένο":19,"φέρνω":19,"πίνω":19,"κάτω":19,"καταλαβαίνω":19,"καταστροφή":19,"εμείς":19,"αύριο":20,"μου":20,"επιστρέφω":20,"σοφία":20,"φίλη":20,"σου":20,"φίλος":20,"μάθημα":21,"μαθαίνω":21,"αρχίζω":21,"αρχή":21,"υπάρχω":21,"υπομονή":21,"μα":21,"αίμα":21,"παιδί":21,"καφέ":21,"εκείνος":22,"παρά":22,"καλώ":22,"άτομο":22,"παρακαλώ":22,"μας":22,"βράδυ":22,"παραμένω":22,"πώς":23,"θα":23,"ευχαριστώ":23,"πως":23,"χαρά":23,"γραφείο":24,"γράφω":24,"δύο":25,"λίγος":26,"λίγο":26,"παίρνω":27,"παρέα":27,"τηλεφωνώ":27,"τηλέφωνο":27,"αλλά":28,"ώρα":28,"ακόμη":28,"πέντε":28,"ακόμα":28,"επιστροφή":28,"μαγεία":29,"συχνά":29,"αν":29,"άποψη":29,"μαγειρεύω":29,"απόψε":29,"ταξιδεύω":29,"πιο":29,"ψάρι":30,"δουλεύω":30,"δουλειά":30,"φυτεύω":30,"ταξίδι":30,"σύντομα":31,"αγορά":31,"φόβος":31,"ζω":31,"αγοράζω":31,"αλλάζω":32,"αλλού":32,"άλλος":32,"νομίζω":32,"παίζω":32,"φτάνω":33,"ποτέ":33,"τέλεια":33,"τελειώνω":33,"πότε":33,"κρύο":33,"τέλειος":33,"κρύος":33,"τελείως":33,"αυτοί":35,"χάνω":36,"μαγαζί":36,"κλείνω":36,"ξεχνάω":36,"ταινία":37,"έλα":38,"ας":38,"τρώω":38,"λέω":39,"όταν":40,"δίνω":40,"ήδη":40,"πρέπει":41,"νωρίς":41,"λέξη":42,"του":43,"αφήνω":43,"μήνυμα":43,"ψέμα":44,"τους":44,"της":44,"επειδή":45,"στέλνω":45,"γρήγορα":45,"τότε":46,"μέχρι":46,"βάζω":46,"σχολή":47,"έτος":47,"οκτώ":47,"χρονιά":47,"εβδομάδα":47,"χρόνος":47,"χαρακτήρας":48,"ήχος":48,"σχολείο":48,"χρώμα":48,"μήλο":48,"χορεύω":48,"στομάχι":49,"πουλάω":49,"στόμα":49,"μόνος":49,"πονάω":49,"μόνο":49,"μακριά":50,"πολύς":51,"πολύ":51,"έξω":52,"Ελλάδα":52,"νέος":52,"βρίσκομαι":53,"βρίσκω":53,"λογαριασμός":53,"γιαγιά":55,"χθες":56,"μεγαλύτερος":56,"προτιμώ":56,"φθηνός":56,"ότι":56,"τιμή":56,"όρεξη":57,"καλύτερος":57,"δείχνω":58,"καιρός":58,"λείπω":59,"ζωή":59,"ζώο":59,"είσοδος":61,"μέρος":61,"έξοδος":61,"πόρτα":61,"γάλα":62,"σαλάτα":62,"διότι":62,"μουσική":62,"λεφτά":63,"καν":63,"Δευτέρα":63,"Πέμπτη":63,"ρούχα":63,"τύχη":66,"ευτυχισμένος":66,"κουρασμένος":66,"ευτυχία":66,"όλος":67,"γύρος":67,"ωραία":68,"αγαπημένος":68,"ωραίος":68,"πάντα":69,"ψωμί":69,"όλο":69,"εισιτήριο":69,"πεινάω":70,"πριν":71,"φεύγω":71,"εσείς":72,"ποιος":73,"ρωτάω":73,"γεια":73,"υγεία":73,"αγάπη":73,"ποιο":73,"ξυπνάω":73,"ούτε":73,"σας":73,"αγαπάω":73,"μιλάω":73,"μήνας":74,"ζητάω":74,"είτε":74,"περπατάω":75,"πάτωμα":75,"ελληνικά":75,"οδός":76,"εξηγώ":76,"θεωρώ":76,"ακούω":76,"οδηγώ":76,"μόλις":76,"σύμφωνος":76,"συμφωνώ":76,"εννοώ":76,"σίγουρος":77,"εύκολα":77,"βασικός":77,"βασικά":77,"σωστός":77,"εύκολος":77,"σωστά":77,"σίγουρα":77,"γλώσσα":77,"καθαρίζω":77,"σωστό":77,"γενικός":77,"καθαρά":77,"δύσκολα":78,"καινούργιος":78,"δύσκολος":78,"ελληνικός":79,"φύση":79,"κοντά":79,"φυσικός":79,"φυσικά":79,"σημαντικός":79,"κεντρικός":79,"μυστικός":79,"κέντρο":79,"ζάχαρη":80,"μισώ":81,"γυναίκα":81,"χρησιμοποιώ":82,"χρήση":82,"μαλλιά":82,"χρήσιμος":82,"απλά":84,"τελικά":84,"απλός":84,"όπου":85,"απάντηση":85,"συγγνώμη":85,"απαντάω":85,"σκάλα":86,"ιός":87,"φτιάχνω":87,"κάθε":88,"πάω":88,"πηγαίνω":88,"δάσκαλος":88,"άνθρωπος":89,"άνοιξη":90,"πάμε":90,"καταπληκτικός":91,"τόσος":91,"παιχνίδι":91,"όσο":91,"θέμα":91,"τόσο":91,"μένα":92,"ίδιος":94,"πολίτης":94,"κοστίζω":94,"πορτοκαλί":94,"φιλία":94,"πόσο":94,"ποσό":94,"πόσος":94,"φιλί":94,"πορτοκάλι":94,"φοράω":94,"φορά":94,"πιθανότητα":95,"προσωπικό":95,"αδερφός":95,"αδερφή":95,"πρόσωπο":95,"πιθανός":95,"προσωπικός":95,"δυνατός":95,"σημαίνει":96,"όνομα":96,"όποτε":97,"όπως":97,"οπότε":97,"δέκα":97,"ευρώ":97,"μην":98,"τίποτα":99,"θέατρο":99,"περίπου":100,"τηλεόραση":101,"έρχομαι":101,"οδηγός":101,"όμορφος":102,"μορφή":102,"γάτα":103,"καρδιά":103,"άρα":103,"έτσι":104,"βρέχει":104,"πάρτι":105,"όποιος":105,"οποίος":105,"κοπέλα":105,"γνωρίζω":105,"μαζί":105,"Αθήνα":106,"σκέψη":106,"σκέφτομαι":106,"φαντάζομαι":107,"καλεσμένος":107,"καθόλου":107,"πουλί":108,"ενοίκιο":108,"νοικιάζω":108,"σαν":109,"κοιμάμαι":109,"φαίνομαι":109,"φάρμα":109,"φοβάμαι":109,"χρειάζομαι":109,"κύκλος":109,"φαρμακείο":109,"θυμάμαι":109,"φάρμακο":109,"διαμέρισμα":110,"αισθάνομαι":110,"τρέλα":112,"τρελός":112,"βρε":112,"εκατό":113,"εργάζομαι":113,"κάθομαι":113,"γίνομαι":113,"μισός":114,"έτοιμος":116,"ετοιμάζω":116,"εαυτός":117,"πλένω":117,"λόγος":118,"άρρωστος":119,"τραγουδάω":119};
// Each track's SoundCloud page (free, no account). Five tracks have their own address.
const LT_SC = 'https://soundcloud.com/languagetransfer/', LT_SC_ODD = { 47: 'complete-greek-track47-language-transfer-the-thinking-method', 62: 'complete-greek-track-61-language-transfer-the-thinking-method-1', 66: 'complete-greek-track-66-languagetransfer-the-thinking-method', 91: '91a', 120: 'complete-greek-track-120-end-language-transfer-the-thinking-method' };
const ltTrackUrl = n => n >= 1 && n <= 120 ? LT_SC + (LT_SC_ODD[n] || `complete-greek-track-${String(n).padStart(2, '0')}-language-transfer-the-thinking-method`) : LT_URL;
// The book reading each lesson assigns: [Beginners' Greek unit, Complete Greek unit and page]. Unit and page numbers only.
const BOOK_UNITS = {"L01":["Unit 1",""],"L02":["Unit 6",""],"L03":["Unit 3",""],"L04":["Unit 3","Unit 3, p. 32"],"L05":["Unit 7",""],"L06":["Unit 6",""],"L07":["Unit 1",""],"L08":["Unit 5",""],"L09":["Unit 5",""],"L10":["Unit 8",""],"L11":["Unit 2","Unit 6, p. 88"],"L12":["Unit 10","Unit 8, p. 118"],"L13":["Unit 10","Unit 4, p. 46"],"L14":["Unit 8",""],"L15":["Unit 2",""],"L17":["Unit 9","Unit 7, p. 104"],"L18":["Unit 7",""],"L19":["Unit 2","Unit 5, p. 70"],"L20":["Unit 4",""],"L21":["Unit 9",""],"L22":["Unit 3",""],"L23":["Unit 9",""],"L24":["Unit 6",""],"L25":["Unit 5","Unit 10, p. 160"],"I01":["","Unit 1, p. 2"],"I02":["","Unit 3, p. 32"],"I03":["","Unit 9, p. 144"],"I04":["","Unit 3, p. 32"],"I05":["","Unit 7, p. 104"],"I06":["","Unit 2, p. 18"],"I07":["","Unit 10, p. 160"],"I08":["","Unit 9, p. 144"],"I09":["","Unit 1, p. 2"],"I10":["","Unit 6, p. 88"],"I11":["","Unit 6, p. 88"],"I12":["","Unit 8, p. 118"],"I13":["","Unit 4, p. 46"],"I14":["","Unit 9, p. 144"],"I15":["","Unit 2, p. 18"],"I17":["","Unit 7, p. 104"],"I18":["","Unit 11, p. 178"],"I19":["","Unit 5, p. 70"],"I20":["","Unit 7, p. 104"],"I21":["","Unit 10, p. 160"],"I22":["","Unit 12"],"I23":["","Unit 12"],"I24":["","Unit 12"],"I25":["","Unit 10, p. 160"]};
// Free audio for the two books (Teach Yourself library pages).
const BOOK_AUDIO = { beg: 'https://library.teachyourself.com/id007706138/Beginners-Greek-Audio', comp: 'https://library.teachyourself.com/id004325540/Complete-Greek-free-resources' };
// The week between classes: Language Transfer right after class, then the book reading for the next class. Class days come from the student (setup, or Options).
const DAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const CLASS_DEFAULT = [3];
// Light English stemming so "thinking", "wished" and "years" find think, wish and year.
const enStem = t => t.split(' ').map(x => x.length > 4 ? x.replace(/(ing|ed|es|s)$/, '') : x).join(' ');
// Close words (Look up): words in the 1,500 that mean nearly the same thing, and how each one differs. [set, [[word, how it differs, English cues;...]]]. Hand-written.
const CLOSE = [["think, believe",[["νομίζω","your opinion: νομίζω ότι βρέχει (I think it's raining)","i think that; in my opinion; i guess; i reckon; i suppose"],["σκέφτομαι","the act of thinking: σκέφτομαι εσένα (I'm thinking about you)","think about; thinking about; thinking of; think of; consider; reflect; think it over"],["πιστεύω","believe, stronger than νομίζω; also faith: πιστεύω σε σένα","believe; believe in; trust that; faith"],["θεωρώ","judge as, more formal: τον θεωρώ φίλο (I consider him a friend)","consider him; consider her; regard as; see as; deem"]]],["feel",[["νιώθω","feel, everyday: νιώθω καλά","feel; i feel"],["αισθάνομαι","feel, a little more formal or written","feel formally; sense"]]],["know",[["ξέρω","know a fact or how to: ξέρω να κολυμπάω","know how; know that; know the answer; know a fact"],["γνωρίζω","know a person, or meet for the first time; formal for facts","know someone; know a person; acquainted; get to know; meet for the first time"]]],["meet",[["γνωρίζω","meet someone for the first time","meet for the first time; get to know; introduce"],["συναντάω","meet up with, run into","meet up; run into; meet a friend; bump into"],["χάρηκα","said after meeting: nice to meet you","nice to meet you; glad to meet"],["χαίρω πολύ","said when introduced, more formal","pleased to meet you; how do you do"]]],["go",[["πάω","go, everyday and short: πάω σπίτι","go; going; i'm going"],["πηγαίνω","same as πάω, a fuller form for careful speech","go regularly; go formally"],["βγαίνω","go out, of a room or for the evening","go out; get out; go out tonight; exit"],["ανεβαίνω","go up, climb, get on","go up; climb; get on; upstairs"],["φεύγω","leave, go away","go away; leave; depart"]]],["come",[["έρχομαι","I come","i come; coming; arrive"],["έλα","come here; also \"come on\"","come here; come on"],["άντε","urging: come on, hurry up, go on","hurry up; come on; go on; let's go already"],["προέρχομαι","come from, originate; formal","come from; originate; source"]]],["leave, let",[["φεύγω","leave a place: φεύγω τώρα","leave now; leave the house; depart; go away"],["αφήνω","leave something behind, or let: άφησέ το (leave it)","leave it; leave behind; let; allow; drop off"],["άσε","let it be, never mind","never mind; forget it; let it be"]]],["see, look, watch",[["βλέπω","see; also watch TV","see; watch tv; notice"],["κοιτάζω","look at, on purpose","look at; stare; glance"],["κοίτα","look! (said to someone)","look!; hey look"],["ψάχνω","look for, search","look for; search; looking for"],["μοιάζω","look like, resemble","look like; resemble; similar to"],["παρακολουθώ","watch closely, follow (a class, a show)","follow a class; attend; keep track; monitor"]]],["say, talk",[["λέω","say or tell: λέω την αλήθεια","say; tell; tell someone"],["μιλάω","speak, talk: μιλάω ελληνικά","speak; talk; speak a language"],["συζητάω","discuss, talk something over","discuss; talk over; debate"],["κουβέντα","a chat (noun)","a chat; chit chat; conversation"]]],["ask",[["ρωτάω","ask a question","ask a question; ask about; ask someone"],["ζητάω","ask for something","ask for; request; ask someone to"]]],["want, wish",[["θέλω","want","want; would like"],["εύχομαι","wish something for someone: εύχομαι καλή χρονιά","wish you; i wish you; wish someone; wish them; hope for you"],["μακάρι","if only! a wish about how things are","if only; i wish it were; hopefully"],["επιθυμία","desire, wish (noun, formal)","desire; longing"],["ευχή","a wish, a blessing (noun)","a wish; blessing; best wishes"]]],["like, love",[["μου αρέσει","like a thing or activity: μου αρέσει ο καφές","like coffee; like it; enjoy"],["συμπαθώ","like a person, find them pleasant","like him; like her; like a person"],["γουστάρω","like, fancy; slang","fancy; dig; into it"],["αγαπάω","love family, friends, a partner","love you; love my"],["έρωτας","romantic love, passion (noun)","romance; passion; falling in love"],["αγάπη","love in general (noun)","love as a noun; affection"]]],["begin, start",[["αρχίζω","begin; also for things: άρχισε να βρέχει","begin; it began; started to"],["ξεκινάω","start, set off: ξεκινάμε στις 8","start; set off; start out; get going"]]],["finish",[["τελειώνω","finish, end","finish; end; done"],["ολοκληρώνω","complete, more formal","complete; wrap up"]]],["try",[["προσπαθώ","try hard to do: προσπαθώ να μάθω","try to; make an effort; attempt"],["δοκιμάζω","try out, taste: δοκίμασε το","try on; try out; taste; test"]]],["succeed",[["καταφέρνω","manage to: τα κατάφερα (I made it)","manage; make it; pull it off"],["πετυχαίνω","succeed, hit the mark; also run into someone","succeed; hit; run into"]]],["win",[["κερδίζω","win a prize, earn money","win a prize; earn; gain"],["νικάω","beat someone, win a fight or game","beat; defeat; win the game"]]],["return",[["γυρίζω","come back home; also turn","come back; get back; turn"],["επιστρέφω","return, give back; more formal","return; give back; return an item"]]],["stop",[["σταματάω","stop doing, stop moving","stop; quit; cease"],["στάσου","wait! stop! said to a person","wait!; hold on; stop there"],["στάση","a bus stop, a pause (noun)","bus stop; pause; stance"]]],["wait",[["περιμένω","wait for; also expect","wait for; expect; waiting"],["ανυπομονώ","can't wait, excited","can't wait; look forward; excited"]]],["live",[["μένω","live at an address; stay","live in; live at; stay; reside"],["ζω","be alive, live a life","be alive; live my life; life"]]],["owe",[["χρωστάω","owe money, everyday","owe money; owe you"],["οφείλω","owe, be obliged to; formal","obliged; ought to; owe formally"]]],["continue",[["συνεχίζω","continue, everyday","continue; keep going; carry on"],["εξακολουθώ","keep on, still: εξακολουθεί να βρέχει; formal","still keeps; persist"]]],["make, fix",[["κάνω","do or make, the most general","do; make"],["φτιάχνω","make with your hands, build, fix: φτιάχνω καφέ","make coffee; build; fix; repair; cook"],["διορθώνω","correct a mistake","correct; fix a mistake; edit"]]],["work",[["δουλεύω","I work, everyday","i work; work at"],["δουλειά","work, a job (noun), everyday","job; work as a noun"],["εργάζομαι","I work, formal: forms and interviews","employed; work formally"],["εργασία","work, an assignment (noun), formal","assignment; paper; employment"],["λειτουργώ","work as in function, for machines","function; operate; it works"],["έργο","a work: a project, a film, a play","project; a work; a film"]]],["care",[["με νοιάζει","I care, it matters to me","care about; it matters to me"],["προσέχω","be careful, pay attention","careful; pay attention; watch out; be careful"],["φροντίζω","take care of someone or something","look after; take care of; tend"]]],["throw",[["ρίχνω","throw, drop; also pour","throw; drop; pour"],["πετάω","throw away; also fly","throw away; toss; fly"]]],["move",[["κινούμαι","move my body, be in motion","move; in motion"],["μετακομίζω","move house","move house; relocate"],["προχωράω","go ahead, move on","move on; proceed; go ahead"]]],["call",[["τηλεφωνώ","phone someone","phone; ring; call on the phone"],["καλώ","call, invite","invite; summon"],["αποκαλώ","call someone a name","call him; name someone"]]],["sorry, excuse me",[["συγγνώμη","sorry, excuse me; the most common","sorry; my bad; excuse me"],["με συγχωρείτε","excuse me, polite to strangers","excuse me sir; pardon me"],["λυπάμαι","I'm sorry as in sad: sympathy or regret","sorry for your loss; i regret; sad"]]],["when",[["πότε","when? asking","when?; what time"],["όταν","when something happens, not a question","when i; whenever"],["όποτε","whenever, any time","any time; whenever you"]]],["where",[["πού","where? asking","where?; where is"],["που","that, which, who; where in a statement","that; which; where we"],["όπου","wherever, where","wherever; anywhere"]]],["who, which",[["ποιος","who? which? asking","who?; which one"],["οποίος","who, which in a statement; formal","whom; of which"]]],["that",[["ότι","that, after say or think: λέει ότι...","says that; think that"],["πως","that, the same, a bit more spoken","that spoken"]]],["like, as",[["σαν","like, comparing: σαν παιδί","like a; as if"],["όπως","as, the way: όπως θέλεις","the way; as you like; such as"]]],["because",[["γιατί","why? and because, everyday","why; because"],["επειδή","because; often starts the sentence","since; because of that"],["διότι","because, formal or written","for the reason that"],["εξαιτίας","because of, before a noun","because of; due to"]]],["but, however",[["αλλά","but, everyday","but"],["μα","but, emotional or spoken","but come on"],["όμως","however; can come after the first word","however; though"],["ωστόσο","however, written","nevertheless; nonetheless"],["πάντως","anyway, in any case","anyway; in any case"]]],["so, therefore",[["λοιπόν","so, well: starts or moves on a talk","so; well; well then"],["οπότε","so, as a result","so then; as a result"],["άρα","so, therefore: a logical step","therefore; hence; it follows"],["επομένως","therefore, formal","consequently"],["έτσι","like this, that way","like this; this way; that way"]]],["before",[["πριν","before, everyday","before; ago"],["προτού","before, more formal, before a verb","before doing"]]],["after",[["μετά","after, later","after; later; afterwards"],["αφού","since, because; after, with a past action","since; given that; once"]]],["then",[["τότε","then: at that time, or in that case","at that time; in that case"],["έπειτα","then, next in order","next; after that"]]],["again",[["ξανά","one more time: το λέω ξανά","once more; again"],["πάλι","again, also \"not again!\"","again!; yet again"]]],["still, yet",[["ακόμα","still, yet; also even","still; yet; even"],["ακόμη","the same as ακόμα, slightly formal","still formally"]]],["already",[["ήδη","already, neutral","already"],["κιόλας","already, sooner than expected; also \"even\"","already!; so soon"]]],["almost",[["σχεδόν","almost, nearly an amount","almost all; nearly"],["παραλίγο","almost happened but didn't: παραλίγο να πέσω","nearly fell; almost missed"]]],["at least, even",[["τουλάχιστον","at least, a number","at least"],["έστω","even if, at least: έστω λίγο","even if; at least a little"],["καν","not even: ούτε καν","not even"]]],["of course, certainly",[["φυσικά","of course, naturally","of course; naturally"],["βέβαια","of course, sure; also \"mind you\"","sure; mind you"],["βεβαίως","certainly, emphatic","certainly!"],["ασφαλώς","certainly, formal","definitely"],["σίγουρα","surely, for sure","for sure; surely; definitely"]]],["indeed, really",[["όντως","really, confirming: όντως;","really?; is that so"],["πράγματι","indeed, in fact; slightly formal","in fact; indeed"],["μάλιστα","yes, formal reply; also \"in fact\"","yes sir; moreover"]]],["maybe",[["ίσως","maybe","maybe; perhaps"],["μήπως","perhaps, by any chance, in questions","by any chance; could it be"],["πιθανόν","possibly, likely","possibly; probably"]]],["completely",[["εντελώς","completely, totally","totally; entirely"],["τελείως","completely, the same as εντελώς","completely"]]],["especially",[["ειδικά","especially, specifically","specifically; especially for"],["ιδιαίτερα","especially, particularly","particularly; in particular"]]],["between",[["μεταξύ","between, among: μεταξύ μας","between us; among"],["ανάμεσα","between, among, with σε: ανάμεσα σε","in between; amid"]]],["against",[["εναντίον","against, before a noun: εναντίον του","against him"],["ενάντια","against, with σε: ενάντια στον","against the"],["κατά","against in sports and law; also during","versus; vs"]]],["a little",[["λίγο","a little","a little; a bit"],["λιγάκι","a tiny bit, softer","a tiny bit; just a little"],["λίγος","little, few, before a noun","few; little time"]]],["how much",[["πόσο","how much, on its own","how much is it"],["πόσος","how much, how many, before a noun","how many"]]],["so much",[["τόσο","so, so much, on its own","so; so much"],["τόσος","so much, so many, before a noun","so many"]]],["slowly",[["αργά","slowly; also late","slowly; late"],["σιγά","slowly, quietly; σιγά σιγά = little by little","quietly; gently; little by little"]]],["quickly",[["γρήγορα","quickly","quickly; fast"],["αμέσως","immediately, right now","immediately; right away; at once"]]],["happy, glad",[["ευτυχισμένος","happy deep down, with life","happy in life; content"],["χαρούμενος","cheerful, in a happy mood","cheerful; in a good mood"],["χαίρομαι","I'm glad","glad; pleased"]]],["beautiful, nice",[["ωραίος","nice, good-looking; also food, weather","nice; good looking; lovely"],["όμορφος","beautiful, looks","beautiful; pretty; handsome"]]],["wonderful, amazing",[["υπέροχος","wonderful","wonderful; marvelous"],["θαυμάσιος","wonderful, a bit more formal","splendid"],["καταπληκτικός","amazing, everyday","amazing; fantastic"],["εκπληκτικός","amazing, astonishing","astonishing; surprising"],["φοβερός","awesome, or terrible, by tone","awesome; terrific; dreadful"],["τρομερός","tremendous, or terrible, by tone","tremendous; terrible"]]],["bad",[["κακός","bad","bad; evil; mean"],["άσχημος","ugly; also a bad situation","ugly; awful"]]],["strange",[["περίεργος","strange; also curious, nosy","curious; nosy; weird"],["παράξενος","strange, odd","odd; bizarre"]]],["real, true",[["αληθινός","true, genuine, not fake","genuine; true story"],["πραγματικός","real, actual","actual; real life"],["πραγματικά","really, truly","truly; seriously"]]],["clear",[["σαφής","clear, formal: instructions","clear formally; explicit"],["ξεκάθαρος","crystal clear, plain","crystal clear; obvious"],["καθαρός","clean; also clear water or sky","clean; clear sky"]]],["new",[["καινούργιος","new: just made or bought","brand new; new car"],["νέος","new, as in a new idea or year; also young","new year; latest; young person"]]],["young",[["νεαρός","young, youthful (a person)","youthful; young man"],["μικρός","small; also younger","small; little; younger"]]],["old",[["παλιός","old things; also former","old house; former; ancient"],["μεγάλος","big; also older in age, polite","big; older; grown up"],["γέρος","old man; can sound blunt","old man"]]],["empty",[["άδειος","empty, everyday","empty"],["κενός","empty, blank, formal","blank; vacant"]]],["full",[["γεμάτος","full of things","full of; packed"],["πλήρης","complete, full; formal","full time; complete"]]],["quiet, peace",[["ήσυχος","quiet, calm: a person or place","quiet; calm; peaceful"],["ησυχία","quiet (noun)","silence; peace and quiet"],["ειρήνη","peace between people (noun)","peace; no war"]]],["noise",[["θόρυβος","noise, sound","noise; sound"],["φασαρία","noise and fuss, commotion","fuss; commotion; ruckus"]]],["important",[["σημαντικός","important","important; significant"],["σπουδαίος","great, important, impressive","great; major"]]],["necessary, need",[["πρέπει","must, have to","must; have to; should"],["απαραίτητος","necessary, essential","essential; required"],["χρειάζομαι","I need","i need; need to"]]],["money",[["λεφτά","money, everyday","cash; money"],["χρήματα","money, formal: banks, news","funds; money formally"]]],["car",[["αμάξι","car, everyday","car"],["αυτοκίνητο","car, the full word","automobile"]]],["week",[["εβδομάδα","week, full form","week"],["βδομάδα","week, spoken","week spoken"]]],["dog",[["σκυλί","dog, the most common: το σκυλί","dog"],["σκύλος","dog, masculine; often a male or big dog","male dog"]]],["mom, mother",[["μαμά","mom","mom; mommy"],["μάνα","mom, warm or folk; in songs","mama; ma"],["μητέρα","mother, formal","mother"]]],["girl",[["κορίτσι","girl, also young woman","girl"],["κοπέλα","young woman; girlfriend","young woman; girlfriend"]]],["husband, wife",[["άντρας","man; also husband: ο άντρας μου","man; my husband"],["γυναίκα","woman; also wife: η γυναίκα μου","woman; my wife"],["σύζυγος","spouse, formal: husband or wife","spouse; partner formally"]]],["person",[["άνθρωπος","person, human","human; person"],["άτομο","individual; for counting: για δύο άτομα","individual; people count"],["πρόσωπο","face; a person in formal uses","face"]]],["people, nation",[["λαός","a people, the public","the people; folk"],["έθνος","nation, formal","nation"],["κόσμος","people, a crowd; also the world","crowd; everyone; world"]]],["place, area",[["μέρος","place; also part","place; part; spot"],["τόπος","place, homeland, formal","homeland; location"],["χώρος","space, area, a room","space; room; area"],["περιοχή","area, region, neighborhood","region; neighborhood; district"]]],["issue, matter",[["θέμα","topic, subject; also a problem","topic; subject; problem"],["ζήτημα","issue, question; more formal","issue; question of"],["υπόθεση","a case, matter; also a guess","case; hypothesis"]]],["meaning",[["νόημα","point, sense: δεν έχει νόημα","point; sense; makes sense"],["σημασία","meaning of a word; importance: δεν έχει σημασία (it doesn't matter)","meaning of; importance; doesn't matter"]]],["I mean",[["εννοώ","I mean, intend","i mean; intend"],["δηλαδή","that is, I mean, in other words","in other words; that is; i.e."]]],["opinion",[["γνώμη","opinion: κατά τη γνώμη μου","opinion"],["άποψη","point of view; also a view","point of view; perspective"]]],["school",[["σχολείο","school for kids","school"],["σχολή","faculty, academy: σχολή οδηγών","faculty; academy; college"],["λύκειο","high school","high school"]]],["teacher",[["δάσκαλος","teacher in elementary school, or of a skill","teacher; instructor"],["καθηγητής","teacher in high school, professor","professor; high school teacher"]]],["test",[["τεστ","a test or quiz, general","test; quiz"],["διαγώνισμα","a school test, an exam paper","exam; school test"]]],["time",[["ώρα","clock time, an hour","hour; what time"],["φορά","a time, an occasion: δύο φορές","times; once; occasion"],["χρόνος","time in general; also a year","time; year"],["καιρός","a while; also the weather","a while; long time; weather"]]],["year",[["χρονιά","a year as lived: καλή χρονιά","year; happy new year"],["έτος","year, formal","year formally"]]],["evening",[["βράδυ","evening, night","evening; tonight"],["βραδιά","an evening as an event, a night out","night out; an evening"]]],["leader",[["αρχηγός","chief, captain","chief; captain; boss"],["ηγέτης","leader, in politics","leader"],["επικεφαλής","head of a team or list","head of; in charge"]]],["power",[["δύναμη","strength, power","strength; power; force"],["εξουσία","power as authority, rule","authority; rule"]]],["guard",[["φύλακας","watchman, caretaker","watchman; keeper"],["φρουρός","military guard, sentry","sentry"]]],["ship, boat",[["πλοίο","ship, the standard word","ship"],["καράβι","boat, ship, everyday; a ferry","boat; ferry"]]],["street",[["δρόμος","road, street; also way","road; street; way"],["οδός","street, in addresses: οδός Ερμού","street address"]]],["white",[["άσπρος","white, everyday","white"],["λευκός","white, formal or poetic","white formally"]]],["machine",[["μηχανή","engine, machine; also a motorbike","engine; motorbike"],["μηχάνημα","device, machine","device; appliance"]]],["wound",[["πληγή","wound, sore","sore; wound"],["τραύμα","injury, trauma, medical","injury; trauma"]]],["effort",[["προσπάθεια","effort, an attempt","effort; attempt"],["κόπος","hard work, trouble: ευχαριστώ για τον κόπο","trouble; hard work"]]],["floor",[["πάτωμα","the floor you stand on","floor; ground"],["όροφος","a floor of a building","storey; level"]]],["date",[["ραντεβού","an appointment, a date","appointment; a date with"],["ημερομηνία","a calendar date","calendar date; date of"]]],["number",[["αριθμός","number","number"],["νούμερο","number; also a size","size; shoe size"]]],["code",[["κωδικός","code, PIN, password","pin; password"],["κώδικας","code: law, a system, programming","code of law; programming"]]],["normal",[["φυσιολογικός","normal, natural","natural; normal"],["κανονικός","regular, ordinary","regular; ordinary"]]],["possible, likely",[["δυνατός","strong, loud; also possible","strong; loud"],["πιθανός","likely, probable","likely; probable"]]],["hot",[["ζεστός","warm or hot","warm; hot"],["καυτός","burning hot","burning; scalding"]]],["the end, finally",[["τέλος","the end","the end"],["τελικά","in the end, after all","after all; eventually"],["επιτέλους","at last, with relief","at last; finally!"]]]];
const PREFIX_EN = { περι: 'around', παρα: 'beside', παρ: 'beside', κατα: 'down', κατ: 'down', μετα: 'after, across', αντι: 'against', αντ: 'against', προσ: 'toward', προ: 'before, forth', δια: 'through', δι: 'through', απο: 'from, away', απ: 'from, away', ανα: 'up, again', επανα: 'again', επι: 'on', υπο: 'under', υπ: 'under', συν: 'with', συμ: 'with', συγ: 'with', συ: 'with', εισ: 'into', εκ: 'out', εξ: 'out', εν: 'in', εμ: 'in', εγ: 'in', ευ: 'well', δυσ: 'badly', α: 'not', αν: 'not', πολυ: 'much', τηλε: 'far' };
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
// ---------- Phonetics: Greek spelled the way it sounds, in Latin letters, with the stress marked (καφές → kafés) ----------
// On by default for students who are still learning to read (fm.phonetics: false in My progress turns it off).
// Sound, not spelling: η, ι, υ, ει, οι all say "i"; αι says "e"; δ is "dh" as in "this"; γ is "y" before e and i, "gh" elsewhere.
const PH_V = { α: 'a', ε: 'e', η: 'i', ι: 'i', ο: 'o', υ: 'i', ω: 'o' };
const PH_C = { β: 'v', δ: 'dh', ζ: 'z', θ: 'th', κ: 'k', λ: 'l', μ: 'm', ν: 'n', ξ: 'x', π: 'p', ρ: 'r', σ: 's', ς: 's', τ: 't', φ: 'f', χ: 'h', ψ: 'ps' };
const PH_ST = { a: 'á', e: 'é', i: 'í', o: 'ó', u: 'ú' };
const PH_VOICELESS = new Set('θκξπστφχψς'.split('')), PH_VOICED = new Set('βγδζλμνρ'.split(''));
function gqPh(word) {
  const raw = String(word || ''); if (!/[\u0370-\u03ff\u1f00-\u1fff]/.test(raw)) return '';
  // Split each letter into its base and marks: stress (acute, or the old grave and circumflex) and diaeresis.
  const L = [];
  for (const ch of raw.normalize('NFD')) {
    if (/[\u0301\u0300\u0342\u0384]/.test(ch)) { if (L.length) L[L.length - 1].st = true; continue; }
    if (ch === '\u0308') { if (L.length) L[L.length - 1].di = true; continue; }
    if (/[\u0300-\u036f]/.test(ch)) continue;
    L.push({ c: ch.toLowerCase(), up: ch !== ch.toLowerCase() });
  }
  const at = k => (L[k] && L[k].c) || '', isV = c => !!PH_V[c];
  const front = k => { const a = at(k), b = at(k + 1); return a === 'ε' || a === 'η' || a === 'ι' || a === 'υ' || ((a === 'α' || a === 'ο') && b === 'ι' && !(L[k + 1] && L[k + 1].di)) || (a === 'ε' && b === 'ι'); };
  let out = '', stressed = false;
  const put = (s, st) => { if (st && !stressed) { stressed = true; const m = s.match(/^(.*?)([aeiou])([^aeiou]*)$/); if (m) s = m[1] + PH_ST[m[2]] + m[3]; } out += s; };
  for (let k = 0; k < L.length; k++) {
    const a = at(k), b = at(k + 1), nb = L[k + 1], start = k === 0;
    // A stress on the first letter splits the pair into two sounds: τσάι is tsái, ρολόι is rolói.
    const pair = nb && !nb.di && b && !(L[k].st && nb.c === 'ι');
    if (isV(a)) {
      if (pair && a === 'ο' && b === 'υ') { put('ou', L[k].st || nb.st); k++; continue; }
      if (pair && a === 'α' && b === 'ι') { put('e', L[k].st || nb.st); k++; continue; }
      if (pair && (a === 'ε' || a === 'ο' || a === 'υ') && b === 'ι') { put('i', L[k].st || nb.st); k++; continue; }
      if (pair && (a === 'α' || a === 'ε' || a === 'η') && b === 'υ') {
        const nx = at(k + 2), f = !nx || PH_VOICELESS.has(nx);
        put(PH_V[a] + (f ? 'f' : 'v'), L[k].st || nb.st); k++; continue;
      }
      put(PH_V[a], L[k].st); continue;
    }
    if (a === 'μ' && b === 'π') { out += start ? 'b' : 'mb'; k++; continue; }
    if (a === 'ν' && b === 'τ') { out += start ? 'd' : 'nd'; k++; continue; }
    if (a === 'γ' && b === 'κ') { out += start ? 'g' : 'ng'; k++; continue; }
    if (a === 'γ' && b === 'γ') { out += 'ng'; k++; continue; }
    if (a === 'γ' && (b === 'χ' || b === 'ξ')) { out += 'n'; continue; }
    if (a === 'τ' && b === 'ζ') { out += 'dz'; k++; continue; }
    // γι or γει before a vowel is a single y sound (γεια is ya).
    if (a === 'γ' && (b === 'ι' || (b === 'ε' && at(k + 2) === 'ι')) && isV(at(b === 'ι' ? k + 2 : k + 3)) && !(L[b === 'ι' ? k + 1 : k + 2] || {}).st) { out += 'y'; k += b === 'ι' ? 1 : 2; continue; }
    if (a === 'γ') { out += front(k + 1) ? 'y' : 'gh'; continue; }
    if (a === 'σ' && PH_VOICED.has(b)) { out += 'z'; continue; }
    // Double letters say one sound (θάλασσα is thálasa).
    if (PH_C[a]) { if (a === b || (a === 'σ' && b === 'ς')) continue; out += PH_C[a]; continue; }
    out += a;
  }
  if (L.length && L[0].up && out) out = out[0].toUpperCase() + out.slice(1);
  return out;
}
// Each Greek word on screen gets its sound spelling underneath, as a ruby. The rt is empty and shows the spelling through CSS,
// so the page text (and everything that reads it) stays plain Greek. Only Greek marked lang="el" and rendered notes are touched;
// editors, inputs and pictures never are.
const PH_SKIP = 'button:not(.gq-tile):not(.gq-htile):not(.gq-btile), input, textarea, select, script, style, svg, code, pre, .cm-editor, [contenteditable="true"], .gq-noph, .gq-abc, ruby.gq-pr, .gq-tour-tip';
const PH_SCOPE = '[lang="el"], .markdown-rendered, .markdown-preview-view';
const PH_RE = /[\u0370-\u03ff\u1f00-\u1fff]+(?:['’][\u0370-\u03ff\u1f00-\u1fff]*)?/g;
const PH_HAS = /[\u0370-\u03ff\u1f00-\u1fff]/;
function phWrap(t) {
  const s = t.nodeValue, frag = document.createDocumentFragment(); let last = 0, m; PH_RE.lastIndex = 0;
  while ((m = PH_RE.exec(s))) {
    const sp = gqPh(m[0]); if (!sp) continue;
    if (m.index > last) frag.appendChild(document.createTextNode(s.slice(last, m.index)));
    const r = document.createElement('ruby'); r.className = 'gq-pr'; r.appendChild(document.createTextNode(m[0]));
    const rt = document.createElement('rt'); rt.className = 'gq-prt'; rt.setAttribute('data-ph', sp); rt.setAttribute('aria-hidden', 'true'); r.appendChild(rt);
    frag.appendChild(r); last = m.index + m[0].length;
  }
  if (!last) return; if (last < s.length) frag.appendChild(document.createTextNode(s.slice(last)));
  t.parentNode.replaceChild(frag, t);
}
function phScan(root) {
  if (!root) return;
  const ok = t => { const p = t.parentElement; return p && PH_HAS.test(t.nodeValue) && !p.closest(PH_SKIP) && p.closest(PH_SCOPE); };
  if (root.nodeType === 3) { if (ok(root)) phWrap(root); return; }
  if (root.nodeType !== 1 || (root.closest && root.closest(PH_SKIP))) return;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), list = []; let t;
  while ((t = w.nextNode())) if (ok(t)) list.push(t);
  for (const x of list) phWrap(x);
}
// Glosses for the small words, so a tapped tile always says what it means.
const PH_FUNC = { ο: 'the', η: 'the', το: 'the', οι: 'the', τα: 'the', τον: 'the', την: 'the', τη: 'the', των: 'of the', τους: 'the, them, their', τις: 'the', του: 'the, his', της: 'the, her',
  ενασ: 'a, one', ενα: 'a, one', μια: 'a, one', και: 'and', κι: 'and', δεν: 'not', μην: 'don\u2019t', να: 'to', θα: 'will', σε: 'in, to, at', σ: 'in, to', στο: 'in the, to the', στη: 'in the, to the', στην: 'in the, to the', στον: 'in the, to the', στα: 'in the, to the', στουσ: 'in the, to the', στισ: 'in the, to the',
  με: 'with, me', για: 'for', απο: 'from', μου: 'my, me', σου: 'your, you', μασ: 'our, us', σασ: 'your, you all', ναι: 'yes', οχι: 'no', αλλα: 'but', τι: 'what', που: 'where, that', πωσ: 'how', ποιοσ: 'who', ποια: 'who, which', ποιο: 'which', ποτε: 'when', γιατι: 'why, because', ποσο: 'how much',
  ειναι: 'is, are', ειμαι: 'I am', εισαι: 'you are', ειμαστε: 'we are', εγω: 'I', εσυ: 'you', εμεισ: 'we', εσεισ: 'you all', αυτοσ: 'he, this', αυτη: 'she, this', αυτο: 'it, this', εδω: 'here', εκει: 'there', τωρα: 'now', λιγο: 'a little', πολυ: 'very, a lot', οτι: 'that', αν: 'if', ετσι: 'like this, so',
  σενα: 'you (after για, με, σαν)', εσενα: 'you', εμενα: 'me' };
// Double-tap in the Word web means "more than one": a noun's plural, εγώ → εμείς, and a verb's "we" form (πάω → εμείς πάμε).
const WW_PRON = { εγω: ['εμείς', 'we'], εσυ: ['εσείς', 'you all'], αυτοσ: ['αυτοί', 'they'], αυτη: ['αυτές', 'they'], αυτο: ['αυτά', 'they'],
  μου: ['μας', 'our, us'], σου: ['σας', 'your, you all'], του: ['τους', 'their, them'], της: ['τους', 'their, them'], με: ['μας', 'us'], σε: ['σας', 'you all'],
  τον: ['τους', 'them'], την: ['τις', 'them'], ο: ['οι', 'the'], η: ['οι', 'the'], το: ['τα', 'the'], ποιοσ: ['ποιοι', 'who'], ποια: ['ποιες', 'who'], ποιο: ['ποια', 'which'],
  μονοσ: ['μόνοι', 'alone'], ολοσ: ['όλοι', 'all, everyone'], καθενασ: ['όλοι', 'everyone'] };
// Verbs whose "we" form doesn't follow the ending rules.
const WW_WE = { ειμαι: 'είμαστε', παω: 'πάμε', λεω: 'λέμε', τρωω: 'τρώμε', ακουω: 'ακούμε', κλαιω: 'κλαίμε', φταιω: 'φταίμε', ζω: 'ζούμε', ξερω: 'ξέρουμε', βλεπω: 'βλέπουμε', πρεπει: '', αρεσει: '' };
const wwStrip = t => t.normalize('NFD').replace(/[\u0301]/g, '').normalize('NFC');
const wwWe = lab => {
  const f = fold(lab); if (/\s/.test(lab)) return '';
  if (f in WW_WE) return WW_WE[f];
  if (/αμαι$/.test(f)) return wwStrip(lab).replace(/άμαι$|αμαι$/, '') + 'όμαστε';                 // θυμάμαι → θυμόμαστε
  if (/ιεμαι$/.test(f)) return wwStrip(lab).replace(/ιέμαι$|ιεμαι$/, '') + 'ιόμαστε';             // χαιρετιέμαι → χαιρετιόμαστε
  if (/ουμαι$/.test(f)) return wwStrip(lab).replace(/ούμαι$|ουμαι$/, '') + 'ούμαστε';             // ευχαριστιούμαι
  if (/ομαι$/.test(f)) return wwStrip(lab).replace(/ομαι$/, '') + 'όμαστε';                      // έρχομαι → ερχόμαστε
  if (/άω$/.test(lab)) return lab.replace(/άω$/, 'άμε');                                          // αγαπάω → αγαπάμε
  if (/ώ$/.test(lab)) return lab.replace(/ώ$/, 'ούμε');                                           // μπορώ → μπορούμε
  if (/ω$/.test(lab)) return lab.replace(/ω$/, 'ουμε');                                           // έχω → έχουμε
  return '';
};
// "I go" → "we go", "I am" → "we are".
const wwWeEn = e => { const s = String(e || '').split(/[;,]/)[0].trim(); if (!/^I\b/.test(s)) return 'we'; return s.replace(/^I am\b/, 'we are').replace(/^I'm\b/, "we're").replace(/^I was\b/, 'we were').replace(/^I\b/, 'we'); };
const wwMany = (lab, w) => {
  const f = fold(lab), pr = WW_PRON[f]; if (pr) return { gr: pr[0], en: pr[1] };
  if (!w || w.t !== 'v') return null;
  const we = (w.who && w.who.εμείς) || wwWe(lab); if (!we) return null;
  return { gr: 'εμείς ' + we, en: wwWeEn(w.e) };
};
// A verb note's Who line (πάω (I) · [[εσύ]] πας · …) as { εγώ: 'πάω', εσύ: 'πας', … }. The I form has no εγώ: the ending already says who.
const wwWho = txt => { const o = {}, l = (txt.match(/^- \*\*Who:\*\*\s*(.*)$/m) || [])[1]; if (!l) return o;
  for (const part of l.split(/\s+·\s+/)) { const m = part.match(/^\[\[([^\]|#]+)(?:\|[^\]]+)?\]\]\s*(.+)$/); if (m) o[m[1].trim()] = m[2].trim();
    else { const i = part.match(/^(.+?)\s*\(I\)$/); if (i) o['εγώ'] = i[1].trim(); } } return o; };
// On a pronoun's web, a verb link is that person's form: εσύ → εσύ χαίρεσαι, not χαίρομαι για σένα.
const WW_WHO = { εγώ: 'εγώ', εσύ: 'εσύ', αυτός: 'αυτός', αυτή: 'αυτός', αυτό: 'αυτός', εμείς: 'εμείς', εσείς: 'εσείς', αυτοί: 'αυτοί', αυτές: 'αυτοί', αυτά: 'αυτοί' };
const WW_WHO_EN = { εγώ: 'I', εσύ: 'you', αυτός: 'he', αυτή: 'she', αυτό: 'it', εμείς: 'we', εσείς: 'you all', αυτοί: 'they', αυτές: 'they', αυτά: 'they' };
const wwThird = v => v === 'have' ? 'has' : v === 'do' ? 'does' : v === 'can' || v === 'must' || v === 'will' ? v : /(s|sh|ch|x|z|o)$/.test(v) ? v + 'es' : /[^aeiou]y$/.test(v) ? v.slice(0, -1) + 'ies' : v + 's';
const wwPersonEn = (who, e) => { const s = String(e || '').split(/[;,]/)[0].trim(), sub = WW_WHO_EN[who] || who; if (!/^I\b/.test(s)) return sub + ' …';
  const one = /^(he|she|it)$/.test(sub), rest = s.replace(/^I\b\s*/, '');
  if (/^am\b/.test(rest)) return sub + ' ' + (one ? 'is' : 'are') + rest.slice(2);
  if (/^was\b/.test(rest)) return sub + ' ' + (one ? 'was' : 'were') + rest.slice(3);
  if (!one) return sub + ' ' + rest; const v = rest.split(' '); v[0] = wwThird(v[0]); return sub + ' ' + v.join(' '); };
// Sounds-alike key for Greek spelling: the five ways to write "i", o/ω, αι/ε and double letters all match (ψηξη finds ψύξη).
const sndG = t => fold(t).replace(/ου/g, '0').replace(/ει|οι|υι/g, 'ι').replace(/[ηυ]/g, 'ι').replace(/ω/g, 'ο').replace(/αι/g, 'ε').replace(/([^\sαειο0])\1/g, '$1').replace(/0/g, 'ου');
const foldG = t => String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ς/g, 'σ').replace(/[^\p{L}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
const SMALL_W = new Set(['ο', 'η', 'το', 'οι', 'τα', 'τον', 'την', 'του', 'τησ', 'των', 'ενασ', 'μια', 'μια', 'ενα', 'εγω', 'εσυ', 'εμεισ', 'εσεισ']);
const near = (a, b) => { if (a === b) return true; if (Math.abs(a.length - b.length) > 1 || a.length < 4) return false; let i = 0, j = 0, e = 0; while (i < a.length && j < b.length) { if (a[i] === b[j]) { i++; j++; continue; } if (++e > 1) return false; if (a.length > b.length) i++; else if (b.length > a.length) j++; else { i++; j++; } } return e + (a.length - i) + (b.length - j) <= 1; };
// True when what was heard holds the target: every word of one or two words, three of four in a longer line. Small words like ο and το are left out.
// Phones write numbers as digits (ένα comes back as 1), so digits are read as their Greek words first.
const DIGW = { 1: 'ενα ενασ μια', 2: 'δυο', 3: 'τρια τρεισ', 4: 'τεσσερα τεσσερισ', 5: 'πεντε', 6: 'εξι', 7: 'επτα εφτα', 8: 'οκτω οχτω', 9: 'εννεα εννια', 10: 'δεκα' };
const digG = a => String(a || '').replace(/\d+/g, d => ' ' + (DIGW[+d] || '') + ' ');
// Short words are matched by sound too: a phone may write κι or κε for και, σαι for σε.
const ALIASW = { και: ['κι'] };
const sameW = (w, h) => w === h || near(w, h) || (w.length <= 4 && phonG(w) === phonG(h)) || (ALIASW[w] || []).includes(h);
// word: a word card's label, where commas and slashes list forms (ένας, μία, ένα): saying any one of them counts.
// Returns null for a miss, or the close-but-not-exact pairs [[heard, right], …] for a pass (an empty list when it was exact).
const heardHow = (target, alts, word) => {
  if (word) { const forms = String(target).split(/\s*[,/]\s*/).filter(Boolean); if (forms.length > 1) { let best = null; for (const f of forms) { const r = heardHow(f, alts); if (r && (!best || r.length < best.length)) best = r; } return best; } }
  const orig = String(target).split(/\s+/).filter(Boolean), keyOf = {}; for (const o of orig) { const k = foldG(o); if (k && !keyOf[k]) keyOf[k] = o.replace(/[^\p{L}]/gu, ''); }
  let tw = foldG(target).split(' ').filter(Boolean); const content = tw.filter(w => !SMALL_W.has(w)); if (content.length) tw = content;
  let best = null;
  for (const a of alts || []) {
    const hw = foldG(digG(a)).split(' ').filter(Boolean), raw = String(a || '').split(/\s+/).filter(Boolean), offs = [];
    let n = 0; for (const w of tw) { if (hw.includes(w)) { n++; continue; } const h = hw.find(h => sameW(w, h)); if (h) { n++; const r = raw.find(x => foldG(digG(x)).split(' ').includes(h)) || h; offs.push([r, keyOf[w] || w]); } }
    if (tw.length <= 2 ? n === tw.length : n / tw.length >= 0.75) { if (!best || offs.length < best.length) best = offs; if (!offs.length) break; }
  }
  return best;
};
const heardIt = (target, alts, word) => !!heardHow(target, alts, word);
// The close-enough note: it still counts, and the student sees how the word is spelled.
const spellNote = offs => offs && offs.length ? ' Close enough. It\u2019s spelled ' + offs.map(([h, r]) => r + (h && foldG(h) !== foldG(r) && !/\d/.test(h) ? ' (heard ' + h + ')' : '')).join(', ') + '.' : '';
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
  // Start right away, inside the tap: iPhones can refuse a microphone started later. Only if the voice is still talking,
  // wait a moment so the voice and the microphone don't fight over the audio.
  const go = () => { if (over) return; try { r.start(); } catch (e) { end(false, 'busy'); } };
  let busy = false; try { busy = !!(window.speechSynthesis && (speechSynthesis.speaking || speechSynthesis.pending)); } catch (e) {}
  if (busy) setTimeout(go, 250); else go();
});
// Kids start with the letters: each one's sound, a word that starts with it, and four sets of six. No two letters in a set share a sound.
// [lower, upper, sound, like, word, English, syllable to say]
const LETTERS = [["α", "Α", "a", "father", "άλογο", "horse", ""], ["ε", "Ε", "e", "egg", "ελέφαντας", "elephant", ""], ["ο", "Ο", "o", "octopus", "ομπρέλα", "umbrella", ""], ["μ", "Μ", "m", "moon", "μήλο", "apple", "μα"], ["π", "Π", "p", "pig", "πάπια", "duck", "πα"], ["τ", "Τ", "t", "top", "τυρί", "cheese", "τα"], ["ι", "Ι", "ee", "see", "ιππότης", "knight", ""], ["κ", "Κ", "k", "kite", "κότα", "hen", "κα"], ["λ", "Λ", "l", "lion", "λεμόνι", "lemon", "λα"], ["ν", "Ν", "n", "nose", "νερό", "water", "να"], ["σ", "Σ", "s", "sun", "σκύλος", "dog", "σα"], ["ρ", "Ρ", "r", "a quick tap of the tongue", "ρολόι", "clock", "ρα"], ["β", "Β", "v", "van", "βάρκα", "boat", "βα"], ["γ", "Γ", "gh", "a soft, breathy g", "γάτα", "cat", "γα"], ["δ", "Δ", "th", "this", "δέντρο", "tree", "δα"], ["φ", "Φ", "f", "fish", "φίδι", "snake", "φα"], ["χ", "Χ", "h", "a scratchy h, like clearing your throat", "χαρτί", "paper", "χα"], ["υ", "Υ", "ee", "see", "ύπνος", "sleep", ""], ["η", "Η", "ee", "see", "ήλιος", "sun", ""], ["ζ", "Ζ", "z", "zoo", "ζάχαρη", "sugar", "ζα"], ["θ", "Θ", "th", "thin", "θάλασσα", "sea", "θα"], ["ξ", "Ξ", "ks", "box", "ξύλο", "wood", "ξα"], ["ψ", "Ψ", "ps", "tops", "ψάρι", "fish", "ψα"], ["ω", "Ω", "o", "octopus", "ώρα", "time, hour", ""]].map(([l, u, s, h, w, en, syl]) => ({ l, u, s, h: h.includes(' ') ? h : 'like ' + h, w, en, syl, say: syl ? syl + ', ' + w : w }));
const LETTER_SETS = [0, 1, 2, 3].map(i => LETTERS.slice(i * 6, i * 6 + 6)), LETTER_SETS_K = LETTER_SETS;
// ---------- Ears first: Language Transfer, then reading what you've heard ----------
// New-to-Greek students start with the free Language Transfer audio course (Complete Greek, 120 tracks), no reading.
// After track 30, six short sessions teach the letters through words they already know by ear: hear it, read it, build it.
// The sessions: each set of letters lets them read the most words heard in tracks 1 to 30 (matched against the transcripts).
const LT_BRIDGE = [[["η", "α", "ν", "θ", "μ", "αι", "ε", "σ"], ["να", "θα", "σε", "με", "ναι", "αν", "μας", "μάθημα"]], [["ρ", "ω", "π", "ο", "κ"], ["και", "από", "κάνω", "ακόμα", "πώς", "ώρα", "μέρα", "σήμερα"]], [["λ", "τ", "ι", "φ"], ["τι", "αλλά", "θέλω", "τώρα", "καλά", "κάτι", "καλός", "φίλος"]], [["γ", "ει", "δ", "χ"], ["είμαι", "εγώ", "δεν", "για", "έχω", "όχι", "εδώ", "εμείς"]], [["υ", "β", "ου", "ψ"], ["μου", "που", "εσύ", "σου", "υπάρχω", "πού", "βλέπω", "απόψε"]], [["ευ", "ξ", "αυ", "ντ", "ζ", "μπ"], ["αυτός", "μπορώ", "ξέρω", "ευχαριστώ", "άντρας", "αρχίζω", "αύριο", "δουλεύω"]]];
const LT_URL = 'https://www.languagetransfer.org/greek', LT_EARS = 30, LT_MAX = 120;
// Letter pairs the single-letter list doesn't have: what they sound like.
const LT_PAIR = { αι: ['e', 'like egg'], ει: ['ee', 'like see'], ου: ['oo', 'like food'], ευ: ['ev or ef', 'like ever, or left'], αυ: ['av or af', 'like have, or after'], ντ: ['d', 'like door'], μπ: ['b', 'like boat'] };
// Where Language Transfer explains what a Beginner lesson uses: lesson → [first track, last track, what].
const LT_TIES = { 3: [5, 11, 'να'], 5: [8, 20, 'είμαι'], 13: [23, 24, 'θα'], 17: [23, 24, 'θα'], 9: [33, 44, 'plurals'], 12: [33, 44, 'plurals'], 14: [60, 65, 'the past'], 22: [60, 65, 'the past'], 23: [60, 65, 'the past'], 21: [51, 61, 'μου αρέσει'], 19: [97, 99, 'commands'], 25: [106, 111, '-ομαι verbs'] };
// Adults get the same letters and sets with a word from the 1,500 for each one.
const ADULT_W = { α: ['αγάπη', 'love'], ε: ['ελληνικά', 'Greek'], ο: ['όχι', 'no'], μ: ['μητέρα', 'mother'], π: ['παιδί', 'child'], τ: ['τώρα', 'now'], ι: ['ιδέα', 'idea'], κ: ['καφές', 'coffee'], λ: ['λεφτά', 'money'], ν: ['νερό', 'water'], σ: ['σπίτι', 'house'], ρ: ['ρούχα', 'clothes'], β: ['βιβλίο', 'book'], γ: ['γάλα', 'milk'], δ: ['δρόμος', 'street'], φ: ['φίλος', 'friend'], χ: ['χέρι', 'hand'], υ: ['ύπνος', 'sleep'], η: ['ήλιος', 'sun'], ζ: ['ζωή', 'life'], θ: ['θάλασσα', 'sea'], ξ: ['ξέρω', 'I know'], ψ: ['ψωμί', 'bread'], ω: ['ώρα', 'hour, time'] };
const ADULT_SETS = LETTER_SETS.map(s => s.map(x => { const [w, en] = ADULT_W[x.l] || [x.w, x.en]; return { ...x, w, en, say: x.syl ? x.syl + ', ' + w : w }; }));
// Letter names, in alphabet order, six at a time. Say a name and the phone (or the keyboard's microphone) fills in that letter.
// [letter, name, other spellings a phone may write, English spellings]
const LNAMES = [['α', 'άλφα', [], ['alpha', 'alfa']], ['β', 'βήτα', ['βίτα'], ['beta', 'vita']], ['γ', 'γάμμα', ['γάμα'], ['gamma', 'gama']], ['δ', 'δέλτα', [], ['delta']], ['ε', 'έψιλον', ['έψιλο'], ['epsilon', 'epsilo']], ['ζ', 'ζήτα', [], ['zeta', 'zita']],
  ['η', 'ήτα', ['ίτα'], ['eta', 'ita']], ['θ', 'θήτα', [], ['theta', 'thita']], ['ι', 'γιώτα', ['ιώτα', 'γιότα'], ['iota', 'yota', 'giota']], ['κ', 'κάπα', ['κάππα'], ['kappa', 'kapa']], ['λ', 'λάμδα', ['λάμβδα', 'λάμντα'], ['lambda', 'lamda']], ['μ', 'μι', ['μυ'], ['mu', 'mi', 'me']],
  ['ν', 'νι', ['νυ'], ['nu', 'ni', 'knee']], ['ξ', 'ξι', ['κσι'], ['xi', 'ksi']], ['ο', 'όμικρον', ['όμικρο'], ['omicron', 'omikron']], ['π', 'πι', [], ['pi', 'pee']], ['ρ', 'ρο', [], ['rho', 'ro']], ['σ', 'σίγμα', [], ['sigma']],
  ['τ', 'ταυ', ['ταφ'], ['tau', 'taf']], ['υ', 'ύψιλον', ['ύψιλο'], ['upsilon', 'ypsilon', 'ipsilon']], ['φ', 'φι', [], ['phi', 'fi', 'fee']], ['χ', 'χι', [], ['chi', 'hi', 'khi']], ['ψ', 'ψι', [], ['psi']], ['ω', 'ωμέγα', [], ['omega']]]
  // sp: what the voice is given. A one-syllable name with no accent (ψι, ξι, μι...) can be read out as letters, so the voice gets it stressed (ψί).
  .map(([l, n, alt, en]) => ({ l, u: l === 'σ' ? 'Σ' : l.toUpperCase(), n, alt, en, sp: /^[^αεηιουωάέήίόύώ]*[αεηιουω][^αεηιουωάέήίόύώ]*$/.test(n) ? n.replace(/([αεηιουω])/, m => ({ α: 'ά', ε: 'έ', η: 'ή', ι: 'ί', ο: 'ό', υ: 'ύ', ω: 'ώ' })[m]) : n }));
const NAME_SETS = [0, 1, 2, 3].map(i => LNAMES.slice(i * 6, i * 6 + 6));
// Spelled by sound, so a phone that writes βίτα for βήτα, or ταφ for ταυ, still counts.
const phonG = t => foldG(t).replace(/αυ/g, 'αφ').replace(/ευ/g, 'εφ').replace(/ει|οι|υι|η|υ/g, 'ι').replace(/αι/g, 'ε').replace(/ω/g, 'ο').replace(/(.)\1/g, '$1').replace(/^γι(?=[αεο])/, 'ι');
const latF = t => String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim();
// Which of these letters were named in what the phone heard (any of its guesses). A lone letter, like Β, counts too.
const namesHeard = (set, alts) => {
  const out = new Set();
  for (const a of alts || []) {
    const gw = foldG(a).split(' ').filter(Boolean), pw = gw.map(phonG), lw = latF(a).split(' ').filter(Boolean), raw = String(a).trim();
    // A word counts for a letter when it is spelled (by sound) like its name. Off by one letter counts only when
    // no other name is that close: βίτα, ζήτα and θήτα are one letter apart, so those must be exact.
    for (const w of pw) {
      const ex = LNAMES.filter(x => [x.n, ...x.alt].some(f => phonG(f) === w));
      const nr = ex.length ? ex : LNAMES.filter(x => [x.n, ...x.alt].some(f => phonG(f).length >= 4 && near(w, phonG(f))));
      if (nr.length === 1 || ex.length) for (const x of nr) if (set.includes(x)) out.add(x.l);
    }
    for (const x of set) {
      if (lw.some(w => x.en.includes(w))) out.add(x.l);
      else if (raw.length === 1 && foldG(raw) === foldG(x.l)) out.add(x.l);
    }
  }
  return [...out];
};
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
const WW_HELP = 'Tap a word to move there. Double-tap a word to hear more than one. Hold a word to see its links. Drag to play.';
// The families a word belongs to, and how a member is built: { gloss, members: [{ w, pre, rest }] }.
const famOf = w => FAMILIES.filter(f => f[1].some(m => m.replace('|', '') === w));
const famSplit = m => { const i = m.indexOf('|'); return { w: m.replace('|', ''), pre: i > 0 ? m.slice(0, i) : '', rest: i > 0 ? m.slice(i + 1) : '' }; };
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
    // Family: the same web, but the words around the middle share its root (μένω, περιμένω, παραμένω). Shown only when there are some.
    this.famb = bar.createEl('button', { text: 'Family', cls: 'gq-ww-famb' }); this.famb.style.display = 'none';
    this.famb.onclick = () => { this.mode = this.mode === 'family' ? '' : 'family'; if (this.path) this.go(this.path, false); };
    this.trail = box.createDiv('gq-web-trail');
    this.agree = box.createDiv('gq-agree'); this.agree.hide();
    this.help = box.createDiv({ cls: 'gq-hint gq-ww-help', text: WW_HELP });
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
  // After the object switch: new labels on every word, the title and the strip.
  relabel() {
    for (const m of this.nodes.values()) if (!m.dead) m.t.textContent = this.label(m.k);
    const s = this.titleEl.querySelector('span'); if (s && this.path) s.textContent = this.label(this.path);
    if (this.path) this.plugin.paintAgreeBox(this.agree, this.path, () => this.relabel());
  }
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
    const ex = ((txt.match(/^> ([^\[\n].*)$/m) || [])[1] || '').replace(/\*\*/g, '').trim();
    const w = { p, t, r: +fm.rank || 9999, e: String(fm.english || ''), say: fm.pronunciation || '', pl: String(fm.plural || ''), who: wwWho(txt), already: /noun-pl/.test(tags), pair, co, ex };
    this.data.set(p, w); return w;
  }
  async partners(c) {
    await this.plugin.loadVerbs();
    const w = await this.info(c); if (!w) return [];
    if (this.mode === 'family') {
      const name = c.replace(/^Words\//, '').replace(/\.md$/, ''), out = [], seen = new Set([name]);
      for (const f of famOf(name)) for (const m of f[1]) { const x = famSplit(m); if (seen.has(x.w)) continue; seen.add(x.w); const k = 'Words/' + x.w + '.md'; const iw = await this.info(k); if (iw) out.push({ k, w: iw, phrase: '', en: '', fam: { ...x, gloss: f[0] } }); }
      return out.slice(0, 14);
    }
    const groups = new Map();
    for (const x of w.pair) { if (!groups.has(x.cat)) groups.set(x.cat, []); groups.get(x.cat).push({ ...x }); }
    const lists = [...groups.entries()].map(([cat, l]) => cat === 'Who' ? l.slice(0, 1) : l); lists.push(w.co.map(k => ({ k, phrase: '', en: '' })));
    const out = [], seen = new Set([c]);
    for (let round = 0; out.length < WEB_MAX && lists.some(l => l.length > round); round++)
      for (const l of lists) { const x = l[round]; if (x && !seen.has(x.k) && out.length < WEB_MAX) { seen.add(x.k); out.push(x); } }
    const name = c.replace(/^Words\//, '').replace(/\.md$/, ''), stem = fold(name).slice(0, Math.max(3, name.length - 2));
    for (const x of out) {
      x.w = await this.info(x.k);
      if (!x.phrase && x.w) { const back = x.w.pair.find(p => p.k === c) || w.pair.find(p => p.k === x.k); if (back) { x.phrase = back.phrase; x.en = back.en; } }
      // No pairing written for these two? A short example line from either note that holds the other word exactly (σύμφωνα με → "Σύμφωνα με αυτόν, ναι." on με's web).
      if (!x.phrase && x.w) { const xn = x.k.replace(/^Words\//, '').replace(/\.md$/, ''), toks = l => ' ' + l.split(/[\s,.;:!?·«»—]+/).map(wwFold).join(' ') + ' ', holds = (l, n) => toks(l).includes(' ' + wwFold(n).split(/\s+/).join(' ') + ' ');
        const ex = [[x.w.ex, name], [w.ex, xn]].find(([l, n]) => l && l.split(/\s+/).length <= 8 && holds(l, n)); if (ex) x.phrase = ex[0]; }
      // να + the form learners already know: μπορώ να δω becomes μπορώ να βλέπω (the one-time form is kept for the chip).
      if (x.phrase) { const e = this.plugin.easyVerbs(x.phrase); if (e !== x.phrase) { x.once = x.phrase; x.phrase = e; } }
      // Either way round: εσύ's web shows εσύ χαίρεσαι, and πιστεύω's web shows εσύ πιστεύεις on the εσύ link.
      const xn = x.k.replace(/^Words\//, '').replace(/\.md$/, ''), vw = WW_WHO[name] ? x.w : WW_WHO[xn] ? w : null, pn = WW_WHO[name] ? name : xn;
      const pf = vw && vw.t === 'v' && vw.who && vw.who[WW_WHO[pn]];
      if (pf) { const ph = pn + ' ' + pf; if (x.phrase && wwFold(x.phrase) !== wwFold(ph) && wwFold(x.phrase) !== wwFold(vw === w ? name : xn)) { const pre = vw === w && !hasVerb(name, x.phrase); x.also = { phrase: pre ? name + ' ' + x.phrase : x.phrase, en: pre && x.en ? String(w.e || '').split(/[;,]/)[0].trim() + ' ' + x.en : x.en }; } x.phrase = ph; x.en = wwPersonEn(pn, vw.e); x.once = ''; x.who = { pn, pf, verb: vw === w ? name : xn }; continue; }
      if (x.phrase && w.t === 'v' && !hasVerb(name, x.phrase)) { x.phrase = name + ' ' + x.phrase; if (x.once) x.once = name + ' ' + x.once; }
    }
    return out.filter(x => x.w);
  }
  linked(a, b) { const A = this.data.get(a), B = this.data.get(b); return !!((A && (A.pair.some(p => p.k === b) || A.co.includes(b))) || (B && (B.pair.some(p => p.k === a) || B.co.includes(a)))); }
  step(d) { const n = this.pos + d; if (n < 0 || n >= this.hist.length) return; this.pos = n; this.go(this.hist[n], false); }
  async go(p, push = true) {
    if (!p || !this.stage) { this.path = p || this.path; return; }
    const w = await this.info(p); if (!w) return;
    const fams = famOf(p.replace(/^Words\//, '').replace(/\.md$/, ''));
    if (!fams.length) this.mode = '';
    if (this.famb) { this.famb.style.display = fams.length ? '' : 'none'; this.famb.setText(this.mode === 'family' ? 'Goes with' : 'Family'); this.famb.toggleClass('is-on', this.mode === 'family'); }
    if (this.help) this.help.setText(this.mode === 'family' ? `Family · ${fams.map(f => f[0]).join(' · ')}. Words built on one root. Hold a word to see how it is built.` : WW_HELP);
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
    // A big family (φέρνω has 12) gets two rings and the full height of the stage, so the names don't sit on each other.
    if (this.mode === 'family' && n > 8) { const Rx = this.Wd * 0.40, Ry = Math.min(this.Ht / 2 - 44, 300); list.forEach((x, i) => { const a = -Math.PI / 2 + i * 2 * Math.PI / n, k = i % 2 ? 0.56 : 1; x.tx = Math.cos(a) * Rx * k; x.ty = Math.sin(a) * Ry * k; }); }
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
    if (this.mode !== 'family') for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) if (this.linked(list[i].k, list[j].k)) this.edges.push({ a: list[i].k, b: list[j].k, inter: true });
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
    if (this.mode === 'family') {
      // How it is built: περι (around) + μένω. The prefix meaning is the clue; the root is the family's.
      const name = m.k.replace(/^Words\//, '').replace(/\.md$/, ''), fs = famOf(name), sp = fs.length ? famSplit(fs[0][1].find(z => z.replace('|', '') === name)) : null;
      if (sp && sp.pre) { const g = PREFIX_EN[foldG(sp.pre)] || ''; const d = this.chip.createDiv({ attr: { lang: 'el' } }); d.appendText(sp.pre + '- '); if (g) d.createSpan({ cls: 'gq-hint', text: '(' + g + ') ' }); d.appendText('+ ' + sp.rest); }
      if (fs.length) this.chip.createDiv({ cls: 'gq-hint', text: 'Root: ' + fs.map(f => f[0]).join(' · ') });
      say(this.label(m.k)); this.chipPlace(); this.chip.addClass('is-on'); return;
    }
    if (x && x.phrase && m !== this.center) {
      const d = this.chip.createDiv({ attr: { lang: 'el' } }); d.appendText(x.phrase); if (x.en) d.createSpan({ cls: 'gq-hint', text: '  (' + x.en + ')' });
      // The word first, then the phrase, so what you hear starts with what you see.
      const lab = this.label(m.k), same = wwFold(x.phrase) === wwFold(lab) || wwFold(x.phrase) === wwFold(lab.replace(/^(ο|η|το|οι|τα) /, ''));
      // Say the word on its own only when the phrase doesn't already contain it (εγώ → "Εγώ θέλω να πάω", not "εγώ. Εγώ θέλω…").
      const bareF = wwFold(lab.replace(/^(ο|η|το|οι|τα) /, '')), inside = x.phrase.split(/[\s,.;!·?«»]+/).some(t => wwFold(t) === bareF) || (/\s/.test(bareF) && wwFold(x.phrase).includes(bareF));
      // A changed form inside (μεγάλος → μεγάλο σπίτι) also plays just the phrase; otherwise the word leads into it (θέλω + να πάω).
      // A person's form of the verb (λέω → εσύ λες) is the verb already, so the phrase plays on its own.
      const wv = x.who && wwFold(x.who.verb) === wwFold(lab), changed = !inside && (!!wwForm(lab, x.phrase) || wv || (w.t === 'v' && hasVerb(lab, x.phrase)));
      if (same) d.remove(); say(same || inside || changed ? x.phrase : lab + ' ' + x.phrase);
      const form = !same && !(inside && /\s/.test(bareF)) && (wv && wwFold(x.who.pf) !== wwFold(lab) ? `With ${x.who.pn}, ${lab} becomes ${x.who.pf}.` : (wwForm(lab, x.phrase) || (this.center && !wwFold(x.phrase).includes(wwFold(this.label(this.center.k).replace(/^(ο|η|το|οι|τα) /, ''))) && wwForm(this.label(this.center.k), x.phrase)))); if (form) this.chip.createDiv({ cls: 'gq-hint', text: form });
      if (x.also) { const o = this.chip.createDiv({ cls: 'gq-hint' }); o.appendText('also: '); o.createSpan({ text: x.also.phrase, attr: { lang: 'el' } }); if (x.also.en) o.appendText('  (' + x.also.en + ')'); }
      if (x.once) { const o = this.chip.createDiv({ cls: 'gq-hint' }); o.appendText('for one time: '); o.createSpan({ text: x.once, attr: { lang: 'el' } }); }
    }

    else say(this.label(m.k));
    const others = [...near].filter(k => k !== m.k && k !== this.center.k).length;
    this.chip.createDiv({ cls: 'gq-hint', text: m === this.center ? `${this.nodes.size - 1} words go with it` : others ? `Also goes with ${others} of the words here` : 'Goes with the word in the middle' });
    this.chipPlace(); this.chip.addClass('is-on');
  }
  // The card's bottom edge sits just above the web: it covers the instructions, never the words.
  chipPlace() { const c = this.chip; if (!c || !this.stage) return; c.style.top = Math.max(4, this.stage.offsetTop - c.offsetHeight - 4) + 'px'; }
  // More than one: a noun's plural, εγώ → εμείς, πάω → εμείς πάμε. Spoken, and shown in the chip for a moment.
  plural(m) {
    const w = this.data.get(m.k) || {}; this.chip.empty(); clearTimeout(this.plTimer);
    if (w.pl) { this.chip.createEl('b', { text: w.pl, attr: { lang: 'el' } }); this.chip.appendText('  · more than one'); say(w.pl); }
    else if (w.already) { this.chip.createEl('b', { text: this.label(m.k), attr: { lang: 'el' } }); this.chip.appendText('  · already plural'); say(this.label(m.k)); }
    else { const mm = wwMany(this.label(m.k), w);
      if (mm) { this.chip.createEl('b', { text: mm.gr, attr: { lang: 'el' } }); this.chip.appendText(`  · more than one: ${mm.en}`); say(mm.gr); }
      else this.chip.appendText(w.t === 'n' ? 'This one usually has no plural.' : 'Double-tap a thing, a person, a doing word or εγώ to hear more than one.'); }
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
    this.plugin.paintAgreeBox(this.agree, this.path, () => this.relabel());
    void name;
  }
}

// ---------- Story Lines, Γιαγιά, Buzzer and Cousins live inside the vault and open here, offline, in the same page ----------
const APPV = 'greekquent-app';
// Word notes that open Τι λέμε; (greetings by time of day) from More.
// The foods in the fridge game. A word card for one of them offers the game.
const FRIDGE_W = new Set(['γάλα', 'νερό', 'αυγό', 'τυρί', 'μήλο', 'ντομάτα', 'κρέας', 'ψάρι', 'γιαούρτι', 'πορτοκάλι', 'σαλάτα', 'κοτόπουλο', 'σοκολάτα', 'φέτα', 'μέλι', 'καφές']);
const GREET_W = new Set(['καλημέρα', 'καλησπέρα', 'καληνύχτα', 'απόγευμα', 'βράδυ', 'πρωί', 'μέρα', 'νύχτα', 'γεια', 'αντίο', 'ώρα']);
const APPS = { story: { file: 'storylines.html', title: 'Story Lines', icon: 'clapperboard' }, giagia: { file: 'giagia.html', title: 'Γιαγιά', icon: 'gamepad-2' }, buzzer: { file: 'buzzer.html', title: 'Buzzer', icon: 'zap' }, cousins: { file: 'cousins.html', title: 'Cousins', icon: 'users' }, hello: { file: 'hello.html', title: 'Τι λέμε;', icon: 'sun' }, fridge: { file: 'fridge.html', title: 'Τι βλέπεις στο ψυγείο;', icon: 'refrigerator' }, crossword: { file: 'crossword.html', title: 'Σταυρόλεξο', icon: 'grid-3x3' } };
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
    html = html.replace('<!--GQ_START-->', '<script>window.GQ_HASH=' + JSON.stringify(this.hash) + ';(' + gqFrameVoice.toString() + ')();</script>');
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
  getDisplayText() { return 'Side panel'; }
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
// Every φόρα point builds it (it never shrinks). Today's φόρα sets the mood: a quiet night, an evening, a sunny day, a festival.
const WORLDS = {
  village: { name: 'Village', eras: [
    { name: 'Ancient village', items: [['house', 'το σπίτι'], ['tree', 'η ελιά'], ['temple', 'ο ναός'], ['house', 'η αυλή'], ['amphora', 'ο αμφορέας'], ['temple', 'η αγορά']] },
    { name: 'Byzantine town', items: [['church', 'η εκκλησία'], ['house', 'το σπίτι'], ['cypress', 'το κυπαρίσσι'], ['house', 'ο φούρνος'], ['church', 'το μοναστήρι'], ['cypress', 'ο κήπος']] },
    { name: 'Island harbor', items: [['cube', 'το σπίτι'], ['mill', 'ο μύλος'], ['boat', 'η βάρκα'], ['cube', 'το καφενείο'], ['church', 'το εκκλησάκι'], ['boat', 'το καΐκι']] },
    { name: 'Modern city', items: [['block', 'η πολυκατοικία'], ['kiosk', 'το περίπτερο'], ['block', 'το γραφείο'], ['tree', 'το πάρκο'], ['block', 'το σχολείο'], ['bus', 'το λεωφορείο']] }] },
  grove: { name: 'Olive grove', eras: [
    { name: 'Young grove', items: [['sapling', 'το δεντράκι'], ['sapling', 'η ελιά'], ['soil', 'το χώμα'], ['can', 'το νερό'], ['sapling', 'το φύλλο'], ['fence', 'το χωράφι']] },
    { name: 'First harvest', items: [['olives', 'οι ελιές'], ['basket', 'το καλάθι'], ['olives', 'το λιόδεντρο'], ['net', 'το δίχτυ'], ['olives', 'η συγκομιδή'], ['donkey', 'το γαϊδουράκι']] },
    { name: 'The press', items: [['press', 'το λιοτρίβι'], ['olives', 'οι ελιές'], ['jar', 'το πιθάρι'], ['basket', 'το καλάθι'], ['jar', 'το λάδι'], ['donkey', 'το γαϊδουράκι']] },
    { name: 'The tasting', items: [['table', 'το τραπέζι'], ['bottle', 'το μπουκάλι'], ['olives', 'το λιόδεντρο'], ['bottle', 'το λάδι'], ['table', 'το ψωμί'], ['cup', 'το ποτηράκι']] }] },
  // Gyro: build a γύρος from the spit to the souvlaki shop.
  gyro: { name: 'Gyro', eras: [
    { name: 'The grill', items: [['spit', 'ο γύρος'], ['fire', 'η φωτιά'], ['cook', 'ο ψήστης'], ['knife', 'το μαχαίρι'], ['salt', 'το αλάτι'], ['pita', 'η πίτα']] },
    { name: 'The fillings', items: [['spit', 'ο γύρος'], ['tomato', 'η ντομάτα'], ['onion', 'το κρεμμύδι'], ['fries', 'οι πατάτες'], ['tzatziki', 'το τζατζίκι'], ['pita', 'η πίτα']] },
    { name: 'Wrap it up', items: [['spit', 'η σούβλα'], ['paper', 'το χαρτί'], ['wrap', 'το πιτόγυρο'], ['plate', 'η μερίδα'], ['fork', 'το πιρούνι'], ['water', 'το νερό']] },
    { name: 'The souvlaki shop', items: [['shop', 'το σουβλατζίδικο'], ['table', 'το τραπέζι'], ['chair', 'η καρέκλα'], ['customer', 'ο πελάτης'], ['menu', 'ο κατάλογος'], ['scooter', 'το μηχανάκι']] }] },
  // Dance: the quickest world. Every φόρα point is a step, and the floor fills with the dances you learn.
  dance: { name: 'Dance', eras: [{ name: 'Πανηγύρι', items: [] }] },
  // Gallery: the second quick world. Every φόρα point is a chisel stroke on a famous statue.
  gallery: { name: 'Gallery', eras: [{ name: 'Το μουσείο', items: [] }] },
  olive: { name: 'Olive', eras: [{ name: 'Your olive tree', items: [] }, { name: 'The olives', items: [] }, { name: 'The oil', items: [] }, { name: 'The lamp', items: [] }] },
  pet: { name: 'Pet', eras: [
    { name: 'Little Φοράκι', items: [] }, { name: 'Φοράκι grows', items: [] }, { name: 'Φοράκι in a hat', items: [] }, { name: 'Φοράκι the great', items: [] }] },
};
// English for each piece of a world, shown next to the Greek when it is tapped.
const WORLD_EN = {"το σπίτι": "house", "η ελιά": "olive tree", "ο ναός": "temple", "η αυλή": "courtyard", "ο αμφορέας": "amphora", "η αγορά": "marketplace", "η εκκλησία": "church", "το κυπαρίσσι": "cypress", "ο φούρνος": "bakery", "το μοναστήρι": "monastery", "ο κήπος": "garden", "ο μύλος": "windmill", "η βάρκα": "boat", "το καφενείο": "café", "το εκκλησάκι": "chapel", "το καΐκι": "fishing boat", "η πολυκατοικία": "apartment building", "το περίπτερο": "kiosk", "το γραφείο": "office", "το πάρκο": "park", "το σχολείο": "school", "το λεωφορείο": "bus", "το δεντράκι": "little tree", "το χώμα": "soil", "το νερό": "water", "το φύλλο": "leaf", "το χωράφι": "field", "οι ελιές": "olives", "το καλάθι": "basket", "το λιόδεντρο": "olive tree", "το δίχτυ": "net", "η συγκομιδή": "harvest", "το γαϊδουράκι": "little donkey", "το λιοτρίβι": "olive press", "το πιθάρι": "storage jar", "το λάδι": "olive oil", "το τραπέζι": "table", "το μπουκάλι": "bottle", "το ψωμί": "bread", "το ποτηράκι": "tasting glass", "ο γύρος": "gyro", "η φωτιά": "fire", "ο ψήστης": "grill cook", "το μαχαίρι": "knife", "το αλάτι": "salt", "η πίτα": "pita", "η ντομάτα": "tomato", "το κρεμμύδι": "onion", "οι πατάτες": "fries", "το τζατζίκι": "tzatziki", "η σούβλα": "spit", "το χαρτί": "paper", "το πιτόγυρο": "gyro wrap", "η μερίδα": "a plate (portion)", "το πιρούνι": "fork", "το σουβλατζίδικο": "souvlaki shop", "η καρέκλα": "chair", "ο πελάτης": "customer", "ο κατάλογος": "menu", "το μηχανάκι": "scooter", "το πεζοδρόμιο": "sidewalk"};
const W_W = 160, W_H = 56;
function worldMood(today, score) { return score >= 25 || today >= 25 ? 3 : today >= 1 || score >= 10 ? 2 : score >= 3 ? 1 : 0; }
const MOODS = ['A quiet night', 'An evening', 'A sunny day', 'A festival'];
// The world grows fast at first and slower later: item k needs W_PTS x (k/23)^2 φόρα points in all (6, 23, 52, 91, 142 ... 3,000),
// so every game, puzzle and green word moves it. 3,000 is about a school year of steady practice.
// Each gap is a little longer than the one before (rewards that start often and thin out gradually), and early words count for more anyway.
const W_STAGES = 24, W_PTS = 3000;
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
// The Dance world seen from above, like a dance diagram: one footprint for each step, no dancer.
// Each step is [foot, dx, y, touch]: dx is how far along the line from the other foot, y is in front (minus, toward the middle of the circle) or behind.
// A touch (or a lift) leaves a light print and the weight stays where it was. They are simplified, but the counts and the shape are the real ones.
const DANCE_FEET = {
  syrtos: [['R', 24, 0], ['L', 18, -14], ['R', 22, 0], ['L', 14, -20], ['R', -2, 14], ['L', 12, 0]],
  kalamatianos: [['R', 24, 0], ['L', 18, -14], ['R', 22, 0], ['L', 18, -14], ['R', 22, 0], ['L', 18, -14], ['R', 22, 0], ['L', 16, -22], ['R', -4, 18], ['L', 20, 0], ['R', 18, -22], ['L', -6, 18]],
  tsamiko: [['R', 26, 0], ['L', 18, -14], ['R', 24, 0], ['L', 18, -14], ['R', 24, 0], ['L', 10, -22, 1], ['L', -8, 0], ['R', 12, -22, 1], ['R', 14, 0], ['L', 10, -22, 1], ['L', 16, 0], ['R', 24, 0]],
  hasapiko: [0, 1, 2].flatMap(() => [['R', 24, 0], ['L', 18, -14], ['R', 22, 0], ['L', 14, -28, 1], ['L', 12, 0], ['R', 12, -28, 1], ['R', 12, 0]]),
  zeibekiko: null
};
const DANCE_ACC = { syrtos: 'τον συρτό', kalamatianos: 'τον καλαματιανό', tsamiko: 'το τσάμικο', hasapiko: 'το χασάπικο', zeibekiko: 'το ζεϊμπέκικο', ikariotiko: 'το ικαριώτικο', pentozali: 'την πεντοζάλη', ballos: 'τον μπάλο', hasaposerviko: 'το χασαποσέρβικο', pontiako: 'το ποντιακό', sousta: 'τη σούστα', tsakonikos: 'τον τσακώνικο' };
const DANCE_EN = { syrtos: 'syrtos', kalamatianos: 'kalamatianos', tsamiko: 'tsamiko', hasapiko: 'hasapiko', zeibekiko: 'zeibekiko', ikariotiko: 'ikariotiko', pentozali: 'pentozali', ballos: 'ballos', hasaposerviko: 'hasaposerviko', pontiako: 'pontic dance', sousta: 'sousta', tsakonikos: 'tsakonikos' };
// Prints for a dance, fitted into a W x H box: [{ x, y, f, t, rot }].
function dancePrints(k, W, H, size) {
  const m = 30 * (size || 1);
  let raw = [];
  if (!DANCE_FEET[k]) {   // ο ζεϊμπέκικος: one dancer, alone, turning on a small circle, made up as you go
    for (let i = 0; i < 9; i++) { const a = -Math.PI / 2 + i * 0.72, r = i === 8 ? 12 : 40, f = i % 2 ? 'L' : 'R', o = f === 'R' ? 5 : -5; raw.push({ x: Math.cos(a) * (r + o), y: Math.sin(a) * (r + o), f, t: i === 4, rot: a * 180 / Math.PI + 90 }); }
  } else {
    const pos = { R: [12, 0], L: [0, 0] };
    for (const [f, dx, dy0, t] of DANCE_FEET[k]) {
      const dy = dy0, o = pos[f === 'R' ? 'L' : 'R'], p = [o[0] + dx, dy]; if (!t) pos[f] = p;
      raw.push({ x: p[0], y: p[1], f, t: !!t, rot: (f === 'R' ? 8 : -8) + (dy0 < -8 ? (f === 'L' ? 14 : -14) : 0) });
    }
  }
  const xs = raw.map(p => p.x), ys = raw.map(p => p.y), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const s = Math.min(2, (W - m) / Math.max(1, x1 - x0), (H - m - 34) / Math.max(1, y1 - y0));
  return raw.map(p => ({ ...p, x: W / 2 + (p.x - (x0 + x1) / 2) * s, y: H / 2 + 8 + (p.y - (y0 + y1) / 2) * s }));
}
const svgA = (parent, tag, a) => { const e = document.createElementNS(SVGNS, tag); for (const k in a) e.setAttribute(k, a[k]); if (parent) parent.appendChild(e); return e; };
// One footprint: a sole and a heel, the right foot as drawn, the left one mirrored.
function footprint(parent, p, cls, size) {
  const g = svgA(parent, 'g', { class: 'gq-print ' + cls + (p.t ? ' is-touch' : ''), transform: `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${p.rot.toFixed(0)}) scale(${(p.f === 'L' ? -1 : 1) * size} ${size}) translate(-6 -14)` });
  svgA(g, 'path', { d: 'M6 0C10.5 0 12 5 11.5 10C11 14.5 9.5 16 8.8 16.5L3.2 16.5C2.5 16 1 14 .8 10C.5 4 2.5 0 6 0Z' });
  svgA(g, 'ellipse', { cx: 6, cy: 22.6, rx: 3.9, ry: 4.3 });
  return g;
}
// The village square under the prints: warm stone, a few tiles, and the festival lights across the top.
// The dancer in gray ASCII. Zeibekiko: arms out like wings, a spin (front, side, back, side) twice, down to slap the heel (*), then up.
const ZEI = {
  still: ['      o      ', '  ___/|\\___  ', '      |      ', '     / \\     ', '    /   \\    '],
  front: ['      o      ', ' \\____|____/ ', '      |      ', '     / \\     ', '    /   |    '],
  right: ['      o      ', '    --|--.   ', '      |      ', '      |\\     ', '      | \\    '],
  back:  ['      @      ', ' \\____|____/ ', '      |      ', '     / \\     ', '    |   \\    '],
  left:  ['      o      ', '   .--|--    ', '      |      ', '     /|      ', '    / |      '],
  slap:  ['             ', '     o       ', '  __/|__     ', '     |  \\    ', '    /\\__/*   '],
  up:    ['   \\  o  /   ', '    \\_|_/    ', '      |      ', '     / \\     ', '    /   \\    ']
};
// Pixel sprites for the corner and the φόρα card: one object, no frame, on the page's own background.
// Rows of letters; each letter is a color in SPR_PAL, '.' is see-through. Drawn bottom-up so a reveal grows out of the ground.
const SPR = {"tree":{"seed":["........................","........................","........................","........................","........................","........................","........................","........................","........................","........................","........................","........................","........................","........................","........................","........................","........................","........................","........................","........................","............b...........","...........ss...........","..........ssss..........","........SSSSSSSS........"],"sprout":["........................","........................","........................","........................","........................","........................","........................","........................","........................","........................","........................","........................","........................","........................","........................","........................","........................","..........g...g.........","...........ggG..........","............t...........","............t...........","............t...........","..........ssss..........","........SSSSSSSS........"],"sapling":["........................","........................","........................","........................","........................","........................","........................","........................","........................","........................","............g...........","...........gGg..........","..........gGdg..........","............tdG.........",".........Gg.t...........","............t.gG........","............tt..........","............t...........","............t...........","............t...........","............t...........","............t...........",".........ssssss.........",".......SSSSSSSSSS......."],"young":["........................","........................","........................","........................","........................","........................",".........GgGgGd.........","........GgGggggd........",".......GgGGGGgggd.......",".......GGgGgggggd.......",".......ggggGGggdd.......",".......dGgggggddd.......","........dddddddd........",".........dddddd.........","............tT..........","............tT..........","............tT..........","............tT..........","............tT..........","...........tT...........","..........tttTt.........","..........tttTt.........","........ssssssss........","......SSSSSSSSSSSS......"],"tree":["........................","........................","..........dddd..........","......gggGGgGgggdd......",".....ggGgGgGgGggggd.....","...dGGggGggGgGggGgGdd...","...GggggggGggggggggGd...","...GggggGgggGgggGgGgd...","...GGggGgGgggggGggGdd...","...dggGGggGGGggggGgdd...","...dddgggGgggGggGdddd...",".....dddggGgggddddd.....","......dddddddddddd......",".........tddddT.........","............ttT.........","............ttT.........","............ttT.........","............ttT.........","............ttT.........","............ttT.........",".........ttttTt.........",".........ttttTt.........","......ssssssssssss......","....SSSSSSSSSSSSSSSS...."],"olives":["........................","........................","..........dodd..........","......gggGGgGgggdd......",".....ggGgogGgGggggd.....","...dGGggoggGgGggGgGdo...","...GggggggGggggggggGd...","...GgoggGgggGgggGgGgd...","...GoogGgGggggoGggGdd...","...dggGGggGGGggggGgod...","...dddgggGgogGggGdddd...",".....dddogGgggddddd.....","......ddodoodddddd......",".........tddddT.........","............ttT.........","............ttT.........","............ttT.........","............ttT.........","............ttT.........","............ttT.........",".........ttttTt.........",".........ttttTt.........","......ssssssssssss......","....SSSSSSSSSSSSSSSS...."]},"dancer":{"still":["................","................","......hhhh......","......hkkh......","......kkkk......","......kkkk......",".......kk.......",".....vwwwwv.....","....kvwwwwvk....","....kvwwwwvk....","....kvwwwwvk....","...kwvwwwwvwk...","...k.vwwwwv.k...","...k.rrrrrr.k...","...w..pppp..w...","......pppp......","......pppp......","......pppp......","......pppp......","......pp.p......","......pp.p......","......pp.p......",".....ppp.pp.....","................"],"out":["................","................","......hhhh......","......hkkh......","......kkkk......","......kkkk......",".......kk.......","k....vwwwwv....k","kkkkkvwwwwvkkkkk","wwwwwvwwwwvwwwww",".....vwwwwv.....",".....vwwwwv.....",".....vwwwwv.....",".....rrrrrr.....","......pppp......","......pppp......","......pppp......","......pppp......","......pppp......","......pp.p......","......pp.p......","......pp.p......",".....ppp.pp.....","................"],"stepR":["................","................","......hhhh......","......hkkh......","......kkkk......","......kkkk......",".......kk.......","k....vwwwwv....k","kkkkkvwwwwvkkkkk","wwwwwvwwwwvwwwww",".....vwwwwv.....",".....vwwwwv.....",".....vwwwwv.....",".....rrrrrr.....","......pppp......","......pppp......","......ppp.p.....","......pp.pp.....","......p..pp.....",".....pp..pp.....",".....pp...p.....",".....pp...pp....","....ppp...ppp...","................"],"lift":["................","................","......hhhh......","......hkkh......","......kkkk......","......kkkk......",".......kk.......","k....vwwwwv....k","kkkkkvwwwwvkkkkk","wwwwwvwwwwvwwwww",".....vwwwwv.....",".....vwwwwv.....",".....vwwwwv.....",".....rrrrrr.....","......pppp......","......pp.pp.....","......pp..p.....","......pp..pp....","......pp...ppp..","......pp........","......pp........","......pp........",".....ppp........","................"],"back":["................","................","......hhhh......","......hhhh......","......hhhh......","......kkkk......",".......kk.......","k....vwwwwv....k","kkkkkvwwwwvkkkkk","wwwwwvwwwwvwwwww",".....vwwwwv.....",".....vwwwwv.....",".....vwwwwv.....",".....rrrrrr.....","......pppp......","......pppp......","......pppp......","......pppp......","......pppp......","......pp.p......","......pp.p......","......pp.p......",".....ppp.pp.....","................"],"slap":["................","................","......hhhh......","......hkkh......","......kkkk......","......kkkk......",".......kk.......",".....vwwwwv.....",".kkkkvwwwwvk....",".wwwwvwwwwvk....",".....vwwwwvk....",".....vwwwwvk....",".....vwwwwvk....",".....rrrrrrk....","......pp.p.k....","......pp..pk....","......pp..pw....","......pp...p....","......pp..p.....","......pp..p.....","......pp.pk.....","......pp..w.....",".....ppp........","................"],"up":["................","................",".k....hhhh....k.",".wk...hkkh...kw.","..k...kkkk...k..","..wk..kkkk..kw..","...k...kk...k...","...wkvwwwwvkw...","....wvwwwwvw....",".....vwwwwv.....",".....vwwwwv.....",".....vwwwwv.....",".....vwwwwv.....",".....rrrrrr.....","......pppp......","......pppp......","......pppp......","......pppp......","......pppp......","......pp.p......","......pp.p......","......pp.p......",".....ppp.pp.....","................"]},"house":{"0":["........................","........................","........................","........................","........................","........................","........................","........................","........................","........................","........................","........................","........................","........................","........................","........................","........................","........................","........................","........................","........................","........................","....qqqqqqqqqqqqqqqq....","....qqqqqqqqqqqqqqqq...."],"1":["........................","........................","........................","........................","........................","........................","........................","........................","........................","........................","........................","........................","........................","........................","........................","........................","........................",".....qWWWWWWWWWWWWq.....",".....qWWWWWWWWWWWWq.....",".....qWWWWWWWWWWWWq.....",".....qWWWWWWWWWWWWq.....",".....qWWWWWWWWWWWWq.....","....qqqqqqqqqqqqqqqq....","....qqqqqqqqqqqqqqqq...."],"2":["........................","........................","........................","........................","........................","........................","........................","........................","........................","....qqqqqqqqqqqqqqqq....",".....qWWWWWWWWWWWWq.....",".....qWWWWWWWWWWWWq.....",".....qWWWWWWWWWWWWq.....",".....qWWWWWWWWWWWWq.....",".....qWWWWWWWWWWWWq.....",".....qWWWWWWWWWWWWq.....",".....qWWWWWWWWWWWWq.....",".....qWWWWWWWWWWWWq.....",".....qWWWWWWWWWWWWq.....",".....qWWWWWWWWWWWWq.....",".....qWWWWWWWWWWWWq.....",".....qWWWWWWWWWWWWq.....","....qqqqqqqqqqqqqqqq....","....qqqqqqqqqqqqqqqq...."],"3":["........................","........................","........................","........................","........................","........................","........................","........................","........................","....qqqqqqqqqqqqqqqq....",".....qWWWWWWWWWWWWq.....",".....qWWWWWWWWWWWWq.....",".....qWWWWWWWWWWWWq.....",".....qWWWWWWWWWWWWq.....",".....qWWWWWWWWWWWWq.....",".....qWWWWBBBBWWWWq.....",".....qWWWWBBBBWWWWq.....",".....qWWWWBBBBWWWWq.....",".....qWWWWBByBWWWWq.....",".....qWWWWBBBBWWWWq.....",".....qWWWWBBBBWWWWq.....",".....qWWWWBBBBWWWWq.....","....qqqqqqqqqqqqqqqq....","....qqqqqqqqqqqqqqqq...."],"4":["........................","........................","........................","........................","........................","........................","........................","........................","........................","....qqqqqqqqqqqqqqqq....",".....qWWWWWWWWWWWWq.....",".....qWWWWWWWWWWWWq.....",".....qBWBWWWWWWBWBq.....",".....qBWBWWWWWWBWBq.....",".....qBWBWWWWWWBWBq.....",".....qWWWWBBBBWWWWq.....",".....qWWWWBBBBWWWWq.....",".....qWWWWBBBBWWWWq.....",".....qWWWWBByBWWWWq.....",".....qWWWWBBBBWWWWq.....",".....qWWWWBBBBWWWWq.....",".....qWWWWBBBBWWWWq.....","....qqqqqqqqqqqqqqqq....","....qqqqqqqqqqqqqqqq...."],"5":["........................","........................","........................","...............y........","..............yyy.......","...............y........","...............B........","..............BBB.......",".............BBBBB......","....qqqqqqqqqqBBBqqq....",".....qWWWWWWWWWWWWq.....",".....qWWWWWWWWWWWWq.....",".....qBWBWWWWWWBWBq.....",".....qBWBWWWWWWBWBq.....",".....qBWBWWWWWWBWBq.....","....mqWWWWBBBBWWWWq.m...","...m.mWWWWBBBBWWWWqm.m..","..m.mqWWWWBBBBWWWWq.m...","...m.qWWWWBByBWWWWqm....","....mqWWWWBBBBWWWWq.....","...m.qWWWWBBBBWWWWq.....","...nnqWWWWBBBBWWWWqnn...","....qqqqqqqqqqqqqqqq....","....qqqqqqqqqqqqqqqq...."]},"gyro":{"0":["........................","...........ii...........","...........ii...........","...........ii...........","...........ii...........","...........ii...........","...........ii...........","...........ii...........","...........ii...........","...........ii...........","...........ii...........","...........ii...........","...........ii...........","...........ii...........","...........ii...........","...........ii...........","...........ii...........","...........ii...........","...........ii...........","...........ii...........","...........ii...........","...........ii...........",".......qqqqqqqqqq.......",".......qqqqqqqqqq......."],"1":["........................","...........ii...........","...........ii...........","...........ii...........","...........ii...........",".........CCCCCC.........",".........cCcccC.........",".........CcccCc.........",".........CCCCCC.........",".........ccCccc.........",".........cCcccC.........",".........CCCCCC.........",".........cccCcc.........","..........cCcc..........","..........CCCC..........","..........cccC..........","..........ccCc..........","..........CCCC..........","..........Cccc..........","..........cccC..........","..........CCCC..........","...........ii...........",".......qqqqqqqqqq.......",".......qqqqqqqqqq......."],"2":["........................","...........ii...........","...........ii...........","...........ii...........","........CCCCCCCC........","........cccCcccC........","........ccCcccCc........","........CCCCCCCC........","........CcccCccc........",".........ccCccc.........",".........CCCCCC.........",".........CcccCc.........",".........cccCcc.........",".........CCCCCC.........",".........cCcccC.........",".........CcccCc.........",".........CCCCCC.........","..........cCcc..........","..........Cccc..........","..........CCCC..........","..........ccCc..........","..........cCcc..........",".......qqqqqqqqqq.......",".......qqqqqqqqqq......."],"3":["........................","...........ii...........","...........ii...........",".......CCCCCCCCCC.......",".......cCcccCcccC.......",".......CcccCcccCc.......",".......CCCCCCCCCC.......","........cCcccCcc........","........CcccCccc........","........CCCCCCCC........","........ccCcccCc........","........cCcccCcc........","........CCCCCCCC........",".........ccCccc.........",".........cCcccC.........",".........CCCCCC.........",".........cccCcc.........",".........ccCccc.........",".........CCCCCC.........","..........cccC..........","..........ccCc..........","..........CCCC..........",".......qqqCcccqqq.......",".......qqqqqqqqqq......."],"4":["........................","...........ii...........","...........ii...........",".......CCCCCCCCCC.......",".......cCcccCcccC.ff....",".......CcccCcccCc.Ff....",".......CCCCCCCCCC.ff....","........cCcccCcc..ff....","........CcccCccc..Ff....","........CCCCCCCC..ff....","........ccCcccCc..ff....","........cCcccCcc..Ff....","........CCCCCCCC..ff....",".........ccCccc...ff....",".........cCcccC...Ff....",".........CCCCCC...ff....",".........cccCcc...ff....",".........ccCccc...Ff....",".........CCCCCC...ff....","..........cccC....ff....","..........ccCc....ff....","..........CCCC..........",".......qqqCcccqqq.......",".......qqqqqqqqqq......."],"5":["........................","...........ii...........","...........ii...........",".......CCCCCCCCCC.......",".......cCcccCcccC.ff....",".......CcccCcccCc.Ff....",".......CCCCCCCCCC.ff....","........cCcccCcc..ff....","........CcccCccc..Ff....","........CCCCCCCC..ff....","........ccCcccCc..ff....","........cCcccCcc..Ff....","........CCCCCCCC..ff....",".........ccCccc...ff....",".........cCcccC...Ff....",".........CCCCCC...ff....",".........cccCcc...ff....",".........ccCccc...Ff....",".........CCCCCC...ff....","..PuOwRP..cccC....ff....",".PPPPPPPP.ccCc....ff....",".PPPPPPPP.CCCC..........",".......qqqCcccqqq.......",".......qqqqqqqqqq......."]}};
const SPR_PAL = {"S":"#5a4022","s":"#7a5a32","t":"#7a5230","T":"#5a3a20","g":"#7f9a45","G":"#a9bb7a","d":"#56703a","o":"#3d2a4a","b":"#c8a56a","k":"#e2ac80","h":"#2b1b12","w":"#f4f0e4","v":"#2a2a2a","r":"#c0392b","p":"#33363d","q":"#b9b2a4","W":"#ffffff","B":"#2f6fbf","y":"#e0b030","m":"#c2307a","n":"#b0603a","i":"#8a8a8a","c":"#b8743a","C":"#8c5426","f":"#e0602a","F":"#f1c40f","P":"#e8c58a","u":"#d0392b","R":"#2e7d32","O":"#c99ac9","e":"#dfe86a","j":"#9a4aa8","x":"#8fb0c4","X":"#eef5f8","1":"#d9e8f0","l":"#d2a923","L":"#f2d35c","a":"#b8643a","A":"#874322","z":"#d98f5c","Y":"#fff4b8","2":"#f9e6a6","3":"#f6d36b"};
// The olive: one path for everyone. Tree, green olives, ripe purple olives, a bottle filling with oil, then the lamp, lit.
const SPR_OLIVE = [["........................","........................","........................","........................","........................","........................","........................","........................","........................","........................","........................","........................","........................","........................","........................","........................","........................","........................","........................","........................","............b...........","...........ss...........","..........ssss..........","........SSSSSSSS........"],["........................","........................","........................","........................","........................","........................","........................","........................","........................","........................","........................","........................","........................","........................","........................","........................","........................","..........g...g.........","...........ggG..........","............t...........","............t...........","............t...........","..........ssss..........","........SSSSSSSS........"],["........................","........................","........................","........................","........................","........................","........................","........................","........................","........................","............g...........","...........gGg..........","..........gGdg..........","............tdG.........",".........Gg.t...........","............t.gG........","............tt..........","............t...........","............t...........","............t...........","............t...........","............t...........",".........ssssss.........",".......SSSSSSSSSS......."],["........................","........................","........................","........................","........................","........................",".........GgGgGd.........","........GgGggggd........",".......GgGGGGgggd.......",".......GGgGgggggd.......",".......ggggGGggdd.......",".......dGgggggddd.......","........dddddddd........",".........dddddd.........","............tT..........","............tT..........","............tT..........","............tT..........","............tT..........","...........tT...........","..........tttTt.........","..........tttTt.........","........ssssssss........","......SSSSSSSSSSSS......"],["........................","........................","..........dddd..........","......gggGGgGgggdd......",".....ggGgGgGgGggggd.....","...dGGggGggGgGggGgGdd...","...GggggggGggggggggGd...","...GggggGgggGgggGgGgd...","...GGggGgGgggggGggGdd...","...dggGGggGGGggggGgdd...","...dddgggGgggGggGdddd...",".....dddggGgggddddd.....","......dddddddddddd......",".........tddddT.........","............ttT.........","............ttT.........","............ttT.........","............ttT.........","............ttT.........","............ttT.........",".........ttttTt.........",".........ttttTt.........","......ssssssssssss......","....SSSSSSSSSSSSSSSS...."],["........................","........................","..........dddd..........","......gggGGgGgggdd......",".....ggGgGgGgGggggd.....","...dGGggGggGgGggGgGdd...","...GgeggggGggegggggGd...","...GgeggegggGeggGgGgd...","...GGggGeGgggggGggGdd...","...dggGGggGGGggggGedd...","...dddgggGgggGggGdedd...",".....dddggGgggddddd.....","......dddddddddddd......",".........tddddT.........","............ttT.........","............ttT.........","............ttT.........","............ttT.........","............ttT.........","............ttT.........",".........ttttTt.........",".........ttttTt.........","......ssssssssssss......","....SSSSSSSSSSSSSSSS...."],["........................","........................","..........dddd..........","......gggGGgGgggdd......",".....ggegGgGgGggegd.....","...dGGgeGgeGgGggegGdd...","...GgeggggeggegggggGd...","...GgeggegggGeggGgGgd...","...GGggGeGgegggGggGdd...","...dggGGggGeGggggGedd...","...dddgggGgggGggGdedd...",".....dddggGgggddddd.....","......dddddddddddd......",".........tddddT.........","............ttT.........","............ttT.........","............ttT.........","............ttT.........","............ttT.........","............ttT.........",".........ttttTt.........",".........ttttTt.........","......ssssssssssss......","....SSSSSSSSSSSSSSSS...."],["........................","........................","..........dddd..........","......gggGGgGgggdd......",".....ggegGgGgGggjgd.....","...dGGgeGgjGgGggjgGdd...","...GgjggggjggjgggggGd...","...GgjggjgggGjggGgGgd...","...GGggGjGgegggGggGdd...","...dggGGggGeGggggGjdd...","...dddgggGgggGggGdjdd...",".....dddggGgggddddd.....","......dddddddddddd......",".........tddddT.........","............ttT.........","............ttT.........","............ttT.........","............ttT.........","............ttT.........","............ttT.........",".........ttttTt.........",".........ttttTt.........","......ssssssssssss......","....SSSSSSSSSSSSSSSS...."],["........................","........................","..........dddd..........","......gggGGgGgggdd......",".....ggogGgGgGggogd.....","...dGGgoGgoGgGggogGdd...","...GgoggggoggogggggGd...","...GgoggogggGoggGgGgd...","...GGggGoGgogggGggGdd...","...dggGGggGoGggggGodd...","...dddgggGgggGggGdodd...",".....dddggGgggddddd.....","......dddddddddddd......",".........tddddT.........","............ttT.........","............ttT.........","............ttT.........","............ttT.........","............ttT.........","............ttT.........",".........ttttTt.........",".........ttttTt.........","......ssssssssssss......","....SSSSSSSSSSSSSSSS...."],["........................","..........cccC..........","..........cccC..........","..........x11x..........","..........x11x..........","..........x11x..........","..........x11x..........",".........x1111x.........",".......x11111111x.......",".......xX1111111x.......",".......xX1111111x.......",".......xX1111111x.......",".......xX1111111x.......",".......xX1111111x.......",".......xX1111111x.......",".......xX1111111x.......",".......xX1111111x.......",".......xX1111111x.......",".......xX1111111x.......",".......xX1111111x.......",".......xX1111111x.......",".......x11111111x.......",".......xxxxxxxxxx.......","........................"],["........................","..........cccC..........","..........cccC..........","..........x11x..........","..........x11x..........","..........x11x..........","..........x11x..........",".........x1111x.........",".......x11111111x.......",".......xX1111111x.......",".......xX1111111x.......",".......xX1111111x.......",".......xX1111111x.......",".......xX1111111x.......",".......xX1111111x.......",".......xX1111111x.......",".......xX1111111x.......",".......xX1111111x.......",".......xLLLLLLLLx.......",".......xlLllllllx.......",".......xlLllllllx.......",".......xllllllllx.......",".......xxxxxxxxxx.......","........................"],["........................","..........cccC..........","..........cccC..........","..........x11x..........","..........x11x..........","..........x11x..........","..........x11x..........",".........x1111x.........",".......x11111111x.......",".......xX1111111x.......",".......xX1111111x.......",".......xX1111111x.......",".......xX1111111x.......",".......xX1111111x.......",".......xX1111111x.......",".......xLLLLLLLLx.......",".......xlLllllllx.......",".......xlLllllllx.......",".......xlLllllllx.......",".......xlLllllllx.......",".......xlLllllllx.......",".......xllllllllx.......",".......xxxxxxxxxx.......","........................"],["........................","..........cccC..........","..........cccC..........","..........x11x..........","..........x11x..........","..........x11x..........","..........x11x..........",".........x1111x.........",".......x11111111x.......",".......xX1111111x.......",".......xX1111111x.......",".......xLLLLLLLLx.......",".......xlLllllllx.......",".......xlLllllllx.......",".......xlLllllllx.......",".......xlLllllllx.......",".......xlLllllllx.......",".......xlLllllllx.......",".......xlLllllllx.......",".......xlLllllllx.......",".......xlLllllllx.......",".......xllllllllx.......",".......xxxxxxxxxx.......","........................"],["........................","..........cccC..........","..........cccC..........","..........x11x..........","..........x11x..........","..........x11x..........","..........x11x..........",".........x1111x.........",".......xLLLLLLLLx.......",".......xlLllllllx.......",".......xlLllllllx.......",".......xlLllllllx.......",".......xlLllllllx.......",".......xlwwwwwwlx.......",".......xlwddddwlx.......",".......xlwddddwlx.......",".......xlwwwwwwlx.......",".......xlLllllllx.......",".......xlLllllllx.......",".......xlLllllllx.......",".......xlLllllllx.......",".......xllllllllx.......",".......xxxxxxxxxx.......","........................"],["...........................","...........................","...........................","...........................","...........................","...........................","...........................","...........................","...........................","...........................","...........................","...........................","...........................","...........................","..........AA...............",".......zzAAAAzz............","..AA.zzaaaaaaaazz..........",".A..zaaaaaaaaaaaazzzzzz....",".A.aaaaaaaaaaaaaaaaaaaa....",".A.aaaaaaaaaaaaaaaaaaaA....","..A.aaaaaaaaaaaaaaAAAA.....",".....aAAAAAAAAAAA..........",".....AAAAAAAAAAAAA.........","..........................."],["...........................","...........................","...........................","...........................","...........................","...........................","...........................","...........................","...........................","...........................","...........................","...........................","...........................","...........................","..........AA...............",".......zzLllAzz............","..AA.zzaaaaaaaazz..........",".A..zaaaaaaaaaaaazzzzzz....",".A.aaaaaaaaaaaaaaaaaaaa....",".A.aaaaaaaaaaaaaaaaaaaA....","..A.aaaaaaaaaaaaaaAAAA.....",".....aAAAAAAAAAAA..........",".....AAAAAAAAAAAAA.........","..........................."],["...........................","...........................","...........................","...........................","...........................","...........................","...........................","...........................","...........................","...........................","...........................","...........................","...........................",".....................f.....","..........AA........fFf....",".......zzLllAzz......w.....","..AA.zzaaaaaaaazz....w.....",".A..zaaaaaaaaaaaazzzzzz....",".A.aaaaaaaaaaaaaaaaaaaa....",".A.aaaaaaaaaaaaaaaaaaaA....","..A.aaaaaaaaaaaaaaAAAA.....",".....aAAAAAAAAAAA..........",".....AAAAAAAAAAAAA.........","..........................."],["...........................","...........................","...........................","...........................","...........................","...........................","...........................","...........................","...........................","...........................","...........................",".....................Y.....","....................fFf....","....................FYF....","..........AA.........f.....",".......zzLllAzz......w.....","..AA.zzaaaaaaaazz....w.....",".A..zaaaaaaaaaaaazzzzzz....",".A.aaaaaaaaaaaaaaaaaaaa....",".A.aaaaaaaaaaaaaaaaaaaA....","..A.aaaaaaaaaaaaaaAAAA.....",".....aAAAAAAAAAAA..........",".....AAAAAAAAAAAAA.........","..........................."],["...........................","...........................","...........................","...........................","...................22222...","..................2222222..",".................222222222.",".................222333222.","................22233333222","................22233F33222","................2233fYf3322","................2223FYF3222","................222fFYFf222",".................222fFf222.","..........AA.....2222f2222.",".......zzLllAzz...222w222..","..AA.zzaaaaaaaazz....w.....",".A..zaaaaaaaaaaaazzzzzz....",".A.aaaaaaaaaaaaaaaaaaaa....",".A.aaaaaaaaaaaaaaaaaaaA....","..A.aaaaaaaaaaaaaaAAAA.....",".....aAAAAAAAAAAA..........",".....AAAAAAAAAAAAA.........","..........................."]];
const OLIVE_NAMES = [['ο σπόρος', 'the seed'], ['το βλαστάρι', 'the sprout'], ['το δεντράκι', 'the little tree'], ['η ελιά', 'the olive tree'], ['το λιόδεντρο', 'the grown olive tree'],
  ['οι πρώτες ελιές', 'the first olives'], ['οι πράσινες ελιές', 'green olives'], ['οι ελιές ωριμάζουν', 'the olives are ripening'], ['οι ώριμες ελιές', 'ripe olives'],
  ['το μπουκάλι', 'the bottle'], ['λίγο λάδι', 'a little oil'], ['μισό μπουκάλι', 'half a bottle'], ['σχεδόν γεμάτο', 'almost full'], ['το ελαιόλαδο', 'olive oil, a full bottle'],
  ['το λυχνάρι', 'the oil lamp'], ['λάδι στο λυχνάρι', 'oil in the lamp'], ['το φιτίλι', 'the wick, lit'], ['η φλόγα', 'the flame'], ['το φως', 'the light']];
// Stage 1 to 24 of the world becomes one of the 19 olive pictures.
const oliveFrame = idx => Math.min(SPR_OLIVE.length - 1, Math.round((idx - 1) * (SPR_OLIVE.length - 1) / (W_STAGES - 1)));
const SPR_NAMES = {
  grove: [['ο σπόρος', 'the seed'], ['το βλαστάρι', 'the sprout'], ['το δεντράκι', 'the little tree'], ['η ελιά', 'the olive tree'], ['το λιόδεντρο', 'the grown olive tree'], ['οι ελιές', 'the olives']],
  village: [['τα θεμέλια', 'the foundation'], ['ο τοίχος', 'the wall'], ['οι τοίχοι', 'the walls'], ['η πόρτα', 'the door'], ['τα παράθυρα', 'the windows'], ['το σπίτι', 'the house']],
  gyro: [['η σούβλα', 'the spit'], ['ο γύρος', 'the gyro'], ['ο γύρος', 'the gyro'], ['ο γύρος', 'the gyro'], ['η φωτιά', 'the fire'], ['η πίτα', 'the pita']]
};
const FRIENDS_ON = false;
const SPR_DANCE = [['out', 160], ['stepR', 160], ['lift', 160], ['back', 160], ['out', 160], ['slap', 320], ['up', 700], ['still', 0]];
function sprRows(w, f, pose) {
  if (w === 'olive') return SPR_OLIVE[f] || SPR_OLIVE[0];
  if (w === 'grove') return SPR.tree[['seed', 'sprout', 'sapling', 'young', 'tree', 'olives'][f]];
  if (w === 'village') return SPR.house[String(f)];
  if (w === 'gyro') return SPR.gyro[String(f)];
  return SPR.dancer[pose || 'still'] || SPR.dancer.still;
}
// reveal 0..1: how much of the sprite has come up out of the ground.
function sprPaint(cv, rows, reveal) {
  const H = rows.length, W = rows[0].length; if (cv.width !== W) cv.width = W; if (cv.height !== H) cv.height = H;
  const ctx = cv.getContext('2d'); if (!ctx) return; ctx.clearRect(0, 0, W, H);
  const from = Math.floor(H * (1 - Math.max(0, Math.min(1, reveal === undefined ? 1 : reveal))));
  for (let y = from; y < H; y++) for (let x = 0; x < W; x++) { const c = SPR_PAL[rows[y][x]]; if (c) { ctx.fillStyle = c; ctx.fillRect(x, y, 1, 1); } }
}
const ZEI_SEQ = [['front', 150], ['right', 150], ['back', 150], ['left', 150], ['front', 150], ['right', 150], ['back', 150], ['left', 150], ['front', 260], ['slap', 650], ['up', 0]];
// Draw the dancer, the floor and the steps in a <pre>. The steps row: # for a step you have, . for one still to come.
const ZW = 27;
function asciiPre(parent, cls) { return parent.createEl('pre', { cls: 'gq-ascii ' + (cls || ''), attr: { role: 'img' } }); }
function asciiPose(pre, pose) {
  let fig = pre.querySelector('.gq-ascii-fig'); if (!fig) { fig = createSpan('gq-ascii-fig'); pre.prepend(fig); }
  const pad = ' '.repeat(Math.floor((ZW - 13) / 2));
  fig.setText(ZEI[pose].map(l => pad + l).join('\n') + '\n' + '_'.repeat(ZW) + '\n');
}
function asciiSteps(pre, n, have, lit) {
  const row = createSpan('gq-ascii-steps'), sp = n > 12 ? '' : ' ', w = n * (sp ? 2 : 1) - (sp ? 1 : 0), pad = ' '.repeat(Math.max(0, Math.floor((ZW - w) / 2)));
  row.appendText(pad); const out = [];
  for (let i = 0; i < n; i++) { const c = row.createSpan({ cls: i < lit ? 'is-on' : i < have ? 'is-on is-wait' : '', text: i < have ? '#' : '.' }); out.push(c); if (sp && i < n - 1) row.appendText(sp); }
  pre.appendChild(row); return out;
}
function squareFloor(svg, W, H, night) {
  const id = 'gqsq' + Math.random().toString(36).slice(2, 7), d = svgA(svg, 'defs', {});
  const pt = svgA(d, 'pattern', { id, width: 28, height: 28, patternUnits: 'userSpaceOnUse' });
  svgA(pt, 'rect', { width: 28, height: 28, fill: night ? '#2d3352' : '#ecdfc6' }); svgA(pt, 'path', { d: 'M0 .5H28M.5 0V28', stroke: night ? '#3a4166' : '#dccbab', 'stroke-width': 1, fill: 'none' });
  svgA(svg, 'rect', { width: W, height: H, fill: `url(#${id})`, rx: night ? 0 : 10 });
  const cols = ['#ffd860', '#ff7a6b', '#8fd0ff', '#9be08f']; svgA(svg, 'path', { d: `M0 6Q${W / 2} 26 ${W} 6`, stroke: night ? '#8088aa' : '#a89a80', 'stroke-width': 1, fill: 'none' });
  for (let i = 1; i < 14; i++) { const t = i / 14, x = W * t, y = 6 + 40 * t * (1 - t); svgA(svg, 'circle', { cx: x, cy: y + 3, r: 3.2, fill: cols[i % 4], class: 'gq-light', style: `animation-delay:${(i % 5) * .3}s` }); }
}
// Short sounds made on the spot, no files: a soft step, and a little Greek-sounding run for the big moments.
// They follow the Greek voice switch (quiet means no sound at all).
let gqAC = null;
function gqSound(kind) {
  if (gqQuiet()) return; const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  try {
    gqAC = gqAC || new AC(); const c = gqAC; if (c.state !== 'running') c.resume();
    const tone = (hz, at, dur, type, vol, to) => { const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(hz, at); if (to) o.frequency.exponentialRampToValueAtTime(to, at + dur); g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(vol, at + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, at + dur); o.connect(g); g.connect(c.destination); o.start(at); o.stop(at + dur + 0.02); };
    const t = c.currentTime + 0.02;
    if (kind === 'step') tone(150, t, 0.11, 'sine', 0.35, 70);
    else if (kind === 'tink') { tone(2400, t, 0.05, 'triangle', 0.12, 1700); tone(3600, t + 0.01, 0.03, 'sine', 0.06); }
    else { [62, 63, 66, 67, 69, 74].forEach((m, i) => tone(440 * Math.pow(2, (m - 69) / 12), t + i * 0.09, i === 5 ? 0.6 : 0.16, 'triangle', 0.22)); tone(73.4, t, 0.7, 'sine', 0.25); }
  } catch (e) {}
}
// ---------- The gallery (το μουσείο): every φόρα point is a chisel stroke ----------
// A little sculptor carves famous statues out of marble, one after another. Chips fly off with every point, so the
// feedback is instant. A finished statue moves into the hall and does its one silly trick. Each statue costs a bit more.
const STATUES = [
  { k: 'venus', gr: 'η Αφροδίτη της Μήλου', en: 'the Venus de Milo', cost: 24, line: ['Η Αφροδίτη... με χέρια;', 'Venus... with arms?'] },
  { k: 'kouros', gr: 'ο Κούρος', en: 'a kouros, a young man about to walk', cost: 36, line: ['Ο Κούρος περπατάει, επιτέλους.', 'The kouros walks, at last. He waited 2,600 years.'] },
  { k: 'disc', gr: 'ο Δισκοβόλος', en: 'the Discus Thrower', cost: 48, line: ['Πού πήγε ο δίσκος;', 'Where did the discus go?'] },
  { k: 'kore', gr: 'η Καρυάτιδα', en: 'a Caryatid, who holds up a roof', cost: 60, line: ['Ένα λεπτό διάλειμμα, παρακαλώ.', 'A one-minute break, please.'] },
  { k: 'nike', gr: 'η Νίκη της Σαμοθράκης', en: 'the Winged Victory of Samothrace', cost: 72, line: ['Η Νίκη πετάει.', 'Victory takes off.'] },
  { k: 'driver', gr: 'ο Ηνίοχος των Δελφών', en: 'the Charioteer of Delphi', cost: 84, line: ['Πάμε. Πού είναι τα άλογα;', 'Let\'s go. Where are the horses?'] },
  { k: 'god', gr: 'ο Θεός του Αρτεμισίου', en: 'the bronze god from Artemision', cost: 96, line: ['Ψάρι; Ήθελα κεραυνό.', 'A fish? I wanted a thunderbolt.'] },
  { k: 'thinker', gr: 'ο Σκεπτόμενος', en: 'The Thinker, a guest from Paris', cost: 108, line: ['Σκέφτομαι... στα ελληνικά.', 'I am thinking... in Greek.'] }
];
const BRONZE = { driver: 1, god: 1, thinker: 1 };
function galleryNow(total) {
  let left = Math.max(0, Math.floor(+total || 0)), done = 0;
  for (let round = 0; round < 200; round++) for (let i = 0; i < STATUES.length; i++) {
    const cost = round ? 108 : STATUES[i].cost;
    if (left < cost) return { i, s: STATUES[i], strokes: left, cost, done, round, more: cost - left };
    left -= cost; done++;
  }
  return { i: 7, s: STATUES[7], strokes: 108, cost: 108, done, round: 200, more: 0 };
}
function gqRand(seed) { let x = (seed * 9301 + 49297) % 233280 || 1; return () => (x = (x * 9301 + 49297) % 233280) / 233280; }
// One statue in a 60 x 120 box: x from -30 to 30, the base at y 120. Props for its trick sit in .gq-st-x (hidden until the trick).
function statueSvg(p, k) {
  const g = svgA(p, 'g', { class: 'gq-st gq-st-' + k }), br = BRONZE[k];
  const M = br ? '#9a6b3f' : '#f1ece3', S = br ? '#6e4a2a' : '#d6ccbc', L = br ? '#b98a5a' : '#ffffff';
  const el = (t, a, q) => svgA(q || g, t, a), fill = { fill: M, stroke: S, 'stroke-width': 1 };
  const limb = (pts, w, q) => el('polyline', { points: pts, fill: 'none', stroke: M, 'stroke-width': w, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, q);
  const fold = (d, q) => el('path', { d, fill: 'none', stroke: S, 'stroke-width': 0.8 }, q);
  const x = svgA(g, 'g', { class: 'gq-st-x' });
  if (k !== 'nike' && k !== 'thinker') el('rect', { x: -15, y: 112, width: 30, height: 8, fill: S });
  if (k === 'venus') {
    const ar = svgA(x, 'g', { class: 'gq-st-arms' });
    limb('-9,24 -18,36 -24,30', 4, ar); limb('9,24 18,34 24,26', 4, ar);
    el('path', { d: 'M-9,21 Q0,18 9,21 L11,26 Q9,30 8,33 L7,50 Q0,54 -7,50 L-8,33 Q-10,30 -11,26 Z', ...fill });
    el('path', { d: 'M-9,48 Q2,56 11,46 L14,112 Q0,116 -13,112 Z', ...fill }); fold('M-4,60 L-6,110 M3,58 L4,110 M9,54 L10,108');
    el('circle', { cx: 0, cy: 12, r: 6, ...fill }); el('circle', { cx: 3, cy: 8, r: 3.2, fill: M, stroke: S });
  } else if (k === 'kouros') {
    const lg = svgA(g, 'g', { class: 'gq-st-legs' });
    limb('-3,58 -4,85 -9,111', 6, lg); limb('3,58 4,85 6,111', 6, lg);
    el('path', { d: 'M-11,20 L11,20 L8,60 L-8,60 Z', ...fill }); fold('M-6,34 Q0,37 6,34 M0,40 L0,54');
    limb('-12,22 -14,40 -13,58', 4); limb('12,22 14,40 13,58', 4);
    el('circle', { cx: 0, cy: 11, r: 6.5, ...fill }); fold('M-5,8 L5,8 M-6,11 L6,11'); el('path', { d: 'M-2.5,14 Q0,16 2.5,14', fill: 'none', stroke: S, 'stroke-width': 0.8 });
  } else if (k === 'disc') {
    limb('0,72 -12,90 -10,111', 6); limb('4,72 15,92 18,111', 6);
    el('ellipse', { cx: 0, cy: 58, rx: 9, ry: 15, transform: 'rotate(-25 0 58)', ...fill });
    limb('-3,52 -16,74', 4); const ar = svgA(g, 'g', { class: 'gq-st-throw' }); limb('5,50 22,32', 4, ar);
    el('circle', { cx: 25, cy: 28, r: 6, fill: L, stroke: S, class: 'gq-st-disc' }, ar);
    el('circle', { cx: 3, cy: 40, r: 6, ...fill });
  } else if (k === 'kore') {
    const top = svgA(g, 'g', { class: 'gq-st-roof' });
    el('rect', { x: -14, y: 0, width: 28, height: 6, ...fill }, top); el('rect', { x: -9, y: 6, width: 18, height: 4, ...fill }, top);
    el('path', { d: 'M-9,24 Q0,21 9,24 L12,112 L-12,112 Z', ...fill }); fold('M-6,40 L-8,110 M-2,40 L-3,110 M2,40 L3,110 M6,40 L8,110 M-8,34 Q0,38 8,34');
    el('circle', { cx: 0, cy: 16, r: 6, ...fill });
  } else if (k === 'nike') {
    el('path', { d: 'M-22,108 L26,108 L32,120 L-22,120 Z', fill: S });
    const wg = svgA(g, 'g', { class: 'gq-st-wings' });
    el('path', { d: 'M2,32 Q-28,0 -28,38 Q-22,50 0,44 Z', fill: L, stroke: S }, wg); fold('M-4,34 L-22,16 M-6,40 L-25,30', wg);
    el('path', { d: 'M-6,28 Q0,25 8,30 L10,60 Q14,88 20,108 L-12,108 Q-8,80 -6,60 Z', ...fill }); fold('M0,62 Q6,85 12,106 M-4,64 Q-2,86 -6,106 M4,40 Q2,50 6,58');
  } else if (k === 'driver') {
    el('path', { d: 'M-8,20 L8,20 L9,112 L-9,112 Z', ...fill }); fold('M-5,40 L-6,110 M-1,40 L-1,110 M3,40 L4,110');
    limb('6,26 14,40 22,40', 4); el('line', { x1: 22, y1: 40, x2: 30, y2: 46, stroke: S, 'stroke-width': 0.8 });
    el('circle', { cx: 0, cy: 11, r: 6, ...fill }); el('line', { x1: -6, y1: 9, x2: 6, y2: 9, stroke: L, 'stroke-width': 1.2 });
    const ch = svgA(x, 'g', { class: 'gq-st-chariot' });
    for (const hx of [20, 30]) { el('ellipse', { cx: hx, cy: 104, rx: 6, ry: 3, fill: '#7a5230' }, ch); el('line', { x1: hx - 3, y1: 106, x2: hx - 4, y2: 112, stroke: '#7a5230', 'stroke-width': 1.5 }, ch); el('line', { x1: hx + 3, y1: 106, x2: hx + 4, y2: 112, stroke: '#7a5230', 'stroke-width': 1.5 }, ch); el('circle', { cx: hx + 6, cy: 100, r: 2.2, fill: '#7a5230' }, ch); }
    el('circle', { cx: 8, cy: 108, r: 4, fill: 'none', stroke: '#7a5230', 'stroke-width': 1.5 }, ch);
  } else if (k === 'god') {
    limb('-4,56 -18,111', 6); limb('4,56 17,111', 6);
    el('path', { d: 'M-9,22 L9,22 L7,58 L-7,58 Z', ...fill });
    limb('-8,25 -30,24', 4); limb('8,25 22,18 28,10', 4);
    el('circle', { cx: 0, cy: 14, r: 6, ...fill }); el('path', { d: 'M-5,16 Q0,24 5,16', fill: S });
    const fish = svgA(x, 'g', { class: 'gq-st-fish' }); el('ellipse', { cx: 30, cy: 6, rx: 5, ry: 2.5, fill: '#6fa8c8' }, fish); el('path', { d: 'M35,6 L39,3 L39,9 Z', fill: '#6fa8c8' }, fish);
  } else if (k === 'thinker') {
    el('path', { d: 'M-22,120 L-20,82 Q0,74 22,84 L26,120 Z', fill: '#8c8577' });
    limb('-2,74 16,78 16,108', 6); limb('-6,76 10,84 8,110', 6);
    el('ellipse', { cx: -2, cy: 58, rx: 10, ry: 16, transform: 'rotate(22 -2 58)', ...fill });
    limb('4,52 10,74 9,46', 4);
    el('circle', { cx: 8, cy: 40, r: 6.5, ...fill });
    const b = svgA(x, 'g', { class: 'gq-st-bubble' });
    el('circle', { cx: 16, cy: 28, r: 1.5, fill: '#fff' }, b); el('circle', { cx: 20, cy: 20, r: 2.5, fill: '#fff' }, b);
    el('rect', { x: 2, y: -2, width: 40, height: 16, rx: 8, fill: '#fff' }, b);
    const t = el('text', { x: 22, y: 9, 'text-anchor': 'middle', 'font-size': 7, fill: '#14263f' }, b); t.textContent = 'ελληνικά;';
  }
  return g;
}
// Everything drawn under mark() becomes a tap target: the canvas keeps a list of [x0, y0, x1, y1, Greek, English].
function worldPaint(ctx, w, st, mood, t) {
  const hits = []; let tr = null;
  const R = (x, y, ww, hh, c) => { x = Math.round(x); y = Math.round(y); ctx.fillStyle = c; ctx.fillRect(x, y, ww, hh); if (tr) { tr[0] = Math.min(tr[0], x); tr[1] = Math.min(tr[1], y); tr[2] = Math.max(tr[2], x + ww); tr[3] = Math.max(tr[3], y + hh); } };
  const mark = (gr, en, fn) => { tr = [1e9, 1e9, -1e9, -1e9]; fn(); if (tr[2] > tr[0]) hits.push([...tr, gr, en]); tr = null; };
  ctx.canvas._hits = hits;
  hits.push([0, 0, W_W, 42, 'ο ουρανός', 'sky']);
  const sky = [['#141b38', '#2a3466'], ['#5a4a8a', '#e9896a'], ['#5fb4f0', '#a9ddff'], ['#4aa8f0', '#bfe6ff']][mood];
  for (let y = 0; y < 44; y++) { const k = y / 43; const a = sky[0], b = sky[1]; const mix = i => Math.round(parseInt(a.substr(i, 2), 16) * (1 - k) + parseInt(b.substr(i, 2), 16) * k); ctx.fillStyle = `rgb(${mix(1)},${mix(3)},${mix(5)})`; ctx.fillRect(0, y, W_W, 1); }
  if (mood === 0) { for (const [x, y] of [[12, 6], [40, 12], [70, 4], [101, 9], [130, 5], [150, 14], [88, 16]]) { if ((Math.floor(t * 6) + x) % 5) R(x, y, 1, 1, '#fff'); hits.push([x - 3, y - 3, x + 4, y + 4, 'το αστέρι', 'star']); } mark('το φεγγάρι', 'moon', () => { R(132, 6, 6, 6, '#f3efd1'); R(134, 6, 4, 4, '#141b38'); }); }
  else mark(mood === 1 ? 'το ηλιοβασίλεμα' : 'ο ήλιος', mood === 1 ? 'sunset' : 'sun', () => { const sy = mood === 1 ? 30 - t * 4 : 12 - t * 4, sx = mood === 1 ? 128 : 22; R(sx, sy, 8, 8, mood === 1 ? '#ffb347' : '#ffe14d'); R(sx - 1, sy + 1, 10, 6, mood === 1 ? '#ffb347' : '#ffe14d'); R(sx + 1, sy - 1, 6, 10, mood === 1 ? '#ffb347' : '#ffe14d'); });
  if (mood >= 2) for (const [x, y] of [[50, 8], [104, 14]]) mark('το σύννεφο', 'cloud', () => { const cx = x + ((t * 10) % 20); R(cx, y, 14, 3, '#fff'); R(cx + 3, y - 2, 7, 2, '#fff'); });
  const sea = w === 'village' && st.era === 2;
  if (sea) { mark('η θάλασσα', 'sea', () => { R(0, 40, 64, 16, '#2b7bb9'); for (let x = 0; x < 64; x += 8) R(x + ((t * 16) % 8), 44 + (x % 16 ? 0 : 4), 4, 1, '#8fd0ff'); }); mark('η άμμος', 'sand', () => { R(64, 40, 96, 16, '#d9c79a'); R(64, 40, 96, 2, '#bba57a'); }); }
  else { const g = w === 'gyro' ? ['#c9b89a', '#ad9c7e'] : w === 'grove' ? ['#8a6a3a', '#6f5530'] : st.era === 3 && w === 'village' ? ['#9a9a9a', '#7c7c7c'] : ['#6aa84f', '#4f8a3a'];
    const gl = w === 'gyro' ? ['το πεζοδρόμιο', 'sidewalk'] : w === 'grove' ? ['η γη', 'the ground'] : w === 'dance' ? ['η πλατεία', 'village square'] : st.era === 3 && w === 'village' ? ['ο δρόμος', 'street'] : ['το γρασίδι', 'grass'];
    mark(gl[0], gl[1], () => { R(0, 42, W_W, 14, g[0]); R(0, 42, W_W, 2, g[1]); for (let x = 3; x < W_W; x += 11) R(x, 48 + (x % 3), 2, 1, g[1]); }); }
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
    soil: (x, y) => { R(x, y - 3, 14, 3, '#5a4022'); R(x + 2, y - 5, 10, 2, '#5a4022'); R(x + 4, y - 6, 2, 1, '#7a5a32'); R(x + 9, y - 6, 2, 1, '#7a5a32'); },
    can: (x, y, t) => { R(x + 2, y - 7, 8, 7, '#8a9aa8'); R(x + 3, y - 9, 6, 2, '#8a9aa8'); R(x + 10, y - 6, 4, 1, '#8a9aa8'); R(x + 13, y - 7, 2, 1, '#8a9aa8'); for (let k = 0; k < 3; k++) R(x + 14 + k, y - 4 + ((Math.floor(t * 12) + k * 2) % 4), 1, 1, '#8fd0ff'); },
    fence: (x, y) => { for (let i = 0; i < 4; i++) R(x + i * 4, y - 7, 1, 7, '#a07a4a'); R(x, y - 6, 14, 1, '#a07a4a'); R(x, y - 3, 14, 1, '#a07a4a'); },
    net: (x, y) => { R(x - 2, y - 2, 18, 2, '#2f6a3a'); for (let i = 0; i < 18; i += 3) R(x - 2 + i, y - 3, 1, 1, '#3f8a4a'); R(x + 4, y - 4, 1, 1, '#3a2a4a'); R(x + 9, y - 3, 1, 1, '#3a2a4a'); },
    cup: (x, y) => { R(x + 2, y - 6, 6, 6, '#2f6fbf'); R(x + 1, y - 7, 8, 1, '#2f6fbf'); R(x + 3, y - 5, 4, 1, '#d8c040'); },
    // Gyro world. The cone turns (its stripes roll) and grows a little with every new piece.
    spit: (x, y, t, k) => { R(x + 6, y - 24, 1, 24, '#8a8a8a'); R(x + 14, y - 21, 2, 18, '#c0392b'); R(x + 14, y - 19 + (Math.floor(t * 8) % 3) * 5, 2, 2, '#ffb347'); const top = Math.min(12, 8 + k * 0.7); for (let r = 0; r < 17; r++) { const ww = Math.max(4, Math.round(top - r * 0.4)); R(x + 6 - ww / 2 + 0.5, y - 21 + r, ww, 1, (r + Math.floor(t * 10)) % 3 ? '#a8622c' : '#7a3f1a'); } R(x + 1, y - 3, 11, 2, '#9a9a9a'); R(x + 5, y - 1, 3, 1, '#6a6a6a'); },
    fire: (x, y, t) => { const f = Math.floor(t * 12) % 2; R(x, y - 1, 13, 1, '#555'); R(x + 2, y - 4, 9, 3, '#e0602a'); R(x + 3, y - 7 - f, 2, 3, '#f1c40f'); R(x + 6, y - 8 + f, 2, 4, '#ff8c2a'); R(x + 9, y - 6 - f, 2, 2, '#f1c40f'); },
    cook: (x, y, t) => { const wave = Math.floor(t * 6) % 2; R(x + 3, y - 18, 6, 3, '#ffffff'); R(x + 2, y - 15, 8, 1, '#ffffff'); R(x + 3, y - 14, 6, 4, '#f0c8a0'); R(x + 4, y - 12, 1, 1, '#222'); R(x + 7, y - 12, 1, 1, '#222'); R(x + 3, y - 11, 6, 1, '#3a2a1a'); R(x + 3, y - 10, 6, 6, '#ffffff'); R(x + 4, y - 9, 4, 5, '#2f6fbf'); R(x + 9, y - 10 - wave * 2, 2, 3, '#f0c8a0'); R(x + 1, y - 9, 2, 3, '#f0c8a0'); R(x + 4, y - 4, 1, 4, '#333'); R(x + 7, y - 4, 1, 4, '#333'); },
    knife: (x, y) => { R(x, y - 3, 14, 3, '#c89a5a'); R(x + 2, y - 5, 8, 2, '#d0d8e0'); R(x + 2, y - 5, 8, 1, '#ffffff'); R(x + 10, y - 5, 3, 2, '#4a2a1a'); },
    salt: (x, y) => { R(x + 4, y - 8, 5, 8, '#f4f4f4'); R(x + 4, y - 9, 5, 1, '#9a9a9a'); R(x + 5, y - 10, 3, 1, '#9a9a9a'); R(x + 5, y - 6, 1, 1, '#bbb'); R(x + 7, y - 4, 1, 1, '#bbb'); },
    pita: (x, y) => { R(x, y - 3, 14, 3, '#e8c58a'); R(x + 1, y - 4, 12, 1, '#d9b070'); R(x + 3, y - 2, 2, 1, '#a87a3a'); R(x + 8, y - 3, 2, 1, '#a87a3a'); },
    tomato: (x, y) => { R(x + 3, y - 7, 7, 7, '#d0392b'); R(x + 2, y - 6, 9, 5, '#d0392b'); R(x + 5, y - 8, 3, 1, '#2e7d32'); R(x + 4, y - 6, 2, 1, '#f08a7a'); },
    onion: (x, y) => { R(x + 3, y - 7, 7, 7, '#c99ac9'); R(x + 2, y - 6, 9, 5, '#c99ac9'); R(x + 6, y - 9, 1, 2, '#8a6a3a'); R(x + 4, y - 5, 5, 1, '#f0dcf0'); R(x + 5, y - 3, 3, 1, '#f0dcf0'); },
    fries: (x, y) => { for (const [a, h] of [[3, 5], [5, 7], [7, 6], [9, 5], [4, 4]]) R(x + a, y - 5 - h, 1, h, '#f1c40f'); R(x + 2, y - 6, 9, 6, '#c0392b'); R(x + 3, y - 4, 7, 1, '#ffffff'); },
    tzatziki: (x, y) => { R(x + 1, y - 4, 12, 4, '#2f6fbf'); R(x + 2, y - 5, 10, 1, '#f4f4f4'); R(x + 4, y - 5, 1, 1, '#2e7d32'); R(x + 8, y - 5, 1, 1, '#2e7d32'); R(x + 3, y - 3, 8, 1, '#1d4fa0'); },
    paper: (x, y) => { R(x, y - 2, 14, 2, '#f4f0e4'); R(x + 2, y - 2, 1, 2, '#2f6fbf'); R(x + 6, y - 2, 1, 2, '#2f6fbf'); R(x + 10, y - 2, 1, 2, '#2f6fbf'); },
    wrap: (x, y, t) => { const b = Math.round(Math.sin(t * 6)); R(x + 4, y - 3, 5, 3, '#f4f0e4'); R(x + 3, y - 8, 7, 5, '#f4f0e4'); R(x + 3, y - 6, 7, 1, '#2f6fbf'); R(x + 2, y - 10, 9, 2, '#e8c58a'); R(x + 3, y - 12 + b, 2, 2, '#a8622c'); R(x + 5, y - 12, 1, 3, '#f1c40f'); R(x + 7, y - 11 + b, 2, 1, '#d0392b'); R(x + 8, y - 12, 1, 2, '#f4f4f4'); },
    plate: (x, y) => { R(x, y - 2, 15, 2, '#ffffff'); R(x + 1, y - 3, 13, 1, '#e0e0e0'); R(x + 2, y - 5, 5, 2, '#a8622c'); R(x + 7, y - 5, 4, 2, '#f1c40f'); R(x + 11, y - 4, 2, 1, '#d0392b'); R(x + 4, y - 6, 3, 1, '#f4f4f4'); },
    fork: (x, y) => { R(x + 6, y - 7, 1, 7, '#b8c0c8'); R(x + 4, y - 8, 5, 1, '#b8c0c8'); R(x + 4, y - 11, 1, 3, '#b8c0c8'); R(x + 6, y - 11, 1, 3, '#b8c0c8'); R(x + 8, y - 11, 1, 3, '#b8c0c8'); },
    water: (x, y) => { R(x + 3, y - 9, 7, 9, '#cfe8ff'); R(x + 4, y - 6, 5, 5, '#6fb4f0'); R(x + 4, y - 8, 1, 6, '#ffffff'); },
    shop: (x, y, t) => { R(x - 2, y - 20, 20, 20, '#f4f0e4'); for (let i = 0; i < 5; i++) R(x - 3 + i * 4, y - 23, 4, 3, i % 2 ? '#ffffff' : '#2f6fbf'); R(x, y - 17, 8, 7, lit); R(x + 3, y - 16, 1, 6, '#8a8a8a'); R(x + 2, y - 15, 3, 4, (Math.floor(t * 10) % 2) ? '#a8622c' : '#7a3f1a'); R(x + 11, y - 12, 5, 12, '#6b4a2a'); R(x + 14, y - 6, 1, 1, '#e0b030'); },
    chair: (x, y) => { R(x + 3, y - 12, 1, 12, '#6b4a2a'); R(x + 3, y - 6, 8, 2, '#c89a5a'); R(x + 10, y - 4, 1, 4, '#6b4a2a'); R(x + 3, y - 11, 1, 4, '#2f6fbf'); },
    customer: (x, y, t) => { const bite = Math.floor(t * 4) % 2; R(x + 3, y - 15, 5, 5, '#e0a878'); R(x + 3, y - 16, 5, 2, '#3a2a1a'); R(x + 4, y - 13, 1, 1, '#222'); R(x + 6, y - 13, 1, 1, '#222'); R(x + 2, y - 10, 7, 6, '#2e7d32'); R(x + 3, y - 4, 1, 4, '#333'); R(x + 7, y - 4, 1, 4, '#333'); R(x + 8, y - 12 + bite, 3, 4, '#f4f0e4'); R(x + 8, y - 13 + bite, 3, 1, '#a8622c'); },
    menu: (x, y) => { R(x + 2, y - 14, 10, 11, '#2a2a2a'); R(x + 1, y - 15, 12, 1, '#8a5a2a'); for (let r = 0; r < 4; r++) R(x + 4, y - 12 + r * 2, 4 + (r % 2) * 2, 1, '#f4f4f4'); R(x + 3, y - 3, 1, 3, '#8a5a2a'); R(x + 10, y - 3, 1, 3, '#8a5a2a'); },
    scooter: (x, y, t) => { const sx = Math.round(170 - ((t * 70) % 200)); R(sx + 2, y - 5, 12, 3, '#c0392b'); R(sx, y - 9, 2, 5, '#8a8a8a'); R(sx + 9, y - 12, 6, 6, '#f1c40f'); R(sx + 5, y - 13, 3, 4, '#2f6fbf'); R(sx + 5, y - 15, 3, 2, '#ffffff'); R(sx + 1, y - 2, 3, 2, '#222'); R(sx + 11, y - 2, 3, 2, '#222'); },
    bottle: (x, y) => { R(x + 2, y - 9, 4, 9, '#5f7f1f'); R(x + 3, y - 12, 2, 3, '#5f7f1f'); R(x + 3, y - 13, 2, 1, '#c0392b'); R(x + 2, y - 6, 4, 2, '#f4f0e4'); },
  };
  if (w === 'pet') { petPaint(R, st, mood, t, mark, hits); return; }
  const items = WORLDS[w].eras[st.era].items.slice(0, st.n), slots = sea ? [70, 90, 110, 130, 76, 120] : [8, 32, 56, 82, 106, 132];
  items.forEach(([kind], i) => {
    const appear = Math.min(1, Math.max(0, (t - i * 0.08) * 5)); if (appear <= 0) return;
    const isNew = i === items.length - 1, hop = isNew ? -Math.round(Math.abs(Math.sin(Math.min(1, t * 1.6) * Math.PI * 2)) * 4 * (1 - Math.min(1, t))) : 0;
    let x = slots[i]; if (sea && kind === 'boat') x = i * 13 + 4;
    ctx.globalAlpha = appear; mark(items[i][1], WORLD_EN[items[i][1]] || '', () => D[kind](x, 44 + hop, t, st.n)); ctx.globalAlpha = 1;
    if (isNew && t > 0.4 && t < 0.9 && Math.floor(t * 20) % 2) { R(x + 6, 20 + hop, 1, 1, '#fff'); R(x + 2, 24, 1, 1, '#fff'); R(x + 11, 23, 1, 1, '#fff'); }
  });
  // A walker crosses, like the map in old console games.
  if (mood >= 1) mark('ο περαστικός', 'passer-by', () => { const px = Math.round(-6 + t * 172) % 172, leg = Math.floor(t * 12) % 2; R(px, 37, 3, 3, '#f0c8a0'); R(px, 40, 3, 4, w === 'grove' ? '#2f6fbf' : '#c0392b'); R(px + (leg ? 0 : 2), 44, 1, 2, '#333'); });
  if (mood === 3) hits.push([0, 0, W_W, 40, 'η γιορτή', 'celebration']);
  if (mood === 3) for (let k = 0; k < 18; k++) { const cx = (k * 37 + t * 40) % W_W, cy = (k * 13 + t * 50) % 40; R(cx, cy, 2, 1, ['#e74c3c', '#f1c40f', '#2ecc71', '#3498db', '#fff'][k % 5]); }
}
function petPaint(R, st, mood, t, mark, hits) {
  const cx = 80, base = 44;
  if (st.f === 0) { hits.push([cx - 8, base - 16, cx + 8, base + 1, 'το αυγό', 'egg']); const wob = Math.round(Math.sin(t * 20) * (t < 0.6 ? 1 : 0)); R(cx - 5 + wob, base - 14, 10, 14, '#fbf4e0'); R(cx - 6 + wob, base - 10, 12, 8, '#fbf4e0'); R(cx - 3 + wob, base - 9, 2, 2, '#e0b030'); R(cx + 2 + wob, base - 5, 2, 2, '#e0b030'); return; }
  const s = 1 + st.era * 0.35, hop = mood >= 2 ? Math.round(Math.abs(Math.sin(t * Math.PI * (mood === 3 ? 6 : 3))) * 5) : 0;
  const W = Math.round(14 * s), H = Math.round(12 * s), x = cx - W / 2, y = base - H - hop, fur = '#f2a65a', ear = '#d9823a';
  R(cx - W / 2 + 2, base, W - 4, 2, 'rgba(0,0,0,0.2)');
  hits.push([x - 1, y - 3, x + W + 5, base, 'το Φοράκι', 'Foraki, your pet']);
  R(x, y + 2, W, H - 2, fur); R(x + 1, y + 1, W - 2, 1, fur); R(x + 1, y - 2, 3, 3, ear); R(x + W - 4, y - 2, 3, 3, ear);
  R(x + 3, y + H - 4, W - 6, 3, '#fbe0c0');
  const blink = Math.floor(t * 10) % 9 === 0, ey = y + Math.round(H * 0.35);
  if (mood === 0 || blink) { R(x + 3, ey + 1, 3, 1, '#222'); R(x + W - 6, ey + 1, 3, 1, '#222'); }
  else { R(x + 3, ey, 2, 3, '#222'); R(x + W - 5, ey, 2, 3, '#222'); R(x + 3, ey, 1, 1, '#fff'); R(x + W - 5, ey, 1, 1, '#fff'); }
  R(cx - 1, ey + 3, 2, 1, mood >= 2 ? '#c0392b' : '#8a4a2a');
  R(x + 1, ey + 4, 2, 1, '#f08a8a'); R(x + W - 3, ey + 4, 2, 1, '#f08a8a');
  R(x + W, y + H - 6 + Math.round(Math.sin(t * 8)), 4, 2, fur);
  if (st.era === 2) mark('το καπέλο', 'hat', () => { R(cx - 3, y - 4, 6, 2, '#2f6fbf'); R(cx - 1, y - 6, 2, 2, '#2f6fbf'); });
  if (st.era >= 3) mark('το στέμμα', 'crown', () => { R(cx - 4, y - 8, 8, 2, '#e0b030'); R(cx - 4, y - 10, 2, 2, '#e0b030'); R(cx - 1, y - 11, 2, 3, '#e0b030'); R(cx + 2, y - 10, 2, 2, '#e0b030'); });
  if (mood === 0) for (let k = 0; k < 3; k++) { const zy = y - 6 - k * 5 - Math.round(t * 4); R(x + W + 3 + k * 3, zy, 3, 1, '#fff'); R(x + W + 5 + k * 3, zy + 1, 1, 1, '#fff'); R(x + W + 3 + k * 3, zy + 2, 3, 1, '#fff'); }
  if (mood === 3) for (let k = 0; k < 3; k++) { const ny = 20 - ((t * 30 + k * 10) % 18); R(30 + k * 40, ny, 2, 2, '#fff'); R(32 + k * 40, ny - 4, 1, 5, '#fff'); }
  // toys appear as the pet grows
  const toys = Math.min(5, Math.floor(st.f * 20));
  for (let k = 0; k < toys; k++) { const tx = [20, 130, 40, 112, 145][k]; mark('το παιχνίδι', 'toy', () => R(tx, base - 4, 4, 4, ['#e74c3c', '#3498db', '#f1c40f', '#9b59b6', '#2ecc71'][k])); }
  if (mood === 0) hits.push([x + W, y - 20, x + W + 14, y, 'κοιμάται', 'it is sleeping']);
}

// The piece of the world under a tap: the smallest target within 3 pixels, so a star or a cloud wins over the sky.
function worldHit(cv, e) {
  const hs = cv._hits; if (!hs || !hs.length || !e || e.clientX == null) return null;
  const r = cv.getBoundingClientRect(); if (!r.width) return null;
  const x = (e.clientX - r.left) * W_W / r.width, y = (e.clientY - r.top) * W_H / r.height;
  let best = null, area = 1e9;
  for (const h of hs) { if (x < h[0] - 3 || x > h[2] + 3 || y < h[1] - 3 || y > h[3] + 3) continue; const a = (h[2] - h[0]) * (h[3] - h[1]); if (a < area) { area = a; best = h; } }
  return best;
}
// Until the first tap, a quiet line says the picture can be touched.
function worldTip(el) { let seen = '1'; try { seen = localStorage.getItem('gq-world-tap'); } catch (x) {} if (!seen) { el.setText('Tap a Greek word to hear it.'); el.removeAttribute('lang'); } }

class PaperModal extends Modal {
  constructor(app, plugin, list) { super(app); this.plugin = plugin; this.list = list; this.i = 0; this.got = 0; this.miss = []; }
  onOpen() { this.contentEl.addClass('gq-modal', 'gq-paper-m'); this.titleEl.setText('Card practice'); this.draw(); }
  draw() {
    const c = this.contentEl; c.empty(); const P = this.plugin;
    if (this.i >= this.list.length) {
      P.paperDone = ymd(new Date()); P.progressFile().then(f => this.app.fileManager.processFrontMatter(f, fm => { fm.paper_done = P.paperDone; }));
      c.createDiv({ cls: 'gq-paper-big', text: this.got ? `${this.got} of ${this.list.length}` : 'Done' });
      c.createDiv({ cls: 'gq-hint', text: this.miss.length ? `Put these back in the red pile: ${this.miss.join(', ')}.` : 'Every card came back. Cards you did not move up stay in their pile.' });
      const b = c.createEl('button', { text: 'Close', cls: 'mod-cta' }); b.onclick = () => this.close(); return;
    }
    const [w, pile] = this.list[this.i];
    c.createDiv({ cls: 'gq-hint', text: `Card ${this.i + 1} of ${this.list.length} · ${pile} pile` });
    const t = c.createDiv({ cls: 'gq-paper-big gq-say', text: w, attr: { lang: 'el', role: 'button', 'aria-label': 'Hear it' } }); t.onclick = () => say(w);
    const hint = c.createDiv({ cls: 'gq-hint', text: 'Find this card, say the other side out loud, then flip it.' });
    const row = c.createDiv('gq-row gq-paper-btns');
    const g = row.createEl('button', { text: 'Got it', cls: 'gq-c gq-green' }); g.onclick = () => {
      P.moAdd('recall', w); this.got++;
      // Keep the card and the app in step: a card that came back can move up a pile.
      const UP = { '': 'yellow', red: 'yellow', yellow: 'green' }, now = P.colorOf(w) || '', to = UP[now];
      if (!to) { this.next(); return; }
      hint.setText(`Got it. Move this card up to the ${to} pile?`); row.empty(); const sk = c.querySelector('.gq-paper-skip'); if (sk) sk.remove();
      const up = row.createEl('button', { text: `Move up to ${to}`, cls: 'gq-c gq-' + to }); up.onclick = () => { P.setColor(w, to); this.next(); };
      const st = row.createEl('button', { text: `Keep it in ${now || 'red'}` }); st.onclick = () => this.next();
    };
    const n = row.createEl('button', { text: 'Not yet', cls: 'gq-c gq-red' }); n.onclick = () => { this.miss.push(w); if (P.colorOf(w) && P.colorOf(w) !== 'red') P.setColor(w, 'red'); this.next(); };
    const s = row.createEl('button', { text: 'Not in my stack', attr: { title: 'This card is not in your piles yet. Skip it, nothing changes.' } }); s.onclick = () => this.next();
    c.createDiv({ cls: 'gq-hint gq-paper-skip', text: 'Not in my stack: you haven\'t made this card yet, or it\'s somewhere else. Skipping changes nothing.' });
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
    this.input = c.createEl('input', { type: 'text', attr: { placeholder: 'A word, what you mean, or a Greek sentence', autocapitalize: 'off', autocomplete: 'off', spellcheck: 'false' } });
    this.input.addClass('gq-input');
    const row = c.createDiv('gq-row');
    const lab = row.createEl('label'); this.guess = lab.createEl('input', { type: 'checkbox' }); lab.appendText(' Guess first (hide the answer until I try)');
    this.guess.checked = !!this.plugin.guessFirst;
    this.guess.onchange = () => { this.plugin.guessFirst = this.guess.checked; this.render(); };
    this.list = c.createDiv('gq-results');
    this.input.oninput = () => this.render();
    this.input.onkeydown = e => {
      if (e.key !== 'Enter') return;
      const b = this.list.querySelector('.gq-hit-text.gq-open'); if (b) { b.click(); return; }
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
    const close = this.plugin.isKids ? [] : this.plugin.closeWords(q);
    if (!hits.length && !close.length) L.createDiv({ cls: 'gq-hint', text: 'Not in the 1,500.' });
    close.forEach((c, i) => this.plugin.closeSet(L, c, i === 0, w => { this.plugin.logLookup(q, w); this.close(); this.plugin.openGraph(w.path); }, w => { this.plugin.logLookup(q, w); this.close(); this.plugin.openCard(w); }));
    if (close.length && !hits.length) return;   // a Greek sentence: the close words are the answer
    if (/[*_…]/.test(q)) { if (!hits.length) L.empty(), L.createDiv({ cls: 'gq-hint', text: 'No word in the 1,500 has those letters.' }); return; }
    this.bonus = L.createDiv('gq-bonus');
    if (hits.length && hits[0].score >= 50) {
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
    this.plugin.bonusShow(box, q, tr, save, w => { this.close(); this.plugin.openCard(w); });
  }
  fill(row, w, q) {
    const t = row.createDiv('gq-hit-text');
    const m = t.createDiv({ cls: 'gq-hit-main' }); const c = this.plugin.colorOf(w.word); m.createSpan({ cls: 'gq-dot gq-' + (c || 'new'), attr: { 'aria-label': c ? c + ' word' : 'new word' } }); m.appendText(`${w.word}  ·  ${w.english}`);
    t.createDiv({ cls: 'gq-hit-sub', text: [w.pron ? 'say it: ' + w.pron : '', this.plugin.isKids ? '' : '#' + w.rank + ' of 1,500', w.form ? 'form: ' + w.form : ''].filter(Boolean).join('  ·  ') });
    if (w.cognates) t.createDiv({ cls: 'gq-hit-sub', text: `English cognates: ${w.cognates}${w.via ? '  (you typed a cousin: ' + w.via + ')' : ''}` });
    // A tap anywhere on the word opens its card. Word web is the smaller, second choice.
    t.addClass('gq-open'); t.onclick = () => { if (q) this.plugin.logLookup(q, w); this.close(); this.plugin.openCard(w); };
    const g = row.createEl('button', { text: 'Word web', cls: 'gq-mini' });
    g.onclick = e => { e.stopPropagation(); if (q) this.plugin.logLookup(q, w); this.close(); this.plugin.openGraph(w.path); };
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
    const c = this.contentEl; c.addClass('gq-modal'); this.titleEl.setText('Ask the class');
    const head = this.plugin.askHeader(this.file);
    c.createDiv({ cls: 'gq-hit-main', text: head });
    this.box = c.createEl('textarea', { attr: { rows: 4, placeholder: 'Your question (English or Greek)' } }); this.box.addClass('gq-input');
    const row = c.createDiv('gq-row');
    const send = row.createEl('button', { text: 'Share to GroupMe', cls: 'mod-cta' });
    send.onclick = async () => { this.plugin.moAdd('did', 'ask', 2); await this.plugin.shareQuestion(head + '\n' + this.box.value.trim() + (this.file ? '\n' + this.plugin.noteUrl(this.file) : '')); this.close(); };
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
    this.head = this.plugin.askHeader(this.file).replace(/^Question about/, 'Video question about').replace(/^Question for/, 'Video question for');
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
    const text = [this.head, q, `${name || 'A student'} · public library: ${yn(this.pub.checked)} · promo: ${yn(this.promo.checked)}`, this.file ? this.plugin.noteUrl(this.file) : ''].filter(Boolean).join('\n');
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
// App review (teacher only): each area scored against what the leading language apps do. 100% matches them, more than 100% goes further.
const GQ_REVIEW = [{"k": "first", "t": "The first minute", "p": 80, "at": ["next"], "lead": "Leaders get you learning within about a minute and ask two things first: your level and how much you want to do each week.", "src": [["Words on Repeat", "https://wordsonrepeat.com/blog/anki-vs-memrise"], ["Babbel", "https://www.babbel.com/how-babbel-works"]], "you": "The tour starts at once, rewards trying things, and Today shows one card. Nothing asks how much time the student has.", "move": "Ask one question on first open: 5, 10 or 15 minutes a day? Use the answer to size Next."}, {"k": "next", "t": "One clear next step", "p": 100, "at": ["next"], "lead": "Babbel lessons average about 6 minutes, each around one real situation.", "src": [["Babbel", "https://www.babbel.com/how-babbel-works"]], "you": "Today shows one big card with how long it takes, and Next up brings in the step after it.", "move": "Keep it this way. Any new feature goes behind Do something else, never onto Today."}, {"k": "habit", "t": "Coming back every day", "p": 55, "at": ["next"], "lead": "Learners on a 7-day streak are 2.4 times more likely to come back the next day. Letting a missed day not count raised daily learners.", "src": [["Duolingo blog", "https://blog.duolingo.com/improving-the-streak/"], ["Duolingo on streak freezes", "https://blog.duolingo.com/how-duolingo-streak-builds-habit/"], ["streak research summary", "https://www.shahzebspeaks.com/brand-psychology-audits/duolingo-psychology-audit-the-owl-the-streak-and-the-price-of-guilt/"]], "you": "Next shows a quiet line: \"This week: 3 of 5 days.\" It counts weekly, nothing resets, and a missed day never counts against anyone. There is no daily nudge yet beyond Pick your moment.", "move": "Keep it quiet. If the weekly line holds attendance, add a gentle Tuesday GroupMe check-in rather than app notifications."}, {"k": "review", "t": "Bringing words back", "p": 95, "at": ["next"], "lead": "Leaders schedule reviews automatically. Spacing out recall clearly beats cramming (effect size g = 0.74).", "src": [["Babbel", "https://www.babbel.com/how-babbel-works"], ["Latimier et al. meta-analysis", "https://link.springer.com/article/10.1007/s10648-020-09572-8"]], "you": "Spaced review now brings back story lines and red and yellow words at 1, 3 and 7 days, then weekly. Green words come back once after a month. A miss starts the word over.", "move": "Watch the 7-day recall number in the report. If it stays under 70%, shorten the gaps."}, {"k": "scenes", "t": "Real scenes", "p": 110, "at": ["story"], "lead": "Babbel builds lessons around real-life situations. Memrise lets you choose your scenarios.", "src": [["Babbel", "https://www.babbel.com/how-babbel-works"], ["Memrise", "https://www.memrise.com/en/learn-spanish/spanish-course"]], "you": "Every one of the 1,500 words is tied to a scene, a story line and a weekly plan. That is frequency and context together, which neither does.", "move": "Let students choose which scene comes next. That gives them freedom without leaving the 1,500."}, {"k": "speak", "t": "Speaking out loud", "p": 90, "at": ["story"], "lead": "Duolingo now lets learners speak almost every answer. Babbel has you listen to a dialogue and then say one part.", "src": [["Duolingo Q1 2026 letter", "https://www.sec.gov/Archives/edgar/data/1562088/000162828026029790/q1fy26duolingo3-31x26share.htm"], ["Babbel support", "https://support.babbel.com/hc/en-us/articles/19188554247186-Guided-Conversations"]], "you": "The story puzzle checks spoken lines. Two new checks sit behind the die: Repeat after me (lines get longer) and a One-minute talk that counts words.", "move": "Add a two-voice mode to the story: the phone reads one character and the student says the other."}, {"k": "voices", "t": "Real voices", "p": 40, "at": ["story"], "lead": "Memrise is built around native speakers: every word comes with a real person saying it.", "src": [["Memrise", "https://www.memrise.com/en-us/"]], "you": "The phone voice reads everything, and the video questions library holds a few real clips.", "move": "Record the 100 most frequent words in your own voice, 2 to 3 seconds each. Play those where they exist and the phone voice everywhere else."}, {"k": "people", "t": "Learning with people", "p": 90, "at": ["tab-class"], "lead": "Learners with a Friend Streak are 22% more likely to finish their daily lesson.", "src": [["Duolingo blog", "https://blog.duolingo.com/product-lessons-friend-streak/"]], "you": "Ask the Class, video questions, GroupMe and a real teacher every Tuesday. Most apps cannot offer a teacher.", "move": "Pair students as practice buddies in GroupMe each month, with no new app needed."}, {"k": "progress", "t": "Seeing progress", "p": 110, "at": ["tab-words"], "lead": "Memrise tracks each word as learned, heard or used.", "src": [["Memrise", "https://www.memrise.com/en-us/"]], "you": "Every word is red, yellow or green, Words shows green out of 1,500, and every two weeks a report card shows the student's own numbers to beat: recall after a week, longest line said back, words in a minute, green words and hours.", "move": "Bring the report numbers to the quarterly speaking check so the app numbers sit next to a real conversation rating."}, {"k": "free", "t": "Free and everywhere", "p": 120, "at": [], "lead": "Leaders are freemium: Duolingo has ads and limits, and Memrise keeps most native-speaker videos behind Pro.", "src": [["Duolingo Q1 2026 letter", "https://www.sec.gov/Archives/edgar/data/1562088/000162828026029790/q1fy26duolingo3-31x26share.htm"], ["Memrise", "https://www.memrise.com/en-us/"]], "you": "Free, no ads, the same on Android and iPhone, works offline, and also in Obsidian.", "move": "Say this in the ads. It is the clearest edge over every leader."}];
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
    // The phone's own look (see styles.css, "Calm glass"): the web app sets this in its first line; in Obsidian, Platform says.
    try { const d = document.documentElement; if (!d.dataset.os) d.dataset.os = Platform.isIosApp ? 'ios' : Platform.isAndroidApp ? 'android' : 'other'; } catch (e) {}
    window.gqNoVoice = () => this.voiceHelp(true);
    try { if ((speechSynthesis.getVoices() || []).length) gqVoicesSeen = true; speechSynthesis.addEventListener('voiceschanged', () => { sayVoice = null; if ((speechSynthesis.getVoices() || []).length) gqVoicesSeen = true; }); } catch (e) {}
    // Coming back to the app (Android keeps it in the background): clear a stuck voice so the next tap speaks.
    this.registerDomEvent(document, 'visibilitychange', () => { if (document.visibilityState === 'visible') try { const ss = window.speechSynthesis; if (ss && (ss.speaking || ss.pending) && !(sayU && sayLast && sayLast.ok)) ss.cancel(); if (ss) ss.resume(); } catch (e) {} });
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
      if (d && d.gq === 'novoice') { this.voiceHelp(true); return; }
      // Today's scene has played in Story Lines: the day goes on to the words, back on Today.
      if (d && d.gq === 'scene' && Number.isInteger(d.d) && !d.week) {
        try { window.localStorage.setItem('gq-convo-' + this.app.vault.getName() + '-' + d.d + '-s', '1'); } catch (er) {}
        const w = this.sceneWait; if (w && w.n === d.d) { this.sceneWait = null; w.go(); setTimeout(() => this.openToday(), 1500); }
        return;
      }
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
    this.addCommand({ id: 'send-homework', name: 'Send homework', callback: () => this.sendHomework() });
    this.addCommand({ id: 'update-vault', name: 'Update vault', callback: () => this.updateVault(false) });
    this.addCommand({ id: 'resources', name: 'Resources: verb tables and more', callback: () => this.resourcesPop() });
    this.addCommand({ id: 'look-up-word', name: 'Look up a word', callback: () => new LookupModal(this.app, this).open() });
    this.addCommand({ id: 'ask-group', name: 'Ask the class', callback: () => this.ask() });
    this.addCommand({ id: 'ask-video', name: 'Ask on video about this note', callback: () => this.askVideo() });
    // Today page, word color bar, and misses sent back from the games.
    this.registerMarkdownCodeBlockProcessor('greekquent-today', (src, el, ctx) => { this.todayEls.add(el); this.renderToday(el); });
    this.registerMarkdownPostProcessor((el, ctx) => this.wordBar(el, ctx));
    this.registerMarkdownPostProcessor((el, ctx) => this.cardBox(el, ctx));
    this.registerMarkdownPostProcessor((el, ctx) => this.bookUnits(el, ctx));
    this.registerMarkdownPostProcessor((el, ctx) => this.sideHide(el, ctx));
    this.registerMarkdownPostProcessor((el, ctx) => this.lessonTop(el, ctx));
    this.registerMarkdownPostProcessor((el, ctx) => this.stackTables(el, ctx));
    this.addCommand({ id: 'more-on-page', name: 'Side panel', callback: () => this.showMore() });
    this.addCommand({ id: 'add-to-card', name: 'Add a chunk or sentence to this word', callback: () => { const f = this.app.workspace.getActiveFile(); if (!f || !f.path.startsWith('Words/')) { new Notice('Open a word note first.'); return; } new CardModal(this.app, this, f.basename).open(); } });
    this.registerObsidianProtocolHandler('greekquent', p => p.open === 'build' ? this.popBuild() : p.open ? this.openApp(p.open, p.hash || '') : this.fromGame(p));
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
    this.app.workspace.onLayoutReady(() => this.applyPh());
    this.registerEvent(this.app.metadataCache.on('changed', f => { if (f && f.path === PROGRESS && this.phNow === undefined) this.applyPh(); }));
    // Student questions: video questions and answers from the public library, shown at the end of the matching note.
    this.registerMarkdownPostProcessor((el, ctx) => this.questionsBox(el, ctx));
    this.registerMarkdownCodeBlockProcessor('greekquent-questions', (src, el) => this.questionsIndex(el));
    // Classroom Greek and other phrase lists: one line per phrase, "Greek | English | gesture", each with a Hear button.
    this.registerMarkdownCodeBlockProcessor('greekquent-say', (src, el) => this.sayList(el, src));
    this.registerMarkdownCodeBlockProcessor('greekquent-heatmap', (src, el) => this.heatMap(el));
    this.registerEvent(this.app.metadataCache.on('changed', f => { if (f.path.startsWith('Words/')) { this.words = null; this.chunkP = null; } if (f.path.startsWith('Fluent in a Year/')) this.beats = null; }));
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
      setTimeout(() => this.classInit(), 1500);
      const revHash = () => { if (/review/.test(location.hash || '')) { try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {} this.reviewStart(); } };
      setTimeout(revHash, 2500); this.registerDomEvent(window, 'hashchange', revHash);
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
  // Today's new words as a way in to Word web and Build a sentence (the Build step and the Fluent in a Year card).
  // A verb builds the most, so it goes first. No verb today: a word that pairs with a verb brings that verb in
  // (σπίτι opens πάω with σπίτι picked). Little words like και open their own ready-made chunks.
  async wordPlay(el, nw) {
    const r = el.createDiv('gq-row gq-cv-play');
    const ws = (nw || []).map(w => w.word).filter(w => w && this.app.vault.getAbstractFileByPath('Words/' + w + '.md'));
    if (!ws.length) { r.remove(); return; }
    const d = await this.pairData();
    // Everyday verbs first (want, like, have, go…), then the rest most common first.
    const EASY = ['θέλω', 'μου αρέσει', 'έχω', 'πάω', 'είμαι', 'κάνω', 'μπορώ', 'τρώω', 'πίνω', 'ξέρω', 'βλέπω', 'λέω', 'αγαπάω', 'ψάχνω', 'περιμένω'];
    const vr = this.verbRank || (this.verbRank = new Map(Object.keys(d.v).map((v, k) => [v, EASY.includes(v) ? EASY.indexOf(v) : 100 + k])));
    // Each word gets its way in: a verb opens itself; another word brings a verb, today's verb if it fits, else the easiest.
    const dayV = ws.filter(w => d.v[w]);
    const plan = ws.map(w => {
      if (d.v[w]) return { w, rank: -2 };
      let fed = null; for (const l of ((d.x[w] && d.x[w].l) || [])) { if (!d.v[l[0]]) continue; const rk = dayV.includes(l[0]) ? -1 : vr.get(l[0]); if (!fed || rk < fed.rk) fed = { l, rk }; }
      return { w, fed: fed && fed.l, rank: fed ? fed.rk : 9999 };
    }).sort((x, y) => x.rank - y.rank);
    // After the first one, the next word is offered: played words are remembered for today's set, on this phone only.
    const key = ws.join('|'); if (!this.playDone || this.playDone.key !== key) this.playDone = { key, set: new Set() };
    const done = this.playDone.set;
    const paint = () => {
      r.empty();
      const left = plan.filter(p => !done.has(p.w)), p = left[0] || plan[0], more = done.size > 0;
      r.createSpan({ cls: 'gq-hint', text: !left.length ? 'Played with all of them. Again with ' : more ? 'Now play with ' : 'Play with ' }); r.createSpan({ cls: 'gq-cv-playw', text: p.w, attr: { lang: 'el' } });
      const played = () => { done.add(p.w); setTimeout(paint, 300); };
      r.createEl('button', { text: 'Word web', cls: 'gq-mini' }).onclick = () => { played(); this.openGraph('Words/' + p.w + '.md'); };
      const [fv, fk, fi] = p.fed || [];
      r.createEl('button', { text: p.fed ? `Build a sentence with ${fv}` : 'Build a sentence', cls: 'gq-mini', attr: { lang: p.fed ? 'el' : 'en' } }).onclick = () => { played(); p.fed ? this.openPair(fv, [fk, fi]) : this.openPair(p.w); };
      if (!left.length) done.clear();
    };
    paint();
  }
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
    const names = { giagia: 'the Γιαγιά game', buzzer: 'the buzzer game', cousins: 'the cousins game', hello: 'Τι λέμε;', story: 'the story cartoon', storylines: 'Story Lines', crossword: 'the crossword' };
    // The crossword uses the words the student has met: story days so far plus any colored word.
    if (which === 'crossword' && !hash) hash = '#w=' + encodeURIComponent((await this.metWords()).join(','));
    if (names[which]) this.whereSet({ kind: 'app', app: which, hash: hash || '', label: names[which] });
    await leaf.setViewState({ type: APPV, active: true, state: { app: which, hash: hash || '' } });
    ws.revealLeaf(leaf);
  }
  async metWords() {
    const col = this.colors(), beats = await this.beatIndex(), at = Math.max(col.story_at || 0, 1), out = new Set([...col.red, ...col.yellow, ...col.green]);
    for (const b of Object.values(beats)) if (b.n <= at + 1) for (const w of b.words || []) out.add(w.word);
    return [...out];
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
    const w = this.wordInfo(path), obj = this.caseObj;
    if (w.g) return obj ? accNoun(w.noun, w.g) : w.noun;
    if (w.changes && g) { const f = agree(w.name, g) || w.name; return obj ? accWord(f, g) : f; }
    return w.name;
  }
  // A short phrase for a describing word with a noun: μεγάλο σπίτι, ένα σπίτι, αυτό το σπίτι, το σπίτι.
  agreePhrase(adj, noun) {
    const a = this.wordInfo(adj), n = this.wordInfo(noun); if (!n.g) return '';
    let form = agree(a.name, n.g); if (!form) return '';
    const obj = this.caseObj, full = obj ? accNoun(n.noun, n.g) : n.noun, bare = full.replace(/^(τον|την|τη|ο|η|το) /, '');
    if (a.name === 'ο, η, το') return full;
    if (obj) form = accWord(form, n.g, AGREE_BEFORE_ARTICLE.has(a.name) ? full : bare);
    if (AGREE_BEFORE_ARTICLE.has(a.name)) return form + ' ' + full;
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
  paintAgree(leaf, path) { const st = this.graphState(leaf); if (st.agree) this.paintAgreeBox(st.agree, path, () => { this.setGraphLabels(leaf, path); this.paintAgree(leaf, path); this.paintSpark(leaf, path); }); }
  // onFlip: redraw the labels after the object switch changes.
  paintAgreeBox(box, path, onFlip) {
    box.empty(); box.hide();
    const c = this.wordInfo(path), links = Object.keys((this.app.metadataCache.resolvedLinks || {})[path] || {}).filter(p => p.startsWith('Words/') && p !== path);
    const obj = this.caseObj; let head = '', items = [];
    if (c.g) { head = (obj ? 'After a verb, with ' : 'Agrees with ') + this.agreeLabel(path, c.g) + ':'; items = links.filter(p => this.wordInfo(p).changes).map(p => this.agreePhrase(p, path)); }
    else if (c.changes) { head = c.name + (obj ? ' after a verb:' : ' changes with the noun:'); items = links.filter(p => this.wordInfo(p).g).map(p => this.agreePhrase(path, p)); }
    items = [...new Set(items.filter(Boolean))].slice(0, 8);
    // The object switch: ο καφές ↔ τον καφέ. Shown for words that change (not neuter nouns, which look the same).
    const flips = onFlip && (c.g === 'm' || c.g === 'f' || (c.changes && items.length));
    if (!items.length && !flips) return;
    box.show();
    if (flips) {
      const ex = c.g ? [c.noun, accNoun(c.noun, c.g)] : ['ο καφές', 'τον καφέ'];
      const seg = box.createDiv({ cls: 'gq-seg gq-caseseg', attr: { role: 'group', 'aria-label': 'Who does it, or what gets it' } });
      [[false, ex[0]], [true, ex[1]]].forEach(([v, t]) => { const b = seg.createEl('button', { text: t, cls: obj === v ? 'is-on' : '', attr: { lang: 'el', 'aria-pressed': String(obj === v) } }); b.onclick = () => { if (this.caseObj !== v) { this.caseObj = v; this.moAdd('try', 'case:' + (v ? 'obj' : 'subj')); } say(t); onFlip(); }; });
      if (obj) box.createDiv({ cls: 'gq-hint gq-casehint', text: 'After a verb the word changes: Θέλω τον καφέ. Βλέπω την πόλη. Το σπίτι stays the same.' });
    }
    if (!items.length) return;
    box.createSpan({ cls: 'gq-agree-t', text: head });
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
      const askb = bar.createEl('button', { text: 'Ask', attr: { 'aria-label': 'Ask the class about this word' } });
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
        w.k = fold(w.word); w.e = fold(w.english.replace(/[()"]/g, ' ')); w.c = w.cognates.toLowerCase().split(/,\s*/).map(x => x.replace(/-$/, '')).filter(Boolean); w.fk = [...new Set(w.forms.map(fold))]; w.s = sndG(w.word); w.fs = [...new Set(w.forms.map(sndG))];
        out.push(w);
      }
      out.sort((a, b) => a.rank - b.rank);
      this.words = out; this.indexing = null; return out;
    })();
    return this.indexing;
  }
  // One set of close words: each word, its English, and how it differs. Tap a word to hear it.
  closeSet(L, c, open, onWeb, onCard) {
    onCard = onCard || (w => this.openCard(w));
    const d = L.createEl('details', { cls: 'gq-close' }); if (open) d.open = true;
    d.createEl('summary', { text: `Close words: ${c.label}${c.from ? ' · for ' + c.from : ''}` });
    const pc = this.colors(), lt = pc.lt || c.track ? pc : null;
    for (const m of c.words) {
      const w = m.w; if (!w) continue;
      const row = d.createDiv('gq-hit gq-close-row' + (m.best ? ' is-best' : '')), t = row.createDiv('gq-hit-text');
      const mn = t.createDiv({ cls: 'gq-hit-main', attr: { lang: 'el' } }); const col = this.colorOf(w.word);
      mn.createSpan({ cls: 'gq-dot gq-' + (col || 'new'), attr: { 'aria-label': col ? col + ' word' : 'new word' } });
      mn.appendText(`${w.word}  ·  ${w.english}`); if (m.best) mn.createSpan({ cls: 'gq-close-best', text: 'Best fit' });
      t.createDiv({ cls: 'gq-hit-sub', text: m.note });
      if (lt && LT_FIRST[w.word]) { const n = LT_FIRST[w.word]; t.createDiv({ cls: 'gq-hit-sub gq-close-lt', text: n <= lt.lt_track ? `Heard in Language Transfer, track ${n}` : `Language Transfer track ${n}` }); }
      t.addClass('gq-open'); t.onclick = () => onCard(w);
      const g = row.createEl('button', { text: 'Word web', cls: 'gq-mini' }); g.onclick = e => { e.stopPropagation(); onWeb(w); };
    }
  }
  // Close words for what the student typed: an English word or description ("think about my trip"), a Greek word, or a Greek sentence.
  closeWords(q) {
    if (!this.words || !q) return [];
    if (!this.closeIx) {
      this.closeIx = CLOSE.map(([label, ws]) => ({ label, words: ws.map(([word, note, cues]) => ({ word, note, k: fold(word), w: this.words.find(x => x.word === word), cues: cues.split(';').map(x => x.trim().toLowerCase().replace(/!/g, '').replace(/\?/g, ' ?').trim()).filter(Boolean).map(enStem) })) }));
    }
    const out = [], seen = new Set();
    const tm = this.ltTrackQ(q);
    if (tm) {
      for (const word of this.ltTrackWords(tm)) for (const c of this.closeIx) if (c.words.some(m => m.word === word) && !seen.has(c.label)) { seen.add(c.label); out.push({ label: c.label, from: word, track: tm, words: c.words.map(m => ({ ...m, best: false })) }); }
      return out;
    }
    if (isGreek(q)) {
      const fq = ' ' + fold(q).replace(/[^\p{L}]+/gu, ' ') + ' ', toks = fq.trim().split(' ');
      // Accents can tell two words apart (πότε when?, ποτέ never), so a token that is exactly another of the 1,500 is that word.
      const raw = q.toLowerCase().split(/[^\p{L}]+/u).filter(Boolean), exact = new Map(this.words.map(x => [x.word.toLowerCase(), x.word]));
      const has = m => { if (m.k.includes(' ')) return fq.includes(' ' + m.k + ' ');
        const w = m.w; if (!w) return false;
        const stem = w.k.slice(0, Math.max(4, w.k.length - 2));
        return toks.some((t, i) => { const other = exact.get(raw[i]); if (other) return other === w.word;
          return t === w.k || w.fk.includes(t) || (w.k.length >= 5 && t.length >= 4 && t.startsWith(stem) && Math.abs(t.length - w.k.length) <= 2); }); };
      for (const c of this.closeIx) { const hit = c.words.find(has); if (hit && !seen.has(c.label)) { seen.add(c.label); out.push({ label: c.label, from: hit.word, words: c.words.map(m => ({ ...m, best: false })) }); } }
      return out.slice(0, 4);
    }
    const e = ' ' + enStem(q.toLowerCase().replace(/\?/g, ' ?').replace(/[^a-z'? ]+/g, ' ').replace(/\s+/g, ' ').trim()) + ' ';
    const qt = new Set(e.trim().split(' ').filter(x => x.length > 1 && !['the', 'to', 'an', 'of', 'it', 'is', 'my', 'me', 'you', 'for', 'word', 'when', 'and', 'or', 'that', 'in', 'on', 'say', 'something', 'someone', 'i', "i'm", 'am', 'are', 'was', 'be', 'will', 'what', 'this', 'about', 'with', 'very', 'some', 'want'].includes(x)));
    if (qt.size === 0 && e.trim().length < 2) return [];
    for (const c of this.closeIx) {
      let top = 0, best = null;
      const ws = c.words.map(m => {
        const w = m.w; let sc = 0; if (m.word === 'θέλω' && /\bwant\b|would like/.test(e)) sc = 15;
        for (const cue of m.cues) if (e.includes(' ' + cue + ' ')) sc = Math.max(sc, 10 + cue.length);
        if (!sc && w) { const et = enStem(w.e).split(/[^a-z']+/); if ([...qt].some(t => et.includes(t))) sc = 3; }
        if (sc > top) { top = sc; best = m.word; }
        return { ...m, sc };
      });
      if (!top && c.label.split(/[^a-zA-Z]+/).some(t => qt.has(t.toLowerCase()))) top = 2;
      if (top) out.push({ label: c.label, top, words: ws.map(m => ({ ...m, best: top >= 10 && m.word === best && ws.filter(x => x.sc === top).length === 1 })) });
    }
    return out.sort((a, b) => b.top - a.top).slice(0, 2);
  }
  // "track 33" or "LT 33": the words first heard on that Language Transfer track.
  ltTrackQ(q) { const m = /^\s*(?:track|lt|language transfer)\s*(\d{1,3})\s*$/i.exec(q || ''); const n = m ? +m[1] : 0; return n >= 1 && n <= LT_MAX ? n : 0; }
  ltTrackWords(n) { return Object.keys(LT_FIRST).filter(w => LT_FIRST[w] === n); }
  findWords(q) {
    const tn = this.ltTrackQ(q);
    if (tn && this.words) { const set = new Set(this.ltTrackWords(tn)); return this.words.filter(w => set.has(w.word)); }
    if (!this.words) return [];
    const k = fold(q), res = [], reds = new Set(this.colors().red);
    // Letters with gaps: * or _ stands for missing letters anywhere (κα*ψυ, _μενω). Letters with no gaps can also match in order (πρμν finds περιμένω).
    const GAP = /[*_…]/, gr = isGreek(q), esc = x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (gr && GAP.test(q)) {
      const rx = new RegExp(k.split(/[*_…]+/).map(x => esc(x.replace(/\s+/g, ''))).join('.*')), rs = new RegExp(sndG(q.replace(/[*_…]+/g, '9')).replace(/\s+/g, '').split('9').map(esc).join('.*'));
      for (const w of this.words) { const f = rx.test(w.k) || w.fk.some(x => rx.test(x)) ? 60 : rs.test(w.s) ? 40 : 0; if (f) res.push({ ...w, score: f - w.k.length / 100 - w.rank / 100000 + (reds.has(w.word) ? 5 : 0), form: '' }); }
      return res.sort((a, b) => b.score - a.score).slice(0, 12);
    }
    for (let w of this.words) {
      let score = 0, form = '';
      if (isGreek(q)) {
        if (w.k === k) score = 100; else if (w.fk.includes(k)) { score = 90; form = w.forms.find(x => fold(x) === k); } else if (k.length >= 2 && w.k.startsWith(k)) score = 50; else if (k.length >= 3 && w.fk.some(x => x.startsWith(k))) score = 30;
        // Spelled the way it sounds, or a piece of the word (contains).
        if (!score) { const sk = sndG(q);
          if (sk.length >= 3 && (w.s === sk || w.fs.includes(sk))) { score = 85; form = w.s === sk ? '' : w.forms.find(x => sndG(x) === sk); w = { ...w, spelled: true }; }
          else if (k.length >= 3 && w.k.includes(k)) score = 35;
          else if (sk.length >= 3 && w.s.startsWith(sk)) score = 45;
          else if (sk.length >= 3 && (w.s.includes(sk) || w.fs.some(x => x.includes(sk)))) score = 25; }
      } else {
        const words = w.e.split(/[^a-z']+/).filter(Boolean);
        const bare = w.e.replace(/^(i|to|the|a|an) /, '');
        if (w.e === k || bare === k) score = 100; else if (words.includes(k)) score = 80; else if (k.length >= 3 && words.some(x => x.startsWith(k))) score = 40; else if (k.includes(' ') && w.e.includes(k)) score = 60; else if (k.length >= 4 && w.e.includes(k)) score = 20;
        if (score < 70 && w.c.some(c => c === k || (k.length >= 4 && c.startsWith(k)))) { score = 70; form = ''; w = { ...w, via: w.c.find(c => c === k || c.startsWith(k)) }; }
      }
      if (score && reds.has(w.word)) score += 5;   // red words (don't have it yet) come up first
      if (score) res.push({ ...w, score: score - w.rank / 10000, form });
    }
    if (!res.length && gr && k.replace(/\s/g, '').length >= 3 && !/\s/.test(k)) {
      const rx = new RegExp([...k].map(esc).join('.*'));
      for (const w of this.words) if (rx.test(w.k)) res.push({ ...w, score: 10 - w.k.length / 100 - w.rank / 100000, form: '', inOrder: true });
      return res.sort((a, b) => b.score - a.score).slice(0, 8);
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
      const r = await requestUrl({ url: `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&dt=bd&dt=rm&dt=qc&q=${encodeURIComponent(q)}`, throw: false });
      const d = r.status === 200 ? r.json : null;
      if (d && d[0]) {
        const text = d[0].filter(x => x && x[0]).map(x => x[0]).join('').trim();
        const rm = d[0].find(x => x && (x[2] || x[3])) || [];
        const alts = (d[1] || []).map(x => ({ pos: x[0], terms: x[1] || [] })).filter(a => a.terms.length);
        if (text) out = { q, text, fromGreek, greek: fromGreek ? q : text, say: (fromGreek ? rm[3] : rm[2]) || '', alts };
        // A misspelling (κατάψηξη): translate the spelling the translator suggests (κατάψυξη) and show it, like a near miss.
        const fix = d[7] && d[7][1] && String(d[7][1]).trim();
        if (out && fix && fix !== q && !this.trFixing) { this.trFixing = true; try { const f = await this.translate(fix); if (f) out = { ...f, q, fixed: fix }; } finally { this.trFixing = false; } }
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
  // A translation for a word that is not in the 1,500, drawn into box. Used by Look up and by the Words search.
  bonusShow(box, q, tr, save, onWeb) {
    if (!tr) {
      box.createDiv({ cls: 'gq-hit-sub', text: 'Could not translate right now (are you online?). It is saved to Words I looked up, and the Greek is added the next time you are online.' });
      if (save) this.logLookup(q, null, null);
      return;
    }
    const t = box.createDiv('gq-hit-text'), gr = tr.greek;
    if (tr.fixed) t.createDiv({ cls: 'gq-hit-sub gq-fixed', text: `Closest spelling: ${tr.fixed}` });
    t.createDiv({ cls: 'gq-hit-main', text: tr.fromGreek ? `${gr}  ·  ${tr.text}` : `${tr.text}  ·  ${tr.fixed || q}` });
    if (tr.say) t.createDiv({ cls: 'gq-hit-sub', text: 'say it: ' + tr.say });
    for (const a of tr.alts.slice(0, 3)) t.createDiv({ cls: 'gq-hit-sub', text: `${a.pos}: ${a.terms.slice(0, 4).join(', ')}` });
    const inList = this.findWords(gr).find(w => fold(w.word) === fold(gr));
    t.createDiv({ cls: 'gq-hit-sub', text: inList ? (this.isKids ? 'It is one of your words.' : `It is #${inList.rank} of the 1,500.`) : 'Bonus word. It goes in Words I looked up.' });
    const btns = box.createDiv('gq-btns');
    const h = btns.createEl('button', { text: 'Hear it' }); h.onclick = () => say(gr);
    if (inList) { const g = btns.createEl('button', { text: 'Word card' }); g.onclick = () => { this.logLookup(q, inList); onWeb(inList); }; }
    if (save) this.logLookup(q, inList || null, inList ? null : tr);
    return inList;
  }
  bonusLine(q, tr) {
    if (!tr) return `- ${q} → bonus word: `;
    const say = tr.say ? ` · say it: ${tr.say}` : '';
    return tr.fromGreek ? `- ${q} → bonus word: ${tr.greek} · ${tr.text}${say}` : `- ${q} → bonus word: ${tr.text}${say}`;
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
    const ok = f && f.extension === 'md' && f.path !== TODAY && !f.path.startsWith(MY_WORK);
    new VideoAskModal(this.app, this, ok ? f : null).open();
  }
  async shareVideo(file, text, saveDir) {
    const mobile = document.body.classList.contains('is-mobile') || /Android|iPhone|iPad/.test(navigator.userAgent);
    // Copy the message first: some apps drop the text when a video is attached, so it can be pasted as a caption.
    try { navigator.clipboard.writeText(text); } catch (e) {}
    if (mobile && navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], text }); new Notice('If the message is missing in GroupMe, paste it: it is copied.', 8000); return true; }
      catch (e) { if (e && e.name === 'AbortError') return false; }
    }
    if (mobile && !window.GQW) {
      // Obsidian on a phone without file sharing: save into My Work (the web app downloads instead, below), which the Files app (iPhone) or file manager (Android) can open.
      const dir = MY_WORK + (saveDir || 'Video questions');
      try { if (!this.app.vault.getAbstractFileByPath(dir)) await this.app.vault.createFolder(dir);
        await this.app.vault.createBinary(`${dir}/${file.name}`, await file.arrayBuffer());
        new Notice(`Saved to ${dir}/${file.name} and copied the message. In GroupMe, attach the ${file.type.startsWith('image') ? 'photo' : 'video'} from Files and paste the message.`, 15000); return true; }
      catch (e) { new Notice(file.type.startsWith('image') ? 'Could not save the photo. Take it with the camera app and send it in GroupMe instead.' : 'Could not save the video. Record it with the camera app and send it in GroupMe instead.', 10000); return false; }
    }
    // Computer: download the video and copy the message.
    const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = file.name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
    new Notice(`Saved ${file.name} and copied the message. In GroupMe, attach the ${file.type.startsWith('image') ? 'photo' : 'video'} and paste the message.`, 12000);
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
        if (!all.length) { list.createDiv({ cls: 'gq-hint', text: 'No video questions yet. Be the first: tap Class, then Ask the class, then Ask on video instead.' }); return; }
        if (!hits.length) { list.createDiv({ cls: 'gq-hint', text: 'No questions match. Try the Greek word without accents, or the English meaning.' }); return; }
        list.createDiv({ cls: 'gq-hint', text: `${hits.length} of ${all.length} questions, newest first` });
        hits.forEach(q => this.questionCard(list, q));
      };
      s.oninput = draw; draw();
    });
  }
  // ---------- Ask the group helpers ----------
  ask(file) {
    const f = file === null ? null : (file || this.app.workspace.getActiveFile());
    // No usable note (Today, Class, My Work): ask a general question instead of refusing.
    const ok = f && f.extension === 'md' && f.path !== TODAY && !f.path.startsWith(MY_WORK);
    new AskModal(this.app, this, ok ? f : null).open();
  }
  askHeader(f) {
    if (!f) return 'Question for the class:';
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
    const nums = this.statsLine();
    const use = this.useLine();
    window.open(smsLink(`Greekquent homework (${f.basename}):\n${body}\n\nΦόρα ${mo} (${mo - this.moScore(md, w7) >= 0 ? '+' : ''}${mo - this.moScore(md, w7)} this week)${nums ? '\nNumbers: ' + nums : ''}${use ? '\n' + use : ''}`));
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
  // Resources: verb tables and the other reference pages, one tap away from any screen (not only from a word card).
  resourcesPop() {
    const go = path => { const o = document.querySelector('.gq-pop'); if (o) o.remove(); this.openNote(path); };
    const has = p => !!this.app.vault.getAbstractFileByPath(p);
    const ex = this.app.vault.getMarkdownFiles().filter(x => this.isKids ? x.path.split('/').length === 1 && x.path !== TODAY : x.path.startsWith(EXTRAS) && x.path.split('/').length === 2).sort((a, b) => a.basename.localeCompare(b.basename));
    this.pop('Resources', [{ label: '', build: el => {
      const top = el.createDiv('gq-row gq-res-top');
      const b = (t, fn) => { const x = top.createEl('button', { text: t }); x.onclick = fn; };
      if (has(EXTRAS + '02 Verb Tables.md')) b('Verb tables', () => go(EXTRAS + '02 Verb Tables.md'));
      if (has(EXTRAS + '11 Classroom Greek.md')) b('Classroom Greek', () => go(EXTRAS + '11 Classroom Greek.md'));
      b('Look up a word', () => { const o = document.querySelector('.gq-pop'); if (o) o.remove(); new LookupModal(this.app, this).open(); });
      if (!ex.length) return;
      el.createDiv({ cls: 'gq-tsub', text: 'Everything else' });
      const ul = el.createEl('ul', { cls: 'gq-tlist gq-res-list' });
      for (const x of ex.filter(x => ![EXTRAS + '02 Verb Tables.md', EXTRAS + '11 Classroom Greek.md'].includes(x.path))) { const a = ul.createEl('li').createEl('a', { text: x.basename.replace(/^\d\d /, '').replace(/-student$/, ''), href: '#' }); a.onclick = e => { e.preventDefault(); go(x.path); }; }
    } }]);
  }
  moreMenu(evt) {
    const m = new Menu();
    if (document.body.classList.contains('gq-nonav')) m.addItem(i => i.setTitle('Today').setIcon('house').onClick(() => this.openToday()));
    if (!this.isKids) m.addItem(i => i.setTitle('Side panel').setIcon('panel-right').onClick(() => this.showMore()));
    m.addItem(i => i.setTitle('Look up a word').setIcon('search').onClick(() => new LookupModal(this.app, this).open()));
    m.addItem(i => i.setTitle('Resources: verb tables and more').setIcon('book-open').onClick(() => this.resourcesPop()));
    m.addItem(i => i.setTitle('Word web').setIcon('git-fork').onClick(() => this.openGraph()));
    m.addItem(i => i.setTitle('Ask the class').setIcon('message-circle').onClick(() => this.ask()));
    m.addItem(i => i.setTitle('Send homework').setIcon('send').onClick(() => this.sendHomework()));
    m.addSeparator();
    m.addItem(i => i.setTitle("What's new").setIcon('sparkles').onClick(() => this.openNote(WHATS_NEW)));
    m.addItem(i => i.setTitle('Options').setIcon('sliders-horizontal').onClick(() => this.optionsPop()));
    m.addItem(i => i.setTitle('Setting up').setIcon('help-circle').onClick(() => this.openNote(SETUP)));
    m.addItem(i => i.setTitle(this.tourLeft() ? 'Take the tour' : 'Take the tour again').setIcon('map').onClick(() => this.tourStart()));
    if (this.reviewOn()) m.addItem(i => i.setTitle('App review').setIcon('gauge').onClick(() => this.reviewStart()));
    m.addItem(i => i.setTitle('Update vault').setIcon('refresh-cw').onClick(() => this.updateVault(false)));
    if (this.isTeacher) m.addItem(i => i.setTitle('Teacher update key').setIcon('key').onClick(() => this.keyModal()));
    if (evt && evt.clientX !== undefined) m.showAtMouseEvent(evt); else m.showAtPosition({ x: 60, y: 200 });
  }
  // A word's card is its note. Every tap on a word in search lands here (Word web is always its own button).
  async openCard(w) { if (!w) return; say(w.word); return this.openNote(w.path); }
  // Starred words: favorites, kept in My progress next to the colors, so updates never erase them.
  stars() { if (this.starsNow) return this.starsNow; const fm = this.progFm(); return Array.isArray(fm.stars) ? fm.stars.map(String) : []; }
  starred(word) { return this.stars().includes(word); }
  async setStar(word, on) {
    const f = await this.progressFile(); let list = [];
    await this.app.fileManager.processFrontMatter(f, fm => { list = Array.isArray(fm.stars) ? fm.stars.map(String).filter(w => w !== word) : []; if (on) list.push(word); fm.stars = list; });
    this.starsNow = list; clearTimeout(this.starsT); this.starsT = setTimeout(() => { this.starsNow = null; }, 3000);
    this.paintBars();
    new Notice(on ? `Starred ${word}. Find it under ★ Starred on Words.` : `${word} is no longer starred.`);
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
    return { red: list('red'), yellow: list('yellow'), green: list('green'), setup_seen: !!fm.setup_seen, world: typeof fm.world === 'string' && WORLDS[fm.world] ? fm.world : 'dance', fiay: fm.fiay === true || fm.fiay === 'on', fiay_from: /^\d{4}-\d{2}-\d{2}$/.test(String(fm.fiay_from || '')) ? String(fm.fiay_from) : '', scripts: this.scriptsNow || (fm.scripts === 'intermediate' ? 'intermediate' : 'beginner'), last_beat: Math.max(0, parseInt(fm.last_beat, 10) || 0), story_at: fm.story_at === undefined || fm.story_at === null || fm.story_at === '' ? null : Math.max(0, parseInt(fm.story_at, 10) || 0), track: String(fm.track || ''), tabs: '', lt: true, lt_track: Math.min(LT_MAX, Math.max(0, parseInt(fm.lt_track, 10) || 0)), lt_read: fm.lt_read === undefined || fm.lt_read === null || fm.lt_read === '' ? null : Math.max(0, parseInt(fm.lt_read, 10) || 0), lt_day: String(fm.lt_day || ''), lt_go: fm.lt_go === true };
  }
  cards() { const f = this.app.vault.getAbstractFileByPath(PROGRESS); const fm = f ? ((this.app.metadataCache.getFileCache(f) || {}).frontmatter || {}) : {}; return this.cardsNow || (Array.isArray(fm.cards) ? fm.cards.map(String) : []); }
  async setCard(word, on) {
    const f = await this.progressFile(); let list = [];
    await this.app.fileManager.processFrontMatter(f, fm => { list = Array.isArray(fm.cards) ? fm.cards.map(String).filter(w => w !== word) : []; if (on) list.push(word); fm.cards = list; });
    this.cardsNow = list; setTimeout(() => { this.cardsNow = null; }, 3000);
    if (on) this.moAdd('card', word);
    this.paintBars();
    if (!on) { new Notice('Taken off your paper cards.'); return; }
    const pile = this.colorOf(word) || 'red', fm = this.progFm();
    if (fm.card_help || this.cardHelpSeen) { new Notice(`Card logged: ${word}. It goes in your ${pile} pile.`); return; }
    this.cardHelpSeen = true; await this.app.fileManager.processFrontMatter(f, x => { x.card_help = true; });
    this.cardHelp(word, pile);
  }
  // Shown once, the first time a card is logged. Card ideas has the same text for later.
  cardHelp(word, pile) {
    const m = new Modal(this.app), c = m.contentEl; c.addClass('gq-modal', 'gq-card-help'); m.titleEl.setText('Your first paper card');
    c.createEl('p', { text: `${word} is logged, +1 φόρα. It goes in your ${pile} pile.` });
    const ul = c.createEl('ul');
    for (const t of ['The card: Greek on the front. A picture, a gesture or a real moment on the back, not only the English.',
      'The piles: keep red, yellow and green piles. A card goes in the pile of its color on the word note.',
      'The schedule: red every day, yellow every other day, green on Sundays. Card practice on Today logs how many cards and minutes you did, and can call out today\'s piles.']) ul.createEl('li', { text: t });
    c.createEl('p', { cls: 'gq-hint', text: 'Want ideas, or to send a photo of your card to your teacher? Tap Card ideas.' });
    const row = c.createDiv('gq-row');
    const ok = row.createEl('button', { text: 'Got it', cls: 'mod-cta' }); ok.onclick = () => m.close();
    if (this.app.vault.getAbstractFileByPath(CARD_IDEAS)) { const ci = row.createEl('button', { text: 'Card ideas' }); ci.onclick = () => { m.close(); this.openNote(CARD_IDEAS); }; }
    m.open();
  }
  cardPhoto(word) { return CARD_DIR + word.replace(/[\\/:*?"<>|#^\[\]]/g, '_') + '.jpg'; }
  // Send a card photo to the teacher, who looks for card-making habits worth teaching the whole class.
  // The student decides whether it may be shown to the class (always without a name). 2 φόρα, once a day.
  sendCard(word) {
    const m = new Modal(this.app), c = m.contentEl; m.titleEl.setText('Send your card to your teacher');
    c.createEl('p', { text: 'Your teacher looks at cards to find tricks that help, then shares the best ideas with everyone.' });
    const q = c.createEl('input', { type: 'text', attr: { placeholder: 'What did you try on this card? (optional)', style: 'width:100%;margin:4px 0 10px', autocomplete: 'off' } });
    c.createEl('p', { text: 'Can your teacher show this card to the class, without your name?' });
    const r = c.createDiv({ attr: { style: 'display:flex;gap:8px;flex-wrap:wrap' } });
    const go = async ok => {
      m.close();
      try {
        const buf = await this.app.vault.adapter.readBinary(this.cardPhoto(word));
        const file = new File([buf], 'card-' + word.replace(/[^\p{L}\p{N}]+/gu, '-') + '.jpg', { type: 'image/jpeg' });
        const tried = q.value.trim();
        const text = `Greekquent card: ${word}\nShow the class (no name): ${ok ? 'yes' : 'no, just my teacher'}` + (tried ? `\nWhat I tried: ${tried}` : '');
        if (await this.shareVideo(file, text, 'Card photos to send')) { this.moAdd('did', 'cardsend', 2); this.moFlush(); }
      } catch (e) { new Notice('That card photo could not be sent. Take a new photo and try again.'); }
    };
    r.createEl('button', { text: 'Yes, show the class', cls: 'mod-cta' }).onclick = () => go(true);
    r.createEl('button', { text: 'Just my teacher' }).onclick = () => go(false);
    m.open();
  }
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
    if (this._pfMaking) return this._pfMaking;
    this._pfMaking = this._progressMake().finally(() => { this._pfMaking = null; });
    return this._pfMaking;
  }
  async _progressMake() {
    if (!this.app.vault.getAbstractFileByPath(MY_WORK.slice(0, -1))) await this.app.vault.createFolder(MY_WORK.slice(0, -1));
    return this.app.vault.create(PROGRESS, '---\nred: []\nyellow: []\ngreen: []\n---\n# My progress\n\nYour word colors live in this note. Change them with the color buttons on any word note: red = don\'t have it, yellow = kind of, green = have it. Tap a color again to clear it. The Today page counts them.\n');
  }
  // ---------- Momentum ----------
  moData() {
    const f = this.app.vault.getAbstractFileByPath(MO_FILE);
    const fm = f ? ((this.app.metadataCache.getFileCache(f) || {}).frontmatter || {}) : {};
    const obj = k => (fm[k] && typeof fm[k] === 'object' && !Array.isArray(fm[k])) ? fm[k] : {};
    const mem = this.moMem && Date.now() - this.moMem.t < 15000 ? this.moMem : null;
    return { days: mem ? mem.days : obj('days'), got: obj('got'), up: obj('up'), met: obj('met'), dance: mem && mem.dance ? mem.dance : obj('dance'), grow: mem && mem.grow !== undefined ? +mem.grow : (fm.grow !== undefined && fm.grow !== null && Number.isFinite(+fm.grow) ? +fm.grow : null), steps: mem && mem.steps !== undefined ? +mem.steps : (fm.steps !== undefined && fm.steps !== null && Number.isFinite(+fm.steps) ? +fm.steps : 0), chisel: mem && mem.chisel !== undefined ? +mem.chisel : (Number.isFinite(+fm.chisel) && fm.chisel !== null && fm.chisel !== '' ? +fm.chisel : 0), firsts: mem && mem.firsts ? mem.firsts : obj('firsts') };
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
      f = await this.app.vault.create(MO_FILE, '---\ndays: {}\n---\n# My momentum\n\nΠάρε φόρα. This note keeps your φόρα (momentum). The app fills it in, so there is nothing to type here.\n\n- Getting a word right again on a later day: 3. The first time: 1. The same word twice in one day: 0.\n- A color you moved up that is still right two days later: 5. A word you mark for the first time: 1.\n- Your own sentence in My pairs: 3. A built one: 1. A story puzzle line: 1, or 3 on a later day.\n- Spaced review, today\'s line and the rally: Had it counts like a word. Not yet: 1 for trying.\n- Language Transfer: 1 a track. The book before class: 2 a day. A finished read-through, rally swap, song or kid card: 2. Homework sent: 3. A question to the class: 2. Once a day each.\n- Guess first in Look up: 1. A new word in the Word web: 1, up to 5 a day.\n- At most 40 a day. Each day off, your φόρα fades by a seventh, so it comes back fast.\n');
    }
    const today = ymd(new Date()), gap = d => { const [a, b, c] = String(d).split('-').map(Number); const n = new Date(); n.setHours(12, 0, 0, 0); return Math.round((n - new Date(a, b - 1, c, 12)) / 864e5); };
    let gained = 0, big = null; const danced = [], dancedK = []; const wNow = this.worldKey(), dw = wNow === 'dance', gw = wNow === 'gallery'; const carved = [];
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
      // Steps belong to the Dance world only, so there is one kind of progress at a time. They carry across days (fm.steps never resets).
      // Dance starts at step 0 the first time you pick it; in other worlds fm.steps waits untouched.
      if (dw && (!Number.isFinite(+fm.steps) || fm.steps === null || fm.steps === '')) fm.steps = 0;
      // Chisel strokes belong to the Gallery world the same way, and also never reset.
      if (gw && (!Number.isFinite(+fm.chisel) || fm.chisel === null || fm.chisel === '')) fm.chisel = 0;
      // World growth: a running total of φόρα points (fm.grow). The first time, start at least where green words had the world, so it never shrinks.
      if (fm.grow === undefined || fm.grow === null || !Number.isFinite(+fm.grow)) fm.grow = this.growSeed(fm.days);
      const before = +fm.days[today] || 0, now = Math.min(MO_CAP, before + pts); gained = now - before;
      if (now) fm.days[today] = now;
      for (const d of Object.keys(fm.days)) if (gap(d) > 60) delete fm.days[d];
      // Steps: finishing a dance's real steps adds it to the collection and dates the first time. A guest dance can still visit on a big day.
      for (const k of ['dance', 'firsts', 'danced']) if (!fm[k] || typeof fm[k] !== 'object' || Array.isArray(fm[k])) fm[k] = {};
      const add = k => { if (fm.danced[k] === today) return; fm.danced[k] = today; fm.dance[k] = (+fm.dance[k] || 0) + 1; if (!fm.firsts[k]) fm.firsts[k] = today; danced.push(DANCE_NAME[k]); dancedK.push(k); };
      fm.grow = (+fm.grow || 0) + gained;
      if (dw) { const was = danceNow(fm.steps); fm.steps = (+fm.steps || 0) + gained; const is = danceNow(fm.steps);
      for (let j = was.learned; j < is.learned; j++) { const k = DANCE_PATH[j % DANCE_PATH.length][0]; fm.dance[k] = (+fm.dance[k] || 0) + 1; if (!fm.firsts[k]) fm.firsts[k] = today; danced.push(DANCE_NAME[k]); dancedK.push(k); }
      if (now >= 12 && Object.keys(fm.days).length >= 7 && dayHash(today) % 4 === 0) add(GUEST_DANCES[dayHash(today + 'g') % GUEST_DANCES.length][0]); }
      if (gw) { const was = galleryNow(fm.chisel); fm.chisel = (+fm.chisel || 0) + gained; const is = galleryNow(fm.chisel);
        for (let j = was.done; j < is.done; j++) { const k = STATUES[j % STATUES.length].k; carved.push(k); if (!fm.firsts['statue ' + k]) { fm.firsts['statue ' + k] = today; if (!big) big = { statue: k }; } } }
      // One big moment at most per save, and each only once (dated in firsts, so it survives updates and other devices).
      if (big && big.statue) {} else if (dancedK.length) { const kk = dancedK[dancedK.length - 1], guest = GUEST_DANCES.some(g => g[0] === kk); big = { k: kk, gr: guest ? `Μπράβο. Χόρεψες ${DANCE_ACC[kk]}.` : `Μπράβο. Έμαθες ${DANCE_ACC[kk]}.`, en: guest ? `Well done. A guest dance came by, and you danced the ${DANCE_EN[kk]}.` : `Well done. You learned the ${DANCE_EN[kk]}.` }; }
      else { const once = (key, v) => { if (big || fm.firsts[key]) return; fm.firsts[key] = today; big = v; };
        if (q.some(x => x[0] === 'did' && x[1] === 'homework')) { const s0 = new Date(COURSE_START[0], COURSE_START[1], COURSE_START[2]), wn = Math.max(1, Math.floor((new Date() - s0) / 6048e5) + 1); once('big week ' + wn, { gr: 'Μπράβο. Τελείωσες την εβδομάδα.', en: 'Well done. You finished the week and sent your homework.' }); }
        if (this.abcAllDone()) once('big alphabet', { gr: 'Μπράβο. Ξέρεις όλο το αλφάβητο.', en: 'Well done. You know the whole alphabet, every sound and every name.' });
        if (this.colors().green.length >= 50) once('big green 50', { gr: 'Μπράβο. Πενήντα πράσινες λέξεις.', en: 'Well done. Fifty green words: fifty words you have.' }); }
      this.moMem = { days: { ...fm.days }, grow: fm.grow, steps: fm.steps, chisel: fm.chisel, dance: { ...fm.dance }, firsts: { ...fm.firsts }, t: Date.now() };
    });
    if (danced.length) this.danceAt = Date.now();
    if (gained) { this.moPaint(); this.moToast(gained, danced.length ? 'you danced ' + danced.join(' and ') : carved.length ? 'you finished ' + carved.map(k => STATUES.find(x => x.k === k).gr).join(' and ') : ''); }
    if (big) setTimeout(() => big.statue ? this.galleryScene(big.statue) : this.festScene(big), gained ? (carved.length ? 2600 : 1500) : 300);
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
  hadIt(r, key, after, res) {
    const y = r.createEl('button', { text: 'Had it', cls: 'mod-cta' }); const n = r.createEl('button', { text: 'Not yet' });
    y.onclick = () => { this.moAdd('recall', key); if (res) res(true); after(); }; n.onclick = () => { this.moAdd('try', key); if (res) res(false); after(); };
  }
  // One world is picked for you (Dance, the quickest to grow). The others wait in Options.
  // For now everyone grows the same olive. The other worlds (and Choose your friend) stay in the code, switched off by FRIENDS_ON.
  worldKey() { if (!FRIENDS_ON) return 'olive'; const w = this.worldNow !== undefined ? this.worldNow : this.colors().world; return WORLDS[w] ? w : 'dance'; }
  async setWorld(w) { this.worldNow = w; if (w) this.tourHit('world'); const f = await this.progressFile(); await this.app.fileManager.processFrontMatter(f, fm => { if (w) fm.world = w; else delete fm.world; }); this.moPaint(); }
  growSeed(days) {
    const sum = Object.values(days || {}).reduce((a, v) => a + (+v || 0), 0);
    const g = worldStage(this.colors().green.length, this.words ? this.words.length : 1500).idx;
    return Math.max(sum, g > 1 ? worldNeed(g - 1, W_PTS) : 0);
  }
  growNow() { const g = this.moData().grow; return g === null ? this.growSeed(this.moData().days) : g; }
  worldDraw(c, todayPts, score) {
    const w = this.worldKey();
    if (w === 'dance') { this.danceWorld(c, todayPts, score); return; }
    if (w === 'gallery') { this.galleryWorld(c, todayPts, score); return; }
    if (!this.words && !this.worldWait) { this.worldWait = true; this.wordIndex().then(() => this.moPaint()); }
    const pts = this.growNow(), st = worldStage(pts, W_PTS), mood = worldMood(todayPts, score);
    // One object, no scene: it sits on the page like the corner sprite, only bigger.
    const box = c.createDiv('gq-world gq-world-one'), art = this.friendArt(box, 120), cv = art.el;
    const items = w === 'pet' ? [] : WORLDS[w].eras[st.era].items.slice(0, st.n);
    const cap = box.createDiv({ cls: 'gq-hint gq-world-cap' });
    const name = w === 'pet' ? (st.f === 0 ? 'An egg. Get your first φόρα to hatch it' : WORLDS.pet.eras[st.era].name) : WORLDS[w].eras[st.era].name;
    if (w === 'olive') { const nm = cap.createSpan({ cls: 'gq-say', text: art.name[0], attr: { lang: 'el' } }); nm.onclick = () => say(art.name[0]); cap.appendText(` · ${art.name[1]} · ${oliveFrame(st.idx) + 1} of ${SPR_OLIVE.length}`); }
    else cap.appendText(`${name} · ${MOODS[mood].toLowerCase()} · ${st.idx} of ${W_STAGES}`);
    const more = st.next - pts;
    cap.appendText(st.next ? ` · ${more} more φόρα to grow` : ' · all grown. Θα τα πούμε.');
    // A new piece of the world: say its name, and date it in My momentum so the teacher can see how the pace feels.
    if (this.words) {
      const fs = this.moData().firsts || {}, top = Math.max(1, ...Object.keys(fs).filter(k => k.startsWith('world ')).map(k => +k.slice(6) || 0));
      if (st.idx > top && this.worldRec !== st.idx) {
        this.worldRec = st.idx; const it = items[st.n - 1];
        if (top > 1 || st.idx > 2) cap.prepend(createSpan({ cls: 'gq-world-new', text: w === 'pet' ? 'Φοράκι grew. ' : w === 'olive' ? 'It grew. ' : `New: ${it ? it[1] : WORLDS[w].eras[st.era].name}. ` }));
        const f = this.app.vault.getAbstractFileByPath(MO_FILE);
        if (f) this.app.fileManager.processFrontMatter(f, fm => { if (!fm.firsts || typeof fm.firsts !== 'object' || Array.isArray(fm.firsts)) fm.firsts = {}; for (let k = top + 1; k <= st.idx; k++) if (!fm.firsts['world ' + k]) fm.firsts['world ' + k] = ymd(new Date()); }).catch(() => {});
      }
    }
    const word = box.createDiv({ cls: 'gq-world-say', attr: { lang: 'el' } });
    worldTip(word);
    const greens = this.colors().green; let k = 0;
    const speak = () => {
      const list = w === 'pet' ? (greens.length ? greens : ['γεια σου']) : items.map(x => x[1]);
      if (!list.length) return; const t = list[(k++ + Math.floor(Math.random() * list.length)) % list.length];
      word.setText(w === 'pet' ? `Φοράκι says: ${t}` : t); say(t);
    };
    cv.addEventListener('click', () => { try { localStorage.setItem('gq-world-tap', '1'); } catch (x) {} word.setAttribute('lang', 'el'); word.setText(art.name.join(' · ')); say(art.name[0]); art.paint(0); this.friendGrow(art, 700); });
  }
  // The Dance world: the village square (η πλατεία) seen from above. One footprint for each step of the dance you are learning,
  // in its real pattern. Each new step stamps its print, with a soft sound. Tap the square to walk the steps again.
  danceWorld(c, todayPts, score) {
    const d = danceNow(this.moData().steps), mood = worldMood(todayPts, score), name = DANCE_NAME[d.k];
    const box = c.createDiv('gq-world gq-square');
    box.addClass('gq-world-one'); const art = this.friendArt(box, 120), pre = art.el; pre.setAttr('aria-label', `A dancer. Learning ${name}: step ${d.steps} of ${d.n}.`);
    const cap = box.createDiv({ cls: 'gq-hint gq-world-cap' }); cap.appendText('Learning ');
    const nm = cap.createSpan({ cls: 'gq-say', text: name, attr: { lang: 'el' } }); nm.onclick = () => say(name);
    cap.appendText(` · step ${d.steps} of ${d.n}`);
    if (d.learned) cap.appendText(` · ${d.learned} learned`);
    const reduce = this.reduceOn();
    // New steps since this card was last drawn light up one by one; the rest are already there.
    const seen = this.stepSeen && this.stepSeen.k === d.k && this.stepSeen.learned === d.learned ? Math.min(this.stepSeen.n, d.steps) : d.steps;
    this.stepSeen = { k: d.k, learned: d.learned, n: d.steps };
    const row = box.createDiv({ cls: 'gq-dsteps', attr: { 'aria-hidden': 'true' } }), els = [];
    for (let i = 0; i < d.n; i++) els.push(row.createSpan('gq-dstep' + (i < (reduce ? d.steps : seen) ? ' is-on' : i < d.steps ? ' is-wait' : '')));
    const stamp = (from, to, gap) => { for (let i = from; i < to; i++) setTimeout(() => { if (!row.isConnected) return; els[i].classList.remove('is-wait'); els[i].classList.add('is-on', 'is-new'); gqSound('step'); }, (i - from) * gap + 250); };
    if (seen < d.steps && !reduce) { stamp(seen, d.steps, 260); this.friendDance(art); }
    const word = box.createDiv({ cls: 'gq-world-say', attr: { lang: 'el' } });
    worldTip(word);
    box.addEventListener('click', e => {
      try { localStorage.setItem('gq-world-tap', '1'); } catch (x) {}
      const onStep = e.target.closest && e.target.closest('.gq-dsteps');
      if (!onStep && e.target !== pre) return;
      word.setAttribute('lang', 'el'); word.setText(onStep ? `τα βήματα · steps · ${name}` : 'ο χορευτής · the dancer'); say(onStep ? name : 'ο χορευτής');
      this.friendDance(art);
      if (!reduce && d.steps) { els.slice(0, d.steps).forEach(e => { e.classList.remove('is-new', 'is-on'); e.classList.add('is-wait'); }); stamp(0, d.steps, 200); }
    });
  }
  // The Gallery world: a hall of statues. The block in the middle loses chips with every φόρα point (instant feedback),
  // the sculptor swings his hammer, and finished statues stand along the hall. Tap a statue to hear its name and see its trick.
  galleryWorld(c, todayPts, score) {
    const g = galleryNow(this.moData().chisel), mood = worldMood(todayPts, score), night = mood === 0, s = g.s;
    const W = 320, H = 150, box = c.createDiv('gq-world gq-gallery gq-world-one');
    const svg = svgA(box, 'svg', { viewBox: '52 -4 80 126', class: 'gq-gal-sv', role: 'img', 'aria-label': `Το μουσείο, the gallery. Carving ${s.en}: ${g.strokes} of ${g.cost} strokes.` });
    // No hall and no floor: the statue alone on the page. Finished ones are counted in the caption.
    const hall = svgA(svg, 'g', {}), done = g.i, minis = [];
    // The statue being carved, under a block of marble chips.
    const cur = svgA(svg, 'g', { transform: 'translate(92 2)' }); statueSvg(cur, s.k);
    const COLS = 6, ROWS = 12, x0 = -32, y0 = -2, cw = 64 / COLS, chh = 116 / ROWS, rnd = gqRand(g.i * 31 + g.round * 7 + 3), V = [];
    for (let r = 0; r <= ROWS; r++) { V.push([]); for (let q = 0; q <= COLS; q++) { const edge = r === 0 || r === ROWS || q === 0 || q === COLS; V[r].push([x0 + q * cw + (edge ? 0 : (rnd() - 0.5) * cw * 0.6), y0 + r * chh + (edge ? 0 : (rnd() - 0.5) * chh * 0.6)]); } }
    const cells = [];
    for (let r = 0; r < ROWS; r++) for (let q = 0; q < COLS; q++) { const pts = [V[r][q], V[r][q + 1], V[r + 1][q + 1], V[r + 1][q]]; const cx = x0 + (q + 0.5) * cw; cells.push({ pts, o: Math.abs(cx) / 32 + (r === 0 || r === ROWS - 1 ? 0.3 : 0) + rnd() * 0.45 }); }
    cells.sort((a, b) => b.o - a.o);
    const N = cells.length, gone = Math.min(N, Math.floor(g.strokes / g.cost * N));
    const blk = svgA(cur, 'g', { class: 'gq-gal-block' });
    const els = cells.map((cl, i) => svgA(blk, 'polygon', { points: cl.pts.map(p => p.map(v => v.toFixed(1)).join(',')).join(' '), fill: (i % 3) ? '#d3c9b6' : '#c8bda8', stroke: '#b3a690', 'stroke-width': 0.6, class: 'gq-chip' + (i < gone ? ' is-gone' : '') }));
    // The sculptor: a little man in an apron and a cap, hammer raised.
    const man = svgA(svg, 'g', { transform: 'translate(146 78)', class: 'gq-sculptor', style: 'display:none' });
    svgA(man, 'line', { x1: -3, y1: 30, x2: -5, y2: 44, stroke: '#3b3b3b', 'stroke-width': 3, 'stroke-linecap': 'round' }); svgA(man, 'line', { x1: 3, y1: 30, x2: 5, y2: 44, stroke: '#3b3b3b', 'stroke-width': 3, 'stroke-linecap': 'round' });
    svgA(man, 'rect', { x: -7, y: 8, width: 14, height: 24, rx: 5, fill: '#2f5d8a' }); svgA(man, 'rect', { x: -5, y: 14, width: 10, height: 18, rx: 2, fill: '#efe3c8' });
    svgA(man, 'circle', { cx: 0, cy: 2, r: 6, fill: '#f1c27d' }); svgA(man, 'path', { d: 'M-6,0 Q0,-8 7,-1 L9,0 Z', fill: '#c0392b' });
    const arm = svgA(man, 'g', { class: 'gq-sc-arm' });
    svgA(arm, 'line', { x1: -5, y1: 12, x2: -15, y2: 6, stroke: '#f1c27d', 'stroke-width': 3, 'stroke-linecap': 'round' });
    svgA(arm, 'rect', { x: -20, y: 0, width: 4, height: 9, fill: '#6b4a2b', transform: 'rotate(-30 -18 4)' }); svgA(arm, 'rect', { x: -23, y: -1, width: 9, height: 4, rx: 1, fill: '#555', transform: 'rotate(-30 -18 1)' });
    const cap = box.createDiv({ cls: 'gq-hint gq-world-cap' }); cap.appendText('Carving ');
    const nm = cap.createSpan({ cls: 'gq-say', text: s.gr, attr: { lang: 'el' } }); nm.onclick = () => say(s.gr);
    cap.appendText(` · ${g.strokes} of ${g.cost} strokes · every φόρα point is a stroke · ${g.more} more to finish`);
    if (g.done) cap.appendText(` · ${g.done} finished`);
    const reduce = (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) || this.calmOn();
    // Chips knocked off since this card was last drawn fly away, one tap of the hammer each (at most 12, so it stays quick).
    // chipSeen counts the chips already shown flying, so a redraw mid-flight carries on where it was. A new statue starts from its first chip.
    const cs = this.chipSeen, seen = !cs ? gone : cs.i === g.i && cs.round === g.round ? Math.min(cs.n, gone) : 0;
    const mine = this.chipSeen = { i: g.i, round: g.round, n: seen }; if (reduce) mine.n = gone;
    const fly = (from, to, gap) => {
      const list = []; for (let i = from; i < to; i++) list.push(i); const show = list.slice(-12); list.slice(0, -12).forEach(i => els[i].classList.add('is-gone')); if (show.length) mine.n = Math.max(mine.n, show[0]);
      show.forEach((i, n) => setTimeout(() => {
        if (!svg.isConnected) return; const e = els[i]; if (this.chipSeen === mine) mine.n = Math.max(mine.n, i + 1);
        if (!reduce) { e.style.setProperty('--dx', ((i % 2 ? 1 : -1) * (14 + (i * 7) % 18)) + 'px'); e.style.setProperty('--rot', ((i * 47) % 160 - 80) + 'deg'); e.classList.remove('is-gone'); e.classList.add('is-fly'); arm.classList.remove('is-hit'); void arm.getBBox; arm.classList.add('is-hit'); gqSound('tink'); setTimeout(() => { e.classList.remove('is-fly'); e.classList.add('is-gone'); }, 650); }
        else e.classList.add('is-gone');
      }, n * gap + 250));
    };
    if (seen < gone) { for (let i = seen; i < gone; i++) els[i].classList.remove('is-gone'); fly(seen, gone, 220); }
    const word = box.createDiv({ cls: 'gq-world-say', attr: { lang: 'el' } }); worldTip(word);
    const trick = (gEl, k) => { if (reduce) return; gEl.classList.remove('is-gag'); void gEl.getBBox; gEl.classList.add('is-gag', 'gag-' + k); setTimeout(() => gEl.classList.remove('is-gag'), 2600); };
    svg.addEventListener('click', e => {
      try { localStorage.setItem('gq-world-tap', '1'); } catch (x) {}
      const m = e.target.closest && e.target.closest('.gq-gal-mini'); word.setAttribute('lang', 'el');
      if (m) { const st = STATUES[+m.getAttribute('data-i')]; word.setText(`${st.gr} · ${st.en}`); say(st.gr); trick(m.querySelector('.gq-st'), st.k); return; }
      if (e.target.closest && e.target.closest('.gq-sculptor')) { word.setText('ο γλύπτης · the sculptor'); say('ο γλύπτης'); arm.classList.remove('is-hit'); void arm.getBBox; arm.classList.add('is-hit'); gqSound('tink'); return; }
      if (e.target.closest && e.target.closest('.gq-gal-block, .gq-st')) { word.setText(`${s.gr} · ${s.en}`); say(s.gr); return; }
      word.setText('το μουσείο · the gallery'); say('το μουσείο');
    });
  }
  // A statue finished for the first time: a short scene. The gallery at night, a spotlight, the statue does its trick, one Greek line.
  // Tap to go on. Calm mode and reduced motion get the still picture.
  galleryScene(k) {
    if (document.querySelector('.gq-fest')) return;
    const st = STATUES.find(x => x.k === k) || STATUES[0];
    const reduce = (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) || this.calmOn();
    const ov = document.body.createDiv({ cls: 'gq-fest gq-fest-page gq-gal-scene' + (reduce ? ' is-still' : ''), attr: { role: 'dialog', 'aria-label': st.line[1], tabindex: '-1' } });
    const W = 320, H = 200, svg = svgA(ov, 'svg', { viewBox: `0 0 ${W} ${H}`, class: 'gq-fest-sv', 'aria-hidden': 'true' });
    const holder = svgA(svg, 'g', { transform: 'translate(160 26) scale(1.2)' }); const sg = statueSvg(holder, st.k);
    const txt = ov.createDiv('gq-fest-txt');
    txt.createDiv({ cls: 'gq-fest-gr', text: st.line[0], attr: { lang: 'el' } });
    txt.createDiv({ cls: 'gq-fest-en', text: `${st.line[1]} You finished ${st.en}.` });
    txt.createDiv({ cls: 'gq-fest-tap', text: 'Tap to go on' });
    let done = false; const close = () => { if (done) return; done = true; ov.addClass('is-out'); setTimeout(() => ov.remove(), 350); document.removeEventListener('keydown', key, true); };
    const key = e => { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); close(); } };
    ov.onclick = close; document.addEventListener('keydown', key, true); ov.focus();
    gqSound('sting'); setTimeout(() => { if (!done) say(st.line[0]); }, 900);
    if (reduce) { setTimeout(close, 6000); return; }
    setTimeout(() => { if (!done) sg.classList.add('is-gag', 'gag-' + st.k); }, 700);
    setTimeout(close, 7000);
  }
  // The big moment, kept rare: a dance learned, a week's homework sent, the whole alphabet, the first 50 green words.
  // The whole screen becomes the square at night, the prints light up one by one, a dancer (a placeholder until the mascots are chosen)
  // dances across them, and one Greek line is said. Tap anywhere to go on. Calm mode and reduced motion get the finished picture, still.
  festScene(big) {
    if (document.querySelector('.gq-fest')) return;
    const k = big.k && DANCE_NAME[big.k] && (DANCE_FEET[big.k] !== undefined) ? big.k : big.k ? 'kalamatianos' : 'syrtos';
    const reduce = (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) || this.calmOn();
    const ov = document.body.createDiv({ cls: 'gq-fest' + (reduce ? ' is-still' : ''), attr: { role: 'dialog', 'aria-label': big.en, tabindex: '-1' } });
    ov.addClass('gq-fest-page'); const cv = ov.createEl('canvas', { cls: 'gq-spr gq-fest-spr', attr: { 'aria-hidden': 'true' } });
    const pose = p => sprPaint(cv, sprRows('dance', 0, p)); pose(reduce ? 'up' : 'still');
    const txt = ov.createDiv('gq-fest-txt');
    txt.createDiv({ cls: 'gq-fest-gr', text: big.gr, attr: { lang: 'el' } });
    txt.createDiv({ cls: 'gq-fest-en', text: big.en });
    txt.createDiv({ cls: 'gq-fest-tap', text: 'Tap to go on' });
    let done = false, raf = 0; const close = () => { if (done) return; done = true; cancelAnimationFrame(raf); ov.addClass('is-out'); setTimeout(() => ov.remove(), 350); document.removeEventListener('keydown', key, true); };
    const key = e => { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); close(); } };
    ov.onclick = close; document.addEventListener('keydown', key, true); ov.focus();
    gqSound('sting'); setTimeout(() => { if (!done) say(big.gr); }, 700);
    if (!reduce) txt.style.visibility = 'hidden';
    if (reduce) { setTimeout(close, 6000); return; }
    // A still beat, then the spin: each pose for its time, the slap with a step sound, and the words when the arms go up.
    const SPIN = [['out', 160], ['stepR', 160], ['lift', 160], ['back', 160], ['out', 160], ['stepR', 160], ['lift', 160], ['back', 160], ['out', 260], ['slap', 650], ['up', 0]];
    let t = 700; for (const [p, ms] of SPIN) { setTimeout(() => { if (done || !ov.isConnected) return; pose(p); if (p === 'slap') gqSound('step'); if (p === 'up') txt.style.visibility = ''; }, t); t += ms; }
    setTimeout(close, t + 5200);
  }
  // ---------- Your friend: one small sprite in the corner of every screen ----------
  // Before the tour is done the corner holds the Tour button. Finishing the tour plants your friend there as a treat,
  // and from then on it grows (or dances) with every φόρα point. Tap it for the numbers.
  reduceOn() { return (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) || this.calmOn(); }
  // The picture of your friend right now. h is its height in CSS pixels.
  // preview: the grown picture, for choosing.
  friendArt(parent, h, preview) {
    const w = this.worldKey(), days = this.moData().days, m = this.moScore(days, new Date()), todayPts = +(days || {})[ymd(new Date())] || 0;
    if (w === 'gallery') {
      const g = galleryNow(this.moData().chisel), s = g.s, p = Math.min(1, g.strokes / Math.max(1, g.cost));
      const svg = svgA(parent, 'svg', { viewBox: '-36 -6 72 124', class: 'gq-spr gq-spr-svg', role: 'img', 'aria-label': `${s.gr}, ${s.en}` }); svg.style.height = h + 'px';
      const hold = svgA(svg, 'g', {}); statueSvg(hold, s.k);
      const blk = svgA(svg, 'rect', { x: -32, y: -2, width: 64, height: preview ? 0 : Math.round(116 * (1 - p)), rx: 3, fill: '#d3c9b6', stroke: '#b3a690', 'stroke-width': 0.8 });
      return { el: svg, key: 'g' + g.i + '.' + g.round, name: [s.gr, s.en], m, paint: r => { hold.style.clipPath = r < 1 ? `inset(${Math.round((1 - r) * 100)}% 0 0 0)` : ''; blk.style.clipPath = hold.style.clipPath; } };
    }
    const cv = parent.createEl('canvas', { cls: 'gq-spr', attr: { role: 'img' } }); cv.style.height = h + 'px';
    if (w === 'pet') {
      const st = preview ? { f: 0.5, era: 1 } : worldStage(this.growNow(), W_PTS), mood = preview ? 2 : worldMood(todayPts, m), nm = st.f === 0 ? ['το αυγό', 'the egg'] : ['το Φοράκι', 'Foraki, your pet'];
      cv.width = 36; cv.height = 34; cv.setAttr('aria-label', nm.join(', '));
      const paint = (r, t) => { const ctx = cv.getContext('2d'); if (!ctx) return; ctx.clearRect(0, 0, 36, 34); const top = Math.floor(34 * (1 - (r === undefined ? 1 : r)));
        const R = (x, y, ww, hh, c) => { x -= 62; y -= 13; const y0 = Math.max(y, top); if (y0 >= y + hh) return; ctx.fillStyle = c === '#fff' ? '#8a8a8a' : c; ctx.fillRect(x, y0, ww, y + hh - y0); };
        petPaint(R, st, mood, t || 0.3, (n, e, f) => f(), []); };
      paint(1); return { el: cv, key: 'p' + st.era + (st.f ? 1 : 0), name: nm, m, paint };
    }
    let rows, nm, key;
    if (w === 'olive') { const st = worldStage(this.growNow(), W_PTS), f = preview ? 13 : oliveFrame(st.idx); rows = sprRows('olive', f); nm = OLIVE_NAMES[f]; key = 'o' + f; }
    else if (w === 'dance') { rows = sprRows('dance'); nm = ['ο χορευτής', 'the dancer']; key = 'd'; }
    else { const st = worldStage(this.growNow(), W_PTS), f = preview ? 4 : [2, 4, 8, 14, 20].filter(x => st.idx >= x).length; rows = sprRows(w, f); nm = SPR_NAMES[w][f]; key = w + f; }
    cv.setAttr('aria-label', nm.join(', '));
    const paint = (r, pose) => sprPaint(cv, pose ? sprRows('dance', 0, pose) : rows, r);
    paint(1); return { el: cv, key, name: nm, m, paint, dance: w === 'dance' };
  }
  // A short dance: the steps, the slap, arms up.
  friendDance(a) { if (!a.dance || this.reduceOn()) return; let t = 0; for (const [p, ms] of SPR_DANCE) { setTimeout(() => { if (a.el.isConnected) { a.paint(1, p); if (p === 'slap') gqSound('step'); } }, t); t += ms; } }
  // Up out of the ground, a row at a time.
  friendGrow(a, ms, done) {
    if (this.reduceOn()) { a.paint(1); if (done) done(); return; }
    const t0 = performance.now(); const step = now => { const r = Math.min(1, (now - t0) / ms); a.paint(r); if (r < 1 && a.el.isConnected) requestAnimationFrame(step); else if (done) done(); }; requestAnimationFrame(step);
  }
  async tourEnd() { if (this.progFm().tour_end) return; const f = await this.progressFile(); await this.app.fileManager.processFrontMatter(f, fm => { if (!fm.tour_end) fm.tour_end = ymd(new Date()); }); this.tourEndNow = true; setTimeout(() => this.cornerSync(), 400); }
  friendOn() { return !!(this.tourEndNow || this.progFm().tour_end || (this.tourState().at !== undefined && this.tourLeft() === 0)); }
  cornerSync() {
    if (this.unloaded) return;
    if (this.cornerBusy) { clearTimeout(this.cornerRetry); this.cornerRetry = setTimeout(() => this.cornerSync(), 3300); return; }
    let el = document.querySelector('.gq-corner'); if (!el) el = document.body.createDiv({ cls: 'gq-corner' });
    // The tour card sits at the bottom of the screen; the corner steps aside while it is open.
    el.toggleClass('is-hidden', !!document.querySelector('.gq-tour'));
    if (!this.friendOn()) {
      if (el.hasClass('is-inline')) { el.removeClass('is-inline'); document.body.appendChild(el); el.dataset.mode = ''; }
      if (el.dataset.mode !== 'none') { el.empty(); el.dataset.mode = 'none'; }
      return;
    }
    const last = this.cornerLast, firstTime = !this.lsGet('planted', 0);
    el.empty(); el.dataset.mode = 'friend';
    // The olive tree sits at the top right of Today, below the header line, and scrolls with the page. Other screens leave it out.
    { const td = [...document.querySelectorAll('.gq-today')].find(x => x.isConnected && x.getClientRects().length); if (td) { if (el.parentElement !== td || td.firstElementChild !== el) td.prepend(el); el.addClass('is-inline'); el.toggleClass('is-hidden', !!document.querySelector('.gq-tour')); } else el.addClass('is-hidden'); }
    const b = el.createEl('button', { cls: 'gq-corner-friend' }); const a = this.friendArt(b, 56);
    b.setAttr('aria-label', `${a.name[0]}, ${a.name[1]}. φόρα ${a.m}. Open`);
    b.onclick = () => { this.friendDance(a); say(a.name[0]); this.moPop(); };
    this.cornerLast = { m: a.m, key: a.key, w: this.worldKey() };
    if (firstTime) {
      // The treat for finishing the tour: a little mound, then your friend comes up out of it.
      this.lsSet('planted', 1); this.cornerBusy = true; setTimeout(() => { this.cornerBusy = false; }, 3200); el.addClass('is-plant'); a.paint(0); gqSound('tink');
      setTimeout(() => this.friendGrow(a, 1300, () => { el.removeClass('is-plant'); gqSound('sting'); say(a.name[0]); this.friendDance(a); }), 500);
      return;
    }
    if (!last || last.w !== this.cornerLast.w) return;
    if (a.m > last.m) {
      const up = el.createSpan({ cls: 'gq-corner-up', text: '+' + (a.m - last.m), attr: { 'aria-hidden': 'true' } }); setTimeout(() => up.remove(), 1500);
      if (last.key !== a.key) { a.paint(0); this.friendGrow(a, 900, () => gqSound('sting')); }
      else if (a.dance) this.friendDance(a);
      else if (!this.reduceOn()) { b.addClass('is-up'); setTimeout(() => b.removeClass('is-up'), 700); }
    }
  }
  // Tap your friend: φόρα in a card in front of the page.
  moPop() { this.pop('Πάρε φόρα', [{ label: '', build: el => { const c = el.createDiv('gq-mo gq-mo-pop'); this.moDraw(c); } }]); }
  // Choose your friend: one question, three answers, once. Grown-ups first say how far they want to go this year.
  friendPick(tip, kids) {
    const fm = this.progFm(), box = tip.createDiv('gq-friend-pick');
    const easy = [['grove', 'A plant', 'grows with you'], ['pet', 'A pet', 'hatches and grows'], ['dance', 'A dancer', 'learns a dance']];
    const big = [['gyro', 'A gyro shop', 'from the spit to the shop'], ['village', 'A house', 'built stone by stone'], ['gallery', 'A statue', 'carved stroke by stroke']];
    const three = list => { box.empty(); const r = box.createDiv('gq-friend-row');
      for (const [k, t, d] of list) { const b = r.createEl('button', { cls: 'gq-friend' + (this.worldKey() === k && fm.world ? ' is-on' : '') }); const pic = b.createDiv('gq-friend-pic');
        const keep = this.worldNow; this.worldNow = k; this.friendArt(pic, 40, true); this.worldNow = keep;
        b.createDiv({ cls: 'gq-friend-t', text: t }); b.createDiv({ cls: 'gq-hint', text: d });
        b.onclick = () => { this.setWorld(k); r.querySelectorAll('.gq-friend').forEach(x => x.removeClass('is-on')); b.addClass('is-on'); }; } };
    if (kids) return three(easy);
    if (fm.fiay !== undefined || fm.pace || fm.world || this.friendAsked) return three(fm.fiay ? big : easy);
    box.createDiv({ cls: 'gq-tour-q', text: 'How far this year?' });
    const r = box.createDiv('gq-row');
    const c1 = r.createEl('button', { text: 'Casual: a little each day' }); c1.onclick = () => { this.friendAsked = true; three(easy); };
    const c2 = r.createEl('button', { text: 'Fluent in a Year', cls: 'mod-cta' }); c2.onclick = () => { this.friendAsked = true; this.setFiay(true); three(big); };
  }
  // The card at the top of Today. The same question the teacher asks in class.
  moCard(box) {
    const c = box.createDiv('gq-tcard gq-mo'); c.dataset.tour = 'mo'; this.moEl = c; this.moDraw(c);
  }
  // Redraw every φόρα card on screen. Obsidian can build Today twice at once, so a single saved element
  // may be the copy that was thrown away; points and a new world would then land where nobody sees them.
  moPaint() { const els = new Set([...document.querySelectorAll('.gq-mo')]); if (this.moEl && this.moEl.isConnected) els.add(this.moEl); for (const c of els) this.moDraw(c); this.cornerSync(); }
  moDraw(c) {
    c.empty(); const { days } = this.moData(), now = new Date(), m = this.moScore(days, new Date());
    // Before the first point: one quiet line. The full card (world, bars) arrives with the first φόρα.
    if (!Object.keys(days || {}).length) {
      c.addClass('is-fresh'); const top = c.createDiv('gq-mo-top');
      const q = top.createDiv({ cls: 'gq-mo-q gq-say', text: 'Πάρε φόρα', attr: { lang: 'el', role: 'button', 'aria-label': 'Hear it' } }); q.onclick = () => say('Πάρε φόρα');
      top.createDiv({ cls: 'gq-mo-n', text: '0', attr: { 'aria-label': 'Momentum 0' } });
      this.worldDraw(c, 0, 0);
      { const d = c.createEl('details', { cls: 'gq-mo-how' }); d.createEl('summary', { text: 'How φόρα works' });
        d.createDiv({ cls: 'gq-hint', text: 'φόρα means momentum. Every point helps your olive tree grow: olives, then oil, then a lamp.' }); }
      return;
    }
    c.removeClass('is-fresh');
    const wk = new Date(); wk.setDate(wk.getDate() - 7); const gain = m - this.moScore(days, wk), todayPts = +days[ymd(now)] || 0;
    const top = c.createDiv('gq-mo-top');
    const q = top.createDiv({ cls: 'gq-mo-q gq-say', text: 'Πάρε φόρα', attr: { lang: 'el', role: 'button', 'aria-label': 'Hear it' } }); q.onclick = () => say('Πάρε φόρα');
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
      ...(this.worldKey() === 'gallery' ? ['Every point is also a chisel stroke on the statue you are carving. Strokes add up across days, and each statue takes a few more than the last.'] : []),
      ...(this.worldKey() === 'dance' ? ['Every point is also a step (βήμα) toward the dance you are learning. Steps add up across days: ο συρτός has 6, ο καλαματιανός 12, and later dances take 2 or 3 points a step.'] : [])]) ul.createEl('li', { text: t });
    if (this.worldKey()) { const li = ul.createEl('li'); li.appendText(this.worldKey() === 'dance' ? 'Your dance floor grows with every point and never shrinks. ' : (this.worldKey() === 'olive' ? 'Your olive grows with every φόρα point and never shrinks: the tree, its olives, a bottle of oil, then a lamp that burns brighter. ' : 'Your world grows with every φόρα point and never shrinks. ')); if (FRIENDS_ON) { const ch = li.createEl('a', { text: 'Change my world', href: '#' }); ch.onclick = e => { e.preventDefault(); this.setWorld(''); }; } }
  }
  // ---------- Card practice (was Paper round): the app keeps the schedule, the paper cards do the work ----------
  // Red pile every day, yellow every other day, green on Sundays. A card with no color yet sits in the red pile.
  paperPiles(dd) {
    const dow = new Date().getDay(), piles = ['red']; if (((dd % 2) + 2) % 2 === 0) piles.push('yellow'); if (dow === 0) piles.push('green');
    const by = { red: [], yellow: [], green: [] }; for (const w of this.cards()) by[this.colorOf(w) || 'red'].push(w);
    return { piles, by, list: piles.flatMap(k => by[k].map(w => [w, k])) };
  }
  // Log many paper cards at once: this week's words to tap, or the Greek typed or said (commas or one per line). No limit.
  paperLog() {
    this.pop('Log paper cards', [{ label: '', build: async (el, api) => {
      el.createDiv({ cls: 'gq-hint', text: 'Made cards today? Log them all, as many as you made: 5, 10, 20.' });
      const W = await this.wordIndex(), have = new Set(this.cards()), pick = new Set();
      const wk = [...new Set((this.todayPlay || []).map(x => x.word || x.label).filter(w => w && !have.has(w)))];
      let go = null; const count = () => { if (go) go.setText(`Log ${found().length || ''} card${found().length === 1 ? '' : 's'}`.replace('  ', ' ')); };
      if (wk.length) { el.createDiv({ cls: 'gq-tsub', text: 'This week\'s words' }); const ch = el.createDiv('gq-chips');
        for (const w of wk) { const b = ch.createEl('button', { text: w, cls: 'gq-mini', attr: { lang: 'el', 'aria-pressed': 'false' } }); b.onclick = () => { pick.has(w) ? pick.delete(w) : pick.add(w); b.toggleClass('mod-cta', pick.has(w)); b.setAttr('aria-pressed', String(pick.has(w))); count(); }; } }
      el.createDiv({ cls: 'gq-tsub', text: 'Or type them, or tap the keyboard mic and say them' });
      const ta = el.createEl('textarea', { cls: 'gq-input', attr: { rows: '3', lang: 'el', placeholder: 'νερό, καφές, ψωμί', autocapitalize: 'off', autocomplete: 'off', spellcheck: 'false' } });
      const ART = /^(ο|η|το|οι|τα|ένας|μια|μία|ένα)\s+/i;
      const match = t => { const k = fold(t.replace(ART, '')); return k ? W.find(w => w.k === k) || W.find(w => w.fk.includes(k)) : null; };
      const parse = () => { const ok = [], miss = [];
        for (const piece of ta.value.split(/[,;\n·]+/).map(x => x.trim().replace(/[.!?]+$/, '')).filter(Boolean)) {
          const m = match(piece); if (m) { ok.push(m.word); continue; }
          // Said without commas (the keyboard mic leaves them out): try each word on its own.
          const toks = piece.split(/\s+/).filter(x => x && !/^(ο|η|το|οι|τα|και)$/i.test(x)); let any = false;
          for (const x of toks) { const mm = match(x); if (mm) { ok.push(mm.word); any = true; } else if (toks.length > 1) miss.push(x); }
          if (!any && toks.length <= 1) miss.push(piece);
        }
        return { ok, miss }; };
      const found = () => [...new Set([...pick, ...parse().ok])];
      ta.oninput = count;
      const r = el.createDiv('gq-row'), out = el.createDiv('gq-hint');
      go = r.createEl('button', { text: 'Log cards', cls: 'mod-cta' });
      go.onclick = async () => {
        const list = found(), miss = parse().miss; if (!list.length) { out.setText(miss.length ? `Not found in the words: ${miss.join(', ')}. Check the spelling.` : 'Tap a word or type one first.'); return; }
        const f = await this.progressFile(), t = ymd(new Date()); let fresh = [];
        await this.app.fileManager.processFrontMatter(f, fm => { const cur = Array.isArray(fm.cards) ? fm.cards.map(String) : []; fresh = list.filter(w => !cur.includes(w)); fm.cards = [...cur, ...fresh];
          const lg = fm.cards_log && typeof fm.cards_log === 'object' ? fm.cards_log : {}; lg[t] = (+lg[t] || 0) + fresh.length; fm.cards_log = lg; });
        this.cardsNow = null; for (const w of fresh) this.moAdd('card', w);
        r.empty(); ta.remove(); el.querySelectorAll('.gq-chips, .gq-tsub').forEach(x => x.remove());
        out.setText(`${fresh.length} logged${list.length > fresh.length ? ` (${list.length - fresh.length} already logged)` : ''}. Each goes in the pile of its color, red if it has none yet.${miss.length ? ` Not found: ${miss.join(', ')}.` : ''}`);
        const d = r.createEl('button', { text: 'Done', cls: 'mod-cta' }); d.onclick = () => { api.close(); this.refreshToday && this.refreshToday(); };
        const more = r.createEl('button', { text: 'Log more', cls: 'gq-mini' }); more.onclick = () => { api.close(); this.paperLog(); };
      };
    } }]);
  }
  // Card practice: however many cards and minutes you did, logged with two taps. No timer, no limit.
  // φόρα: 1 for every 5 cards and 1 for every 5 minutes, up to 10 a day from card practice.
  cpToday() { const v = String((this.cpNow || this.progFm().card_practice || {})[ymd(new Date())] || '0|0|0').split('|').map(x => +x || 0); return { cards: v[0], min: v[1], pts: v[2] }; }
  async cpLog(cards, min) {
    const f = await this.progressFile(), t = ymd(new Date()); let gain = 0, now = null;
    await this.app.fileManager.processFrontMatter(f, fm => {
      const cp = fm.card_practice && typeof fm.card_practice === 'object' ? fm.card_practice : {};
      const [c0, m0, p0] = String(cp[t] || '0|0|0').split('|').map(x => +x || 0), c1 = c0 + cards, m1 = m0 + min;
      const p1 = Math.min(10, Math.floor(c1 / 5) + Math.floor(m1 / 5)); gain = Math.max(0, p1 - p0);
      cp[t] = `${c1}|${m1}|${Math.max(p0, p1)}`; fm.card_practice = cp; now = { ...cp };
    });
    this.cpNow = now; setTimeout(() => { this.cpNow = null; }, 3000);
    while (gain > 0) { const g = Math.min(5, gain); this.moAdd('did', 'cp:' + Date.now() + ':' + gain, g); gain -= g; }
  }
  paperCard(box, dd) {
    const n = this.cards().length; if (!n && !this.colors().setup_seen && this.tourState().at === undefined) return;
    const c = box.createDiv('gq-tcard gq-paper'); c.dataset.tour = 'paper';
    const h = c.createDiv('gq-thead'); h.createEl('strong', { text: 'Card practice' });
    if (n) h.createSpan({ cls: 'gq-hint', text: ` · ${n} card${n === 1 ? '' : 's'} logged` });
    const td = this.cpToday(), sum = () => { const x = this.cpToday(); return x.cards || x.min ? `Today: ${x.cards} cards, ${x.min} min.` : ''; };
    const line = c.createDiv({ cls: 'gq-hint gq-cp-sum', text: sum() || 'Practiced with your paper cards? Tap how many, and for how long.' });
    let pc = 0, pm = 0; const grp = (label, vals, unit, set) => {
      const r = c.createDiv('gq-cp-row'); r.createSpan({ cls: 'gq-cp-l', text: label }); const bs = [];
      for (const v of vals) { const b = r.createEl('button', { text: String(v), cls: 'gq-mini', attr: { 'aria-label': `${v} ${unit}`, 'aria-pressed': 'false' } });
        b.onclick = () => { const on = !b.hasClass('mod-cta'); bs.forEach(x => { x.removeClass('mod-cta'); x.setAttr('aria-pressed', 'false'); }); if (on) { b.addClass('mod-cta'); b.setAttr('aria-pressed', 'true'); } set(on ? v : 0); paint(); }; bs.push(b); }
      return bs; };
    const cb = grp('Cards', [5, 10, 15, 20, 30], 'cards', v => { pc = v; }), mb = grp('Minutes', [5, 10, 15, 20, 30], 'minutes', v => { pm = v; });
    const r = c.createDiv('gq-row'), go = r.createEl('button', { text: 'Log it', cls: 'mod-cta' });
    const paint = () => { go.disabled = !pc && !pm; const p = Math.floor(pc / 5) + Math.floor(pm / 5); go.setText(pc || pm ? `Log it · +${Math.min(p, Math.max(0, 10 - this.cpToday().pts))} φόρα` : 'Log it'); };
    go.onclick = async () => { await this.cpLog(pc, pm); pc = pm = 0; [...cb, ...mb].forEach(x => { x.removeClass('mod-cta'); x.setAttr('aria-pressed', 'false'); }); line.setText(sum() + ' Μπράβο.'); paint(); };
    paint();
    // The guided round stays, for anyone who wants the app to call out the cards.
    const more = c.createDiv('gq-hint gq-cp-more');
    if (n) {
      const { piles, by, list } = this.paperPiles(dd), pf = this.app.vault.getAbstractFileByPath(PROGRESS), done = (this.paperDone || String(((pf && this.app.metadataCache.getFileCache(pf)) || {}).frontmatter?.paper_done || '')) === ymd(new Date());
      const tp = piles.filter(k => by[k].length);
      if (list.length && !done) { more.appendText(`Today's piles: ${tp.join(' and ')}, ${list.length} cards. `); const a = more.createEl('a', { text: 'Call them out for me', href: '#' }); a.onclick = e => { e.preventDefault(); new PaperModal(this.app, this, list).open(); }; more.appendText(' · '); }
    }
    const nw = more.createEl('a', { text: 'Made new cards? Add the words', href: '#' }); nw.onclick = e => { e.preventDefault(); this.paperLog(); };
    if (this.app.vault.getAbstractFileByPath(CARD_IDEAS)) { more.appendText(' · '); const a = more.createEl('a', { text: 'How paper cards work', href: '#' }); a.onclick = e => { e.preventDefault(); this.openNote(CARD_IDEAS); }; }
  }
  async setColor(word, color) {
    const was = this.colorOf(word), R = { '': 0, red: 1, yellow: 2, green: 3 };
    if (R[color || ''] > R[was]) this.moAdd('up', word); else if (R[color || ''] < R[was]) this.moAdd('down', word);
    const f = await this.progressFile();
    await this.app.fileManager.processFrontMatter(f, fm => {
      for (const [k] of COLORS) { fm[k] = (Array.isArray(fm[k]) ? fm[k] : []).map(String).filter(w => w !== word); }
      if (color) fm[color].push(word);
      // Spaced review for words: a new color restarts the word's schedule from today.
      const on = fm.color_on && typeof fm.color_on === 'object' ? fm.color_on : {}; on[word] = ymd(new Date()); fm.color_on = on;
      if (fm.word_review && typeof fm.word_review === 'object') delete fm.word_review[word];
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
    const star = bar.createEl('button', { cls: 'gq-star', attr: { 'aria-label': 'Star this word (favorite)' } }); star.onclick = () => this.setStar(word, !this.starred(word));
    const hear = bar.createEl('button', { text: 'Hear it', attr: { 'aria-label': 'Say the word' } }); hear.onclick = () => say(word);
    const web = bar.createEl('button', { text: 'Word web', attr: { 'aria-label': 'See the words that go with it' } }); web.onclick = () => this.openGraph(ctx.sourcePath);
    const mo = bar.createEl('button', { text: 'More ›', attr: { 'aria-label': 'More on this word: pairs, games, scripts' } }); mo.onclick = () => this.showMore();
    const card = this.isKids ? null : bar.createEl('button', { text: 'On paper', cls: 'gq-card-btn', attr: { 'aria-label': 'I made a paper card for this word' } }); card && (card.onclick = () => this.setCard(word, !this.cards().includes(word)));
    // The colors get their own row, so the three choices read as one question.
    const grp = bar.createDiv({ cls: 'gq-colors', attr: { role: 'group', 'aria-label': 'How well do you know it?' } });
    const btns = COLORS.map(([k, label]) => { const b = grp.createEl('button', { text: label, cls: 'gq-c gq-' + k }); b.onclick = () => this.setColor(word, this.colorOf(word) === k ? '' : k); return [k, b]; });
    const photo = createDiv('gq-card-row'); bar.after(photo);
    const rec = { word, btns, el: bar, card, photo, star }; this.bars.add(rec); this.paintBar(rec);
    // Hear it taught: the Language Transfer track where this word first comes up. One quiet line.
    const tn = !this.isKids && LT_FIRST[word];
    if (tn) { const l = createDiv('gq-hint gq-lt-card'); photo.after(l); l.appendText('Hear it taught: '); const a = l.createEl('a', { text: `Language Transfer, track ${tn}`, href: ltTrackUrl(tn) });
      a.onclick = e => { e.preventDefault(); this.ltOpen(tn); }; l.appendText(' (free audio)'); }
  }
  // "Appears in scripts" on a word: each lesson's book reading on its own line under it.
  bookUnits(el, ctx) {
    if (this.isKids || !ctx || !ctx.sourcePath || !ctx.sourcePath.startsWith('Words/')) return;
    for (const li of el.querySelectorAll('li')) {
      if (li.querySelector('.gq-book-u')) continue;
      const beg = new Set(), comp = new Set();
      for (const a of li.querySelectorAll('a.internal-link')) {
        const m = /(?:^|\/)([LI]\d\d) .*-student/.exec(a.getAttribute('data-href') || a.getAttribute('href') || ''); const u = m && BOOK_UNITS[m[1]];
        if (u) { if (u[0]) beg.add(u[0]); if (u[1]) comp.add(u[1]); }
      }
      const byUnit = x => [...x].sort((p, q) => parseInt(p.slice(5)) - parseInt(q.slice(5))).join(', ');
      const parts = [beg.size ? `Beginners' Greek ${byUnit(beg)}` : '', comp.size ? `Complete Greek ${byUnit(comp)}` : ''].filter(Boolean); if (!parts.length) continue;
      li.createDiv({ cls: 'gq-hit-sub gq-book-u', text: 'Read it in ' + parts.join(' · ') });
    }
  }
  paintBar(rec) {
    const c = this.colorOf(rec.word); for (const [k, b] of rec.btns) { b.toggleClass('is-on', c === k); b.setAttr('aria-pressed', String(c === k)); }
    if (rec.star) { const s = this.starred(rec.word); rec.star.setText(s ? '★ Starred' : '☆ Star'); rec.star.toggleClass('is-on', s); rec.star.setAttr('aria-pressed', String(s)); }
    if (!rec.card) return; const on = this.cards().includes(rec.word); rec.card.toggleClass('is-on', on); rec.card.setAttr('aria-pressed', String(on));
    this.paintPhoto(rec, on);
  }
  async paintPhoto(rec, on) {
    const row = rec.photo, ad = this.app.vault.adapter, p = this.cardPhoto(rec.word); row.empty(); if (!on) return;
    if (await ad.exists(p)) {
      const img = row.createEl('img', { cls: 'gq-card-img', attr: { alt: 'Your card for ' + rec.word, src: (u => u.startsWith('data:') || !this.photoT ? u : u + (u.includes('?') ? '&' : '?') + this.photoT)(ad.getResourcePath(p)) } });
      const r = row.createEl('a', { text: 'New photo', href: '#', cls: 'gq-hint' }); r.onclick = e => { e.preventDefault(); this.pickPhoto(rec.word, () => this.paintPhoto(rec, true)); };
      img.onclick = () => img.toggleClass('is-big', !img.hasClass('is-big'));
      row.appendText(' · '); const sd = row.createEl('a', { text: 'Send to teacher', href: '#', cls: 'gq-hint' }); sd.onclick = e => { e.preventDefault(); this.sendCard(rec.word); };
      if (this.app.vault.getAbstractFileByPath(CARD_IDEAS)) { row.appendText(' · '); const ci = row.createEl('a', { text: 'Card ideas', href: '#', cls: 'gq-hint' }); ci.onclick = e => { e.preventDefault(); this.openNote(CARD_IDEAS); }; }
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
  // What a story word means: the small words from PH_FUNC, the rest from the week's word lists (matched on the start of the word).
  storyGloss(beats) {
    if (this.glossFn && this.glossFor === beats) return this.glossFn;
    const ent = [], verbs = [];
    for (const b of Object.values(beats || {})) for (const w of b.words || []) {
      if (!w.en) continue; const base = fold((w.label || w.word).replace(/^(ο|η|το|οι|τα|τον|την)\s+/i, '').split(/[ ,]/)[0]);
      if (base.length < 2) continue; ent.push({ st: base.length > 4 ? base.slice(0, base.length - 2) : base, base, len: base.length, en: w.en, wk: +b.week || 0 });
      // Verbs: έχω also covers έχεις, έχει, έχουμε, έχετε, έχουν; μιλάω covers μιλάς, μιλάει, μιλάμε...
      if (/ω$/.test(base) && base.length >= 3) verbs.push({ st: base.replace(/αω$/, '').replace(/ω$/, ''), base, gr: (w.label || w.word), en: w.en, wk: +b.week || 0 });
    }
    const NAMES = new Set('μαρια ελενη νικοσ νικο νικε γιωργοσ γιωργο κωστασ κωστα σοφια δημητρη δημητρησ ανδρεασ ανδρεα ελλη'.split(' '));
    const VEND = /^(ω|εισ|ει|ουμε|ετε|ουν|ουνε|ασ|αει|αμε|ατε|ανε|αν|αω|εσ|ε|α|αμε|ουσ)$/;
    ent.sort((a, b) => b.st.length - a.st.length);
    this.glossFor = beats;
    return this.glossFn = tok => {
      const raw = String(tok || '').toLowerCase().replace(/['’]$/, ''), f = fold(raw); if (!f) return '';
      if (raw === 'ή') return 'or';
      if (PH_FUNC[f]) return PH_FUNC[f];
      const vm = this.verbMap && this.verbMap[raw], f2 = vm ? fold(vm) : f;
      if (NAMES.has(f)) return 'a name';
      const v = verbs.filter(x => f2.startsWith(x.st) && VEND.test(f2.slice(x.st.length))).sort((a, b) => a.wk - b.wk)[0];
      if (v) return f2 === v.base ? v.en : `a form of ${v.gr}: ${v.en}`;
      // A word can have two meanings (καφέ is coffee, and brown): show up to two, the earlier-learned first.
      const hits = ent.filter(x => f === x.base || (f.startsWith(x.st) && f.length - x.st.length <= 4 && (x.st.length >= 3 || f === x.st))).sort((a, b) => a.wk - b.wk);
      return [...new Set(hits.map(x => x.en))].slice(0, 2).join(' or ');
    };
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
    const wk = this.storyWeeks(beats).find(w => w.week === b.week), wt = wk && wk.title ? wk.title.replace(/\bWhats\b/g, "What's") : '';
    head.createEl('strong', { text: `Day ${idx + 1}` });
    head.createSpan({ cls: 'gq-hint', text: `  · Week ${b.week}${wt ? ': ' + wt : ''}` });
    this.storyEl = card; this.storyInfo = { due: !finished && at < cal, part: idx + 1 };
    // Fluent in a Year is a pace, not more words: the same story, one day a day. A quiet line says where you are against it.
    if (col.fiay && !finished) {
      const due = days.filter(k => k <= cal).length, gap = due - doneN, pl = card.createDiv('gq-hint gq-pace');
      pl.appendText('Fluent in a Year · ' + (gap === 1 ? 'on pace' : gap > 1 ? `${gap - 1} day${gap > 2 ? 's' : ''} behind` : gap === 0 ? 'done for today' : `${-gap} day${gap < -1 ? 's' : ''} ahead`));
      this.addMore(card, ['Fluent in a Year: change the pace', () => { const p = this.fyPace || {}; this.fyPicker(pl, p.fw || 1, p.own); }]);
    }
    // Language Transfer alongside: one quiet line with the next track, and the tracks that explain this lesson's grammar.
    if (col.lt && !this.isKids && !(this.cyc && (this.cyc.kind === 'lt' || this.cyc.kind === 'both')) && col.lt_track < LT_MAX) {
      const nx = col.lt_track + 1;
      this.addMore(card, [`Play Language Transfer track ${nx}`, () => { this.ltAfterFn = null; this.ltPlay(card, nx, card.querySelector('.gq-dpath')); }]);
      this.addMore(card, ['Language Transfer: set my track', () => this.ltPicker(card, col)]);
    }
    // How long a part really takes this student: from the first tap to the last sentence.
    card.addEventListener('pointerdown', () => { if (!this.tStory) this.tStory = Date.now(); }, true);
    // The week as a short path: one dot a day, today's is the big one.
    const wdays = days.filter(k => beats[k].week === b.week), path = card.createDiv({ cls: 'gq-dpath', attr: { 'aria-label': `${doneN} of ${days.length} days done` } });
    for (const k of wdays) path.createSpan({ cls: 'gq-dpath-d' + (k <= at ? ' is-done' : '') + (k === n ? ' is-now' : '') });
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
    this.convoGloss = this.storyGloss(beats); this.loadVerbs();
    // The day in four steps: the scene, the words, build it, say it. The last day of a week also plays the whole week.
    const wwords = [...new Set(wdays.flatMap(k => (beats[k].words || []).map(w => w.word)).filter(Boolean))];
    this.cvSteps = { n, day: idx + 1, weekEnd: n === wdays[wdays.length - 1], wwords };
    this.convoGame(card, turns, n, b.words, at >= n, pool, () => { if (this.tStory) { this.timeRec('story', (Date.now() - this.tStory) / 1000); this.tStory = 0; } this.markDone('story'); return this.setStory(Math.max(n, this.colors().story_at || 0)); }, next, finished);
    this.cardMore(card, () => [this.sceneSkip && ['Skip the scene', this.sceneSkip]]);
    this.addMore(card, [doneN ? 'Start somewhere else' : 'Start further in the story', e => this.startMenu(e, beats)]);
    return b;
  }
  // One sentence at a time: the Greek on top, the English built underneath from word tiles (tap or drag). Then the next sentence opens.
  convoGame(card, turns, n, words, done, pool, onDone, next, last) {
    const key = 'gq-convo-' + this.app.vault.getName() + '-' + n; let store = null; try { store = window.localStorage; } catch (e) {}
    let saved = null; try { saved = store && store.getItem(key); } catch (e) {} if (saved === undefined) saved = null;
    // Saved as the number of lines done (older saves) or {i, again}: again = lines solved with a lot of guessing, played once more at the end.
    let i = 0, again = [];
    if (saved === null) i = done ? turns.length : 0;
    else { let o = null; try { o = JSON.parse(saved); } catch (e) {} if (o && typeof o === 'object') { i = +o.i || 0; again = Array.isArray(o.again) ? o.again.filter(k => Number.isInteger(k) && k >= 0 && k < turns.length) : []; } else i = +saved || 0; }
    const order = () => [...turns.keys(), ...again]; i = Math.min(i, order().length);
    const save = () => { try { if (store) store.setItem(key, again.length ? JSON.stringify({ i, again }) : String(i)); } catch (e) {} };
    const gloss = this.convoGloss || (() => '');
    // Words first: a fresh part opens with its new words (Greek, sound, meaning) before the first sentence.
    const wkey = key + '-w'; let wordsSeen = saved !== null || done; try { if (store && store.getItem(wkey)) wordsSeen = true; } catch (e) {}
    // Today's story as a day (grown-ups): the scene first (listen only), then the words (hear each, say each), then build it,
    // then say the whole part out loud. The part counts as done after the last step, so leaving halfway comes back to the same step.
    const S = this.cvSteps && this.cvSteps.n === n ? this.cvSteps : null; this.cvSteps = null;
    const has = k => { try { return !!(store && store.getItem(k)); } catch (e) { return false; } };
    const put = k => { try { if (store) store.setItem(k, '1'); } catch (e) {} };
    const skey = key + '-s', ykey = key + '-say';
    let sceneSeen = !S || saved !== null || done || has(skey), said = !S || done || has(ykey);
    if (S) this.sceneWait = { n, go: () => { put(skey); sceneSeen = true; this.sceneSkip = null; if (wrap.isConnected) paint(); } };
    const finish = () => { if (!S || said) onDone(); };
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
    // Greek drops subject pronouns: a clause-opening εγώ, εσύ, εμείς or εσείς before a verb may be left out.
    // Variants: [checkable line, line with the left-out word in parentheses].
    const OPT = new Set(['εγώ', 'εσύ', 'εμείς', 'εσείς']);
    const optVariants = g => {
      const parts = String(g).split(/([,.;;!:·…?—]+)/), spots = [];
      parts.forEach((pc, pi) => { if (pi % 2) return; const ws = pc.split(/(\s+)/), idx = ws.map((w, wi) => [w, wi]).filter(([w]) => w.trim());
        const bare = w => norm(w.replace(/[^\p{L}']/gu, ''));
        if (idx.length > 1 && OPT.has(bare(idx[0][0])) && !BOTH.has(bare(idx[1][0])) && !OPT.has(bare(idx[1][0]))) spots.push([pi, idx[0][1]]); });
      const out = [];
      for (let m = 1; m < (1 << Math.min(spots.length, 4)); m++) {
        const drop = parts.map(pc => pc), keep = parts.map(pc => pc);
        spots.forEach(([pi, wi], k) => { if (!(m & (1 << k))) return; const ws = parts[pi].split(/(\s+)/), ws2 = [...ws];
          ws[wi] = ''; if (ws[wi + 1] !== undefined) ws[wi + 1] = ws[wi + 1].replace(/^\s+/, ''); drop[pi] = (/^\s/.test(parts[pi]) ? ' ' : '') + ws.join('').trim();
          ws2[wi] = '(' + ws2[wi] + ')'; keep[pi] = ws2.join(''); });
        out.push([drop.join(''), keep.join('')]);
      }
      return out;
    };
    const wrap = card.createDiv('gq-convo');
    // Keep drags and swipes on the tiles from opening Obsidian's side panels on phones.
    const stopT = e => { if (e.target && e.target.closest && e.target.closest('.gq-tile, .gq-cv-ans, .gq-cv-bank, button')) e.stopPropagation(); };
    for (const ev of ['touchstart', 'touchend', 'pointerdown', 'pointermove', 'pointerup']) wrap.addEventListener(ev, stopT, { passive: true });
    wrap.addEventListener('touchmove', e => { e.stopPropagation(); if (e.target && e.target.closest && e.target.closest('.gq-tile, .gq-cv-ans, .gq-cv-bank')) e.preventDefault(); }, { passive: false });
    let look = null;   // a finished step opened again to look back at; null = where you are
    const paint = () => {
      wrap.empty(); seed = n * 97 + 13 + i * 7;
      const nw = (words || []).filter(w => w.en);
      if (S) {
        const stepNow = !sceneSeen ? 0 : !wordsSeen && nw.length ? 1 : i < order().length ? 2 : !said ? 3 : 4;
        const strip = wrap.createDiv({ cls: 'gq-daysteps', attr: { 'aria-label': 'Today\'s steps' } });
        const NAMES = ['Scene', 'Words', 'Build', 'Say it'];
        if (look !== null && (look >= stepNow || (look === 1 && !nw.length))) look = null;
        NAMES.forEach((t, k) => {
          const cls = 'gq-daystep' + (k < stepNow ? ' is-done' : '') + (k === stepNow ? ' is-now' : '') + (k === look ? ' is-look' : '');
          // Finished steps open again to look back; nothing you did is undone.
          if (k < stepNow && !(k === 1 && !nw.length)) { const b = strip.createEl('button', { cls, text: t, attr: { 'aria-label': 'Look again: ' + t, 'aria-pressed': String(k === look) } }); b.onclick = () => { look = k === look ? null : k; paint(); }; }
          // While looking back, the current step is the way home.
          else if (k === stepNow && look !== null) { const b = strip.createEl('button', { cls: cls + ' is-home', text: t, attr: { 'aria-label': 'Back to ' + t } }); b.onclick = () => { look = null; paint(); }; }
          else strip.createSpan({ cls, text: t });
        });
        if (look !== null) {
          const lv = wrap.createDiv('gq-cv-look');
          if (look === 0) {
            lv.createDiv({ cls: 'gq-cv-scenetext', text: 'Today\'s scene, again. Just listen.' });
            lv.createDiv('gq-row').createEl('button', { text: 'Watch today\'s scene', cls: 'mod-cta' }).onclick = () => this.openApp('story', '#d=' + n + '&today');
          } else if (look === 1) {
            lv.createDiv({ cls: 'gq-hint', text: `The ${nw.length === 1 ? 'new word' : nw.length + ' new words'}. Touch each to hear it.` });
            for (const w of nw) { const row = lv.createDiv('gq-cv-wrow'); const g = row.createSpan({ cls: 'gq-cv-wgr gq-say', text: w.label || w.word, attr: { lang: 'el', role: 'button' } }); g.onclick = () => say(w.label || w.word); row.createSpan({ cls: 'gq-cv-wen', text: w.en }); const sb = row.createSpan('gq-cv-wsay'); this.sayIt(sb, w.label || w.word, 'w:' + w.word, 'Say it'); }
          } else {
            lv.createDiv({ cls: 'gq-hint', text: look === 2 ? 'The lines you built. Touch one to hear it.' : 'Say each line out loud. Touch a line to hear it first.' });
            for (const x of turns) { const r = lv.createDiv('gq-cv-done'); if (x[0]) r.createSpan({ cls: 'gq-cbwho', text: x[0] + ': ' }); const gl = this.lineEl(r, x[1], words); gl.addClass('gq-say'); gl.onclick = () => say(x[1]); r.createDiv({ cls: 'gq-hint', text: x[2] }); if (look === 3) this.sayIt(r.createDiv('gq-cv-lsay'), x[1], 'day:' + n + ':re'); }
          }
          if (look === 2) this.wordPlay(lv, nw);
          return;
        }
      }
      if (!sceneSeen) {
        const sc = wrap.createDiv('gq-cv-scene');
        sc.createDiv({ cls: 'gq-cv-scenetext', text: 'Just listen.' });
        const r = sc.createDiv('gq-row'), w = r.createEl('button', { text: 'Watch today\'s scene', cls: 'mod-cta' });
        w.onclick = () => this.openApp('story', '#d=' + n + '&today');
        this.sceneSkip = () => { this.sceneSkip = null; sceneSeen = true; put(skey); paint(); };
        return;
      }
      if (!wordsSeen && nw.length) {
        const intro = wrap.createDiv('gq-cv-words');
        intro.createDiv({ cls: 'gq-hint', text: S ? `The ${nw.length === 1 ? 'new word' : nw.length + ' new words'}. Touch each to hear it, then say it.` : `First, the ${nw.length === 1 ? 'new word' : nw.length + ' new words'} in this part. Touch each one to hear it.` });
        for (const w of nw) { const row = intro.createDiv('gq-cv-wrow'); const g = row.createSpan({ cls: 'gq-cv-wgr gq-say', text: w.label || w.word, attr: { lang: 'el', role: 'button' } }); g.onclick = () => say(w.label || w.word); row.createSpan({ cls: 'gq-cv-wen', text: w.en }); if (S) { const sb = row.createSpan('gq-cv-wsay'); this.sayIt(sb, w.label || w.word, 'w:' + w.word, 'Say it'); } }
        const go = intro.createDiv('gq-row').createEl('button', { text: S ? 'Build it ›' : 'Start the puzzle', cls: 'mod-cta' });
        go.onclick = () => { wordsSeen = true; try { if (store) store.setItem(wkey, '1'); } catch (e) {} paint(); };
        return;
      }
      for (let k = 0; k < Math.min(i, turns.length); k++) {
        const x = turns[k], r = wrap.createDiv('gq-cv-done');
        if (x[0]) r.createSpan({ cls: 'gq-cbwho', text: x[0] + ': ' });
        const gl = this.lineEl(r, x[1], words); gl.addClass('gq-say'); gl.onclick = () => say(x[1]); r.createDiv({ cls: 'gq-hint', text: x[2] });
        if (S && !said && i >= order().length) { const sb = r.createDiv('gq-cv-lsay'); this.sayIt(sb, x[1], 'day:' + n + ':' + k); }
      }
      if (S && !said && i >= order().length) {
        const sy = wrap.createDiv('gq-cv-sayall');
        sy.createDiv({ cls: 'gq-hint', text: 'Last step: say the whole part out loud, line by line. Touch a line to hear it first.' });
        const dn = sy.createDiv('gq-row').createEl('button', { text: 'Done for today', cls: 'mod-cta' });
        dn.onclick = async () => { said = true; put(ykey); try { await onDone(); } catch (e) {} paint(); };
        return;
      }
      if (S && i >= order().length) {
        const dd = wrap.createDiv('gq-cv-dayend');
        dd.createDiv({ cls: 'gq-cv-dayendt', text: `Day ${S.day} done. Θα τα πούμε.` });
        if (S.weekEnd) {
          dd.createDiv({ cls: 'gq-hint', text: 'The end of the week: watch it all as one scene, then play Γιαγιά with the week\'s words.' });
          const wr = dd.createDiv('gq-row');
          wr.createEl('button', { text: 'Watch the week', cls: 'gq-mini' }).onclick = () => this.openApp('story', '#d=' + n + '&week');
          if (S.wwords.length) wr.createEl('button', { text: 'Play Γιαγιά', cls: 'gq-mini' }).onclick = () => this.openApp('giagia', '#w=' + encodeURIComponent(S.wwords.join(',')));
        }
      }
      if (i >= order().length) {
        const row = wrap.createDiv('gq-row');
        if (next) { const nx = row.createEl('button', { text: S ? 'Tomorrow\'s day now ›' : 'Next part ›', cls: S ? 'gq-mini' : 'mod-cta' }); nx.onclick = next; }
        row.createSpan({ cls: 'gq-hint', text: last ? 'You finished the whole story. Touch a line to listen.' : S ? 'One day at a time is plenty.' : 'Touch a line to listen, then say it out loud. One or two parts a day is plenty.' });
        const pa = row.createEl('button', { text: 'Play again', cls: 'gq-mini' }); pa.onclick = () => { i = 0; again = []; save(); paint(); };
        return;
      }
      const ti = order()[i], x = turns[ti], once = i >= turns.length, cur = wrap.createDiv('gq-cv-now');
      cur.createDiv({ cls: 'gq-hint', text: (once ? `Once more, to lock it in · sentence ${ti + 1}` : turns.length > 1 ? `Sentence ${i + 1} of ${turns.length}` : 'One sentence') + (x[0] ? ` · ${x[0]}` : '') });
      cur.createDiv({ cls: 'gq-cv-gr gq-cv-prompt', text: x[2] });
      const target = toks(x[1]), want = new Set(target.map(norm));
      const extra = [...new Set(pool.flatMap(toks).filter(w => !want.has(norm(w)) && w.length > 1))];
      // Fewer wrong tiles while phonetics is on (the early weeks): the work is reading and meaning, not sorting a big pile.
      const nExtra = Math.min(extra.length, this.phOn() ? Math.max(2, Math.min(4, Math.ceil(target.length / 3))) : Math.max(3, Math.min(6, Math.ceil(target.length / 2))));
      const picks = []; while (picks.length < nExtra && extra.length) picks.push(extra.splice(Math.floor(rnd() * extra.length), 1)[0]);
      const tiles = [...target, ...picks].map((w, k) => ({ w, k }));
      for (let a = tiles.length - 1; a > 0; a--) { const b = Math.floor(rnd() * (a + 1)); [tiles[a], tiles[b]] = [tiles[b], tiles[a]]; }
      if (tiles.slice(0, target.length).every((tl, k) => tl.w === target[k])) tiles.push(tiles.shift());
      const ans = cur.createDiv({ cls: 'gq-cv-ans', attr: { 'aria-label': 'Your Greek', lang: 'el' } });
      const bank = cur.createDiv({ cls: 'gq-cv-bank', attr: { 'aria-label': 'Greek word tiles', lang: 'el' } });
      cur.createDiv({ cls: 'gq-hint gq-cv-help', text: 'Build it in Greek. Touch a word to hear it, see what it means and add it. Drag a word to put it between two others. Touch it again to take it back.' });
      // What the last touched word means, so exploring the tiles teaches the words instead of guessing at them.
      const gl = cur.createDiv({ cls: 'gq-cv-gloss', attr: { 'aria-live': 'polite' } });
      const showGloss = w => { gl.empty(); gl.createSpan({ cls: 'gq-cv-glgr', text: w, attr: { lang: 'el' } }); const m = gloss(w); gl.createSpan({ cls: 'gq-cv-glen', text: m ? ' · ' + m : '' }); };
      const placed = [];
      // Where a dragged word would land in the line: before the first word it is left of (same row) or above.
      const slotAt = (x, y, skip) => { const kids = [...ans.children].filter(q => q !== skip && !q.hasClass('gq-tile-gap')); for (let k = 0; k < kids.length; k++) { const r = kids[k].getBoundingClientRect(); if (y < r.top - 4 || (y <= r.bottom + 4 && x < r.left + r.width / 2)) return k; } return kids.length; };
      const putAt = (c, at, skip) => { const kids = [...ans.children].filter(q => q !== skip && !q.hasClass('gq-tile-gap')); if (at < kids.length) ans.insertBefore(c, kids[at]); else ans.appendChild(c); };
      const gap = createEl('span', { cls: 'gq-tile-gap', attr: { 'aria-hidden': 'true' } });
      const showGap = (x, y, skip) => { if (x === null) { gap.remove(); return; } putAt(gap, slotAt(x, y, skip), skip); };
      const place = (tl, quiet, at) => { if (tl.used) return; if (!quiet) { say(tl.w); showGloss(tl.w); } tl.used = true; tl.btn.addClass('gq-used'); const c = createEl('button', { text: tl.w, cls: 'gq-tile' }); tl.clone = c;
        if (at === undefined || at >= placed.length) { ans.appendChild(c); placed.push(tl); } else { putAt(c, at); placed.splice(at, 0, tl); }
        bindDrag(c, () => unplace(tl), bank, (x, y) => { const at2 = slotAt(x, y, c); placed.splice(placed.indexOf(tl), 1); placed.splice(at2, 0, tl); putAt(c, at2, c); ans.removeClass('gq-bad'); }); ans.removeClass('gq-bad'); };
      const unplace = tl => { if (!tl.used) return; tl.used = false; tl.btn.removeClass('gq-used'); tl.clone.remove(); placed.splice(placed.indexOf(tl), 1); ans.removeClass('gq-bad'); };
      // Tap moves a tile; dragging it onto the other area does the same (pointer events work with touch and mouse).
      // Dropped into the line, a word goes where it is let go, so a missing word can go between two others; a word in the line can be dragged to a new spot.
      const near = (el, e) => { const r = el.getBoundingClientRect(); return e.clientX >= r.left - 20 && e.clientX <= r.right + 20 && e.clientY >= r.top - 24 && e.clientY <= r.bottom + 24; };
      const bindDrag = (el, act, dest, moveIn) => {
        let sx = 0, sy = 0, drag = false, id = null;
        const inLine = () => dest === ans || moveIn;
        el.onpointerdown = e => { sx = e.clientX; sy = e.clientY; drag = false; id = e.pointerId; try { el.setPointerCapture(id); } catch (er) {} };
        el.onpointermove = e => { if (id !== e.pointerId) return; const dx = e.clientX - sx, dy = e.clientY - sy; if (!drag && Math.hypot(dx, dy) > 8) { drag = true; el.addClass('gq-drag'); } if (!drag) return; el.style.transform = `translate(${dx}px, ${dy}px)`; if (inLine() && near(ans, e)) showGap(e.clientX, e.clientY, el); else showGap(null); };
        el.onpointerup = e => {
          if (id !== e.pointerId) return; id = null; showGap(null);
          if (!drag) { act(); return; }
          drag = false; el.removeClass('gq-drag'); el.style.transform = '';
          if (dest === ans) { if (near(ans, e)) act(slotAt(e.clientX, e.clientY)); }
          else if (moveIn && near(ans, e)) moveIn(e.clientX, e.clientY);
          else if (near(dest, e)) act();
        };
        el.onpointercancel = () => { id = null; drag = false; showGap(null); el.removeClass('gq-drag'); el.style.transform = ''; };
      };
      for (const tl of tiles) { tl.btn = bank.createEl('button', { text: tl.w, cls: 'gq-tile' }); bindDrag(tl.btn, at => place(tl, false, at), ans); }
      const row = cur.createDiv('gq-row'); let misses = 0, showed = false;
      const chk = row.createEl('button', { text: 'Check', cls: 'mod-cta' });
      const hint = cur.createDiv({ cls: 'gq-hint gq-say', text: 'Touch here to hear the whole line in Greek.' }); hint.style.display = 'none'; hint.onclick = () => say(x[1]);
      const show = row.createEl('button', { text: 'Show me', cls: 'gq-mini' }); show.style.display = 'none';
      // Said it right before building it: the tiles fill in by themselves, in order, and the line counts as solved.
      const autofill = () => {
        if (chk.disabled) return;
        for (const tl of [...placed]) unplace(tl);
        for (const w of target) { const tl = tiles.find(t => !t.used && norm(t.w) === norm(w)); if (tl) place(tl, true); }
        chk.onclick();
      };
      this.sayIt(row, x[1], 'said:π:' + n + ':' + ti, 'Say the line · +2', autofill);
      const fb = cur.createDiv('gq-hint gq-cv-fb');
      if (S) this.wordPlay(wrap, nw);
      const en = this.lineEl(cur, x[1], words); en.addClass('gq-cv-en'); en.addClass('gq-say'); en.onclick = () => say(x[1]); en.style.display = 'none';
      show.onclick = () => { showed = true; en.style.display = ''; show.remove(); };
      chk.onclick = () => {
        const got = placed.map(tl => norm(tl.w)), exact = got.join(' ') === target.map(norm).join(' ');
        let opt = null;
        if (!exact && !accepts(got, x[1])) for (const [g2, shown] of optVariants(x[1])) { if (got.join(' ') === toks(g2).map(norm).join(' ') || accepts(got, g2)) { opt = shown; break; } }
        if (exact || opt || accepts(got, x[1])) {
          ans.addClass('gq-ok'); chk.disabled = true; say(x[1]); fb.empty();
          if (opt) { fb.createDiv({ text: 'Also right. The word in parentheses is optional, because the verb already says who:' }); this.lineEl(fb, opt, words); }
          else if (!exact) { fb.createDiv({ text: 'Also right. The line says:' }); this.lineEl(fb, x[1], words); }
          // A lot of guessing (two or more misses, or Show me) is not a win yet: 1 point for trying, and the line comes back once at the end.
          const pk = 'π:' + n + ':' + ti;
          if (!once && (misses >= 2 || showed)) {
            if (!again.includes(ti)) again.push(ti);
            fb.createDiv({ cls: 'gq-cv-pts', text: '+1 φόρα for trying. This one comes back at the end of the part, to lock it in.' });
            this.moAdd('try', pk);
            setTimeout(() => { i++; save(); if (i >= order().length) finish(); paint(); }, 2600);
            return;
          }
          // Show what the line earned: 1 the first time, 3 on a later day, nothing for a replay the same day.
          let gain = 1; try { const mf = this.app.vault.getAbstractFileByPath(MO_FILE), fmm = mf && this.app.metadataCache.getFileCache(mf), last = fmm && fmm.frontmatter && fmm.frontmatter.got && fmm.frontmatter.got[pk]; gain = last === ymd(new Date()) ? 0 : last ? 3 : 1; } catch (e) {}
          fb.createDiv({ cls: 'gq-cv-pts', text: gain ? `+${gain} φόρα` : 'Already counted today. Come back tomorrow for +3 φόρα.' });
          this.moAdd('recall', pk);
          setTimeout(() => { i++; save(); if (i >= order().length) finish(); paint(); }, exact ? 900 : 2600);
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
  // Own pace: fiay_from is the student's day one. Day 1 is a Monday, day 7 the review day, then the next week starts.
  fyOwn(col, now) {
    if (!col.fiay_from) return null; const [y, m, d] = col.fiay_from.split('-').map(Number);
    const dd = Math.round((now - new Date(y, m - 1, d)) / 864e5); if (dd < 0) return null;
    const i = dd % 7; return { dd, week: Math.floor(dd / 7) + 1, dow: i === 6 ? 0 : i + 1 };
  }
  // A slider over the weeks: day one, the calendar week, or anywhere between. Words already colored stay colored.
  fyPicker(card, fw, own) {
    const old = card.querySelector('.gq-fy-pick'); if (old) { old.remove(); return; }
    const box = card.createDiv('gq-fy-pick'), now = new Date(); now.setHours(0, 0, 0, 0);
    const calDd = Math.floor((now - new Date(COURSE_START[0], COURSE_START[1], COURSE_START[2])) / 864e5), calWeek = calDd < 0 ? 1 : Math.floor(calDd / 7) + 1;
    const max = Math.max(1, ...this.app.vault.getMarkdownFiles().filter(f => f.path.startsWith('Fluent in a Year/')).map(f => +(((this.app.metadataCache.getFileCache(f) || {}).frontmatter || {}).fiay_week) || 0));
    const lab = box.createDiv({ cls: 'gq-tsub' }), sl = box.createEl('input', { attr: { type: 'range', min: '1', max: String(max), step: '1', 'aria-label': 'Week' } });
    sl.value = String(fw);
    const show = () => { const n = +sl.value; lab.setText(`Start at week ${n} · day ${(n - 1) * 6 + 1} of 300` + (n === calWeek ? ' (the class calendar)' : '')); };
    sl.oninput = show; show();
    const r = box.createDiv('gq-row');
    const go = r.createEl('button', { text: 'Start here today', cls: 'mod-cta' }); go.onclick = () => this.setFyFrom(+sl.value);
    if (own) { const back = r.createEl('button', { text: 'Back to the class calendar', cls: 'gq-mini' }); back.onclick = () => this.setFyFrom(0); }
    box.createDiv({ cls: 'gq-hint', text: 'Today becomes day one of that week. Class stays on the calendar, and your colors stay as they are.' });
  }
  async setFyFrom(n) {
    const f = await this.progressFile(), now = new Date(); now.setHours(0, 0, 0, 0);
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (Math.max(1, n) - 1) * 7), s = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    await this.app.fileManager.processFrontMatter(f, fm => { if (n) fm.fiay_from = s; else delete fm.fiay_from; });
    setTimeout(() => this.refreshToday(), 300);
  }
  async setFiay(on) {
    const f = await this.progressFile();
    // Turning the pace on starts it where the student is in the story, so nobody starts out behind.
    let from = null;
    if (on && !this.colors().fiay_from) {
      const beats = await this.beatIndex(), at = this.colors().story_at || 0, d = Object.keys(beats).map(Number).filter(k => k <= at).length;
      const now = new Date(); now.setHours(0, 0, 0, 0); const t = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (Math.floor(d / 6) * 7 + d % 6));
      from = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
    }
    await this.app.fileManager.processFrontMatter(f, fm => { if (on) { fm.fiay = true; if (from) fm.fiay_from = from; } else delete fm.fiay; });
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
  cbOther(c) { return c.ctx && c.ctx.length ? { gr: c.ctx.map(x => x.g).join(' '), who: c.ctx.length === 1 ? c.ctx[0].who + '\'s' : 'their', en: c.en } : null; }
  cbPrompt(el, c, big) {
    for (const x of c.ctx) { const d = el.createDiv(big ? 'gq-cbctx gq-pop-ctx' : 'gq-cbctx'); d.createSpan({ cls: 'gq-cbwho', text: x.who + ': ' }); d.createSpan({ text: x.g, attr: { lang: 'el', title: x.e } }); }
    const y = el.createDiv(big ? 'gq-pop-big gq-pop-en' : 'gq-cbyou');
    if (c.who) y.createSpan({ cls: 'gq-cbwho', text: (c.ctx.length ? 'You, as ' + c.who : c.who) + ': ' });
    y.appendText(c.en);
    if (c.col) y.createSpan({ cls: 'gq-dot gq-' + c.col, attr: { 'aria-label': c.col + ' word' } });
  }
  // ---------- Checks: the numbers behind the report. Each is the student's own, compared only with their own earlier numbers. ----------
  checkPush(fm, kind, val) { const c = fm.checks && typeof fm.checks === 'object' && !Array.isArray(fm.checks) ? fm.checks : {}; const a = Array.isArray(c[kind]) ? c[kind].map(String) : []; a.push(ymd(new Date()) + '|' + val); c[kind] = a.slice(-80); fm.checks = c; }
  async checkLog(kind, val) { const f = await this.progressFile(); await this.app.fileManager.processFrontMatter(f, fm => this.checkPush(fm, kind, val)); }
  async addPractice(secs) { const f = await this.progressFile(); await this.app.fileManager.processFrontMatter(f, fm => { fm.practice_s = Math.round((+fm.practice_s || 0) + secs); }); }
  stats(from, to) {
    const fm = this.progFm(), c = fm.checks && typeof fm.checks === 'object' ? fm.checks : {}, L = k => (Array.isArray(c[k]) ? c[k] : []).map(x => String(x).split('|')).filter(x => (!from || x[0] >= from) && (!to || x[0] < to));
    const r7 = L('r7'), rep = L('rep'), talk = L('talk');
    return {
      r7n: r7.length, r7: r7.length ? Math.round(100 * r7.filter(x => x[1] === '1').length / r7.length) : null,
      rep: rep.some(x => +x[3] > 0) ? Math.max(...rep.map(x => +x[3] || 0)) : null,
      talk: talk.some(x => +x[1] > 0) ? Math.max(...talk.map(x => +x[1] || 0)) : null,
      green: this.colors().green.length, hours: Math.round((+fm.practice_s || 0) / 360) / 10
    };
  }
  statsLine() {
    const s = this.stats(); const out = [];
    if (s.r7 !== null) out.push(`back after a week ${s.r7}% (${s.r7n})`); if (s.rep !== null) out.push(`repeat ${s.rep} syllables`); if (s.talk !== null) out.push(`talk ${s.talk} words in 1 min`);
    out.push(`green ${s.green}`); if (s.hours) out.push(`practice ${s.hours} h`);
    { const cp = this.progFm().card_practice || {}, from = ymd(new Date(Date.now() - 13 * 864e5)); let c = 0, m = 0; for (const [d, v] of Object.entries(cp)) if (d >= from) { const [a, b] = String(v).split('|').map(x => +x || 0); c += a; m += b; } if (c || m) out.push(`card practice ${c} cards, ${m} min (2 weeks)`); }
    return out.join(' · ');
  }
  // ---------- The report: every two weeks a card the student didn't ask for, with numbers to beat ----------
  reportCard(box) {
    if (this.isKids) return; const fm = this.progFm(), today = ymd(new Date());
    if (!fm.report_start) { this.progressFile().then(f => this.app.fileManager.processFrontMatter(f, x => { if (!x.report_start) x.report_start = today; })); return; }
    const since = String(fm.report_last || fm.report_start), days = Math.round((new Date(today + 'T12:00:00') - new Date(since + 'T12:00:00')) / 864e5);
    if (!(days >= 14) && !this.reportForce) return;
    const hist = (Array.isArray(fm.report_hist) ? fm.report_hist : []).map(x => String(x).split('|'));
    const now = this.stats(since), all = this.stats(), prev = hist.length ? hist[hist.length - 1] : null;
    const best = i => { const v = hist.map(h => +h[i]).filter(x => !isNaN(x) && x > 0); return v.length ? Math.max(...v) : null; };
    const c = createDiv('gq-tcard gq-report'); c.dataset.tour = 'report';
    c.createDiv({ cls: 'gq-thead' }).createEl('strong', { text: hist.length ? 'Your two weeks in numbers' : 'Your first numbers' });
    c.createDiv({ cls: 'gq-hint', text: 'Only you see these, and they compare you with yourself. Each one is a number to beat.' });
    const tb = c.createDiv('gq-rep-rows');
    const row = (name, val, unit, i, help) => {
      const r = tb.createDiv('gq-rep-row'), b = best(i), up = b === null || val > b;
      r.createDiv({ cls: 'gq-rep-n', text: name });
      const v = r.createDiv({ cls: 'gq-rep-v' + (up ? ' is-up' : ''), text: `${val}${unit}` });
      r.createDiv({ cls: 'gq-hint gq-rep-b', text: b === null ? help : up ? `New best (was ${b}${unit})` : `To beat: ${b}${unit}` });
    };
    const s = { r7: now.r7, rep: now.rep, talk: now.talk };
    if (now.r7 !== null) row('Words back after a week', now.r7, '%', 1, `${now.r7n} checked in Spaced review`);
    if (now.rep !== null) row('Repeat after me, longest line', now.rep, ' syllables', 2, 'Longer lines mean more Greek held at once');
    if (now.talk !== null) row('One-minute talk', now.talk, ' words', 3, 'Words in one minute of Greek');
    { const pg = prev ? +prev[4] : null, r = tb.createDiv('gq-rep-row'), d = pg === null ? null : all.green - pg; r.createDiv({ cls: 'gq-rep-n', text: 'Green words' }); r.createDiv({ cls: 'gq-rep-v' + (d > 0 ? ' is-up' : ''), text: String(all.green) }); r.createDiv({ cls: 'gq-hint gq-rep-b', text: d === null ? 'Words you have' : d > 0 ? `+${d} in two weeks` : 'Turn a yellow word green to move this' }); }
    if (all.hours) { const ph = prev ? +prev[5] : 0; const r = tb.createDiv('gq-rep-row'); r.createDiv({ cls: 'gq-rep-n', text: 'Practice' }); r.createDiv({ cls: 'gq-rep-v', text: `${Math.round((all.hours - ph) * 10) / 10} h` }); r.createDiv({ cls: 'gq-hint gq-rep-b', text: `${all.hours} h in all` }); }
    const miss = [now.rep === null && 'Repeat after me', now.talk === null && 'One-minute talk'].filter(Boolean);
    if (miss.length) c.createDiv({ cls: 'gq-hint', text: `${miss.join(' and ')} ${miss.length > 1 ? 'add' : 'adds'} a number here. Roll the die to find ${miss.length > 1 ? 'them' : 'it'}.` });
    const r = c.createDiv('gq-row'); const k = r.createEl('button', { text: 'Keep my numbers', cls: 'mod-cta' });
    k.onclick = async () => {
      const f = await this.progressFile(); await this.app.fileManager.processFrontMatter(f, x => { const h = Array.isArray(x.report_hist) ? x.report_hist.map(String) : []; h.push([today, s.r7 === null ? '' : s.r7, s.rep === null ? '' : s.rep, s.talk === null ? '' : s.talk, all.green, all.hours].join('|')); x.report_hist = h.slice(-40); x.report_last = today; });
      this.reportForce = false; this.moAdd('did', 'report', 2); setTimeout(() => this.refreshToday(), 300);
    };
    // It is the one big card while it is here: it sits under Next, and the card Next opened folds until it is kept.
    const nx = box.querySelector(':scope > .gq-next'); if (nx) nx.after(c); else box.prepend(c);
    const open = box.querySelector(':scope > .gq-fold.is-open'); if (open) { open.removeClass('is-open'); const h = open.querySelector(':scope > .gq-fold-h'); if (h) h.setAttr('aria-expanded', 'false'); }
  }
  // ---------- Roll the die: one of six things, picked for the student. Now and then a lucky roll adds φόρα. ----------
  dieFaces() {
    return [
      { t: 'Spaced review', b: 'Earlier lines and your red and yellow words.', go: () => this.cbList && this.cbList.length ? this.popComebacks(this.cbList) : this.popRepeat() },
      { t: 'Repeat after me', b: 'Hear a line, say it back. They get longer.', go: () => this.popRepeat() },
      { t: 'One-minute talk', b: 'Talk for one minute. The phone counts your words.', go: () => this.popTalk() },
      { t: 'Γιαγιά', b: 'A quick game with your words.', go: () => this.openApp('giagia', '') },
      { t: 'Word web', b: 'Follow one word to the words it goes with.', go: () => this.openGraph() },
      { t: 'Story puzzle', b: 'One line of the story.', go: () => this.storyEl && this.storyEl.isConnected ? this.focusCard(this.storyEl) : this.openApp('story', '') }
    ];
  }
  rollDie() {
    const F = this.dieFaces(), PIPS = [[4], [0, 8], [0, 4, 8], [0, 2, 6, 8], [0, 2, 4, 6, 8], [0, 2, 3, 5, 6, 8]];
    let rerolled = false;
    this.pop('', [{ label: '', build: (el, api) => { el.addClass('gq-die-pop'); el.closest && setTimeout(() => { const pc = el.closest('.gq-pop'); if (pc) pc.addClass('gq-pop-die'); }, 0);
      const die = el.createDiv({ cls: 'gq-die', attr: { role: 'img', 'aria-label': 'Die' } }); const cells = []; for (let i = 0; i < 9; i++) cells.push(die.createDiv('gq-pip'));
      const face = n => { cells.forEach((x, i) => x.toggleClass('is-on', PIPS[n].includes(i))); die.setAttr('aria-label', `Die showing ${n + 1}`); };
      const t = el.createDiv({ cls: 'gq-pop-big gq-die-t' }), b = el.createDiv({ cls: 'gq-hint gq-die-b' }), luck = el.createDiv('gq-die-luck'), r = el.createDiv('gq-row gq-pillrow');
      const roll = () => {
        r.empty(); t.setText(''); b.setText(''); luck.setText(''); let k = 0, last = this.lastRoll;
        // The week's focus counts twice: listening leans to Repeat after me, speaking to the one-minute talk, reading to the story, verbs to the word web.
        const fav = { listen: 1, speak: 2, read: 5, trip: 1, verbs: 4 }[this.focusNow()], pool = [0, 1, 2, 3, 4, 5].concat(fav === undefined ? [] : [fav]).filter(x => x !== last);
        let n = pool[Math.floor(Math.random() * pool.length)]; this.lastRoll = n;
        const calm = this.calmOn(), ticks = calm ? 1 : 12;
        const step = () => {
          if (k < ticks - 1) { face(Math.floor(Math.random() * 6)); die.addClass('is-rolling'); k++; setTimeout(step, 40 + k * k * 1.2); return; }
          die.removeClass('is-rolling'); face(n); t.setText(F[n].t); b.setText(F[n].b);
          if (Math.random() < 0.25) { luck.setText('Lucky roll · +3 φόρα'); this.moAdd('did', 'lucky', 3); }
          const go = r.createEl('button', { text: 'Go', cls: 'mod-cta gq-pill' }); go.onclick = () => { api.close(); this.moAdd('did', 'die', 1); setTimeout(() => F[n].go(), 220); };
          if (!rerolled) { const a = r.createEl('button', { text: 'Roll again', cls: 'gq-ghost' }); a.onclick = () => { rerolled = true; roll(); }; }
        };
        step();
      };
      roll();
    } }]);
  }
  // ---------- Repeat after me: hear a line, say it back, longer each time (an elicited-imitation check) ----------
  syl(t) { return (String(t).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().match(/αι|ει|οι|ου|υι|αυ|ευ|[αεηιουω]/g) || []).length; }
  async repeatLines() {
    const beats = await this.beatIndex(), col = this.colors(), far = Math.max(12, (+col.last_beat || 0) + 3);
    const pool = []; for (const b of Object.values(beats)) if (b.gr && b.n <= far && !/[—–]/.test(b.gr)) { const parts = b.gr.match(/[^.!;·]+[.!;·]?/g) || [b.gr]; for (const g of new Set([b.gr, ...parts.map(x => x.trim())])) { const n = this.syl(g); if (n >= 4 && n <= 24) pool.push({ gr: g, en: b.en, s: n }); } }
    const used = new Set(), out = [];
    for (const want of [5, 8, 11, 14, 17, 20]) {
      const best = pool.filter(x => ![...used].some(u => u.includes(x.gr) || x.gr.includes(u))).sort((a, b) => Math.abs(a.s - want) - Math.abs(b.s - want))[0];
      if (best && (!out.length || best.s >= out[out.length - 1].s)) { used.add(best.gr); out.push(best); }
    }
    return out;
  }
  async popRepeat() {
    const L = await this.repeatLines(); if (!L.length) { new Notice('Repeat after me needs a few story lines first.'); return; }
    const st = { got: 0, max: 0 };
    const steps = L.map((x, k) => ({ label: 'Repeat after me', build: (el, api) => {
      el.createDiv({ cls: 'gq-hint', text: k ? `Line ${k + 1} of ${L.length} · ${x.s} syllables` : `Listen, then say it back in Greek. ${L.length} lines, each a little longer. Line 1 · ${x.s} syllables.` });
      const g = el.createDiv({ cls: 'gq-pop-big gq-pop-hide', text: x.gr, attr: { lang: 'el' } });
      setTimeout(() => say(x.gr), 300);
      const r = el.createDiv('gq-row'); let again = 1;
      const h = r.createEl('button', { text: 'Hear it again' }); h.onclick = () => { say(x.gr); if (--again <= 0) h.remove(); };
      const nextB = () => { r.empty(); this.hearBtn(r, x.gr, 'Hear it'); const nx = r.createEl('button', { text: k === L.length - 1 ? 'See my score' : 'Next', cls: 'mod-cta' }); nx.onclick = api.next; };
      this.sayIt(el.createDiv('gq-row'), x.gr, 'said:rep:' + x.gr.slice(0, 60), 'Say it back', () => { st.got++; st.max = Math.max(st.max, x.s); g.removeClass('gq-pop-hide'); nextB(); });
      const sk = el.createDiv('gq-row').createEl('button', { text: 'Show me, next', cls: 'gq-mini' }); sk.onclick = () => { g.removeClass('gq-pop-hide'); sk.remove(); nextB(); };
    } }));
    steps.push({ label: 'Repeat after me', build: (el, api) => {
      el.createDiv({ cls: 'gq-pop-big', text: `${st.got} of ${L.length}` });
      el.createDiv({ text: st.max ? `Longest line said back: ${st.max} syllables.` : 'Next time, try the first line twice.' });
      const all = this.stats(); if (all.rep !== null && st.max) el.createDiv({ cls: 'gq-hint', text: st.max > all.rep ? `New best. It was ${all.rep}.` : `Your best: ${all.rep} syllables.` });
      if (st.got) { this.checkLog('rep', `${st.got}|${L.length}|${st.max}`); this.moAdd('did', 'repeat', 3); }
      const r = el.createDiv('gq-row'); const d = r.createEl('button', { text: 'Done', cls: 'mod-cta' }); d.onclick = () => api.close();
    } });
    this.pop('Repeat after me', steps);
  }
  // ---------- One-minute talk: speak for a minute, the phone counts the words (a fluency check) ----------
  popTalk() {
    const P = [['Πες μου για τη μέρα σου.', 'Tell me about your day.'], ['Πες μου για την οικογένειά σου.', 'Tell me about your family.'], ['Τι έχεις στην τσάντα σου;', 'What is in your bag?'], ['Τι έφαγες σήμερα;', 'What did you eat today?'], ['Πες μου για το σπίτι σου.', 'Tell me about your home.'], ['Τι θα κάνεις αύριο;', 'What will you do tomorrow?'], ['Πες μου για έναν φίλο σου.', 'Tell me about a friend.']];
    const q = P[Math.floor(Math.random() * P.length)];
    this.pop('One-minute talk', [{ label: '', build: (el, api) => {
      el.createDiv({ cls: 'gq-pop-big', text: q[0], attr: { lang: 'el' } }); el.createDiv({ cls: 'gq-hint', text: q[1] + ' Talk in Greek for one minute. Simple is fine: keep going, even with single words.' });
      const clock = el.createDiv({ cls: 'gq-pop-big gq-talk-n', text: '1:00' }), live = el.createDiv({ cls: 'gq-hint gq-talk-live' }), r = el.createDiv('gq-row');
      const finish = n => { const b = this.stats().talk; clock.setText(`${n} words`);
        live.setText(b === null ? 'Your first number. Beat it next time.' : n > b ? `New best. It was ${b}.` : `Your best: ${b} words.`);
        if (n > 0) { this.checkLog('talk', n); this.moAdd('did', 'talk', 3); }
        const d = r.createEl('button', { text: 'Done', cls: 'mod-cta' }); d.onclick = () => api.close(); };
      // No microphone for the app (blocked, or not on this phone): the keyboard's microphone types what you say, and the words are counted the same way.
      const kb = note => {
        r.empty(); live.setText(note || 'Tap the box, then the mic on the keyboard, and talk. The minute starts with your first word.');
        const ta = el.createEl('textarea', { cls: 'gq-input gq-talk-kb', attr: { rows: '4', lang: 'el', autocapitalize: 'off', autocomplete: 'off', spellcheck: 'false', 'aria-label': 'What you say' } });
        r.before(ta); let t0 = 0, tick = null; const cnt = () => ta.value.trim().split(/\s+/).filter(Boolean).length;
        ta.oninput = () => { if (!t0 && ta.value.trim()) { t0 = Date.now(); tick = setInterval(() => { const left = Math.max(0, 60 - Math.floor((Date.now() - t0) / 1000)); clock.setText(`0:${String(left).padStart(2, '0')}`); live.setText(`${cnt()} words`); if (!left) { clearInterval(tick); ta.disabled = true; finish(cnt()); } }, 250); } };
        ta.focus();
      };
      const R = SRec(); if (!R || this.lsGet('sroff', 0)) { kb(); return; }
      const go = r.createEl('button', { text: 'Start', cls: 'mod-cta' });
      const alt = r.createEl('button', { text: 'Use the keyboard mic', cls: 'gq-mini' }); alt.onclick = () => kb();
      go.onclick = () => {
        go.remove(); alt.remove(); let words = 0, interim = '', on = true, rec = null, blocked = false; const t0 = Date.now(); const cnt = t => String(t).trim().split(/\s+/).filter(Boolean).length;
        const paint = () => { const left = Math.max(0, 60 - Math.floor((Date.now() - t0) / 1000)); clock.setText(`0:${String(left).padStart(2, '0')}`); live.setText(`${words + cnt(interim)} words`); };
        const run = () => { if (!on) return; try { rec = new R(); } catch (e) { return; } rec.lang = 'el-GR'; rec.continuous = true; rec.interimResults = true;
          rec.onresult = e => { interim = ''; for (let i = e.resultIndex; i < e.results.length; i++) { const t = e.results[i][0].transcript; if (e.results[i].isFinal) words += cnt(t); else interim = t; } paint(); };
          rec.onerror = e => { if (e.error === 'not-allowed' || e.error === 'service-not-allowed') { on = false; blocked = true; this.lsSet('sroff', 1); } };
          rec.onend = () => { if (on && Date.now() - t0 < 60000) setTimeout(run, 80); };
          try { rec.start(); } catch (e) {} };
        try { window.speechSynthesis && speechSynthesis.cancel(); } catch (e) {}
        run(); const tick = setInterval(() => { if (blocked) { clearInterval(tick); clearTimeout(stop); kb('The microphone is blocked for this site, so use the keyboard\'s: tap the box, then its mic, and talk.'); return; } paint(); }, 250);
        const stop = setTimeout(() => {
          on = false; try { rec && rec.stop(); } catch (e) {}
          setTimeout(() => {
            clearInterval(tick); finish(words + cnt(interim));
          }, 900);
        }, 60000);
      };
    } }]);
  }
  // ---------- Spaced review for words: red and yellow words come back 1, 3 and 7 days after their color, then weekly. Green words come back once after 30 days. ----------
  wordsDue() {
    const fm = this.progFm(), on = fm.color_on && typeof fm.color_on === 'object' ? fm.color_on : {}, rv = fm.word_review && typeof fm.word_review === 'object' ? fm.word_review : {};
    const today = new Date(ymd(new Date()) + 'T12:00:00'), age = d => /^\d{4}-\d{2}-\d{2}$/.test(String(d || '')) ? Math.round((today - new Date(d + 'T12:00:00')) / 864e5) : 999;
    const GAP = [1, 2, 4, 7], c = this.colors(), out = [];
    for (const [col, list] of [['red', c.red], ['yellow', c.yellow], ['green', c.green]]) for (const w of list) {
      const [n0, last] = String(rv[w] || '0|').split('|'), n = parseInt(n0, 10) || 0, since = age(last || on[w]);
      const due = col === 'green' ? n === 0 && since >= 30 : since >= GAP[Math.min(n, GAP.length - 1)];
      if (due) out.push({ w, col, since });
    }
    const R = { red: 0, yellow: 1, green: 2 };
    out.sort((a, b) => R[a.col] - R[b.col] || b.since - a.since);
    return out.slice(0, 5).map(x => {
      const f = this.app.metadataCache.getFirstLinkpathDest(x.w, '') || this.app.vault.getAbstractFileByPath('Words/' + x.w + '.md');
      const wf = f ? ((this.app.metadataCache.getFileCache(f) || {}).frontmatter || {}) : {};
      return wf.english ? { ctx: [], who: '', gr: x.w, en: String(wf.english), word: x.w, col: x.col } : null;
    }).filter(Boolean);
  }
  async wordReviewed(w, ok) {
    const f = await this.progressFile(), t = ymd(new Date());
    await this.app.fileManager.processFrontMatter(f, fm => {
      const rv = fm.word_review && typeof fm.word_review === 'object' ? fm.word_review : {};
      const [n0, last] = String(rv[w] || '0|').split('|'), n = parseInt(n0, 10) || 0;
      const on = fm.color_on && typeof fm.color_on === 'object' ? fm.color_on[w] : '', from = /^\d{4}-\d{2}-\d{2}$/.test(last || on || '') ? (last || on) : '';
      const gap = from ? Math.round((new Date(t + 'T12:00:00') - new Date(from + 'T12:00:00')) / 864e5) : 0;
      rv[w] = `${ok ? n + 1 : 0}|${t}`; fm.word_review = rv;
      if (gap >= 7) this.checkPush(fm, 'r7', ok ? 1 : 0);
    });
  }
  async comebackCard(box, beats, col, cal) {
    const last = col.story_at !== null ? col.story_at : Math.min(col.last_beat, (cal || 1e9) - 1);
    const due = last >= 1 ? [last, last - 2, last - 6].filter(k => k >= 1 && beats[k]).map(k => beats[k]) : [];
    const T = due.length ? await this.storyTurns() : null, cbs = due.map(b => Object.assign(this.comebackTurns(b, T), { gap: last - b.n + 1 })).concat(this.wordsDue());
    if (!cbs.length) return;
    const card = box.createDiv('gq-tcard gq-comeback'); this.cbList = cbs;
    const ch = card.createDiv('gq-thead'); ch.createEl('strong', { text: 'Spaced review' }); ch.createSpan({ cls: 'gq-hint', text: `  · about ${Math.max(1, Math.round(cbs.length * 0.5))} min` });
    card.createDiv({ cls: 'gq-hint', text: cbs.some(c => c.ctx.length) ? 'Read or hear their line, then say only your reply in Greek. Tap Say it and the phone checks you.' : 'Say it in Greek. Tap Say it and the phone checks you.' });
    const shown = cbs.slice(0, 1);   // one on the page; Quiz me runs them all
    for (const c of shown) {
      const r = card.createDiv('gq-cbrow'); this.cbPrompt(r, c, false);
      const g = r.createDiv({ cls: 'gq-line gq-cbgr', text: c.gr, attr: { lang: 'el' } }); g.style.display = 'none';
      const row = r.createDiv('gq-row');
      if (c.ctx.length) this.hearBtn(row, c.ctx.map(x => x.g).join(' '), 'Hear the line');
      const s = row.createEl('button', { text: 'Show my answer', cls: 'gq-mini' }); s.onclick = () => { g.style.display = ''; s.remove(); say(c.gr); };
      if (!c.ctx.length) { s.setText('Show Greek'); this.hearBtn(row, c.gr, 'Hear'); }
      // Say it: the phone listens, and when it hears the answer the Greek shows.
      this.sayIt(r.createDiv('gq-row'), c.gr, 'said:cb:' + c.gr.slice(0, 80), 'Say it · +2', () => { g.style.display = ''; s.remove(); if (c.word) this.wordReviewed(c.word, true); }, this.cbOther(c));
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
  timeRec(kind, secs) { if (!(secs > 15 && secs < 900)) return; const L = this.lsGet('mins', {}); L[kind] = [...(L[kind] || []), Math.round(secs)].slice(-7); this.lsSet('mins', L); this.addPractice(secs); }
  doneToday(k) { return this.lsGet('done', {})[k] === ymd(new Date()); }
  markDone(k) { const d = this.lsGet('done', {}); d[k] = ymd(new Date()); this.lsSet('done', d); this.nextUp(k); }
  // Finishing the open card's step puts one button at its foot: the next step, or done for today.
  nextUp(k) {
    if (this.stackOn && this.stackNx && this.stackNx.isConnected) { const b = this.stackNx; b.addClass('gq-pulse'); setTimeout(() => b.removeClass('gq-pulse'), 2400); return; }
    const st = this.nextSteps || [], c = this.nextOpen; if (!c || !c.isConnected || !st.length || st[0].key !== k || c.querySelector('.gq-nextup')) return;
    const n = st[1], b = c.createEl('button', { cls: 'mod-cta gq-nextup', text: n ? `Next up: ${n.label} ›` : 'Done for today ›' });
    b.onclick = () => { this.keepOpen = null; this.refreshToday(); };
    if (!n && !this.isKids) { const d = c.createEl('button', { cls: 'gq-nextup gq-die-btn', text: 'Or roll the die for one more' }); d.onclick = () => this.rollDie(); }
  }
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
  // One thing at a time: the card Next points to stays open, the rest are one-line rows. Tap a row to open it (the open one folds).
  // The φόρα meter stays as it is once a world is picked: it is the feedback, not a task.
  foldToday(box) {
    const cards = [...box.querySelectorAll(':scope > .gq-tcard')].filter(c => !c.hasClass('gq-next') && !c.hasClass('gq-tnew') && !(c.hasClass('gq-mo') && !c.hasClass('is-fresh')));
    for (const c of cards) {
      const strong = c.querySelector('.gq-thead strong'), t = (strong ? strong.textContent : (c.textContent || '').split('\n')[0]).trim();
      const min = ((c.textContent || '').match(/about \d+ min/) || [])[0];
      const h = createEl('button', { cls: 'gq-fold-h', attr: { type: 'button', 'aria-expanded': 'false' } });
      h.createSpan({ cls: 'gq-fold-t', text: c.hasClass('gq-mo') ? 'Πάρε φόρα' : c.hasClass('gq-abc') ? 'Alphabet · ' + t : t }); if (min && !t.includes(min)) h.createSpan({ cls: 'gq-hint', text: ' · ' + min });
      h.createSpan({ cls: 'gq-fold-chev', text: '›' });
      h.onclick = () => this.unfold(c); c.prepend(h); c.addClass('gq-fold');
    }
    const nx = box.querySelector(':scope > .gq-next');
    // A card the student opened stays open when Today redraws (a color, a setting); Next up moves on.
    const kept = this.keepOpen && cards.find(c => c.hasClass(this.keepOpen)); if (kept) this.nextOpen = kept;
    if (this.nextOpen && cards.includes(this.nextOpen)) { if (nx) { nx.after(this.nextOpen); nx.addClass('is-slim'); if (!nx.querySelector('.gq-tour-line, .gq-next-back')) nx.hide(); } this.unfold(this.nextOpen, true); }
    // Everything else waits behind one small link.
    const rest = cards.filter(c => c !== this.nextOpen); if (!rest.length) return;
    box.addClass('gq-rest-off'); const foot = box.querySelector(':scope > .gq-tfoot');
    const a = createEl('a', { text: 'Do something else ›', href: '#', cls: 'gq-rest-link' }); a.onclick = e => { e.preventDefault(); box.toggleClass('gq-rest-off', !box.hasClass('gq-rest-off')); a.setText(box.hasClass('gq-rest-off') ? 'Do something else ›' : 'Fewer options'); };
    if (foot) foot.prepend(a); else box.appendChild(a);
    if (this.isKids) return;
    const d = createEl('button', { cls: 'gq-mini gq-die-btn', text: 'Roll the die', attr: { 'aria-label': 'Roll the die for something to do' } }); d.onclick = () => this.rollDie(); a.before(d);
  }
  unfold(c, quiet) {
    const box = c.parentElement; if (box) for (const o of box.querySelectorAll(':scope > .gq-fold.is-open')) if (o !== c) { o.removeClass('is-open'); const b = o.querySelector(':scope > .gq-fold-h'); if (b) b.setAttr('aria-expanded', 'false'); }
    c.addClass('is-open'); c.addClass('gq-chosen'); const b = c.querySelector(':scope > .gq-fold-h'); if (b) b.setAttr('aria-expanded', 'true');
    if (!quiet) { this.keepOpen = [...c.classList].find(t => t.startsWith('gq-') && !['gq-tcard', 'gq-kid', 'gq-fold', 'gq-chosen'].includes(t)) || null; c.scrollIntoView({ behavior: this.calmOn() ? 'auto' : 'smooth', block: 'start' }); }
  }
  focusCard(el) {
    if (!el) return; if (el.hasClass('gq-fold')) this.unfold(el); el.scrollIntoView({ behavior: this.calmOn() ? 'auto' : 'smooth', block: 'start' });
    el.removeClass('gq-pulse'); void el.offsetWidth; el.addClass('gq-pulse'); setTimeout(() => el.removeClass('gq-pulse'), 1800);
  }
  // The phone's ringer switch can't be read from an app, so the Greek voice has its own switch, kept on this device.
  setQuiet(q) {
    try { window.localStorage.setItem('gq-quiet', q ? '1' : '0'); } catch (e) {}
    if (q) { try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (e) {} }
    new Notice(q ? 'Greek voice off on this device. Turn it back on in Class, Options.' : 'Greek voice on.');
  }
  // How to add a Greek voice. auto: shown by itself when a Greek word could not be spoken, at most once per visit.
  voiceHelp(auto) {
    if (auto) { if (this.vhShown) return; this.vhShown = true; }
    const ua = gqUA(), android = gqAndroid(), ios = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
    const web = !!window.GQW, wv = gqWebView() || noSpeech();
    const m = new Modal(this.app); m.titleEl.setText(wv ? 'No sound in this browser' : 'Sound help');
    const c = m.contentEl; c.addClass('gq-vhelp');
    if (wv) c.createEl('p', { text: web ? 'This looks like an app\'s built-in browser (GroupMe, Facebook, Gmail and others open links this way). It cannot speak. Open the page in Chrome or Safari instead: tap the three dots or the share button, then Open in Chrome (or Open in browser).' : 'Obsidian on this phone has no voice. For sound, open the Greekquent web app in Chrome or Safari.' });
    else c.createEl('p', { text: noGreekVoice() ? 'This device has no Greek voice yet, so it would spell Greek words out letter by letter. The app stays quiet until one is added. It takes a minute and is free.' : 'Run the sound check first. It shows what this device is doing.' });
    // Sound check: what this device has, and what happened when it tried to speak.
    const ck = c.createDiv('gq-vcheck'); ck.createEl('strong', { text: 'Sound check' });
    const out = ck.createEl('ul', { cls: 'gq-vcheck-list' }), rows = [];
    const line = (t, bad) => { rows.push(t); out.createEl('li', { text: t, cls: bad ? 'is-bad' : '' }); };
    const report = () => {
      out.empty(); rows.length = 0;
      const ss = window.speechSynthesis, vs = ss ? (ss.getVoices() || []) : [], el = vs.filter(v => /^el/i.test(v.lang)); sayVoice = null; const gv = greekVoice();
      const br = /SamsungBrowser/i.test(ua) ? 'Samsung Internet' : /Firefox/i.test(ua) ? 'Firefox' : /EdgA?\//i.test(ua) ? 'Edge' : /CriOS|Chrome/i.test(ua) ? 'Chrome' : /Safari/i.test(ua) ? 'Safari' : 'another browser';
      line(`Device: ${android ? 'Android' : ios ? 'iPhone or iPad' : 'computer'}, ${gqWebView() ? 'an app\'s built-in browser' : web ? br : 'Obsidian'}${window.matchMedia && matchMedia('(display-mode: standalone)').matches ? ', installed app' : ''}.`, gqWebView());
      if (!ss) { line('Speech: not available here.', true); return; }
      line(`Voices on this device: ${vs.length}${vs.length ? '' : ' (none listed yet)'}.`, !vs.length);
      line(el.length ? `Greek voice: ${gv ? gv.name : el[0].name}${gv && gv.localService ? ', on the device' : gv ? ', over the internet' : ''}.` : 'Greek voice: none.', !el.length);
      line(`Greek voice in the app: ${gqQuiet() ? 'turned off (Options, Greek voice)' : 'on'}.`, gqQuiet());
      if (sayLast) line(sayLast.ok ? 'Last try: the voice started.' : sayLast.err ? `Last try: the voice reported an error (${sayLast.err}).` : 'Last try: the voice never started.', !sayLast.ok);
    };
    report();
    const r0 = ck.createDiv('gq-row'), fb = ck.createDiv('gq-hint');
    const tv = r0.createEl('button', { text: 'Test the Greek voice', cls: 'mod-cta' });
    tv.onclick = () => {
      if (gqQuiet()) { fb.setText('The Greek voice is off in Options. Turn it on, then test again.'); return; }
      if (noSpeech()) { fb.setText('This browser cannot speak. See above.'); report(); return; }
      if (noGreekVoice()) { fb.setText('No Greek voice yet. Follow the steps below, then close the app completely and open it again.'); report(); return; }
      fb.setText('You should hear Καλημέρα now…'); say('Καλημέρα');
      setTimeout(() => { report(); fb.setText(sayLast && sayLast.ok ? 'The voice started. Heard nothing? Turn up the media volume (press volume up while it talks, not the ringer), and check Bluetooth earbuds are not connected somewhere else.' : sayLast && sayLast.err ? 'The voice gave an error. Follow the steps below, then close the app completely and open it again.' : 'The voice did not start. Close the browser completely (swipe it away from recent apps) and open it again, then test once more.'); }, 3200);
    };
    const tb = r0.createEl('button', { text: 'Test a beep' }); tb.onclick = () => { gqSound('tink'); fb.setText(gqQuiet() ? 'Sound is off in Options.' : 'Heard the beep but not the voice? The speaker works; the voice needs the steps below.'); };
    const cp = r0.createEl('button', { text: 'Copy the details' });
    cp.onclick = async () => { report(); const t = ['Greekquent sound check', ...rows, ua].join('\n'); try { await navigator.clipboard.writeText(t); fb.setText('Copied. Paste it in Ask the class if you need help.'); } catch (e) { fb.setText(t); } };
    const steps = (title, list, open) => { const d = c.createEl('details'); if (open) d.open = true; d.createEl('summary', { text: title }); const ol = d.createEl('ol'); for (const s of list) ol.createEl('li', { text: s }); };
    steps('Android', ['Use Chrome. Links opened inside GroupMe, Facebook or Gmail can\'t speak: tap the three dots, then Open in Chrome.', 'Turn up the media volume: press volume up while the app talks. The ringer and silent mode don\'t control it.', 'Open Settings and search for Text-to-speech.', 'Tap Preferred engine and pick Speech Services by Google. (Samsung phones start with Samsung\'s engine, which may not have Greek.)', 'Tap the gear next to the engine, then Install voice data.', 'Pick Greek (Ελληνικά) and tap download.', 'Close Chrome completely (swipe it away from recent apps) and open it again.', 'No Google engine? Install Speech Services by Google from the Play Store, then start again.', 'Still quiet? Turn off Battery saver for Chrome, and check Bluetooth earbuds are not connected.'], (android || !ios) && !wv);
    steps('iPhone or iPad', ['Open Settings, then Accessibility, then Spoken Content, then Voices.', 'Tap Greek and download a voice.', 'Close the app or Safari completely and open it again.'], ios && !wv);
    steps('Computer', ['Windows: Settings, Time & language, Speech, Add voices, Greek.', 'Mac: System Settings, Accessibility, Spoken Content, System voice, Manage Voices, Greek.', 'Then reload this page.'], false);
    const r = c.createDiv('gq-row'); const x = r.createEl('button', { text: 'Close' }); x.onclick = () => m.close();
    m.open();
  }
  // Phonetics: on unless the student turned it off. The teacher vault starts with it off.
  phOn() { if (this.phNow !== undefined) return this.phNow; const v = this.progFm().phonetics; if (v === true || v === false) return v; return !this.app.vault.getAbstractFileByPath('Teacher'); }
  applyPh() {
    const on = this.phOn(); document.body.classList.toggle('gq-ph-off', !on);
    if (!this.phObs) {
      const q = new Set(); let raf = 0;
      const flush = () => { raf = 0; if (!this.phOn()) { q.clear(); return; } for (const n of q) if (n && n.isConnected) phScan(n); q.clear(); };
      this.phObs = new MutationObserver(ms => {
        for (const m of ms) {
          if (m.type === 'characterData') { q.add(m.target); continue; }
          for (const n of m.addedNodes) { if (n.nodeType === 1 && (n.classList.contains('gq-pr') || n.classList.contains('gq-prt'))) continue; q.add(n); }
        }
        if (!raf) raf = requestAnimationFrame(flush);
      });
      this.phObs.observe(document.body, { childList: true, subtree: true, characterData: true });
      this.register(() => this.phObs.disconnect());
    }
    if (on) phScan(document.body);
  }
  async setPh(on) { this.phNow = on; this.applyPh(); const f = await this.progressFile(); await this.app.fileManager.processFrontMatter(f, fm => { fm.phonetics = on; }); this.paintMore(); new Notice(on ? 'Phonetics on: the sound of each Greek word shows under it.' : 'Phonetics off: just the Greek letters. Turn it back on any time in More.'); }
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
  planRow(c, force) {
    const plan = this.planNowGet(), d = c.createDiv('gq-plan');
    if (plan) {
      d.createSpan({ cls: 'gq-plan-say', text: `After ${plan}: today's line. ` });
      const ch = d.createEl('a', { text: 'Change', href: '#', cls: 'gq-hint' }); ch.onclick = e => { e.preventDefault(); this.setPlan(''); };
      if (window.GQW || !(Platform && Platform.isMobileApp)) { d.createSpan({ cls: 'gq-hint', text: ' · ' }); const k = d.createEl('a', { text: 'Add to my calendar', href: '#', cls: 'gq-hint' }); k.onclick = e => { e.preventDefault(); this.planIcs(plan); }; }
      return;
    }
    if (!force && this.lsGet('planlater', 0) > Date.now()) { d.remove(); return; }
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
    if (si && si.due && this.storyEl) steps.push({ label: `Story puzzle, part ${si.part}`, min: this.est('story', 2), el: this.storyEl, key: 'story', go: () => this.focusCard(this.storyEl) });
    const abcGo = { label: 'Alphabet, one set', min: 2, el: this.abcEl, key: 'abc', go: () => this.focusCard(this.abcEl) }, abcNew = !this.lettersDone().length && !this.namesDone().length;
    if (this.abcEl && !this.doneToday('abc')) { if (abcNew) steps.unshift(abcGo); else steps.push(abcGo); }
    if (this.cbList && this.cbList.length && !this.doneToday('cb')) steps.push({ label: 'Spaced review', min: 1, key: 'cb', go: () => this.popComebacks(this.cbList.slice(0, 1)) });
    if (rev.length && this.revEl && !this.doneToday('rev')) { const n = Math.min(8, rev.length); steps.push({ label: `${n} review word${n === 1 ? '' : 's'}`, key: 'rev', el: this.revEl, min: Math.max(1, Math.round(n * 12 / 60)), go: () => { this.markDone('rev'); this.focusCard(this.revEl); } }); }
    if (this.cyc && this.cycEl && !this.doneToday('cyc')) steps.unshift({ label: this.cyc.label, min: this.cyc.min, el: this.cycEl, key: 'cyc', go: () => this.focusCard(this.cycEl) });
    const head = c.createDiv('gq-thead'), line = c.createDiv('gq-next-line'), r = c.createDiv('gq-row'), s = steps[0];
    this.nextOpen = (s && s.el) || null; this.nextSteps = steps;
    if (s && away >= 2) { head.createEl('strong', { text: 'Welcome back' }); line.setText('Just one line today?'); }
    else if (s) { head.createEl('strong', { text: 'Next' }); line.setText(`${s.label} · about ${s.min} min`); }
    else { head.createEl('strong', { text: 'Done for today' }); line.setText('Θα τα πούμε. One more? Pick one.'); line.setAttr('lang', 'el'); }
    if (s) { const b = r.createEl('button', { text: away >= 2 ? 'One line' : 'Start', cls: 'mod-cta' }); b.onclick = () => { this.tourHit('next'); s.go(); }; }
    else for (const [t, fn] of this.choiceTwo(rev)) { const b = r.createEl('button', { text: t }); b.onclick = () => { this.tourHit('next'); fn(); }; }
    // A good week shows; nothing resets and a missed day never counts against anyone.
    { const m = new Date(); m.setDate(m.getDate() - ((m.getDay() + 6) % 7)); const mon = ymd(m), wk = Object.keys(days || {}).filter(d => d >= mon && d <= today && +days[d] > 0).length;
      if (wk && !this.isKids) c.createDiv({ cls: 'gq-hint gq-week-line', text: wk >= 5 ? `This week: ${wk} days. That is the habit.` : `This week: ${wk} of 5 days` }); }
    const wh = this.whereGet();
    if (wh) { const d = c.createDiv('gq-hint gq-next-back'); d.appendText('Back to where you were: '); const a = d.createEl('a', { text: wh.label, href: '#' }); a.onclick = e => { e.preventDefault(); this.whereGo(wh); }; }
    if (!ctx.fresh || this.planNowGet() || this.tourIs('plan')) this.planRow(c);
    const first = box.querySelector(':scope > .gq-tcard:not(.gq-class-ask)'); if (first) box.insertBefore(c, first); else box.appendChild(c);
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
    if ((this.worldKey()) !== 'dance') return;
    const got = Object.entries(this.moData().dance || {}).filter(([k, v]) => DANCE_NAME[k] && +v > 0);
    if (!got.length) return;
    const order = [...DANCES.map(d => d[1]), ...GUEST_DANCES.map(d => d[0])]; got.sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]));
    c.createDiv({ cls: 'gq-hint gq-steps', text: 'Your dances' });
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
    const wk = r.createEl('button', { text: 'Walk mode', cls: 'gq-mini' }); wk.onclick = () => this.walkMode();
    s.createDiv({ cls: 'gq-hint', text: 'Walk mode plays your Greek hands-free. It is also in Options, at the bottom of Class, with Calm mode and Focus sound.' });
    const plan = this.planNowGet(); if (plan) s.createDiv({ cls: 'gq-hint', text: `Your plan: after ${plan}, today's line.` });
    if (!this.app.vault.getAbstractFileByPath(EXTRAS + '13 Focus tips.md')) return;
    const tip = s.createEl('a', { text: 'Focus tips', href: '#', cls: 'gq-hint' }); tip.onclick = e => { e.preventDefault(); this.openNote(EXTRAS + '13 Focus tips.md'); };
  }
  // ---------- Options: every on/off switch in one place, opened from the side panel or the ⋯ menu ----------
  optionsPop() {
    this.tourHit('more');
    const O = [
      { t: 'Greek voice', d: 'Off keeps the app quiet on this device, for class or a shared room.', on: () => !gqQuiet(), set: v => this.setQuiet(!v) },
      { t: 'Phonetics', d: 'Shows how to say each Greek word in Latin letters.', on: () => this.phOn(), set: v => this.setPh(v) },
      { t: 'Calm mode', d: 'Stops the moving parts.', on: () => this.calmOn(), set: v => this.setCalm(v) },
      { t: 'Focus sound', d: 'A soft hiss (pink noise). It helps some people and bothers others.', on: () => !!this.noise, set: v => { if (!!this.noise !== v) this.toggleNoise(); } },
      !this.isKids && { t: 'Fluent in a Year pace', d: 'The story one day a day, to finish the 1,500 words in a year. Today shows if you are behind.', on: () => !!this.colors().fiay, set: v => this.setFiay(v) }
    ].filter(Boolean);
    this.pop('Options', [{ label: '', build: el => {
      const list = el.createDiv('gq-opts');
      if (!this.isKids && !this.app.vault.getAbstractFileByPath('Teacher')) setTimeout(() => { const a = el.createEl('a', { text: 'Setup again: start and pace', href: '#', cls: 'gq-hint gq-setup-again' }); a.onclick = e => { e.preventDefault(); this.setupAgain(); }; }, 0);
      if (!this.isKids && !this.app.vault.getAbstractFileByPath('Teacher')) { const row = list.createDiv('gq-opt'), tx = row.createDiv('gq-opt-tx');
        tx.createDiv({ cls: 'gq-opt-t', text: 'Class days and book' }); tx.createDiv({ cls: 'gq-hint', text: this.classDaysText() + ' · ' + { beg: 'Beginners\u2019 Greek', comp: 'Complete Greek', both: 'both books', none: 'no book' }[this.classBooks()] + '. Today plans your week around them: Language Transfer after class, the book before the next one.' });
        const ch = row.createEl('button', { text: 'Change', cls: 'gq-mini' }); ch.onclick = () => { const p = document.querySelector('.gq-pop'); if (p) p.remove(); this.classDaysPop(); }; }
      for (const o of O) {
        const row = list.createDiv('gq-opt'), tx = row.createDiv('gq-opt-tx');
        tx.createDiv({ cls: 'gq-opt-t', text: o.t }); tx.createDiv({ cls: 'gq-hint', text: o.d });
        const sw = row.createEl('button', { cls: 'gq-switch', attr: { role: 'switch', 'aria-label': o.t } });
        const paint = () => { const on = !!o.on(); sw.setAttr('aria-checked', String(on)); sw.toggleClass('is-on', on); };
        sw.onclick = async () => { await o.set(!o.on()); setTimeout(paint, 60); }; paint();
        // Walk mode sits with the other focus helpers, right after Focus sound.
        if (o.t === 'Focus sound') { const wr = list.createDiv('gq-opt'), wt = wr.createDiv('gq-opt-tx');
          wt.createDiv({ cls: 'gq-opt-t', text: 'Walk mode' }); wt.createDiv({ cls: 'gq-hint', text: 'Plays your Greek hands-free: the Greek, a pause to say it, the English, the Greek again.' });
          const go = wr.createEl('button', { text: 'Start', cls: 'gq-mini' }); go.onclick = () => { const p = document.querySelector('.gq-pop'); if (p) p.remove(); this.walkMode(); }; }
      }
      if (FRIENDS_ON) { const row = list.createDiv('gq-opt gq-opt-col'), tx = row.createDiv('gq-opt-tx');
        tx.createDiv({ cls: 'gq-opt-t', text: 'Your friend' }); tx.createDiv({ cls: 'gq-hint', text: 'Who lives in the corner and grows with your φόρα.' });
        const ch = row.createDiv('gq-chips gq-opt-worlds'), bs = [];
        const paint = () => bs.forEach(([k, b]) => { const on = k === this.worldKey(); b.toggleClass('mod-cta', on); b.setAttr('aria-pressed', String(on)); });
        for (const [k, nm] of [['grove', 'Plant'], ['pet', 'Pet'], ['dance', 'Dancer'], ['gyro', 'Gyro shop'], ['village', 'House'], ['gallery', 'Statue']]) { const b = ch.createEl('button', { text: nm, cls: 'gq-mini' }); b.onclick = async () => { await this.setWorld(k); paint(); }; bs.push([k, b]); }
        paint(); }
      const h = el.createDiv('gq-hint gq-opt-foot'), a = h.createEl('a', { text: 'Sound help', href: '#' }); a.onclick = e => { e.preventDefault(); this.voiceHelp(false); };
    } }]);
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
      const ss = window.speechSynthesis; if (!ss || !t || gqQuiet()) return res();
      if (noSpeech() || (lang === 'el' && noGreekVoice())) { if (window.gqNoVoice) window.gqNoVoice(); return res(); }
      const u = new SpeechSynthesisUtterance(lang === 'el' ? ttsFix(t) : t); u.lang = lang === 'el' ? 'el-GR' : 'en-US'; if (lang === 'el') { const v = greekVoice(); if (v) try { u.voice = v; } catch (e) {} }
      // onend can go missing on Android, so a line never waits longer than it could take to say (plus the 2.5 s watchdog).
      let done = false; const fin = () => { if (!done) { done = true; res(); } }; u.onend = fin; u.onerror = fin; setTimeout(fin, 4300 + String(t).length * 110);
      speakU(u);
    });
  }
  // Walk mode: hands-free. The Greek, a pause to say it yourself, the English, the Greek again. This week's story and your review words.
  walkItems() {
    const tb = this.todayBeat, out = [];
    if (tb) for (const x of [...tb.before, tb.b]) if (x && x.gr) out.push({ gr: x.gr.replace(/ — /g, ' '), en: x.en || '' });
    for (const w of [...(this.todayPlay || []), ...(this.reviewPlay || [])].slice(0, 20)) out.push({ gr: w.label || w.word, en: w.en || w.english || '' });
    if (this.isKids && this.walkK) out.push(...this.walkK);
    if (out.length < 8) for (const w of this.walkW || []) out.push({ gr: w.word, en: w.english || '' });
    const seen = new Set(); return out.filter(x => x.gr && !seen.has(x.gr) && seen.add(x.gr)).slice(0, 30);
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
    pb.onclick = () => {
      run = !run; pb.setText(run ? 'Pause' : 'Go on');
      // Speak first, inside the tap: iPhones only let a page talk when the first words start from a tap.
      if (run) { if (!t0) t0 = Date.now(); try { if (speechSynthesis.speaking) speechSynthesis.cancel(); } catch (e) {} loop(++gen); try { if (navigator.wakeLock && !lock) navigator.wakeLock.request('screen').then(l => { lock = l; }, () => {}); } catch (e) {} }
      else { gen++; try { speechSynthesis.cancel(); } catch (e) {} }
    };
    sb.onclick = () => m.close();
    m.onClose = () => { alive = false; run = false; gen++; pay(); try { speechSynthesis.cancel(); if (lock) lock.release(); } catch (e) {} };
    m.open();
  }
  async renderToday(el) { if (this.needSetup()) { this.opening(el); return; } await this.renderToday0(el); if (el.isConnected) this.cornerSync(); }
  async renderToday0(el) {
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
      // The story and Fluent in a Year can run from the student's own day one (fiay_from), not the class calendar. Class stays on the calendar.
      const own = this.fyOwn(col, now), fw = own ? own.week : week, fdow = own ? own.dow : dow, fdd = own ? own.dd : dd;
      if (this.showSwitch()) this.scriptSwitch(box);
      const moFresh = !Object.keys(this.moData().days || {}).length;
      this.paperCard(box, dd);
      // The week between classes, first on Today. Students who haven't said their class days are asked once.
      this.cyc = null; this.cycEl = null;
      if (!this.isKids && !this.app.vault.getAbstractFileByPath('Teacher')) {
        const st0 = this.ltStage(col);
        // The homework cycle starts once class days are known: picked in Options, or learned from the first class (classSeen).
        if (st0 !== 'ears' && st0 !== 'read' && this.classDays() !== null) { this.cyc = await this.cycleInfo(now); if (this.cyc) this.cycleCard(box, col, this.cyc); }
      }
      if (!col.setup_seen && !this.tourLeft()) {
        const s = box.createDiv('gq-tcard gq-tnew'); s.createSpan({ text: 'New here? ' });
        const a = s.createEl('a', { text: 'Read Setting up', href: '#' }); a.onclick = e => { e.preventDefault(); this.setupSeen(); this.openNote(SETUP); };
        s.createSpan({ text: ' (2 minutes). ' }); const x = s.createEl('button', { text: 'Got it' }); x.onclick = () => this.setupSeen();
      }
      const wk = await this.weekNote(fw), wkCal = own ? await this.weekNote(week) : wk;
      if (wk) {
        const days = await this.weekDays(wk.file);
        const beats = await this.beatIndex(), dayNow = days[DAYS[fdd < 0 ? 1 : (fdow || 6)]];
        const cal = fdd < 0 ? 1 : (dayNow && dayNow.n) || Math.max(0, ...Object.keys(beats).map(Number).filter(k => beats[k].week < fw));
        this.todayBeat = null; this.storyEl = null; this.storyInfo = null; this.cbList = null;
        this.fyPace = { fw, own };
        // Ears first (new to Greek): Language Transfer, then the six reading sessions. Nothing to read on Today until then.
        const ears = this.ltStage(col); this.abcEl = null;
        if (ears === 'ears' || ears === 'read') this.ltCard(box, col, ears);
        else {
        if (cal) await this.storyCard(box, beats, cal, fdd >= 0 && fdow === 0, col);
        // Spaced review brings back earlier story lines and red, yellow and old green words.
        await this.comebackCard(box, beats, col, cal);
        // The alphabet runs alongside the first weeks: sounds and names, a set at a time, until all are done.
        if (!this.abcAllDone() && !this.abcOff()) { this.lettersCard(box); this.abcEl = box.lastElementChild; }
        }
        if (!this.tabOn('class')) await this.classCard(box, wkCal, week);
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
      this.reviewPlay = rev.slice(0, 40); this.todayWeek = wk; try { const ln = wk && wk.fm && wk.fm.lesson; this.walkW = ln ? words.filter(w => (w.lessons || []).includes(ln)).slice(0, 24) : []; } catch (e) { this.walkW = []; }
      { const st = this.ltStage(col); if (st !== 'ears' && st !== 'read') await this.nextCard(box, { rev, fresh: moFresh }); }
      await this.weekFocusCards(box, col, wk);
      this.stackOn = false; this.reportCard(box, true);
      this.cardStack(box, false);
      // The rest of the app sits behind ··· on the Done card: nothing extra on the page.
      const dn = box.querySelector('.gq-kdone') || box;
      if (this.updateReady && !this.updating) { const up = dn.createDiv('gq-row gq-pillrow').createEl('button', { text: 'Install update', cls: 'gq-ghost' }); up.onclick = () => this.updateVault(false); }
      this.addMore(dn, ['Story, games, colors, tools', () => this.showMore()]);
      if (this.abcKnown()) { /* reads the alphabet: no letter practice at all */ }
      else if (this.abcOff()) this.addMore(dn, ['Letter practice', () => this.setAbcOff(false)]);
      else if (this.abcAllDone()) this.addMore(dn, ['Alphabet', () => { this.lettersCard(box); const k = box.lastElementChild; box.appendChild(k); k.scrollIntoView({ block: 'start', behavior: 'smooth' }); }]);
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
  // Kids: listen first. Two small figures say the week's lines so far, one after the other; the line being said lights up.
  kidScene(box, ls, sun) {
    if (!ls.length) return;
    const c = box.createDiv('gq-tcard gq-kid gq-kscene'); c.dataset.tour = 'scene';
    c.createDiv({ cls: 'gq-thead' }).createEl('strong', { text: 'Listen first' });
    c.createDiv({ cls: 'gq-hint', text: sun ? 'Sunday: the whole week as one story. Just listen.' : 'Today\'s part of the story. Just listen.' });
    const stage = c.createDiv({ cls: 'gq-ksc-stage', attr: { 'aria-hidden': 'true' } });
    const who = [...new Set(ls.map(l => l.who))], figs = [0, 1].map(j => {
      const cv = stage.createEl('canvas', { cls: 'gq-spr gq-ksc-fig' });
      const rows = sprRows('dance', 0, 'still').map(row => j ? row.replace(/w/g, 'B').replace(/r/g, 'y').replace(/h/g, 'n') : row);
      sprPaint(cv, rows); return cv; });
    const ol = c.createEl('ol', { cls: 'gq-storylist gq-ksc-lines' });
    const lis = ls.map(l => { const li = ol.createEl('li'); li.createSpan({ cls: 'gq-hint', text: l.who + ': ' }); li.createSpan({ text: l.gr, attr: { lang: 'el' } }); return li; });
    const b = c.createDiv('gq-row').createEl('button', { text: 'Play', cls: 'mod-cta' });
    let run = 0;
    b.onclick = async () => {
      const my = ++run; b.setText('Playing…'); b.disabled = true;
      for (let j = 0; j < ls.length; j++) {
        if (my !== run || !c.isConnected) return;
        lis.forEach((li, q) => li.toggleClass('gq-now', q === j));
        const f = figs[Math.max(0, who.indexOf(ls[j].who)) % 2]; f.addClass('is-talk');
        try { await this.sayP(ls[j].gr, 'el'); } catch (e) {}
        f.removeClass('is-talk'); await new Promise(res => setTimeout(res, 450));
      }
      b.setText('Again'); b.disabled = false;
    };
  }
  // One audio player for the tune, kept for the whole visit. A new one per tap lost the first notes: phones start its clock late,
  // and iPhone needs a sound in the tap to switch to playback. So: unlock in the tap, then wait until the clock really runs.
  async songCtx() {
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
    if (!this.songAC || this.songAC.state === 'closed') {
      this.songAC = new AC();
      try { const a = new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA='); a.volume = 0; a.play().catch(() => {}); } catch (e) {}
    }
    const ctx = this.songAC;
    try { const b = ctx.createBuffer(1, 1, 22050), src = ctx.createBufferSource(); src.buffer = b; src.connect(ctx.destination); src.start(0); } catch (e) {}
    try { if (ctx.state !== 'running') await ctx.resume(); } catch (e) {}
    const t = ctx.currentTime, until = Date.now() + 1500;
    while (ctx.currentTime <= t && Date.now() < until) await new Promise(r => setTimeout(r, 30));
    return ctx;
  }
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
      const ctx = await this.songCtx();
      if (!ctx) { new Notice('This device cannot play the tune. Sing it with Hear the words.'); return; }
      const beat = 60 / bpm, t0 = ctx.currentTime + 0.35, events = [];
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
        else { clear(); play.setText('Sing it again'); this.songStop = null; this.moAdd('did', 'song', 2); }
      };
      raf = requestAnimationFrame(frame);
      play.setText('Stop');
      this.songStop = () => { cancelAnimationFrame(raf); clear(); play.setText('Sing the hello song'); try { out.disconnect(); } catch (e) {} };
    };
    play.onclick = () => { if (this.songStop) stop(); else run(112); };
    slow.onclick = () => run(84);
    words.onclick = () => { stop(); say(HELLO_SONG.map(l => l.gr).join(' ')); };
  }
  async renderKidsToday(el, tok, info) {
    const box = createDiv('gq-today gq-kids-today'), col = this.colors(), wk = this.kidWeek(info);
    const f = this.kidFile(wk.lesson);
    const now = new Date();
    this.helloSong(box); if (box.lastElementChild) box.lastElementChild.dataset.tour = 'hello';
    // Starting out: the song, the letters and φόρα only, until the first letter set is done (or a grown-up opens the rest).
    const lDone = this.lettersDone(), simple = false;
    this.kidSimpleOn = simple;
    if (lDone.length < LETTER_SETS.length && !this.abcOff()) this.lettersCard(box);
    if (simple) {
      const c = box.createDiv('gq-tcard gq-kid gq-kidrest');
      c.createDiv({ cls: 'gq-hint', text: 'After the first letters, the rest of today opens: the lesson game, the story puzzle and this week\'s words.' });
      const b = c.createDiv('gq-row').createEl('button', { text: 'Show the rest of today', cls: 'gq-mini' }); b.onclick = () => this.kidFull();
      this.kidFoot(box, el, tok, col, wk); return;
    }
    if (!f) { box.createDiv({ cls: 'gq-tcard', text: 'This lesson is not in the vault yet. Tap More, then Update vault.' }); if (tok === el.gqTok) { el.empty(); el.appendChild(box); } return; }
    const txt = await this.app.vault.cachedRead(f), title = f.basename.replace(/^K\d+\s*/, '').replace(/-student$/, '');
    // 1. The game
    const g = box.createDiv('gq-tcard gq-kid gq-kgame'), gh = g.createDiv('gq-thead'); g.dataset.tour = 'game';
    gh.createEl('strong', { text: `This week's game: ${title}` });
    gh.createSpan({ cls: 'gq-hint', text: `  · lesson ${wk.lesson}` + (wk.before ? ' · class starts Oct 26' : '') });
    const game = (txt.match(/\*\*The game:\*\*\s*(.+)/) || [])[1]; if (game) g.createDiv({ cls: 'gq-kidgame', text: game });
    if (!wk.fresh && !wk.before) g.createDiv({ cls: 'gq-hint', text: 'No class this week. Play last week\'s game again: it is easier the second time.' });
    const r1 = g.createDiv('gq-row'); const ob = r1.createEl('button', { text: 'Open the lesson', cls: 'mod-cta' }); ob.onclick = () => this.openNote(f.path);
    // 2. Say it: one more line each day of the week (Sunday shows them all)
    const lines = this.kidLines(this.kidSection(txt, 'Say it'));
    if (lines.length) {
      const k = wk.dow === 0 ? lines.length - 1 : (Math.max(1, wk.dow) - 1) % lines.length;
      this.kidScene(box, lines.slice(0, k + 1), wk.dow === 0);
      const c = box.createDiv('gq-tcard gq-kid gq-ksay'); c.createDiv({ cls: 'gq-thead' }).createEl('strong', { text: 'Say it together' });
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
      const c = box.createDiv('gq-tcard gq-kid gq-kteach'); c.dataset.tour = 'teacher'; c.createDiv({ cls: 'gq-thead' }).createEl('strong', { text: 'Now you are the teacher' });
      c.createDiv({ cls: 'gq-hint', text: 'Swap. You ask the questions. The grown-up gets one wrong on purpose. Catch it.' });
      const ol = c.createEl('ol', { cls: 'gq-storylist gq-plain gq-kteach-list' });
      // Every line says who says it, and the grown-up's turn without Greek ("answers, and sometimes gets it wrong") stays in as a step.
      for (const m of this.kidSection(txt, 'You are the teacher').matchAll(/^- ([^:*]+):\s*(.+)$/gm)) {
        const who = m[1].replace(/\s*\(teacher\)/i, '').trim(), b = /\*\*(.+?)\*\*\s*(?:—\s*(.+))?$/.exec(m[2]);
        const li = ol.createEl('li', { cls: /grown/i.test(who) ? 'is-grown' : 'is-kid' }); li.createSpan({ cls: 'gq-kt-who', text: who + ': ' });
        if (b) { li.createSpan({ text: b[1], attr: { lang: 'el' } }); if (b[2]) li.createDiv({ cls: 'gq-hint', text: b[2] }); }
        else li.createSpan({ cls: 'gq-hint', text: m[2].trim() });
      }
      this.didBtn(c, 'teacher:' + wk.lesson);
    }
    // 4. This week's words, nouns first, with the colors
    // Today's words: up to 3 a day. This week's new words first, spread over the week (3 on Monday, the next 3 on Tuesday…),
    // then words still red or yellow (this week's or earlier), then this week's words not yet green.
    const idx = await this.wordIndex(), wkAll = idx.filter(w => (w.kid || []).includes(wk.lesson));
    const isNew = w => Math.min(...w.kid.map(Number)) === wk.lesson, day = wk.dow === 0 ? 7 : wk.dow;
    const fresh = wkAll.filter(isNew).slice((day - 1) * 3, day * 3), words = [...fresh];
    const add = l => { for (const w of l) if (words.length < 3 && !words.includes(w)) words.push(w); };
    const met = idx.filter(w => (w.kid || []).some(n => +n <= wk.lesson));
    add(met.filter(w => this.colorOf(w.word) === 'red')); add(met.filter(w => this.colorOf(w.word) === 'yellow'));
    add(wkAll.filter(w => !isNew(w) || wkAll.filter(isNew).indexOf(w) < (day - 1) * 3).filter(w => this.colorOf(w.word) !== 'green'));
    // Walk mode plays this week's lines and words.
    this.walkK = [...sw.filter(l => l.gr), ...words.map(w => ({ gr: w.word, en: w.english || '' }))];
    if (words.length) {
      const c = box.createDiv('gq-tcard gq-kid gq-kwordsc'); c.dataset.tour = 'words'; c.createDiv({ cls: 'gq-thead' }).createEl('strong', { text: "Today's words" });
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
        paint(); if (fresh.includes(w)) top.createSpan({ cls: 'gq-knewtag', text: 'new' });
      });
    }
    // 5. Moves
    const mv = [...this.kidSection(txt, 'Do the moves').matchAll(/^- \*\*(.+?)\*\*:\s*(.+)$/gm)];
    if (mv.length) {
      const c = box.createDiv('gq-tcard gq-kid gq-kmoves'); c.createDiv({ cls: 'gq-thead' }).createEl('strong', { text: 'Do the moves' });
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
    if (lDone.length >= LETTER_SETS.length && !this.abcOff()) this.lettersCard(box);
    this.cardStack(box, true);
    await this.kidFoot(box, el, tok, col, wk);
  }
  // ---------- Kids Today as a stack of cards: the top one in full, the edges of the next ones peeking out underneath.
  // Swipe the top card to either side (or tap Next) and the next one comes up: the hello song, then letters, then the lesson.
  cardStack(box, kids) {
    const all = [...box.querySelectorAll(':scope > .gq-tcard')], nxc = box.querySelector(':scope > .gq-next');
    const tools = all.find(c => c.hasClass('gq-ttools')), mo = all.find(c => c.hasClass('gq-mo') && (kids || c.hasClass('is-fresh')));
    let list = all.filter(c => c !== tools && c !== mo && c !== nxc && !c.hasClass('gq-mo'));
    // One path through the day, always in the same order. Grown-ups: the report when due, letters in the first weeks,
    // today's story (scene, words, build, say it), spaced review, Fluent in a Year. Kids: letters, listen first, the week's words,
    // the puzzle, say it together, then the song, the game, the swap and the moves.
    // The separate review word list is not on the path; spaced review is the day's review step.
    // Kids: four cards. Hello (song, letters while they last) · Listen and say (listen first, say it together, the moves) ·
    // Today's words (with the story puzzle) · Play (the game, then you are the teacher). Dessert waits on the All done card.
    let dessert = null;
    if (kids) {
      dessert = list.find(c => c.hasClass('gq-dessert')); if (dessert) list = list.filter(c => c !== dessert);
      const groups = [['Hello', 'gq-song', 'gq-abc'], ['Listen and say', 'gq-kscene', 'gq-ksay', 'gq-kmoves'], ["Today's words", 'gq-kwordsc', 'gq-story'], ['Play', 'gq-kgame', 'gq-kteach']];
      for (const [nm, ...cls] of groups) {
        const parts = cls.map(k => list.find(c => c.hasClass(k))).filter(Boolean); if (!parts.length) continue;
        const head = parts[0]; head.dataset.kname = nm;
        for (const p of parts.slice(1)) { p.removeClass('gq-tcard'); p.addClass('gq-ksub'); head.appendChild(p); list = list.filter(c => c !== p); }
      }
    }
    if (!kids) { const rv = list.filter(c => c.hasClass('gq-review')); rv.forEach(c => c.remove()); list = list.filter(c => !rv.includes(c)); }
    const rank = kids ? ['gq-song', 'gq-abc', 'gq-kscene', 'gq-kwordsc', 'gq-kgame'] : ['gq-hear', 'gq-class-ask', 'gq-focus', 'gq-cycle', 'gq-lt', 'gq-report', 'gq-abc', 'gq-story', 'gq-comeback', 'gq-fiay', 'gq-class', 'gq-watch', 'gq-build'];
    const rk = c => { const k = rank.findIndex(x => c.hasClass(x)); return k < 0 ? rank.length : k; };
    list = list.map((c, k) => [c, k]).sort((a, b) => rk(a[0]) - rk(b[0]) || a[1] - b[1]).map(x => x[0]);
    if (mo) list.push(mo);
    const done = createDiv('gq-tcard gq-kid gq-kdone');
    done.createDiv({ cls: 'gq-thead' }).createEl('strong', { text: kids ? 'All done for today' : 'Done for today' });
    done.createDiv({ cls: 'gq-kbye', text: 'Θα τα πούμε.', attr: { lang: 'el' } });
    if (kids) done.createDiv({ cls: 'gq-hint', text: 'See you next time. Or play one more:' });
    else { done.addClass('gq-adone'); done.createDiv({ cls: 'gq-kbye-en', text: this.seeYou() }); }
    if (dessert) { dessert.removeClass('gq-tcard'); dessert.addClass('gq-ksub'); done.appendChild(dessert); }
    if (tools) { tools.removeClass('gq-tcard'); done.appendChild(tools); }
    let again;
    if (!kids) {
      // One more is the die: it picks one of six things, so there is nothing to choose.
      const d = done.createDiv('gq-row gq-pillrow').createEl('button', { text: 'One more', cls: 'gq-die-btn gq-pill-w' }); d.onclick = () => this.rollDie();
      this.addMore(done, ['Back to the start', () => again.onclick({ preventDefault() {} })]);
      this.addMore(done, ['This week\u2019s focus: ' + this.focusName(), () => this.focusPop()]);
      again = {};
    } else again = done.createDiv('gq-row').createEl('a', { text: 'Back to the start', href: '#', cls: 'gq-hint' });
    list.push(done);
    const wrap = createDiv('gq-kwrap'), st = wrap.createDiv({ cls: 'gq-kstack', attr: { 'aria-roledescription': 'card stack' } });
    const e2 = st.createDiv('gq-kedge gq-kedge2'), e1 = st.createDiv('gq-kedge gq-kedge1');
    for (const c of list) { c.addClass('gq-kcard'); st.appendChild(c); }
    st.setAttr('aria-label', 'Today');
    if (nxc) { nxc.addClass('is-slim'); delete nxc.dataset.tour; if (!nxc.querySelector('.gq-tour-line, .gq-next-back, .gq-week-line')) nxc.hide(); }
    wrap.dataset.tour = kids ? 'stack' : 'next'; this.stackOn = true; this.stackNx = st;
    const anchor = nxc || box.querySelector(':scope > .gq-knew') || box.querySelector(':scope > h2'); if (anchor) anchor.after(wrap); else box.prepend(wrap);
    const name = c => c.dataset.kname ? c.dataset.kname : c.hasClass('gq-class-ask') ? 'Class days' : c.hasClass('gq-focus') ? 'This week' : c.hasClass('gq-watch') ? 'Watch this' : c.hasClass('gq-build') ? 'Build with your words' : c.hasClass('gq-hear') ? 'Build what you heard' : c.hasClass('gq-cycle') ? (c.dataset.name || 'This week') : c.hasClass('gq-abc') ? (kids ? 'Letters' : 'Alphabet') : c.hasClass('gq-report') ? 'Your numbers' : c.hasClass('gq-story') ? (kids ? 'Story puzzle' : 'Today\'s story') : c.hasClass('gq-comeback') ? 'Review' : c.hasClass('gq-kscene') ? 'Listen first' : c.hasClass('gq-ksay') ? 'Say it together' : c.hasClass('gq-kwordsc') ? 'Today\'s words' : c.hasClass('gq-kgame') ? 'The game' : c.hasClass('gq-kteach') ? 'You are the teacher' : c.hasClass('gq-kmoves') ? 'The moves' : c.hasClass('gq-fiay') ? 'Fluent in a Year' : c.hasClass('gq-mo') ? 'Πάρε φόρα' : c.hasClass('gq-song') ? 'Hello song' : c.hasClass('gq-kdone') ? 'All done' : (((c.querySelector('.gq-thead strong') || {}).textContent || 'Next').split(':')[0]);
    if (!kids) {
      const tn = c => c !== done && !c.hasClass('gq-class-ask') && !c.hasClass('gq-focus') && !c.hasClass('gq-mo');
      this.useLog(list.filter(tn).map(name));
      st.addEventListener('click', e => { if (e.target.closest('.gq-another')) return; const c = e.target.closest('.gq-kcard'); if (c && tn(c)) this.useTap(name(c)); }, true);
      this.voteAsk(done);
    }
    // Where you are today is kept, so leaving and coming back lands on the same step. A new day starts at the top.
    const today = ymd(new Date()), at = this.lsGet('dayat', null);
    let i = this.stackPick ? list.findIndex(c => name(c) === this.stackPick) : -1;
    if (i < 0 && at && at.d === today) i = list.findIndex(c => name(c) === at.n);
    if (i < 0) i = 0;
    const steps = list.length - 1;
    const more = createDiv({ cls: 'gq-hint gq-another' }); const ma = more.createEl('a', { href: '#' }); const cnt = more.createSpan({ cls: 'gq-another-n' });
    const paint = () => {
      list.forEach((c, k) => c.toggleClass('is-top', k === i));
      // One dot per card, the Next arrow at the right. Swiping works too.
      list[i].appendChild(more); ma.setText(list[i] === done ? '' : '\u203a'); cnt.setText(''); more.toggleClass('is-last', list[i] === done);
      let dots = more.querySelector('.gq-sdots'); if (dots) dots.remove(); dots = createDiv({ cls: 'gq-sdots', attr: { role: 'tablist', 'aria-label': 'Today' } }); more.prepend(dots);
      list.forEach((c, k) => { const d = dots.createEl('button', { cls: 'gq-sdot' + (k === i ? ' is-on' : '') + (k < i ? ' is-past' : ''), attr: { role: 'tab', 'aria-selected': String(k === i), 'aria-label': name(c) } }); d.onclick = e => { e.preventDefault(); e.stopPropagation(); go(k, k > i ? -1 : 1); }; });
      ma.setAttr('aria-label', list[i] === done ? '' : i + 1 < steps ? `Next: ${name(list[i + 1])}` : 'Finish today'); ma.toggleClass('is-hidden', list[i] === done);
      st.setAttr('aria-label', `Today: ${name(list[i])}`);
    };
    const keep = () => { this.stackPick = name(list[i]); this.lsSet('dayat', { d: today, n: name(list[i]) }); };
    const go = (k, dir) => {
      if (k < 0 || k >= list.length || k === i) return;
      const cur = list[i], fwd = dir < 0; if (fwd) this.tourHit('next');
      if (this.songStop && cur.hasClass('gq-song')) try { this.songStop(); } catch (e) {}
      const land = () => { cur.style.transition = ''; cur.style.transform = ''; cur.style.opacity = ''; i = k; paint(); keep(); const t = list[i]; if (!this.calmOn()) { t.addClass('gq-kin'); setTimeout(() => t.removeClass('gq-kin'), 260); } wrap.scrollIntoView({ block: 'nearest' }); };
      if (this.calmOn()) return land();
      cur.style.transition = 'transform .22s ease-in, opacity .22s ease-in'; cur.style.transform = `translateX(${(dir || -1) * 115}%) rotate(${(dir || -1) * 9}deg)`; cur.style.opacity = '0';
      setTimeout(land, 220);
    };
    this.kidStackGo = c => { const k = list.indexOf(c); if (k >= 0) { i = k; paint(); } };
    // A step that finishes moves on by itself (the story's Done, a finished review).
    this.dayNext = from => { if (!from || list[i] === from || list[i].contains(from)) go(i + 1, -1); };
    ma.onclick = e => { e.preventDefault(); go(i + 1, -1); };
    again.onclick = e => { e.preventDefault(); go(0, 1); };
    paint();
  }
  async kidFoot(box, el, tok, col, wk) {
    let rel = VAULT_RELEASE; try { rel = JSON.parse(await this.app.vault.adapter.read(INSTALLED)).release || rel; } catch (e) {}
    const foot = (box.querySelector('.gq-kdone') || box).createDiv('gq-hint gq-tfoot');
    if (!col.setup_seen) { const a = foot.createEl('a', { text: 'Grown-ups: read Setting up first', href: '#' }); a.onclick = e => { e.preventDefault(); this.setupSeen(); this.openNote(SETUP); }; foot.createEl('br'); }
    const wn = foot.createEl('a', { text: "What's new", href: '#' }); wn.onclick = e => { e.preventDefault(); this.openNote(WHATS_NEW); };
    foot.appendText(` · vault ${rel} · `);
    if (this.updateReady && !this.updating) { const up = foot.createEl('a', { text: 'Install update', href: '#' }); up.onclick = e => { e.preventDefault(); this.updateVault(false); }; foot.appendText(' · '); }
    if (this.abcOff() && !this.abcKnown()) { const lp = foot.createEl('a', { text: 'Letter practice', href: '#' }); lp.onclick = e => { e.preventDefault(); this.setAbcOff(false); }; foot.appendText(' · '); }
    const gu = foot.createEl('a', { text: 'For grown-ups', href: '#' }); gu.onclick = e => { e.preventDefault(); this.openNote(SETUP); };
    // Slides parked here too: the kids Today is a plain list of cards.
    if (tok === el.gqTok) { el.empty(); el.appendChild(box); this.tabsSync(); this.cornerSync(); this.kidLesson = wk.lesson;  }
  }
  moHasDays() { const f = this.app.vault.getAbstractFileByPath(MO_FILE); const fm = f ? ((this.app.metadataCache.getFileCache(f) || {}).frontmatter || {}) : {}; return !!((this.moMem && Object.keys(this.moMem.days || {}).length) || (fm.days && typeof fm.days === 'object' && Object.keys(fm.days).length)); }
  async kidFull() { this.kidFullNow = true; const f = await this.progressFile(); await this.app.fileManager.processFrontMatter(f, fm => { fm.kid_full = true; }); this.refreshToday(); }
  lettersDone() { const v = this.lettersNow || this.progFm().letters; return Array.isArray(v) ? v.map(Number).filter(n => n >= 1 && n <= LETTER_SETS.length) : []; }
  // Letters and sounds: tap a sound card to hear it, drag each letter onto the sound it makes (or tap the letter, then the sound).
  // A right match on the first try is a recall (γράμμα:β), so a letter remembered on a later day is worth 3 like a word. A set done: 2 φόρα, once a day.
  lettersCard(box) {
    const c = box.createDiv('gq-tcard gq-kid gq-abc'); c.dataset.tour = 'letters';
    // Stop only drags on the letters themselves, so the rest of the card still swipes to the next one.
    const stopT = e => { if (e.target && e.target.closest && e.target.closest('.gq-abc-tile, .gq-abc-card, button')) e.stopPropagation(); };
    for (const ev of ['touchstart', 'touchend', 'pointerdown', 'pointermove', 'pointerup']) c.addEventListener(ev, stopT, { passive: true });
    c.addEventListener('touchmove', e => { e.stopPropagation(); if (e.target && e.target.closest && e.target.closest('.gq-abc-tile')) e.preventDefault(); }, { passive: false });
    const draw1 = () => {
      c.empty(); clearTimeout(this.abcDemo);
      // Two tabs: Sounds (drag each letter onto its sound) and Names (say άλφα, βήτα… and the letter fills in).
      const mode = this.lsGet('abcmode', 'sounds'); c.gqMoreX = []; c.gqMoreFn = null;
      const LETTER_SETS = this.isKids ? LETTER_SETS_K : ADULT_SETS;
      this.addMore(c, [mode === 'names' ? 'Back to letter sounds' : 'Letter names: άλφα, βήτα\u2026', () => { this.lsSet('abcmode', mode === 'names' ? 'sounds' : 'names'); this.letterSet = 0; draw(); }]);
      if (mode === 'names') { this.namesPane(c, draw); return; }
      const done = this.lettersDone(), all = LETTER_SETS.length;
      let n = this.letterSet; if (!n) { const i = LETTER_SETS.findIndex((x, k) => !done.includes(k + 1)); n = i < 0 ? 1 : i + 1; }
      const h = c.createDiv('gq-thead'); h.createEl('strong', { text: 'Letters and sounds' });
      h.createSpan({ cls: 'gq-hint', text: done.length >= all ? '  · all 24 letters done' : `  · set ${n} of ${all}` });
      c.createDiv({ cls: 'gq-hint', text: 'Drag each letter onto its sound.' });
      LETTER_SETS.forEach((x, i) => { if (i + 1 !== n) this.addMore(c, [`Set ${i + 1}: ${x.map(y => y.l).join(' ')}` + (done.includes(i + 1) ? ' (done)' : ''), () => { this.letterSet = i + 1; draw(); }]); });
      const set = LETTER_SETS[n - 1], miss = new Map(); let left = set.length, sel = null;
      const bank = c.createDiv('gq-abc-bank'), grid = c.createDiv('gq-abc-grid');
      const cards = this.shuf(set.slice()).map(x => {
        const k = grid.createDiv({ cls: 'gq-abc-card', attr: { role: 'button', tabindex: '0', 'aria-label': `Sound ${x.h}` } }); k.gqL = x;
        k.createDiv({ cls: 'gq-abc-slot', attr: { lang: 'el' } });
        const t = k.createDiv('gq-abc-txt'); const tb = t.createDiv('gq-abc-top'); // English cue word, not a bare Latin letter (p looks like ρ, n like η, v like ν).
        tb.createEl('b', { text: x.h.replace(/^like /, '') }); tb.createSpan({ cls: 'gq-abc-hear', text: 'Hear' });
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
        this.moAdd('did', 'letters:' + n, 2); this.tourHit('letters'); this.markDone('abc');
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
    // Letter practice is for the first weeks: a quiet link turns it off (the foot of Today brings it back).
    const draw = () => { draw1(); this.addMore(c, ['Turn off letter practice', () => this.setAbcOff(true)]); };
    draw();
  }
  abcOff() { return this.abcKnown() || !!this.lsGet('abcoff', 0); }
  // Said at setup that they read the alphabet: letter practice is gone, with no way back in except Setup again.
  abcKnown() { return this.progFm().knows_abc === true; }
  // ---------- Class days and the week between classes ----------
  // ---------- Ready-made pieces: the chunks in each word note's Pair it with (Little words, Use it with, Describe it) ----------
  // Each piece is already correct Greek with its English, so building with them never teaches a wrong ending.
  async chunkBank() {
    if (this.chunkP) return this.chunkP;
    return this.chunkP = (async () => {
      const out = [], seen = new Set(), CATS = new Set(['Little words', 'Use it with', 'Describe it']);
      for (const f of this.app.vault.getMarkdownFiles()) {
        if (!f.path.startsWith('Words/')) continue;
        const pm = (await this.app.vault.cachedRead(f)).match(/## Pair it with\n([\s\S]*?)(?:\n## |$)/); if (!pm) continue;
        for (const line of pm[1].split('\n')) {
          const c = line.match(/^- \*\*(.+?):\*\*\s*(.*)/); if (!c || !CATS.has(c[1])) continue;
          for (const part of splitDots(c[2])) {
            const en = ((part.match(/\(([^)]*)\)\s*$/) || [])[1] || '').trim(); if (!en) continue;
            const ws = [f.basename]; for (const m of part.matchAll(/\[\[([^\]|#]+)/g)) ws.push(m[1].trim());
            const gr = part.replace(/\[\[([^\]|#]+)\|([^\]]+)\]\]/g, '$2').replace(/\[\[([^\]|#]+)\]\]/g, '$1').replace(/\s*\([^)]*\)\s*$/, '').replace(/\s+/g, ' ').trim();
            if (!gr || /[a-z]/i.test(gr) || /[()\[\]…]/.test(gr)) continue;
            const k = fold(gr); if (seen.has(k)) continue; seen.add(k);
            const n = gr.split(' ').length; if (n > 6) continue;
            out.push({ gr, en, n, words: [...new Set(ws)].filter(w => !w.includes(',')) });
          }
        }
      }
      return out;
    })();
  }
  // A piece's color: red if it holds a red word, then yellow, then green; 'new' if any word is not in your colors yet.
  chunkColor(ch, col) { const rk = w => col.red.includes(w) ? 0 : col.yellow.includes(w) ? 1 : col.green.includes(w) ? 2 : 3; const r = ch.words.map(rk); return r.includes(3) ? 'new' : ['red', 'yellow', 'green'][Math.min(...r)]; }
  async glossMap() {
    if (this.glossM) return this.glossM;
    const m = new Map(); for (const w of await this.wordIndex()) { const en = String(w.english || '').split(/[;,]/)[0].trim(); if (!en) continue; for (const k of w.word.split(/,\s*/).map(fold)) if (k && !m.has(k)) m.set(k, en); }
    return this.glossM = m;
  }
  // ---------- First days, New to Greek: Build what you heard. Hear a short piece, put its sounds in order. ----------
  // Only pieces made of words from the first Language Transfer tracks; each tile says itself. Meanings show only for dictionary forms, so θέλεις never reads as "I want".
  hearDue(col) { const h = this.lsGet('hear', []); return this.ltStage(col) === 'ears' && !this.doneToday('hear') && h.length < 3; }
  async hearCard(box, col) {
    const top = Math.max(8, (col.lt_track || 0) + 4), early = new Set(Object.keys(LT_FIRST).filter(w => LT_FIRST[w] <= top));
    const bank = (await this.chunkBank()).filter(c => c.n >= 2 && c.n <= 4 && c.words.every(w => early.has(w)));
    if (bank.length < 2) return;
    const day = this.lsGet('hear', []).length, hsh = x => { let h = 7 + day * 131; for (const ch of x) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; };
    const rounds = bank.slice().sort((a, b) => a.n - b.n || hsh(a.gr) - hsh(b.gr)).filter((c, i, a) => a.findIndex(x => x.words[0] === c.words[0]) === i).slice(0, 12).sort((a, b) => hsh(a.gr) - hsh(b.gr)).slice(0, 3).sort((a, b) => a.n - b.n);
    const gm = await this.glossMap();
    const c = box.createDiv('gq-tcard gq-hear'), h = c.createDiv('gq-thead');
    h.createEl('strong', { text: 'Build what you heard' }); h.createSpan({ cls: 'gq-hint', text: '  · 2 min' });
    c.createDiv({ cls: 'gq-hint', text: 'Hear a short piece of Greek. Tap the sounds in the same order. Each tile says itself.' });
    const area = c.createDiv('gq-hear-area');
    const fin = () => { area.empty(); area.createDiv({ cls: 'gq-pop-big', text: 'Μπράβο.' }); area.createDiv({ cls: 'gq-hint', text: 'That\u2019s today\u2019s puzzle. Next: Language Transfer.' });
      const d = this.lsGet('hear', []), t = ymd(new Date()); if (!d.includes(t)) this.lsSet('hear', [...d, t]); this.moAdd && this.moAdd('did', 'hear', 1); this.markDone('hear'); };
    const play = i => {
      area.empty(); if (i >= rounds.length) return fin();
      const x = rounds[i], toks = x.gr.split(' ');
      area.createDiv({ cls: 'gq-hint', text: `${i + 1} of ${rounds.length}` });
      const pr = area.createDiv('gq-hear-en'); pr.setText(x.en);
      const hr = area.createDiv('gq-row'), hb = hr.createEl('button', { text: 'Hear it', cls: 'mod-cta' }); hb.onclick = () => say(x.gr);
      const ans = area.createDiv({ cls: 'gq-cv-ans gq-hear-ans', attr: { 'aria-label': 'Your order', lang: 'el' } });
      const tray = area.createDiv({ cls: 'gq-hear-tray', attr: { lang: 'el' } }), msg = area.createDiv({ cls: 'gq-hint', attr: { 'aria-live': 'polite' } });
      let order = toks.map((t, k) => ({ t, k })); for (let k = 1; k < 8 && order.every((o, j) => o.k === j); k++) order = order.map(o => ({ o, r: hsh(o.t + k) })).sort((a, b) => a.r - b.r).map(z => z.o);
      const placed = [];
      for (const o of order) {
        const b = tray.createEl('button', { cls: 'gq-htile', attr: { 'data-k': String(o.k) } }); b.createDiv({ cls: 'gq-htile-gr', text: o.t, attr: { lang: 'el' } });
        const g = gm.get(fold(o.t.replace(/[;,.!?]/g, ''))); if (g) b.createDiv({ cls: 'gq-htile-en', text: g });
        b.onclick = () => {
          say(o.t.replace(/[;,.!?]/g, ''));
          if (b.parentElement === ans) { ans.removeChild(b); tray.appendChild(b); placed.splice(placed.indexOf(o), 1); return; }
          ans.appendChild(b); placed.push(o);
          if (placed.length === toks.length) {
            if (placed.map(p => p.t).join(' ') === x.gr) { msg.setText('Yes: ' + x.gr); ans.addClass('is-right'); setTimeout(() => say(x.gr), 250); const n = area.createDiv('gq-row').createEl('button', { text: i + 1 < rounds.length ? 'Next' : 'Done', cls: 'mod-cta' }); n.onclick = () => play(i + 1); tray.querySelectorAll('button').forEach(z => z.disabled = true); }
            else { msg.setText('Not quite. Hear it again.'); ans.addClass('is-wrong'); setTimeout(() => { ans.removeClass('is-wrong'); [...ans.children].forEach(z => tray.appendChild(z)); placed.length = 0; msg.setText(''); }, 900); }
          }
        };
      }
    };
    play(0);
  }
  // ---------- Build with your words: your own sentence from ready-made pieces, picked by your colors ----------
  // Red and yellow pieces first, at most one piece with a new (black) word, little words to join them. No checking:
  // every piece is already right, so the sentence is yours. Building never changes a color. Saves to My pairs.
  async buildPieces(col, seed) {
    const bank = await this.chunkBank(), mine = new Set([...col.red, ...col.yellow, ...col.green]);
    const rk = { red: 0, yellow: 1, green: 2, new: 3 }, hsh = x => { let h = seed >>> 0; for (const ch of x) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; };
    const ok = bank.filter(c => c.words.some(w => mine.has(w))).map(c => ({ ...c, col: this.chunkColor(c, col) }));
    const byC = k => ok.filter(c => c.col === k).sort((a, b) => hsh(a.gr) - hsh(b.gr));
    const pick = [...byC('red').slice(0, 3), ...byC('yellow').slice(0, 3)]; for (const c of byC('green')) if (pick.length < 7) pick.push(c);
    for (const c of [...byC('red').slice(3), ...byC('yellow').slice(3)]) if (pick.length < 7) pick.push(c);
    const nw = byC('new')[0]; if (nw) pick.push(nw);
    return pick.sort((a, b) => rk[a.col] - rk[b.col]);
  }
  async buildReady(col) { const mine = col.red.length + col.yellow.length + col.green.length; if (mine < 6) return false; return (await this.buildPieces(col, 1)).filter(c => c.col !== 'new').length >= 5; }
  async buildUI(el, done) {
    const col = this.colors(); let seed = Math.floor(Date.now() / 864e5);
    el.createDiv({ cls: 'gq-hint', text: 'Put two or three pieces together into your own sentence. Red and yellow words come first. There is no wrong answer.' });
    const ans = el.createDiv({ cls: 'gq-cv-ans gq-build-ans', attr: { 'aria-label': 'Your sentence', lang: 'el' } }), en = el.createDiv('gq-hint gq-build-en');
    const tray = el.createDiv({ cls: 'gq-build-tray', attr: { lang: 'el' } }), glue = el.createDiv({ cls: 'gq-build-glue', attr: { lang: 'el' } });
    const r = el.createDiv('gq-row'), hear = r.createEl('button', { text: 'Hear it' }), save = r.createEl('button', { text: 'Save to My pairs', cls: 'mod-cta' }), more = el.createDiv('gq-hint').createEl('a', { text: 'Other pieces', href: '#' });
    const out = el.createDiv('gq-build-out'); let parts = [];
    const text = () => { let g = parts.map(p => p.gr).join(' ').replace(/\s+([,.;!?])/g, '$1'); if (!g) return ['', '']; g = cap1(g); if (!/[.;!?]$/.test(g)) g += '.'; let e = parts.map(p => p.en).join(' '); e = cap1(e); if (!/[.?!]$/.test(e)) e += '.'; return [g, e]; };
    const paint = () => { ans.empty(); parts.forEach((p, i) => { const b = ans.createEl('button', { cls: 'gq-btile', text: p.gr, attr: { lang: 'el' } }); b.onclick = () => { parts.splice(i, 1); paint(); }; }); const [g, e] = text(); en.setText(g ? e : 'Tap pieces below.'); save.disabled = parts.filter(p => !p.glue).length < 1; };
    const tile = (parent, p) => { const b = parent.createEl('button', { cls: 'gq-btile' }); if (!p.glue) b.createSpan({ cls: 'gq-dot gq-' + p.col, attr: { 'aria-label': p.col === 'new' ? 'new word' : p.col } }); b.createSpan({ cls: 'gq-btile-gr', text: p.gr, attr: { lang: 'el' } }); b.createDiv({ cls: 'gq-btile-en', text: p.en }); b.onclick = () => { say(p.gr); if (parts.length < 8) { parts.push(p); paint(); } }; };
    const fill = async () => { tray.empty(); for (const p of await this.buildPieces(col, seed)) tile(tray, p); };
    for (const [g, e] of GLUE) tile(glue, { gr: g, en: e, glue: true, words: [] });
    hear.onclick = () => { const [g] = text(); if (g) say(g); };
    more.onclick = e => { e.preventDefault(); seed += 7; fill(); };
    save.onclick = async () => { const [g, e] = text(); if (!g) return; await this.savePair(g, e, parts.flatMap(p => p.words), false); parts = []; paint(); out.empty();
      const s = out.createDiv('gq-hint'); s.appendText('Saved. '); const a = s.createEl('a', { text: 'Send today\u2019s to your teacher', href: '#' }); a.onclick = async ev => { ev.preventDefault(); await this.openNote(PAIRS_NOTE); setTimeout(() => this.sendHomework(), 400); };
      if (done) done(); };
    paint(); await fill();
  }
  async buildCard(box) {
    const c = box.createDiv('gq-tcard gq-build'), h = c.createDiv('gq-thead'); h.createEl('strong', { text: 'Build with your words' }); h.createSpan({ cls: 'gq-hint', text: '  · 3 min' });
    await this.buildUI(c, () => this.markDone('build'));
    this.focusLine(c);
  }
  popBuild() { this.pop('Build with your words', [{ label: '', build: el => this.buildUI(el, null) }]); }
  // ---------- The week's focus and the Watch this card ----------
  // One question about once a week: the day after class, or every 7 days. Skipping keeps Mix it up.
  focusNow() { const v = this.progFm().focus; return FOCI.some(f => f[0] === v) ? v : 'mix'; }
  focusName() { return FOCI.find(f => f[0] === this.focusNow())[1]; }
  focusDue() {
    if (this.app.vault.getAbstractFileByPath('Teacher') || this.needSetup() || this.classDays() === null) return false;
    // The first ask waits: never on the first day, never on a class day. One question on a calm day.
    const pf = this.progFm(), at = pf.focus_at; if (!at) { const t = ymd(new Date()); return !(pf.setup_day && String(pf.setup_day) >= t) && !this.classDays().includes(new Date().getDay()); }
    const t0 = new Date(String(at) + 'T00:00:00'), now = new Date(); now.setHours(0, 0, 0, 0);
    const gap = Math.round((now - t0) / 864e5); if (!(gap >= 0)) return true;
    if (gap >= 7) return true;
    const cd = this.classDays(); return cd.length > 0 && gap >= 3 && cd.includes((now.getDay() + 6) % 7);
  }
  async setFocus(v) {
    const f = await this.progressFile();
    await this.app.fileManager.processFrontMatter(f, fm => { fm.focus = v; fm.focus_at = ymd(new Date()); delete fm.focus_auto; });
    setTimeout(() => this.refreshToday(), 300);
  }
  focusPick(el, done) {
    el.createDiv({ cls: 'gq-pop-big', text: 'What do you want to work on this week?' });
    el.createDiv({ cls: 'gq-hint', text: 'One tap. Today and the die lean toward it.' });
    const col = el.createDiv('gq-setup-opts gq-focus-opts'), cur = this.progFm().focus_at ? this.focusNow() : '';
    for (const [v, t] of FOCI) { const b = col.createEl('button', { cls: 'gq-setup-opt' + (v === cur ? ' is-on' : ''), text: t }); b.onclick = () => done(v); }
  }
  focusPop() { this.pop('This week', [{ label: '', build: (el, api) => this.focusPick(el, v => { api.close(); this.setFocus(v); }) }]); }
  // "This week: Verbs · Change", always inside a card.
  // ---------- How the app gets used: counts only, kept on this device, sent with homework. ----------
  // Each day: the Today cards a student saw (1) and the ones they tapped into (2). Nothing typed, no times. Not in Kids.
  useName(n) { return String(n).split(' · ')[0].replace(/[\/·]/g, '-').trim(); }
  useLog(names) {
    if (this.isKids) return; const d = ymd(new Date()), u = this.lsGet('use', {}), t = u[d] || (u[d] = {}), old = ymd(new Date(Date.now() - 21 * 864e5));
    for (const n of names.map(x => this.useName(x))) if (!t[n]) t[n] = 1;
    for (const k of Object.keys(u)) if (k < old) delete u[k]; this.lsSet('use', u);
  }
  useTap(n) { if (this.isKids) return; const d = ymd(new Date()), u = this.lsGet('use', {}), t = u[d] || (u[d] = {}), k = this.useName(n); if (t[k] === 2) return; t[k] = 2; this.lsSet('use', u); }
  useWeek() {
    const u = this.lsGet('use', {}), from = ymd(new Date(Date.now() - 6 * 864e5)), m = {};
    for (const [d, t] of Object.entries(u)) if (d >= from) for (const [n, v] of Object.entries(t)) { const r = m[n] || (m[n] = { n, used: 0, shown: 0 }); r.shown++; if (v === 2) r.used++; }
    return Object.values(m).sort((a, b) => b.used - a.used || b.shown - a.shown);
  }
  useDays() { const from = ymd(new Date(Date.now() - 6 * 864e5)); return Object.keys(this.lsGet('use', {})).filter(d => d >= from).length; }
  weekId(d0) { const d = d0 ? new Date(d0) : new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return ymd(d); }
  myVote() { const v = this.lsGet('vote', null); return v && v.wk === this.weekId() && v.pick ? v.pick : ''; }
  useLine() {
    if (this.isKids) return ''; const w = this.useWeek(); if (!w.length) return '';
    const v = this.myVote(); return 'App this week: ' + w.map(r => `${r.n} ${r.used}/${r.shown}`).join(' · ') + (v ? ' · Helped most: ' + v : '');
  }
  // Once a week on the Done card, after a few days of use: one tap, only cards this student actually used.
  seeYou() {
    const cd = this.classDays(), now = new Date();
    if (cd && cd.length) for (let k = 1; k <= 7; k++) { const d = new Date(now); d.setDate(now.getDate() + k); if (cd.includes(d.getDay())) { if (k === 1) return 'Class tomorrow. See you there.'; break; } }
    return 'See you tomorrow.';
  }
  voteAsk(done) {
    if (this.isKids) return; const wk = this.weekId(), v = this.lsGet('vote', null); if (v && v.wk === wk) return;
    const opts = this.useWeek().filter(r => r.used > 0).slice(0, 4); if (opts.length < 2 || this.useDays() < 3) return;
    const c = createDiv('gq-vote'); c.createDiv({ cls: 'gq-vote-q', text: 'What helped most this week?' });
    const r = c.createDiv('gq-row');
    for (const o of opts) { const b = r.createEl('button', { text: o.n, cls: 'gq-mini' }); b.onclick = () => { this.lsSet('vote', { wk, pick: o.n }); c.empty(); c.createDiv({ cls: 'gq-hint', text: 'Thanks. It goes with your next homework.' }); }; }
    const sk = c.createDiv('gq-hint').createEl('a', { text: 'Skip', href: '#' }); sk.onclick = e => { e.preventDefault(); this.lsSet('vote', { wk, pick: '' }); c.remove(); };
    const kb = done.querySelector('.gq-kbye-en') || done.querySelector('.gq-kbye'); if (kb) kb.after(c); else done.appendChild(c);
  }
  // Class day: the student's own week, so the class talk starts from facts rather than memory.
  myWeekCard(box) {
    if (this.isKids) return; const cd = this.classDays(); if (!cd || !cd.includes(new Date().getDay())) return;
    const w = this.useWeek(), used = w.filter(r => r.used > 0).slice(0, 3), skip = w.filter(r => r.used === 0 && r.shown >= 2).slice(0, 2), v = this.myVote();
    if (!used.length) return;
    const c = box.createDiv('gq-tcard gq-myweek'); c.createDiv({ cls: 'gq-thead' }).createEl('strong', { text: 'Your week, for class' });
    const ul = c.createEl('ul', { cls: 'gq-myweek-list' }), dd = n => n === 1 ? '1 day' : n + ' days';
    ul.createEl('li', { text: 'Used most: ' + used.map(r => `${r.n} (${dd(r.used)})`).join(', ') });
    if (skip.length) ul.createEl('li', { text: 'Skipped: ' + skip.map(r => r.n).join(', ') });
    if (v) ul.createEl('li', { text: 'Helped most: ' + v });
    c.createDiv({ cls: 'gq-hint', text: 'What worked, and what got in the way? Bring it to class. These counts also go with Send homework.' });
  }
  // Teacher: paste each student's homework text; their "App this week" line becomes one row of the heat map.
  heatParse(t) {
    const m = String(t || '').match(/App this week: ([^\n]+)/); if (!m) return null;
    const rows = [], out = { rows, vote: '' };
    for (const part of m[1].split(' · ')) { const v = part.match(/^Helped most: (.+)$/); if (v) { out.vote = v[1].trim(); continue; } const r = part.trim().match(/^(.+) (\d+)\/(\d+)$/); if (r) rows.push({ n: r[1], used: +r[2], shown: +r[3] }); }
    return rows.length ? out : null;
  }
  async heatMap(el) {
    el.empty(); const box = el.createDiv('gq-heat'), d0 = (await this.loadData()) || {}, all = d0.heat || [];
    const f = box.createDiv('gq-heat-add'); f.createEl('strong', { text: 'Add a student' });
    const nm = f.createEl('input', { type: 'text', attr: { placeholder: 'Student name', autocomplete: 'off' } });
    const ta = f.createEl('textarea', { attr: { rows: '3', placeholder: 'Paste their whole homework text' } });
    const add = f.createDiv('gq-row').createEl('button', { text: 'Add', cls: 'mod-cta' }), msg = f.createDiv('gq-hint');
    add.onclick = async () => {
      const s = nm.value.trim(), p = this.heatParse(ta.value);
      if (!s) { msg.setText('Type the student\u2019s name first.'); return; }
      if (!p) { msg.setText('No "App this week" line in that text. It comes with homework sent from vault 2026-11-25c on.'); return; }
      const d = (await this.loadData()) || {}, wk = this.weekId(); d.heat = (d.heat || []).filter(x => !(x.s === s && x.wk === wk)); d.heat.push({ s, wk, d: ymd(new Date()), ...p }); d.heat = d.heat.slice(-500);
      await this.saveData(d); this.heatWk = wk; this.heatMap(el);
    };
    const wks = [...new Set(all.map(x => x.wk))].sort().reverse(); if (!wks.length) { box.createDiv({ cls: 'gq-hint', text: 'No students added yet. Paste a homework text above.' }); return; }
    const wk = wks.includes(this.heatWk) ? this.heatWk : wks[0];
    if (wks.length > 1) { const sel = box.createEl('select', { cls: 'dropdown' }); for (const w of wks) sel.createEl('option', { text: 'Week of ' + w, value: w }); sel.value = wk; sel.onchange = () => { this.heatWk = sel.value; this.heatMap(el); }; }
    const rows = all.filter(x => x.wk === wk).sort((a, b) => a.s.localeCompare(b.s)), tot = {};
    for (const x of rows) for (const r of x.rows) tot[r.n] = (tot[r.n] || 0) + r.used;
    const cols = Object.keys(tot).sort((a, b) => tot[b] - tot[a]);
    const sc = box.createDiv('gq-heat-scroll'), tb = sc.createEl('table', { cls: 'gq-heat-t' }), hr = tb.createEl('thead').createEl('tr');
    hr.createEl('th', { text: 'Student' }); for (const c of cols) hr.createEl('th', { text: c }); hr.createEl('th');
    const body = tb.createEl('tbody');
    for (const x of rows) {
      const tr = body.createEl('tr'); tr.createEl('th', { text: x.s, attr: { scope: 'row' } });
      for (const c of cols) {
        const r = x.rows.find(y => y.n === c), td = tr.createEl('td');
        if (!r) { td.setText('\u2013'); td.addClass('is-none'); continue; }
        td.setText(`${r.used}/${r.shown}` + (x.vote === c ? ' \u2605' : '')); td.style.background = `rgba(49,95,158,${(0.06 + 0.84 * Math.min(r.used, 7) / 7).toFixed(2)})`;
        if (r.used >= 4) td.addClass('is-dark'); td.setAttr('title', `${x.s}: ${c}, used ${r.used} of the ${r.shown} days it was on Today` + (x.vote === c ? '; helped most' : ''));
      }
      const rm = tr.createEl('td').createEl('a', { text: '\u00d7', href: '#', attr: { 'aria-label': 'Remove ' + x.s } });
      rm.onclick = async e => { e.preventDefault(); const d = (await this.loadData()) || {}; d.heat = (d.heat || []).filter(y => !(y.s === x.s && y.wk === x.wk)); await this.saveData(d); this.heatMap(el); };
    }
    const ft = tb.createEl('tfoot'), fv = ft.createEl('tr'), fs = ft.createEl('tr');
    fv.createEl('th', { text: '\u2605 Helped most' }); fs.createEl('th', { text: 'Skipped by' });
    for (const c of cols) { const v = rows.filter(x => x.vote === c).length, k = rows.filter(x => x.rows.some(r => r.n === c && r.used === 0)).length; fv.createEl('td', { text: v ? String(v) : '' }); fs.createEl('td', { text: k ? String(k) : '' }); }
    fv.createEl('td'); fs.createEl('td');
  }
  // ···: a card's second choices, out of sight until asked for. fn() gives choices that change; addMore adds fixed ones.
  cardMore(card, fn) {
    if (fn) card.gqMoreFn = fn;
    if (card.querySelector(':scope > .gq-cmore')) return;
    const b = createEl('button', { cls: 'gq-cmore', attr: { 'aria-label': 'More choices' } }); b.setText('\u00b7\u00b7\u00b7'); card.prepend(b);
    card.addClass('has-more');
    b.onclick = e => {
      e.stopPropagation();
      const L = [...(card.gqMoreFn ? card.gqMoreFn() : []), ...(card.gqMoreX || [])].filter(Boolean); if (!L.length) return;
      const m = new Menu(); for (const [t, f] of L) m.addItem(i => i.setTitle(t).onClick(ev => f(ev || e))); m.showAtMouseEvent(e);
    };
  }
  addMore(card, item) { if (!card) return; (card.gqMoreX = card.gqMoreX || []).push(item); this.cardMore(card); }
  // A focus picks itself each week (listening, speaking, reading, verbs in turn); one picked by hand stays.
  focusAuto() {
    if (this.focusBusy) return; this.focusBusy = true;
    const R = ['listen', 'speak', 'read', 'verbs'], pf = this.progFm(), cur = this.focusNow(), mine = pf.focus_at && !pf.focus_auto && cur !== 'mix';
    const v = mine ? cur : R[(R.indexOf(cur) + 1) % R.length];
    (async () => { try { const f = await this.progressFile(); await this.app.fileManager.processFrontMatter(f, fm => { fm.focus = v; fm.focus_at = ymd(new Date()); if (mine) delete fm.focus_auto; else fm.focus_auto = true; }); } catch (e) {} this.focusBusy = false; })();
  }
  focusLine(el) {
    const d = el.createDiv('gq-hint gq-focus-line'); d.createSpan({ text: 'This week: ' + this.focusName() + ' · ' });
    const a = d.createEl('a', { text: 'Change', href: '#' }); a.onclick = e => { e.preventDefault(); this.focusPop(); };
  }
  // About three days a week, never two in a row: three of six weekdays per week, picked by the week's number.
  watchDay(d) {
    const n = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5), w = Math.floor(n / 7), k = n % 7;
    const T = [[1, 3, 5], [1, 3, 6], [1, 4, 6], [2, 4, 6]], h = ((w * 2654435761) >>> 0) % T.length;
    return T[h].includes(k);
  }
  async watchList() {
    const f = this.app.vault.getAbstractFileByPath(WATCH); if (!f) return [];
    const out = [];
    for (const ln of (await this.app.vault.cachedRead(f)).split('\n')) {
      if (!ln.startsWith('|')) continue; const c = ln.split('|').slice(1, -1).map(x => x.trim());
      const m = (c[0] || '').match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([\w-]{11})/); if (!m) continue;
      const t = c[0].match(/\[([^\]]+)\]/);
      out.push({ id: m[1], title: t ? t[1] : 'A Greek video', ch: c[1] || '', min: +c[2] || 0, lvl: Math.max(0, WLEV.indexOf((c[3] || 'a1').toLowerCase())), tags: (c[4] || '').toLowerCase().split(/[,\s]+/).filter(Boolean), les: ((c[5] || '').match(/\d+/g) || []).map(Number) });
    }
    return out;
  }
  async watchPick(col, wk) {
    const all = await this.watchList(), seen = new Set(this.lsGet('watched', [])), st = this.ltStage(col);
    const L = wk && wk.fm ? Number(wk.fm.lesson) || 0 : 0, off = Math.max(-1, Math.min(1, Number(this.progFm().watch_lvl) || 0));
    const ears = st === 'ears' || st === 'read', want = ears ? 0 : Math.max(0, Math.min(2, (L > 12 ? 2 : 1) + off)), fo = this.focusNow(), day = ymd(new Date());
    const hsh = x => { let h = 0; for (const ch of day + x) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; };
    const sc = v => (v.lvl === want ? 3 : 0) + (v.tags.includes(fo) ? 3 : 0) + (v.les.includes(L) ? 2 : v.les.some(x => Math.abs(x - L) <= 2) ? 1 : 0);
    const ok = all.filter(v => !seen.has(v.id) && (ears ? v.lvl === 0 : Math.abs(v.lvl - want) <= 1));
    ok.sort((a, b) => sc(b) - sc(a) || hsh(a.id) - hsh(b.id));
    return ok[0] ? { v: ok[0], ears } : null;
  }
  focusAsk(box) { const c = box.createDiv('gq-tcard gq-focus'); this.focusPick(c, v => { c.querySelectorAll('button').forEach(b => b.disabled = true); this.setFocus(v); });
    const sk = c.createDiv('gq-hint').createEl('a', { text: 'Skip: mix it up', href: '#' }); sk.onclick = e => { e.preventDefault(); this.setFocus('mix'); }; }
  async weekFocusCards(box, col, wk) {
    if (this.isKids) return;
    if (this.focusDue()) this.focusAuto();
    if (this.hearDue(col)) { await this.hearCard(box, col); return; }
    // The last card shares one spot: a video on watch days, building with your words on the others.
    if (navigator.onLine && !this.doneToday('watch') && this.watchDay(new Date())) { const p = await this.watchPick(col, wk); if (p) { this.watchCard(box, p.v, p.ears); return; } }
    const st = this.ltStage(col); if (st !== 'ears' && st !== 'read' && !this.doneToday('build') && await this.buildReady(col)) await this.buildCard(box);
  }
  watchCard(box, v, ears) {
    const c = box.createDiv('gq-tcard gq-watch'), h = c.createDiv('gq-thead');
    h.createEl('strong', { text: 'Watch this' }); if (v.min) h.createSpan({ cls: 'gq-hint', text: `  · ${v.min} min` });
    c.createDiv({ cls: 'gq-watch-t', text: v.title }); if (v.ch) c.createDiv({ cls: 'gq-hint', text: v.ch + ' · free on YouTube' });
    if (ears) c.createDiv({ cls: 'gq-hint', text: 'Just listen. You don\u2019t need to understand it all.' });
    const fr = c.createDiv('gq-watch-fr'), th = fr.createEl('button', { cls: 'gq-watch-play', attr: { 'aria-label': 'Play ' + v.title } });
    th.createEl('img', { attr: { src: `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`, alt: '', loading: 'lazy' } }); th.createDiv('gq-watch-btn');
    const rate = c.createDiv('gq-watch-rate'); rate.hide();
    th.onclick = () => { fr.empty(); fr.createEl('iframe', { attr: { src: `https://www.youtube-nocookie.com/embed/${v.id}?rel=0&playsinline=1&autoplay=1`, title: v.title, allow: 'autoplay; encrypted-media; picture-in-picture; fullscreen', allowfullscreen: '', referrerpolicy: 'strict-origin-when-cross-origin' } }); this.moAdd && this.moAdd('did', 'watch', 1); this.tWatch = Date.now(); rate.show(); };
    rate.createDiv({ cls: 'gq-hint', text: 'When you\u2019re done: how was it?' });
    const r = rate.createDiv('gq-row');
    for (const [t, d] of [['Too easy', 1], ['Just right', 0], ['Too hard', -1]]) {
      const b = r.createEl('button', { text: t, cls: d ? '' : 'mod-cta' });
      b.onclick = async () => {
        this.lsSet('watched', [...new Set([...this.lsGet('watched', []), v.id])].slice(-300));
        if (this.tWatch) { this.timeRec('watch', (Date.now() - this.tWatch) / 1000); this.tWatch = 0; }
        if (d) { const f = await this.progressFile(), cur = Number(this.progFm().watch_lvl) || 0; await this.app.fileManager.processFrontMatter(f, fm => { fm.watch_lvl = Math.max(-1, Math.min(1, cur + d)); }); }
        rate.empty(); rate.createDiv({ cls: 'gq-hint', text: d ? 'Thanks. The next one will fit better.' : 'Good. More like that next time.' });
        this.markDone('watch');
      };
    }
  }
  // class_days: [3] (Wednesday), [1, 3] (Monday and Wednesday), 'none' (not in a class). null = not asked yet.
  classDays() { const v = this.progFm().class_days; if (v === 'none') return []; if (!Array.isArray(v)) return null; const d = [...new Set(v.map(Number).filter(x => x >= 0 && x <= 6))].sort(); return d.length ? d : null; }
  classDaysText() { const d = this.classDays(); return d === null ? 'Not set yet' : d.length ? 'Class on ' + d.map(x => DAY_LONG[x]).join(' and ') : 'Not in a class'; }
  classBooks() { const v = this.progFm().class_books; return ['beg', 'comp', 'both', 'none'].includes(v) ? v : 'both'; }
  // Nobody is asked for class days. Tapping Lesson page, Rally or Classroom Greek on the Class tab marks today as a class day;
  // the first one sets the day, a second weekday seen twice adds it (two classes a week). Days picked by hand in Options win.
  async classSeen() {
    if (this.isKids || this.isTeacher) return;
    const now = new Date(), wd = now.getDay(), t = ymd(now), seen = this.lsGet('classseen', []);
    if (!seen.some(x => x.d === t)) { seen.push({ d: t, wd }); this.lsSet('classseen', seen.slice(-20)); }
    const cur = this.classDays(); if (cur !== null && !this.progFm().class_auto) return;
    const cnt = {}; for (const x of seen) cnt[x.wd] = (cnt[x.wd] || 0) + 1;
    const days = cur && cur.length ? [...cur] : [];
    if (!days.length) days.push(wd); else if (!days.includes(wd) && cnt[wd] >= 2 && days.length < 2) days.push(wd); else return;
    days.sort(); const f = await this.progressFile();
    await this.app.fileManager.processFrontMatter(f, fm => { fm.class_days = days; fm.class_auto = true; if (!fm.class_books) fm.class_books = 'beg'; });
  }
  async setClassDays(d, books) {
    const f = await this.progressFile();
    await this.app.fileManager.processFrontMatter(f, fm => { fm.class_days = d.length ? d : 'none'; if (books) fm.class_books = books; delete fm.class_auto; });
    setTimeout(() => this.refreshToday(), 300);
  }
  // Pick the days: tap one or two, then Save. Not in a class is its own button.
  classDaysPick(el, done) {
    const cur = this.classDays() || [], on = new Set(cur);
    el.createDiv({ cls: 'gq-pop-big', text: 'Which days do you have class?' });
    el.createDiv({ cls: 'gq-hint', text: 'Tap every day you meet, one or more. Today plans your week around them: Language Transfer right after class, then the book reading before the next one.' });
    const ch = el.createDiv('gq-chips gq-class-days'), bs = [];
    const save = el.createDiv('gq-row').createEl('button', { text: 'Save', cls: 'mod-cta' });
    const paint = () => { bs.forEach(([d, b]) => { b.toggleClass('mod-cta', on.has(d)); b.setAttr('aria-pressed', String(on.has(d))); }); save.disabled = !on.size; };
    for (const d of [1, 2, 3, 4, 5, 6, 0]) { const b = ch.createEl('button', { text: DAY_LONG[d].slice(0, 3), cls: 'gq-mini', attr: { 'aria-label': DAY_LONG[d] } }); b.onclick = () => { on.has(d) ? on.delete(d) : on.add(d); paint(); }; bs.push([d, b]); }
    const books = d => { el.empty();
      el.createDiv({ cls: 'gq-pop-big', text: 'Which book do you read?' }); el.createDiv({ cls: 'gq-hint', text: 'For the reading before class. You can change this later in Options.' });
      const col = el.createDiv('gq-setup-opts'), cur = this.classBooks();
      for (const [t, sub, v] of [['Beginners\u2019 Greek', 'Teach Yourself Beginners\u2019 Greek', 'beg'], ['Complete Greek', 'Teach Yourself Complete Greek', 'comp'], ['Both', 'Beginners\u2019 Greek first, Complete Greek for more', 'both'], ['No book', 'Skip the reading; Language Transfer all week', 'none']]) {
        const b = col.createEl('button', { cls: 'gq-setup-opt' + (v === cur ? ' is-on' : '') }); b.createDiv({ cls: 'gq-setup-t', text: t }); b.createDiv({ cls: 'gq-hint', text: sub }); b.onclick = () => done(d, v); } };
    paint(); save.onclick = () => books([...on].sort());
    const no = el.createDiv('gq-hint').createEl('a', { text: 'I\u2019m not in a class', href: '#' }); no.onclick = e => { e.preventDefault(); books([]); };
  }
  classDaysPop() { this.pop('Class days', [{ label: '', build: (el, api) => this.classDaysPick(el, async (d, b) => { api.close(); await this.setClassDays(d, b); }) }]); }
  // Asked once, on Today, for students who set up before class days existed.
  classDaysCard(box) {
    const c = createDiv('gq-tcard gq-class-ask'); this.classDaysPick(c, (d, b) => this.setClassDays(d, b)); box.prepend(c);
  }
  // Where today falls between the last class and the next one: class day, Language Transfer days, then book days.
  // Days are counted on the class calendar; a week with no lesson has no class. Not in a class: the week runs as if class were on Wednesday.
  async cycleInfo(now) {
    const days = this.classDays(), cd = days && days.length ? days : CLASS_DEFAULT, start = new Date(COURSE_START[0], COURSE_START[1], COURSE_START[2]);
    const wk = {}, lessonOn = async d => { const dd = Math.floor((d - start) / 864e5); if (dd < 0) return 0; const w = Math.floor(dd / 7) + 1; if (!(w in wk)) { const n = await this.weekNote(w); wk[w] = n ? Number(n.fm.lesson) || 0 : 0; } return wk[w]; };
    const at = k => new Date(now.getFullYear(), now.getMonth(), now.getDate() + k);
    let next = null, prev = null;
    for (let k = 0; k < 42 && !next; k++) { const d = at(k); if (cd.includes(d.getDay())) { const n = await lessonOn(d); if (n) next = { k, d, n }; } }
    for (let k = 1; k < 42 && !prev; k++) { const d = at(-k); if (cd.includes(d.getDay())) { const n = await lessonOn(d); if (n) prev = { k, d, n }; } }
    if (!next && !prev) return null;
    const inClass = !!(days && days.length);
    if (next && next.k === 0 && inClass) return { kind: 'class', next, prev, label: `Rally before class, Lesson ${next.n}`, min: 3, days };
    const units = n => { const k = String(n).padStart(2, '0'), L = BOOK_UNITS['L' + k] || ['', ''], I = BOOK_UNITS['I' + k] || ['', '']; return { beg: L[0], comp: L[1] || I[1] }; };
    let kind;
    if (!next) kind = 'lt';
    else if (!prev) kind = 'book';
    else { const gap = prev.k + next.k - 1, pos = prev.k; kind = gap <= 1 ? 'both' : pos <= Math.ceil(gap / 3) ? 'lt' : 'book'; }
    const bk = this.classBooks(), u0 = next ? units(next.n) : { beg: '', comp: '' };
    const u = bk === 'none' ? { beg: '', comp: '' } : bk === 'beg' ? { beg: u0.beg, comp: '' } : bk === 'comp' ? { beg: '', comp: u0.comp } : u0;
    if (!u.beg && !u.comp) kind = 'lt';
    const label = kind === 'lt' ? 'Language Transfer, one or two tracks' : kind === 'book' ? `The book: ${u.beg ? 'Beginners\u2019 Greek ' + u.beg : 'Complete Greek ' + u.comp}` : 'Language Transfer, then the book';
    return { kind, next, prev, units: u, hasBook: !!(u.beg || u.comp), label, min: kind === 'both' ? 25 : 15, days, inClass };
  }
  cycleCard(box, col, cy) {
    const c = createDiv('gq-tcard gq-cycle'); this.cycEl = c; c.dataset.name = cy.kind === 'class' ? 'Before class' : cy.kind === 'book' ? 'Read the book' : 'Language Transfer'; const h = c.createDiv('gq-thead'), done = this.doneToday('cyc');
    const when = cy.next ? (cy.next.k === 1 ? 'tomorrow' : DAY_LONG[cy.next.d.getDay()]) : '';
    const fin = () => { this.markDone('cyc'); };
    if (cy.kind === 'class') {
      h.createEl('strong', { text: `Class today · Lesson ${cy.next.n}` });
      c.createDiv({ text: done ? 'Warmed up. See you in class.' : 'Hear the rally questions. Answer out loud.' });
      const f = this.lessonPage(cy.next.n), r = c.createDiv('gq-row');
      (async () => { const pairs = f ? this.rallyPairs(await this.app.vault.cachedRead(f)) : [];
        if (pairs.length) { const b = r.createEl('button', { text: `Practice the rally (${pairs.length})`, cls: done ? 'gq-mini' : 'mod-cta' }); b.onclick = () => { fin(); this.popRally(cy.next.n, pairs); }; r.prepend(b); } })();
      if (f) { const lb = r.createEl('button', { text: 'Lesson page', cls: 'gq-mini' }); lb.onclick = () => { fin(); this.openNote(f.path); }; }
    }
    if (cy.kind === 'lt' || cy.kind === 'both') {
      const sec = cy.kind === 'both' ? c.createDiv('gq-cycle-sec') : c, hh = cy.kind === 'both' ? sec.createDiv('gq-tsub') : h;
      hh.createEl('strong', { text: cy.prev && cy.inClass ? 'After class · Language Transfer' : 'Language Transfer' });
      if (col.lt_track < LT_MAX) {
        hh.createSpan({ cls: 'gq-hint', text: `  · track ${col.lt_track + 1}` });
        sec.createDiv({ text: 'Pause when asked. Answer out loud.' });
        const tie = cy.prev && LT_TIES[cy.prev.n];
        if (tie) { const t = sec.createDiv('gq-hint'); t.appendText(`Lesson ${cy.prev.n}\u2019s `); t.createSpan({ text: tie[2], attr: /[α-ω]/.test(tie[2]) ? { lang: 'el' } : {} }); t.appendText(`: tracks ${tie[0]} to ${tie[1]}` + (col.lt_track >= tie[1] ? ' (done)' : col.lt_track + 1 < tie[0] ? ' (coming up)' : '')); }
        this.ltTrackRow(sec, col, !done && cy.kind === 'lt', fin);
      } else sec.createDiv({ cls: 'gq-hint', text: 'You finished all 120 tracks. Replay one from a word card any time.' });
      if (cy.kind === 'lt' && cy.next && cy.hasBook) c.createDiv({ cls: 'gq-hint', text: cy.inClass ? `Then the book reading, before class ${when}.` : 'Then the book reading.' });
    }
    if (cy.kind === 'book' || cy.kind === 'both') {
      const sec = cy.kind === 'both' ? c.createDiv('gq-cycle-sec') : c, hh = cy.kind === 'both' ? sec.createDiv('gq-tsub') : h;
      // The book itself, not the lesson script: the unit to read and the exact tracks to play, right on the card.
      hh.createEl('strong', { text: cy.inClass ? `Before class ${when}` : 'Before the next lesson' });
      const u = cy.units, bk = u.beg ? ['Beginners\u2019 Greek', u.beg, BOOK_AUDIO.beg] : ['Complete Greek', u.comp, BOOK_AUDIO.comp];
      const um = String(bk[1]).match(/^(Unit \d+)(?:, (.+))?$/) || [0, bk[1], ''];
      sec.createDiv({ cls: 'gq-hero', text: 'Read ' + um[1] });
      const sub = sec.createDiv({ cls: 'gq-hero-sub', text: bk[0] + (um[2] ? ' \u00b7 ' + um[2] : '') });
      if (u.beg) { const lf = this.lessonPage(cy.next.n); if (lf) (async () => { const m = (await this.app.vault.cachedRead(lf)).match(/choose \*\*(.+?)\*\*/); const t = m && (m[1].match(/(\d\d\.\d\d(?:\u2013\d\d\.\d\d)?)/) || [])[1]; if (t) sub.appendText(' \u00b7 tracks ' + t.replace(/\b0(\d)\./g, '$1.')); })(); }
      if (u.beg && u.comp) sec.createDiv({ cls: 'gq-hint gq-hero-alt', text: 'More: Complete Greek \u00b7 ' + u.comp });
      // Each track twice: once reading along, once with the book closed.
      const chips = sec.createDiv({ cls: 'gq-chips', attr: { 'aria-label': 'Play each track twice' } });
      chips.createSpan({ cls: 'gq-chip', text: 'Once reading along' }); chips.createSpan({ cls: 'gq-chip', text: 'Once book closed' });
      const r = sec.createDiv('gq-row gq-pillrow'), did = this.doneToday('cycbook');
      const y = r.createEl('button', { text: did ? 'Read today' : 'I read it', cls: did ? 'gq-mini' : 'mod-cta' }); y.disabled = did;
      y.onclick = () => { y.disabled = true; y.setText('Read today'); this.moAdd('did', 'book:' + cy.next.n, 2); const d0 = this.lsGet('done', {}); d0.cycbook = ymd(new Date()); this.lsSet('done', d0); fin(); setTimeout(() => this.refreshToday(), 600); };
      const au = sec.createDiv('gq-row gq-pillrow').createEl('button', { text: 'Play the audio', cls: 'gq-ghost' }); au.onclick = () => window.open(bk[2], '_blank');
      if (u.beg && u.comp) this.addMore(c, ['Complete Greek audio', () => window.open(BOOK_AUDIO.comp, '_blank')]);
    }
    if (done && cy.kind !== 'class') { const d = createDiv({ cls: 'gq-hint gq-cycle-done', text: 'Done for today.' }); c.insertBefore(d, h.nextSibling); }
    this.addMore(c, ['Class days: ' + this.classDaysText().replace(/^Class on /, ''), () => this.classDaysPop()]);
    box.prepend(c);
  }
  // ---------- Ears first: Language Transfer, then Read what you've heard ----------
  // ears: tracks 1 to 30, nothing to read. read: the six sessions (one a day). with: the audio alongside the story. '' = off.
  ltStage(col) {
    col = col || this.colors(); if (this.isKids || !col.lt) return '';
    if (col.lt_read !== null && col.lt_read < LT_BRIDGE.length) return col.lt_track < LT_EARS && !col.lt_go ? 'ears' : 'read';
    return col.lt_track < LT_MAX ? 'with' : '';
  }
  async ltSet(patch) {
    const f = await this.progressFile();
    await this.app.fileManager.processFrontMatter(f, fm => { for (const [k, v] of Object.entries(patch)) { if (v === undefined) delete fm[k]; else fm[k] = v; } if (patch.lt && fm.lt_track === undefined) fm.lt_track = 0; });
    setTimeout(() => this.refreshToday(), 300);
  }
  ltOpen(n) { window.open(n ? ltTrackUrl(n) : LT_URL, '_blank'); this.moAdd && this.moAdd('did', 'lt', 1); }
  ltPlay(c, n, before) {
    if (!navigator.onLine) { this.ltOpen(n); return; }
    let w = c.querySelector('.gq-lt-play'); if (w) w.remove();
    w = createDiv('gq-lt-play'); if (before) before.before(w); else c.appendChild(w);
    const ifr = w.createEl('iframe', { attr: { src: ltPlayer(n), title: `Language Transfer, track ${n}`, allow: 'autoplay; encrypted-media', scrolling: 'no', frameborder: 'no', loading: 'lazy' } });
    this.scAuto(ifr, n);
    const card = c.closest ? c.closest('.gq-tcard') : null;
    if (card) this.addMore(card, ['Screen locks on a walk? The Language Transfer app', () => window.open(LT_APP, '_blank')]);
    this.moAdd && this.moAdd('did', 'lt', 1);
  }
  // SoundCloud's own widget says when a track ends (developers.soundcloud.com/docs/api/html5-widget): played to the end counts as listened.
  scAuto(ifr, n) {
    const go = () => { try { const W = window.SC.Widget, wd = W(ifr); wd.bind(W.Events.FINISH, () => {
      if (this.ltHeard === n) return; this.ltHeard = n; const after = this.ltAfterFn; this.ltAfterFn = null;
      if ((this.colors().lt_track || 0) >= n) return; this.moAdd && this.moAdd('did', 'lt-' + n, 1); if (after) after(); this.ltSet({ lt_track: n }); }); } catch (e) {} };
    if (window.SC && window.SC.Widget) { go(); return; }
    if (!this.scLoad) this.scLoad = new Promise((ok, no) => { const sc = document.createElement('script'); sc.src = 'https://w.soundcloud.com/player/api.js'; sc.onload = ok; sc.onerror = () => { this.scLoad = null; no(); }; document.head.appendChild(sc); });
    this.scLoad.then(go, () => {});
  }
  // A row for the track: Open, I listened, and a slider to set the track (for students who already started the course).
  ltTrackRow(c, col, cta, after) {
    const r = c.createDiv('gq-row'), nx = Math.min(LT_MAX, col.lt_track + 1);
    // Plays right here with Language Transfer's own SoundCloud player (their audio, their play counts; nothing is copied).
    // Play is the one button: a track played to the end marks itself. "I listened" is for the Language Transfer app or a track heard elsewhere.
    const o = r.createEl('button', { text: `Play track ${nx}`, cls: cta ? 'mod-cta' : 'gq-mini' }); o.onclick = () => { this.ltAfterFn = after || null; this.ltPlay(c, nx, r); };
    const card = (c.closest ? c.closest('.gq-tcard') : null) || c;
    this.addMore(card, [`I listened to track ${nx}`, () => { this.moAdd && this.moAdd('did', 'lt-' + nx, 1); if (after) after(); this.ltSet({ lt_track: nx }); }]);
    this.addMore(card, ['Already further along? Set my track', () => this.ltPicker(c, col)]);
  }
  // Set the track by hand: for students who started the course before the app, or skipped ahead.
  ltPicker(c, col) {
    const old = c.querySelector('.gq-lt-pick'); if (old) { old.remove(); return; }
    const box = c.createDiv('gq-fy-pick gq-lt-pick'), lab = box.createDiv('gq-tsub'), sl = box.createEl('input', { attr: { type: 'range', min: '0', max: String(LT_MAX), step: '1', 'aria-label': 'Tracks done' } });
    sl.value = String(col.lt_track); const show = () => lab.setText(+sl.value ? `Done through track ${sl.value}` : 'Not started'); sl.oninput = show; show();
    const s = box.createDiv('gq-row').createEl('button', { text: 'Save', cls: 'mod-cta' }); s.onclick = () => this.ltSet({ lt_track: +sl.value });
  }
  ltCard(box, col, stage) {
    const c = box.createDiv('gq-tcard gq-lt'), h = c.createDiv('gq-thead');
    if (stage === 'ears') {
      h.createEl('strong', { text: 'Listen first' }); h.createSpan({ cls: 'gq-hint', text: `  · Language Transfer · track ${col.lt_track + 1}` });
      c.createDiv({ text: 'Pause when asked. Answer out loud. No reading yet.' });
      this.ltTrackRow(c, col, true);
      this.addMore(c, ['Start reading now', () => this.ltSet({ lt_go: true })]);
      return;
    }
    // Reading: one session a day, about 10 minutes. The track row stays, quieter.
    const k = col.lt_read, set = LT_BRIDGE[k], today = ymd(new Date()), did = col.lt_day === today;
    h.createEl('strong', { text: 'Read what you\u2019ve heard' }); h.createSpan({ cls: 'gq-hint', text: `  · session ${Math.min(k + (did ? 0 : 1), LT_BRIDGE.length)} of ${LT_BRIDGE.length}` });
    if (did) { c.createDiv({ text: 'Done for today. The next letters open tomorrow.' }); }
    else {
      const ln = c.createDiv(); ln.appendText('New letters: '); ln.createSpan({ text: set[0].join(' '), attr: { lang: 'el' } });
      c.createDiv({ cls: 'gq-hint', text: `${set[1].length} words from the early tracks. Hear each one, read it, then build it. About 8 minutes.` });
      const g = c.createDiv('gq-row').createEl('button', { text: 'Start', cls: 'mod-cta' }); g.onclick = () => this.ltSession(k);
    }
    c.createDiv({ cls: 'gq-hint gq-lt-sub', text: `Keep listening: Language Transfer track ${Math.min(LT_MAX, col.lt_track + 1)}` });
    this.ltTrackRow(c, col, false);
  }
  // The quiet line on the story card, for students using Language Transfer alongside.
  ltLine(card, col, lesson) {
    if (col.lt_track >= LT_MAX) return;
    const d = card.createDiv('gq-hint gq-pace gq-lt-line'), nx = col.lt_track + 1, tie = LT_TIES[+lesson];
    d.appendText(`Language Transfer · next: track ${nx}`);
    if (tie) { d.appendText(' · this lesson\u2019s '); d.createSpan({ text: tie[2], attr: tie[2].match(/[α-ω]/) ? { lang: 'el' } : {} }); d.appendText(`: tracks ${tie[0]} to ${tie[1]}`); }
    d.appendText(' · ');
    const y = d.createEl('a', { text: 'Listened', href: '#' }); y.onclick = e => { e.preventDefault(); this.moAdd && this.moAdd('did', 'lt-' + nx, 1); this.ltSet({ lt_track: nx }); };
    d.appendText(' · '); const o = d.createEl('a', { text: 'Play', href: '#' }); o.onclick = e => { e.preventDefault(); this.ltPlay(card, nx, null); };
    d.appendText(' · '); const ch = d.createEl('a', { text: 'Change', href: '#' }); ch.onclick = e => { e.preventDefault(); this.ltPicker(card, col); };
  }
  // One session: the new letters (tap to hear), then each word: hear it and pick the meaning, read it aloud, build it.
  // A word that was still black turns yellow (kind of: known by ear, just read for the first time). Colors never go down here.
  async ltSession(k) {
    const set = LT_BRIDGE[k]; if (!set) return;
    const all = await this.wordIndex(), by = new Map(all.map(w => [w.word, w]));
    const ws = set[1].map(x => by.get(x)).filter(Boolean); if (!ws.length) return;
    const canHear = !gqQuiet() && !noSpeech();
    const mix = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    const ex = l => { const w = [...ws].find(x => foldG(x.word).includes(l)); return w ? w.word : ''; };
    const steps = [{ label: 'Letters', build: (el, api) => {
      el.addClass('gq-quiz'); el.createDiv({ cls: 'gq-hint', text: 'New letters. Tap one to hear it in a word you know.' });
      const g = el.createDiv('gq-lt-letters');
      for (const l of set[0]) {
        const L = LETTERS.find(x => x.l === l), p = LT_PAIR[l], w = ex(l), b = g.createEl('button', { cls: 'gq-lt-letter' });
        b.createDiv({ cls: 'gq-lt-l', text: l, attr: { lang: 'el' } });
        b.createDiv({ cls: 'gq-hint', text: L ? `${L.s}, ${L.h}` : p ? `${p[0]}, ${p[1]}` : '' });
        if (w) b.createDiv({ cls: 'gq-hint', text: w, attr: { lang: 'el' } });
        b.onclick = () => { if (w) say(w); };
      }
      el.createDiv({ cls: 'gq-hint', text: 'The accent mark shows the beat you already hear: μένω.' });
      const r = el.createDiv('gq-row'); const go = r.createEl('button', { text: 'Start the words', cls: 'mod-cta' }); go.onclick = () => api.next();
    } }];
    const got = new Set();
    const color = async w => { if (got.has(w.word)) return; got.add(w.word); this.moAdd('recall', w.word); if (!this.colorOf(w.word)) await this.setColor(w.word, 'yellow'); };
    ws.forEach((w, i) => {
      const stage = { n: 0 };
      steps.push({ label: `Word ${i + 1}`, build: (el, api) => {
        el.addClass('gq-quiz');
        const fbx = el.createDiv({ cls: 'gq-quiz-fb' });
        const step = () => { [...el.children].forEach(x => { if (x !== fbx) x.remove(); }); fbx.empty(); fbx.className = 'gq-quiz-fb'; el.prepend(fbx); (stage.n === 0 ? hear : stage.n === 1 ? read : build)(); };
        const nextStep = () => { stage.n++; if (stage.n > 2) { color(w); api.next(); } else step(); };
        // 1. Hear it, letters hidden. Pick the meaning.
        const hear = () => {
          el.createDiv({ cls: 'gq-hint', text: canHear ? 'Listen. What does it mean?' : 'Say it to yourself. What does it mean?' });
          if (canHear) { const h = el.createEl('button', { text: 'Hear it again', cls: 'gq-mini gq-quiz-hear' }); h.onclick = () => say(w.word); setTimeout(() => say(w.word), 250); }
          else el.createDiv({ cls: 'gq-quiz-q', text: w.pron || w.word });
          const opts = mix([w, ...mix(ws.filter(o => o !== w && o.english !== w.english)).slice(0, 2)]), box = el.createDiv('gq-quiz-opts');
          for (const o of opts) { const b = box.createEl('button', { text: o.english, cls: 'gq-quiz-opt' }); b.onclick = () => {
            const ok = o === w; b.addClass(ok ? 'is-ok' : 'is-miss'); box.querySelectorAll('button').forEach(x => { x.disabled = true; if (x.textContent === w.english) x.addClass('is-ok'); });
            fbx.setText(ok ? 'Right.' : `It means ${w.english}.`); fbx.addClass(ok ? 'is-ok' : 'is-miss'); setTimeout(() => { if (el.isConnected) nextStep(); }, ok ? 800 : 1700); }; }
        };
        // 2. See it, with the sound under it, and read it aloud.
        const read = () => {
          el.createDiv({ cls: 'gq-hint', text: 'Now read it out loud' });
          const q = el.createDiv({ cls: 'gq-quiz-q', text: w.word, attr: { lang: 'el' } }); q.onclick = () => canHear && say(w.word);
          if (w.pron) el.createDiv({ cls: 'gq-hint gq-lt-pron', text: 'say it: ' + w.pron });
          el.createDiv({ cls: 'gq-hint', text: w.english });
          const r = el.createDiv('gq-row gq-quiz-say');
          this.sayIt(r, w.word, 'lt:' + w.word, 'Say it', () => setTimeout(() => { if (el.isConnected) nextStep(); }, 900));
          const n = r.createEl('button', { text: 'Next', cls: 'gq-mini' }); n.onclick = () => nextStep();
        };
        // 3. Build it from its letters. One off, or two swapped, still counts and shows the spelling.
        const build = () => {
          const f = foldG(w.word).replace(/\s/g, '');
          el.createDiv({ cls: 'gq-hint', text: 'Build it' }); el.createDiv({ cls: 'gq-hint', text: w.english });
          if (canHear) { const h = el.createEl('button', { text: 'Hear it', cls: 'gq-mini gq-quiz-hear' }); h.onclick = () => say(w.word); }
          const out = el.createDiv({ cls: 'gq-quiz-built', attr: { lang: 'el', 'aria-live': 'polite' } }), tiles = el.createDiv({ cls: 'gq-quiz-tiles', attr: { lang: 'el' } });
          let letters = mix([...f]); if (letters.join('') === f && f.length > 1) letters = letters.reverse();
          const typed = [], draw = () => out.setText(typed.map(x => x.ch).join('') || '\u00a0');
          const check = () => {
            const g = typed.map(x => x.ch).join(''); let ok = g === f, swap = false;
            if (!ok) for (let j = 0; j < f.length - 1; j++) if (g === f.slice(0, j) + f[j + 1] + f[j] + f.slice(j + 2)) swap = true;
            const close = !ok && (swap || near(g, f));
            tiles.querySelectorAll('button').forEach(b => b.disabled = true); und.disabled = true;
            fbx.empty(); fbx.addClass(ok || close ? 'is-ok' : 'is-miss'); fbx.appendText(ok ? 'Right. ' : close ? 'Close enough. It\u2019s spelled ' : 'It\u2019s spelled '); fbx.createSpan({ text: w.word, attr: { lang: 'el' } });
            if (canHear) say(w.word); setTimeout(() => { if (el.isConnected) nextStep(); }, ok ? 900 : 1900);
          };
          letters.forEach(ch => { const b = tiles.createEl('button', { text: ch, cls: 'gq-quiz-tile' }); b.onclick = () => { typed.push({ ch, b }); b.disabled = true; draw(); if (typed.length === f.length) check(); }; });
          const rr = el.createDiv('gq-row gq-quiz-say'), und = rr.createEl('button', { text: 'Undo', cls: 'gq-mini' }); und.onclick = () => { const x = typed.pop(); if (x) { x.b.disabled = false; draw(); } };
          draw();
        };
        step();
      } });
    });
    const last = k + 1 >= LT_BRIDGE.length;
    steps.push({ label: 'Done', build: (el, api) => {
      el.addClass('gq-quiz');
      el.createDiv({ cls: 'gq-quiz-q', text: last ? 'You read Greek now.' : `${ws.length} words read` });
      el.createDiv({ cls: 'gq-hint', text: last ? 'Today has the story now, with the words you can read. Keep listening alongside: the story card shows your next track.' : 'Words you only knew by ear, now on the page. They are yellow in Words. Next letters tomorrow.' });
      const r = el.createDiv('gq-row'); const a = r.createEl('button', { text: 'Done', cls: 'mod-cta' }); a.onclick = () => api.close();
      this.ltFinish(k);
    } });
    this.pop('Read what you\u2019ve heard', steps, () => setTimeout(() => this.refreshToday(), 400));
  }
  // A session is done when its last screen shows. The last one starts the story, Fluent in a Year (if picked) and the tour.
  async ltFinish(k) {
    if (this.ltDone === k) return; this.ltDone = k;
    const f = await this.progressFile(); let fy = false;
    await this.app.fileManager.processFrontMatter(f, fm => { const was = parseInt(fm.lt_read, 10) || 0; if (k + 1 > was) fm.lt_read = k + 1; fm.lt_day = ymd(new Date()); if (k + 1 >= LT_BRIDGE.length && fm.lt_fiay) { fy = true; delete fm.lt_fiay; } });
    if (k + 1 >= LT_BRIDGE.length) { this.lsSet('abcoff', 1); if (fy) await this.setFiay(true); }
  }
  // ---------- First launch: two questions build the beginner setup (pace, then the alphabet) ----------
  needSetup() {
    if (this.isKids || this.setupShown || this.app.vault.getAbstractFileByPath('Teacher')) return false;
    const fm = this.progFm();
    if (fm.setup_done) return false;
    // Students already under way are not asked.
    return !(parseInt(fm.story_at, 10) > 0) && !(Array.isArray(fm.tour_done) && fm.tour_done.length) && (fm.tour_at === undefined || fm.tour_at === null);
  }
  // ---------- First open: a soft start. Six one-tap guesses, no questions, no tour. ----------
  // The first two sound like English, so anyone gets them. Then two everyday words by ear, then two lines to read
  // with no sound and no phonetics. How they do picks the start: by ear (new), letters as they go (some), or plain Greek (read).
  // Casual pace; class days are asked on a later day, one card. Everything is in Options afterwards.
  opening(el) {
    const R = [
      { gr: 'ταξί', ok: 'taxi', no: ['coffee', 'music'], ear: 1 },
      { gr: 'καφές', ok: 'coffee', no: ['tea', 'water'], ear: 1 },
      { gr: 'νερό', ok: 'water', no: ['bread', 'wine'], ear: 1, k: 'ear' },
      { gr: 'ευχαριστώ', ok: 'thank you', no: ['good morning', 'goodbye'], ear: 1, k: 'ear' },
      { gr: 'Πού είναι το σπίτι;', ok: 'Where is the house?', no: ['I have a house.', 'The house is big.'], k: 'read' },
      { gr: 'Δεν ξέρω τι θέλει.', ok: 'I don\u2019t know what he wants.', no: ['I know what he wants.', 'He doesn\u2019t want to know.'], k: 'read' }
    ], sc = { ear: 0, read: 0 };
    el.empty(); const box = el.createDiv('gq-today gq-open'), c = box.createDiv('gq-tcard gq-open-card');
    c.createDiv({ cls: 'gq-pop-big', text: 'Πάμε.', attr: { lang: 'el' } });
    const sub = c.createDiv({ cls: 'gq-hint', text: 'Hear it, then guess what it means. No wrong answers yet.' });
    const area = c.createDiv('gq-open-area'), dots = c.createDiv({ cls: 'gq-open-dots', attr: { 'aria-hidden': 'true' } });
    R.forEach(() => dots.createSpan('gq-open-dot'));
    const finish = async () => {
      const start = sc.read === 2 ? 'read' : (sc.ear === 2 || (sc.ear && sc.read)) ? 'some' : 'new';
      area.empty(); sub.setText(''); area.createDiv({ cls: 'gq-pop-big', text: 'Μπράβο.', attr: { lang: 'el' } });
      area.createDiv({ cls: 'gq-hint', text: start === 'new' ? 'You start by ear. Next: a short listening lesson.' : start === 'some' ? 'You know some already. Next: today\u2019s story.' : 'You read Greek. Next: today\u2019s story.' });
      try { const f = await this.progressFile(); await this.app.fileManager.processFrontMatter(f, fm => { fm.setup_day = ymd(new Date()); fm.start_check = `ear ${sc.ear}/2, read ${sc.read}/2`; }); } catch (e) {}
      setTimeout(() => this.setupSave({ start, pace: 'casual', abc: start === 'read' }), 1400);
    };
    const round = i => {
      area.empty(); [...dots.children].forEach((d, k) => d.toggleClass('is-on', k <= i)); if (i >= R.length) return finish();
      const x = R[i], g = area.createDiv({ cls: 'gq-open-gr gq-noph', attr: { lang: 'el' } });
      if (x.ear) { for (const w of x.gr.split(' ')) { const r = g.createEl('ruby'); r.appendText(w); r.createEl('rt', { text: gqPh(w.replace(/[;,.!?]/g, '')) || '' }); } }
      else { g.setText(x.gr); if (i === 4) sub.setText('Now just read it. Guess if you need to.'); }
      if (x.ear) { const hb = area.createDiv('gq-row').createEl('button', { text: 'Hear it', cls: 'mod-cta' }); hb.onclick = () => say(x.gr); if (i > 0) setTimeout(() => say(x.gr), 250); }
      const opts = [x.ok, ...x.no]; const h = [...x.gr].reduce((a, ch) => a + ch.charCodeAt(0), i); const order = opts.map((t, k) => ({ t, r: (h * (k + 3)) % 7 })).sort((a, b) => a.r - b.r).map(o => o.t);
      const col = area.createDiv('gq-open-opts'); let done = false;
      const pick = (t, b) => {
        if (done) return; done = true; const right = t === x.ok; if (right && x.k) sc[x.k]++;
        col.querySelectorAll('button').forEach(z => { z.disabled = true; if (z.textContent === x.ok) z.addClass('is-right'); });
        if (b && !right) b.addClass('is-wrong');
        say(x.gr); setTimeout(() => round(i + 1), right ? 900 : 1600);
      };
      for (const t of order) { const b = col.createEl('button', { cls: 'gq-open-opt', text: t }); b.onclick = () => pick(t, b); }
      const ns = area.createDiv('gq-hint gq-open-ns').createEl('a', { text: 'Not sure', href: '#' }); ns.onclick = e => { e.preventDefault(); pick('', null); };
    };
    round(0);
    const sk = c.createDiv('gq-hint gq-open-skip').createEl('a', { text: 'Skip', href: '#' });
    sk.onclick = e => { e.preventDefault(); this.setupSave({ start: 'some', pace: 'casual', abc: false }); };
  }
  setupPop() {
    this.setupShown = true; const ans = { start: 'some', pace: 'casual', abc: false }; let saved = false;
    const save = async () => { if (saved) return; saved = true; await this.setupSave(ans); };
    this.pop('Welcome', [{ label: '', build: (el, api) => {
      const q = (title, sub, opts, pick) => { el.empty();
        el.createDiv({ cls: 'gq-pop-big', text: title }); if (sub) el.createDiv({ cls: 'gq-hint', text: sub });
        const col = el.createDiv('gq-setup-opts');
        for (const [t, d, v] of opts) { const b = col.createEl('button', { cls: 'gq-setup-opt' }); b.createDiv({ cls: 'gq-setup-t', text: t }); b.createDiv({ cls: 'gq-hint', text: d }); b.onclick = () => pick(v); } };
      const done = () => { el.empty();
        el.createDiv({ cls: 'gq-pop-big', text: 'Πάμε.', attr: { lang: 'el' } }); el.createDiv({ cls: 'gq-hint', text: 'Let\'s go.' });
        el.createDiv({ cls: 'gq-tsub', text: 'Your setup' });
        const ul = el.createEl('ul', { cls: 'gq-setup-sum' });
        const nw = ans.start === 'new';
        if (nw) ul.createEl('li', { text: 'Ears first: Language Transfer, a free audio course, one or two tracks a day. After track 30 you learn the letters with words you already know.' });
        ul.createEl('li', { text: ans.pace === 'fiay' ? (nw ? 'Fluent in a Year: day one is the day you start reading, so you never start behind.' : 'Fluent in a Year: today is day one. One story day each day, and Today shows if you fall behind.') : 'Casual: one short story part a day, at your own pace.' });
        if (ans.days) ul.createEl('li', { text: ans.days.length ? `Class on ${ans.days.map(d => DAY_LONG[d]).join(' and ')}: Language Transfer right after class, then the book reading before the next one.` : 'No class: Language Transfer early in the week, then the book reading.' });
        if (!nw) ul.createEl('li', { text: ans.abc ? 'You read the alphabet: plain Greek letters, no letter practice.' : 'Learning the alphabet: letter practice, and the sound of each word under it.' });
        el.createDiv({ cls: 'gq-hint', text: 'Change it later in Class, under Settings and help, then Options.' });
        const r = el.createDiv('gq-row'); const go = r.createEl('button', { text: 'Start', cls: 'mod-cta' });
        go.onclick = async () => { await save(); api.close(); }; };
      // Where they start, then how far. New to Greek starts by ear (Language Transfer); nobody is asked about letters twice.
      q('Where are you starting?', '', [
        ['New to Greek', 'Start by ear with a free audio course. Reading comes after, with words you already know.', 'new'],
        ['I know some Greek', 'Not the letters yet. The app teaches them as you go.', 'some'],
        ['I can read Greek', 'Just the Greek, no letter practice.', 'read']
      ], v0 => { ans.start = v0; ans.abc = v0 === 'read';
        q('How far do you want to go?', 'You can change this later.', [
          ['Casual', 'A little each day, at your own pace.', 'casual'],
          ['Fluent in a Year', 'About 20 minutes a day, every day, for a year.', 'fiay']
        ], v => { ans.pace = v; el.empty(); this.classDaysPick(el, (d, b) => { ans.days = d; ans.books = b; done(); }); }); });
    } }], () => { save(); });
  }
  async setupSave(ans) {
    const fiay = ans.pace === 'fiay', now = new Date(), day = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    this.phNow = !ans.abc; this.applyPh(); if (!ans.abc) this.lsSet('abcoff', 0);
    const f = await this.progressFile();
    await this.app.fileManager.processFrontMatter(f, fm => { fm.setup_done = true; fm.pace = ans.pace; if (ans.days) fm.class_days = ans.days.length ? ans.days : 'none'; if (ans.books) fm.class_books = ans.books; fm.knows_abc = !!ans.abc; fm.phonetics = !ans.abc;
      // New to Greek: ears first. Fluent in a Year waits for the first reading day (lt_fiay), so the pace doesn't start out behind.
      if (ans.start === 'new') { fm.lt = true; if (!(parseInt(fm.lt_track, 10) > 0)) fm.lt_track = 0; if (fm.lt_read === undefined) fm.lt_read = 0; }
      if (fiay && ans.start === 'new' && !(parseInt(fm.lt_read, 10) >= LT_BRIDGE.length)) { fm.lt_fiay = true; delete fm.fiay; delete fm.fiay_from; }
      else if (fiay) { fm.fiay = true; fm.fiay_from = day; delete fm.lt_fiay; } else { delete fm.fiay; delete fm.fiay_from; delete fm.lt_fiay; } });
    this.stackPick = null; setTimeout(() => this.refreshToday(), 300);
  }
  async setupAgain() {
    const f = await this.progressFile(); await this.app.fileManager.processFrontMatter(f, fm => { delete fm.setup_done; });
    this.setupShown = false; const old = document.querySelector('.gq-pop'); if (old) old.remove(); this.setupPop();
  }
  setAbcOff(v) { this.lsSet('abcoff', v ? 1 : 0); new Notice(v ? 'Letter practice is off. Letter practice at the bottom of Today turns it back on.' : 'Letter practice is back on Today.'); this.stackPick = null; this.refreshToday(); }
  // A "Say it" button: listen, then +2 φόρα when the phone hears the target. key keeps it to once a day.
  // onWin (optional): what the screen does once the phone hears it right, e.g. fill in the story puzzle.
  // other (optional): the lines around yours. Saying those instead of your line gets a hint, not a plain Try again.
  sayIt(parent, target, key, label, onWin, other) {
    // target can be a list of words with the same meaning (ότι, πως): any of them counts.
    const many = Array.isArray(target); if (many) target = target.join(', ');
    const w = parent.createSpan('gq-sayit'), wd = many || /^w:/.test(key || '');
    const b = w.createEl('button', { text: label || 'Say it · +2', cls: 'gq-mini gq-sayit-b', attr: { 'aria-label': 'Say it out loud for 2 bonus φόρα' } });
    const fb = w.createSpan({ cls: 'gq-hint gq-sayit-fb' });
    const miss = alts => other && heardIt(other.gr, alts) ? ` That is ${other.who || 'their'} line. Now say yours${other.en ? ': ' + other.en : ''}` : null;
    const win = note => { b.setText('Heard it · +2'); b.addClass('is-ok'); b.disabled = true; fb.setText(note || ''); if (note) fb.addClass('gq-sayit-spell'); this.moAdd('said', key); if (onWin) try { onWin(); } catch (e) {} };
    const typed = () => {
      b.remove(); fb.setText('');
      const i = w.createEl('input', { cls: 'gq-sayit-in', attr: { type: 'text', lang: 'el', placeholder: 'Tap the mic on the keyboard and say it', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false' } });
      const chk = () => { if (!i.value.trim()) return; const how = heardHow(target, [i.value], wd); if (how) { i.disabled = true; w.createSpan({ cls: 'gq-hint', text: ' Heard it · +2' }); fb.setText(spellNote(how)); if (how.length) fb.addClass('gq-sayit-spell'); w.appendChild(fb); this.moAdd('said', key); if (onWin) try { onWin(); } catch (e) {} } else fb.setText(miss([i.value]) || ' Not quite. Try again.'); };
      i.onchange = chk; i.onkeydown = e => { if (e.key === 'Enter') chk(); };
      w.appendChild(fb); fb.setText(' Switch the keyboard to Greek first (the globe key), so its mic writes Greek.');
      // The app's own microphone was switched off on this phone after a failure: one tap tries it again.
      if (SRec() && this.lsGet('sroff', 0)) { const a = w.createEl('a', { text: ' Try the app mic again', href: '#', cls: 'gq-hint' }); a.onclick = e => { e.preventDefault(); this.lsSet('sroff', 0); const p = w.parentElement; w.remove(); if (p) this.sayIt(p, target, key, label, onWin, other); }; }
      i.focus();
    };
    if (!SRec() || this.lsGet('sroff', 0)) { b.onclick = typed; return w; }
    // Two misses in a row with nothing heard, or a microphone that never starts: the keyboard's microphone takes over,
    // and a stall (common in iPhone home-screen apps) switches this phone to it from now on.
    let fails = 0;
    const toKb = (off, note) => { if (off) this.lsSet('sroff', 1); typed(); fb.setText((note || ' Tap the mic on the keyboard and say it. It types what you say, and the app checks it.') + ' Switch the keyboard to Greek first (the globe key).'); };
    b.onclick = async () => {
      if (b.hasClass('is-live')) return;
      try { window.speechSynthesis && speechSynthesis.cancel(); } catch (e) {}
      b.addClass('is-live'); b.setText('Listening…'); fb.setText('Say it now.');
      try {
        const alts = await listenGreek(); b.removeClass('is-live');
        const how = heardHow(target, alts, wd);
        if (how) win(spellNote(how));
        else if (!alts.length && ++fails >= 2) toKb(false);
        else { b.setText(label || 'Say it · +2'); fb.setText(miss(alts) || (alts.length ? ` Heard "${alts[0]}". Try again.` : ' Nothing heard. Try again, a little louder.')); }
      } catch (e) {
        b.removeClass('is-live'); b.setText(label || 'Say it · +2');
        if (e === 'no-speech' || e === 'aborted' || e === 'late') { if (++fails >= 2) toKb(false); else fb.setText(' Nothing heard. Try again.'); }
        else if (e === 'hang' || e === 'busy' || e === 'audio-capture' || e === 'network') toKb(true, ' The microphone did not start here. Tap the mic on the keyboard and say it instead.');
        // Blocked or not working here (Obsidian on a computer blocks it): use the keyboard's microphone instead, from now on.
        // Blocked for good (permission, or no speech service): switch to the keyboard's microphone from now on.
        else if (e === 'not-allowed' || e === 'service-not-allowed' || e === 'none') { this.lsSet('sroff', 1); typed(); if (window.GQW) fb.setText(' The microphone is blocked for this site. Tap the mic on the keyboard instead, or a grown-up can allow it in the browser settings.'); }
        // A stall or a one-off error: say so and keep the button. Try again works most of the time.
        else if (++fails >= 2) toKb(false); else fb.setText(' The microphone did not start. Tap the button again.');
      }
    };
    return w;
  }
  // Letter names: the six letters of a set in alphabet order. Say one or more names and those letters fill in.
  // Tap a letter to hear its name first (that one then counts as trying, 1, instead of remembering, like a word).
  abcAllDone() { return this.lettersDone().length >= LETTER_SETS.length && this.namesDone().length >= NAME_SETS.length; }
  namesDone() { const v = this.namesNow || this.progFm().letter_names; return Array.isArray(v) ? v.map(Number).filter(n => n >= 1 && n <= NAME_SETS.length) : []; }
  namesPane(c, redraw) {
    const done = this.namesDone(), all = NAME_SETS.length;
    let n = this.letterSet; if (!n) { const i = NAME_SETS.findIndex((x, k) => !done.includes(k + 1)); n = i < 0 ? 1 : i + 1; }
    const h = c.createDiv('gq-thead'); h.createEl('strong', { text: 'Letter names' });
    h.createSpan({ cls: 'gq-hint', text: done.length >= all ? '  · all 24 names done' : `  · set ${n} of ${all}` });
    c.createDiv({ cls: 'gq-hint', text: 'Say a letter\'s name, like άλφα or βήτα, and it fills in. You can say several at once. Tap a letter to hear its name.' });
    const sets = c.createDiv('gq-row gq-abc-sets');
    NAME_SETS.forEach((x, i) => { const b = sets.createEl('button', { cls: 'gq-mini' + (i + 1 === n ? ' is-on' : '') + (done.includes(i + 1) ? ' is-done' : ''), text: x.map(y => y.l).join(' '), attr: { lang: 'el', 'aria-label': `Names set ${i + 1}` + (done.includes(i + 1) ? ', done' : '') } }); b.onclick = () => { this.letterSet = i + 1; redraw(); }; });
    const set = NAME_SETS[n - 1], heard = new Set(), got = new Set();
    const grid = c.createDiv('gq-abc-names');
    const tiles = new Map(set.map(x => {
      const k = grid.createDiv({ cls: 'gq-abc-nm', attr: { role: 'button', tabindex: '0', 'aria-label': `Letter ${x.u} ${x.l}. Tap to hear its name.` } });
      k.createDiv({ cls: 'gq-abc-nl', text: `${x.u} ${x.l}`, attr: { lang: 'el' } });
      k.createDiv({ cls: 'gq-abc-nn', text: '?', attr: { lang: 'el' } });
      const hear = () => { heard.add(x.l); say(x.sp); };
      k.onclick = hear; k.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); hear(); } };
      return [x.l, k];
    }));
    const fb = c.createDiv({ cls: 'gq-hint gq-abc-nfb' });
    const fill = ls => {
      const fresh = ls.filter(l => !got.has(l));
      for (const l of fresh) {
        const x = set.find(y => y.l === l), k = tiles.get(l); got.add(l);
        k.addClass('is-ok'); k.querySelector('.gq-abc-nn').setText(x.n);
        this.moAdd(heard.has(l) ? 'try' : 'recall', 'όνομα:' + l);
      }
      if (got.size >= set.length) finish();
      return fresh;
    };
    const tell = (alts, fresh) => {
      if (fresh.length) fb.setText(fresh.map(l => set.find(y => y.l === l).n).join(', ') + (got.size < set.length ? `. ${set.length - got.size} to go.` : '.'));
      else fb.setText(alts && alts.length && alts[0] ? `Heard "${alts[0]}". Try again, or tap a letter to hear its name.` : 'Nothing heard. Try again, a little louder.');
    };
    const ctl = c.createDiv('gq-row gq-abc-nctl');
    // The keyboard way: the keyboard's microphone (or typing άλφα, or alpha) fills letters in as you go.
    const typed = () => {
      if (ctl.querySelector('input')) { ctl.querySelector('input').focus(); return; }
      const i = ctl.createEl('input', { cls: 'gq-sayit-in', attr: { type: 'text', lang: 'el', placeholder: 'Tap the mic on the keyboard, say a name', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', 'aria-label': 'Letter names' } });
      const chk = fin => { const v = i.value.trim(); if (!v) return; const f = fill(namesHeard(set, [v])); if (f.length) { tell([v], f); i.value = ''; } else if (fin) tell([v], f); };
      i.oninput = () => chk(false); i.onchange = () => chk(true); i.onkeydown = e => { if (e.key === 'Enter') chk(true); };
      i.focus();
    };
    if (SRec() && !this.lsGet('sroff', 0)) {
      const b = ctl.createEl('button', { text: 'Say a name', cls: 'mod-cta gq-sayit-b', attr: { 'aria-label': 'Say a letter name out loud' } });
      b.onclick = async () => {
        if (b.hasClass('is-live')) return;
        try { window.speechSynthesis && speechSynthesis.cancel(); } catch (e) {}
        b.addClass('is-live'); b.setText('Listening…'); fb.setText('Say it now.');
        try { const alts = await listenGreek(); b.removeClass('is-live'); b.setText('Say a name'); tell(alts, fill(namesHeard(set, alts))); }
        catch (e) {
          b.removeClass('is-live'); b.setText('Say a name');
          if (e === 'no-speech' || e === 'aborted' || e === 'late') fb.setText('Nothing heard. Try again.');
          else if (e === 'not-allowed' || e === 'service-not-allowed' || e === 'none') { this.lsSet('sroff', 1); b.remove(); typed(); fb.setText('The microphone is blocked for this site. Tap the mic on the keyboard and say the name, or allow the microphone in the browser settings.'); }
          else if (e === 'hang' || e === 'busy' || e === 'audio-capture' || e === 'network') { this.lsSet('sroff', 1); b.remove(); typed(); fb.setText('The microphone did not start here. Tap the mic on the keyboard and say the name.'); }
          else fb.setText('The microphone did not start. Tap Say a name again, or use the keyboard.');
        }
      };
      const k = ctl.createEl('button', { text: 'Use the keyboard', cls: 'gq-mini' }); k.onclick = () => { k.remove(); typed(); };
    } else typed();
    const fin = c.createDiv('gq-abc-fin');
    const finish = async () => {
      const f = await this.progressFile(); let list = [];
      await this.app.fileManager.processFrontMatter(f, fm => { list = Array.isArray(fm.letter_names) ? fm.letter_names.map(Number) : []; if (!list.includes(n)) list.push(n); list.sort(); fm.letter_names = list; });
      this.namesNow = list; setTimeout(() => { this.namesNow = null; }, 3000);
      this.moAdd('did', 'names:' + n, 2); this.markDone('abc');
      ctl.style.display = 'none'; fin.empty(); fin.createDiv({ cls: 'gq-abc-yay', text: `Μπράβο. All ${set.length} names in set ${n}.` });
      const fr = fin.createDiv('gq-row'); const nx = NAME_SETS.findIndex((x, k) => !list.includes(k + 1));
      if (nx >= 0) { const b = fr.createEl('button', { text: `Next: set ${nx + 1}`, cls: 'mod-cta' }); b.onclick = () => { this.letterSet = nx + 1; redraw(); }; }
      const hb = fr.createEl('button', { text: 'Hear them in order', cls: 'gq-mini' }); hb.onclick = () => say(set.map(x => x.sp).join(', '));
      const a = fr.createEl('button', { text: 'Again', cls: 'gq-mini' }); a.onclick = () => redraw();
    };
  }
  shuf(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  // ---------- The tour: the fun first, the useful bits in between, on the real screens ----------
  // Each step is done by doing it (finish a line, pick a color, open a game), worth 2 φόρα once, ever.
  // Steps can be done in any order and on different days. Numbered dots let a teacher say "everyone on step 4" in class.
  // My progress: tour_at = the step showing (99 = closed), tour_done = the steps done.
  tourSteps() { const s = this.tourSteps0(); return this.abcOff() ? s.filter(x => x.k !== 'letters') : s; }
  tourSteps0() {
    if (this.isKids) {
      const k = this.kidLesson || 1;
      return [
        { k: 'hello', at: ['hello'], t: 'Start with a song', b: 'Sing the hello song together and do the moves. It starts every lesson.', ev: 'song' },
        { k: 'letters', at: ['letters'], t: 'Letters and sounds', b: 'Tap a sound to hear it. Drag each letter onto the sound it makes. Finish one set of six.', ev: 'letters' },
        { k: 'giagia', at: ['giagia'], t: 'Γιαγιά', b: 'Find 7 notebooks before Γιαγιά feeds you. Use the arrows or swipe. Come back here when you are done.', go: ['Play Γιαγιά', () => this.openApp('giagia', '#k=' + k)], ev: 'game' },
        { k: 'puzzle', at: ['puzzle'], t: 'Story puzzle', b: 'Drag the Greek words up to finish the line, or tap them. Finish one line.', ev: 'story' },
        { k: 'mo', at: [], t: 'Πάρε φόρα', b: 'Everything you do adds φόρα. Finish the tour and an olive tree is planted in the corner. It grows olives, then oil, then lights a lamp.' },
        { k: 'words', at: ['words'], t: "This week's words", b: 'Hear each word, then pick a color: red is not yet, yellow is kind of, green is got it.', ev: 'up' },
        { k: 'teacher', at: ['teacher'], t: 'Now you are the teacher', b: 'Swap. The kid asks. The grown-up gets one wrong on purpose. Catch it. Then tap We did it.', ev: 'teacher' },
        { k: 'web', at: ['tab-words'], t: 'Word web', b: 'Tap a word to go there, double-tap to hear more than one, hold to see what it goes with.', go: ['Open the Word web', () => this.openGraph()], ev: 'web' },
        { k: 'class', at: ['tab-class'], t: 'Class', b: "This week's lesson and game, homework, and Ask the class.", go: ['Open Class', () => this.openClass()], ev: 'class', tab: 'class' }
      ];
    }
    return [
      { k: 'next', at: ['next'], t: 'Start here', b: 'Today is one path, the same every day: today\'s story, then review. Tap Next at the bottom of a card to go on.', ev: 'next' },
      { k: 'story', at: ['story'], t: 'Story puzzle', b: 'Finish one line: put the Greek words in order, then say it out loud.', ev: 'story' },
      { k: 'world', at: [], t: 'Πάρε φόρα', b: 'Everything you do adds φόρα (momentum). Finish the tour and an olive tree is planted in the corner. It grows olives, the olives become oil, and the oil lights a lamp.' },
      { k: 'words', at: ['tab-words'], t: 'Words', b: 'All the words in one list, most frequent first. Find one you know and tap its color: red, yellow or green.', go: ['Open Words', () => this.openWords()], ev: 'up', tab: 'words' },
      { k: 'web', at: ['tab-words'], t: 'Word web', b: 'See what a word goes with. Tap a word to go there. Hold it to hear a phrase.', go: ['Open the Word web', () => this.openGraph()], ev: 'web' },
      { k: 'game', at: [], t: 'Γιαγιά', b: 'A quick game with your words. Come back here when you are done.', go: ['Play Γιαγιά', () => this.openApp('giagia', '')], ev: 'game' },
      { k: 'class', at: ['tab-class'], t: 'Class', b: "This week's lesson, the rally, homework, practice together and Ask the class, in one place.", go: ['Open Class', () => this.openClass()], ev: 'class', tab: 'class' },
      { k: 'plan', at: [], plan: true, t: 'Pick your moment', b: 'Choose when you practice: after coffee, after the bus. Doing it after something you already do makes it easy to start.', ev: 'plan' },
      { k: 'focus', at: [], t: 'Focus', b: 'Calm mode, Focus sound and Walk mode (your Greek, hands-free, for practicing on the move) are in Options, at the bottom of Class.', go: ['Open Options', () => this.optionsPop()], ev: 'more' },
      { k: 'paper', at: ['paper'], t: 'Paper cards', b: 'Make a paper card for a word: Greek on the front, a picture on the back. Then Card practice on Today: tap how many cards and minutes you did. As many as you like.', go: ['Open Words', () => this.openWords()], ev: 'card' }
    ];
  }
  tourState() {
    if (!this.tour) { const fm = this.progFm(); this.tour = { at: fm.tour_at === undefined || fm.tour_at === null ? undefined : parseInt(fm.tour_at, 10), done: Array.isArray(fm.tour_done) ? fm.tour_done.map(String) : [], seen: Array.isArray(fm.tour_seen) ? fm.tour_seen.map(String) : [], early: Array.isArray(fm.tour_early) ? fm.tour_early.map(String) : [] }; }
    return this.tour;
  }
  tourLeft() { const d = this.tourState().done; return this.tourSteps().filter(x => x.ev && !d.includes(x.k)).length; }
  tourOpen() { const a = this.tourState().at; return a !== undefined && a < 99; }
  tourIs(k) { if (!this.tourOpen()) return false; const st = this.tourSteps()[this.tourState().at]; return !!st && st.k === k; }
  async tourSave() { const t = this.tourState(), f = await this.progressFile(); await this.app.fileManager.processFrontMatter(f, fm => { if (t.at === undefined) delete fm.tour_at; else fm.tour_at = t.at; fm.tour_done = [...t.done]; fm.tour_seen = [...(t.seen || [])]; if ((t.early || []).length) fm.tour_early = [...t.early]; else delete fm.tour_early; }); }
  // Kept for older calls: set the step showing.
  async tourSet(n) { this.tourState().at = n; await this.tourSave(); }
  // Steps already done count: things tried before the tour started, and choices already made
  // (a world picked, a moment picked, a word colored), which can't be done again the same way.
  tourCatchUp() {
    const t = this.tourState(), steps = this.tourSteps(), col = this.colors(), fm = this.progFm();
    const evs = new Set(t.early || []);
    if (this.worldNow || fm.world) evs.add('world');
    if (this.planNow || fm.plan) evs.add('plan');
    if (col.red.length + col.yellow.length + col.green.length) evs.add('up');
    if (!this.isKids && this.cards().length) evs.add('card');
    // Story lines already solved (before the tour, or on an older version) count for the story step.
    if ((col.story_at || 0) > 0) evs.add('story');
    else { try { const pre = 'gq-convo-' + this.app.vault.getName() + '-', ls = window.localStorage; for (let q = 0; q < ls.length; q++) { const k = ls.key(q); if (k && k.startsWith(pre) && +ls.getItem(k) > 0) { evs.add('story'); break; } } } catch (e) {} }
    try { const mf = this.app.vault.getAbstractFileByPath(MO_FILE), mc = mf && this.app.metadataCache.getFileCache(mf), got = mc && mc.frontmatter && mc.frontmatter.got; if (got && Object.keys(got).some(k => k.startsWith('π:'))) evs.add('story'); } catch (e) {}
    let n = 0;
    for (const st of steps) if (st.ev && evs.has(st.ev) && !t.done.includes(st.k)) { t.done.push(st.k); if (!t.seen.includes(st.k)) t.seen.push(st.k); this.moAdd('did', 'tour:' + st.k, 2); n++; }
    const had = (t.early || []).length; t.early = [];
    if (n || had) this.tourSave();
    return n;
  }
  async tourStart(n) { this.tourLive = true;
    const t = this.tourState(), steps = this.tourSteps();
    this.lsSet('tourlater', 0); this.tourMin = false;
    if (t.at === undefined) t.at = 0;
    const got = this.tourCatchUp(); if (got) new Notice(`You already did ${got} step${got === 1 ? '' : 's'} of the tour: +${got * 2} φόρα.`);
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
    else if (kind === 'card') this.tourHit('card');
  }
  tourHit(ev) {
    const t = this.tourState(), steps = this.tourSteps();
    const st = steps.find(x => x.ev === ev && !t.done.includes(x.k)); if (!st) return;
    // Before the tour has started, just remember it (no points, no change on screen). Starting the tour credits it.
    if (t.at === undefined) { if (!t.early) t.early = []; if (!t.early.includes(ev)) { t.early.push(ev); this.tourSave(); } return; }
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
  tourShow() { this.tourShow0(); this.cornerSync(); }
  tourShow0() {
    document.querySelectorAll('.gq-tour-on').forEach(x => x.removeClass('gq-tour-on'));
    const old = document.querySelector('.gq-tour'); if (old) old.remove();
    // The tour only shows after Take the tour is tapped in this session; it never opens by itself.
    const t = this.tourState(); if (!this.tourOpen() || !this.tourLive) return;
    const steps = this.tourSteps(); if (t.at >= steps.length) { t.at = 99; this.tourSave(); return; }
    if (this.tourCatchUp()) { const cur = steps[t.at]; if (cur && cur.ev && t.done.includes(cur.k)) { const nx = steps.findIndex((x, i) => i > t.at && !(x.ev && t.done.includes(x.k))); t.at = nx < 0 ? 99 : nx; this.tourSave(); if (nx < 0) { this.tourBye(); return; } } }
    const st = steps[t.at];
    // Seen: the step was shown. Its dot turns yellow (kind of) until it is tried, then green.
    if (!t.seen) t.seen = []; if (!t.seen.includes(st.k)) { t.seen.push(st.k); this.tourSave(); }
    if (st.tab) this.tabReveal(st.tab);
    const vis = el => el && (el.offsetParent !== null || el.getClientRects().length);
    let el = null; for (const k of st.at || []) { const all = [...document.querySelectorAll(`[data-tour="${k}"]`)]; el = all.find(vis) || all.find(e => e.closest('.gq-fold') || e.closest('.gq-kcard')); if (el) break; }
    { const f = el && el.closest('.gq-fold'); if (f && !f.hasClass('is-open')) this.unfold(f, true); }
    { const kc = el && el.closest('.gq-kcard'); if (kc && !kc.hasClass('is-top') && this.kidStackGo) this.kidStackGo(kc); }
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
    if (st.pick) this.friendPick(tip, st.pick === 'kids');
    if (st.plan) this.planRow(tip, true);
    if (st.ev && !done(st.k) && !st.pick) tip.createDiv({ cls: 'gq-hint', text: 'Try it to finish this step: +2 φόρα.' });
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
  // ---------- App review: an overlay tour for the teacher, opened from More or with #review on the web ----------
  reviewOn() { return this.isTeacher || !!this.lsGet('review', 0); }
  async reviewStart() { this.lsSet('review', 1); this.revAt = -1; document.querySelector('.gq-tour') && document.querySelector('.gq-tour').remove(); await this.openToday(); setTimeout(() => this.reviewShow(), 400); }
  reviewShow() {
    document.querySelectorAll('.gq-rev-on').forEach(x => x.removeClass('gq-rev-on'));
    const old = document.querySelector('.gq-rev'); if (old) old.remove();
    if (this.revAt === undefined || this.revAt === null || this.revAt >= GQ_REVIEW.length) return;
    const tier = p => p >= 90 ? 'is-g' : p >= 50 ? 'is-y' : 'is-r';
    const tip = document.body.createDiv({ cls: 'gq-rev', attr: { role: 'dialog', 'aria-label': 'App review' } });
    const top = tip.createDiv('gq-tour-top');
    const close = () => { this.revAt = null; this.reviewShow(); };
    if (this.revAt < 0) {
      const avg = Math.round(GQ_REVIEW.reduce((a, r) => a + r.p, 0) / GQ_REVIEW.length);
      top.createSpan({ cls: 'gq-tour-step', text: 'App review' });
      top.createEl('button', { cls: 'gq-tour-x', text: '×', attr: { 'aria-label': 'Close the review' } }).onclick = close;
      tip.createDiv({ cls: 'gq-rev-big ' + tier(avg), text: `${avg}%` });
      tip.createDiv({ text: 'of what the leading language apps do, across 10 areas. 100% means it matches them, and more than 100% means it goes further.' });
      const ls = tip.createDiv('gq-rev-list');
      GQ_REVIEW.forEach((r, i) => { const b = ls.createEl('button', { cls: 'gq-rev-li' }); b.createSpan({ text: r.t }); b.createSpan({ cls: 'gq-rev-pct ' + tier(r.p), text: r.p + '%' }); b.onclick = () => { this.revAt = i; this.reviewShow(); }; });
      tip.createDiv({ cls: 'gq-hint', text: 'Scores are estimates from public sources. Red: under 50% · Yellow: 50 to 89% · Green: 90% and up.' });
      const r = tip.createDiv('gq-row'); const go = r.createEl('button', { text: 'Start', cls: 'mod-cta' }); go.onclick = () => { this.revAt = 0; this.reviewShow(); };
      return;
    }
    const st = GQ_REVIEW[this.revAt];
    const vis = el => el && (el.offsetParent !== null || el.getClientRects().length);
    let el = null; for (const k of st.at) { const all = [...document.querySelectorAll(`[data-tour="${k}"]`)]; el = all.find(vis) || all.find(e => e.closest('.gq-fold')); if (el) break; }
    { const f = el && el.closest('.gq-fold'); if (f && !f.hasClass('is-open')) this.unfold(f, true); }
    if (el) { el.addClass('gq-rev-on'); if (!el.closest('#gq-nav') && !el.closest('.side-dock-ribbon')) { el.style.scrollMarginTop = '12px'; setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60); } }
    top.createSpan({ cls: 'gq-tour-step', text: `Area ${this.revAt + 1} of ${GQ_REVIEW.length}` });
    top.createEl('button', { cls: 'gq-tour-x', text: '×', attr: { 'aria-label': 'Close the review' } }).onclick = close;
    const h = tip.createDiv('gq-rev-h'); h.createDiv({ cls: 'gq-tour-t', text: st.t }); h.createDiv({ cls: 'gq-rev-pct ' + tier(st.p), text: st.p + '%' });
    const bar = tip.createDiv('gq-rev-bar'); const fill = bar.createDiv('gq-rev-fill ' + tier(st.p)); fill.style.width = Math.min(100, st.p / 1.2) + '%'; bar.createDiv('gq-rev-mark');
    const sec = (lab, txt) => { const d = tip.createDiv('gq-rev-sec'); d.createEl('strong', { text: lab + ' ' }); d.appendText(txt); return d; };
    const ld = sec('Leaders:', st.lead + ' '); st.src.forEach(([n, u], i) => { if (i) ld.appendText(', '); ld.createEl('a', { text: n, href: u, attr: { target: '_blank', rel: 'noopener' } }); });
    sec('Greekquent:', st.you);
    sec('Next move:', st.move).addClass('gq-rev-move');
    const r = tip.createDiv('gq-row');
    r.createEl('button', { text: 'Back' }).onclick = () => { this.revAt -= 1; this.reviewShow(); };
    const last = this.revAt === GQ_REVIEW.length - 1;
    r.createEl('button', { text: last ? 'Done' : 'Next', cls: 'mod-cta' }).onclick = () => { this.revAt = last ? -1 : this.revAt + 1; this.reviewShow(); };
  }
  tourBye() { this.tourEnd(); const left = this.tourLeft(); new Notice(left ? `Tour closed. ${left} step${left === 1 ? '' : 's'} still to try, any time: Class, then Take the tour.` : 'Tour done. Θα τα πούμε.'); this.refreshToday(); }
  // ---------- Tabs: Today, Words, Class, More. Words and Class appear once there is something in them. ----------
  // Words is always there: it is the course itself, and a new phone should look like every other one.
  tabOn(k) { if (k === 'words' || k === 'class') return true; const t = this.progFm().tabs; return (this.tabsNow || (Array.isArray(t) ? t : [])).includes(k); }
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
  // ---------- Class mode, behind the scenes: the first visit to Class keeps the screen awake ----------
  // No switch and nothing to turn off: it lasts until the app is closed, on this device only.
  classOn() { return !!this.classAuto; }
  async classWake(on) {
    try {
      if (on && navigator.wakeLock && document.visibilityState === 'visible') { if (!this.wakeL) { this.wakeL = await navigator.wakeLock.request('screen'); this.wakeL.addEventListener('release', () => { this.wakeL = null; }); } }
      else if (!on && this.wakeL) { await this.wakeL.release(); this.wakeL = null; }
    } catch (e) {}
  }
  classInit() {
    // The old 2-hour switch is retired; clear it so nothing lingers. A screen lock lapses in the background; take it again on return.
    if (this.lsGet('classmode', 0)) this.lsSet('classmode', 0);
    this.registerDomEvent(document, 'visibilitychange', () => { if (document.visibilityState === 'visible') this.classWake(this.classOn()); });
  }
  paintClass() { const v = this.app.workspace.getLeavesOfType(CLASSV)[0]; if (v && v.view && v.view.contentEl) this.renderClass(v.view.contentEl); }
  // This week's lesson: the script students follow in class. No class this week: the next one.
  async classLesson() {
    if (this.isKids) { const info = await this.kidsInfo(), wk = info ? this.kidWeek(info) : null; return wk ? { n: wk.lesson, f: this.kidFile(wk.lesson), prev: wk.lesson > 1 ? this.kidFile(wk.lesson - 1) : null } : null; }
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const dd = Math.floor((now - new Date(COURSE_START[0], COURSE_START[1], COURSE_START[2])) / 864e5), week = dd < 0 ? 1 : Math.floor(dd / 7) + 1;
    const wk = await this.weekNote(week); if (!wk) return null;
    const n = Number(wk.fm.lesson) || Number(((await this.weekNote(week + 1)) || { fm: {} }).fm.lesson) || 0; if (!n) return null;
    return { n, f: this.lessonPage(n), prev: n > 1 ? this.lessonPage(n - 1) : null, now: !!Number(wk.fm.lesson) };
  }
  async openScript() { const L = await this.classLesson(); if (L && L.f) this.openNote(L.f.path); else new Notice('No lesson script this week.'); }
  // Classroom Greek as big tap-to-hear cards: your side, then the teacher's side. Kids get a short built-in set.
  async classPhrases() {
    const KID = [['Δεν κατάλαβα.', "I didn't understand."], ['Ξανά, παρακαλώ.', 'Again, please.'], ['Πιο αργά, παρακαλώ.', 'Slower, please.'], ['Ένα λεπτό…', 'One moment…'], ['Δεν ξέρω.', "I don't know."], ['Πώς λέμε «…» στα ελληνικά;', 'How do you say "…" in Greek?'], ['Μπορώ να πάω τουαλέτα;', 'Can I go to the bathroom?'], ['Τελείωσα!', 'I finished.'], ['Γιαγιά! Παππού!', 'Grandma! Grandpa!'], ['Κυρία! Κύριε!', "Ma'am! Sir!"]].map(([g, e]) => ({ g, e, x: '' }));
    const f = this.app.vault.getAbstractFileByPath(EXTRAS + '11 Classroom Greek.md');
    if (!f) return [{ title: 'Staying in Greek', rows: KID }];
    const txt = await this.app.vault.cachedRead(f), out = [];
    for (const sec of txt.split(/\n## /).slice(1)) {
      const title = sec.split('\n')[0].replace(/:.*$/, '').trim(), m = sec.match(/```greekquent-say\n([\s\S]*?)```/); if (!m) continue;
      const rows = m[1].split('\n').map(l => l.split('|').map(s => s.trim())).filter(a => a[0]).map(([g, e, x]) => ({ g, e: e || '', x: x || '' }));
      if (rows.length) out.push({ title, rows });
    }
    return out.length ? out : [{ title: 'Staying in Greek', rows: KID }];
  }
  async popPhrases() {
    const secs = await this.classPhrases();
    this.pop('Classroom Greek', secs.map(s => ({ label: s.title, build: el => {
      el.addClass('gq-phr'); el.createDiv({ cls: 'gq-hint', text: 'Tap a phrase to hear it. Do the gesture as you say it.' });
      for (const p of s.rows) {
        const r = el.createEl('button', { cls: 'gq-phr-row', attr: { lang: 'el' } });
        r.createDiv({ cls: 'gq-phr-g', text: p.g }); r.createDiv({ cls: 'gq-phr-e', text: p.e + (p.x ? ' · ' + p.x : ''), attr: { lang: 'en' } });
        r.onclick = () => say(p.g.replace(/«…»/g, ''));
      }
    } })));
  }
  async openClass() { await this.tabReveal('class'); await this.openTab(CLASSV); }
  // ---------- Words: find a word, then the list like a spreadsheet you color in ----------
  async renderWords(el) {
    const st = this.wv = this.wv || { q: '', show: (() => { const c = this.colors(); return c.green.length + c.yellow.length + c.red.length + this.stars().length ? 'mine' : 'all'; })(), block: 0, cover: false };
    el.empty(); el.addClass('gq-words'); const box = el.createDiv('gq-words-in');
    const words = await this.wordIndex(); const total = words.length, BL = 100;
    const head = box.createDiv('gq-words-head');
    const q = head.createEl('input', { type: 'search', cls: 'gq-input', attr: { placeholder: 'Find a word: English or Greek', 'aria-label': 'Find a word', autocapitalize: 'off', autocomplete: 'off', spellcheck: 'false' } }); q.value = st.q;
    const seg = head.createDiv({ cls: 'gq-seg', attr: { role: 'group', 'aria-label': 'View' } });
    const bl = seg.createEl('button', { text: 'List', cls: 'is-on' });
    const bw = seg.createEl('button', { text: 'Web' }); bw.onclick = () => { const h = st.q ? this.findWords(st.q)[0] : null; this.openGraph(h ? h.path : (this.lastWebPath || '')); };
    bl.onclick = () => {};
    const sum = box.createDiv('gq-words-sum'), bar = box.createDiv({ cls: 'gq-words-bar', attr: { 'aria-hidden': 'true' } });
    const filt = box.createDiv('gq-row gq-words-filt'), qz = box.createDiv('gq-row gq-quiz-go'), list = box.createDiv('gq-words-list'), more = box.createDiv('gq-row gq-words-more');
    const count = () => {
      const c = this.colors(), g = c.green.length, y = c.yellow.length, r = c.red.length;
      sum.empty(); sum.createSpan({ cls: 'gq-g', text: `${g} green` }); sum.appendText(' · '); sum.createSpan({ cls: 'gq-y', text: `${y} yellow` }); sum.appendText(' · '); sum.createSpan({ cls: 'gq-r', text: `${r} red` }); sum.appendText(` · of ${total.toLocaleString('en-US')}`);
      bar.empty(); for (const [k, n] of [['green', g], ['yellow', y], ['red', r]]) if (n) bar.createDiv({ cls: 'gq-' + k, attr: { style: `width:${(100 * n / total).toFixed(2)}%` } });
    };
    const chip = (k, label) => { const b = filt.createEl('button', { text: label, cls: 'gq-mini' + (st.show === k ? ' is-on' : '') }); b.onclick = () => { st.show = k; st.block = 0; this.renderWords(el); }; };
    { const c = this.colors(); if (c.green.length + c.yellow.length + c.red.length + this.stars().length || st.show === 'mine') chip('mine', 'Mine'); }
    chip('all', 'All'); chip('none', 'No color'); chip('red', 'Red'); chip('yellow', 'Yellow'); chip('green', 'Green');
    if (this.stars().length || st.show === 'star') chip('star', '★ Starred');
    const cv = filt.createEl('label', { cls: 'gq-cover' }); const cb = cv.createEl('input', { type: 'checkbox' }); cb.checked = st.cover; cv.appendText(' Cover English');
    cb.onchange = () => { st.cover = cb.checked; draw(); };
    const ORDER = ['red', 'yellow', 'green'];
    const draw = () => {
      count(); list.empty(); more.empty(); qz.empty();
      const c = this.colors(), of = w => this.colorOf(w.word);
      // Quiz me: one button for the color you picked. Up to 10 of its words, in a pop.
      const stars = new Set(this.stars());
      if (c[st.show] && c[st.show].length) { const pool = words.filter(w => of(w) === st.show), n = Math.min(10, pool.length); const b = qz.createEl('button', { text: `Quiz me on these (${n})`, cls: 'mod-cta' }); b.onclick = () => this.quizMe(pool, words, st.show, () => this.renderWords(el)); }
      let rows = st.q ? this.findWords(st.q) : words;
      const close = st.q && !this.isKids ? this.closeWords(st.q) : [];
      close.forEach((cs, i) => this.closeSet(list, cs, i === 0, w => this.openGraph(w.path)));
      if (st.show === 'star') rows = rows.filter(w => stars.has(w.word));
      else if (st.show === 'mine') rows = rows.filter(w => of(w) || stars.has(w.word));
      else if (st.show !== 'all') rows = rows.filter(w => (of(w) || 'none') === st.show);
      const pages = Math.max(1, Math.ceil(rows.length / BL)); if (st.block >= pages) st.block = 0;
      const page = rows.slice(st.block * BL, st.block * BL + BL);
      if (!page.length && close.length) { /* a Greek sentence: the close words are the answer */ } else if (!page.length && !st.q) list.createDiv({ cls: 'gq-hint', text: st.show === 'star' ? 'No starred words yet. Open a word card and tap ☆ Star.' : 'No words here yet.' });
      else if (!page.length && /[*_…]/.test(st.q)) list.createDiv({ cls: 'gq-hint', text: 'No word in the 1,500 has those letters. * stands for any missing letters.' });
      // Not in the 1,500 (or only a loose match): translate right here, under the search. Saved to Words I looked up when the student moves on.
      if (st.q && !this.ltTrackQ(st.q) && !/[*_…]/.test(st.q) && !close.length && rows.length) { const tb2 = list.createDiv('gq-row gq-words-bonus').createEl('button', { text: `Not the one? Translate ${st.q}`, cls: 'gq-mini' }); tb2.onclick = () => { st.forceTr = st.q; draw(); }; }
      if (st.q && !this.ltTrackQ(st.q) && !/[*_…]/.test(st.q) && !(close.length && !rows.length) && (!rows.length || st.forceTr === st.q)) {
        const bx = list.createDiv('gq-bonus gq-words-bonus'), qq = st.q;
        bx.createDiv({ cls: 'gq-hit-sub', text: rows.length ? `Translating ${qq}...` : `Not in the 1,500. Translating ${qq}...` });
        clearTimeout(this.wvTrT); this.wvTr = null;
        this.wvTrT = setTimeout(async () => {
          const tr = await this.translate(qq); if (st.q !== qq || !bx.isConnected) return;
          bx.empty(); if (rows.length) bx.createDiv({ cls: 'gq-hit-sub', text: 'Outside the 1,500:' });
          const inList = this.bonusShow(bx, qq, tr, false, w => this.openGraph(w.path));
          this.wvTr = { q: qq, tr, inList };
          if (rows.length && page.length) bx.createDiv({ cls: 'gq-hit-sub', text: 'In the 1,500:' });
        }, 500);
      }
      if (!page.length && (close.length || st.q)) return;
      if (st.cover && page.length) list.createDiv({ cls: 'gq-hint', text: 'Say the English out loud, then tap to check. Had it or Not yet counts like any recall.' });
      const tb = list.createEl('table', { cls: 'gq-sheet' });
      const hr = tb.createEl('thead').createEl('tr'); for (const h of ['#', 'Greek', 'English', 'Color']) hr.createEl('th', { text: h });
      const body = tb.createEl('tbody');
      for (const w of page) {
        const tr = body.createEl('tr', { cls: 'gq-sheet-row' }), k = of(w);
        // A tap anywhere on the row opens the word card (the color button and Tap to check keep their own jobs).
        tr.onclick = e => { if (e.target.closest('button, .gq-sheet-c, .gq-sheet-had')) return; e.preventDefault(); this.openCard(w); };
        tr.createEl('td', { cls: 'gq-sheet-n', text: this.isKids ? '' : String(w.rank) });
        const g = tr.createEl('td', { cls: 'gq-sheet-gr', attr: { lang: 'el' } }); if (stars.has(w.word)) g.createSpan({ cls: 'gq-star-mark', text: '★ ', attr: { 'aria-label': 'starred' } }); g.createEl('a', { text: w.word, href: '#' });
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
    // The translation on screen when the student presses Enter or leaves the box is the one they meant, so it is saved (half-typed words are not).
    const keep = () => { const v = this.wvTr; if (!v || v.saved || v.q !== q.value.trim()) return; v.saved = true; this.logLookup(v.q, v.inList || null, v.tr && !v.inList ? v.tr : null); };
    q.addEventListener('blur', keep); q.addEventListener('keydown', e => { if (e.key === 'Enter') keep(); });
    draw();
    box.createDiv({ cls: 'gq-hint gq-words-foot', text: 'Red: don\'t have it. Yellow: kind of. Green: have it. A color you move up that still holds two days later earns φόρα.' });
  }
  // Quiz me (Words list): up to 10 words of one color. See it and pick the meaning, hear it and pick the Greek, say it.
  // The first answer to each word counts: right moves it up a color, a miss moves it down one. Same colors as everywhere else.
  // Same-meaning words: the 1,500 have 41 pairs with the same English (ότι and πως are both "that"). From the English alone
  // either is right, so Say it accepts both. The other one is shown after the answer only if the student has already met it
  // (it has a color): learning two new same-meaning words at once slows both (Tinkham 1993, Waring 1997, Nation 2000),
  // while linking to a word you know helps.
  sameMeaning(w, all) { return all.filter(o => o.word !== w.word && o.english === w.english); }
  alsoNote(f, w, all) { const k = this.sameMeaning(w, all).filter(o => this.colorOf(o.word)); if (!k.length) return; f.appendText(' · also '); k.forEach((o, i) => { if (i) f.appendText(', '); f.createSpan({ text: o.word, attr: { lang: 'el' } }); }); }
  quizMe(pool, all, color, done) {
    const mix = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    const qs = mix(pool).slice(0, 10), UP = { red: 'yellow', yellow: 'green', green: 'green' }, DOWN = { red: 'red', yellow: 'red', green: 'yellow' };
    const canHear = !gqQuiet() && !noSpeech(), res = new Map();
    const kinds = canHear ? ['meaning', 'listen', 'say'] : ['meaning', 'say'];
    const four = (w, key) => { const seen = new Set([w[key]]), out = [w]; for (const o of mix(all)) { if (out.length >= 4) break; if (o[key] && !seen.has(o[key])) { seen.add(o[key]); out.push(o); } } return mix(out); };
    const mark = async (w, ok) => { if (res.has(w.word)) return; res.set(w.word, ok); this.moAdd(ok ? 'recall' : 'try', w.word); const nx = (ok ? UP : DOWN)[color]; if (nx !== color) await this.setColor(w.word, nx); };
    const steps = qs.map((w, i) => ({ label: 'Quiz', build: (el, api) => {
      const kind = kinds[i % kinds.length]; el.addClass('gq-quiz');
      const fb = () => el.querySelector('.gq-quiz-fb') || el.createDiv({ cls: 'gq-quiz-fb' });
      const after = ok => { const f = fb(); f.empty(); f.addClass(ok ? 'is-ok' : 'is-miss'); f.appendText(ok ? 'Right. ' : 'Not yet. '); f.createSpan({ text: w.word, attr: { lang: 'el' } }); f.appendText(' · ' + w.english); this.alsoNote(f, w, all); if (!ok && canHear) say(w.word); setTimeout(() => { if (el.isConnected) api.next(); }, ok ? 900 : 1800); };
      if (kind === 'say') {
        el.createDiv({ cls: 'gq-hint', text: 'Say it in Greek' }); el.createDiv({ cls: 'gq-quiz-q', text: w.english });
        const r = el.createDiv('gq-row gq-quiz-say');
        const same = this.sameMeaning(w, all); this.sayIt(r, same.length ? [w.word, ...same.map(o => o.word)] : w.word, w.word, 'Say it', () => { mark(w, true); after(true); });
        const n = r.createEl('button', { text: 'Not yet', cls: 'gq-mini' }); n.onclick = () => { if (res.has(w.word)) return; mark(w, false); after(false); };
        return;
      }
      const listen = kind === 'listen', key = listen ? 'word' : 'english';
      el.createDiv({ cls: 'gq-hint', text: listen ? 'Listen, then pick the Greek' : 'Pick the meaning' });
      if (listen) { const h = el.createEl('button', { text: 'Hear it again', cls: 'gq-mini gq-quiz-hear' }); h.onclick = () => say(w.word); setTimeout(() => say(w.word), 250); }
      else { const q = el.createDiv({ cls: 'gq-quiz-q', text: w.word, attr: { lang: 'el' } }); q.onclick = () => canHear && say(w.word); }
      const box = el.createDiv('gq-quiz-opts');
      for (const o of four(w, key)) {
        const b = box.createEl('button', { text: o[key], cls: 'gq-quiz-opt', attr: listen ? { lang: 'el' } : {} });
        b.onclick = () => { if (res.has(w.word)) return; const ok = o.word === w.word; b.addClass(ok ? 'is-ok' : 'is-miss'); if (!ok) box.querySelectorAll('button').forEach(x => { if (x.textContent === w[key]) x.addClass('is-ok'); }); mark(w, ok); after(ok); };
      }
    } }));
    steps.push({ label: 'Done', build: (el, api) => {
      el.addClass('gq-quiz'); const right = [...res.values()].filter(Boolean).length, tried = res.size;
      el.createDiv({ cls: 'gq-quiz-q', text: tried ? `${right} of ${tried}` : 'No answers yet' });
      const name = { red: 'Red', yellow: 'Yellow', green: 'Green' };
      const up = color === 'green' ? 0 : right, down = color === 'red' ? 0 : tried - right;
      const t = []; if (up) t.push(`${up} moved up to ${name[UP[color]]}`); if (down) t.push(`${down} moved down to ${name[DOWN[color]]}`);
      el.createDiv({ cls: 'gq-hint', text: t.length ? t.join('. ') + '.' : (tried ? 'Your colors stay the same.' : 'Go back to answer, or close.') });
      const r = el.createDiv('gq-row'); const a = r.createEl('button', { text: 'Done', cls: tried ? '' : 'mod-cta' }); a.onclick = () => api.close();
      // Go deeper: one more round that brings these words back with more of your colors, and asks you to make the Greek.
      if (tried) { const d = r.createEl('button', { text: 'Go deeper', cls: 'mod-cta' }); d.onclick = () => { api.close(); setTimeout(() => this.quizDeep(qs, all, done), 450); }; }
    } });
    this.tourHit && this.tourHit('quiz');
    this.pop(`Quiz · ${{ red: 'Red', yellow: 'Yellow', green: 'Green' }[color]}`, steps, () => setTimeout(done, 400));
  }  // Go deeper (after Quiz me). What the research on word learning points to, kept to one round:
  // keep testing words you already got (Karpicke & Roediger 2008), one bigger mixed stack (Kornell 2009),
  // a missed word comes back a few questions later until you get it (Rawson & Dunlosky), and making the Greek
  // (say it, build it) over picking it (Teng & Xu 2025). Extra rounds in one sitting give less each time,
  // so it stops at 30 words or 15 minutes and lets the days do the rest.
  // Colors: the words from the first 10 already moved today, so here they are practice only. A new word's first answer counts.
  quizDeep(seen, all, done) {
    const mix = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    const UP = { red: 'yellow', yellow: 'green', green: 'green' }, DOWN = { red: 'red', yellow: 'red', green: 'yellow' };
    const done0 = new Set(seen.map(w => w.word)), of = w => this.colorOf(w.word);
    const more = ['red', 'yellow', 'green'].flatMap(k => mix(all.filter(w => of(w) === k && !done0.has(w.word))));
    const words = mix(seen.concat(more.slice(0, Math.max(0, 30 - seen.length))));
    const canHear = !gqQuiet() && !noSpeech(), t0 = Date.now(), LIMIT = 15 * 60 * 1000;
    const buildable = w => { const f = foldG(w.word); return /^[α-ω]{3,10}$/.test(f) ? f : null; };
    const four = (w, key) => { const s = new Set([w[key]]), out = [w]; for (const o of mix(all)) { if (out.length >= 4) break; if (o[key] && !s.has(o[key])) { s.add(o[key]); out.push(o); } } return mix(out); };
    const got = new Set(), counted = new Set(), tries = new Map(); let right1 = 0, moved = 0, prod = 0;
    const steps = [];
    const finish = (w, ok, step, api, el, note) => {
      if (step.answered) return; step.answered = true;
      const n = (tries.get(w.word) || 0) + 1; tries.set(w.word, n);
      if (n === 1 && ok) right1++;
      if (ok) { got.add(w.word); this.moAdd('recall', w.word); } else this.moAdd('try', w.word);
      if (!done0.has(w.word) && !counted.has(w.word)) { counted.add(w.word); const c = of(w); if (c) { const nx = (ok ? UP : DOWN)[c]; if (nx !== c) { this.setColor(w.word, nx); moved++; } } }
      // A miss comes back four questions on, up to three tries. Then it waits for another day.
      if (!ok && n < 3) { const at = Math.min(steps.length - 1, steps.indexOf(step) + 5); steps.splice(at, 0, make(w, n)); }
      const f = el.createDiv({ cls: 'gq-quiz-fb ' + (ok ? 'is-ok' : 'is-miss') }); f.appendText(ok ? 'Right. ' : (n < 3 ? 'Not yet. It comes back soon. ' : 'Not yet. ')); f.createSpan({ text: w.word, attr: { lang: 'el' } }); f.appendText(' · ' + w.english); this.alsoNote(f, w, all); if (note) f.appendText('.' + note);
      if (canHear) say(w.word);
      setTimeout(() => { if (el.isConnected) api.next(); }, ok && !note ? 1100 : 2200);
    };
    // Each word starts with making the Greek. A second try steps back to picking, a third goes back to making it.
    const make = (w, n) => {
      const s = { label: 'Deeper' };
      s.build = (el, api) => {
        el.addClass('gq-quiz');
        if (Date.now() - t0 > LIMIT && !s.answered) { el.createDiv({ cls: 'gq-hint', text: 'That is fifteen good minutes.' }); const b = el.createEl('button', { text: 'See how it went', cls: 'mod-cta' }); b.onclick = () => { steps.splice(steps.indexOf(s) + 1, steps.length - 2 - steps.indexOf(s)); api.next(); }; return; }
        if (s.answered) { el.createDiv({ cls: 'gq-quiz-q', text: w.word, attr: { lang: 'el' } }); el.createDiv({ cls: 'gq-hint', text: w.english }); return; }
        const f = buildable(w);
        const kind = s.kind = s.kind || (n === 1 ? (canHear && (prod % 2) ? 'listen' : 'meaning') : (f && (prod++ % 2 || !canHear) ? 'build' : 'say'));
        if (kind === 'say') {
          el.createDiv({ cls: 'gq-hint', text: 'Say it in Greek' }); el.createDiv({ cls: 'gq-quiz-q', text: w.english });
          const r = el.createDiv('gq-row gq-quiz-say');
          const same = this.sameMeaning(w, all); this.sayIt(r, same.length ? [w.word, ...same.map(o => o.word)] : w.word, w.word, 'Say it', () => finish(w, true, s, api, el));
          const nb = r.createEl('button', { text: 'Not yet', cls: 'gq-mini' }); nb.onclick = () => finish(w, false, s, api, el);
          return;
        }
        if (kind === 'build') {
          // Build it: the letters of the word, mixed up. Tap them in order. Off by one letter, or two side by side swapped, still counts.
          el.createDiv({ cls: 'gq-hint', text: 'Build it in Greek' }); el.createDiv({ cls: 'gq-quiz-q', text: w.english });
          const out = el.createDiv({ cls: 'gq-quiz-built', attr: { lang: 'el', 'aria-live': 'polite' } }), tiles = el.createDiv({ cls: 'gq-quiz-tiles', attr: { lang: 'el' } });
          let letters = mix([...f]); if (letters.join('') === f && f.length > 1) letters = letters.reverse();
          const typed = [];
          const draw = () => { out.setText(typed.map(x => x.ch).join('') || '\u00a0'); };
          const check = () => {
            const g = typed.map(x => x.ch).join(''); let ok = g === f, swap = false;
            if (!ok) for (let i = 0; i < f.length - 1; i++) if (g === f.slice(0, i) + f[i + 1] + f[i] + f.slice(i + 2)) swap = true;
            const close = !ok && (swap || near(g, f));
            tiles.querySelectorAll('button').forEach(b => b.disabled = true); und.disabled = true;
            finish(w, ok || close, s, api, el, close ? ` Close enough. It\u2019s spelled ${w.word}.` : '');
          };
          letters.forEach(ch => { const b = tiles.createEl('button', { text: ch, cls: 'gq-quiz-tile' }); b.onclick = () => { typed.push({ ch, b }); b.disabled = true; draw(); if (typed.length === f.length) check(); }; });
          const rr = el.createDiv('gq-row gq-quiz-say');
          const und = rr.createEl('button', { text: 'Undo', cls: 'gq-mini' }); und.onclick = () => { const x = typed.pop(); if (x) { x.b.disabled = false; draw(); } };
          const nb = rr.createEl('button', { text: 'Not yet', cls: 'gq-mini' }); nb.onclick = () => { tiles.querySelectorAll('button').forEach(b => b.disabled = true); und.disabled = true; finish(w, false, s, api, el); };
          draw(); return;
        }
        const listen = kind === 'listen', key = listen ? 'word' : 'english';
        el.createDiv({ cls: 'gq-hint', text: listen ? 'Listen, then pick the Greek' : 'Pick the meaning' });
        if (listen) { const h = el.createEl('button', { text: 'Hear it again', cls: 'gq-mini gq-quiz-hear' }); h.onclick = () => say(w.word); setTimeout(() => say(w.word), 250); }
        else { const q = el.createDiv({ cls: 'gq-quiz-q', text: w.word, attr: { lang: 'el' } }); q.onclick = () => canHear && say(w.word); }
        const box = el.createDiv('gq-quiz-opts');
        for (const o of four(w, key)) {
          const b = box.createEl('button', { text: o[key], cls: 'gq-quiz-opt', attr: listen ? { lang: 'el' } : {} });
          b.onclick = () => { if (s.answered) return; const ok = o.word === w.word; b.addClass(ok ? 'is-ok' : 'is-miss'); if (!ok) box.querySelectorAll('button').forEach(x => { if (x.textContent === w[key]) x.addClass('is-ok'); }); finish(w, ok, s, api, el); };
        }
      };
      return s;
    };
    for (const w of words) steps.push(make(w, 0));
    steps.push({ label: 'Done', build: (el, api) => {
      el.addClass('gq-quiz'); const tried = tries.size;
      el.createDiv({ cls: 'gq-quiz-q', text: tried ? `${got.size} of ${tried}` : 'No answers yet' });
      const t = []; if (tried) t.push(`${right1} right the first time`); const left = tried - got.size; if (left) t.push(`${left} still to come back`); if (moved) t.push(`${moved} changed color`);
      el.createDiv({ cls: 'gq-hint', text: t.length ? t.join('. ') + '.' : 'Go back to answer, or close.' });
      if (tried) el.createDiv({ cls: 'gq-hint', text: 'Stop here. These come back on another day, and that is when they stick.' });
      const r = el.createDiv('gq-row'); const a = r.createEl('button', { text: 'Done', cls: 'mod-cta' }); a.onclick = () => api.close();
    } });
    this.pop('Quiz · Deeper', steps, () => setTimeout(done, 400));
  }

  // ---------- Class: the latest lesson, practice and the teacher ----------
  // Class, calm: one card for this week, one for homework and questions, and Settings and help folded shut.
  async renderClass(el) {
    el.empty(); el.addClass('gq-classv'); const box = el.createDiv('gq-today gq-class-in');
    if (!this.classAuto) { this.classAuto = true; this.classWake(true); }
    box.createEl('h2', { text: 'Class' });
    const L = await this.classLesson(), pt = this.together();
    const c = box.createDiv('gq-tcard gq-class'), h = c.createDiv('gq-thead');
    if (!L) h.createEl('strong', { text: this.isKids ? 'This week' : 'The year is finished.' });
    else {
      h.createEl('strong', { text: (L.now === false ? 'Next class' : 'This week') + ` · Lesson ${L.n}` });
      if (L.f) c.createDiv({ cls: 'gq-hint', text: L.f.basename.replace(/-(student|teacher)$/, '').replace(/^[LIK]\d+\s*/, '') });
    }
    const r = c.createDiv('gq-row');
    if (L && L.f) { const b = r.createEl('button', { text: 'Lesson page', cls: 'mod-cta' }); b.onclick = () => { this.classSeen(); this.openNote(L.f.path); }; }
    const cg = r.createEl('button', { text: 'Classroom Greek' }); cg.onclick = () => { this.classSeen(); this.popPhrases(); };
    if (L && L.f && !this.isKids) { const pairs = this.rallyPairs(await this.app.vault.cachedRead(L.f)); if (pairs.length) { const ra = r.createEl('button', { text: 'Rally' }); ra.onclick = () => this.classSeen() && this.popRally(L.n, pairs); } }
    if (pt.when) { const t = c.createDiv('gq-row gq-together'); t.createSpan({ cls: 'gq-hint', text: `Practice together · ${pt.when}` }); if (pt.link) { const j = t.createEl('button', { text: 'Join', cls: 'gq-mini' }); j.onclick = () => window.open(pt.link, '_blank'); } }
    this.myWeekCard(box);
    const q = box.createDiv('gq-tcard'); q.createDiv({ cls: 'gq-thead' }).createEl('strong', { text: 'Homework and questions' });
    const qr = q.createDiv('gq-row');
    const hw = qr.createEl('button', { text: 'Send homework' }); hw.onclick = () => this.sendHomework();
    const t = qr.createEl('button', { text: 'Ask the class' }); t.onclick = () => this.ask(null);
    q.createDiv({ cls: 'gq-hint', text: 'Questions go to the class group, so everyone learns from the answer.' });
    this.helpCard(box);
  }
  // Settings and help: folded shut until tapped. Settings first, then help, then your work.
  helpCard(box) {
    const c = box.createDiv('gq-tcard gq-helpcard');
    const head = c.createEl('button', { cls: 'gq-helphead', attr: { 'aria-expanded': 'false' } });
    head.createEl('strong', { text: 'Settings and help' }); const ch = head.createSpan({ cls: 'gq-helpchev', text: '›' });
    const body = c.createDiv('gq-helpbody'); body.hidden = true;
    head.onclick = () => { body.hidden = !body.hidden; head.setAttr('aria-expanded', String(!body.hidden)); c.toggleClass('gq-open', !body.hidden); };
    const row = (items) => { const r = body.createDiv('gq-row'); for (const [t, fn, cta] of items) { const b = r.createEl('button', { text: t, cls: cta ? 'mod-cta' : 'gq-mini' }); b.onclick = fn; } };
    row([['Options', () => this.optionsPop(), true], ['Sound help', () => this.voiceHelp()]]);
    const help = [[this.tourLeft() ? 'Take the tour' : 'Take the tour again', () => this.tourStart()], ['Setting up', () => this.openNote(SETUP)], ["What's new", () => this.openNote(WHATS_NEW)]];
    if (this.reviewOn()) help.push(['App review', () => this.reviewStart()]);
    row(help);
    const G = window.GQW, mine = G && G.helpExtras ? G.helpExtras() : [['Update vault', () => this.updateVault(false)]];
    if (this.isTeacher && !G) mine.push(['Teacher update key', () => this.keyModal()]);
    if (mine.length) { body.createDiv({ cls: 'gq-hint', text: G ? 'Your work saves itself on this phone. Save a copy to move it to another phone.' : 'Updates download only the files that changed.' }); row(mine); }
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
    const steps = due.map((c, k) => ({ label: 'Spaced review', build: (el, api) => {
      el.createDiv({ cls: 'gq-hint', text: c.ctx.length ? 'Listen, then answer in Greek out loud. Tap Say it and the phone checks you.' : 'Say it in Greek. Tap Say it and the phone checks you.' });
      this.cbPrompt(el, c, true); if (c.ctx.length) say(c.ctx.map(x => x.g).join(' '));
      const g = el.createDiv({ cls: 'gq-pop-big gq-pop-hide', text: c.gr, attr: { lang: 'el' } });
      const r = el.createDiv('gq-row'); if (c.ctx.length) this.hearBtn(r, c.ctx.map(x => x.g).join(' '), 'Hear the line');
      const s = r.createEl('button', { text: c.ctx.length ? 'Show my answer' : 'Show Greek', cls: 'mod-cta' });
      this.thinkBeat(s, 'Say it out loud first');
      const after = k === due.length - 1 ? () => { this.markDone('cb'); api.close(); this.refreshToday(); } : api.next;
      const got = ok => { if (c.word) this.wordReviewed(c.word, ok); else if (c.gap >= 7) this.checkLog('r7', ok ? 1 : 0); };
      // Say it: when the phone hears the answer, the Greek shows and it counts as Had it, so one tap moves on.
      const sr = el.createDiv('gq-row');
      this.sayIt(sr, c.gr, 'said:cb:' + c.gr.slice(0, 80), 'Say it · +2', () => {
        g.removeClass('gq-pop-hide'); s.remove(); r.empty(); this.moAdd('recall', 'cb:' + c.gr.slice(0, 80)); got(true);
        this.hearBtn(r, c.gr, 'Hear it'); const nx = r.createEl('button', { text: k === due.length - 1 ? 'Done' : 'Next', cls: 'mod-cta' }); nx.onclick = after;
      }, this.cbOther(c));
      s.onclick = () => { g.removeClass('gq-pop-hide'); say(c.gr); s.remove(); sr.remove(); this.hearBtn(r, c.gr, 'Hear again'); this.hadIt(r, 'cb:' + c.gr.slice(0, 80), after, got); };
    } }));
    this.pop('Spaced review', steps);
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
  // One app now: no Beginner / Intermediate switch. Each lesson has a More button for its longer scene (lessonTop).
  showSwitch() { return false; }
  // The same lesson at the other length: L05 <-> I05.
  otherScene(p) {
    const m = String(p || '').match(/^Scripts\/(Beginner|Intermediate)\/([LI])(\d\d) /); if (!m) return null;
    const want = (m[2] === 'L' ? 'I' : 'L') + m[3] + ' ', dir = m[2] === 'L' ? 'Scripts/Intermediate/' : 'Scripts/Beginner/';
    const g = this.app.vault.getMarkdownFiles().find(x => x.path.startsWith(dir) && x.basename.startsWith(want) && /-student$/.test(x.basename));
    return g ? { f: g, longer: m[2] === 'L' } : null;
  }
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
    if (lesson) {
      const o = this.isTeacher ? null : this.otherScene(p);
      if (o) { const lb = row.createEl('button', { text: o.longer ? 'More: longer scene ›' : '‹ Shorter scene', cls: o.longer ? 'gq-mini mod-cta' : 'gq-mini' }); lb.onclick = async () => { const leaf = this.mainLeaf(false); await leaf.openFile(o.f, { state: { mode: 'preview' } }); }; }
      const b = row.createEl('button', { text: 'More ›', cls: 'gq-mini' }); b.onclick = () => this.showMore(); this.lessonJump(row, p);
    }
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
    head.createEl('strong', { text: f ? (f.path === TODAY ? 'Today' : f.basename.replace(/-student$/, '')) : 'Side panel' });
    const tools = c.createDiv('gq-row gq-more-tools');
    const btn = (t, fn) => { const b = tools.createEl('button', { text: t, cls: 'gq-mini' }); b.onclick = fn; };
    if (!f) c.createDiv({ cls: 'gq-hint', text: 'Open a note to see more about it here.' });
    else if (f.path === TODAY) await this.todayExtras(c, btn);
    else if (f.path.startsWith('Words/')) {
      btn('Build a sentence', () => this.openPair(f.basename));
      btn('Play Γιαγιά with this word', async () => this.openApp('giagia', '#w=' + encodeURIComponent((await this.webWords(f.path)).join(','))));
      if (GREET_W.has(f.basename)) btn('Play Τι λέμε; (hello and goodbye)', () => this.openApp('hello', ''));
      if (FRIDGE_W.has(f.basename)) btn('Play Τι βλέπεις στο ψυγείο;', () => this.openApp('fridge', ''));
      btn('Games', () => this.openNote(this.gamesNote()));
      btn('Ask the class', () => this.ask(f));
    } else {
      btn('Ask the class', () => this.ask(f));
      if (this.isStudentScript(f.path)) btn('Send homework', () => this.sendHomework());
      btn('Look up a word', () => new LookupModal(this.app, this).open());
    }
    // Every on/off switch lives behind this one button, on every page.
    btn('Options', () => this.optionsPop());
    const rules = f && f.extension === 'md' && this.sideRules(f.path);
    if (rules) {
      const parts = this.sideMap(await this.app.vault.cachedRead(f), rules).parts;
      for (const p of parts) {
        const d = c.createEl('details', { cls: 'gq-more-sec' }); d.createEl('summary', { text: p.title });
        { const mb = d.createDiv('gq-more-body markdown-rendered'); await this.renderMd(p.md, mb, f.path, view); this.bookUnits(mb, { sourcePath: f.path }); }
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
    const cr = box.createDiv({ cls: 'gq-hint gq-more-foot gq-copyright', text: COPYRIGHT + ' ' });
    const tn = [COPYRIGHT_NOTE, 'Copyright.md'].find(x => this.app.vault.getAbstractFileByPath(x));
    if (tn) { const t = cr.createEl('a', { text: 'Terms', href: '#' }); t.onclick = e => { e.preventDefault(); this.openNote(tn); }; }
  }
  // The newest lesson so far: this week's, or the last week that had class.
  async currentLesson() {
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const dd = Math.floor((now - new Date(COURSE_START[0], COURSE_START[1], COURSE_START[2])) / 864e5);
    for (let w = dd < 0 ? 1 : Math.floor(dd / 7) + 1; w >= 1; w--) { const wk = await this.weekNote(w); if (wk && +wk.fm.lesson) return +wk.fm.lesson; }
    return 1;
  }
  onunload() {
    this.unloaded = true; { const cn = document.querySelector('.gq-corner'); if (cn) cn.remove(); }
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

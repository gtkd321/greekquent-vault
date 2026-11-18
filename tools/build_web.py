#!/usr/bin/env python3
"""Build the Greekquent Beginner web app (no Obsidian, no App Store) from the published Beginner vault.

usage: python3 tools/build_web.py beginner/vault web/shell OUT

The plugin runs unchanged inside web/shell/shim.js, a small stand-in for Obsidian. Notes go into notes.json;
plugin files, games and handouts are copied as they are. version.json changes with every build, and the app
updates itself in the background when it sees a new one. Learner work lives in the browser and is never sent anywhere.
"""
import hashlib, json, os, re, shutil, sys
src, shell, out = sys.argv[1:4]
PLUG = '.obsidian/plugins/greekquent-student-layout'
if os.path.exists(out): shutil.rmtree(out)
os.makedirs(out)
notes, static = {}, []
for root, dirs, files in os.walk(src):
    dirs[:] = [d for d in dirs if not (d.startswith('.') and d != '.obsidian')]
    for f in files:
        p = os.path.relpath(os.path.join(root, f), src).replace(os.sep, '/')
        if p.startswith('.obsidian/') and not (p.startswith(PLUG + '/') or p == '.obsidian/greekquent-edition.json'): continue
        if p.endswith('.md') and not p.startswith('.'):
            notes[p] = open(os.path.join(root, f), encoding='utf-8').read()
        else:
            if p.endswith('data.json'): continue
            static.append(p)
            d = os.path.join(out, 'vault', p); os.makedirs(os.path.dirname(d), exist_ok=True); shutil.copy2(os.path.join(root, f), d)
# Web wording: the vault notes talk about Obsidian. The web app gets its own words, and the vault stays as it is.
WEBNOTES = os.path.join(os.path.dirname(os.path.abspath(shell)), 'notes')
for f in os.listdir(WEBNOTES) if os.path.isdir(WEBNOTES) else []:
    for k in [k for k in notes if k.rsplit('/', 1)[-1] == f]: notes[k] = open(os.path.join(WEBNOTES, f), encoding='utf-8').read()
NOTE_FIX = [
    ('All four games are part of the vault. They open here in Obsidian, need no internet, and update with the vault.', 'All four games are part of Greekquent. They open right here, work without internet, and update by themselves.'),
    ('(Feedly, Inoreader, or the Obsidian RSS Dashboard plugin)', '(Feedly or Inoreader)'),
    ('tap More, then Update vault', 'it arrives with the next update'), ('Tap More, then Update vault', 'It arrives with the next update'),
    ('Update vault', 'Check for updates'),
]
for k in notes:
    for a_, b_ in NOTE_FIX: notes[k] = notes[k].replace(a_, b_)
WN = [k for k in notes if k.endswith("What's New.md")]
for k in WN:
    parts = re.split(r'(?m)^(?=> \[!info\]-)', notes[k])
    keep = [x for x in parts if not x.startswith('> [!info]-') or not re.search(r'Obsidian|vault|plugin|sidebar|ribbon|left edge|three lines', x, re.I)]
    head = keep[0].rstrip() + '\n\n'
    web = """> [!info]- November 18: Greekquent on the web\n> - Greekquent now runs in the browser, on iPhone, Android and computers. Put it on your home screen from **More**.\n> - Your work stays on your phone. **More**, then **Back up my work** saves a copy.\n> - Updates arrive by themselves.\n\n"""
    notes[k] = head + web + ''.join(keep[1:])
PLUG_FIX = [
    ("'This one is still on its way. Tap More, then Update vault.'", "'This one is still on its way. It arrives with the next update.'"),
    ('The Greek is added the next time you open Obsidian online.', 'The Greek is added the next time you open Greekquent online.'),
    ("is not in this vault yet. Tap Update vault.", "is not here yet. It arrives with the next update."),
    ("'Today is not in this vault yet. Tap More, then Update vault.'", "'Today is not here yet. It arrives with the next update.'"),
    ("'This lesson is not in the vault yet. Tap More, then Update vault.'", "'This lesson is not here yet. It arrives with the next update.'"),
    ("` · vault ${rel} (${this.editionName()}) · `", "` · version ${rel} (${this.editionName()}) · `"),
    ("` · vault ${rel} · `", "` · version ${rel} · `"),
    ("`Greekquent feedback (vault of ${rel}): `", "`Greekquent feedback (web app ${rel}): `"),
]
pm = os.path.join(out, 'vault', PLUG, 'main.js'); js = open(pm, encoding='utf-8').read()
for a_, b_ in PLUG_FIX:
    if a_ not in js: print('web wording: not found:', a_[:60])
    js = js.replace(a_, b_)
open(pm, 'w', encoding='utf-8').write(js)
rel = ''
m = js
import re
mm = re.search(r"const VAULT_RELEASE = '([^']+)'", m); rel = mm.group(1) if mm else 'dev'
blob = json.dumps({'notes': notes, 'static': sorted(static)}, ensure_ascii=False, separators=(',', ':'))
h = hashlib.sha256((blob + js + ''.join(open(os.path.join(shell, x), encoding='utf-8').read() for x in ['shim.js', 'app.js', 'app.css'])).encode()).hexdigest()[:8]
ver = f'{rel}-{h}'
open(os.path.join(out, 'notes.json'), 'w', encoding='utf-8').write(blob)
json.dump({'version': ver}, open(os.path.join(out, 'version.json'), 'w'))
os.makedirs(os.path.join(out, 'lib'))
for f in os.listdir(shell):
    s = os.path.join(shell, f)
    if f in ('js-yaml.min.js', 'marked.umd.js'): shutil.copy2(s, os.path.join(out, 'lib', f)); continue
    if f == 'index.html': open(os.path.join(out, f), 'w', encoding='utf-8').write(open(s, encoding='utf-8').read().replace('__V__', ver)); continue
    if f == 'sw.js': open(os.path.join(out, f), 'w', encoding='utf-8').write(open(s, encoding='utf-8').read().replace("greekquent-beginner-v1", 'greekquent-beginner-' + ver)); continue
    shutil.copy2(s, os.path.join(out, f))
print(len(notes), 'notes,', len(static), 'files, version', ver)

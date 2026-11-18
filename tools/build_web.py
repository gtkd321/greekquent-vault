#!/usr/bin/env python3
"""Build the Greekquent Beginner web app (no Obsidian, no App Store) from the published Beginner vault.

usage: python3 tools/build_web.py beginner/vault web/shell OUT

The plugin runs unchanged inside web/shell/shim.js, a small stand-in for Obsidian. Notes go into notes.json;
plugin files, games and handouts are copied as they are. version.json changes with every build, and the app
updates itself in the background when it sees a new one. Learner work lives in the browser and is never sent anywhere.
"""
import hashlib, json, os, shutil, sys
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
rel = ''
m = open(os.path.join(src, PLUG, 'main.js'), encoding='utf-8').read()
import re
mm = re.search(r"const VAULT_RELEASE = '([^']+)'", m); rel = mm.group(1) if mm else 'dev'
blob = json.dumps({'notes': notes, 'static': sorted(static)}, ensure_ascii=False, separators=(',', ':'))
h = hashlib.sha256((blob + ''.join(open(os.path.join(shell, x), encoding='utf-8').read() for x in ['shim.js', 'app.js', 'app.css'])).encode()).hexdigest()[:8]
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

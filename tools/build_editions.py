#!/usr/bin/env python3
"""Build the two student editions from master/ (the one copy you edit).
Usage: build_editions.py <master folder> <intermediate out> <beginner out>
Intermediate: Beginner and Intermediate scripts, with a switch between them. Published at the repo root (vault/, manifest.json).
Beginner: the one student app (web). Same pages as Intermediate; each lesson has a More button for its longer scene. Published in beginner/.
Neither has kid material; the Greekquent Kids vault is built from master/ by build_kids.py."""
import sys, os, re, shutil, json
src, out_i, out_b = sys.argv[1:4]
SKIP_DIRS = ('Scripts/Kid',)
def copy(out):
    if os.path.exists(out): shutil.rmtree(out)
    shutil.copytree(src, out, ignore=lambda d, n: [x for x in n if os.path.relpath(os.path.join(d, x), src).replace(os.sep, '/') in SKIP_DIRS])
    for x in ('greekquent-teacher.json', 'greekquent-kids.json', 'greekquent-edition.json'):
        p = os.path.join(out, '.obsidian', x)
        if os.path.exists(p): os.remove(p)
def edit(out, fn):
    for d, _, fs in os.walk(out):
        if '/.obsidian' in d: continue
        for f in fs:
            if not f.endswith('.md'): continue
            p = os.path.join(d, f); rel = os.path.relpath(p, out).replace(os.sep, '/'); t = open(p, encoding='utf-8').read()
            u = fn(rel, t)
            if u != t: open(p, 'w', encoding='utf-8').write(u)
def drop_col(t, name):
    # Remove one column (by header name) from every markdown table that has it.
    lines, out, idx = t.split('\n'), [], None
    for L in lines:
        if L.startswith('|'):
            cells = re.split(r'(?<!\\)\|', L)
            if idx is None and name in [c.strip() for c in cells]: idx = [c.strip() for c in cells].index(name)
            if idx is not None and len(cells) > idx: del cells[idx]
            L = '|'.join(cells)
        else: idx = None
        out.append(L)
    return '\n'.join(out)
def no_kid(rel, t):
    t = re.sub(r'\n- Kid lessons: [^\n]*', '', t)
    t = re.sub(r' · \[\[K\d\d [^\]]*\|Kid page\]\]', '', t)
    if rel == 'Scripts/01 Lesson Scripts.md':
        t = drop_col(t, 'Kid')
        t = t.replace(' **Kid** is the same language through toys and games (adults enjoy them too).', '')
    return t
def callout_out(t, title_start):
    return re.sub(r'\n> \[![a-z]+\]-? ?' + re.escape(title_start) + r'[^\n]*(\n>[^\n]*)*\n?', '\n', t)
def one_app(rel, t):
    # One student app: every lesson page has a More button for its longer scene (the plugin draws it), so the
    # "Want more?" line goes, and the lesson list shows the longer scene as a column, not a separate track.
    t = no_kid(rel, t)
    t = re.sub(r'\nWant more\? \[\[I\d\d [^\]]*\|Intermediate scene\]\]\n', '\n', t)
    t = re.sub(r'\[\[I\d\d [^\]]*\|Intermediate scene\]\] · ', '', t)
    if rel == 'Scripts/01 Lesson Scripts.md':
        t = drop_col(t, 'Beginner')
        t = t.replace('| Intermediate |', '| Longer scene |', 1)
        t = t.replace(' **Intermediate** is a longer scene on the same theme.', ' **Longer scene** is the same lesson with more Greek; the More button on each lesson opens it.')
    return t
copy(out_i); edit(out_i, one_app)
copy(out_b); edit(out_b, one_app)
json.dump({'edition': 'beginner'}, open(os.path.join(out_b, '.obsidian', 'greekquent-edition.json'), 'w'))
for o in (out_i, out_b):
    left = []
    for d, _, fs in os.walk(o):
        for f in fs:
            if f.endswith('.md'):
                t = open(os.path.join(d, f), encoding='utf-8').read()
                if re.search(r'\[\[K\d\d ', t): left.append(os.path.relpath(os.path.join(d, f), o))
    print(o, 'left-over links:', left[:5], len(left))
# Beginner's What's New leaves out the Beginner/Intermediate switch line.
wn = os.path.join(out_b, 'Extras', "What's New.md")
if os.path.exists(wn):
    t = open(wn, encoding='utf-8').read()
    t = re.sub(r"\n> - \*\*Beginner and Intermediate:\*\* this copy has both sets of scripts[^\n]*", '', t)
    t = re.sub(r"\n> - The download is now called \*\*Greekquent Intermediate\*\*[^\n]*", '', t)
    t = re.sub(r"\n> - The \*\*Beginner / Intermediate\*\* switch[^\n]*", '', t)
    t = re.sub(r"\n> - Obsidian shows your vault's folder name[^\n]*", '', t)
    t = t.replace('(Greekquent Intermediate or Greekquent Beginner)', '(Greekquent Beginner)')
    open(wn, 'w', encoding='utf-8').write(t)

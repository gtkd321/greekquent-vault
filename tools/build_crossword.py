"""Build the crossword game: tools/crossword.src.html + tools/crossword_clues.tsv -> apps/crossword.html.

Clues are hand-written, newspaper style, one per word (Greek word, tab, clue). The meaning comes from the
Fluent in a Year week notes, so the clue file only holds the clue. Add a line to the TSV to add a word.
Run: python3 tools/build_crossword.py
"""
import glob, json, os, re
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
M = os.path.join(ROOT, 'master')
en = {}
for f in sorted(glob.glob(os.path.join(M, 'Fluent in a Year', 'FY*.md'))):
    for w, e in re.findall(r'^> - \[\[([^\]|]+)(?:\|[^\]]+)?\]\] \*\*([^*]+)\*\*', open(f, encoding='utf-8').read(), re.M):
        en.setdefault(w.strip(), e.strip())
bank, missing = [], []
for line in open(os.path.join(ROOT, 'tools', 'crossword_clues.tsv'), encoding='utf-8'):
    if not line.strip(): continue
    g, clue = line.rstrip('\n').split('\t')
    if g not in en: missing.append(g); continue
    bank.append([g, en[g], clue])
if missing: raise SystemExit('No meaning found for: ' + ', '.join(missing))
src = open(os.path.join(ROOT, 'tools', 'crossword.src.html'), encoding='utf-8').read()
out = src.replace('/*BANK*/[]', json.dumps(bank, ensure_ascii=False))
open(os.path.join(M, '.obsidian', 'plugins', 'greekquent-student-layout', 'apps', 'crossword.html'), 'w', encoding='utf-8').write(out)
print(len(bank), 'clues')

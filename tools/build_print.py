#!/usr/bin/env python3
"""Build the Greekquent Print page: python3 tools/build_print.py <master vault> <out dir>

Everything students print or download lives here, outside the app, so the app and the
Obsidian sidebar stay short. Sources: web/print/files (PDFs, Anki decks), web/print/src/workbook.md
and the vault's Extras/Word lists (the 1,500 words, printed with a box to mark in color)."""
import os, re, sys, shutil, subprocess, html

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, '..', 'web', 'print')
master, out = sys.argv[1], sys.argv[2]
if os.path.exists(out): shutil.rmtree(out)
os.makedirs(out)
shutil.copytree(os.path.join(SRC, 'files'), os.path.join(out, 'files'))

FOOT = ('<footer>Questions? Text the teacher at <a href="sms:+18033990665">+1 803 399 0665</a>.<br>'
        '© 2026 Daniel Ilias Houlis. All rights reserved. Greekquent™ and Frequent™ are trademarks of Daniel Ilias Houlis.</footer>')
CSS = open(os.path.join(SRC, 'print.css'), encoding='utf-8').read()

def page(title, body, cls=''):
    return f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{title}</title>
<link rel="icon" href="../icon.svg" type="image/svg+xml">
<style>{CSS}</style>
</head>
<body class="{cls}">
<main>
{body}
{FOOT}
</main>
</body>
</html>
'''

def size(f):
    n = os.path.getsize(os.path.join(out, 'files', f))
    return f'{n // 1024} KB' if n < 1024 * 1024 else f'{n / 1024 / 1024:.1f} MB'

# ---------- the 1,500 words, with a box to mark ----------
rows = []
wl = os.path.join(master, 'Extras', 'Word lists')
for fn in sorted(os.listdir(wl)):
    for line in open(os.path.join(wl, fn), encoding='utf-8'):
        line = re.sub(r'\[\[([^\]]*?)\\\|([^\]]*)\]\]', r'\2', line)
        m = re.match(r'\|\s*(\d+)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*$', line)
        if not m: continue
        n, g, say, en = m.groups()
        g = re.sub(r'\[\[(?:[^\]|]*\|)?([^\]]*)\]\]', r'\1', g)
        rows.append((int(n), g, say, en))
assert len(rows) == 1500, len(rows)
parts = []
for i in range(0, 1500, 150):
    chunk = rows[i:i + 150]
    li = ''.join(f'<div class="w"><span class="box"></span><span class="n">{n}</span> <b lang="el">{html.escape(g)}</b> <span class="say">{html.escape(sy)}</span> <span class="en">{html.escape(e)}</span></div>' for n, g, sy, e in chunk)
    parts.append(f'<section class="wl"><h2>Words {chunk[0][0]:04d}–{chunk[-1][0]:04d}</h2><div class="cols">{li}</div></section>')
words = f'''<p class="back no-print"><a href="./">← Print and download</a></p>
<h1>The 1,500 words</h1>
<p class="lead">Mark each new word in black. At each review, mark it again: <b class="r">red</b> don't have it, <b class="y">yellow</b> kind of, <b class="g">green</b> have it.</p>
<p class="no-print"><button onclick="print()">Print</button> <span class="hint">About 18 pages, two columns. To print fewer, choose a page range in the print window.</span></p>
{''.join(parts)}'''
open(os.path.join(out, 'words.html'), 'w', encoding='utf-8').write(page('Greekquent · The 1,500 words', words, 'doc'))

# ---------- the workbook ----------
md = open(os.path.join(SRC, 'src', 'workbook.md'), encoding='utf-8').read()
md = re.sub(r'\[\[(?:[^\]|]*\|)?([^\]]*)\]\]', r'\1', md)
wb = subprocess.run(['pandoc', '-f', 'gfm', '-t', 'html'], input=md, capture_output=True, text=True, check=True).stdout
bits = re.split(r'(?=<h2 id="lesson)', wb)
wb = bits[0] + ''.join(f'<section class="lesson">{b}<p class="no-print"><button class="one" onclick="one(this)">Print this lesson</button></p></section>' for b in bits[1:])
wb += '<script>function one(b){const s=b.closest("section");document.body.classList.add("only");s.classList.add("pick");print();setTimeout(()=>{document.body.classList.remove("only");s.classList.remove("pick")},500)}</script>'
wb = f'''<p class="back no-print"><a href="./">← Print and download</a></p>
<p class="no-print"><button onclick="print()">Print</button> <span class="hint">The whole year, each lesson on a new page. To print one lesson, use the button under it.</span></p>
<article class="wb" lang="en">{wb}</article>'''
open(os.path.join(out, 'workbook.html'), 'w', encoding='utf-8').write(page('Greekquent · Year One Workbook', wb, 'doc'))

# ---------- the main page ----------
def item(title, what, href, label, f=None, alt=None):
    meta = f' <span class="sz">{size(f)}</span>' if f else ''
    more = ''.join(f'<a class="alt" href="{h}"{" download" if d else ""}>{t}</a>' for t, h, d in (alt or []))
    dl = ' download' if f and f.endswith('.csv') else ''
    return f'<li><div class="it"><h3>{title}{meta}</h3><p>{what}</p></div><div class="go"><a href="{href}"{dl}>{label}</a>{more}</div></li>'

body = f'''<div class="bar" aria-hidden="true"><i style="background:var(--red)"></i><i style="background:var(--yellow)"></i><i style="background:var(--green)"></i></div>
<h1>Print and download</h1>
<p class="lead">Greekquent's paper side: books, sheets and flashcards. Everything here is free. Your daily practice stays in the app.</p>

<section class="app">
  <p class="k">Print</p>
  <ul>
    {item('The 1,500 words', 'All the words in order, with a box to mark black, red, yellow or green.', 'words.html', 'Open and print')}
    {item('Verb Sheet', 'The core verbs on one fold-out sheet.', 'files/greekquent-verb-sheet.pdf', 'Open PDF', 'greekquent-verb-sheet.pdf')}
    {item('Sentence Tiles', 'Print on card stock and cut out. Build sentences at the table.', 'files/greekquent-sentence-tiles.pdf', 'Open PDF', 'greekquent-sentence-tiles.pdf')}
    {item('Year One Workbook', 'One page per lesson: phrases with gestures, review prompts, the scene and homework.', 'workbook.html', 'Open and print')}
  </ul>
</section>

<section class="app">
  <p class="k">Textbook</p>
  <ul>
    {item('Print edition', 'Black and white, with a weekly word planner after each lesson. The one to print.', 'files/greekquent-textbook-print.pdf', 'Open PDF', 'greekquent-textbook-print.pdf')}
    {item('Screen edition', 'The same 26 lessons in color, for a phone or tablet.', 'files/greekquent-textbook-screen.pdf', 'Open PDF', 'greekquent-textbook-screen.pdf')}
  </ul>
</section>

<section class="app">
  <p class="k">Flashcards</p>
  <ul>
    {item('Year One deck', 'The class words, tagged by lesson.', 'files/greekquent-year-one-anki.csv', 'Download', 'greekquent-year-one-anki.csv')}
    {item('Fluent in a Year deck', 'All 1,500 words with an example each.', 'files/greekquent-fluent-in-a-year-anki.csv', 'Download', 'greekquent-fluent-in-a-year-anki.csv')}
  </ul>
  <details><summary>How to use the decks</summary>
  <p>The decks are for Anki, a free flashcard app. On Android, open the file in AnkiDroid with Import. On a computer, open it in Anki with File, Import; the columns are already set. On iPhone, import it on a computer, sync, then study for free at ankiweb.net in the browser. Say the answer out loud before you flip the card.</p></details>
</section>

<p class="back"><a href="../">← Beginner app</a> · <a href="../intermediate/">Intermediate app</a></p>'''
open(os.path.join(out, 'index.html'), 'w', encoding='utf-8').write(page('Greekquent · Print and download', body))
print('print page:', len(os.listdir(os.path.join(out, 'files'))), 'files, 1500 words')

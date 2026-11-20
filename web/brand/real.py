from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen
import random, math, sys
F=TTFont('/usr/share/fonts/truetype/noto/NotoSerif-Bold.ttf'); gs=F.getGlyphSet(); cmap=F.getBestCmap(); upm=F['head'].unitsPerEm
def word(t,cx,cy,size,fill,rot=0):
  adv=0; parts=[]
  for ch in t:
    g=cmap[ord(ch)]; parts.append((g,adv)); adv+=gs[g].width
  bp=BoundsPen(gs)
  for g,x in parts: gs[g].draw(TransformPen(bp,(1,0,0,1,x,0)))
  x0,y0,x1,y1=bp.bounds; s=size/upm; sp=SVGPathPen(gs)
  for g,x in parts: gs[g].draw(TransformPen(sp,(s,0,0,-s,cx-(x0+x1)/2*s+x*s,cy+(y0+y1)/2*s)))
  return f'<path transform="rotate({rot*.5} {cx} {cy})" d="{sp.getCommands()}" fill="{fill}"/>'
def olive(w,cx,cy,s,rot):
  rx,ry=56*s,72*s; fs={'η':72,'ο':72,'το':60,'και':46}[w]*s; hx,hy=cx-rx*.55,cy-ry*.5
  return (f'<g transform="rotate({rot} {cx} {cy})"><path d="M{cx} {cy-ry+4} q-6 -26 8 -44" stroke="#4f6127" stroke-width="7" fill="none" stroke-linecap="round"/>'
   f'<ellipse cx="{cx}" cy="{cy+7}" rx="{rx}" ry="{ry}" fill="#10141f" fill-opacity=".3"/><ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="#3a2e45"/>'
   f'<ellipse cx="{hx}" cy="{hy}" rx="{rx*.14}" ry="{ry*.1}" fill="#fff" fill-opacity=".3" transform="rotate(-35 {hx} {hy})"/></g>'+word(w,cx,cy+2,fs,'#fbf6ea',rot))
def bez(p0,p1,p2,t): return tuple((1-t)**2*a+2*(1-t)*t*b+t*t*c for a,b,c in zip(p0,p1,p2))
OL=[('η',566,262,.86,14),('ο',360,420,.9,-16),('το',690,436,.92,10),('και',515,548,.94,-4)]
def tree(seed=4, bg=True):
  random.seed(seed); o=[]
  if bg: o.append('<defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3d93f2"/><stop offset="1" stop-color="#1a4fae"/></linearGradient></defs><rect width="1024" height="1024" rx="230" fill="url(#bg)"/>' if bg!='cream' else '<defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fbf8f1"/><stop offset="1" stop-color="#efe7d6"/></linearGradient></defs><rect width="1024" height="1024" rx="230" fill="url(#bg)"/>')
  o.append(f'<ellipse cx="512" cy="872" rx="230" ry="26" fill="{"#0b2a66" if bg is True else "#b59d70"}" fill-opacity="{.35 if bg is True else .4}"/>')
  # gnarled trunk: twisted, with a hollow-ish split
  o.append('<path d="M430 876 C452 830 470 790 462 740 C456 700 436 676 404 640 L430 620 C462 650 488 676 500 712 C506 676 528 648 566 616 L590 640 C556 676 540 710 546 752 C552 800 572 840 600 876 Z" fill="#7d5a3a"/>')
  o.append('<path d="M482 870 C492 820 496 770 488 730" stroke="#5e4229" stroke-width="12" fill="none" stroke-linecap="round"/><path d="M540 870 C530 830 528 790 534 750" stroke="#9c7650" stroke-width="8" fill="none" stroke-linecap="round"/>')
  # branches: (start, control, end, width)
  B=[((420,632),(350,560),(268,470),20),((440,640),(420,520),(370,330),18),((500,700),(500,520),(520,230),20),((572,628),(620,500),(660,310),18),((580,636),(680,580),(770,470),18),((380,540),(320,450),(300,360),10),((630,440),(720,380),(760,330),10),((515,420),(580,330),(610,220),10),((410,420),(440,330),(430,250),9),((300,470),(250,430),(230,400),7),((700,470),(760,440),(800,410),7),((560,300),(620,250),(680,240),7),((470,330),(420,260),(360,230),7),((640,560),(700,540),(740,520),7),((390,580),(330,560),(280,540),7)]
  for p0,p1,p2,w in B:
    o.append(f'<path d="M{p0[0]} {p0[1]} Q{p1[0]} {p1[1]} {p2[0]} {p2[1]}" stroke="#7d5a3a" stroke-width="{w}" fill="none" stroke-linecap="round"/>')
  # leaf sprays: narrow willow-like olive leaves in pairs along each branch, darker top / silvery underside
  back=[]; front=[]
  for p0,p1,p2,w in B:
    n=int(math.dist(p0,p2)/11)
    for i in range(n):
      t=.25+.75*i/max(1,n-1)
      x,y=bez(p0,p1,p2,t); x2,y2=bez(p0,p1,p2,min(1,t+.02)); a=math.degrees(math.atan2(y2-y,x2-x))
      for side in (-1,1):
        if random.random()<.1: continue
        ang=a+side*random.uniform(30,65); L=random.uniform(50,74); W=random.uniform(6,8.5)
        col=random.choice(['#5f7f3c','#6e8d45','#87a35a','#b8c9a0','#c9d6b4'])
        lf=f'<path transform="translate({x+random.uniform(-4,4):.0f} {y+random.uniform(-4,4):.0f}) rotate({ang:.0f})" d="M0 0 C{L*.25:.0f} {-W:.1f} {L*.7:.0f} {-W:.1f} {L:.0f} 0 C{L*.7:.0f} {W*.8:.1f} {L*.25:.0f} {W*.8:.1f} 0 0z" fill="{col}"/>'
        over=any(((x-ox)/(70*os))**2+((y-oy)/(86*os))**2<1.6 for _,ox,oy,os,_r in OL)
        (front if (random.random()<.3 and not over) else back).append(lf)
  o.append(''.join(back))
  for ol in OL: o.append(olive(*ol))
  o.append(''.join(front))
  if bg:
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><title>Greekquent</title>{o[0]}<g transform="translate(512 520) scale(1.2) translate(-512 -540)">{"".join(o[1:])}</g></svg>'
  return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="190 170 650 730"><title>Greekquent</title>{"".join(o)}</svg>'
open('real-icon.svg','w').write(tree())
open('cream-icon.svg','w').write(tree(bg='cream'))
open('real-mark.svg','w').write(tree(bg=False))

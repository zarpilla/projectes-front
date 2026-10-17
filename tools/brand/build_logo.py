# usage: python build_logo.py <Nunito[wght].ttf> <outdir>   (see README.md)
# The ESSTRAPIS logo in Nunito Black: «ESS» in a rounded box with a speech-bubble tail,
# «TRAPIS» beside it in currentColor. Proportions of the generous version.
import sys, json
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen
import uharfbuzz as hb

font_path, out = sys.argv[1], sys.argv[2]
font = instantiateVariableFont(TTFont(font_path), {'wght': 900})
font.save(out + '/Nunito-Black.ttf')
upm = font['head'].unitsPerEm
cap = font['OS/2'].sCapHeight
gs = font.getGlyphSet()
blob = hb.Blob.from_file_path(out + '/Nunito-Black.ttf')
hbfont = hb.Font(hb.Face(blob))

def shape(text, tracking=0):
    buf = hb.Buffer(); buf.add_str(text); buf.guess_segment_properties()
    hb.shape(hbfont, buf, {'kern': True})
    names = font.getGlyphOrder()
    x, items = 0, []
    for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
        items.append((names[info.codepoint], x + pos.x_offset)); x += pos.x_advance + tracking
    return items, x - tracking

def path(items, dx, baseline):
    pen = SVGPathPen(gs, ntos=lambda v: str(round(v)))
    for name, x in items:
        gs[name].draw(TransformPen(pen, (1, 0, 0, -1, dx + x, baseline)))
    return pen.getCommands()

def bounds(items):
    b = BoundsPen(gs); xs = []
    for name, x in items:
        p = BoundsPen(gs); gs[name].draw(p)
        if p.bounds: xs += [x + p.bounds[0], x + p.bounds[2]]
    return min(xs), max(xs)

TRACK = -14  # a little tighter, as in the preview
ess, _ = shape('ESS', TRACK)
trapis, _ = shape('TRAPIS', TRACK)
H = cap
PADX, PADY, GAP = 34 / 77.38 * H, 22 / 77.38 * H, 12.47 / 77.38 * H
e0, e1 = bounds(ess)
t0, t1 = bounds(trapis)
# box around the ESS caps; origin at the box's top-left
rw, rh = (e1 - e0) + 2 * PADX, H + 2 * PADY
rx = 14.31 / 98.09 * rh
baseline = PADY + H
ess_d = path(ess, PADX - e0, baseline)
s = rh / 98.09
right, bottom = rw, rh
tail = f'M{right + 15.89 * s:.1f} {bottom:.1f}L{right - 28.21 * s:.1f} {bottom:.1f}L{right - 6.21 * s:.1f} {bottom - 38.2 * s:.1f}Z'
tr_x = right + GAP - t0
trapis_d = path(trapis, tr_x, baseline)
full_w = tr_x + t1
mark_w = right + 15.89 * s
BOX = '#0B7A6C'

def svg(w, body, title):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.1f} {rh:.1f}" role="img" aria-label="{title}"><title>{title}</title>{body}</svg>\n'

box = f'<rect width="{rw:.1f}" height="{rh:.1f}" rx="{rx:.1f}" fill="{BOX}"/><path d="{tail}" fill="{BOX}"/><path d="{ess_d}" fill="#fff"/>'
open(out + '/esstrapis-logo.svg', 'w').write(svg(full_w, box + f'<path d="{trapis_d}" fill="currentColor"/>', 'ESSTRAPIS'))
open(out + '/esstrapis-mark.svg', 'w').write(svg(mark_w, box, 'ESSTRAPIS'))
json.dump({'viewBoxFull': [round(full_w, 1), round(rh, 1)], 'viewBoxMark': [round(mark_w, 1), round(rh, 1)],
           'rect': {'width': round(rw, 1), 'height': round(rh, 1), 'rx': round(rx, 1)}, 'tail': tail, 'ess': ess_d, 'trapis': trapis_d, 'color': BOX},
          open(out + '/logo.json', 'w'))
print('upm', upm, 'cap', cap, 'box', round(rw), 'x', round(rh), 'full width', round(full_w), 'path chars', len(ess_d) + len(trapis_d))

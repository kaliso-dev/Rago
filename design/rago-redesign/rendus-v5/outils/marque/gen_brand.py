# Section F : kit logo v5 (22/11 au soir : R rouge partout, icône de l'app rouge sur tuile blanche ; tuiles, lockups, PNG, favicons, .ico). Texte vectorisé en Barlow Condensed
# (HarfBuzz pour l'approche et le crénage), donc les SVG s'affichent sans la police.
import sys, shutil, subprocess, json
from pathlib import Path
HERE = Path(__file__).parent
sys.path.insert(0, str(HERE.parent / 'perso'))
import rmark as M
import uharfbuzz as hb
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen

OUT = Path('/mnt/project-files/rago-redesign/rendus-v5/marque/logo')
FONT = HERE.parent / 'fonts' / 'bc-900i.ttf'
TT = TTFont(FONT)
GS = TT.getGlyphSet()
HBF = hb.Font(hb.Face(hb.Blob.from_file_path(str(FONT))))
UPM = TT['head'].unitsPerEm
CAP = TT['OS/2'].sCapHeight / UPM          # 0,70
INK, PAPER, RED, GREY, GREY_INK = '#F5F5F6', M.PAPER, M.RED, '#8E8E98', '#6B6B74'


def text(s, size, x, base, colors, track=0.0):
    """Chemins SVG d'un texte. colors : liste de (index du premier caractère, couleur). Renvoie (svg, x fin, bornes)."""
    buf = hb.Buffer(); buf.add_str(s); buf.guess_segment_properties()
    hb.shape(HBF, buf, {'kern': True, 'liga': True})
    k = size / UPM
    parts, bb = {}, [1e9, 1e9, -1e9, -1e9]
    for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
        g = TT.getGlyphName(info.codepoint)
        col = [c for i, c in colors if info.cluster >= i][-1]
        t = (k, 0, 0, -k, x + pos.x_offset * k, base - pos.y_offset * k)
        pen = SVGPathPen(GS); GS[g].draw(TransformPen(pen, t))
        bp = BoundsPen(GS); GS[g].draw(TransformPen(bp, t))
        if bp.bounds:
            b = bp.bounds; bb = [min(bb[0], b[0]), min(bb[1], b[1]), max(bb[2], b[2]), max(bb[3], b[3])]
        parts[col] = parts.get(col, '') + pen.getCommands()
        x += pos.x_advance * k + track * size
    return ''.join(f'<path fill="{c}" d="{d}"/>' for c, d in parts.items()), x, bb


def tile(x, y, size, variant='light'):
    """L'icône d'app (tuile 256) posée dans un autre SVG."""
    inner = M.app_icon(variant, 256).split('>', 1)[1].rsplit('</svg>', 1)[0]
    return f'<svg x="{x}" y="{y}" width="{size}" height="{size}" viewBox="0 0 256 256">{inner}</svg>'


def svg(w, h, body, pad=0):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{-pad:g} {-pad:g} {w + 2 * pad:.2f} {h + 2 * pad:.2f}" '
            f'width="{w + 2 * pad:.0f}" height="{h + 2 * pad:.0f}">{body}</svg>\n')


# ---------- symbole R ----------
def r_flat(fill):
    return svg(164, 180, f'<path fill="{fill}" d="{M.R}"/>')


def r_printed(face=PAPER, back=RED):
    """R imprimé seul (fond transparent) : face, couche décalée de 9 / 11 dessous, bords rugueux."""
    return svg(173, 191, f'<defs>{M.mark_defs("m")}</defs>' + M.mark(face, back, 9, 11, 'm'), pad=4)


# ---------- lockups ----------
def lockup_app(ink=INK, r=RED):
    """Barre latérale de l'app : le R rouge sert de première lettre (R + AGO). Hauteur du R = hauteur des capitales,
    même ligne de base, 1 px d'écart pour 22 px, interlettrage .005em (rago5.css .side .logo)."""
    F = 180 / CAP
    g, x1, bb = text('AGO', F, 164 + 180 / 22, 180, [(0, ink)], .005)
    return svg(bb[2], 180, f'<path fill="{r}" d="{M.R}"/>{g}')


def lockup_tile(words, t=256, font=226, gap=75, ink=INK, grey=GREY, variant='light'):
    """Tuile + texte, capitales centrées sur la tuile. Proportions du site (34 / 30 / 10) ou de l'en-tête e-mail (58 / 42 / 16)."""
    base = t / 2 + CAP * font / 2
    cols = [(0, ink)] + ([(words.index(' ') + 1, grey)] if ' ' in words else [])
    g, x1, bb = text(words, font, t + gap, base, cols)
    return svg(bb[2], t, tile(0, 0, t, variant) + g)


def wordmark_mono(fill):
    """Une seule couleur : tuile pleine, R en réserve (transparent), texte plein."""
    t, font, gap = 256, 185.4, 70.6
    base = t / 2 + CAP * font / 2
    g, x1, bb = text('RAGO OPTIMIZER', font, t + gap, base, [(0, fill)])
    s, w, h = 0.80, 164 * .8, 180 * .8
    m = (f'<defs><mask id="k"><rect width="256" height="256" fill="#fff"/>'
         f'<path fill="#000" transform="translate({(256 - w) / 2:.2f} {(256 - h) / 2:.2f}) scale({s})" d="{M.R}"/></mask></defs>')
    return svg(bb[2], t, m + f'<rect width="256" height="256" rx="56" fill="{fill}" mask="url(#k)"/>' + g)


def full_tile(px=512):
    """Tuile pleine sans arrondi : avatar Discord / réseaux (rognés en rond) et icône Apple (iOS arrondit lui-même). R rouge sur blanc."""
    sc = 0.80; w, h = 164 * sc, 180 * sc
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="{px}" height="{px}"><rect width="256" height="256" fill="#FFFFFF"/>'
            f'<path d="{M.R}" fill="{RED}" transform="translate({(256 - w) / 2:.2f} {(256 - h) / 2:.2f}) scale({sc})"/></svg>')


FILES = {
    # noms repris de brand/logo/ pour un remplacement fichier par fichier
    # 22/11 au soir : le R est rouge partout, l'icône de l'app est rouge sur blanc.
    # Retirés (dans abandonnes/) : R blanc, R noir, R imprimé, tuile rouge, wordmark une couleur.
    'rago-mark.svg': r_flat(RED),
    'rago-app-icon.svg': M.app_icon('light', 256),
    'rago-app-icon-32.svg': M.app_icon('light', 32),
    'rago-favicon.svg': M.app_icon('light', 16),
    'rago-app-tile.svg': full_tile(256),
    'rago-lockup-app.svg': lockup_app(),
    'rago-lockup-app-ink.svg': lockup_app('#0A0A0B'),
    'rago-lockup.svg': lockup_tile('RAGO'),
    'rago-lockup-ink.svg': lockup_tile('RAGO', ink='#0A0A0B'),
    'rago-wordmark-white.svg': lockup_tile('RAGO OPTIMIZER', font=185.4, gap=70.6),
    'rago-wordmark-ink.svg': lockup_tile('RAGO OPTIMIZER', font=185.4, gap=70.6, ink='#0A0A0B', grey=GREY_INK),
}

ICON_SIZES = [16, 20, 24, 32, 40, 48, 64, 128, 256, 512, 1024]


def raster_jobs():
    jobs = [(f'png/rago-icon-{s}.png', M.app_icon('light', s) if s < 256 else M.app_icon('light', 256), s, s) for s in ICON_SIZES]
    jobs += [('png/rago-tile-512.png', full_tile(512), 512, 512),
             ('web/apple-touch-icon.png', full_tile(180), 180, 180),
             ('web/favicon-32.png', M.app_icon('light', 32), 32, 32),
             ('png/rago-mark-512.png', FILES['rago-mark.svg'], 466, 512)]
    for n in ('rago-wordmark-white', 'rago-wordmark-ink', 'rago-lockup-app', 'rago-lockup'):
        jobs.append((f'png/{n}-1200.png', FILES[n + '.svg'], 1200, 0))
    return jobs


def sized(s, w, h):
    import re
    vb = [float(v) for v in re.search(r'viewBox="([^"]+)"', s).group(1).split()]
    if not w: w = round(h * vb[2] / vb[3])
    if not h: h = round(w * vb[3] / vb[2])
    s = re.sub(r'<svg ([^>]*?)width="[^"]+" height="[^"]+"', lambda m: f'<svg {m.group(1)}', s, count=1)
    return s.replace('<svg ', f'<svg width="{w}" height="{h}" style="display:block" ', 1), w, h


if __name__ == '__main__':
    for d in ('', 'png', 'web', 'installer'):
        (OUT / d).mkdir(parents=True, exist_ok=True)
    for n, s in FILES.items():
        (OUT / n).write_text(s)
    jobs = []
    for out, s, w, h in raster_jobs():
        s2, w, h = sized(s, w, h)
        jobs.append({'out': str(OUT / out), 'svg': s2, 'w': w, 'h': h})
    js = HERE / 'brand_jobs.json'
    js.write_text(json.dumps(jobs))
    subprocess.run(['node', str(HERE.parent / 'brand_raster.js'), str(js)], check=True)
    L = OUT
    subprocess.run(['convert'] + [str(L / f'png/rago-icon-{s}.png') for s in (16, 20, 24, 32, 40, 48, 64, 128, 256)] + [str(L / 'rago.ico')], check=True)
    subprocess.run(['convert'] + [str(L / f'png/rago-icon-{s}.png') for s in (16, 32, 48)] + [str(L / 'web/favicon.ico')], check=True)
    shutil.copy(L / 'rago-app-icon-32.svg', L / 'web/favicon.svg')
    for f in ('og-image.png', 'og-launch.png', 'og-route.png'):
        shutil.copy(L.parent.parent / 'site/partage' / f, L / 'web' / f)
    for f in (L.parent.parent / 'installeur/fichiers').iterdir():
        shutil.copy(f, L / 'installer' / f.name)
    print('ok', len(FILES), 'svg,', len(jobs), 'png')

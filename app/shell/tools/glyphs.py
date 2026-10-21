"""Contours du logo de Rago OS pour Rago Shell (src/logo.rs) : le R de brand/logo/rago-mark.svg et le mot « Rago OS »
en Geist SemiBold (police de la marque, licence OFL), vectorisé ici pour que Rago Shell n'ait aucune police à charger.

    pip install fonttools brotli
    python3 tools/glyphs.py
"""
import io
import os
import re
import sys

from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools.pens.recordingPen import RecordingPen
from fontTools.pens.transformPen import TransformPen

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
BRAND = os.path.join(ROOT, '..', '..', 'brand')
FONT = os.path.join(BRAND, 'tools', 'fonts', 'Geist-Variable.woff2')
MARK = os.path.join(BRAND, 'logo', 'rago-mark.svg')
OUT = os.path.join(ROOT, 'src', 'logo.rs')
TEXT = 'Rago OS'
WEIGHT = 600
# interlettrage négatif des titres de la marque (README de brand : « titres en 600, interlettrage négatif »)
TRACKING = -0.02


def mark_points():
    svg = open(MARK, encoding='utf-8').read()
    d = re.search(r'<path d="([^"]+)"', svg).group(1)
    pts, x, y = [], 0.0, 0.0
    for cmd, args in re.findall(r'([MHVLZ])([^MHVLZ]*)', d):
        nums = [float(n) for n in re.findall(r'-?\d+(?:\.\d+)?', args)]
        if cmd in 'ML':
            for i in range(0, len(nums), 2):
                x, y = nums[i], nums[i + 1]
                pts.append((x, y))
        elif cmd == 'H':
            x = nums[0]
            pts.append((x, y))
        elif cmd == 'V':
            y = nums[0]
            pts.append((x, y))
    return pts


def word():
    font = TTFont(FONT)
    font = instancer.instantiateVariableFont(font, {'wght': WEIGHT})
    upm = font['head'].unitsPerEm
    cmap = font.getBestCmap()
    gs = font.getGlyphSet()
    hmtx = font['hmtx']
    ascent = font['OS/2'].sCapHeight or font['hhea'].ascent
    cmds = []
    pen_x = 0.0
    for ch in TEXT:
        name = cmap[ord(ch)]
        rec = RecordingPen()
        # y vers le bas, origine en haut des capitales, unités : hauteur des capitales = 1
        s = 1.0 / ascent
        tp = TransformPen(rec, (s, 0, 0, -s, pen_x * s, 1.0))
        gs[name].draw(tp)
        for op, args in rec.value:
            cmds.append((op, args))
        pen_x += hmtx[name][0] + TRACKING * upm
    width = (pen_x - TRACKING * upm) / ascent
    return cmds, width


def rs_num(v):
    s = f'{float(v):.4f}'.rstrip('0')
    return s + '0' if s.endswith('.') else s


def main():
    pts = mark_points()
    cmds, width = word()
    out = ['//! Généré par tools/glyphs.py : ne pas modifier à la main.', '',
           '/// Le R de Rago (brand/logo/rago-mark.svg), polygone dans un cadre de 164 × 180.',
           'pub const MARK: &[(f32, f32)] = &[']
    out += [f'    ({rs_num(x)}, {rs_num(y)}),' for x, y in pts]
    out += ['];', '', 'pub const MARK_W: f32 = 164.0;', 'pub const MARK_H: f32 = 180.0;', '',
            '/// Tracé du mot « Rago OS » en Geist SemiBold : hauteur des capitales = 1, y vers le bas.',
            '#[derive(Clone, Copy)]',
            '#[allow(dead_code)]',
            'pub enum Op {',
            '    Move(f32, f32),',
            '    Line(f32, f32),',
            '    Quad(f32, f32, f32, f32),',
            '    Cubic(f32, f32, f32, f32, f32, f32),',
            '    Close,',
            '}', '',
            f'pub const WORD_W: f32 = {rs_num(width)};', '',
            'pub const WORD: &[Op] = &[']
    for op, args in cmds:
        flat = [c for p in args for c in p]
        if op == 'moveTo':
            out.append(f'    Op::Move({rs_num(flat[0])}, {rs_num(flat[1])}),')
        elif op == 'lineTo':
            out.append(f'    Op::Line({rs_num(flat[0])}, {rs_num(flat[1])}),')
        elif op == 'qCurveTo':
            # suite de points de contrôle TrueType : points implicites au milieu
            ps = args
            for i in range(len(ps) - 1):
                c = ps[i]
                if i < len(ps) - 2:
                    nxt = ps[i + 1]
                    end = ((c[0] + nxt[0]) / 2, (c[1] + nxt[1]) / 2)
                else:
                    end = ps[-1]
                out.append(f'    Op::Quad({rs_num(c[0])}, {rs_num(c[1])}, {rs_num(end[0])}, {rs_num(end[1])}),')
        elif op == 'curveTo':
            out.append('    Op::Cubic(' + ', '.join(rs_num(v) for v in flat) + '),')
        elif op in ('closePath', 'endPath'):
            out.append('    Op::Close,')
        else:
            sys.exit(f'commande inconnue : {op}')
    out += ['];', '']
    open(OUT, 'w', encoding='utf-8').write('\n'.join(out))
    print(f'{len(pts)} points pour le R, {len(cmds)} commandes pour « {TEXT} » (largeur {width:.2f}) -> src/logo.rs')


if __name__ == '__main__':
    main()

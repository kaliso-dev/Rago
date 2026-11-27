# Icônes "imprimées" de l'admin (22/11/2026) : même dessin que celles de l'app (ricons/solid.py) : formes pleines
# couleur papier, bords rugueux, couche rouge décalée derrière, penchées de -12°. Les couleurs passent par
# --pf (face) et --pb (dos) pour suivre le contexte (bouton rouge, alerte ambre...).
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / 'ricons'))
from solid import SOLID, cr, fill, line, cut, cutf, defs  # noqa: E402

C = lambda cx, cy, r: f'<circle fill="currentColor" cx="{cx}" cy="{cy}" r="{r}"/>'
CC = lambda cx, cy, r: f'<circle fill="#000" cx="{cx}" cy="{cy}" r="{r}"/>'
CO = lambda cx, cy, r, w=1.4: f'<circle fill="none" stroke="#000" stroke-width="{w}" cx="{cx}" cy="{cy}" r="{r}"/>'

ADMIN = {
  'bars':     (fill(cr(3, 13, 4.6, 8.4, 1.6)) + fill(cr(9.7, 8, 4.6, 13.4, 1.8)) + fill(cr(16.4, 2.8, 4.6, 18.6, 2)), ''),
  'users':    (C(15.6, 7.2, 3.4) + fill('M10.4 19.6V17C10.4 14.2 12.6 12.2 15.6 12.2C18.6 12.2 21 14.2 21 17V19.6Z')
               + C(8.4, 8.8, 3.8) + fill('M2.4 21.4V18.6C2.4 15.6 5 13.6 8.4 13.6C11.8 13.6 14.4 15.6 14.4 18.6V21.4Z'),
               CO(8.4, 8.8, 4.6, 1.4) + cut('M1.6 21.4V18.6C1.6 15.2 4.6 12.8 8.4 12.8C12.2 12.8 15.2 15.2 15.2 18.6V21.4', 1.4)),
  'user':     (C(12, 7.4, 4.4) + fill('M3.6 21.4V18.4C3.6 15 7.2 12.8 12 12.8C16.8 12.8 20.4 15 20.4 18.4V21.4Z'), cut('M8 15.2V21.4', 1.2)),
  'gift':     (fill(cr(4, 12, 16, 9.6, 2.2)) + fill(cr(2.8, 7.2, 18.4, 4, 1.6))
               + fill('M12 7.2C10.4 3.4 6.6 3 6.6 5.3C6.6 6.8 8.8 7.2 12 7.2Z') + fill('M12 7.2C13.6 3.4 17.4 3 17.4 5.3C17.4 6.8 15.2 7.2 12 7.2Z'),
               cut('M10.6 7.2V21.6M13.4 7.2V21.6', 1.2)),
  'globe':    (C(12, 12, 9.2),
               '<ellipse fill="none" stroke="#000" stroke-width="1.3" cx="12" cy="12" rx="3.9" ry="9.2"/>' + cut('M2.8 12H21.2', 1.3) + cut('M4.4 7.4H19.6M4.4 16.6H19.6', 1.1)),
  'pulse':    (line('M1.8 12.6H6.4L9 5.4L13.4 19.6L16 12.6H22.2', 2.9), ''),
  'list':     (fill('M2.8 4.4H6.6V8.2H2.8Z') + fill(cr(8.6, 4.4, 12.6, 3.8, 1.4)) + fill('M2.8 10.1H6.6V13.9H2.8Z') + fill(cr(8.6, 10.1, 12.6, 3.8, 1.4))
               + fill('M2.8 15.8H6.6V19.6H2.8Z') + fill(cr(8.6, 15.8, 9, 3.8, 1.4)), ''),
  'brain':    (fill('M11.2 4C8.6 2.4 5 3.6 4.6 6.6C2.6 7.4 2.1 10.4 3.5 12.1C2.5 14.2 3.5 17 6 17.4C6.6 19.8 9.6 20.9 11.2 19.5Z')
               + fill('M12.8 4C15.4 2.4 19 3.6 19.4 6.6C21.4 7.4 21.9 10.4 20.5 12.1C21.5 14.2 20.5 17 18 17.4C17.4 19.8 14.4 20.9 12.8 19.5Z'),
               cut('M7.4 8C8.8 8.2 9.5 9.3 9.3 10.6M6.2 13.4C7.8 13.1 8.9 14.2 8.9 15.6M16.6 8C15.2 8.2 14.5 9.3 14.7 10.6M17.8 13.4C16.2 13.1 15.1 14.2 15.1 15.6', 1.3)),
  'graph':    (line('M12 12L5 5M12 12L19 5M12 12L5 19M12 12L19 19', 2) + C(12, 12, 3.4) + C(4.6, 4.6, 2.5) + C(19.4, 4.6, 2.5) + C(4.6, 19.4, 2.5) + C(19.4, 19.4, 2.5), ''),
  'card':     (fill(cr(2.4, 5, 19.2, 14, 2.4)), cutf('M2.4 8.2H21.6V10.8H2.4Z') + cutf('M5.2 14.2H10.4V16.2H5.2Z')),
  'chat':     (fill('M3 4.2H18.4L21 6.8V15.6H10.4L5.4 19.8V15.6H3Z'), cutf('M7.2 9H9.2V11H7.2ZM11 9H13V11H11ZM14.8 9H16.8V11H14.8Z')),
  'check':    (C(12, 12, 9.2), cut('M7.2 12.2L10.6 15.4L16.8 8.6', 2.5)),
  'download': (fill('M9.6 2.6H14.4V9.4H18L12 16L6 9.4H9.6Z') + fill('M2.8 14.6H5.8V18.4H18.2V14.6H21.2V21.4H2.8Z'), ''),
  'inbox':    (fill('M2.6 12.2H8.2L9.6 14.8H14.4L15.8 12.2H21.4V20.8H2.6Z') + line('M5.4 10.2L7 3.8H17L18.6 10.2', 2.4), ''),
  'link':     ('<rect fill="none" stroke="currentColor" stroke-width="2.6" x="2.6" y="9.4" width="10.6" height="5.2" rx="2.6" transform="rotate(-45 12 12)"/>'
               '<rect fill="none" stroke="currentColor" stroke-width="2.6" x="10.8" y="9.4" width="10.6" height="5.2" rx="2.6" transform="rotate(-45 12 12)"/>', ''),
  'pc':       (fill(cr(6.2, 2.4, 11.6, 19.2, 2.4)), cut('M9.2 6.4H14.8M9.2 9.2H14.8', 1.3) + CC(12, 16, 1.7)),
  'stack':    (fill('M12 2.6L21.8 7.6L12 12.6L2.2 7.6Z') + line('M2.6 12L12 16.8L21.4 12', 2.4) + line('M2.6 16.4L12 21.2L21.4 16.4', 2.4), ''),
  'star':     (fill('M12 2L14.9 8.5L21.9 9.2L16.6 14L18.1 21L12 17.4L5.9 21L7.4 14L2.1 9.2L9.1 8.5Z'), ''),
  'tag':      (fill('M2.8 2.8H11.4L21.4 12.8L12.8 21.4L2.8 11.4Z'), CC(7.4, 7.4, 1.9)),
  'trash':    (fill('M5.2 7.6H18.8L17.6 21.4H6.4Z') + fill('M2.8 4.2H21.2V6.4H2.8Z') + fill('M9 2.2H15V4.6H9Z'), cut('M10 10.4V18.4M14 10.4V18.4', 1.3)),
  'clock':    (C(12, 12, 9.2), cut('M12 6.2V12.4L16 14.8', 1.9)),
  'info':     (C(12, 12, 9.2), cutf('M10.9 10.4H13.1V17.4H10.9Z') + cutf('M10.9 6.4H13.1V8.6H10.9Z')),
  'refresh':  (line('M19.2 12.4A7.2 7.2 0 1 1 16.4 6.6', 2.9) + fill('M13.4 3.4L20.8 2.6L20 10Z'), ''),
  'ban':      ('<path fill="currentColor" fill-rule="evenodd" d="M12 2.8A9.2 9.2 0 1 1 11.99 2.8ZM12 6.2A5.8 5.8 0 1 0 12.01 6.2Z"/>' + line('M5.8 5.8L18.2 18.2', 3), ''),
  'copy':     (fill(cr(2.6, 2.6, 12.4, 12.4, 2.4)) + fill(cr(9, 9, 12.4, 12.4, 2.4)), cut(cr(9, 9, 12.4, 12.4, 2.4), 1.5)),
  'external': (fill('M2.8 6H11V8.8H5.6V18.4H15.2V13H18V21.2H2.8Z') + fill('M13 2.8H21.2V11L18.4 8.2L12.4 14.2L9.8 11.6L15.8 5.6Z'), ''),
  'image':    (fill(cr(2.4, 4, 19.2, 16, 2.4)), cutf('M5.2 17.6L9.8 11.4L13 15.2L15.2 12.8L18.8 17.6Z') + CC(15.6, 8.4, 1.8)),
  'mail':     (fill(cr(2.4, 5, 19.2, 14, 2.4)), cut('M2.6 5.8L12 13.2L21.4 5.8', 1.7)),
  'search':   (C(10.2, 10.2, 7.4) + line('M15.4 15.4L21.2 21.2', 3.4), cut('M6.2 9.6A4.2 4.2 0 0 1 9.6 6.2', 1.5)),
  'logout':   (fill('M2.8 2.8H13V7.4H10.4V5.6H5.6V18.4H10.4V16.6H13V21.2H2.8Z') + line('M9.8 12H18.8', 2.9) + fill('M16.6 7.4L21.8 12L16.6 16.6Z'), ''),
  'key':      (C(7.4, 12, 5.2) + fill('M11.4 10.6H21.6V13.4H19.8V16.6H17V13.4H11.4Z'), CC(6.6, 12, 1.8)),
  'folder':   (fill('M2.6 4.8H9.4L11.4 7.2H21.4V19.6H2.6Z'), cut('M2.6 10H21.4', 1.3)),
  'fit':      (line('M3.2 9V3.2H9M15 3.2H20.8V9M20.8 15V20.8H15M9 20.8H3.2V15', 2.9), ''),
  'maximize': (line('M13.6 3.2H20.8V10.4M10.4 20.8H3.2V13.6', 2.9) + line('M20.6 3.4L14 10M3.4 20.6L10 14', 2.7), ''),
  'plus':     (fill('M10.3 3.2H13.7V10.3H20.8V13.7H13.7V20.8H10.3V13.7H3.2V10.3H10.3Z'), ''),
  'minus':    (fill('M3.2 10.3H20.8V13.7H3.2Z'), ''),
}
# nom des icônes de l'admin (icons.js) -> dessin imprimé
MAP = {'grid': 'dashboard', 'wifi': 'network', 'shield': 'rbw', 'sliders': 'settings', 'alert': 'alert', 'activity': 'pulse',
       **{k: k for k in ADMIN}}
# restent au trait : flèches, chevrons et croix de fermeture (des signes d'interface, pas des icônes)
LINE = {'right', 'left', 'chev', 'upright', 'trenddown', 'arrow', 'x'}

PAPER, RED = '#ECE9E2', '#FF3B30'
_uid = [0]


def glyph(name):
    return ADMIN[name] if name in ADMIN else SOLID[name][:2]


def picon(n, big=False):
    """L'icône imprimée pour un nom d'icons.js, ou None si elle reste au trait."""
    if n in LINE or n not in MAP:
        return None
    shapes, cuts = glyph(MAP[n])
    _uid[0] += 1
    u = f'a{_uid[0]}'
    m = (f'<mask id="m-{u}" maskUnits="userSpaceOnUse" x="-4" y="-4" width="32" height="32">'
         f'<rect x="-4" y="-4" width="32" height="32" fill="#fff"/>{cuts}</mask>')
    g = f'<g id="g-{u}" mask="url(#m-{u})">{shapes}</g>'
    sfx = '' if big else '-s'
    return (f'<svg class="pi" width="24" height="24" viewBox="0 0 24 24" overflow="visible" aria-hidden="true"><defs>{m}{g}</defs>'
            f'<g transform="translate(2.55 0) skewX(-12)">'
            f'<use href="#g-{u}" style="color:var(--pb,{RED})" transform="translate(1.3 1.5)" filter="url(#rgh-back{sfx})"/>'
            f'<use href="#g-{u}" style="color:var(--pf,{PAPER})" filter="url(#rgh-face{sfx})"/></g></svg>')


DEFS = defs()

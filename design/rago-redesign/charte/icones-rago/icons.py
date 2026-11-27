# Rago icons v1 : grille 24, trait 2 (bouts nets, angles vifs), coin haut-droit coupé,
# une pièce pleine par icône de module (.a, rouge quand actif), le tout penché de -12° comme les titres.
# Coordonnées dessinées droites ; le penché est appliqué par le gabarit.

def cr(x, y, w, h, c=2.5):
    return f'M{x} {y}H{x+w-c}L{x+w} {y+c}V{y+h}H{x}Z'

def P(d):
    return f'<path d="{d}"/>'

def A(inner):  # pièce d'accent (pleine)
    return inner.replace('<path ', '<path class="a" ').replace('<rect ', '<rect class="a" ').replace('<polygon ', '<polygon class="a" ').replace('<circle ', '<circle class="a" ')

def F(inner):  # plein, couleur du trait
    return inner.replace('<path ', '<path class="f" ').replace('<rect ', '<rect class="f" ').replace('<polygon ', '<polygon class="f" ').replace('<circle ', '<circle class="f" ')

ICONS = {
  # ---- modules (barre latérale) ----
  'dashboard': A(P(cr(13, 3, 8, 8, 3))) + P(cr(4, 4, 6, 6, 2)) + P(cr(4, 14, 6, 6, 2)) + P(cr(14, 14, 6, 6, 2)),
  'network':   A(P(cr(8, 2, 8, 7, 2.5))) + P('M12 9V12.5M6.5 16V12.5H17.5V16') + P(cr(4, 16, 5, 5, 1.8)) + P(cr(15, 16, 5, 5, 1.8)),
  'latency':   P('M4.5 17A8 8 0 1 1 19.5 17') + P('M12 14.5L16.5 9.5') + A('<rect x="10.2" y="12.6" width="3.6" height="3.6"/>'),
  'graphics':  P('M4 3.5V20.5') + P('M4 6H17.5L20 8.5V17H4') + '<circle cx="14.5" cy="11.5" r="3"/>' + A('<rect x="6.6" y="8.6" width="2.6" height="5.8"/>') + P('M9 17V20H14V17'),
  'windows':   P('M3.5 4H18L20.5 6.5V16H3.5Z') + P('M12 16V20M8 20.5H16') + A('<rect x="5.6" y="6.6" width="6.2" height="6.8"/>'),
  'hitreg':    '<circle cx="12" cy="12" r="7.5"/>' + P('M12 2.5V8M12 16V21.5M2.5 12H8M16 12H21.5') + A('<rect x="10.5" y="10.5" width="3" height="3"/>'),
  'minecraft': A('<polygon points="12,3 20,7.5 12,12 4,7.5"/>') + P('M12 3L20 7.5V16.5L12 21L4 16.5V7.5Z') + P('M4 7.5L12 12L20 7.5M12 12V21'),
  'games':     P('M7.5 6.5H16.5L20.5 14.5V18H16.5L14.5 15H9.5L7.5 18H3.5V14.5Z') + P('M7.5 9.3V13.7M5.3 11.5H9.7') + A('<rect x="14.4" y="8.8" width="2.4" height="2.4"/><rect x="16.8" y="11.3" width="2.4" height="2.4"/>'),
  'route':     P('M3.5 12H8.5L13.5 6H20.5M8.5 12L13.5 18H20.5') + A('<rect x="6.6" y="10.1" width="3.8" height="3.8"/>') + P('M18 3.5L20.5 6L18 8.5M18 15.5L20.5 18L18 20.5'),
  'cpu':       A('<rect x="10" y="10" width="4" height="4"/>') + P('M7 7H14.5L17 9.5V17H7Z') + P('M10 3.5V7M14 3.5V7M10 17V20.5M14 17V20.5M3.5 10H7M3.5 14H7M17 10H20.5M17 14H20.5'),
  'memory':    P('M3 8H18.5L21 10.5V16H3Z') + A('<rect x="5.8" y="10.5" width="3.4" height="3"/>') + P('M11.3 10.5h3.4v3h-3.4z') + P('M6 16V19M10 16V19M14 16V19M18 16V19'),
  'drive':     P('M3 13H21V19.5H3Z') + P('M3 13L6.5 5.5H17.5L21 13') + A('<rect x="15.3" y="15.2" width="3.2" height="2.1"/>') + P('M6 16.3H11.5'),
  'privacy':   A('<polygon points="12,3 12,21 4,13 4,6"/>') + P('M12 3L20 6V13L12 21L4 13V6Z'),
  'display':   A('<circle cx="12" cy="12" r="4.6"/>') + P('M12 2.5V5M12 19V21.5M2.5 12H5M19 12H21.5M5.3 5.3L7.1 7.1M16.9 16.9L18.7 18.7M18.7 5.3L16.9 7.1M7.1 16.9L5.3 18.7'),
  'mouse':     A('<polygon points="7,9 9.5,3.5 12,3.5 12,9"/>') + P('M7 9L9.5 3.5H14.5L17 9V16.5L14.5 20.5H9.5L7 16.5Z') + P('M12 3.5V9M7 9H17'),
  'terminal':  P('M4.5 6.5L10 12L4.5 17.5') + A('<rect x="12" y="15.8" width="7.5" height="2.6"/>'),
  # ---- actions et interface ----
  'apply':     P('M4.5 5.5L10.5 12L4.5 18.5') + A('<polygon points="11,5 15,5 21,12 15,19 11,19 17,12"/>'),
  'check':     P('M4.5 12.5L9.5 17.5L19.5 6.5'),
  'plus':      P('M12 4.5V19.5M4.5 12H19.5'),
  'close':     P('M6 6L18 18M18 6L6 18'),
  'chevron':   P('M6 9.5L12 15.5L18 9.5'),
  'arrow':     P('M4 12H19M13.5 6.5L19 12L13.5 17.5'),
  'refresh':   P('M19.5 10A7.5 7.5 0 0 0 5.7 8') + P('M19.5 4V10H13.5') + P('M4.5 14A7.5 7.5 0 0 0 18.3 16') + P('M4.5 20V14H10.5'),
  'restart':   P('M5 3.5V9H10.5') + P('M5.4 9A7.5 7.5 0 1 1 4.6 13.5'),
  'restore':   P('M8.5 5L4 9.5L8.5 14') + P('M4 9.5H14.5A5 5 0 0 1 14.5 19.5H9'),
  'power':     P('M12 3V11') + P('M7.2 6.2A7.5 7.5 0 1 0 16.8 6.2'),
  'info':      '<circle cx="12" cy="12" r="8.5"/>' + P('M12 11V17') + F('<rect x="11" y="6.6" width="2" height="2"/>'),
  'alert':     P('M12 3.5L21 19.5H3Z') + P('M12 9.5V13.5') + F('<rect x="11" y="15.4" width="2" height="2"/>'),
  'lock':      P('M5 11H17L19 13V20.5H5Z') + P('M8 11V7.5L10.5 5H13.5L16 7.5V11') + A('<rect x="11" y="14" width="2" height="3.6"/>'),
  'search':    '<circle cx="10.5" cy="10.5" r="6.5"/>' + P('M15.3 15.3L20.5 20.5'),
  'wifi':      P('M3 9.5A13 13 0 0 1 21 9.5') + P('M6.2 13A8.5 8.5 0 0 1 17.8 13') + P('M9.3 16.4A4.2 4.2 0 0 1 14.7 16.4') + A('<rect x="10.8" y="18.6" width="2.4" height="2.4"/>'),
  'activity':  P('M3 12H7L10 5L14 19L17 12H21'),
  'sliders':   P('M4 6H13M17 6H20M4 12H6M10 12H20M4 18H11M15 18H20') + A('<rect x="13" y="4" width="4" height="4"/>') + F('<rect x="6" y="10" width="4" height="4"/><rect x="11" y="16" width="4" height="4"/>'),
  'download':  P('M12 3.5V14.5M7 9.5L12 14.5L17 9.5M4 20H20'),
  'play':      F('<polygon points="7,4.5 19,12 7,19.5"/>'),
  'eye':       P('M2.5 12L7.5 6.5H16.5L21.5 12L16.5 17.5H7.5Z') + A('<rect x="10" y="10" width="4" height="4"/>'),
  'trash':     P('M4 6.5H20M9.5 6.5V3.5H14.5V6.5') + P('M6 6.5L7 20.5H17L18 6.5') + P('M10 10.5V16.5M14 10.5V16.5'),
  'external':  P('M14 4H20V10M20 4L11 13') + P('M17 14V20H4V7H10'),
  'file':      P('M6 3.5H14L18.5 8V20.5H6Z') + P('M14 3.5V8H18.5') + P('M9 13H15.5M9 16.5H13'),
  'measure':   P('M4 9V4H9M15 4H20V9M20 15V20H15M9 20H4V15'),
}

MODULES = ['dashboard','network','latency','graphics','windows','hitreg','minecraft','games','route','cpu','memory','drive','privacy','display','mouse','terminal']

def svg(name, size=24, stroke='currentColor', accent=None, solid=None, cls='ri'):
    a = accent or stroke
    s = solid or stroke
    return (f'<svg class="{cls}" width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="{stroke}" stroke-width="2" '
            f'stroke-linecap="butt" stroke-linejoin="miter" stroke-miterlimit="10">'
            f'<g transform="translate(2.55 0) skewX(-12)">'
            + ICONS[name].replace('class="a"', f'fill="{a}" stroke="none"').replace('class="f"', f'fill="{s}" stroke="none"')
            + '</g></svg>')

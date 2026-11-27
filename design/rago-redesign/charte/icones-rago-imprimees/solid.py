# Icônes Rago "imprimées" : formes pleines couleur papier, bords rugueux, une couche rouge décalée derrière
# (comme une impression mal calée). Dessin droit sur une grille 24, penché de -12° par le gabarit.

def cr(x, y, w, h, c=2.5):
    return f'M{x} {y}H{x+w-c}L{x+w} {y+c}V{y+h}H{x}Z'

def fill(d):
    return f'<path fill="currentColor" d="{d}"/>'

def line(d, w=2.8):
    return f'<path fill="none" stroke="currentColor" stroke-width="{w}" stroke-linejoin="miter" stroke-miterlimit="10" d="{d}"/>'

def cut(d, w=1.4):
    return f'<path fill="none" stroke="#000" stroke-width="{w}" stroke-linejoin="miter" d="{d}"/>'

def cutf(d):
    return f'<path fill="#000" d="{d}"/>'

# name: (shapes, cuts, label, what it is)
SOLID = {
  'dashboard': (fill(cr(3.5, 3.5, 7.5, 7.5, 2.4)) + fill(cr(13, 3, 8, 8, 3)) + fill(cr(3.5, 13, 7.5, 7.5, 2.4)) + fill(cr(13, 13, 7.5, 7.5, 2.4)),
                cut('M15.5 7H18.5', 1.3), 'dashboard', 'four tiles'),
  'network':   (fill(cr(7.5, 2, 9, 7, 2.6)) + line('M12 9V12.5M6.5 15.5V12.5H17.5V15.5', 2.6) + fill(cr(3, 15.5, 7, 6, 2)) + fill(cr(14, 15.5, 7, 6, 2)),
                cut('M10 5.5H14', 1.3), 'network', 'a switch'),
  'latency':   (fill('M4.2 19.6A9 9 0 1 1 19.8 19.6Z'),
                cut('M12 14.6L16.9 8.6', 2.2) + cutf('M10.2 12.8H13.8V16.4H10.2Z') + cut('M6.4 14.2A5.6 5.6 0 0 1 8.2 10', 1.2), 'latency', 'a dial'),
  'graphics':  (line('M3.5 3V21', 2.6) + fill('M3.5 6H17.5L20.8 9.3V17.2H3.5Z') + fill('M8.5 17H14.5V20.5H8.5Z'),
                cut('M14.3 8.6A2.9 2.9 0 1 1 14.29 8.6Z', 1.5) + cutf('M13.4 10.7H15.2V12.5H13.4Z') + cut('M7 9V14.4M9.4 9V14.4', 1.3), 'graphics card', 'a card and its fan'),
  'windows':   (fill('M2.8 3.5H18L21.2 6.7V16.2H2.8Z') + fill('M10.7 16H13.3V19.6H10.7Z') + fill('M7.2 19.4H16.8V21.4H7.2Z'),
                cut(cr(5.4, 6, 12.8, 7.6, 1.8), 1.3) + cutf('M7.4 8.2H11.4V11.4H7.4Z'), 'windows', 'a screen'),
  'hitreg':    ('<circle fill="currentColor" cx="12" cy="12" r="8.6"/>',
                '<circle fill="none" stroke="#000" stroke-width="1.4" cx="12" cy="12" r="5"/>' + cut('M12 2.5V8.2M12 15.8V21.5M2.5 12H8.2M15.8 12H21.5', 1.5), 'hitreg', 'a sight'),
  'minecraft': (fill('M12 2.2L20.8 7V17L12 21.8L3.2 17V7Z'),
                cut('M3.2 7L12 11.9L20.8 7M12 11.9V21.8', 1.5) + cutf('M10.6 5.2H12.4V6.6H10.6ZM13.6 7H15.4V8.4H13.6ZM8 7.3H9.6V8.6H8Z') , 'minecraft', 'a block'),
  'games':     (fill('M6.8 6.6H17.2L21.4 13.8V17.8H16.6L14.6 14.8H9.4L7.4 17.8H2.6V13.8Z'),
                cut('M7.4 8.7V12.7M5.4 10.7H9.4', 1.6) + cutf('M14.3 8.4H16.4V10.5H14.3ZM16.7 10.8H18.8V12.9H16.7Z'), 'games', 'a pad'),
  'route':     (line('M2.5 12H8.5L13.4 6H18M8.5 12L13.4 18H18', 2.8) + fill('M17.2 2.4L21.6 6L17.2 9.6Z') + fill('M17.2 14.4L21.6 18L17.2 21.6Z') + fill('M6.2 9.7H10.8V14.3H6.2Z'),
                '', 'rago route', 'a fork'),
  'apply':     (fill('M3 5H7.6L13.8 12L7.6 19H3L9.2 12Z') + fill('M11 5H15.6L21.8 12L15.6 19H11L17.2 12Z'),
                '', 'apply', 'go now'),
  'analysis':  ('<circle fill="currentColor" cx="10" cy="10" r="7"/>' + line('M14.9 14.9L20.8 20.8', 3),
                cut('M4.8 10.6H6.9L8.4 7.4L10.6 13.4L12.2 10.6H15.2', 1.4), 'analyze my pc', 'a lens'),
  'tools':     (fill(cr(3, 9, 18, 11.5, 2.6)) + line('M8.6 9V5.4H15.4V9', 2.4),
                cut('M3 13.8H21', 1.3) + cutf('M10.4 12.2H13.6V15.6H10.4Z'), 'tools', 'a toolbox'),
  'display':   ('<circle fill="currentColor" cx="12" cy="12" r="8.8"/>',
                cutf('M12 5.4A6.6 6.6 0 0 1 12 18.6Z'), 'display', 'contrast'),
  'mouse':     (fill('M7 9L9.5 3H14.5L17 9V16.8L14.5 21H9.5L7 16.8Z'),
                cut('M12 3V9.6M7 9.6H17', 1.4), 'mouse', 'a mouse'),
  'library':   (fill(cr(8.4, 2.6, 12, 15, 2.6)) + fill(cr(3.6, 6.4, 12, 15, 2.6)),
                cut(cr(3.6, 6.4, 12, 15, 2.6), 1.4) + cut('M3.6 17.6L15.6 12.4', 1.4), 'games', 'a stack of covers'),
  'rbw':       (fill('M12 2.4L20.6 5.8V13.2L12 21.6L3.4 13.2V5.8Z'),
                cut('M12 5.6L17.6 7.8V12.2L12 17.8L6.4 12.2V7.8Z', 1.3), 'rbw mod', 'a shield'),
  'expert':    (fill(cr(2.8, 4, 18.4, 16, 2.6)),
                cut('M6.6 8.8L10 12L6.6 15.2', 1.8) + cutf('M11.6 14.2H16.8V15.9H11.6Z'), 'expert mode', 'a terminal'),
  'restore':   (line('M7 9.5H14.5A5 5 0 0 1 14.5 19.5H8.6', 2.8) + fill('M2.6 9.5L8.6 4V15Z'),
                '', 'restore', 'go back'),
  'settings':  (line('M6 3V21M12 3V21M18 3V21', 2.2) + fill('M3.6 13H8.4V17.4H3.6Z') + fill('M9.6 5H14.4V9.4H9.6Z') + fill('M15.6 10.6H20.4V15H15.6Z'),
                cut('M3.6 15.2H8.4M9.6 7.2H14.4M15.6 12.8H20.4', 1), 'settings', 'faders'),
  'offline':   (fill(cr(7.5, 2, 9, 7, 2.6)) + line('M12 9V12.5M6.5 15.5V12.5H17.5V15.5', 2.6) + fill(cr(3, 15.5, 7, 6, 2)) + fill(cr(14, 15.5, 7, 6, 2)),
                cut('M10 5.5H14', 1.3) + cut('M2.5 3.2L21.5 21', 2.6), 'offline', 'a switch, cut'),
  'alert':     (fill('M12 2.4L22.2 20.6H1.8Z'),
                cutf('M10.8 8.6H13.2V14.8H10.8Z') + cutf('M10.8 16.4H13.2V18.8H10.8Z'), 'alert', 'a warning'),
}
NAV = ['dashboard', 'network', 'latency', 'graphics', 'windows', 'hitreg', 'minecraft', 'games', 'route']

PAPER, RED = '#ECE9E2', '#FF3B30'

def _flt(id_, freq, scale, sfreq, sa, sb, seed, xs='R', ys='G'):
    speck = (f'<feTurbulence type="fractalNoise" baseFrequency="{sfreq}" numOctaves="2" seed="{seed+6}" result="s"/>'
             f'<feColorMatrix in="s" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  {sa} 0 0 0 {sb}" result="sm"/>'
             f'<feComposite in="d" in2="sm" operator="in"/>') if sa else ''
    return (f'<filter id="{id_}" x="-20%" y="-20%" width="140%" height="140%" primitiveUnits="userSpaceOnUse" color-interpolation-filters="sRGB">'
            f'<feTurbulence type="fractalNoise" baseFrequency="{freq}" numOctaves="2" seed="{seed}" result="n"/>'
            f'<feDisplacementMap in="SourceGraphic" in2="n" scale="{scale}" xChannelSelector="{xs}" yChannelSelector="{ys}" result="d"/>{speck}</filter>')

def defs(seed=3):
    """Filtres partagés : bords rugueux et quelques mouchetures ; une version douce pour les petites tailles."""
    return ('<svg width="0" height="0" style="position:absolute"><defs>'
            + _flt('rgh-face', 1.7, 0.75, 1.3, -16, 12.4, seed)
            + _flt('rgh-back', 1.3, 1.0, 1.1, -14, 10.9, seed + 11, 'G', 'R')
            + _flt('rgh-face-s', 1.2, 0.45, 0, 0, 0, seed)
            + _flt('rgh-back-s', 1.0, 0.6, 0, 0, 0, seed + 11, 'G', 'R')
            + _flt('rgh-face-l', 2.4, 0.42, 3.2, -16, 13.9, seed)          # grandes tailles : grain plus fin, moins de trous
            + _flt('rgh-back-l', 2.0, 0.55, 2.8, -14, 12.6, seed + 11, 'G', 'R')
            + '</defs></svg>')

_uid = [0]
def icon(name, size=24, face=PAPER, back=RED, dx=1.3, dy=1.5, textured=True):
    shapes, cuts, _, _ = SOLID[name]
    _uid[0] += 1
    u = f'{name}-{_uid[0]}'
    m = (f'<mask id="m-{u}" maskUnits="userSpaceOnUse" x="-4" y="-4" width="32" height="32">'
         f'<rect x="-4" y="-4" width="32" height="32" fill="#fff"/>{cuts}</mask>')
    g = f'<g id="g-{u}" mask="url(#m-{u})">{shapes}</g>'
    sfx = '-l' if size >= 90 else ('' if size >= 40 else '-s')
    ff = f' filter="url(#rgh-face{sfx})"' if textured else ''
    fb = f' filter="url(#rgh-back{sfx})"' if textured else ''
    return (f'<svg class="pi" width="{size}" height="{size}" viewBox="0 0 24 24" overflow="visible"><defs>{m}{g}</defs>'
            f'<g transform="translate(2.55 0) skewX(-12)">'
            f'<use href="#g-{u}" style="color:{back}" transform="translate({dx} {dy})"{fb}/>'
            f'<use href="#g-{u}" style="color:{face}"{ff}/></g></svg>')

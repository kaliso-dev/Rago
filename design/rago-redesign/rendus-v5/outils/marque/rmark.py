# R de Rago. Depuis le 22/11 au soir : R rouge plein partout, icône de l'app rouge sur tuile blanche (app_icon). mark() garde l'ancien R imprimé pour mémoire.
R = 'M0 0H160V46L93.83 101.42L164 180H114L65.17 125.42L0 180V132L112.24 38H39V78.34L0 111Z'   # boîte 164 x 180
PAPER, RED, BLACK = '#ECE9E2', '#FF3B30', '#0A0A0B'

def flt(id_, freq, scale, seed, sfreq=0, sa=0, sb=0, xs='R', ys='G'):
    speck = (f'<feTurbulence type="fractalNoise" baseFrequency="{sfreq}" numOctaves="2" seed="{seed+6}" result="s"/>'
             f'<feColorMatrix in="s" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  {sa} 0 0 0 {sb}" result="sm"/>'
             f'<feComposite in="d" in2="sm" operator="in"/>') if sa else ''
    return (f'<filter id="{id_}" x="-10%" y="-10%" width="120%" height="120%" primitiveUnits="userSpaceOnUse" color-interpolation-filters="sRGB">'
            f'<feTurbulence type="fractalNoise" baseFrequency="{freq}" numOctaves="2" seed="{seed}" result="n"/>'
            f'<feDisplacementMap in="SourceGraphic" in2="n" scale="{scale}" xChannelSelector="{xs}" yChannelSelector="{ys}" result="d"/>{speck}</filter>')

def mark_defs(p='m', k=1.0):
    """k : échelle de la rugosité (1 = R de 180 unités de haut)."""
    return (flt(f'{p}-face', 0.21 / k, 3.2 * k, 4, 0.17 / k, -16, 12.9) + flt(f'{p}-back', 0.16 / k, 4.4 * k, 15, 0.13 / k, -14, 11.6, 'G', 'R'))

def mark(face=PAPER, back=RED, dx=9, dy=11, p='m', rough=True):
    """Le R imprimé, dans la boîte du R (0..164, 0..180) ; la couche dessous déborde de dx, dy."""
    ff = f' filter="url(#{p}-face)"' if rough else ''
    fb = f' filter="url(#{p}-back)"' if rough else ''
    return (f'<path d="{R}" fill="{back}" transform="translate({dx} {dy})"{fb}/>'
            f'<path d="{R}" fill="{face}"{ff}/>')

def dots(id_, color='#fff', op=.10, step=9, r=1.1):
    return (f'<pattern id="{id_}" width="{step}" height="{step}" patternUnits="userSpaceOnUse">'
            f'<circle cx="{step/2}" cy="{step/2}" r="{r}" fill="{color}" fill-opacity="{op}"/></pattern>')

WHITE = '#FFFFFF'

def app_icon(variant='light', px=256, rough=None):
    """Icône 256 unités (choix de Sofiene, 22/11 au soir) : R rouge plein sur tuile blanche (light).
    dark : R rouge sur tuile noire, gardé en réserve. Plus de R papier, de couche décalée, de rugosité ni de trame.
    Le R prend un peu plus de place aux petites tailles."""
    s = 0.80 if px >= 48 else (0.86 if px > 16 else 0.95)
    w, h = 164 * s, 180 * s
    x0, y0 = (256 - w) / 2, (256 - h) / 2
    rx = 56 if px > 16 else 40
    if variant == 'dark':
        tile = f'<rect width="256" height="256" rx="{rx}" fill="{BLACK}"/>'
        edge = f'<rect x="1" y="1" width="254" height="254" rx="{rx - 1}" fill="none" stroke="#fff" stroke-opacity=".1" stroke-width="2"/>'
    else:
        tile = f'<rect width="256" height="256" rx="{rx}" fill="{WHITE}"/>'
        edge = f'<rect x="1" y="1" width="254" height="254" rx="{rx - 1}" fill="none" stroke="#000" stroke-opacity=".08" stroke-width="2"/>'
    g = f'<path d="{R}" fill="{RED}" transform="translate({x0:.2f} {y0:.2f}) scale({s})"/>'
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="{px}" height="{px}">{tile}{g}{edge}</svg>'

def old_icon(px=256):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="{px}" height="{px}"><defs><linearGradient id="og" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1A1A1E"/><stop offset="1" stop-color="#0A0A0B"/></linearGradient>'
            f'<radialGradient id="oh" cx="0.85" cy="0.1" r="0.75"><stop offset="0" stop-color="#FF3B30" stop-opacity=".28"/><stop offset="1" stop-color="#FF3B30" stop-opacity="0"/></radialGradient></defs>'
            f'<rect width="256" height="256" rx="56" fill="url(#og)"/><rect width="256" height="256" rx="56" fill="url(#oh)"/>'
            f'<rect x="1" y="1" width="254" height="254" rx="55" fill="none" stroke="#FFFFFF" stroke-opacity=".08" stroke-width="2"/>'
            f'<g transform="translate(59.67 53.00) scale(0.8333)"><path d="{R}" fill="#FF3B30"/></g></svg>')

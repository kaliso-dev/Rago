"""Draw the globe of the Rago Route section, straight into src/page.html, between <!-- globe --> and <!-- /globe -->.

Not a picture: the top of the Earth drawn with lines and dots, like the reference Sofiene gave on 24/11.
One dot per cell of a 2 deg x 2 deg grid wherever there is land, the coastlines at the stroke, and a graticule
every 15 deg; everything in orthographic projection, only the half of the globe turned towards us, cut to the
top band that the page shows. Coordinates are whole numbers in ten-thousandths of a radius, so the SVG stays small.

Coastlines: Natural Earth 50m (public domain), downloaded once into a cache outside the repo.

    python3 site/tools/make_planet.py          # rewrites the <!-- globe --> block of site/src/page.html

The projection below is also used by hand to place the Frankfurt and Paris pins and the Rago Route flows
(percentages of the same band), so changing it means redoing those too."""
import json, math, os, tempfile, urllib.request
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
PAGE = os.path.join(HERE, '..', 'src', 'page.html')
CACHE = os.path.join(tempfile.gettempdir(), 'rago-planet')
SRC = {'ne_50m_land.geojson': 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_land.geojson',
       'ne_50m_lakes.geojson': 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_lakes.geojson'}
# ---- the view: the same numbers in page.html (the pins and the flows) ----
LAT0, LON0 = -10.0, 8.0     # the point of the globe at the centre of the disc: Europe then sits in the visible cap
K = 0.5                     # height of the drawing, in radius (the page never shows more than .46 R of cap)
U = 10000                   # a radius, in SVG units: everything is rounded to whole units
VMAX = 0.56                 # nothing is drawn below that depth: the page cuts the band well above it
STEP = 0.75                 # the grid of dots, in degrees
DOT = 22                    # the side of a dot seen from straight on, in SVG units
LIFT = 0.30                 # how far a flow rises off the globe, per radian of its length
LIFT_MAX = 0.072            # ... and never more than that, in radii
VTOP = 0.022                # a flow never climbs above that, so it stays off the cards
RUN = 4.6                   # the pulse takes that many seconds to travel a flow

p0, l0 = math.radians(LAT0), math.radians(LON0)
D = (math.cos(p0) * math.cos(l0), math.cos(p0) * math.sin(l0), math.sin(p0))
E = (-math.sin(l0), math.cos(l0), 0.0)
N = (-math.sin(p0) * math.cos(l0), -math.sin(p0) * math.sin(l0), math.cos(p0))

def grab(name):
    os.makedirs(CACHE, exist_ok=True)
    p = os.path.join(CACHE, name)
    if not os.path.isfile(p):
        with urllib.request.urlopen(urllib.request.Request(SRC[name], headers={'User-Agent': 'rago-site-build'}), timeout=180) as r, open(p, 'wb') as f:
            f.write(r.read())
    return json.load(open(p))

def vec(lat, lon):
    a, b = math.radians(lat), math.radians(lon)
    return (math.cos(a) * math.cos(b), math.cos(a) * math.sin(b), math.sin(a))

def dot3(A, B): return A[0] * B[0] + A[1] * B[1] + A[2] * B[2]

def proj(P):
    """-> x (to the right), v (down from the top of the disc), z (> 0 on the half turned towards us), in radii"""
    return dot3(P, E), 1 - dot3(P, N), dot3(P, D)

def land_mask(w=2880, h=1440):
    im = Image.new('L', (w, h), 0)
    d = ImageDraw.Draw(im)
    def rings(geo, v):
        for ft in geo['features']:
            g = ft['geometry']
            for poly in ([g['coordinates']] if g['type'] == 'Polygon' else g['coordinates']):
                for i, ring in enumerate(poly):
                    pts = [((lon + 180) / 360 * w, (90 - lat) / 180 * h) for lon, lat in ring]
                    if len(pts) > 2: d.polygon(pts, fill=v if i == 0 else (0 if v else 255))
    rings(grab('ne_50m_land.geojson'), 255)
    rings(grab('ne_50m_lakes.geojson'), 0)
    return im.load(), w, h

def dots():
    """one square per cell of the grid that holds land: smaller as it turns away from us"""
    px, w, h = land_mask()
    out, n, px0, py0 = [], 0, 0, 0
    lat = -88.0
    while lat <= 88.0:
        lon = -180.0
        while lon < 180.0:
            P = vec(lat, lon)
            x, v, z = proj(P)
            if z > .02 and -1.02 <= x <= 1.02 and -.02 <= v <= VMAX:
                if px[int((lon + 180) / 360 * w) % w, min(h - 1, int((90 - lat) / 180 * h))]:
                    s = max(6, int(round(DOT * (.32 + .68 * math.sqrt(z)))))
                    cx, cy = round(x * U) - s // 2, round(v * U) - s // 2
                    out.append('m%d %dh%dv%dh-%dz' % (cx - px0, cy - py0, s, s, s))   # from the last dot, not the origin
                    px0, py0 = cx, cy
                    n += 1
            lon += STEP
        lat += STEP
    return 'M0 0' + ''.join(out), n

def line(pts, close=False):
    """a list of 3D points -> the pieces of path that are on the half turned towards us and inside the band"""
    if close and pts[0] != pts[-1]: pts = pts + [pts[0]]
    segs, cur = [], []
    prev = None
    for P in pts:
        x, v, z = proj(P)
        if z > 0 and v <= VMAX:
            if prev is not None and prev[2] <= 0:          # coming back into view: start at the limb
                cur.append(cross(prev, (x, v, z), P))
            cur.append((x, v))
        else:
            if cur:
                if prev is not None and z <= 0: cur.append(cross((x, v, z), prev, None))
                segs.append(cur); cur = []
        prev = (x, v, z)
    if cur: segs.append(cur)
    return segs

def cross(out, inn, P):
    """point of the limb between a point behind (z<=0) and a point in front: straight interpolation on z"""
    t = out[2] / (out[2] - inn[2]) if out[2] != inn[2] else 0
    return (out[0] + (inn[0] - out[0]) * t, out[1] + (inn[1] - out[1]) * t)

def simplify(pts, tol):
    """Douglas-Peucker, in the plane of the drawing"""
    if len(pts) < 3: return pts
    a, b = pts[0], pts[-1]
    dx, dy = b[0] - a[0], b[1] - a[1]
    n = math.hypot(dx, dy)
    im, dm = 0, -1
    for i in range(1, len(pts) - 1):
        p = pts[i]
        d = abs(dx * (a[1] - p[1]) - dy * (a[0] - p[0])) / n if n else math.hypot(p[0] - a[0], p[1] - a[1])
        if d > dm: im, dm = i, d
    if dm <= tol: return [a, b]
    return simplify(pts[:im + 1], tol)[:-1] + simplify(pts[im:], tol)

def d_of(segs, tol=.0006, small=0):
    out = []
    for s in segs:
        if small:
            xs = [q[0] for q in s]; vs = [q[1] for q in s]
            if max(xs) - min(xs) < small and max(vs) - min(vs) < small: continue   # an island too small to be seen
        s = simplify(s, tol)
        if len(s) < 2: continue
        out.append('M' + 'L'.join('%d %d' % (round(x * U), round(v * U)) for x, v in s))
    return ''.join(out)

def coast():
    segs = []
    for geo, step in ((grab('ne_50m_land.geojson'), 1), (grab('ne_50m_lakes.geojson'), 1)):
        for ft in geo['features']:
            g = ft['geometry']
            for poly in ([g['coordinates']] if g['type'] == 'Polygon' else g['coordinates']):
                for ring in poly:
                    if len(ring) < 3: continue
                    lats = [c[1] for c in ring]
                    if max(lats) < 0: continue                      # nothing of the southern half is in the band
                    segs += line([vec(lat, lon) for lon, lat in ring[::step]], close=True)
    return d_of(segs, .0006, .002)

def graticule():
    segs = []
    for lon in range(-180, 180, 15):
        segs += line([vec(lat / 2.0, lon) for lat in range(-176, 180)])
    for lat in range(-75, 90, 15):
        segs += line([vec(lat, lon / 2.0) for lon in range(-360, 361)], close=True)
    return d_of(segs, .0007)

# ---- the players, the relay and the exit: everything the Rago Route flows join ----
# Only what the band shows can be drawn: the view is a cap around (80 N, 8 E), so Asia is reachable
# through the high latitudes (Siberia, the steppe), never through Tokyo or Beijing, too far south.
CITIES = {'frankfurt': (50.11, 8.68), 'paris': (48.85, 2.35), 'milan': (45.46, 9.19),
          'dublin': (53.35, -6.26), 'stockholm': (59.33, 18.07), 'kyiv': (50.45, 30.52),
          'bucharest': (44.43, 26.10), 'novosibirsk': (55.03, 82.92), 'yakutsk': (62.03, 129.73),
          'astana': (51.13, 71.43), 'moscow': (55.75, 37.62)}
FLOWS = [('milan', 'paris'), ('milan', 'frankfurt'), ('kyiv', 'frankfurt'), ('stockholm', 'frankfurt'),
         ('dublin', 'paris'), ('bucharest', 'frankfurt'), ('novosibirsk', 'frankfurt'),
         ('yakutsk', 'frankfurt'), ('astana', 'paris'), ('moscow', 'frankfurt'),
         ('frankfurt', 'paris')]
PINS = [('frankfurt', 'Frankfurt', 'relay', ''), ('paris', 'Paris', 'exit', ' lf')]

def pct(name):
    """a city -> its place in the drawing, in percent of the box the page gives the globe"""
    x, v, z = proj(vec(*CITIES[name]))
    return (x + 1) / 2 * 100, v / K * 100, v

def arc(a, b, steps=26):
    """great circle from a to b, lifted off the globe so the flow reads as a road above the map"""
    A, B = vec(*CITIES[a]), vec(*CITIES[b])
    d = math.acos(max(-1.0, min(1.0, dot3(A, B))))
    lift = min(LIFT_MAX, LIFT * d)
    for _ in range(40):
        pts, top = [], 1.0
        for i in range(steps + 1):
            t = i / steps
            k = (1 + lift * math.sin(math.pi * t)) / (math.sin(d) or 1)
            P = [k * (math.sin((1 - t) * d) * A[j] + math.sin(t * d) * B[j]) for j in range(3)]
            x, v, _z = proj(P)
            pts.append((x, v)); top = min(top, v)
        if top >= VTOP or lift < .004: break
        lift -= .004                                    # too high: it would reach the cards
    return 'M' + 'L'.join('%d %d' % (round(x * U), round(v * U)) for x, v in pts)

def flows():
    paths = [arc(a, b) for a, b in FLOWS]
    dl = ['' if i == 0 else ' style="animation-delay:-%.2fs"' % (RUN * i / len(paths))
          for i in range(len(paths))]
    order = [0, 5, 2, 8, 4, 1, 9, 3, 10, 6, 7]          # so neighbours never pulse together
    g = lambda c: '<g>' + ''.join('<path class="%s" pathLength="100"%s d="%s"/>' % (c, dl[order[i]], paths[i])
                                  for i in range(len(paths))) + '</g>'
    out = ['          <svg class="x-orb-fx" viewBox="-%d 0 %d %d" preserveAspectRatio="xMidYMid meet">' % (U, 2 * U, round(K * U))]
    out += ['            ' + g(c) for c in ('ln', 'pg', 'pz')]
    out.append('          </svg>')
    for name, label, role, cls in PINS:
        px, py, _ = pct(name)
        out.append('          <span class="x-opin%s" style="--px:%.2f%%;--py:%.2f%%"><i></i><b>%s<em>%s</em></b></span>'
                   % (cls, px, py, label, role))
    for name in CITIES:
        if name in ('frankfurt', 'paris'): continue
        px, py, _ = pct(name)
        out.append('          <span class="x-opin sm" style="--px:%.2f%%;--py:%.2f%%"><i></i></span><!-- %s -->' % (px, py, name))
    return '\n'.join(out) + '\n'

def main():
    dd, n = dots()
    xl = round(math.sqrt(U * U - (U - VMAX * U) ** 2))      # where the limb leaves the bottom of the drawing
    svg = ('          <svg class="x-orb-gl" viewBox="-%d 0 %d %d" preserveAspectRatio="xMidYMid meet">\n'
           '            <path class="lm" d="M-%d %dA%d %d 0 0 1 %d %d"/>\n'
           '            <path class="gr" d="%s"/>\n'
           '            <path class="dt" d="%s"/>\n'
           '            <path class="cs" d="%s"/>\n'
           '          </svg>\n') % (U, 2 * U, round(K * U), xl, round(VMAX * U), U, U, xl, round(VMAX * U), graticule(), dd, coast())
    fx = flows()
    s = open(PAGE).read()
    for tag, blk in (('globe', svg), ('flows', fx)):
        a, b = s.index('<!-- %s -->' % tag) + len('<!-- %s -->' % tag), s.index('<!-- /%s -->' % tag)
        s = s[:a] + '\n' + blk + '        ' + s[b:]
    open(PAGE, 'w').write(s)
    deep = max(pct(c)[1] for c in CITIES)
    print('globe:', n, 'dots,', len(svg) // 1024, 'KB of SVG;', len(FLOWS), 'flows,',
          len(CITIES), 'pins, the deepest at %.1f%% of the drawing' % deep)

if __name__ == '__main__':
    main()

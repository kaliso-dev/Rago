"""Draw the night planet of the "Three ways in" section (img/x/planet.webp): the top cap of the Earth,
seen from a point in the South Atlantic, so Europe and the east of North America sit near the limb.

Sources, both free to use: the city lights of NASA's Black Marble (4096x2048 equirectangular, as shipped
with three-globe) and the coastlines of Natural Earth 50m (public domain). They are downloaded once into
a cache outside the repo. The projection constants below are repeated in page.html (orbGeo) so that the
Frankfurt and Paris pins and the Rago Route flows land on the right spot of the image.

    python3 site/tools/make_planet.py            # writes site/img/x/planet.webp

The image is the top band of the globe: width 2R, height K*R, its top edge tangent to the top of the disc.
Everything outside the disc is transparent, so the page shows black space above the limb."""
import json, math, os, sys, tempfile, urllib.request
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'img', 'x', 'planet.webp')
CACHE = os.path.join(tempfile.gettempdir(), 'rago-planet')
SRC = {
    'earth-night.jpg': 'https://raw.githubusercontent.com/vasturiano/three-globe/master/example/img/earth-night.jpg',
    'ne_50m_land.geojson': 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_land.geojson',
    'ne_50m_lakes.geojson': 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_lakes.geojson',
}
# ---- the same numbers in page.html (orbGeo) ----
LAT0, LON0 = -10.0, 8.0   # the point of the globe at the center of the disc: Europe then sits in the middle of the visible cap
K = 0.50                    # height of the image, in radius: the page never shows more than .46 R of cap
W = 5120                    # width of the image = 2 R, so R = 2560 px
SS = 3                      # samples per pixel on each axis
MW, MH = 12288, 6144        # the coastlines, drawn equirectangular before being projected

def grab(name):
    os.makedirs(CACHE, exist_ok=True)
    p = os.path.join(CACHE, name)
    if not os.path.isfile(p):
        print('download', name)
        req = urllib.request.Request(SRC[name], headers={'User-Agent': 'rago-site-build'})
        with urllib.request.urlopen(req, timeout=180) as r, open(p, 'wb') as f:
            f.write(r.read())
    return p

def land_mask():
    """land in white, lakes back in black, equirectangular MW x MH"""
    im = Image.new('L', (MW, MH), 0)
    d = ImageDraw.Draw(im)
    def rings(geo, v):
        for ft in geo['features']:
            g = ft['geometry']
            polys = [g['coordinates']] if g['type'] == 'Polygon' else g['coordinates']
            for poly in polys:
                for i, ring in enumerate(poly):
                    pts = [((lon + 180) / 360 * MW, (90 - lat) / 180 * MH) for lon, lat in ring]
                    if len(pts) > 2: d.polygon(pts, fill=v if i == 0 else (0 if v else 255))
    rings(json.load(open(grab('ne_50m_land.geojson'))), 255)
    rings(json.load(open(grab('ne_50m_lakes.geojson'))), 0)
    return np.asarray(im)

def main():
    H = int(round(W * K / 2))
    R = W / 2
    print('image', W, 'x', H, 'R', R)
    mask = land_mask()
    night = np.asarray(Image.open(grab('earth-night.jpg')).convert('L')).astype(np.float32) / 255.0
    NH, NW = night.shape
    p0, l0 = math.radians(LAT0), math.radians(LON0)
    d = np.array([math.cos(p0) * math.cos(l0), math.cos(p0) * math.sin(l0), math.sin(p0)])
    e = np.array([-math.sin(l0), math.cos(l0), 0.0])
    n = np.array([-math.sin(p0) * math.cos(l0), -math.sin(p0) * math.sin(l0), math.cos(p0)])
    LAND = np.zeros((H, W), np.float32)
    LIGHT = np.zeros((H, W), np.float32)
    RHO = np.zeros((H, W), np.float32)
    IN = np.zeros((H, W), np.float32)
    cols = (np.arange(W, dtype=np.float64)[None, :] + 0.0)
    STEP = 64
    for r0 in range(0, H, STEP):
        r1 = min(H, r0 + STEP)
        rows = np.arange(r0, r1, dtype=np.float64)[:, None]
        land = np.zeros((r1 - r0, W), np.float32)
        light = np.zeros((r1 - r0, W), np.float32)
        rho = np.zeros((r1 - r0, W), np.float32)
        ins = np.zeros((r1 - r0, W), np.float32)
        for sy in range(SS):
            y = 1.0 - (rows + (sy + 0.5) / SS) * 2.0 / W
            for sx in range(SS):
                x = (cols + (sx + 0.5) / SS) * 2.0 / W - 1.0
                r2 = x * x + y * y
                ok = r2 <= 1.0
                rho += np.sqrt(np.minimum(r2, 4.0)).astype(np.float32)
                ins += ok.astype(np.float32)
                z = np.sqrt(np.clip(1.0 - r2, 0, None))
                px = x * e[0] + y * n[0] + z * d[0]
                py = x * e[1] + y * n[1] + z * d[1]
                pz = x * e[2] + y * n[2] + z * d[2]
                lat = np.arcsin(np.clip(pz, -1, 1))
                lon = np.arctan2(py, px)
                mu = np.clip(((lon + math.pi) / (2 * math.pi) * MW).astype(np.int32), 0, MW - 1)
                mv = np.clip(((math.pi / 2 - lat) / math.pi * MH).astype(np.int32), 0, MH - 1)
                land += np.where(ok, mask[mv, mu] / 255.0, 0).astype(np.float32)
                fu = (lon + math.pi) / (2 * math.pi) * NW - 0.5
                fv = (math.pi / 2 - lat) / math.pi * NH - 0.5
                u0 = np.floor(fu).astype(np.int32); v0 = np.floor(fv).astype(np.int32)
                tu = (fu - u0).astype(np.float32); tv = (fv - v0).astype(np.float32)
                ua = np.mod(u0, NW); ub = np.mod(u0 + 1, NW)
                va = np.clip(v0, 0, NH - 1); vb = np.clip(v0 + 1, 0, NH - 1)
                bl = (night[va, ua] * (1 - tu) + night[va, ub] * tu) * (1 - tv) + \
                     (night[vb, ua] * (1 - tu) + night[vb, ub] * tu) * tv
                light += np.where(ok, bl, 0).astype(np.float32)
        q = SS * SS
        LAND[r0:r1] = land / q; LIGHT[r0:r1] = light / q
        RHO[r0:r1] = rho / q;   IN[r0:r1] = ins / q
    print('projected')
    # the ground and the lights, read in the same texture: the land itself stays cool and dim, only the cities are warm
    lim = np.clip((RHO - 0.90) / 0.10, 0, 1)
    ld = np.clip(LAND * 1.6, 0, 1)
    dim = 1 - 0.55 * lim ** 1.4                      # near the limb everything is seen through more air
    ter = np.clip(LIGHT / 0.26, 0, 1) ** 1.1 * ld
    cit = np.clip((LIGHT - 0.21) / 0.42, 0, 1) ** 0.72 * ld * dim
    blur = lambda a, r: np.asarray(Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r))).astype(np.float32) / 255
    glow, halo = blur(cit, 7), blur(cit, 26)
    # the coasts, read in the drawn land: a thin line, the same width everywhere on the image
    b = blur(LAND, 1.7)
    coast = np.clip(4 * b * (1 - b), 0, 1) ** 1.25
    col = np.stack([np.full_like(RHO, 7.0), np.full_like(RHO, 10.0), np.full_like(RHO, 19.0)], -1)   # the sea at night
    col += (ld * dim)[..., None] * np.array([5.0, 5.0, 6.0])
    col += (ter * dim)[..., None] * np.array([25.0, 32.0, 43.0])
    air = np.clip((RHO - 0.74) / 0.26, 0, 1) ** 2.6
    col += air[..., None] * np.array([26.0, 58.0, 104.0])
    col += (coast * 0.3 * (1 - 0.6 * lim))[..., None] * np.array([86.0, 96.0, 112.0])
    col += cit[..., None] * np.array([255.0, 206.0, 134.0]) * 1.35
    col += glow[..., None] * np.array([175.0, 124.0, 66.0]) * 0.62
    col += halo[..., None] * np.array([126.0, 90.0, 50.0]) * 0.55
    # the air above the ground: a bright thin rim on the limb, and a halo that fades into the black of the page
    rim = np.clip(1 - np.abs(RHO - 0.9985) / 0.0062, 0, 1) ** 1.6
    col += rim[..., None] * np.array([90.0, 142.0, 206.0]) * 0.86
    out = np.clip(col, 0, 255)
    a = np.clip(IN, 0, 1)
    off = np.clip((RHO - 1.0) / 0.055, 0, 1)
    outer = (1 - a) * (1 - off) ** 2.2
    out += outer[..., None] * np.array([60.0, 104.0, 170.0]) * 1.5
    a = np.clip(a + outer * 0.9, 0, 1)
    rgba = np.concatenate([np.clip(out, 0, 255), (a * 255)[..., None]], -1).astype(np.uint8)
    im = Image.fromarray(rgba, 'RGBA')
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    q = int(sys.argv[1]) if len(sys.argv) > 1 else 80
    im.save(OUT, 'WEBP', quality=q, method=6)
    print('written', os.path.relpath(OUT, os.path.join(HERE, '..', '..')), os.path.getsize(OUT) // 1024, 'KB', im.size)

if __name__ == '__main__':
    main()

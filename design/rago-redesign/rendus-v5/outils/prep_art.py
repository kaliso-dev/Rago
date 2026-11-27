# Prépare les images des jeux pour l'app : webp, tailles d'affichage x2, recadrées sur le personnage.
# python3 -I prep_art.py <images> <assets/s5/games> [planche.jpg]
import sys, os
from PIL import Image
SRC, OUT = sys.argv[1], sys.argv[2]
IDS = "valorant cs2 fortnite apex pubg r6 overwatch rivals finals tarkov rl lol roblox gta minecraft bedrock".split()
# grande illustration du lanceur (case 380 x 375) : source et point d'intérêt horizontal (0..1)
HERO = {"valorant": ("heroes", .44), "cs2": ("covers", .5), "fortnite": ("heroes", .62), "apex": ("heroes", .74), "pubg": ("heroes", .5),
        "r6": ("heroes", .42), "overwatch": ("heroes", .46), "rivals": ("heroes", .45), "finals": ("heroes", .86), "tarkov": ("heroes", .24),
        "rl": ("heroes", .55), "lol": ("heroes", .42), "roblox": ("heroes", .5), "gta": ("heroes", .74), "minecraft": ("heroes", .5), "bedrock": ("heroes", .5)}
def crop(im, ar, fx=.5, fy=.5):
    w, h = im.size
    if w / h > ar:
        nw = round(h * ar); x = min(max(round(w * fx - nw / 2), 0), w - nw); return im.crop((x, 0, x + nw, h))
    nh = round(w / ar); y = min(max(round(h * fy - nh / 2), 0), h - nh); return im.crop((0, y, w, y + nh))
def save(im, kind, gid, size, q):
    d = os.path.join(OUT, kind); os.makedirs(d, exist_ok=True)
    im.convert("RGB").resize(size, Image.LANCZOS).save(os.path.join(d, gid + ".webp"), "WEBP", quality=q, method=6)
sheet = []
for g in IDS:
    cov = Image.open(os.path.join(SRC, "covers", g + ".jpg"))
    save(crop(cov, 2 / 3), "cover", g, (400, 600), 82)
    src, fx = HERO[g]
    h = Image.open(os.path.join(SRC, src, g + ".jpg"))
    hc = crop(h, 760 / 750, fx, .32 if src == "covers" else .5); save(hc, "hero", g, (760, 750), 80)
    if not os.path.exists(os.path.join(OUT, "wide", g + ".jpg")):
        save(crop(Image.open(os.path.join(SRC, "heroes", g + ".jpg")), 2.14, fx), "wide", g, (760, 355), 80)
    play = Image.open(os.path.join(SRC, "gameplay", g + "-1.jpg"))
    save(crop(play, 16 / 9), "play", g, (1600, 900), 80)
    sheet.append(g)
if len(sys.argv) > 3:
    W = Image.new("RGB", (8 * 200, 2 * 400), (20, 20, 22))
    for i, g in enumerate(sheet):
        im = Image.open(os.path.join(OUT, "hero", g + ".webp")).resize((190, 188))
        W.paste(im, ((i % 8) * 200, (i // 8) * 400))
        p = os.path.join(OUT, "wide", g + ".webp")
        if not os.path.exists(p): p = os.path.join(OUT, "wide", g + ".jpg")
        W.paste(Image.open(p).convert("RGB").resize((190, 89)), ((i % 8) * 200, (i // 8) * 400 + 200))
    W.save(sys.argv[3], quality=85)

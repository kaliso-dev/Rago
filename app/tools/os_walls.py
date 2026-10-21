"""Fonds d'écran unis de Rago OS (4K), sans logo : un dégradé très doux d'une seule teinte, une lueur à peine visible en
haut et un grain fin qui évite les bandes du dégradé. python3 tools/os_walls.py (Pillow et numpy)."""

import os

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'src-tauri', 'resources', 'os')
W, H = 3840, 2160

# (identifiant, haut, bas) : la teinte du haut est un peu plus claire, comme une lumière venue d'en haut
WALLS = [
    ('graphite', '33353B', '1A1B1F'),
    ('nuit', '1F2A40', '0D1220'),
    ('ardoise', '465160', '232A34'),
    ('brume', 'DADDE3', 'B7BCC5'),
    ('sauge', '47564C', '242C27'),
    ('prune', '4A3B50', '231B27'),
]


def rgb(h):
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], dtype=np.float32)


def make(top, bottom, seed):
    y = np.linspace(0.0, 1.0, H, dtype=np.float32)[:, None, None]
    x = np.linspace(-1.0, 1.0, W, dtype=np.float32)[None, :, None]
    # dégradé vertical adouci (courbe en S) et lueur large centrée en haut
    t = y * y * (3 - 2 * y)
    img = rgb(top) * (1 - t) + rgb(bottom) * t
    glow = np.exp(-((x * 0.9) ** 2 + ((y - 0.05) * 2.2) ** 2))
    img = img + glow * 10.0
    # coins un peu plus sombres
    img = img * (1 - 0.10 * (x ** 2) * (0.4 + y))
    rng = np.random.default_rng(seed)
    img = img + rng.normal(0.0, 0.9, size=(H, W, 1)).astype(np.float32)
    return Image.fromarray(np.clip(img, 0, 255).astype(np.uint8), 'RGB')


def main():
    os.makedirs(OUT, exist_ok=True)
    for i, (name, top, bottom) in enumerate(WALLS):
        path = os.path.join(OUT, f'wall-{name}.jpg')
        make(top, bottom, i + 1).save(path, 'JPEG', quality=88, optimize=True, progressive=True)
        print(f'{os.path.relpath(path, ROOT)}  {os.path.getsize(path) // 1024} Ko')


if __name__ == '__main__':
    main()

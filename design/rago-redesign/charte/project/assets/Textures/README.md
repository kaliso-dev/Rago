# Textures

Poster textures, each used in one place (see the brand book, "Poster effects, in moderation").

- `brush.svg`: dry red (#FF3B30) brush stroke, 1000 × 240, stretched under the lower part of the page title and rotated by `angle-brush`.
- `grain.svg`: 240px tile of white noise, laid over the whole window at `opacity-grain`. Nearly invisible on a light preview.
- `tape.svg`: black mask (300 × 56) of a torn paper strip; fill it with `paper` behind a section title.
- `num-left.svg`: black mask (300 × 330) whose left edge is torn; masks the red SignatureBlock.
- `torn-a.svg`, `torn-b.svg`: black masks (400 × 340) torn on both sides, for game art blocks.
- `vs-left.svg`, `vs-right.svg`: black masks (748 × 421) for the two halves of a versus hero.

The masks are black where the element is kept. Chrome refuses masks loaded from local files, so `components/bundle.css` inlines the ones it uses as data URIs.

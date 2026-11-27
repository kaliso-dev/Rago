# PageHead

The top of every module page: a kick line, the page title, and at the right the page's signature block.

- Kick: `rg-kick` (`kick` style, `ink-2`), module name, a red `//`, then what the page is for in a few words.
- Title: `rg-title` (`title` style, 150px, uppercase), one or two words. Set `data-t` to the same text: it draws the outline echo 14px right and 12px up at 20% white. The red brush stroke (`assets/Textures/brush.svg`) sits under the lower part of the letters, rotated by `angle-brush`.
- Right: one SignatureBlock with the page's live number (ping for Network, tweaks on for Dashboard).
- Behind: halftone dots in the top right of the window (`rg-halftone`) and grain over the whole window (`rg-grain`, `opacity-grain`).
- The brush appears once per page, under the title only.

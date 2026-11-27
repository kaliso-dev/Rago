# GameCard

A game or profile as a match poster: a 2.14:1 cover, then the name, a sub line and a square skewed action. `bg-2`, `radius-card`.

- Cover: the game's own art when Rago has it; otherwise a generated poster (`rg-poster`): a flat colour (`--p2`), halftone dots, a band rotated -16deg in `--p1`, and the name in huge 900 italic letters bleeding off the bottom left in `--p3`.
- Launcher chip (`is-cover`) top left on the cover.
- Selected: `is-sel`, `red` border with `shadow-selected` and a 3px red line under the cover; its action square turns `red`.
- Name in 20px 800 uppercase, sub line (`sub`) with the state (21 tweaks on, not optimized yet).

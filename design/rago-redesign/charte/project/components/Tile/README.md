# Tile

A setting tile: the whole 56px tile is the switch (`size-tile`, `radius-tile`), laid out three per row with 8px gaps (`rg-tiles`, `--cols`).

**States** (`rg-tile` plus)
- rest: `bg-2`, `line` border, name in `ink-2`.
- `is-on`: `bg-3`, name in `ink`, switch on.
- `is-pend`: red border at 55%, name in `ink`, hatched switch.
- `is-hover`: `bg-4`, `line-2` border; opens the Popover below the tile.
- value tile: a `.val` in `ink` and a chevron instead of a switch (opens a choice).
- `is-adv`: dashed `line-2` border on faint carbon stripes, a count in `ink-3` and a chevron. Folds the advanced and expert items.
- `is-add`: dashed border, red plus, a hint at the right. Adds something optional (backup paths).

**Consumer provides** a short name of two to four words (no nagle delay, msi mode), and the `zap` icon after the name when the change needs no restart.

# Switch

A skewed 46 × 24 switch with a square knob, `radius-chip` track and `radius-xs` knob.

- off: `bg-4` track, `ink-2` knob on the left.
- `is-on` (applied): `red` track, `red-ink` knob on the right.
- `is-pend` (chosen, not applied yet): red hatch at `angle-carbon` with a 1.5px `red` inset outline, `ink` knob on the right. It turns into `is-on` once the apply bar has run.
- In the app a switch always lives inside a setting tile (`Tile`), and the whole tile toggles it.

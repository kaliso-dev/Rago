# SegmentBar

A meter made of skewed segments, 14px high (16px `is-lg`), 3px apart (`space-3`), `radius-seg` corners.

- `i.f` filled segments in `red` show progress or what is on.
- `i.m` segments in `ink-2` show a second, neutral quantity (cached, reserved).
- Empty segments are `bg-4`.
- Pick a count that divides the real total (30 free tweaks = 30 segments, 24 levels = 24). Always pair the bar with the number in words or digits.
- As a slider (Packet Optimizer faders) add a 12 × 28 `ink` knob skewed by `angle-skew`, with a 4px `bg-2` ring.

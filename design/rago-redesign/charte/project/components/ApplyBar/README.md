# ApplyBar

The bar that applies pending changes, floating 24px above the bottom of the window, centred on the main column. Straight and rounded: never torn, never skewed.

- 640 × 72 (`size-bar`), `fx-glass` with a 24px backdrop blur, `line-2` border, `radius-bar`, `shadow-float`, carbon stripes over its right 300px.
- Left: the count or profile name in `bar-name` (`red`), then a two-line label (what is ready, and the consequence: restart needed, drops for a few seconds) with a 12px icon.
- Right: a text action (clear or restore) and the red apply button with the `zap` icon.
- It appears only when something is pending, and leaves once applied (or shows "applied / restart to finish" with a restart button).

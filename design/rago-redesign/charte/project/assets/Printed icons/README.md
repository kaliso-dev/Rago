# Printed icons

Rago's own icons for the menu, big states and the apply action. Solid shapes drawn on a 24 grid and skewed -12deg, a `paper` face (#ECE9E2) with the cut-outs in the shape, and the same shape in `red` 1.3 right and 1.5 down behind it, like a print slightly off register. Both layers have rough edges and a few specks (SVG turbulence + displacement).

- **Menu (21px):** every item shows its icon on the red layer, open or not. Use the soft filter (no specks) under 40px.
- **Big states (110 to 150px):** EmptyState and ErrorDialog, with the finer large-size grain.
- **Apply (18px):** `apply` in `red-ink` on `red-deep`, inside the red button. It replaces `zap`.
- Do not recolour the face, do not drop the red layer, do not use them inside small buttons or inputs (keep the Icons set there).

| File | Used for |
| --- | --- |
| dashboard, analysis, network, latency, graphics, windows, tools | Optimize pages |
| games, library, display, hitreg, mouse, minecraft, rbw | Play pages (library: game covers) |
| expert, restore, settings, route | Pro pages, settings, Rago Route |
| apply | the apply action |
| offline, alert | empty and error states |

The files carry their own filters so they show here; in the app, build them from `solid.py` (shared filters, one mask per icon).

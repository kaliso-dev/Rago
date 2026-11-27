# Tabs

Skewed tabs that switch the sub-pages of a module (Network: tweaks, packet optimizer, network test, rago route).

- `rg-tabs` holds `rg-tab` items, 4px apart (`space-4`), 34px high (`size-tab`), `tab` style.
- The current tab is `is-on`: `red` fill, `red-ink` label. Others sit on `bg-2` with a `line` border and `ink-2` label.
- An `<em>` after the label holds a count (pending changes on that tab), in `ink-3`, darkened on the red tab.
- Place the row under the page head, with the module's tool button (for example "restart network card", `rg-btn is-sm`) at the far right.

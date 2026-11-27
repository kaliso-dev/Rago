# Sidebar

The app's left rail, 236px wide (`size-sidebar`), `bg-2` with a `line` border on its right. Collapses to a 100px rail of icons.

- Top: the Logo lockup.
- Groups start with a `label` heading. Items are `nav` style (18px, 900 italic, uppercase) with a 21px **printed icon** (see Iconography) and a right-aligned count of tweaks in `ink-3`.
- Every item shows its printed icon with the red layer behind it, selected or not. Only the name, the bar and the wash say which page is open.
- Bottom: the PC card (`bg-3`, `radius-btn-lg`, carbon stripes) with the tweaks on, then the motto "Every millisecond counts." in `ink-3`.

## Selected item

`is-on` drives one number, `--p`, from 0 to 1. Everything follows it:

- the name (`.t`) slides 10px to the right;
- a 3px `red` bar grows from the middle on the left edge;
- the `fx-red-wash` fades in, the name goes from `ink-2` to `ink`, the count from `ink-3` to `red`.

Timing: 320ms `cubic-bezier(.16,1,.3,1)` for the item that opens, 220ms ease-out for the one that closes. With reduced motion the change is instant. `--p` is registered with `@property` so it can be transitioned.

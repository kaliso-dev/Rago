# ChoiceOptions

A profile card with one choice among a few levels, "off" included. Replaces a dropdown or a stack of switches when the options exclude each other.

- Card: `rg-prof` (`bg-2`, `radius-bar`), title in `card-title` with an optional info icon, carbon stripes on the right (`rg-carbon`).
- Options: `rg-opts` grid (`--cols`, 6px gaps) of skewed `rg-opt` cells, 46px high, `option` style, `radius-option`.
- `is-on`: the applied option, `red` fill and `red-ink` label.
- `is-pend`: the option chosen but not applied, red hatch with a `red` outline.
- `is-now`: what Windows has now when Rago changed nothing, `bg-4` with a `line-2` outline.
- `is-off`: the off option in `ink-3`; `is-wide` makes it span the row; `is-num` sets numeric levels in 27px italic.
- Exactly one option is on or now; at most one is pending.

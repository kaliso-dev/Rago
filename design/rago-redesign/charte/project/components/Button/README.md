# Button

A skewed button: the label stays upright, the fill behind it leans by `angle-skew` with `radius-btn` corners. Labels are verbs, uppercase through the style (`btn`), written in lowercase in the source.

**Variants** (`rg-btn` plus)
- `is-red`: the one main action of a view (apply, test again, analyze). `red` fill, `red-ink` label, `shadow-glow`. One per view, plus the one in the apply bar.
- default: `bg-3` fill, `line-2` border, `ink` label, for secondary actions (turn off, run again, undo all).
- `is-lg` (54px, `btn-lg`, `radius-btn-lg`) for the hero action of a panel; `is-sm` (32px, `btn-sm`, `radius-btn-sm`) for tools and section actions.
- `is-pressed` on a red button while it works: `red-deep` fill, `ink` label.
- `rg-link`: a text action (restore, clear), never a box.

**Consumer provides** the label (verb first: "apply 6 tweaks", "test all", "restart now") and an optional 15px Lucide icon before it. Use `zap` only for apply.

**Do not** put two red buttons side by side, use white text on red, or add an arrow after the label.

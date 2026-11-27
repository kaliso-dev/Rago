# Stamp

The confirmation after **Apply**: a printed stamp lands on the card that was applied. Paper block with the word cut out, the `red` layer 5px right and 6px down, rough edges, rotated -7deg. One word on top (`APPLIED`, `RESTORED`), the count under it.

Sequence (after the click):
1. The segment bar fills cell by cell over 600ms, each new cell pops 45% taller for 160ms; the "left to apply" count goes down with it.
2. The stamp drops from 2.1x to 1x in 200ms (an ease-in "slam"), the red layer slides into place over 180ms and the card shakes 3px for 300ms.
3. The button becomes `is-done` (`bg-4`, red check, "18 tweaks applied") and the sub line offers **Undo** in `red`.
4. The page score counts up over 750ms and bumps 6% at the end.

Only for actions the player started. Never stamp something Rago did on its own.

Rago Optimizer is a precision tool for competitive players, dressed like a match-day poster: black ground, one red, condensed italic capitals, cuts that lean. The interface stays calm and readable; the poster moments (brush, torn paper, red block) appear once each per page and never on controls.

Build every screen from `tokens.json`, the classes in `components/bundle.css` (all prefixed `rg-`) and the files under `assets/`. The direction is the rounded variant with poster effects in moderation.

## Principles

- **One red.** `red` (#FF3B30) means action or applied. Everything else is black, greys and white. No second accent, no gradient of red into orange.
- **Loud once, quiet everywhere else.** Per page: one title with its brush, one SignatureBlock, tapes on section titles. Tiles, options, lists and buttons stay flat.
- **The cut leans, the text stands.** Fills of buttons, tabs, options, switches and segments are skewed by `angle-skew` (-12deg); their labels are upright. Panels, cards, tiles and the apply bar are straight.
- **Measured, not promised.** Numbers come from the user's PC or network (18 ms, 12 of 30, 0.3 ms). No decorative stats, no "+300% FPS".
- **Whole-tile controls.** A setting tile is its switch; a profile is one choice among levels, "off" included; pending changes wait in the apply bar.

## Voice and copy

- US English, "you" and contractions, plain verbs. The app, the site and the account pages are in English.
- Source copy is written in lowercase or sentence case; display styles uppercase it through CSS. Body sentences stay sentence case: "Minecraft goes through Rago Route."
- Buttons are verbs that say what happens: "apply 18 free tweaks", "test again", "restart now", "select safe". The bar that applies says "apply", and the result says "applied".
- Setting names are two to four words: "no nagle delay", "msi mode", "dns cache first". Explanations live in the Popover: one sentence, one plus, one minus ("Rarely measurable in games", "No known drawback").
- Consequences are stated before the click: "drops for a few seconds", "restart needed for 2".
- Privacy and limits in one plain line: "Results go to Rago with your city and provider, never your IP."
- Product words: tweak, apply, restore, safe, advanced, expert, free, premium, lifetime. Tagline: "Every millisecond counts."
- No emoji, no exclamation marks, no hype ("insane", "boost x10").

## Colour

| Role | Tokens |
| --- | --- |
| Grounds, from back to front | `bg` → `bg-2` → `bg-3` → `bg-4` |
| Text | `ink` (titles, values), `ink-2` (secondary, icons), `ink-3` (labels, units) |
| Borders | `line` (default 1px), `line-2` (buttons, current option, apply bar) |
| Accent | `red`, text on it `red-ink`, pressed `red-deep` |
| Live and gains | `ok`, always with a word or number |
| Poster paper | `paper` (section tapes), text `red-ink` |

- Depth comes from the ground steps, not from shadows. Shadows exist only for floating things (`shadow-float`, `shadow-pop`) and the red glow (`shadow-glow`).
- Text on `red` is always `red-ink` (5.6:1); never white (3.3:1). White text is allowed on `red-deep`.
- `ink-3` is below 4.5:1 on every ground (3.9:1 on `bg`): keep it for 11.5px labels next to a value that carries the meaning, never for a sentence. Raising it to #868690 would pass everywhere.
- Status is never colour alone: pending has a hatch and an outline, applied has a filled switch, live has the word "live".

## Typography

Two Google families, no files to ship: **Barlow Condensed** (`--font-display`, weights 700 to 900, italic for display) and **Barlow** (`--font-body`, 400 to 700).

- **Display** group, 900 italic, uppercase: `title` (150px page title), `num-hero` (118px live number), `grade` (88px one-word verdict), `metric` (64px), `bar-name` (54px), `stat` (52px), `card-title` (32px), `h2` (30px section title on tape), `preset` (27px), `nav` (18px sidebar).
- **Interface** group, 800 or 700 upright, uppercase with tracking: `btn-lg`, `btn`, `btn-sm`, `tile-name`, `option`, `tab`, `kick` (.2em), `chip`, `label` (.16em).
- **Text** group, Barlow: `body` (14/1.35), `pop` (13.5/1.4, 500), `sub` (12.5).
- Numbers sit tight: line-height .74 to .78, units at about a third of the size in `ink-2`, right after the number.
- Never set a sentence in the display face, never set a label in Barlow, never italicise Barlow.

## Shape

- Skewed by `angle-skew`: button fills, tabs, choice options, switch tracks, segments and spark bars, the SignatureBlock, the preset check, square card actions.
- Straight: panels, cards, tiles, chips, inputs, popover, apply bar, sidebar, logo.
- Corners grow with size: `radius-seg` 2.5 → `radius-xs` 5 → `radius-chip` 8 → `radius-btn-sm` 9 → `radius-tab` 10 → `radius-option` 11 → `radius-btn` 12 → `radius-tile` 14 → `radius-btn-lg` 16 → `radius-card` 18 → `radius-bar` 20 → `radius-panel` 22.
- Heights: `size-btn` 40, `size-btn-lg` 54, `size-btn-sm` 32, `size-tab` 34, `size-option` 46, `size-tile` 56, `size-chip` 24, `size-field` 38, `size-bar` 72.

## Poster effects, in moderation

| Effect | Where | How much |
| --- | --- | --- |
| Brush stroke (`assets/Textures/brush.svg`, red) | Under the page title only, rotated `angle-brush` | Once per page |
| Torn edge (`num-left.svg` mask) | Left edge of the SignatureBlock | Once per page |
| Torn paper tape (`tape.svg` mask, `paper`) | Behind section titles (`h2`) | One per section |
| Torn halves (`vs-left.svg`, `vs-right.svg`, `torn-a.svg`, `torn-b.svg`) | Game hero art and versus layouts | Games pages only |
| Carbon stripes (`fx-carbon` at `angle-carbon`) | Right side of hero panels, profile cards, the apply bar, the sidebar PC card | A few surfaces per page, not every panel |
| Halftone dots (`fx-halftone`, 9px) | Top right of the window; on red blocks with `fx-halftone-on-red` (8px) | Window corner, red blocks |
| Grain (`grain.svg`, `opacity-grain`) | Over the whole window | Always, barely visible |
| Outline echo | Behind the page title, 1.5px stroke at 20% white | With the title |

The apply bar, popovers, tiles, inputs and buttons are never torn, brushed or taped.

## States

| State | Look | Used by |
| --- | --- | --- |
| Applied / on | `red` fill, `red-ink` content | Switch, option, tab, preset |
| Pending (chosen, not applied) | Red hatch (`fx-hatch` / `fx-hatch-faint`, 4px at `angle-carbon`) and a 1.5px `red` inset outline | Switch, option, tile border at 55% red |
| Now (Windows default, Rago changed nothing) | `bg-4` fill, `line-2` outline | Option |
| Off | `ink-3` label | Option |
| No restart needed | `zap` icon after the tile name | Tile |
| Hover | `bg-4`, `line-2` border, Popover under the tile | Tile |
| Focus | 2px `ink` outline 4px outside, following the skew | Buttons, tabs, options, tiles |
| Unavailable on this PC | `opacity-dim` | Tile, option |
| Just applied | Printed stamp on the card, button `is-done` with a red check, Undo link | Stamp |
| Nothing to show | Big printed icon, poster title, one sentence, two actions at most | EmptyState |
| Blocked action | Dialog with a red hatched top band and the fix as the first action | ErrorDialog |

## Layout

- Window 1440 × 900 on `bg`. Sidebar 236px (`size-sidebar`), collapsible to a 100px rail. Main column padding 22px top, 40px sides (`space-40`), 44px bottom, more when the apply bar shows.
- Page order: top bar (search 340px, live stats, window controls) → PageHead (kick, title, SignatureBlock) → Tabs → sections, each opened by a SectionTape → ApplyBar floating 24px above the bottom.
- 40px between sections, 16px from a tape to its content, 14px between panels, 10px between cards, 8px between tiles, 6px between options.
- Grids: tiles three per row, presets six, stat tiles four, game cards five or six with a final "+ all games" tile.
- Text is left aligned; numbers in tables are right aligned.

## Motion

- One orchestrated entrance per page: the SignatureBlock slides in and its number counts up to the live value, then sections rise in order. No looping decoration.
- Changes answer the user: a tile turns pending on click, the apply bar slides up from below, then each pending item turns applied in sequence and the bar shows the result.
- Opening a menu item: the name slides 10px right as the red bar and wash come in, 320ms; the item that closes goes back in 220ms (Sidebar).
- After Apply: bar fills cell by cell, a printed stamp lands with a short shake, the score counts up (Stamp). The splash stamps the R the same way (Splash). A live test draws the ping line from the left (PingChart).
- Durations 90 / 160 / 240 / 420 ms with `cubic-bezier(.16,1,.3,1)`. Everything stops under `prefers-reduced-motion` and the Windows "Animation effects" setting.

## Iconography

- **Printed icons** (`assets/Printed icons`, 21 icons) are Rago's own: solid `paper` shapes skewed -12deg with a `red` layer slightly off register behind, rough edges. They are the menu icons (21px, red layer on every item), the big icons of empty and error states (110 to 150px) and the apply icon (a double chevron that replaces `zap`).
- **Lucide outline icons** (`assets/Icons`, 43 icons) stay for controls: inside buttons, inputs, chips and the top bar. 24px grid, 2px stroke, round caps and joins, 16px (13px in small buttons). Inline SVG with `stroke: currentColor`, default `ink-2`.
- No flames, no rockets.
- Platform and launcher logos (Windows, Steam, Riot) are not part of this system: name them in a chip instead.

## Logo

- The red R from `assets/Logos/rago-mark.svg` (viewBox 164 × 180) is the brand mark. In the app it is the first letter of RAGO: mark, 1px gap, "AGO" in Barlow Condensed 900 italic (see the Logo component).
- The R stays `red` (#FF3B30); white (`rago-mark-white.svg`) only on red or on a photo. Never rotate, skew, outline, add a gradient, glow or neon.
- The printed R (`paper` face, `red` layer off register, rough edges) is for the app icon and the splash only. App icon: `rago-app-printed-dark.svg` on a dark tile, `rago-app-printed-16.svg` at 16px.
- App icon: `rago-app-icon.svg` (R on transparent). Opaque square: `rago-app-tile.svg`. Under 32px: `rago-favicon.svg`.
- `rago-wordmark-white.svg` and `rago-wordmark-ink.svg` are the earlier wordmark set in Geist; keep them on the site and installer until a v5 wordmark exists, not inside the app.

## Rules that replace the October charter (v1.2)

- Type: Barlow Condensed and Barlow replace Geist and Geist Mono.
- Titles, labels, buttons and tabs are uppercase through CSS (v1.2 said no shouted capitals); sentences stay sentence case.
- Pills (999 radius) are gone: buttons and tabs are skewed with 9 to 16px corners.
- The apply action uses the printed double chevron (`apply`), not a flash.
- Poster textures (brush, torn paper, carbon, halftone, grain) are part of the brand, within the limits above.
- Unchanged: Rago red #FF3B30 and `red-ink` text on it, the black ground scale, `ok` green, the R and its rules. v1.2 warning (#FFD60A) and info (#5AB8FF) colours are not used in v5.

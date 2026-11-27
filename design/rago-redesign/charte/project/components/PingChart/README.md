# PingChart

The network test result for one server, drawn like the printed icons.

- The line is `paper`, 3px, square joins, with a `red` copy 2px right and 2.6px down under it and rough edges on both.
- Under the line, `red` halftone dots fading towards the axis.
- Time runs like a match clock: `00:00`, `00:10`, `00:20`… with small ticks every 2 seconds. Values on the left every 10 ms, `ink-3`.
- The average is a dashed `red` line with an `AVG 18` paper tape at its end. The worst spike gets a paper tape with its value on a stem. A lost packet is a hatched `red` column with a `red` tape "LOST", and the line breaks there.
- The latest sample is a small `red` square tilted -12deg.
- Under the chart, a scoreboard: four skewed `bg-3` cells (best, worst, spikes, lost). A cell turns `red` with `red-ink` text only when it is a problem.

While a test runs, the line draws in from the left, the clock reads `LIVE 00:19` and the scoreboard shows dashes until the end.

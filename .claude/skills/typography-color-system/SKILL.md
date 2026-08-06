---
name: typography-color-system
description: Use to audit typographic scale and text-color role usage for consistency across SupplyFlow screens — font weight/size pairing, line-height, and correct use of --sf-text/--sf-text-muted/--sf-text-subtle for hierarchy. Trigger when reviewing visual consistency across screens or adding new text content.
---

# Typography & Color System (SupplyFlow)

## Text color hierarchy (must match across all screens)

- `var(--sf-text)` / `.sf-text` (implicit default) — primary content:
  headings, main values, primary labels.
- `var(--sf-text-muted)` / `.sf-muted` — secondary content: helper text,
  timestamps, counts.
- `var(--sf-text-subtle)` / `.sf-subtle` — tertiary content: placeholders,
  disabled-adjacent hints, least important metadata.
- `var(--sf-accent)` / `.sf-accent` — interactive/brand emphasis only, not
  as a substitute for primary text color.
- Status hues (`--sf-rose`, `--sf-amber`, `--sf-sky`, `--sf-violet`) — only
  for their semantic meaning (error/warning/info/highlight), never as
  arbitrary decoration.

## Checklist

1. **Weight/size pairing** — this app leans on bold/black weights
   (`font-bold`, `font-black`) for emphasis rather than large size jumps;
   check new text follows the existing weight scale used by sibling
   elements instead of introducing a new size/weight combo.
2. **Hierarchy match** — a value that's "primary" on one screen
   (e.g. a request number) should use the same color role wherever it
   recurs, not `--sf-text` in one file and `--sf-text-muted` in another for
   the same semantic role.
3. **Line-height / truncation** — long dynamic text (restaurant names,
   product names) should `truncate` with a sane `max-w-*` rather than wrap
   unpredictably or overflow its container.
4. **Numeric alignment** — counters/quantities that update frequently
   (stock steppers, progress `x/y`) should use `tabular-nums` so digit width
   doesn't jitter the layout on change.
5. **No ad-hoc opacity for muting** — use `--sf-text-muted`/`--sf-text-subtle`
   tokens instead of `opacity-60`-style hacks to fake a muted color, since
   that also fades borders/icons unintentionally and breaks in one theme.

## Output

File:line findings for hierarchy mismatches, ad-hoc muting, or missing
`tabular-nums` on jittery counters, each with the concrete token/class fix.

---
name: design-token-architect
description: Use when adding new design tokens or modifying existing ones in src/index.css — ensures a token lands in the right scope (html.light/html.dark vs shared :root), has correct light+dark values, meets contrast requirements, and doesn't duplicate an existing token. Trigger whenever a screen needs a color/radius/shadow value that doesn't already exist as a token.
---

# Design Token Architect (SupplyFlow)

`src/index.css` is the single source of truth for the design system:
`html.light` / `html.dark` blocks hold theme-dependent tokens (`--sf-bg`,
`--sf-surface`, `--sf-text`, `--sf-text-muted`, `--sf-text-subtle`,
`--sf-accent`, `--sf-border`, …); a shared `:root`-adjacent block holds
theme-independent accent hues (`--sf-violet`, `--sf-amber`,
`--sf-amber-contrast`, `--sf-sky`, `--sf-rose`) which since commit `b302d99`
are ALSO defined per-theme (`html.light`/`html.dark`) because a single
shared hue can't hit AA contrast in both themes at once — follow that
pattern for any new hue token.

## Before adding a token

1. **Search first** — grep `src/index.css` for an existing token that
   already covers the need (don't create `--sf-text-secondary` if
   `--sf-text-muted` already means that).
2. **Decide scope** — does the value need to differ between light and dark?
   If yes, it MUST live inside both `html.light` and `html.dark` blocks with
   different values, not a single shared declaration. If no (rare — e.g. a
   fixed brand mark color), a shared block is fine, but document why.
3. **Pair a `-contrast` token when needed** — any token meant to be used as
   a solid fill behind text (like `--sf-amber` behind "Take Order") needs a
   sibling `--sf-<name>-contrast` text color that's readable on that fill in
   that theme, instead of a hardcoded hex text color at the call site.
4. **Verify contrast** — new text-role tokens must be ≥4.5:1 against the
   surface they render on, in both themes (see `wcag-audit` skill for the
   full method).
5. **Name convention** — `--sf-<role>` for semantic tokens
   (`--sf-text`, `--sf-accent`), `--sf-<hue>` for raw accent hues used as
   status colors, always prefixed `--sf-`.
6. **No per-component overrides** — never hardcode a hex/rgba as a
   one-off `style={{ color: '#...' }}`; add or reuse a token instead.

## Output

If asked to review rather than implement: file:line findings for any new
hardcoded value that should have been a token, or a token added to the
wrong scope, each with the concrete token name/placement fix.

# Design Token Contract

Single source of truth for the SupplyFlow design system. Defined in
`src/index.css`. **Dark is the product default.** Theming switches by remapping the
`--sf-*` primitives under `html.dark` / `html.light` (toggled in `App.tsx`); semantic
tokens are exposed to Tailwind v4 via `@theme inline`, so each semantic utility
resolves to the active theme automatically — no `isLight ? …` branching needed.

## Semantic color tokens → Tailwind utilities

| Token | Utility examples | Role | Dark | Light |
|---|---|---|---|---|
| accent | `bg-accent` `text-accent` | Primary brand/action | `#10b981` | `#059669` |
| accent-hover | `hover:bg-accent-hover` | Accent hover state | `#34d399` | `#10b981` |
| accent-contrast | `text-accent-contrast` | Foreground on accent | `#020617` | `#ffffff` |
| app | `bg-app` | App background | `#020617` | `#f1f5f9` |
| surface | `bg-surface` | Card / panel surface | `#0f172a` | `#ffffff` |
| elevated | `bg-elevated` | Raised surface | `#1e293b` | `#ffffff` |
| inset | `bg-inset` | Recessed / inputs | `#020617` | `#f1f5f9` |
| text-primary | `text-text-primary` | Primary text | `#f1f5f9` | `#0f172a` |
| text-secondary | `text-text-secondary` | Secondary text | `#94a3b8` | `#475569` |
| text-muted | `text-text-muted` | Muted / hint text | `#64748b` | `#64748b` |
| border-default | `border-border-default` | Default border | `#1e293b` | `#e2e8f0` |
| border-strong | `border-border-strong` | Emphasized border | `#334155` | `#cbd5e1` |
| success | `text-success` `bg-success` | Positive status | `#10b981` | `#059669` |
| warning | `text-warning` | Pending / caution | `#f59e0b` | `#d97706` |
| danger | `text-danger` | Overdue / destructive | `#f43f5e` | `#e11d48` |
| info | `text-info` | Informational | `#3b82f6` | `#2563eb` |

## Static scales

| Scale | Tokens |
|---|---|
| Radius | `--radius-chip` 8px · `--radius-control` 12px · `--radius-card` 16px · `--radius-sheet` 24px → `rounded-chip/control/card/sheet` |
| Motion duration | `--duration-fast` 150ms · `--duration-base` 250ms · `--duration-slow` 400ms |
| Motion easing | `--ease-standard` · `--ease-emphasized` · `--ease-spring` |
| Spacing | Tailwind default 4px-based scale (unchanged) |
| Type | Tailwind default ramp for now; a semantic ramp + weight policy lands with the Typography work in Phase 2 |

## Accessibility foundations (global, in `index.css`)
- **Focus visibility:** app-wide `:focus-visible` ring using the accent token
  (keyboard-only; no effect for mouse/touch). Fixes the prior total absence of focus
  indicators.
- **Reduced motion:** `@media (prefers-reduced-motion: reduce)` neutralizes
  non-essential animation/transition.
- **Safe areas:** `pt-safe` / `pb-safe` / `pl-safe` / `pr-safe` / `px-safe` helpers.

## Migration rules (for Phase 2)
1. Replace `isLight ? 'bg-white' : 'bg-slate-900'` with `bg-surface`, etc. — delete
   the ternary.
2. Never hardcode a color scale value in a component; use a semantic token.
3. Off-scale radius/spacing/motion values are not allowed — extend the scale in
   `index.css` if a genuine new step is needed, and document it here.
4. Verify contrast in **both** themes (see `mobile-design-standards` skill).

## Status
Phase 0 is **additive and behavior-preserving**: existing slate/emerald utilities
still render identically; the token layer is available for the incremental
component migration in later phases.

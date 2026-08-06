---
name: design-system-guardian
description: Use to verify a component or screen in SupplyFlow only uses the shared design-token system (var(--sf-*) / .sf-* classes from src/index.css) and shared components, with no hardcoded colors or dark-only Tailwind utility classes. Trigger before merging any UI change or when asked to check design-system consistency.
---

# Design System Guardian (SupplyFlow)

SupplyFlow has exactly ONE design system, defined in `src/index.css` as CSS
custom properties scoped to `html.light` / `html.dark` (plus a small shared
`:root` block for accent hues) and a `@layer components` set of `.sf-*`
utility classes (`.sf-card`, `.sf-pill`, `.sf-inset`, `.sf-btn-ghost`,
`.sf-accent`, `.sf-muted`, `.sf-subtle`, …). Every screen must render
correctly in BOTH themes purely by inheriting these tokens.

## Checklist

1. **No hardcoded colors** — grep touched files for hex literals (`#`),
   `rgb(`/`rgba(` outside `index.css`, and raw Tailwind color utilities
   (`bg-emerald-*`, `text-slate-*`, `border-gray-*`, etc.). Any color must
   resolve through `var(--sf-*)` or an `.sf-*` class.
2. **No dark-only classes on migrated screens** — `bg-slate-*`, `text-white`,
   `text-slate-*`, `border-slate-*` are banned outside of fixed-color
   surfaces (solid-color logo marks, badges with an explicit brand color).
   If you see one, verify it renders correctly in light theme before ruling
   it a real defect.
3. **Radius/spacing/shadow scale** — components should reuse `.sf-card`
   (`border-radius` from the shared scale) and the existing `gap-*`/`p-*`
   scale already used by sibling components, not one-off arbitrary values
   (`rounded-[7px]`, `p-[13px]`).
4. **Reuse over duplication** — if the same visual pattern (card, chip,
   button, field, header) is hand-rolled in 2+ files, it should be extracted
   to a shared component instead of copy-pasted with drift.
5. **Token contrast** — new/changed tokens must meet WCAG AA (delegate exact
   contrast math to the `wcag-audit` skill) in both `html.light` and
   `html.dark`.
6. **Single source of truth** — never introduce a second token system,
   duplicate `:root` block, or component-local CSS module; extend
   `src/index.css`.

## Output

Report file:line findings only — hardcoded color / banned class / drifted
radius-spacing-shadow / duplicated pattern — each with the concrete
token-based fix. Skip anything already using tokens correctly.

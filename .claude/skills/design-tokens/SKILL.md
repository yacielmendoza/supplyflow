---
name: design-tokens
description: >-
  Establish and maintain a single source of truth for design tokens (color,
  typography, spacing, radius, elevation, motion) in this Tailwind CSS v4 + React
  project, and migrate scattered hardcoded utilities to semantic tokens. Use when
  creating or refactoring the design system, adding theming (light/dark), fixing
  visual inconsistency, or removing magic color/spacing values.
---

# Design Token Architecture (Tailwind v4 + React)

## Why
Scattered `bg-slate-900` / `text-slate-100` / `isLight ? … : …` ternaries make the
UI inconsistent and unmaintainable. Tokens give one source of truth, make theming a
data change (not a code change), and are the substrate every other design standard
(contrast, hierarchy, motion) builds on.

## Principles
1. **Two layers.** Primitive tokens (raw scale: `--emerald-500`, `--space-4`) →
   semantic tokens (intent: `--color-bg-surface`, `--color-text-primary`,
   `--color-accent`, `--radius-card`, `--elevation-1`, `--motion-fast`). Components
   consume **semantic** tokens only.
2. **Theme by remapping semantics, not by branching JSX.** Light/dark differ only in
   the semantic → primitive mapping under a `.light` / `.dark` (or
   `prefers-color-scheme`) selector. Delete `isLight ? …` ternaries in components.
3. **Name by role, not by value.** `--color-text-secondary`, never
   `--color-slate-400`.
4. **One scale each.** Spacing (4-based), radius, type ramp, elevation, motion
   durations/easings — no off-scale one-offs.

## Tailwind v4 pattern (`@theme` + CSS variables)
Define tokens in `src/index.css` with the `@theme` directive so they become Tailwind
utilities, and drive theming with CSS variables:

```css
@import "tailwindcss";

@theme {
  --color-accent: var(--sf-accent);
  --color-bg-app: var(--sf-bg-app);
  --color-bg-surface: var(--sf-bg-surface);
  --color-text-primary: var(--sf-text-primary);
  --color-text-secondary: var(--sf-text-secondary);
  --color-border: var(--sf-border);
  --radius-card: 1rem;
  --ease-emphasized: cubic-bezier(0.2, 0, 0, 1);
}

:root, .dark { /* dark is the product default */
  --sf-accent: #10b981;
  --sf-bg-app: #020617;
  --sf-bg-surface: #0f172a;
  --sf-text-primary: #f8fafc;
  --sf-text-secondary: #94a3b8;
  --sf-border: #1e293b;
}
.light {
  --sf-bg-app: #f1f5f9;
  --sf-bg-surface: #ffffff;
  --sf-text-primary: #0f172a;
  --sf-text-secondary: #475569;
  --sf-border: #e2e8f0;
}
```

Then components use `bg-bg-surface text-text-primary border-border rounded-card`
with **no** light/dark ternary — the cascade handles the theme.

## Migration playbook
1. Inventory current usage: `grep -rEo "(bg|text|border)-(slate|emerald|amber|rose|orange|purple)-[0-9]+" src | sort | uniq -c | sort -rn`.
2. Map each recurring value to a semantic token (surface, elevated surface, text
   primary/secondary/muted, accent, success/warn/danger, border).
3. Introduce tokens in `index.css`; migrate **one component at a time**,
   behavior-preserving; delete the `isLight` branch as you go.
4. Verify contrast on both themes (see the `mobile-design-standards` skill) and that
   no visual regression occurred.

## Definition of done
- No hardcoded color scale utilities left in components (only semantic token
  utilities).
- Light/dark differ only in `index.css` variable maps.
- Spacing, radius, type, elevation, and motion each come from one documented scale.

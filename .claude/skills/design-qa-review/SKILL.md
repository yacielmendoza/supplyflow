---
name: design-qa-review
description: >-
  Run the nine-lens per-screen design QA used by the mobile-design-auditor
  (UX, UI, accessibility, visual consistency, architecture, performance,
  scalability, maintainability, visual identity) and produce a severity-ranked
  findings list with concrete fixes. Use when reviewing a screen or component
  before or after a design change.
---

# Design QA Review — nine lenses

Run for one screen/component at a time. Read the source, then evaluate each lens and
record findings as `[Severity] lens → problem → fix`. Severity = Critical / High /
Medium / Low.

1. **UX** — Is the primary task obvious and low-effort? Are loading, empty, and
   error states designed? Is destructive/irreversible action guarded?
2. **UI** — Visual hierarchy, alignment, density, spacing rhythm, state coverage
   (default/hover/pressed/focus/disabled/selected).
3. **Accessibility** — Run the `mobile-design-standards` WCAG 2.2 gates: contrast
   (both themes), focus-visible, target size, semantics/labels, reduced motion,
   keyboard + dialog focus management, `aria-live` for async updates.
4. **Visual consistency** — Only semantic design tokens (no raw color/spacing magic
   values); consistent radius, type ramp, iconography, weight usage.
5. **Architecture** — Sensible component boundaries and props; logic separated from
   presentation; no God components.
6. **Performance** — Unnecessary re-renders, unstable keys, heavy inline work in
   render, list virtualization needs, asset/image handling, animation cost.
7. **Scalability** — Does the pattern hold with more data, roles, locales, or
   restaurants? Are strings localized?
8. **Maintainability** — Duplication, magic numbers, naming, dead code,
   testability.
9. **Visual identity** — Brand coherence and premium feel; motion has personality;
   result stands next to Linear/Stripe/Notion without looking amateur.

## Companion tools (prefer over reinventing)
- `/design:critique` and `/design:accessibility` (Design plugin) for structured
  critique and WCAG passes.
- Figma MCP / `/design:handoff` when a design source or handoff spec exists.
- `design-tokens` skill for the token/theming refactor a finding calls for.

## Output
A ranked findings table for the screen, then a short "recommended next changes"
list. Do not implement until the plan is approved; then apply fixes incrementally,
behavior-preserving, each justified against a standard.

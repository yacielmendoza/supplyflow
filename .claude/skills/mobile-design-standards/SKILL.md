---
name: mobile-design-standards
description: >-
  Actionable checklists for Apple Human Interface Guidelines, Material Design 3,
  and WCAG 2.2 AA applied to a mobile-first web / PWA. Use when auditing or building
  any screen or component for accessibility, touch ergonomics, safe areas, motion,
  typography, and platform-idiomatic patterns.
---

# Mobile Design Standards — HIG · Material 3 · WCAG 2.2 AA

Use these as pass/fail gates during the per-screen workflow. Cite the specific gate
when reporting a finding.

## WCAG 2.2 AA (must pass)
- **Contrast:** text ≥ 4.5:1 (≥ 3:1 for ≥ 24px bold / large); UI/graphic boundaries
  and focus indicators ≥ 3:1. Check **both** themes.
- **Focus visible (2.4.7) + not obscured (2.4.11):** every interactive element has a
  clear `:focus-visible` ring; sticky headers must not cover the focused element.
- **Target size (2.5.8):** interactive targets ≥ 24×24 CSS px, with adequate
  spacing; prefer ≥ 44×44 for primary touch actions.
- **Name/Role/Value (4.1.2):** icon-only buttons need `aria-label`; use native
  `<button>`/`<a>`; toggles expose pressed/expanded state; inputs have `<label>`.
- **Reduced motion (2.3.3):** honor `@media (prefers-reduced-motion: reduce)` —
  disable non-essential `animate-pulse`/`animate-bounce`/transforms.
- **Status messages (4.1.3):** live updates (new request arrived, saved) announced
  via `aria-live` region.
- **Keyboard:** fully operable; visible order matches DOM order; no traps; Escape
  closes modals; focus is trapped inside open dialogs and restored on close.
- **Color not sole channel (1.4.1):** status conveyed by icon/label + color, not
  color alone.

## Apple HIG (iOS/PWA)
- Respect **safe areas** (`env(safe-area-inset-*)`) top/bottom/sides.
- **Clarity & deference:** content first; chrome minimal; generous negative space.
- **Hit targets** ≥ 44×44 pt for primary controls.
- **Type:** clear hierarchy; avoid all-caps body; limit simultaneous heavy weights
  (`font-black`/`font-extrabold`) — reserve heaviest weight for one element per view.
- **Motion:** subtle, spatial, reversible; use spring/emphasized easing, not linear.
- **Standard patterns:** bottom tab bar for primary nav on mobile; sheets for
  focused tasks; avoid nested scrolling traps.

## Material Design 3
- **Tokens & roles:** surface / surface-container / primary / on-surface, etc.
  (mirror with this project's semantic tokens).
- **Elevation & state layers:** hover/pressed/focus/dragged state layers on
  interactive surfaces; consistent elevation scale.
- **Shape scale:** consistent corner-radius tokens (small/medium/large).
- **Motion:** MD3 emphasized/standard easing + duration tokens; container transform
  for card→detail transitions.
- **Touch feedback:** ripple/state feedback on press.

## Mobile ergonomics & IA
- Primary actions reachable in the thumb zone (bottom third).
- One primary action per screen; secondary actions de-emphasized.
- Every list has explicit **empty / loading / error** states.
- No horizontal page overflow; wide content scrolls inside its own container.
- Progressive disclosure over dense walls of controls.

## Motion & microinteractions
- Purposeful only: feedback, orientation, or continuity — never decoration.
- Durations ~150–300ms UI, emphasized easing; avoid infinite attention-grabbing
  loops except for genuinely urgent, time-critical status.
- Provide pressed/loading/success microstates for key actions.

## Reporting format
For each finding: `[Severity] Screen · Standard gate → problem → concrete fix`.

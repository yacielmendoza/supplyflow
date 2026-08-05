# SupplyFlow — Premium Mobile Design Audit

**Auditor:** `mobile-design-auditor` (Senior AI Platform Engineer + Mobile Product
Design Director)
**Scope:** Full project. **Status:** Audit complete — plan awaiting approval before
any application-code change.
**Quality target:** Apple Wallet / Apple Music / Stripe / Linear / Notion / Revolut.

> Note on live vision: findings below are derived from source. Items marked
> **(needs live vision)** require running the app / on-device capture and are handed
> to the orchestrating session or operator.

---

## 1. Snapshot

| Aspect | Current state |
|---|---|
| Framework | Vite 6 + React 19 + TypeScript, Tailwind CSS v4, Supabase, PWA |
| Design system | **None.** ~**502** hardcoded color-scale utilities across 12 files, themed via inline `isLight ? … : …` ternaries |
| Design tokens | **None** (no `@theme`, no semantic variables; `index.css` is ~37 lines) |
| Accessibility | **0** `aria-*` / `role` / `tabIndex` / `sr-only` / `focus-visible` / `prefers-reduced-motion` occurrences in `src/` |
| Component primitives | **None** (no shared Button/Card/Badge/Sheet; markup duplicated per screen) |
| Motion | `motion` installed but effectively unused; hand-rolled `animate-pulse`/`animate-bounce`, no reduced-motion guard |
| Typography | Weight overload — `font-black`/`font-extrabold` used heavily (~60+ spots); no type ramp |

**Overall verdict:** Functionally rich and genuinely mobile-first, but visually and
architecturally it reads as a prototype, not a premium product. The single highest
-leverage fix is introducing a **design-token + primitive-component foundation**;
almost every visual and a11y issue traces back to its absence.

---

## 2. Cross-cutting findings (highest impact)

### C1 — No design tokens; theming by JSX branching · **Critical**
Every component carries `isLight ? 'bg-white …' : 'bg-slate-900 …'`. ~502 raw color
utilities. Result: inconsistency, unmaintainability, and drift (e.g. status ambers,
roses, oranges each defined ad-hoc per file).
**Fix:** semantic token layer in `index.css` via Tailwind v4 `@theme` + CSS
variables; theme by remapping variables, delete `isLight` ternaries. → `design-tokens` skill.

### C2 — Accessibility floor is at zero · **Critical (WCAG 2.2)**
No focus-visible styles, no labels on the many **icon-only buttons** (Settings,
Volume, Bell, WhatsApp share), no `aria-live` for realtime "new request" updates, no
reduced-motion handling, modals lack focus trap / Escape / focus restore, native
`<select>` is the only labeled control. Fails 2.4.7, 2.5.8, 4.1.2, 4.1.3, 2.3.3.
**Fix:** semantics pass + focus-visible token + reduced-motion media query +
accessible dialog primitive. → `mobile-design-standards` skill, `/design:accessibility`.

### C3 — No reusable component primitives · **High**
Buttons, cards, badges, chips, filter tabs, sheets are re-implemented inline in each
screen (see `RequestsList.tsx`, `Header.tsx`). Same "emerald pill button" exists in
5+ variants.
**Fix:** extract `Button`, `IconButton`, `Card`, `Badge`, `StatusPill`, `Chip`,
`Sheet/Modal`, `Tabs`, `EmptyState` primitives consuming tokens.

### C4 — Typographic hierarchy overload · **High**
Nearly everything is `font-black`/`font-extrabold`; when everything shouts, nothing
leads. No type scale.
**Fix:** define a type ramp (display/title/body/caption + 2–3 weights); reserve the
heaviest weight for one element per view.

### C5 — Motion is decorative, not systematic · **Medium**
`animate-pulse` on pending badges, urgent tags, "on the way" icons, connection dot,
`animate-bounce` on the notification count — several looping animations compete for
attention and ignore `prefers-reduced-motion`. `motion` lib is dead weight.
**Fix:** motion tokens (durations/easings), reserve looping motion for genuinely
urgent/time-critical status only, use `motion` for card→detail and list transitions,
guard with reduced-motion.

### C6 — PWA polish gaps · **Medium**
Manifest ships a single SVG icon marked `any maskable` (maskable needs safe-zone
padding, and iOS wants PNG sizes); `theme-color` is static (won't match light theme);
`user-scalable=no` disables pinch-zoom (a11y concern).
**Fix:** proper maskable + 192/512 PNG icons, per-theme `theme-color`, reconsider
zoom lock. **(icon rendering needs live vision to verify safe zone)**

---

## 3. Per-screen findings (nine-lens summary)

### Login (`LoginScreen.tsx`)
- First impression sets the "premium" bar; **(needs live vision)** for spacing/feel.
- Ensure large thumb-friendly user targets, focus order, labeled language toggle.

### Header (`Header.tsx`) · High
- Icon-only buttons lack `aria-label`; role dropdown is a custom menu without
  `role="menu"`/keyboard nav/Escape/outside-click close/focus return.
- Restaurant `<select>` has no visible `<label>` (only an icon).
- Weight/'`animate-bounce`' badge; density is tight — verify 44px targets **(live vision)**.

### Requests list (`RequestsList.tsx`) · High
- The card is a **~180-line conditional-class monolith** with ~10 nested theme
  branches — the strongest case for tokens + a `RequestCard` primitive.
- Status conveyed largely by color; ensure icon+label pairing everywhere (1.4.1).
- Filter tabs are custom buttons — expose selected state via `aria-pressed`/tablist.
- Multiple simultaneous `animate-pulse` (pending, urgent, overdue) — attention
  conflict; keep at most one.
- Good: real empty state exists. Improve loading/skeleton state (currently none).

### Daily checklist (`DailyChecklist.tsx`) · Medium
- Numeric stock inputs need labels, `inputMode="numeric"`, and clear min-threshold
  affordance; verify large tap targets and error/validation states.

### Shopping mode (`ShoppingModeModal.tsx`) · High
- Modal needs focus trap, Escape-to-close, scroll lock, and `aria-modal`/labelled
  title; item toggles need accessible pressed state.

### Admin catalog (`AdminCatalog.tsx`) · Medium
- Densest screen (112 color utilities). Forms need labels/validation; benefits most
  from primitives + tokens; consider list virtualization at scale.

### Analytics (`AnalyticsDashboard.tsx`) · Medium
- Charts/metrics: apply the `dataviz` conventions (accessible categorical palette,
  legends, contrast in both themes). **(needs live vision for chart legibility.)**

### Notifications / Profile / PWA prompt · Medium
- Same modal-accessibility and token issues as C2/C3.

---

## 4. Phased plan (proposed — approve before code changes)

**Phase 0 — Foundations (no visual change intended)**
1. Introduce semantic **design tokens** in `index.css` (`@theme` + CSS variables),
   plus spacing/radius/type/elevation/motion scales.
2. Add global **focus-visible**, **reduced-motion**, and safe-area utilities.
3. Document the token contract.

**Phase 1 — Primitives**
4. Build token-driven `Button`, `IconButton`, `Card`, `Badge`, `StatusPill`, `Chip`,
   `Tabs`, `Sheet/Modal` (accessible: focus trap, Escape, restore), `EmptyState`,
   `Skeleton`.

**Phase 2 — Per-screen migration (behavior-preserving, one screen at a time)**
5. RequestsList → `RequestCard` + tabs primitive; remove theme ternaries.
6. Header → IconButtons with labels + accessible menu.
7. Modals (Shopping, Notifications, Profile, PWA) → `Sheet` primitive.
8. Checklist, AdminCatalog, Analytics, Login.

**Phase 3 — Motion & microinteractions**
9. Replace ad-hoc animations with motion tokens; add card→detail + list transitions;
   pressed/loading/success microstates; consolidate looping motion.

**Phase 4 — PWA & polish**
10. Maskable/PNG icons, per-theme `theme-color`, install/offline polish.

**Phase 5 — QA**
11. Nine-lens pass per screen (`design-qa-review`), `/design:accessibility` audit,
    contrast check both themes, and **(live vision)** device/screenshot review.

**Guardrails:** each change is incremental, behavior-preserving, justified against a
standard, and lands on `claude/mobile-app-audit-premium-qeiy7c`. No business-logic /
data-flow changes.

---

## 5. What needs live vision (delegated)
- Pixel-level spacing/hierarchy feel per screen; on-device gesture/scroll behavior.
- Animation timing/personality on device; reduced-motion verification.
- Maskable icon safe-zone; chart legibility; contrast spot-checks in real rendering.

These are handed to the orchestrating Claude session / operator to run the app and
capture screenshots; the auditor consumes those artifacts and updates findings.

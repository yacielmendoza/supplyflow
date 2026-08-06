---
name: mobile-ux-review
description: Use when reviewing or designing a mobile screen or flow in SupplyFlow for UX quality — navigation clarity, feedback on actions, empty/loading/error states, reachability, and gesture ergonomics. Trigger before shipping any screen or flow change, or when asked to review UX.
---

# Mobile UX Review (SupplyFlow)

SupplyFlow is a mobile-first PWA used one-handed, often with wet/gloved hands
in a kitchen or on a delivery run. Review any touched screen against this
checklist and report concrete findings (file:line, problem, fix) — do not
just restate the checklist.

## Checklist

1. **Feedback** — every tap that changes state (claim order, mark purchased,
   submit checklist) gives immediate visual + haptic/audio feedback
   (`playAlertSound`) and, where async, a loading/disabled state so a second
   tap can't double-submit.
2. **Reachability** — primary actions sit in the thumb zone (lower two-thirds
   of the screen); avoid burying frequent actions in the top-right corner.
3. **Empty/loading/error states** — every list (RequestsList, NotificationsView,
   AdminCatalog) has a designed empty state and a way to tell "loading" from
   "actually empty."
4. **No modals** — this project bans `fixed inset-0` overlays/backdrops.
   Flows must resolve via full-screen views or inline panels. Flag any new
   modal-shaped pattern.
5. **Progressive disclosure** — forms (AdminCatalog product/restaurant forms)
   show the minimum fields needed; advanced/rare fields are secondary.
6. **Undo over confirm** — prefer an undoable action (toast + undo) to a
   confirmation step, except for destructive/irreversible actions (delete
   product/restaurant), which should have deliberate friction.
7. **Consistency across the 9 core screens** — LoginScreen, Dashboard,
   RequestsList, DailyChecklist, AdminCatalog, AccountView, NotificationsView,
   ShoppingView, Header/BottomNav — the same interaction pattern (e.g. swipe,
   tap-to-expand, stepper) should behave identically wherever it recurs.
8. **BottomNav safe area** — content must never sit under `BottomNav`; check
   bottom padding accounts for `env(safe-area-inset-bottom)`.

## Output

List only genuine findings, ranked Alto/Medio/Bajo, each with file, line,
concrete problem, and concrete fix. If nothing new is found, say so
explicitly rather than padding the report.

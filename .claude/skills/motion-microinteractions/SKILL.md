---
name: motion-microinteractions
description: Use when adding or reviewing animations and microinteractions built with the `motion` library in SupplyFlow — verifies prefers-reduced-motion handling, tasteful duration/easing, and that motion communicates state rather than decorating it. Trigger for any new animation or transition.
---

# Motion & Microinteractions (SupplyFlow)

Reference feel: Apple Wallet/Music, Linear, Stripe — motion is fast,
purposeful, and never in the way. It confirms an action happened; it never
delays the user from the next one.

## Checklist

1. **`prefers-reduced-motion` is respected** — any non-essential animation
   (entrance transitions, decorative movement) must be skipped or reduced to
   an opacity/instant change when the user has reduced motion enabled. Check
   for a shared hook/utility before hand-rolling a media query per component.
2. **Duration** — micro-interactions (button press, checkbox toggle, chip
   state change) land in ~120–200ms; screen-level transitions (view swap,
   panel open) in ~200–300ms. Anything above ~400ms reads as slow on mobile.
3. **Easing** — use an ease-out (fast start, gentle settle) for elements
   entering/responding to input; avoid linear or bouncy/elastic easings
   unless deliberately used once for a signature moment (e.g. a success
   checkmark), not everywhere.
4. **Motion communicates state, not decoration** — a spinner, progress bar
   fill (`ShoppingView` purchase progress), or checklist stepper animates
   because it's *showing* a value changing, not because animation was added
   for its own sake.
5. **No layout thrash** — prefer animating `transform`/`opacity` over
   `width`/`height`/`top`/`left` to avoid reflow; for the two exceptions
   already in the app (progress bar width, popover height), confirm they're
   isolated to a small subtree, not the full page.
6. **Interruptible** — animations triggered by fast repeated input (stepper
   +/- taps) must not queue/stack; the latest state should win immediately.
7. **No animation blocks input** — never disable a control for the
   duration of its own confirmation animation if the action already
   completed; disable only while the async operation is actually pending.

## Output

File:line findings — missing reduced-motion guard, mistuned
duration/easing, layout-thrashing property, or animation obscuring
usability — each with a concrete fix.

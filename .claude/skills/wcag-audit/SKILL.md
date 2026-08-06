---
name: wcag-audit
description: Use to audit a SupplyFlow screen or component for WCAG 2.2 AA compliance — color contrast, touch target size, keyboard operability, focus visibility/order, and accessible names/roles/states. Trigger for any interactive UI change or when asked for an accessibility review.
---

# WCAG 2.2 AA Audit (SupplyFlow)

## Checklist

1. **Contrast (1.4.3 / 1.4.11)** — text ≥ 4.5:1 (≥ 3:1 for ≥18px/bold-14px),
   non-text UI components (icon buttons, focus rings, borders that convey
   state) ≥ 3:1. Check both `html.light` and `html.dark` values in
   `src/index.css` — a token that passes in one theme can fail in the other.
2. **Touch targets (2.5.8)** — interactive elements ≥ 24×24px minimum, but
   this project's own bar is 44×44px (iOS HIG) for primary controls; flag
   anything below 44px that isn't inline text with adequate spacing.
3. **Keyboard operability (2.1.1 / 2.1.2)** — every `onClick` on a non-`<button>`
   element (a `<div>` acting as a row/card) needs `role="button"`,
   `tabIndex={0}`, and an `onKeyDown` firing on Enter/Space. Nested
   interactive children (inputs, buttons) inside such a container must call
   `e.stopPropagation()` on both `onClick` AND `onKeyDown`, or keyboard input
   in the child (e.g. typing a space in a note field) will also trigger the
   parent's action.
4. **Focus visibility (2.4.7 / 2.4.11)** — every focusable element shows a
   visible focus ring; `outline-none` must be paired with an explicit
   `focus-visible:ring-*` (don't rely on a global CSS-layer trick without
   verifying cascade-layer precedence still wins).
5. **Accessible names (4.1.2)** — icon-only buttons need `aria-label`;
   labels that only exist via `hidden sm:inline` text disappear below that
   breakpoint and must have an `aria-label` fallback for all sizes.
6. **State communication (4.1.2)** — toggle-style buttons use
   `aria-pressed`; expandable/popover triggers use `aria-expanded` +
   `aria-haspopup`; selected items in a list use `aria-selected` /
   `role="option"`.
7. **Live regions** — content that updates without navigation (new
   notification count, submit confirmation) should be announced via
   `aria-live="polite"` where a sighted user gets a visual cue but a screen
   reader user wouldn't otherwise know.
8. **Reduced motion (2.3.3)** — animations from `motion` must respect
   `prefers-reduced-motion` (reduce/skip non-essential transitions).
9a. **Focus survival across activation-triggered unmount (2.4.3 / 2.4.7)**
   — for every focusable trigger that is itself conditionally rendered
   (`{!expanded && <button onClick={() => setExpanded(true)}>...}`), trace
   what happens to keyboard/screen-reader focus the instant it's activated.
   If activating it makes the condition false and the element itself
   unmount in the same render, focus falls to `<body>` with nothing
   announced, unless something explicitly moves it — either keep the
   trigger element mounted (only its label/icon changes, the classic
   disclosure-button pattern) or programmatically focus a specific
   surviving element (a footer control, the newly revealed region) right
   after triggering the state change. This is a generic pattern, not
   specific to any one component — grep for `{!` / `{is\w+ &&` guarding a
   `<button`/`<a` with an `onClick` that flips the same guarding boolean.
9. **Programmatic label association (1.3.1 / 4.1.2 / 3.3.2)** — every
   `<input>`/`<select>`/`<textarea>` needs a name a screen reader can read
   *before* the user interacts with it: a `<label htmlFor>` pointing at a
   matching `id`, a `<label>` wrapping the control, or `aria-label`/
   `aria-labelledby`. Visual proximity to a `<label>` without `htmlFor`/`id`
   is not sufficient — many screen reader/browser combinations announce the
   control with no name at all. A bare `placeholder` is not a label either:
   it vanishes the moment the user types, so it fails 3.3.2 for fields with
   no other visible caption. Grep the file for `<label` and confirm each one
   pairs with `htmlFor`/`id` or wraps its control; grep for `<input`/
   `<select`/`<textarea` and confirm each one resolves to a label some way —
   don't stop at the first form in the file, check every repeated/generated
   instance (inline "add" forms, per-row edit cards, settings panels) since
   the same missing-label bug tends to be copy-pasted across all of them.
10. **A pattern migration reported for one file is not closed until you've
   grepped the whole repo for the same interaction shape.** When migrating
   one instance of a UI pattern (e.g. `aria-pressed` → `aria-current` for a
   single-select group of mutually-exclusive buttons) based on a finding
   reported in ONE file, grep the entire repo for the same interaction
   shape — a group of buttons where exactly one represents the current
   selection (avatar pickers, theme/language toggles, filter chips, "active
   account" lists) — before considering the finding closed. Don't scope the
   fix to just the file where it was originally reported. This is a real
   recurrence, not a hypothetical: the same defect was fixed this cycle in
   two files but reappeared, un-migrated, in two other files with
   structurally identical controls that were never re-checked with the same
   criterion.

## Method

Read the actual current file, don't infer from a diff. For contrast, extract
the two hex values involved and compute the ratio; don't eyeball it.

## Output

File:line findings ranked by severity, each with the failing criterion
number and a concrete fix (exact `aria-*` attribute or class to add).

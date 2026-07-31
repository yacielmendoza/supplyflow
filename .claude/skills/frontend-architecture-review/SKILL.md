---
name: frontend-architecture-review
description: Use to review React component architecture in SupplyFlow — component boundaries, prop drilling, duplicated JSX that should become shared components, state placement, and render performance (memoization, list rendering). Trigger for structural changes or when asked to assess maintainability/scalability.
---

# Frontend Architecture Review (SupplyFlow)

## Checklist

1. **Component boundaries** — a component should own one screen/concern;
   flag components mixing data-fetching, business logic, and deep JSX for
   multiple unrelated sub-views (a case for splitting).
2. **Prop drilling** — if a prop passes through 3+ component layers
   untouched just to reach a leaf, consider context or colocating state
   closer to where it's used, matching how `currentUser`/`t` are already
   threaded in this app.
3. **Duplicated JSX → shared component** — the same card/chip/button/field
   markup hand-rolled in multiple files (`AdminCatalog`, `RequestsList`,
   `ShoppingView`, …) should be extracted once and reused, keeping ONE
   design system implementation rather than N drifting copies.
4. **Render performance** — for lists (RequestsList, AdminCatalog catalog
   list, NotificationsView), check stable `key` usage (not array index for
   reorderable/filterable lists), and whether expensive child components
   should be wrapped in `React.memo` given how often their parent re-renders
   (e.g. on Supabase Realtime updates or a fast-ticking timer for overdue
   detection).
5. **Avoid unnecessary re-renders** — inline arrow functions/object
   literals passed as props to memoized children defeat memoization; prefer
   `useCallback`/`useMemo` when the child is expensive or the list is large.
   Don't over-apply this to cheap leaf components — it's not free either.
6. **State placement** — local UI state (popover open/closed, form draft)
   stays local; only promote to `App.tsx`/shared state when 2+ siblings
   actually need it.
7. **Scalability of data flow** — CRUD operations should go through
   `src/lib/api.ts` consistently (matching the existing
   `submitDailyChecklist`/`toggleItemPurchased` Supabase pattern), not
   bypass it with ad-hoc fetch calls in components.
8. **Type safety** — no new `any`; derived types (like `Translations` from
   `translations.es`) should stay the pattern for any new cross-cutting
   type rather than hand-duplicating a shape.

## Output

File:line findings for genuine architectural debt — duplicated pattern
worth extracting, missing memoization on a real hot path, prop drilling
past 3 layers, or state placed too high/low — each with a concrete
refactor recommendation. Don't recommend abstraction for patterns used only
once.

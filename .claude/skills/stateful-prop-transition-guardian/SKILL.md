---
name: stateful-prop-transition-guardian
description: Use to check what happens to a component's own useState (especially state that's lazily initialized from a prop, or persisted to localStorage keyed by a prop) when an identifying prop (a restaurant/user/request/date id) changes WITHOUT the component unmounting. Trigger for any component that (a) reads a prop into useState's initializer, (b) persists state to storage keyed by a prop value, or (c) is rendered without a `key` tied to the identifier that scopes its data.
---

# Stateful Prop-Transition Guardian (SupplyFlow)

Two consecutive audit cycles found the same defect *shape* in the same
component (`DailyChecklist`) via two different doors. Cycle N: state
was lost when switching tabs and back (fixed by persisting a draft to
`localStorage` keyed by restaurant+day). Cycle N+1: state was
**silently corrupted** when switching *restaurant* via the Header's
selector while staying on the same tab — because the component never
unmounts on that transition, its `useState` initializers (which only
run once, at mount) never re-read the new restaurant's draft, and the
persistence `useEffect` (which *does* re-run, since it depends on
`selectedRestaurant.id`) immediately overwrites the new restaurant's
saved draft with the stale in-memory state from the old one. Real
consequence: an admin/cook supervising two restaurants can destroy a
second location's saved progress with a single tap on the Header's
restaurant switcher, with no warning.

The lesson: fixing "state lost on unmount/remount" is not the same
problem as "state stale/wrong when an identifying prop changes without
a remount." Both must be checked independently.

## Checklist

For any component that owns `useState` derived from an identifying
prop (restaurant id, user id, request id, selected date, etc.) — most
commonly via a lazy initializer (`useState(() => ...prop...)`) or a
`localStorage` draft keyed by that prop:

1. **Identify every prop that scopes this component's data.** Ask: if
   this prop's value changes while the component stays mounted (parent
   re-renders it with new props instead of unmounting/remounting), does
   any local state need to change too?
2. **Lazy `useState` initializers only run once.** `useState(() =>
   computeFromProp(prop))` captures `prop`'s value at first mount only.
   If `prop` can change later without an unmount, that state is now
   silently wrong/stale unless something else re-syncs it.
3. **Trace every `useEffect` that persists state keyed by the
   identifying prop.** If such an effect's dependency array includes
   the prop (so it re-fires on prop change) but the state values it
   writes were never re-synced to match the new prop (per #2), the
   effect will overwrite the *new* target's saved data with data that
   actually belongs to the *old* one. This is the exact bug: the
   persistence fix was real and correct for its own dependency array,
   but ran against state that hadn't caught up yet.
4. **Two valid fixes — confirm one is actually applied:**
   - **(a) Force remount:** the parent renders the component with
     `key={identifyingProp}` so React tears down and recreates the
     instance (and its lazy initializers re-run with fresh props) on
     every change of that identifier. Simplest, reuses whatever
     mount-time logic already exists.
   - **(b) Explicit re-sync effect:** a `useEffect` keyed on the
     identifying prop that re-reads/derives all dependent local state
     *before* any persistence effect can run with stale data. Needed
     when a full remount would be wasteful or would lose transient
     UI-only state (open/closed panels, scroll position) that should
     survive the prop change.
   Either is acceptable; the absence of both is the bug.
5. **Don't stop at the transition that was already tested.** If a
   previous fix covered "unmount and remount" (e.g. tab switch), that
   is not evidence the "same component, new identifying prop, no
   remount" transition (e.g. a sibling selector changing the id prop)
   is safe — test/reason about it as a separate case explicitly.
6. **A shared-device app has an identity dimension beyond restaurant/date:
   the logged-in user.** This surfaced as a third variant of the same bug
   family (tab switch → restaurant switch → now user switch): a
   `localStorage` key scoped only by restaurant+date silently hands one
   user's unsent draft to the next person who logs in on the same device,
   because `handleLogout`/`handleSelectUser` don't reset the id the draft is
   keyed by. When auditing a persisted-draft key, explicitly enumerate
   *every* identity dimension actually in play for this app — restaurant,
   date, AND current user — and check each one independently, not just the
   ones a previous cycle already fixed. If the key intentionally omits a
   dimension (e.g. restaurant+date is kept shared across users on purpose,
   for shift handoff), that's a legitimate design choice only when the UI
   makes the handoff explicit (e.g. an "resuming X's draft" banner with a
   discard option) — an omitted dimension with no such disclosure is the bug,
   not a design choice.

## Method

For each component with an identifying prop and local persisted state:
grep for `useState(() =>` initializers referencing that prop, and for
`useEffect(...)`/`useLayoutEffect(...)` blocks whose dependency array
includes it. Check whether the component is ever rendered by its
parent *without* a `key` tied to that same prop — if so, trace what
happens to the lazily-initialized state across a prop change.

## Output

File:line findings, each naming: the identifying prop, the local state
that goes stale, the persistence effect that would write the stale
state under the new prop's storage key, the concrete user action that
triggers data loss, and which fix applies (`key={prop}` on the parent's
JSX, or an explicit re-sync effect) with the exact line to change.

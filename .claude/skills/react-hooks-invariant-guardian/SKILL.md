---
name: react-hooks-invariant-guardian
description: Use to check that every hook (useState/useMemo/useCallback/useEffect/useLayoutEffect/custom hooks) in a component runs on every render, in the same order, regardless of branch — i.e. no hook is declared after a conditional/early `return`, inside an `if`/`for`/ternary, or after a branch that only executes for some prop/state values. Trigger for any new or edited hook in a component that also has an early return (a loading/error/"no session" guard clause) or conditional rendering branches.
---

# React Hooks Invariant Guardian (SupplyFlow)

An audit pass caught a real production crash: a commit that memoized
`getNavTabs()` with `useMemo` in `App.tsx` placed the new hook call
**after** the component's existing early `return <LoginScreen/>` (the
"no session" guard). `tsc --noEmit` and `npm run build` both passed —
this is a *runtime* invariant of React, not a type or compile error.
The crash ("Rendered more hooks than during the previous render") only
fires the moment the branch count actually changes between two
consecutive renders of the *same mounted component instance* — i.e.
exactly at login (no-session render → session render) and logout
(session render → no-session render). Any test session that reuses a
persisted `localStorage` session never re-exercises the `null` branch,
so this class of bug survives casual manual testing indefinitely.

## The rule

React identifies each hook by **call order**, not by name or variable.
For one component, across every render of its lifetime, the exact same
sequence of hook calls must execute — same count, same order, same
types. Anything that makes a hook call conditional on props/state
breaks this.

## Checklist

For every component you touch that has an early `return` (loading
guard, `if (!user) return <Login/>`, `if (error) return <ErrorState/>`,
a route/tab short-circuit, etc.) **or** any conditional rendering
branch:

1. **Every hook call sits above every early `return` in the component
   body.** `useState`, `useMemo`, `useCallback`, `useEffect`,
   `useLayoutEffect`, `useRef`, `useContext`, and any custom hook
   (`useSomething()`) all count. A hook declared textually after a
   `return` is only reached on renders that don't take that return —
   an immediate violation the moment the component ever takes both
   branches across its lifetime (which "worked in my test" cannot
   rule out, since the guard branch may only fire once per mount).
2. **No hook call is inside an `if`, loop, `&&`, ternary consequent, or
   any other conditional expression.** `if (x) { useEffect(...) }` and
   `x ? useMemo(...) : fallback` are both violations even if `x` looks
   "always true in practice."
3. **A hook's own dependency values, not its presence, carry the
   conditional logic.** The fix is never "only call this hook
   sometimes" — it's "always call the hook; branch inside its callback
   or via its dependency array." (This is exactly the fix applied to
   the `App.tsx` incident: the `useMemo` itself moved above the
   `return`, and the branching on `currentUser` moved inside the memo
   callback via `currentUser?.role`.)
4. **New hooks added to fix a *different* audit finding (memoization,
   perf, a11y) are the highest-risk injection point.** A perf-motivated
   `useMemo`/`useCallback` retrofitted into an existing component is
   the most common way this bug gets introduced — the author is
   focused on the memoization, not on where in the function body it
   landed relative to existing early returns.
5. **`tsc --noEmit` and `npm run build` passing is not evidence this
   is fine.** Confirm by reading the actual line position, or by
   manually reproducing both branches (e.g. clear `localStorage` and
   do a real first login, then log out) — never accept "compiles
   clean" as proof for this specific class of bug.

## Method

Grep the touched file for hook calls (`use[A-Z]\w*\(`) and for `return`
statements. For every component function, produce the linear order in
which its `return`s and hook calls appear in source; flag any hook
that appears textually after a `return` that isn't the component's
final/unconditional return, or any hook nested inside a conditional
block.

## Output

File:line findings, each naming the hook, the early return or
conditional it sits after/inside, the exact React error this produces
("Rendered more/fewer hooks than during the previous render"), the two
concrete renders that trigger it (e.g. "first login after clearing
localStorage" / "logout"), and the fix (move the hook above the return;
push the conditional into the hook's callback/deps instead).

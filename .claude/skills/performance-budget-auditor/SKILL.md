---
name: performance-budget-auditor
description: Use to audit SupplyFlow against explicit performance budgets — production bundle size, code-splitting of route/tab-level views, and memoization on data paths that re-render from Supabase Realtime events. Trigger after `npm run build`, when adding a new tab/screen or a new dependency, or when asked for a performance review.
---

# Performance Budget Auditor (SupplyFlow)

This project had no owner for bundle size or render-cost regressions for
5+ audit cycles — findings like "614 kB main chunk" kept getting
documented and reprioritized away because no skill claimed it as its
responsibility. This skill exists to give performance an explicit,
checkable budget instead of a vague "keep it fast" aspiration.

## Budgets

1. **Main JS chunk ≤ 500 kB minified** (Vite's own warning threshold).
   Run `npm run build` and read the chunk size table. If the main
   (non-vendor, non-lazy) chunk exceeds this, it's a finding — not a
   "someday" item.
2. **Every tab/screen component is code-split.** Views only reached via
   tab navigation or a drill-in screen (not the default landing view)
   should be `React.lazy`-loaded with a `Suspense` boundary, so their code
   downloads on first navigation, not on initial page load. Check `App.tsx`
   for any new tab/screen added as a static top-of-file import instead of
   `lazy(() => import(...))`.
3. **Vendor libraries are chunked separately from app code.** Large,
   infrequently-changing dependencies (Supabase client, `motion`, React
   itself) belong in `build.rollupOptions.output.manualChunks` in
   `vite.config.ts` so browsers cache them across app-code deploys instead
   of re-downloading on every release.
4. **Realtime/derived data is memoized.** Any computation that runs off
   `supplyRequests`/`products` (filters, `.sort()`, counts, grouped stats)
   and is re-triggered on every Supabase Realtime event
   (`postgres_changes` in `App.tsx`) must be wrapped in `useMemo` with
   correct dependencies — a component sibling to one that already memoizes
   an analogous computation (e.g. `DailyChecklist`'s memoized progress
   counts) and doesn't is an inconsistency worth flagging even before it's
   measurably slow.
5. **No new dependency added without checking its cost.** Before adding a
   library, check its unpacked size (`du -sh node_modules/<pkg>`) and
   whether it has a lighter subpath/ESM-only export; prefer it over adding
   full CJS bulk to the main chunk.
6. **Large lists have a stated bound or a plan.** A list rendered without
   virtualization/pagination is acceptable only if the realistic data
   volume is small and bounded (say so explicitly); flag it as a real
   finding once the audit can't make that argument (e.g. an unbounded
   historical list).

## Method

Run `npm run build` and read the actual chunk output — don't guess sizes.
Grep `App.tsx` for the import style of every tab/screen component. Grep
touched data-derivation code for `useMemo`/`useState` usage and compare
against sibling components solving the same shape of problem.

## Output

A short budget scorecard (chunk size vs 500 kB, code-split coverage,
memoization gaps found) plus file:line findings for anything over budget,
each with the concrete fix (what to lazy-load, what to memoize, what to
move into `manualChunks`).

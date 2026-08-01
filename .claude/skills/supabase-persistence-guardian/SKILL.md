---
name: supabase-persistence-guardian
description: Use to verify that changes never break SupplyFlow's public Supabase fallback (`src/lib/supabase.ts`) or the established localStorage-override persistence pattern (catalog, restaurants, session, checklist drafts). Trigger for any diff touching `src/lib/supabase.ts`, `src/lib/api.ts`, or any component that reads/writes `localStorage`.
---

# Supabase Persistence Guardian (SupplyFlow)

SupplyFlow's data model has two tiers, and both must keep working after any
change:

1. **Supabase** — real-time sync for `sf_supply_requests` via
   `src/lib/supabase.ts` and `src/lib/api.ts`. The project rule is explicit
   and non-negotiable: **never break the public Supabase fallback** — the
   app must still function (read-only or degraded) if Supabase env vars are
   absent or the client can't be constructed with real credentials.
2. **localStorage overrides** — restaurants, products/catalog, session
   user, theme/language, and (as of the checklist persistence fix)
   in-progress Daily Checklist drafts all use a `read*/persist*`-style
   helper pair (`readStoredJSON`/`persistJSON` in `App.tsx`, or a local
   equivalent) with a namespaced key. This is the load-bearing pattern that
   keeps admin edits and in-progress work alive across refresh/tab-switch
   without a backend table.

## Checklist

1. **Fallback construction stays safe.** Any edit to `src/lib/supabase.ts`
   must keep constructing a usable client (or a safe no-op/mock) when
   `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` are missing — never throw at
   module load time, never assume the env vars exist.
2. **Every `localStorage` read is wrapped in try/catch.** Storage can throw
   (private browsing, quota, disabled storage) — a raw
   `JSON.parse(localStorage.getItem(...))` with no guard will crash the
   component tree. Confirm new call sites follow the existing
   `readStoredJSON`/`persistJSON` pattern (or an equivalent local
   try/catch) rather than hand-rolling an unguarded version.
3. **Namespaced, collision-free keys.** New persisted state needs its own
   `restosupply_*`-prefixed key, scoped appropriately (e.g. per
   restaurant+date for the checklist draft, matching the existing
   `restosupply_products_override` convention) — never reuse or overload an
   existing key for a new purpose.
4. **Drafts are cleared on successful completion.** Any new "in-progress
   work" localStorage draft (modeled on the checklist draft fix) must be
   removed once its data is durably submitted/saved — an uncleared draft
   silently resurrects stale data on the next visit.
5. **Realtime subscription cleanup.** Any new `supabase.channel(...)`
   subscription must be unsubscribed in the effect's cleanup — a leaked
   channel keeps firing state updates after unmount.
6. **No blocking on the network path.** Per the existing pattern in
   `loadInitialData` (`App.tsx`), static/local data (restaurants, users,
   products) must resolve independently of the Supabase round-trip for
   `sf_supply_requests` — never make a fast, local-only path depend on a
   slow or failing network call.

## Method

Read the actual current `src/lib/supabase.ts`, `src/lib/api.ts`, and any
touched component in full. For localStorage usage, check every
`localStorage.getItem`/`setItem`/`removeItem` call site has error handling
and a namespaced key consistent with existing ones.

## Output

File:line findings: unguarded storage access, broken/removed fallback
path, key collision, missing draft-clear, or leaked subscription — each
with the concrete fix. If nothing is broken, say so explicitly.

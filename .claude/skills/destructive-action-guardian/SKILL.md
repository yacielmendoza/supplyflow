---
name: destructive-action-guardian
description: Use to audit any control that deletes, discards, resets, or overwrites persisted data — a delete button in an admin list, a "Discard"/"Reset" banner, a clear-all action — for whether it requires confirmation or an undo window, and whether its real scope matches what its label implies. Trigger for any onClick wired to a delete/remove/discard/reset/clear handler, or any control whose label reads as "discard my view"/"reset mine" but whose underlying action can affect data another tab, device, or user also depends on.
---

# Destructive Action Guardian (SupplyFlow)

No existing skill specifically audits "does this action destroy data
without confirmation, and whose data is it?" `mobile-ux-review` touches
the edge of this (it prefers undo-over-confirm for reversible actions
and calls out destructive/irreversible actions as deserving deliberate
friction) but has no dedicated check for *scope* — whether a single tap
quietly reaches further than the user believes. `cross-tab-sync-guardian`
audits the mechanics of syncing shared state across tabs, but not
whether an action that *discards* shared state is scoped correctly. An
audit cycle found two independent instances of the same bug class in
unrelated files in the same pass: deleting a product in the admin
catalog fires immediately with no confirmation step at all
(`AdminCatalog.tsx`, both the mobile card view and the desktop table
row), and the "Mantener la mía / Descartar" ("Keep mine / Discard")
conflict banner in a shared checklist draft (`DailyChecklist.tsx`) has
a "Descartar" button that does not discard "my local view" — it calls
`resetToDefaults()` and removes the shared `localStorage` key outright,
deleting the entire shared draft for every open tab, including a
coworker's tab that is mid-edit at that exact moment. Neither bug was
caught by any existing checklist because neither `mobile-ux-review` nor
`cross-tab-sync-guardian` treats "confirm before destroy" and "verify
the real scope of a discard" as a first-class, always-checked pair.

## Checklist

For every control that deletes, discards, resets, or overwrites data
that survives past the current render (persisted to Supabase or
`localStorage`, not just transient in-memory UI state):

1. **Every action that deletes/discards/overwrites persisted data
   requires confirmation or an undo window.** A single `onClick={() =>
   onDeleteProduct(p.id)}` (or equivalent remove/reset/clear handler)
   firing immediately, with no intermediate step, is the bug by
   default — a mistaken tap permanently destroys real data with no
   recovery path. The required friction is an inline two-tap confirm
   (per this repo's zero-modal rule: no `fixed inset-0` popup/dialog —
   the control itself flips to a "tap again to confirm"/"¿Seguro?"
   state, or reveals an inline confirm affordance next to it) or a
   toast-with-undo window that keeps the data recoverable for a few
   seconds after the tap. A loading/disabled state during the request
   is not a substitute for this — it prevents a double-submit, not a
   single deliberate-looking accidental tap. Flag every delete/discard/
   reset handler with neither mechanism, naming the exact user action
   (one tap, no warning) that causes permanent data loss.
2. **For data shared across tabs/devices/users, verify the REAL scope
   of the action — don't trust the button's label.** Read the handler's
   actual implementation, not its label or the surrounding copy. If the
   data being acted on is shared (a `localStorage` draft another tab
   also reads, a Supabase row another user can also see), trace exactly
   what the handler does: does it mutate/clear only a local, per-tab
   view of the data (safe to label "discard my view"/"keep mine"), or
   does it delete/overwrite the underlying shared resource itself
   (`removeItem` on the shared key, a Supabase `delete`/`update` with no
   per-user scoping)? "Discard my view of this shared thing" and
   "delete the shared thing for everyone" must be two distinct
   affordances with distinct labels and distinct confirmation weight —
   they must never share a single button, and never share a label that
   implies only the former while the code does the latter. If a control
   labeled as a personal/local action actually reaches shared state,
   that mismatch is itself the finding, independent of whether
   confirmation (item 1) is also missing.

## Method

Grep the reviewed files for delete/remove/discard/reset/clear handlers
(`onDelete*`, `onRemove*`, `onDiscard*`, `onReset*`, `onClear*`, and any
`onClick` calling `localStorage.removeItem`/a Supabase `.delete()`/
`.update()` that nulls out or overwrites a record). For each one: read
the actual handler body (not the button's label/copy) to determine what
it destroys and whose data it is; check whether the surrounding JSX
gates the call behind a second tap, an inline confirm state, or an undo
window; and, if the underlying data is shared across tabs/devices/users
(cross-reference with any `window.addEventListener('storage', ...)` or
multi-user Supabase table in scope), confirm the label and the blast
radius match.

## Output

File:line findings, each naming: the handler and what it actually
deletes/discards/overwrites, whose data it is (current user's local
view only, vs. a shared resource), which of the two checks fails, the
concrete one-tap accident scenario, and the specific fix (inline
two-tap confirm pattern already used elsewhere in the app, an undo
window, or splitting one button into two correctly-scoped and
correctly-labeled affordances). If every destructive action in scope
already has adequate confirmation and correctly-scoped labeling, say so
explicitly.

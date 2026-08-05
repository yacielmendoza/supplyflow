---
name: cross-tab-sync-guardian
description: Use whenever code adds or touches a `window.addEventListener('storage', ...)` listener that syncs UI state across browser tabs/devices sharing the same `localStorage` origin. Trigger for any component that persists state to `localStorage` keyed by a shared identifier (restaurant+day, a request id, a notification inbox) AND listens for that key changing elsewhere. This is a distinct bug class from same-tab state bugs — the two known real incidents in this repo were reattributed authorship and a duplicate purchase request, not a same-tab race.
---

# Cross-Tab Sync Guardian (SupplyFlow)

`DailyChecklist.tsx` persists a shared-device checklist draft to
`localStorage` and listens for `storage` events so a second cook's tab
sees the first cook's edits. The intent was sound (shift handoff on a
shared kitchen device); the first implementation shipped with two real
bugs that a same-tab-only audit checklist didn't catch:

1. **Silent overwrite of active edits.** The listener replaced local
   state unconditionally on every incoming remote write, including
   fields the local user had focus in at that exact moment. Two
   different users typing in the same restaurant/day checklist from
   two tabs could each silently lose keystrokes to the other's last
   save, with no merge and no warning.
2. **A false "no-op" on deletion.** The listener's own code comment
   described filtering `incoming.authorId === currentUser.id` as
   "skip the echo of my own save" — but the browser's `storage` event
   **never fires in the tab that made the write**, only in *other*
   tabs of the same origin. So there was no real echo to skip; the
   filter's only real effect was to also silently discard genuine
   remote deletions (`e.newValue === null`, dispatched when the other
   tab submitted or cleared the draft), because `parseDraft(null)`
   returns `null` and the handler treated "no data to apply" the same
   as "nothing changed." The result: a tab with stale data could not
   tell that the checklist had already been submitted elsewhere, and
   submitting again created a second real purchase request.

Both bugs trace back to the same root cause: the fix was built and
reasoned about against a single mental model ("my own tab's writes
echoing back") that is not how the `storage` event actually works, and
was never tested against the two-different-users-two-tabs scenario the
feature exists to support.

## Checklist

For any `window.addEventListener('storage', handler)` that syncs state
another part of the UI also writes to `localStorage`:

1. **There is no same-tab echo to filter.** The `storage` event fires
   only in tabs *other than* the one that called `localStorage.setItem`.
   If a handler filters incoming events by "is this my own write
   coming back," that check is dead code for its stated purpose — and
   worse, if it's used to gate *whether to apply an update at all*, it
   is silently rejecting genuine data from a different actor instead.
   Distinguish "stale/duplicate delivery" (compare a monotonic
   `savedAt`/version field against the last one this tab has seen) from
   "is this a different author," which are not the same test.
2. **Never blindly overwrite a field the local user is actively
   editing.** Before applying an incoming update to a piece of state
   backing a text input, checkbox, or stepper, check whether that
   control currently has focus (`document.activeElement`, or a ref set
   on focus/blur) and skip overwriting just that field — apply
   everything else. Silently discarding a user's in-progress keystrokes
   with no warning is the worst outcome available; losing to a merge
   heuristic is still bad but recoverable, and preserving the focused
   field while accepting the rest is usually the right default.
3. **A `null`/removed value is a signal, not an absence of change.**
   `e.newValue === null` means the key was deleted in another tab —
   typically "submitted" or "explicitly discarded." Code that only
   knows how to `JSON.parse` a populated value and treats a failed
   parse as "nothing to do" will silently ignore this and let a user
   act on stale local data. Name the deletion case explicitly (e.g. "a
   ready-to-submit action already fired elsewhere — disable resubmit
   and tell the user") rather than falling through a generic
   `if (!parsed) return`.
4. **Guard against a reattribution/rebroadcast loop.** If applying a
   remote update causes local state to change, and that state change
   is itself watched by the same persistence effect that writes back
   to `localStorage` (re-stamped with the local user as author/origin),
   the write will trigger a `storage` event in the *other* tab, which
   applies it and writes back again — an infinite ping-pong that
   corrupts an "authorship" or "last editor" field with each round.
   Any effect that both reacts to incoming remote state AND persists
   local state needs an explicit way to tell "this change came from
   applying a remote update" (a ref flag checked and cleared by the
   persistence effect) from "this change came from a real local edit."
5. **Mounting on top of existing shared data is not an edit.** If
   state is lazily initialized from a persisted draft at mount, the
   very first run of a persistence effect keyed on that state will fire
   with values identical to what was already on disk — but if it
   writes anyway, it reattributes authorship to whoever merely opened
   the screen, not whoever last actually changed something. Skip the
   first persistence write when the component mounted on top of
   already-existing shared data (track with a ref cleared after its
   first check), and let the *next* real state change (a real edit)
   perform the first true write.
6. **Test the actual hazard scenario, not the flow that was already
   green.** A fix that makes "close the tab, log back in as the same
   user" work correctly is not evidence the "two different identities,
   two tabs open simultaneously, both editing" scenario works — trace
   that second scenario by hand (or with two real browser contexts via
   Playwright, already available locally in this repo) before accepting
   a cross-tab sync fix as complete. This exact gap — a fix verified
   only against the single-user flow — is what let both real bugs above
   ship in a cycle whose own audit initially reported them as "closed."
7. **List every field in the synced object, not just the ones that
   motivated the fix.** A `storage` fix that adds focus/recency
   protection for the field(s) named in the incident report (e.g. a
   stock reading, a note textarea) but applies every *other* field of
   the same shared draft/object unconditionally has not actually closed
   the bug class — it closed one instance of it. When a `setState` call
   applies an incoming remote object across N pieces of local state,
   write out all N explicitly and confirm each one has the same
   protection discipline (focus ref, recent-local-interaction
   timestamp, or an explicit "safe to always overwrite" justification).
   A field added to the shared object later, or already present but not
   named in the original incident, silently inherits zero protection by
   default — this is not hypothetical: it is exactly how `isUrgent`,
   `reviewedIds`, and `showOrderPreview` in `DailyChecklist.tsx` were
   left unprotected after the `readings`/`notes` fix shipped.
8. **A wall-clock timestamp is not a safe cross-device ordering
   signal.** If "is this incoming write newer than what I have" is
   decided by comparing `Date.now()`/`savedAt` captured on two
   *different* devices, that comparison silently assumes the two
   devices' clocks agree. They often don't — an unmanaged tablet's
   clock can drift behind another device's by minutes or more. A
   drifted-behind device's genuinely newer edits will compare as
   "older" and be discarded at the freshness check, forever, with no
   error and no way for the user to know why their edit didn't stick.
   Prefer a monotonic logical counter (a `seq` that only ever advances
   from the maximum value any tab has observed — a per-draft Lamport
   clock) over a raw timestamp for ordering decisions; keep the
   timestamp, if wanted, only for human-readable "saved N minutes ago"
   display, never as the sole gate for whether an update is applied.

## Method

Grep for `window.addEventListener('storage'` and every `localStorage`
`setItem`/`removeItem` call reachable from the same component. For each
pair: trace what triggers the listener (which writer, from which other
part of the UI, under which user action), what state it touches, and
walk through steps 1–6 above against the actual current code — not
against what an earlier commit message or `CORRECCIONES_APLICADAS.md`
entry claims was fixed.

## Output

File:line findings, each naming: the storage key, the writer effect and
the listener, which of the six failure modes applies, the concrete
two-tabs user action that triggers it, and the specific code change
(ref guard, `savedAt` comparison, focus check, explicit `null` handling)
that closes it.

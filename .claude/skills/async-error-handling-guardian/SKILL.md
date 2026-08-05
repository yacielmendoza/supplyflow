---
name: async-error-handling-guardian
description: Use to check that every async UI operation in SupplyFlow (form submits, CRUD saves, shopping/checklist completion, login) reverts its loading state and surfaces an error on rejection instead of leaving a button stuck "Procesando…"/spinning forever. Trigger for any new or edited `async`/`await` handler wired to a button, form submit, or promise-returning prop.
---

# Async Error-Handling Guardian (SupplyFlow)

An audit pass found the same defect shape independently in 3 unrelated
screens: an `async` handler calls `await somePromiseProp()` with no
`try/catch`, and a "loading" boolean set to `true` right before the
`await` is never reset if the promise rejects. The user-visible result is
identical every time: a button stuck on "Procesando…"/a spinner that never
stops, no error message, no way to retry — the one action the screen
exists for becomes permanently unavailable until a full reload.

## Checklist

For every `async` function invoked from a button `onClick`, form
`onSubmit`, or similar UI trigger:

1. **Every `await` on a prop-provided promise is wrapped in `try/catch`.**
   Props like `onCompleteShopping`, `onAddProduct`, `onUpdateProduct`,
   `onAddRestaurant`, `onSelectUser` (if ever made async), `onSubmitChecklist`
   ultimately hit a network call (Supabase) and can reject — treat every one
   as fallible, never as "this always resolves."
2. **Loading/submitting state always resets, success or failure.** If a
   handler does `setIsSubmitting(true)` before the `await`, the matching
   `setIsSubmitting(false)` must run in a `finally` block (or on both the
   success path and the `catch` path) — never only after the `await` with
   no `catch`, which skips the reset entirely on rejection.
3. **A visible error surfaces on failure.** A caught rejection needs a
   user-visible signal — an inline message (existing pattern: a small
   `role="status" aria-live="polite"` banner near the action, styled with
   `tint('var(--sf-rose)', ...)`/`var(--sf-rose)` text, matching the
   success-confirmation pattern already used across the app) — not just a
   console error or a silently reopened form.
4. **The action stays retryable.** After an error, the button/form must
   return to a clickable, non-disabled state so the user can immediately
   try again — don't leave `disabled` stuck true or the form torn down.
5. **Don't swallow other in-flight local state.** On error, avoid
   resetting user input (typed note, form fields) that the user would
   otherwise have to retype — only reset the loading/submitting flag and
   show the error, leave their input intact for a retry.
6. **Watch for the pattern hiding behind `void` or fire-and-forget calls.**
   An `onClick={() => doAsyncThing()}` with no `await`/`.catch()` at the
   call site produces an unhandled promise rejection that never reaches
   any UI state at all — flag these as the same defect class, even though
   there's no loading flag to get stuck.
7. **The triggering control must be disabled/blocked for the full duration
   of the `await`, not just reverted in `catch`.** Every async handler
   triggered by an interactive control (a button `onClick`, an `onBlur`
   save) must disable or block that control while its `await` is pending —
   a loading flag that only gets *reset* on success/error is not the same
   thing as the control being unavailable *during* the pending call. A
   double-tap on mobile (common on a slow connection, where the first tap's
   visual feedback hasn't landed yet) can fire the same mutation twice
   before the first response ever updates the UI, producing two real writes
   from one user action. Check that `disabled={isSubmitting}` (or
   equivalent) is applied synchronously in the same handler that starts the
   `await`, not only inferred from a loading spinner that may not render in
   time. Real-world evidence: an audit found 3 async save/create handlers in
   one admin form component with no double-submit guard, plus a known
   duplicate-save bug in a shopping/note-editing component where `blur` and
   `click` both fire the same save call — the same repeatable bug class in
   unrelated files.

## Method

Grep touched/reviewed files for `async (` / `async function` handlers and
`await` call sites feeding UI state. For each, trace: is there a
`try/catch`? Does every state setter that flips a control into a "busy"
state have a corresponding reset on the error path? Is there a rendered
error message the user would actually see?

## Output

File:line findings, each naming the specific handler, what happens on
rejection today (stuck button / silent failure / lost input), and the
concrete fix (the `try/catch/finally` shape and the error-message pattern
to reuse from an existing screen).

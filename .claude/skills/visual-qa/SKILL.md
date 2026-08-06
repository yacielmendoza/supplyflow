---
name: visual-qa
description: Use to visually QA a SupplyFlow screen in both light and dark themes at mobile viewport width using the dev server and a browser — catches clipped content, BottomNav overlap, broken layouts, and theme-specific rendering bugs that static code review misses. Trigger before considering a screen change done, or when asked to visually verify a UI change.
---

# Visual QA (SupplyFlow)

Static review catches wrong tokens; only rendering catches actual layout
breakage. Use this whenever a screen's markup/CSS changed.

## Method

1. Start the dev server (`npm run dev`) if not already running.
2. Open the touched screen/flow in a real browser at a mobile viewport
   (≈390×844, iPhone-class) with `viewport-fit=cover` honored.
3. Check BOTH themes — toggle light/dark via the app's own theme switch
   (AccountView), not just by reading CSS; some bugs only show once actual
   computed styles cascade.
4. Check both languages (ES/EN) if the screen has variable-length strings —
   longer EN or ES strings can overflow a container that looked fine in the
   other language.

## What to look for

- Content clipped, cut off, or overlapping `BottomNav` (check the safe-area
  padding actually clears the nav bar height on a notched-device viewport).
- Any element unreadable in one theme (contrast, or a token that resolved
  to the wrong value).
- Layout shift/jump on data load (skeleton vs. final content sizing
  mismatch).
- Truncation working as intended on long restaurant/product names, not
  wrapping and breaking card height consistency.
- Interactive states (hover is irrelevant on mobile — check `:active`/press
  state, focus ring on keyboard tab) actually visible.
- Scroll behavior — no unwanted horizontal scroll, sticky headers not
  jittering.

## Output

Findings as: screen, theme(s) affected, concrete visual problem, and a
screenshot description or exact repro steps if a screenshot tool isn't
available. If everything renders correctly in both themes, say so
explicitly rather than inventing findings.

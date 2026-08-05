# UI Primitives (Phase 1)

Token-driven, accessible building blocks in `src/components/ui/`. Import from the
barrel: `import { Button, Card, Sheet } from './components/ui'`. Screens migrate to
these in Phase 2; prefer them over ad-hoc markup.

| Primitive | Purpose | Key props | A11y notes |
|---|---|---|---|
| `Button` | Primary/secondary actions | `variant` (primary/secondary/ghost/danger/success), `size` (sm/md/lg), `loading`, `leftIcon`, `rightIcon`, `fullWidth` | ≥44px target at `md`; `aria-busy` when loading; global focus-visible ring |
| `IconButton` | Icon-only control | **`label` (required)**, `variant`, `size` | Forces `aria-label`+`title` (WCAG 4.1.2); ≥40px box |
| `Card` | Surface/panel container | `padding`, `tone` (surface/inset), `interactive` | Uses `surface`/`border` tokens |
| `Badge` | Counts / small labels | `tone`, `solid` | Pairs with text, not color-only |
| `StatusPill` | Status label | `tone`, `icon` | Icon + label so status ≠ color alone (WCAG 1.4.1) |
| `Chip` | Item tags | `done` | Struck-through done state carries an icon at call site |
| `Tabs` | Segmented control / filters | `items`, `value`, `onChange`, `variant` (segmented/underline) | `role=tablist/tab`, `aria-selected`, roving focus + arrow-key nav |
| `Sheet` | Modal / bottom-sheet dialog | `open`, `onClose`, `title`, `footer`, `size` | Focus trap, Escape, focus restore, scroll-lock, `aria-modal`, backdrop dismiss, safe-area, motion enter/exit via portal |
| `EmptyState` | Zero-data state | `icon`, `title`, `description`, `action` | Consistent empty states across lists |
| `Skeleton` | Loading placeholder | `rounded` | `aria-hidden`; pulse stilled under reduced-motion |
| `Spinner` | Inline loading | `label` | `role=status` + accessible label |

## Conventions
- All colors/radii/motion come from the semantic tokens in `docs/design/design-tokens.md`.
- No `isLight ? …` branching inside primitives — the token layer handles theming.
- `cn()` (`src/lib/cn.ts`) is the dependency-free class joiner.

## Validation
`npx tsc --noEmit` clean; `npx vite build` compiles (token utilities present in the
emitted CSS). A missing `src/vite-env.d.ts` (`vite/client` types) was added, which
also resolved a pre-existing `import.meta.env` typecheck failure in `lib/supabase.ts`.

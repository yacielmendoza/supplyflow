# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Dev server (uses tsx for SSR + Vite for client HMR)
npm run dev

# Type-check only (no test suite exists)
npm run lint          # runs: tsc --noEmit

# Production build
npm run build         # vite build + esbuild server.ts → dist/

# Preview built output
npm run preview
```

The dev server runs on port 3000 (auto-detected via `.claude/launch.json`). GitHub repo: `https://github.com/yacielmendoza/supplyflow`. Vercel production deployment pulls from the `rediseno-ui-mobile` branch.

## Architecture

**Stack:** React 19 + TypeScript + Vite 6 + Tailwind CSS v4 + `motion` library. Express server (`server.ts`) serves the SPA in production only — the client is a fully client-rendered PWA.

### Data flow

`src/data/caddyShackData.ts` holds static seed data (restaurants, users, products). All **supply requests** are live via Supabase (`sf_supply_requests` table). `src/lib/api.ts` wraps all reads/writes; every function falls back to local seed data on Supabase error. `src/lib/supabase.ts` contains the client singleton + `rowToRequest`/`requestToRow` snake_case↔camelCase converters.

**⚠ NEVER touch the fallback credentials in `src/lib/supabase.ts`.** They are the only thing keeping preview/branch deployments alive when `VITE_*` env vars are absent.

Supabase Realtime is subscribed in `App.tsx` to push live `sf_supply_requests` changes to all connected clients.

### Component tree

`App.tsx` is the single state container — it owns all entities (restaurants, users, products, supplyRequests), the active tab/screen, current user, theme, and language. It passes everything down via props.

Non-Dashboard views are **lazy-loaded** via `React.lazy`:
- `DailyChecklist`, `RequestsList`, `ShoppingView`, `AdminCatalog`, `AccountView`, `NotificationsView`

`Header` + `BottomNav` are always-rendered shells. `BottomNav` receives an `activeTab` setter. `ViewHeader` is a shared back-navigation bar used inside overlay screens.

### Design system

All visual styling uses the token system in `src/index.css`. No component should use raw Tailwind color classes — use CSS custom properties instead.

**Tokens:** `--sf-bg`, `--sf-surface`, `--sf-surface-2`, `--sf-surface-hover`, `--sf-border`, `--sf-border-strong`, `--sf-text`, `--sf-text-muted`, `--sf-text-subtle`, `--sf-accent`, `--sf-accent-strong`, `--sf-accent-soft`, `--sf-accent-contrast`, `--sf-accent-2`, `--sf-rose`, `--sf-amber`, `--sf-amber-contrast`, `--sf-violet`, `--sf-sky`, `--sf-shadow`, `--sf-shadow-sm`

**Helper classes:** `.sf-card`, `.sf-inset`, `.sf-pill`, `.sf-btn-accent`, `.sf-btn-ghost`, `.sf-muted`, `.sf-subtle`, `.sf-accent`, `.sf-page`

Theming is `html.dark` / `html.light` (no Tailwind `dark:` variant). Both themes must always be correct.

Touch targets must be ≥ 44 px (`h-11` / `min-h-[44px]`). WCAG 2.2 AA contrast (≥ 4.5:1) required. Bare white on `--sf-rose` or `--sf-accent` fails — use `--sf-accent-contrast`.

### Shared utilities

- `src/lib/colors.ts` — `tint()`, `STATUS_COLORS`, `getStatusLabels(t)`, `RESTAURANT_COLOR_TOKENS`
- `src/lib/translations.ts` — bilingual (`es`/`en`) string map; all UI copy must use `t.xxx` via `getTranslation(language)`
- `src/lib/formatters.ts` — date/number formatters

### localStorage keys

| Key | Purpose |
|-----|---------|
| `restosupply_session_user` | Persisted current user |
| `restosupply_language` | Language preference |
| `restosupply_products_override` | Admin-edited catalog |
| `restosupply_restaurants_override` | Admin-edited restaurants |
| `restosupply_overdue_settings` | Overdue thresholds |
| `sf_checklist_{restaurantId}_{YYYY-MM-DD}` | In-progress checklist draft |

### Portal pattern

`ReactDOM.createPortal(content, document.body)` is used in `DailyChecklist.tsx` for the summary/action bar. This is intentional — CSS `position: fixed` scopes to the nearest transformed ancestor, not the viewport. The portal bypasses any stacking-context issues from the component tree. Do not remove it.

### Bundle splits

`vite.config.ts` defines manual chunks: `vendor-react`, `vendor-supabase`, `vendor-motion`. Tab/screen components are code-split via `React.lazy` — do not import them statically.

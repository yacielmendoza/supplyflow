# SupplyFlow Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish authenticated, multi-tenant Supabase foundations without relying on demo identities or unsafe client-side authorization.

**Architecture:** The browser authenticates through Supabase Auth and obtains only its own profile. A single SQL migration defines tenancy tables, profile bootstrap, grants, indexes, and RLS policies. Existing demo modules remain untouched until later phases replace them with persistent repositories.

**Tech Stack:** React 19, TypeScript strict mode, Vite 6, Vitest, Supabase Auth, PostgreSQL RLS, Supabase CLI.

## Global Constraints

- Do not apply a migration remotely without explicit authorization.
- Do not expose `service_role`, secret keys, or user-selectable authorization values in the browser.
- Do not remove Express, `store.json`, fixtures, or demo views in this phase.
- Keep `main` untouched; use only `codex/supplyflow-production-foundation`.
- Every verified increment receives an attempted Vercel Preview deployment; never use `--prod`.

---

### Task 1: Restore reproducible developer verification

**Files:**
- Modify: `package.json`, `package-lock.json`, `tsconfig.json`
- Create: `vitest.config.ts`

**Interfaces:**
- Produces `npm run test`, `npm run lint`, and `npm run build` verification commands.

- [ ] **Step 1: Add a failing test command**

Create a Vitest test that imports a missing `resolveSupabaseConfig()` helper and expects missing variables to produce an unavailable result.

- [ ] **Step 2: Run the focused test**

Run: `npm run test -- src/lib/supabase-config.test.ts`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Add the minimum test harness and strict compiler flags**

Add Vitest, configure its `test.include` for `src/**/*.test.ts`, and enable `strict`, `noUncheckedIndexedAccess`, and `noImplicitOverride` in TypeScript.

- [ ] **Step 4: Re-run focused tests and type checks**

Run: `npm run test -- src/lib/supabase-config.test.ts` and `npm run lint`

Expected: test still fails only because the production helper is missing; TypeScript reports existing code that must be corrected before strict mode is retained.

### Task 2: Create Supabase project and tenancy migration

**Files:**
- Create: `supabase/config.toml`
- Create: `supabase/migrations/<generated>_phase_1_identity_and_tenancy.sql`

**Interfaces:**
- Produces `public.organizations`, `public.locations`, `public.profiles`, and `public.location_memberships`.
- Produces `public.is_org_member(uuid)`, `public.is_org_admin(uuid)`, and `public.has_location_access(uuid)` predicates for later migrations.

- [ ] **Step 1: Write a migration contract test**

Create a test that reads the generated SQL and asserts it enables RLS on all four tables and contains no `TO anon` write policy.

- [ ] **Step 2: Run the focused test**

Run: `npm run test -- supabase/migrations/phase-1-contract.test.ts`

Expected: FAIL because the migration is absent.

- [ ] **Step 3: Generate and implement the migration**

Use `supabase migration new phase_1_identity_and_tenancy`. Define UUID primary keys, timestamps, role constraints, foreign keys, unique membership keys, RLS policies, indexes for membership lookups, and a guarded `auth.users` profile trigger. Revoke public function execution where applicable and grant only authenticated access.

- [ ] **Step 4: Verify migration shape without remote application**

Run: `supabase migration list --local` and the contract test.

Expected: the migration is listed locally and the test passes. Do not run `supabase db push`.

### Task 3: Add configuration and authenticated identity boundary

**Files:**
- Create: `src/lib/supabase-config.ts`, `src/lib/auth.ts`, `src/lib/auth.test.ts`
- Modify: `src/lib/supabase.ts`, `src/App.tsx`, `src/components/LoginScreen.tsx`, `.env.example`

**Interfaces:**
- `resolveSupabaseConfig(env): { available: true; url: string; publishableKey: string } | { available: false; reason: string }`
- `getCurrentProfile(client, userId): Promise<Profile>`
- `signInWithPassword(client, email, password): Promise<void>`

- [ ] **Step 1: Write failing behavior tests**

Test missing configuration, a valid public configuration, an Auth error propagated as a user-safe error, and profile lookup without a row.

- [ ] **Step 2: Run focused tests**

Run: `npm run test -- src/lib/supabase-config.test.ts src/lib/auth.test.ts`

Expected: FAIL because the helpers are absent.

- [ ] **Step 3: Implement minimal configuration and auth helpers**

Remove hardcoded Supabase fallbacks. Initialize the client only from validated public variables. Load session/profile from Auth, render sign-in/sign-out controls, and render explicit configuration/provisioning/error states. Do not alter operational request/catalog flows yet.

- [ ] **Step 4: Verify tests, lint, and build**

Run: `npm run test`, `npm run lint`, and `npm run build`.

Expected: all commands succeed before deployment.

### Task 4: Document setup and deploy a preview

**Files:**
- Modify: `README.md` if present, otherwise create `docs/phase-1-setup.md`

**Interfaces:**
- Documents required public environment variables, SQL migration application command, initial organization provisioning responsibility, and verification commands.

- [ ] **Step 1: Document preview-safe setup**

State that Preview environments require `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, never a service key, and must point to a schema with the versioned migration applied.

- [ ] **Step 2: Run final verification**

Run: `npm run test`, `npm run lint`, `npm run build`, `git diff --check`, and `git status --short`.

- [ ] **Step 3: Attempt isolated Vercel Preview deployment**

Run: `vercel deploy --yes` from this branch. Record the URL and status. Never use `--prod`, promote, push, or merge.

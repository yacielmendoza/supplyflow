# SupplyFlow Phase 1 Design

## Goal

Replace the demo identity boundary with Supabase Auth and create a versioned, RLS-protected foundation for organizations, locations, profiles, and location memberships. The existing demo domain remains in the repository until its persistent replacement is implemented and accepted.

## Decisions

- Supabase is the sole future source of operational truth. This phase creates only the identity and tenancy foundation; it does not migrate demo catalog or request records.
- Browser code uses only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Missing configuration is a visible configuration error, never a fallback project or demo data source.
- Authentication is email/password through Supabase Auth. The app derives identity from `auth.getSession()` and the `onAuthStateChange` subscription; no screen can select a role or arbitrary profile.
- Authorization lives in Postgres. Profiles identify the Auth user; organization membership and per-location memberships establish access. Roles are `admin`, `buyer`, and `cook`.
- Every table in the exposed `public` schema has RLS enabled. Policies use `TO authenticated`, `auth.uid()`, and membership predicates; no client role value is trusted.
- The migration creates the exact Fase 1 tables: `organizations`, `locations`, `profiles`, and `location_memberships`. It includes a safe profile-creation trigger for `auth.users` and grants only the database access required by RLS.
- The application moves to strict TypeScript and adds a small test harness before production modules are introduced.

## Flow

1. The browser initializes a Supabase client only when public environment variables exist.
2. The Auth provider loads the current Supabase session, then fetches the caller's `profiles` row.
3. Anonymous users see a credential form. Authenticated users with no profile see an explicit provisioning error; the app does not substitute a demo identity.
4. RLS limits profile and membership reads to the authenticated caller's organization membership. Only organization administrators can administer memberships.
5. Future request/catalog tables will reference `organizations.id` and `locations.id`, and will reuse the membership predicates introduced here.

## Failure and rollout behavior

- A missing environment variable, failed sign-in, or profile lookup error renders a clear retryable state.
- The versioned SQL migration is generated locally and is not applied to the remote project in this phase without an explicit remote-application instruction.
- Preview deployments remain separate from production. A preview without the matching Supabase schema will show the provisioning/configuration state, rather than demo content.

## Non-goals

- No deletion of Express, `store.json`, fixtures, existing request UI, or local preference drafts.
- No remote migration application, seed data, email-provider configuration, or production deployment.
- No implementation of products, suppliers, requests, inventory, Realtime notifications, or offline mutation queues; those are Phases 2-4.

# Claude Code — Design & Mobile Quality Toolchain

This folder configures a **premium mobile design audit** capability for the project.
It documents what was discovered, what was reused, and what was created (per the
official Claude Code Skill/Subagent specs) — and why.

## Detected stack
- **Build:** Vite 6 + `@vitejs/plugin-react`, TypeScript ~5.8, ESM.
- **UI:** React 19 (function components + hooks).
- **Styling:** Tailwind CSS v4 (`@tailwindcss/vite`), utility-first, dark-first.
- **Data/realtime:** Supabase (`@supabase/supabase-js`), Express (`server.ts`).
- **Icons/motion:** `lucide-react`, `motion` (Framer Motion successor).
- **Shell:** installable **PWA** (manifest, service worker, iOS meta, app badge).
- **Domain:** RestoSupply/SupplyFlow — restaurant supply coordination, mobile-first,
  bilingual (es/en), role-based (cocinero / comprador / admin).

## Discovered capabilities REUSED (not duplicated)
Found already available in this workspace — the auditor uses these instead of
recreating them:
- **`design` plugin** → `/design:critique`, `/design:accessibility`,
  `/design:handoff`, `/design:ux-copy`, `/design:research-synthesis`.
- **`figma` plugin** + **Figma MCP** → design context, tokens, and handoff.
- **`modern-web-guidance` plugin** (available to enable) → current web best practices.
- **Built-in skills** relevant to design output: `web-artifacts-builder`,
  `canvas-design`, `brand-guidelines`, `dataviz`, `artifact-design`.

No duplicate design-critique / accessibility / Figma tooling was created.

## CREATED here (capabilities that did not already exist)
### Subagent
- **`agents/mobile-design-auditor.md`** — Senior AI Platform Engineer + Mobile
  Product Design Director. Encapsulates the full mission, specialization lenses,
  per-screen workflow, standards (HIG · Material 3 · WCAG 2.2 AA), quality bar, and
  the rule to **audit and present a plan before modifying code**. It explicitly
  delegates any step needing *live/visual (rendered)* inspection to the human /
  orchestrating session, since a subagent has no live vision.

### Skills (`.claude/skills/<name>/SKILL.md`, official spec)
- **`design-tokens`** — token architecture + light/dark theming for Tailwind v4, and
  the migration playbook to remove scattered hardcoded utilities / `isLight`
  ternaries. (Design Token / Color / Typography lenses.)
- **`mobile-design-standards`** — pass/fail checklists for Apple HIG, Material 3, and
  WCAG 2.2 AA on mobile web/PWA. (Accessibility / Mobile UX / Motion lenses.)
- **`design-qa-review`** — the nine-lens per-screen QA procedure and reporting
  format. (Design QA / Code Review lenses.)

These are intentionally few and non-overlapping: the 30 requested "specializations"
are *lenses* the auditor applies, not 30 separate installs. Framework-specific
personas (Flutter / React Native / SwiftUI / Compose) inform patterns but are not
literally instantiated for this React/Tailwind PWA.

## Audit output
See **`../docs/audit/mobile-app-audit.md`** for the full findings + phased plan.

## How to use
- Invoke the auditor for any design/UX/a11y task; it will follow the per-screen
  workflow and cite standards.
- Run `/design:accessibility` or `/design:critique` for a second structured pass.
- Follow the `design-tokens` playbook for the foundational refactor before per-screen
  visual work.

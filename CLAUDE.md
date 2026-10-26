# CLAUDE.md

Guidance for AI agents working in this repo.

## What this is

**mzdy** — an administration tool for an outpatient clinic (Czech
"ambulance"). The product scope is not yet defined. The repo currently holds
only the frontend scaffold (copied from `home-hunter`): a Next.js 16 App Router
app with the shadcn/ui kit, Tailwind v4 theme, and a hello-world page. There
is no database, auth, API route, or worker yet.

## Layout

- `app/` — routes. `layout.tsx` wires fonts, theme, React Query and the
  toaster; `page.tsx` is the hello-world placeholder; `error.tsx` and
  `not-found.tsx` are the shared error screens.
- `src/components/ui/` — shadcn primitives (add more with `npm run ui:add`).
- `src/components/layout/` — `DashboardLayout`, `MainLayout`, `Header`,
  `Footer`, `PageHeader`.
- `src/components/{theme,query}-provider.tsx` — app-wide providers.
- `src/hooks/` — `useIsMobile`, `useIsDesktop`.
- `src/lib/utils.ts` — `cn()` and small helpers.
- `src/styles/theme.css` — Tailwind v4 CSS-first theme tokens; imported from
  `app/globals.css`.
- `.claude/skills/` — shared skills for adding UI components, charts, state
  management and the design system. Read the relevant one before building UI.

## Conventions

- TypeScript strict, `@/*` → `src/*`.
- Biome for lint + format (`npm run lint`, `npm run format`); kebab-case
  filenames.
- Verify changes with `npm run typecheck`, `npm run lint`, `npm run build`.

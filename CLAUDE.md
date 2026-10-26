# CLAUDE.md

Guidance for AI agents working in this repo.

## What this is

**mzdy** — an administration tool for an outpatient clinic (Czech
"ambulance"). The first feature is the monthly attendance sheet
(docházka): the clinic used to retype it in Excel/Word every month. There is no
database, auth, API route, or worker yet; all data lives in the browser.

## Layout

- `app/` — routes. `layout.tsx` wires fonts, theme, React Query and the
  toaster; `page.tsx` redirects to `/dochazka`; `error.tsx` and
  `not-found.tsx` are the shared error screens.
- `app/(app)/` — the app shell (`DashboardLayout` + sidebar, save indicator,
  backup menu). `zamestnanci/` = employees with contract type (HPP, DPČ, DPP)
  and a usual weekly schedule; `dochazka/?mesic=YYYY-MM` = the month editor
  (prefill from schedules, per-day rows, absence ranges).
- `src/lib/attendance/` — pure domain logic with tests: `model.ts` (zod
  schemas, Czech labels, shift validation), `calendar.ts` (UTC date helpers,
  Czech public holidays incl. Easter), `prefill.ts` (month/day prefill,
  status ranges).
- `src/stores/attendance-store.ts` — zustand store persisted to
  `localStorage` (`mzdy:dochazka`), hydrated after mount
  (`skipHydration` + `rehydrate()` in the shell). Backups are JSON files
  (`{ app: "mzdy", version: 1, data }`).
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

- **The UI is in Czech.** Every user-facing string is Czech, including
  screen-reader labels, toasts, page titles and exported documents. Format
  dates, times and numbers with the `cs-CZ` locale (date picker uses the
  `cs` locale from `react-day-picker`). Code, comments and docs stay English.
- TypeScript strict, `@/*` → `src/*`.
- Biome for lint + format (`npm run lint`, `npm run format`); kebab-case
  filenames.
- Verify changes with `npm test`, `npm run typecheck`, `npm run lint`,
  `npm run build`.
- Never commit real staff data (e.g. the sample `září.docx`); root `*.docx`
  files are git-ignored.

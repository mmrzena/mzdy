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
  `summary.ts` computes days/hours per employee and status (hours = end −
  start − lunch break, § 88 ZP; absences count the planned shift).
  `pdf.ts` builds the month PDF (pdfmake, A4 portrait, brand styling, last
  page = hours summary,
  same colour meaning as the clinic's Word sheet); pdfmake + fonts load only
  on click. pdfmake mutates cell objects during layout, so never share a cell
  or row object between table positions.
- `src/stores/attendance-store.ts` — zustand store persisted to
  `localStorage` (`mzdy:dochazka`), hydrated after mount
  (`skipHydration` + `rehydrate()` in the shell). Writes are debounced
  (300 ms) and flushed on `pagehide` / hidden tab. Backups are JSON files
  (`{ app: "mzdy", version: 1, data }`).
- `src/components/ui/` — shadcn primitives (add more with `npm run ui:add`).
- `src/components/layout/` — `DashboardLayout`, `MainLayout`, `Header`,
  `Footer`, `PageHeader`.
- `src/components/{theme,query}-provider.tsx` — app-wide providers.
  Light/dark: next-themes (class strategy, follows the system until the user
  picks), toggle in `src/components/app/theme-toggle.tsx`, saved in
  `localStorage` under `mzdy:theme`.
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
- Statuses: `pritomen`, the clinic's absence reasons (`ABSENCE_STATUSES`:
  dovolená, neplacené volno, pracovní cesta, PN / OČR, překážky na straně
  zaměstnavatele) and `svatek`. Old values are mapped by `migrateStatus`
  (zod preprocess + persist v2 migration); keep that map when renaming.
- Contract colours (HPP navy, DPČ blue, DPP grey) are theme tokens
  `--contract-*` used by `ContractBadge`; the PDF mirrors them.
- Shared helpers live in `src/lib/attendance/calendar.ts` (`plural`,
  `formatDate`, `toIsoDate`, `countWorkdays`…) and `model.ts` (labels,
  `fallbackShift`); reuse them instead of re-deriving. Confirmations use
  `src/components/app/confirm-dialog.tsx`.
- Never commit real staff data (e.g. the sample `září.docx`); root `*.docx`
  files are git-ignored.

import { plural } from "./calendar";
import {
  type Employee,
  type MonthSheet,
  STATUSES,
  type Status,
  shiftMinutes,
} from "./model";

export type Tally = { days: number; minutes: number };
export type StatusTotals = Record<Status, Tally>;

export type EmployeeSummary = {
  employee: Employee;
  totals: StatusTotals;
};

export type MonthTotals = {
  /** Employees with at least one entry, in list order. */
  rows: EmployeeSummary[];
  total: StatusTotals;
  /** Entries left out of the hours because their times are inconsistent. */
  invalid: number;
};

function emptyTotals(): StatusTotals {
  return Object.fromEntries(
    STATUSES.map((s) => [s, { days: 0, minutes: 0 }]),
  ) as StatusTotals;
}

/**
 * Days and hours per status for each employee. Absences and holidays count
 * the hours of the shift planned for that day, which is how vacation is
 * accounted in hours.
 */
export function summarizeMonth(
  sheet: MonthSheet,
  employees: Employee[],
): MonthTotals {
  const byEmployee = new Map<string, StatusTotals>();
  const total = emptyTotals();
  let invalid = 0;

  for (const entries of Object.values(sheet.days)) {
    for (const entry of entries) {
      let totals = byEmployee.get(entry.employeeId);
      if (!totals) {
        totals = emptyTotals();
        byEmployee.set(entry.employeeId, totals);
      }
      const minutes = shiftMinutes(entry);
      if (minutes === null) invalid++;
      for (const tally of [totals[entry.status], total[entry.status]]) {
        tally.days++;
        tally.minutes += minutes ?? 0;
      }
    }
  }

  const rows = employees.flatMap((employee) => {
    const totals = byEmployee.get(employee.id);
    return totals ? [{ employee, totals }] : [];
  });
  return { rows, total, invalid };
}

const hoursFormat = new Intl.NumberFormat("cs-CZ", {
  maximumFractionDigits: 2,
});

/** 9 450 min → "157,5" */
export function formatHours(minutes: number) {
  return hoursFormat.format(minutes / 60);
}

/** 3 → "3 dny" */
export function formatDays(days: number) {
  return plural(days, "den", "dny", "dní");
}

/** How the hours are counted; shown under the summary on screen and in the PDF. */
export const HOURS_NOTE =
  "Odpracované hodiny = konec − začátek − obědová pauza. Pauza na jídlo a oddech se do pracovní doby nezapočítává (§ 88 zákoníku práce). Nepřítomnosti a svátky jsou v hodinách podle směny plánované na daný den.";

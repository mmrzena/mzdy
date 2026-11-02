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

/** The totals of several employees added up, e.g. for a filtered view. */
export function sumTotals(rows: StatusTotals[]): StatusTotals {
  const sum = emptyTotals();
  for (const totals of rows) {
    for (const status of STATUSES) {
      sum[status].days += totals[status].days;
      sum[status].minutes += totals[status].minutes;
    }
  }
  return sum;
}

/**
 * Days and hours per status for each employee. Absences and holidays count
 * the hours of the shift planned for that day, which is how vacation is
 * accounted in hours. A day split into several parts counts once in the days
 * of every status it contains, and its hours part by part.
 */
export function summarizeMonth(
  sheet: MonthSheet,
  employees: Employee[],
): MonthTotals {
  const byEmployee = new Map<string, StatusTotals>();
  const total = emptyTotals();
  let invalid = 0;

  for (const entries of Object.values(sheet.days)) {
    /** "employeeId:status" pairs already counted as a day today. */
    const counted = new Set<string>();
    for (const entry of entries) {
      let totals = byEmployee.get(entry.employeeId);
      if (!totals) {
        totals = emptyTotals();
        byEmployee.set(entry.employeeId, totals);
      }
      const minutes = shiftMinutes(entry);
      if (minutes === null) invalid++;
      const key = `${entry.employeeId}:${entry.status}`;
      const newDay = !counted.has(key);
      counted.add(key);
      for (const tally of [totals[entry.status], total[entry.status]]) {
        if (newDay) tally.days++;
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
  "Odpracované hodiny = konec − začátek − obědová pauza. Pauza na jídlo a oddech se do pracovní doby nezapočítává (§ 88 zákoníku práce). Nepřítomnosti a svátky jsou v hodinách podle směny plánované na daný den. Rozdělený den (např. dopoledne práce, odpoledne dovolená) se počítá po částech.";

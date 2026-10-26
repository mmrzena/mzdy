import type { CalendarDay } from "./calendar";
import {
  type Employee,
  type Entry,
  fallbackShift,
  type MonthSheet,
  type Shift,
  type Status,
} from "./model";

/** The shift an employee usually works on this day, or null when off. */
export function templateShift(employee: Employee, day: CalendarDay) {
  return employee.week[day.weekdayIndex];
}

function entryFor(employee: Employee, shift: Shift, day: CalendarDay): Entry {
  return {
    employeeId: employee.id,
    status: day.holiday ? "svatek" : "pritomen",
    ...shift,
  };
}

/**
 * A day's entries from the weekly templates of the active employees, in list
 * order. On a public holiday whoever would normally work is marked "svátek",
 * which is how the clinic's sheet records it.
 */
export function prefillDay(day: CalendarDay, employees: Employee[]): Entry[] {
  const entries: Entry[] = [];
  for (const employee of employees) {
    if (!employee.active) continue;
    const shift = templateShift(employee, day);
    if (shift) entries.push(entryFor(employee, shift, day));
  }
  return entries;
}

export function prefillMonth(
  days: CalendarDay[],
  employees: Employee[],
): MonthSheet {
  const sheet: MonthSheet = { days: {} };
  for (const day of days) {
    sheet.days[day.date] = prefillDay(day, employees);
  }
  return sheet;
}

/** The entry for adding someone to a day by hand. */
export function manualEntry(employee: Employee, day: CalendarDay): Entry {
  const shift = templateShift(employee, day) ?? fallbackShift(day.weekdayIndex);
  return entryFor(employee, shift, day);
}

/** Keep a day's entries in the employee-list order. */
export function sortEntries(entries: Entry[], employees: Employee[]) {
  const order = new Map(employees.map((e, i) => [e.id, i]));
  return [...entries].sort(
    (a, b) =>
      (order.get(a.employeeId) ?? Number.MAX_SAFE_INTEGER) -
      (order.get(b.employeeId) ?? Number.MAX_SAFE_INTEGER),
  );
}

export type StatusRange = {
  employee: Employee;
  /** ISO dates, inclusive. */
  from: string;
  to: string;
  status: Status;
};

/**
 * Mark an employee with a status on every day of the range where they work:
 * an existing entry gets the new status, and a day their template covers but
 * that has no entry yet gains one. Public holidays keep "svátek".
 */
export function applyStatusRange(
  sheet: MonthSheet,
  days: CalendarDay[],
  employees: Employee[],
  { employee, from, to, status }: StatusRange,
): MonthSheet {
  const next: MonthSheet = { days: { ...sheet.days } };
  for (const day of days) {
    if (day.date < from || day.date > to || day.holiday) continue;
    const entries = next.days[day.date] ?? [];
    const index = entries.findIndex((e) => e.employeeId === employee.id);
    if (index >= 0) {
      next.days[day.date] = entries.map((e, i) =>
        i === index ? { ...e, status } : e,
      );
      continue;
    }
    const shift = templateShift(employee, day);
    if (shift) {
      next.days[day.date] = sortEntries(
        [...entries, { employeeId: employee.id, status, ...shift }],
        employees,
      );
    }
  }
  return next;
}

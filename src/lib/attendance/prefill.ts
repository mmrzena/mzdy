import type { CalendarDay } from "./calendar";
import type { Employee, Entry, MonthSheet, Shift, Status } from "./model";
import { CLINIC_WEEK } from "./model";

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

/**
 * The entry for adding someone to a day by hand: their usual shift for that
 * weekday, else the clinic's hours for it, else a plain 8:00–16:00.
 */
export function manualEntry(employee: Employee, day: CalendarDay): Entry {
  const shift = templateShift(employee, day) ??
    CLINIC_WEEK[day.weekdayIndex] ?? {
      start: "08:00",
      end: "16:00",
      breakStart: null,
      breakEnd: null,
    };
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

/**
 * Mark an employee with `status` on every day from `from` to `to` (inclusive)
 * where they work: an existing entry gets the new status, and a day their
 * template covers but that has no entry yet gains one. Public holidays keep
 * "svátek". Returns a new sheet.
 */
export function applyStatusRange(
  sheet: MonthSheet,
  days: CalendarDay[],
  employee: Employee,
  from: string,
  to: string,
  status: Status,
  employees: Employee[],
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

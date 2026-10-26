import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { type CalendarDay, monthDays } from "@/lib/attendance/calendar";
import type {
  AttendanceData,
  Employee,
  Entry,
  MonthSheet,
  Status,
} from "@/lib/attendance/model";
import {
  applyStatusRange,
  manualEntry,
  prefillDay,
  prefillMonth,
  sortEntries,
} from "@/lib/attendance/prefill";

export type EmployeeInput = Omit<Employee, "id">;

type AttendanceState = AttendanceData & {
  addEmployee: (input: EmployeeInput) => void;
  updateEmployee: (id: string, input: EmployeeInput) => void;
  setEmployeeActive: (id: string, active: boolean) => void;
  moveEmployee: (id: string, direction: -1 | 1) => void;
  /** Only for employees with no entries; others are deactivated instead. */
  deleteEmployee: (id: string) => void;

  prefillMonth: (month: string) => void;
  startEmptyMonth: (month: string) => void;
  clearMonth: (month: string) => void;

  updateEntry: (
    month: string,
    date: string,
    employeeId: string,
    patch: Partial<Omit<Entry, "employeeId">>,
  ) => void;
  addEntry: (month: string, day: CalendarDay, employeeId: string) => void;
  removeEntry: (month: string, date: string, employeeId: string) => void;
  resetDay: (month: string, day: CalendarDay) => void;
  copyDay: (month: string, date: string, fromDate: string) => void;
  clearDay: (month: string, date: string) => void;
  applyStatusRange: (
    month: string,
    employeeId: string,
    from: string,
    to: string,
    status: Status,
  ) => void;

  replaceAll: (data: AttendanceData) => void;
};

function withDay(
  months: AttendanceData["months"],
  month: string,
  date: string,
  update: (entries: Entry[]) => Entry[],
) {
  const sheet: MonthSheet = months[month] ?? { days: {} };
  return {
    ...months,
    [month]: {
      days: { ...sheet.days, [date]: update(sheet.days[date] ?? []) },
    },
  };
}

export const useAttendanceStore = create<AttendanceState>()(
  persist(
    (set) => ({
      employees: [],
      months: {},

      addEmployee: (input) =>
        set((s) => ({
          employees: [...s.employees, { ...input, id: crypto.randomUUID() }],
        })),
      updateEmployee: (id, input) =>
        set((s) => ({
          employees: s.employees.map((e) =>
            e.id === id ? { ...input, id } : e,
          ),
        })),
      setEmployeeActive: (id, active) =>
        set((s) => ({
          employees: s.employees.map((e) =>
            e.id === id ? { ...e, active } : e,
          ),
        })),
      moveEmployee: (id, direction) =>
        set((s) => {
          const from = s.employees.findIndex((e) => e.id === id);
          const to = from + direction;
          if (from < 0 || to < 0 || to >= s.employees.length) return s;
          const employees = [...s.employees];
          [employees[from], employees[to]] = [employees[to], employees[from]];
          return { employees };
        }),
      deleteEmployee: (id) =>
        set((s) => ({ employees: s.employees.filter((e) => e.id !== id) })),

      prefillMonth: (month) =>
        set((s) => ({
          months: {
            ...s.months,
            [month]: prefillMonth(monthDays(month), s.employees),
          },
        })),
      startEmptyMonth: (month) =>
        set((s) => ({ months: { ...s.months, [month]: { days: {} } } })),
      clearMonth: (month) =>
        set((s) => {
          const { [month]: _removed, ...months } = s.months;
          return { months };
        }),

      updateEntry: (month, date, employeeId, patch) =>
        set((s) => ({
          months: withDay(s.months, month, date, (entries) =>
            entries.map((e) =>
              e.employeeId === employeeId ? { ...e, ...patch } : e,
            ),
          ),
        })),
      addEntry: (month, day, employeeId) =>
        set((s) => {
          const employee = s.employees.find((e) => e.id === employeeId);
          if (!employee) return s;
          return {
            months: withDay(s.months, month, day.date, (entries) =>
              entries.some((e) => e.employeeId === employeeId)
                ? entries
                : sortEntries(
                    [...entries, manualEntry(employee, day)],
                    s.employees,
                  ),
            ),
          };
        }),
      removeEntry: (month, date, employeeId) =>
        set((s) => ({
          months: withDay(s.months, month, date, (entries) =>
            entries.filter((e) => e.employeeId !== employeeId),
          ),
        })),
      resetDay: (month, day) =>
        set((s) => ({
          months: withDay(s.months, month, day.date, () =>
            prefillDay(day, s.employees),
          ),
        })),
      copyDay: (month, date, fromDate) =>
        set((s) => {
          const source = s.months[month]?.days[fromDate] ?? [];
          return {
            months: withDay(s.months, month, date, () =>
              source.map((e) => ({ ...e })),
            ),
          };
        }),
      clearDay: (month, date) =>
        set((s) => ({ months: withDay(s.months, month, date, () => []) })),
      applyStatusRange: (month, employeeId, from, to, status) =>
        set((s) => {
          const employee = s.employees.find((e) => e.id === employeeId);
          if (!employee) return s;
          return {
            months: {
              ...s.months,
              [month]: applyStatusRange(
                s.months[month] ?? { days: {} },
                monthDays(month),
                employee,
                from,
                to,
                status,
                s.employees,
              ),
            },
          };
        }),

      replaceAll: (data) =>
        set({ employees: data.employees, months: data.months }),
    }),
    {
      name: "mzdy:dochazka",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ employees: s.employees, months: s.months }),
      // Hydrated from the browser after mount (see StoreHydrator), so the
      // server render and the first client render agree.
      skipHydration: true,
    },
  ),
);

/** Whether saved data has been loaded from the browser yet. */
export function useStoreHydrated() {
  return useSyncExternalStore(
    (onChange) => useAttendanceStore.persist.onFinishHydration(onChange),
    () => useAttendanceStore.persist.hasHydrated(),
    () => false,
  );
}

/** Whether any month has an entry for this employee. */
export function isEmployeeUsed(data: AttendanceData, employeeId: string) {
  return Object.values(data.months).some((sheet) =>
    Object.values(sheet.days).some((entries) =>
      entries.some((e) => e.employeeId === employeeId),
    ),
  );
}

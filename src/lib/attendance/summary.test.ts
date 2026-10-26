import assert from "node:assert/strict";
import { test } from "node:test";

import { monthDays } from "./calendar";
import { CLINIC_WEEK, EMPTY_WEEK, type Employee, shiftMinutes } from "./model";
import { applyStatusRange, manualEntry, prefillMonth } from "./prefill";
import { formatHours, summarizeMonth } from "./summary";

const nurse: Employee = {
  id: "a",
  name: "Sestra",
  contract: "HPP",
  active: true,
  week: CLINIC_WEEK,
};
const helper: Employee = {
  id: "b",
  name: "Pomocník",
  contract: "DPP",
  active: true,
  week: EMPTY_WEEK,
};
const unused: Employee = { ...helper, id: "c", name: "Bez směn" };
const employees = [nurse, helper, unused];
const days = monthDays("2026-09");

test("shift minutes deduct the lunch break", () => {
  const shift = {
    start: "07:00",
    end: "16:00",
    breakStart: "12:00",
    breakEnd: "12:30",
  };
  assert.equal(shiftMinutes(shift), 510);
  assert.equal(
    shiftMinutes({ ...shift, breakStart: null, breakEnd: null }),
    540,
  );
  assert.equal(shiftMinutes({ ...shift, end: "06:00" }), null);
});

test("september 2026 for a full-time nurse", () => {
  // Mon 9.5 h ×3 (28th is a holiday), Tue 8.5 ×5, Wed 8 ×5, Thu 7 ×4, Fri 7 ×4
  const { rows, total } = summarizeMonth(
    prefillMonth(days, employees),
    employees,
  );
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0].totals.pritomen, { days: 21, minutes: 167 * 60 });
  assert.deepEqual(rows[0].totals.svatek, { days: 1, minutes: 9.5 * 60 });
  assert.deepEqual(total.pritomen, rows[0].totals.pritomen);
});

test("vacation moves the planned hours from worked to dovolená", () => {
  let sheet = prefillMonth(days, employees);
  sheet = applyStatusRange(sheet, days, employees, {
    employee: nurse,
    from: "2026-09-02",
    to: "2026-09-02",
    status: "dovolena",
  });
  sheet.days["2026-09-19"] = [manualEntry(helper, days[18])];
  const { rows, total } = summarizeMonth(sheet, employees);
  assert.deepEqual(rows[0].totals.pritomen, { days: 20, minutes: 159 * 60 });
  assert.deepEqual(rows[0].totals.dovolena, { days: 1, minutes: 8 * 60 });
  assert.equal(rows[1].employee.id, "b");
  assert.deepEqual(rows[1].totals.pritomen, { days: 1, minutes: 7.5 * 60 });
  assert.equal(total.pritomen.days, 21);
});

test("inconsistent times are counted as days but not hours", () => {
  const sheet = prefillMonth(days, employees);
  sheet.days["2026-09-01"] = [{ ...sheet.days["2026-09-01"][0], end: "06:00" }];
  const { rows, invalid } = summarizeMonth(sheet, employees);
  assert.equal(invalid, 1);
  assert.deepEqual(rows[0].totals.pritomen, { days: 21, minutes: 158.5 * 60 });
});

test("hours use Czech decimals", () => {
  assert.equal(formatHours(9450), "157,5");
  assert.equal(formatHours(465), "7,75");
  assert.equal(formatHours(480), "8");
});

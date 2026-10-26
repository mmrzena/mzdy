import assert from "node:assert/strict";
import { test } from "node:test";

import { monthDays } from "./calendar";
import {
  CLINIC_WEEK,
  EMPTY_WEEK,
  type Employee,
  entrySchema,
  shiftIssue,
} from "./model";
import { applyStatusRange, manualEntry, prefillMonth } from "./prefill";

const nurse: Employee = {
  id: "a",
  name: "Sestra A",
  contract: "HPP",
  active: true,
  week: CLINIC_WEEK,
};
const dpp: Employee = {
  id: "b",
  name: "Brigádník B",
  contract: "DPP",
  active: true,
  week: EMPTY_WEEK,
};
const former: Employee = { ...nurse, id: "c", active: false };
const employees = [nurse, dpp, former];
const days = monthDays("2026-09");

test("prefill follows templates, skips inactive and weekends", () => {
  const sheet = prefillMonth(days, employees);
  assert.equal(sheet.days["2026-09-01"].length, 1);
  assert.deepEqual(sheet.days["2026-09-01"][0], {
    employeeId: "a",
    status: "pritomen",
    start: "07:00",
    end: "16:00",
    breakStart: "12:00",
    breakEnd: "12:30",
  });
  assert.equal(sheet.days["2026-09-19"].length, 0);
});

test("holiday marks usual workers as svátek", () => {
  const sheet = prefillMonth(days, employees);
  assert.equal(sheet.days["2026-09-28"][0].status, "svatek");
});

test("vacation range updates entries and skips holidays", () => {
  const sheet = prefillMonth(days, employees);
  const next = applyStatusRange(sheet, days, employees, {
    employee: nurse,
    from: "2026-09-25",
    to: "2026-09-29",
    status: "dovolena",
  });
  assert.equal(next.days["2026-09-25"][0].status, "dovolena");
  assert.equal(next.days["2026-09-26"].length, 0); // weekend untouched
  assert.equal(next.days["2026-09-28"][0].status, "svatek");
  assert.equal(next.days["2026-09-29"][0].status, "dovolena");
  assert.equal(sheet.days["2026-09-25"][0].status, "pritomen"); // immutable
});

test("manual entry falls back to clinic hours, then 8–16 with a break", () => {
  const weekday = manualEntry(dpp, days[0]);
  assert.equal(weekday.start, "07:00");
  const saturday = manualEntry(dpp, days[18]);
  assert.equal(saturday.start, "08:00");
  assert.equal(saturday.breakStart, "12:00");
});

test("shift validation", () => {
  const ok = { start: "07:00", end: "15:00", breakStart: null, breakEnd: null };
  assert.equal(shiftIssue(ok), null);
  assert.match(shiftIssue({ ...ok, end: "06:00" }) ?? "", /Konec/);
  assert.match(shiftIssue({ ...ok, breakStart: "12:00" }) ?? "", /pauzy/);
  assert.match(
    shiftIssue({ ...ok, breakStart: "16:00", breakEnd: "16:30" }) ?? "",
    /uvnitř/,
  );
});

test("old statuses read as the clinic's PN / OČR", () => {
  const old = {
    employeeId: "a",
    status: "nemoc",
    start: "07:00",
    end: "15:00",
    breakStart: null,
    breakEnd: null,
  };
  assert.equal(entrySchema.parse(old).status, "pn_ocr");
  assert.equal(entrySchema.parse({ ...old, status: "lekar" }).status, "pn_ocr");
  assert.equal(entrySchema.safeParse({ ...old, status: "x" }).success, false);
});

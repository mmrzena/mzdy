import assert from "node:assert/strict";
import { test } from "node:test";

import { monthDays } from "./calendar";
import {
  CLINIC_WEEK,
  EMPTY_WEEK,
  type Employee,
  mergeShifts,
  shiftIssue,
  splitShift,
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

test("a shift splits at its lunch break, parts add up to the shift", () => {
  const parts = splitShift({
    start: "07:00",
    end: "16:00",
    breakStart: "12:00",
    breakEnd: "12:30",
  });
  assert.deepEqual(parts, [
    { start: "07:00", end: "12:00", breakStart: null, breakEnd: null },
    { start: "12:30", end: "16:00", breakStart: null, breakEnd: null },
  ]);
});

test("a shift without a break splits at the midpoint, to 5 minutes", () => {
  const parts = splitShift({
    start: "08:00",
    end: "14:35",
    breakStart: null,
    breakEnd: null,
  });
  assert.deepEqual(
    parts?.map((p) => [p.start, p.end]),
    [
      ["08:00", "11:20"],
      ["11:20", "14:35"],
    ],
  );
  const edge = splitShift({
    start: "08:00",
    end: "16:00",
    breakStart: "08:00",
    breakEnd: "08:30",
  });
  assert.deepEqual(edge?.[0], {
    start: "08:00",
    end: "12:00",
    breakStart: "08:00",
    breakEnd: "08:30",
  });
  assert.equal(edge?.[1].breakStart, null);
});

test("too short or broken shifts cannot be split", () => {
  const none = { breakStart: null, breakEnd: null };
  assert.equal(splitShift({ start: "08:00", end: "08:05", ...none }), null);
  assert.equal(splitShift({ start: "09:00", end: "08:00", ...none }), null);
});

test("a status range marks every part of a split day", () => {
  const sheet = prefillMonth(days, employees);
  const [a, b] = splitShift(sheet.days["2026-09-01"][0]) ?? [];
  const entry = sheet.days["2026-09-01"][0];
  sheet.days["2026-09-01"] = [
    { ...entry, ...a },
    { ...entry, ...b },
  ];
  const next = applyStatusRange(sheet, days, employees, {
    employee: nurse,
    from: "2026-09-01",
    to: "2026-09-01",
    status: "pn",
  });
  assert.deepEqual(
    next.days["2026-09-01"].map((e) => e.status),
    ["pn", "pn"],
  );
});

test("merging the parts restores the shift, gap becoming the break", () => {
  const shift = {
    start: "07:00",
    end: "16:00",
    breakStart: "12:00",
    breakEnd: "12:30",
  };
  const parts = splitShift(shift);
  assert.ok(parts);
  assert.deepEqual(mergeShifts(parts[0], parts[1]), shift);

  const noBreak = { ...shift, breakStart: null, breakEnd: null };
  const halves = splitShift(noBreak);
  assert.ok(halves);
  assert.deepEqual(mergeShifts(halves[0], halves[1]), noBreak);

  // a break inside one part is kept
  assert.deepEqual(
    mergeShifts(
      { start: "07:00", end: "11:00", breakStart: "09:00", breakEnd: "09:15" },
      { start: "11:00", end: "15:00", breakStart: null, breakEnd: null },
    ),
    { start: "07:00", end: "15:00", breakStart: "09:00", breakEnd: "09:15" },
  );
  assert.equal(mergeShifts(parts[1], parts[0]), null);
});

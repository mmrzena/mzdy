import assert from "node:assert/strict";
import { test } from "node:test";

import {
  addMonths,
  czechHolidays,
  easterSunday,
  formatMonth,
  monthDays,
} from "./calendar";

test("easter dates", () => {
  assert.deepEqual(easterSunday(2026), { month: 4, day: 5 });
  assert.deepEqual(easterSunday(2025), { month: 4, day: 20 });
  assert.deepEqual(easterSunday(2027), { month: 3, day: 28 });
});

test("czech holidays include the movable Easter days", () => {
  const h = czechHolidays(2026);
  assert.equal(h.get("2026-04-03"), "Velký pátek");
  assert.equal(h.get("2026-04-06"), "Velikonoční pondělí");
  assert.equal(h.get("2026-09-28"), "Den české státnosti");
  assert.equal(h.size, 13);
});

test("september 2026 matches the clinic sheet", () => {
  const days = monthDays("2026-09");
  assert.equal(days.length, 30);
  assert.equal(days[0].date, "2026-09-01");
  assert.equal(days[0].weekdayIndex, 1); // úterý
  assert.equal(days[18].isWeekend, true); // sobota 19. 9.
  assert.equal(days[27].holiday, "Den české státnosti");
});

test("month arithmetic wraps years", () => {
  assert.equal(addMonths("2026-12", 1), "2027-01");
  assert.equal(addMonths("2026-01", -1), "2025-12");
  assert.equal(formatMonth("2026-09"), "září 2026");
});

import assert from "node:assert/strict";
import { test } from "node:test";

import { monthDays } from "./calendar";
import { CLINIC_WEEK, EMPTY_WEEK, type Employee } from "./model";
import { attendancePdf, sheetTime } from "./pdf";
import { applyStatusRange, manualEntry, prefillMonth } from "./prefill";

const hpp: Employee = {
  id: "a",
  name: "MUDr. Řehoř Čížek",
  contract: "HPP",
  active: true,
  week: CLINIC_WEEK,
};
const dpc: Employee = { ...hpp, id: "b", name: "Dohoda Č", contract: "DPC" };
const dpp: Employee = {
  id: "c",
  name: "Víkendová Ž",
  contract: "DPP",
  active: true,
  week: EMPTY_WEEK,
};
const employees = [hpp, dpc, dpp];
const days = monthDays("2026-09");

type Cell = {
  text?: string | { text: string }[];
  fillColor?: string;
  rowSpan?: number;
  stack?: { text: string }[];
};
type Block = { table: { body: Cell[][] } };

const plain = (c: Cell) =>
  typeof c.text === "string"
    ? c.text
    : (c.text ?? []).map((t) => t.text).join("");

function build() {
  let sheet = prefillMonth(days, employees);
  sheet = applyStatusRange(sheet, days, employees, {
    employee: hpp,
    from: "2026-09-02",
    to: "2026-09-02",
    status: "dovolena",
  });
  sheet.days["2026-09-19"] = [manualEntry(dpp, days[18])];
  const doc = attendancePdf("2026-09", sheet, employees);
  const blocks = (doc.content as unknown as Block[]).slice(0, -1);
  return { doc, blocks };
}

test("formats like the clinic sheet", () => {
  assert.equal(sheetTime("07:30"), "7:30");
  assert.equal(sheetTime("12:00"), "12:00");
});

test("one block per day with entries, skipping empty weekends", () => {
  const { doc, blocks } = build();
  assert.equal(doc.pageOrientation, "portrait");
  // 22 weekdays in September 2026 + Saturday 19th; Sunday 20th is empty.
  assert.equal(blocks.length, 23);
});

test("rows carry day, times, contract tint and absences", () => {
  const { blocks } = build();
  const first = blocks[0].table.body;
  assert.equal(first[0][0].rowSpan, 2);
  assert.deepEqual(
    first[0][0].stack?.slice(0, 2).map((t) => t.text),
    ["úterý", "1. 9."],
  );
  assert.deepEqual(first[0].slice(1).map(plain), [
    "MUDr. Řehoř Čížek",
    "7:00",
    "16:00",
    "12:00 – 12:30",
    "ano",
  ]);
  assert.equal(plain(first[1][1]), "Dohoda Č  DPČ");
  assert.equal(first[1][1].fillColor, "#eaf0fa");

  const vacation = blocks[1].table.body[0];
  assert.deepEqual(vacation.slice(2).map(plain), ["—", "—", "—", "Dovolená"]);
  assert.equal(vacation[5].fillColor, "#fdecef");
});

test("holiday days show the holiday and svátek", () => {
  const { blocks } = build();
  const holiday = blocks.find(
    (b) => b.table.body[0][0].stack?.[1].text === "28. 9.",
  );
  assert.ok(holiday);
  assert.equal(holiday.table.body[0][0].stack?.[2].text, "Den české státnosti");
  assert.equal(plain(holiday.table.body[0][5]), "Svátek");
});

test("absent rows get a separate dash object per column", () => {
  const { blocks } = build();
  const vacation = blocks[1].table.body[0];
  assert.notEqual(vacation[2], vacation[3]);
  assert.notEqual(vacation[3], vacation[4]);
});

test("ends with an hours summary page", () => {
  const { doc } = build();
  const content = doc.content as unknown as {
    pageBreak?: string;
    stack?: { table?: { body: Cell[][] } }[];
  }[];
  const last = content.at(-1);
  assert.equal(last?.pageBreak, "before");
  const body = last?.stack?.[0].table?.body ?? [];
  // header + 3 employees + total
  assert.equal(body.length, 5);
  assert.equal(plain(body.at(-1)?.[0] ?? {}), "Celkem");
});

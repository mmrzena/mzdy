import type {
  Column,
  Content,
  ContextPageSize,
  TableCell,
  TDocumentDefinitions,
} from "pdfmake/interfaces";

import {
  type CalendarDay,
  countWorkdays,
  formatDate,
  formatMonth,
  formatShortDate,
  monthDays,
  plural,
  WEEKDAY_NAMES,
} from "./calendar";
import {
  CONTRACT_LABEL,
  type ContractType,
  type Employee,
  type Entry,
  type MonthSheet,
  NON_WORK_STATUSES,
  STATUS_SHORT,
} from "./model";
import {
  formatDays,
  formatHours,
  HOURS_NOTE,
  type MonthTotals,
  type StatusTotals,
  summarizeMonth,
} from "./summary";

/**
 * The month as a pdfmake document: A4 portrait, one block per day with
 * entries (never split across pages), column headings repeated at the top of
 * every page, in the brand palette. Same information and colour meaning as the
 * clinic's original Word sheet (DPČ blue, DPP grey, absence red), softened.
 */

const C = {
  white: "#ffffff",
  navy: "#0f1f3d",
  blueDark: "#0a2f4f",
  ink: "#1e293b",
  slate: "#4c5f7a",
  muted: "#8a97ab",
  rule: "#e3e8f0",
  ruleStrong: "#c9d2e0",
  red: "#f43f5e",
  redDark: "#be123c",
  absentFill: "#fdecef",
  absentSwatch: "#f8b4c1",
  dpcFill: "#eaf0fa",
  dpcSwatch: "#b4c6e7",
  dppFill: "#f1f3f6",
  dppSwatch: "#d5dae2",
};

/** Badge colours, matching the app's ContractBadge (theme.css). */
const CONTRACT_BADGE: Record<ContractType, { fill: string; color: string }> = {
  HPP: { fill: C.navy, color: C.white },
  DPC: { fill: C.dpcSwatch, color: C.blueDark },
  DPP: { fill: C.dppSwatch, color: C.ink },
};

const FILL_BY_CONTRACT: Record<ContractType, string | undefined> = {
  HPP: undefined,
  DPC: C.dpcFill,
  DPP: C.dppFill,
};

/** Present reads "ano", as in the clinic's sheet; absences by short name. */
function statusText(status: Entry["status"]) {
  return status === "pritomen" ? "ano" : STATUS_SHORT[status];
}

const MARGIN_X = 36;
const HEADER_HEIGHT = 96;
/** day | name | od | do | pause | status */
const WIDTHS: (number | string)[] = [60, "*", 34, 34, 70, 72];

/** "07:30" → "7:30", as written in the clinic's sheet. */
export function sheetTime(value: string) {
  return value.replace(/^0(\d)/, "$1");
}

const cellPadding = {
  paddingLeft: (i: number) => (i === 0 ? 0 : 6),
  paddingRight: () => 6,
  paddingTop: () => 2.5,
  paddingBottom: () => 2.5,
};

type Heading = { text: string; alignment?: "right" };

function headingRow(headings: Heading[]): TableCell[] {
  return headings.map(({ text, alignment }) => ({
    text: text.toUpperCase(),
    alignment,
    fontSize: 7,
    bold: true,
    color: C.slate,
    characterSpacing: 0.6,
  }));
}

/** Rules between body rows; the line under the heading row is navy. */
function ruleWidth(i: number, rowCount: number) {
  if (i === 0) return 0;
  if (i === 1 || i === rowCount - 1) return 1;
  return 0.5;
}

function columnHeader(): Content {
  return {
    table: {
      widths: WIDTHS,
      body: [
        headingRow([
          { text: "Den" },
          { text: "Zaměstnanec" },
          { text: "Od" },
          { text: "Do" },
          { text: "Obědová pauza" },
          { text: "Přítomnost" },
        ]),
      ],
    },
    layout: {
      ...cellPadding,
      hLineWidth: (i: number) => (i === 1 ? 1 : 0),
      hLineColor: () => C.navy,
      vLineWidth: () => 0,
    },
  };
}

function entryCells(entry: Entry, employee: Employee | undefined): TableCell[] {
  const fill = employee ? FILL_BY_CONTRACT[employee.contract] : undefined;
  const present = entry.status === "pritomen";
  const tag =
    employee && employee.contract !== "HPP"
      ? CONTRACT_LABEL[employee.contract].short
      : "";
  // A new object per cell: pdfmake mutates cells while laying them out.
  const dash = () => ({ text: "—", color: C.muted, fillColor: fill });
  const brk =
    entry.breakStart && entry.breakEnd
      ? `${sheetTime(entry.breakStart)} – ${sheetTime(entry.breakEnd)}`
      : null;

  return [
    {
      fillColor: fill,
      text: [
        { text: employee?.name ?? "Neznámý zaměstnanec", color: C.ink },
        ...(tag
          ? [{ text: `  ${tag}`, fontSize: 7, bold: true, color: C.slate }]
          : []),
      ],
    },
    present ? { text: sheetTime(entry.start), fillColor: fill } : dash(),
    present ? { text: sheetTime(entry.end), fillColor: fill } : dash(),
    present && brk ? { text: brk, fillColor: fill } : dash(),
    present
      ? { text: statusText(entry.status), color: C.slate, fillColor: fill }
      : {
          text: statusText(entry.status),
          bold: true,
          color: C.redDark,
          fillColor: C.absentFill,
        },
  ];
}

function dayBlock(
  day: CalendarDay,
  entries: Entry[],
  byId: Map<string, Employee>,
): Content {
  const dayCell: TableCell = {
    rowSpan: entries.length,
    stack: [
      {
        text: WEEKDAY_NAMES[day.weekdayIndex],
        fontSize: 7.5,
        color: day.isWeekend ? C.red : C.slate,
        bold: true,
        characterSpacing: 0.3,
      },
      {
        text: formatShortDate(day.date),
        fontSize: 11,
        bold: true,
        color: C.navy,
      },
      ...(day.holiday
        ? [
            {
              text: day.holiday,
              fontSize: 6.5,
              color: C.redDark,
              margin: [0, 1, 4, 0] as [number, number, number, number],
            },
          ]
        : []),
    ],
  };
  const body: TableCell[][] = entries.map((entry, i) => [
    i === 0 ? dayCell : {},
    ...entryCells(entry, byId.get(entry.employeeId)),
  ]);

  return {
    unbreakable: true,
    table: { widths: WIDTHS, body, dontBreakRows: true },
    layout: {
      ...cellPadding,
      paddingTop: (i: number) => (i === 0 ? 5 : 2.5),
      paddingBottom: (i: number) => (i === entries.length - 1 ? 5 : 2.5),
      hLineWidth: (i: number, node) =>
        i === node.table.body.length ? 0.75 : i === 0 ? 0 : 0.5,
      hLineColor: (i: number, node) =>
        i === node.table.body.length ? C.ruleStrong : C.rule,
      vLineWidth: () => 0,
    },
  };
}

function legendItem(color: string, label: string): Column {
  return {
    width: "auto",
    columns: [
      {
        width: 9,
        canvas: [{ type: "rect", x: 0, y: 1.5, w: 7, h: 7, r: 1.5, color }],
      },
      { width: "auto", text: label, margin: [0, 0, 12, 0] },
    ],
  };
}

/** Each non-zero absence on its own line: "Dovolená   2 dny · 16 h". */
function absenceLines(totals: StatusTotals): TableCell {
  const lines = NON_WORK_STATUSES.filter((s) => totals[s].days > 0).map(
    (s): Content => ({
      columns: [
        { width: 62, text: STATUS_SHORT[s], color: C.slate },
        {
          width: "*",
          text: [
            formatDays(totals[s].days),
            {
              text: ` · ${formatHours(totals[s].minutes)} h`,
              color: C.slate,
            },
          ],
        },
      ],
    }),
  );
  return lines.length > 0 ? { stack: lines } : { text: "—", color: C.muted };
}

function totalsCells(totals: StatusTotals): TableCell[] {
  return [
    { text: String(totals.pritomen.days), alignment: "right" },
    {
      text: formatHours(totals.pritomen.minutes),
      alignment: "right",
      bold: true,
    },
    absenceLines(totals),
  ];
}

/** A small coloured pill, like the app's ContractBadge. */
function contractBadge(contract: ContractType): TableCell {
  const { fill, color } = CONTRACT_BADGE[contract];
  return {
    table: {
      body: [
        [
          {
            text: CONTRACT_LABEL[contract].short,
            bold: true,
            fontSize: 7,
            color,
            fillColor: fill,
          },
        ],
      ],
    },
    layout: {
      hLineWidth: () => 0,
      vLineWidth: () => 0,
      paddingLeft: () => 4,
      paddingRight: () => 4,
      paddingTop: () => 1,
      paddingBottom: () => 1,
    },
  };
}

/** The last page: days and hours per employee, for payroll. */
function summarySection(summary: MonthTotals): Content {
  const head = headingRow([
    { text: "Zaměstnanec" },
    { text: "Úvazek" },
    { text: "Dny", alignment: "right" },
    { text: "Hodiny", alignment: "right" },
    { text: "Nepřítomnost a svátky" },
  ]);
  const rows = summary.rows.map(({ employee, totals }) => [
    { text: employee.name },
    contractBadge(employee.contract),
    ...totalsCells(totals),
  ]);
  const totalRow = [
    { text: "Celkem", bold: true },
    { text: "" },
    ...totalsCells(summary.total),
  ];
  return {
    pageBreak: "before",
    stack: [
      {
        table: {
          headerRows: 1,
          widths: ["*", 38, 30, 44, 170],
          body: [head, ...rows, totalRow],
        },
        layout: {
          ...cellPadding,
          paddingTop: () => 4,
          paddingBottom: () => 4,
          hLineWidth: (i: number, node) => ruleWidth(i, node.table.body.length),
          hLineColor: (i: number) => (i === 1 ? C.navy : C.rule),
          vLineWidth: () => 0,
        },
      },
      {
        margin: [0, 10, 0, 0],
        fontSize: 7.5,
        color: C.slate,
        text:
          HOURS_NOTE +
          (summary.invalid > 0
            ? ` ${plural(summary.invalid, "záznam s neplatným časem není", "záznamy s neplatným časem nejsou", "záznamů s neplatným časem není")} v hodinách započítán.`
            : ""),
      },
    ],
  };
}

/** Which header a page gets: the title page, day pages, or the summary. */
type PageKind = "title" | "days" | "summary";

function pageKind(
  page: number,
  pageCount: number,
  hasSummary: boolean,
): PageKind {
  // The summary starts on a new page after the days and fits on one page for
  // a clinic-sized team, so it is the last page.
  if (hasSummary && page === pageCount) return "summary";
  if (page === 1) return "title";
  return "days";
}

function titleBlock(month: string, people: number, workdays: number): Content {
  return {
    margin: [0, 8, 0, 14],
    columns: [
      {
        width: "*",
        text: [
          { text: "Docházka  ", fontSize: 18, bold: true, color: C.navy },
          { text: formatMonth(month), fontSize: 18, color: C.red },
        ],
      },
      {
        width: "auto",
        alignment: "right",
        margin: [0, 6, 0, 0],
        fontSize: 8.5,
        color: C.slate,
        text: `${plural(people, "zaměstnanec", "zaměstnanci", "zaměstnanců")}  ·  ${plural(workdays, "pracovní den", "pracovní dny", "pracovních dnů")}`,
      },
    ],
  };
}

function continuationBlock(month: string, label: string): Content {
  return {
    margin: [0, 8, 0, 21],
    columns: [
      {
        text: `Docházka – ${formatMonth(month)}`,
        fontSize: 10,
        bold: true,
        color: C.navy,
      },
      { text: label, alignment: "right", fontSize: 8, color: C.muted },
    ],
  };
}

export function attendancePdf(
  month: string,
  sheet: MonthSheet,
  employees: Employee[],
  generatedAt = new Date(),
): TDocumentDefinitions {
  const byId = new Map(employees.map((e) => [e.id, e]));
  const days = monthDays(month);
  const blocks: Content[] = [];
  const people = new Set<string>();

  for (const day of days) {
    const entries = sheet.days[day.date] ?? [];
    if (entries.length === 0) continue;
    for (const e of entries) people.add(e.employeeId);
    blocks.push(dayBlock(day, entries, byId));
  }
  if (blocks.length === 0) {
    blocks.push({
      text: "V tomto měsíci nejsou žádné záznamy.",
      italics: true,
      color: C.slate,
      margin: [0, 12, 0, 0],
    });
  }

  const workdays = countWorkdays(days);
  const summary = summarizeMonth(sheet, employees);
  const hasSummary = summary.rows.length > 0;
  const title = `Docházka – ${formatMonth(month)}`;

  return {
    pageSize: "A4",
    pageOrientation: "portrait",
    pageMargins: [MARGIN_X, HEADER_HEIGHT, MARGIN_X, 44],
    info: { title, subject: "Docházka zaměstnanců" },
    defaultStyle: {
      font: "Roboto",
      fontSize: 8.5,
      color: C.ink,
      lineHeight: 1.05,
    },

    header: (currentPage: number, pageCount: number, size: ContextPageSize) => {
      const kind = pageKind(currentPage, pageCount, hasSummary);
      const blocksByKind: Record<PageKind, Content[]> = {
        title: [titleBlock(month, people.size, workdays), columnHeader()],
        days: [continuationBlock(month, "pokračování"), columnHeader()],
        summary: [continuationBlock(month, "souhrn hodin")],
      };
      return {
        margin: [MARGIN_X, 28, MARGIN_X, 0],
        stack: [
          {
            canvas: [
              {
                type: "rect",
                x: 0,
                y: 0,
                w: size.width - 2 * MARGIN_X,
                h: 2.5,
                color: C.red,
              },
            ],
          },
          ...blocksByKind[kind],
        ],
      };
    },

    content: hasSummary ? [...blocks, summarySection(summary)] : blocks,

    footer: (currentPage: number, pageCount: number) => ({
      margin: [MARGIN_X, 14, MARGIN_X, 0],
      fontSize: 7.5,
      color: C.slate,
      columns: [
        {
          width: "*",
          columns: [
            legendItem(C.dpcSwatch, "DPČ"),
            legendItem(C.dppSwatch, "DPP"),
            legendItem(C.absentSwatch, "Nepřítomnost"),
          ],
        },
        {
          width: "auto",
          text: `Vytvořeno ${formatDate(generatedAt)}`,
          color: C.muted,
          margin: [0, 0, 18, 0],
        },
        { width: "auto", text: `Strana ${currentPage} z ${pageCount}` },
      ],
    }),
  };
}

type PdfMakeBrowser = {
  addVirtualFileSystem: (vfs: Record<string, string>) => void;
  createPdf: (doc: TDocumentDefinitions) => {
    download: (filename: string) => Promise<void>;
  };
};

/** Build and download the PDF. pdfmake and its fonts load only on demand. */
export async function downloadAttendancePdf(
  month: string,
  sheet: MonthSheet,
  employees: Employee[],
) {
  const [pdfMakeModule, vfsModule] = await Promise.all([
    import("pdfmake/build/pdfmake"),
    import("pdfmake/build/vfs_fonts"),
  ]);
  const pdfMake = ((pdfMakeModule as { default?: unknown }).default ??
    pdfMakeModule) as unknown as PdfMakeBrowser;
  const vfs = ((vfsModule as { default?: unknown }).default ??
    vfsModule) as unknown as Record<string, string>;
  pdfMake.addVirtualFileSystem(vfs);
  await pdfMake
    .createPdf(attendancePdf(month, sheet, employees))
    .download(`Docházka ${formatMonth(month)}.pdf`);
}

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
  ABSENCE_STATUSES,
  CONTRACT_LABEL,
  type ContractType,
  type Employee,
  type Entry,
  type MonthSheet,
  STATUS_SHORT,
  type Status,
} from "./model";
import {
  formatHours,
  type MonthSummary,
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
  navy: "#0f1f3d",
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
  hppSwatch: "#0f1f3d",
};

/** Badge colours, matching the app's ContractBadge (theme.css). */
const CONTRACT_BADGE: Record<ContractType, { fill: string; color: string }> = {
  HPP: { fill: C.hppSwatch, color: "#ffffff" },
  DPC: { fill: C.dpcSwatch, color: "#0a2f4f" },
  DPP: { fill: C.dppSwatch, color: "#1e293b" },
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

function columnHeader(): Content {
  const labels = [
    "Den",
    "Zaměstnanec",
    "Od",
    "Do",
    "Obědová pauza",
    "Přítomnost",
  ];
  return {
    table: {
      widths: WIDTHS,
      body: [
        labels.map((text) => ({
          text: text.toUpperCase(),
          fontSize: 7,
          bold: true,
          color: C.slate,
          characterSpacing: 0.6,
        })),
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

const SUMMARY_ABSENCES: Status[] = [...ABSENCE_STATUSES, "svatek"];

/** Each non-zero absence on its own line: "Dovolená   2 dny · 16 h". */
function absenceLines(totals: StatusTotals): TableCell {
  const lines = SUMMARY_ABSENCES.filter((s) => totals[s].days > 0).map(
    (s): Content => ({
      columns: [
        { width: 62, text: STATUS_SHORT[s], color: C.slate },
        {
          width: "*",
          text: [
            plural(totals[s].days, "den", "dny", "dní"),
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

function summaryRow(
  name: TableCell,
  contract: TableCell,
  totals: StatusTotals,
): TableCell[] {
  return [
    name,
    contract,
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
function summarySection(summary: MonthSummary): Content {
  const head = [
    "Zaměstnanec",
    "Úvazek",
    "Dny",
    "Hodiny",
    "Nepřítomnost a svátky",
  ].map((text, i) => ({
    text: text.toUpperCase(),
    fontSize: 7,
    bold: true,
    color: C.slate,
    characterSpacing: 0.6,
    alignment: i === 2 || i === 3 ? ("right" as const) : undefined,
  }));
  const rows = summary.rows.map(({ employee, totals }) =>
    summaryRow(
      { text: employee.name },
      contractBadge(employee.contract),
      totals,
    ),
  );
  const totalRow = summaryRow(
    { text: "Celkem", bold: true },
    { text: "" },
    summary.total,
  );
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
          paddingLeft: (i: number) => (i === 0 ? 0 : 6),
          paddingRight: () => 6,
          paddingTop: () => 4,
          paddingBottom: () => 4,
          hLineWidth: (i: number, node) =>
            i === 1 || i === node.table.body.length - 1 ? 1 : i === 0 ? 0 : 0.5,
          hLineColor: (i: number) => (i === 1 ? C.navy : C.rule),
          vLineWidth: () => 0,
        },
      },
      {
        margin: [0, 10, 0, 0],
        fontSize: 7.5,
        color: C.slate,
        text:
          "Hodiny = konec − začátek − obědová pauza (pauza na jídlo a oddech se do pracovní doby nezapočítává, § 88 zákoníku práce). " +
          "Nepřítomnosti a svátky jsou v hodinách podle směny plánované na daný den." +
          (summary.invalid > 0
            ? ` ${plural(summary.invalid, "záznam s neplatným časem není", "záznamy s neplatným časem nejsou", "záznamů s neplatným časem není")} v hodinách započítán.`
            : ""),
      },
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
      // The summary is always the last page (it starts on a new page and fits
      // on one for a clinic-sized team), and has its own column headings.
      const onSummaryPage = hasSummary && currentPage === pageCount;
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
          currentPage === 1
            ? {
                margin: [0, 8, 0, 14],
                columns: [
                  {
                    width: "*",
                    text: [
                      {
                        text: "Docházka  ",
                        fontSize: 18,
                        bold: true,
                        color: C.navy,
                      },
                      { text: formatMonth(month), fontSize: 18, color: C.red },
                    ],
                  },
                  {
                    width: "auto",
                    alignment: "right",
                    margin: [0, 6, 0, 0],
                    fontSize: 8.5,
                    color: C.slate,
                    text: `${plural(people.size, "zaměstnanec", "zaměstnanci", "zaměstnanců")}  ·  ${plural(workdays, "pracovní den", "pracovní dny", "pracovních dnů")}`,
                  },
                ],
              }
            : {
                margin: [0, 8, 0, 21],
                columns: [
                  { text: title, fontSize: 10, bold: true, color: C.navy },
                  {
                    text: onSummaryPage ? "souhrn hodin" : "pokračování",
                    alignment: "right",
                    fontSize: 8,
                    color: C.muted,
                  },
                ],
              },
          ...(onSummaryPage ? [] : [columnHeader()]),
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

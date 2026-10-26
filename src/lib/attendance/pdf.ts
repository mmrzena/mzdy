import type {
  Column,
  Content,
  ContextPageSize,
  TableCell,
  TDocumentDefinitions,
} from "pdfmake/interfaces";

import { formatMonth, monthDays, WEEKDAY_NAMES } from "./calendar";
import type { ContractType, Employee, Entry, MonthSheet } from "./model";

/**
 * The month as a pdfmake document: A4 landscape, one block per day with
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
  dpcFill: "#eaf0fa",
  dpcSwatch: "#b4c6e7",
  dppFill: "#f1f3f6",
  dppSwatch: "#d5dae2",
};

const FILL_BY_CONTRACT: Record<ContractType, string | undefined> = {
  HPP: undefined,
  DPC: C.dpcFill,
  DPP: C.dppFill,
};

const CONTRACT_TAG: Record<ContractType, string> = {
  HPP: "",
  DPC: "DPČ",
  DPP: "DPP",
};

const STATUS_TEXT: Record<Entry["status"], string> = {
  pritomen: "ano",
  dovolena: "dovolená",
  nemoc: "nemoc",
  lekar: "lékař",
  svatek: "svátek",
};

const MARGIN_X = 36;
const HEADER_HEIGHT = 96;
/** day | name | od | do | pause | status */
const WIDTHS: (number | string)[] = [74, "*", 50, 50, 90, 78];

/** "07:30" → "7:30", as written in the clinic's sheet. */
export function sheetTime(value: string) {
  return value.replace(/^0(\d)/, "$1");
}

/** "2026-09-01" → "01.09.2026" */
export function sheetDate(iso: string) {
  const [year, month, day] = iso.split("-");
  return `${day}.${month}.${year}`;
}

function plural(n: number, one: string, few: string, many: string) {
  if (n === 1) return `${n} ${one}`;
  if (n >= 2 && n <= 4) return `${n} ${few}`;
  return `${n} ${many}`;
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
  const tag = employee ? CONTRACT_TAG[employee.contract] : "";
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
      ? { text: STATUS_TEXT[entry.status], color: C.slate, fillColor: fill }
      : {
          text: STATUS_TEXT[entry.status],
          bold: true,
          color: C.redDark,
          fillColor: C.absentFill,
        },
  ];
}

function dayBlock(
  weekday: string,
  date: string,
  holiday: string | null,
  isWeekend: boolean,
  entries: Entry[],
  byId: Map<string, Employee>,
): Content {
  const [, month, day] = date.split("-").map(Number);
  const dayCell: TableCell = {
    rowSpan: entries.length,
    stack: [
      {
        text: weekday,
        fontSize: 7.5,
        color: isWeekend ? C.red : C.slate,
        bold: true,
        characterSpacing: 0.3,
      },
      { text: `${day}. ${month}.`, fontSize: 11, bold: true, color: C.navy },
      ...(holiday
        ? [
            {
              text: holiday,
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
    blocks.push(
      dayBlock(
        WEEKDAY_NAMES[day.weekdayIndex],
        day.date,
        day.holiday,
        day.isWeekend,
        entries,
        byId,
      ),
    );
  }
  if (blocks.length === 0) {
    blocks.push({
      text: "V tomto měsíci nejsou žádné záznamy.",
      italics: true,
      color: C.slate,
      margin: [0, 12, 0, 0],
    });
  }

  const workdays = days.filter((d) => !d.isWeekend && !d.holiday).length;
  const title = `Docházka – ${formatMonth(month)}`;
  const generated = `${generatedAt.getDate()}. ${generatedAt.getMonth() + 1}. ${generatedAt.getFullYear()}`;

  return {
    pageSize: "A4",
    pageOrientation: "landscape",
    pageMargins: [MARGIN_X, HEADER_HEIGHT, MARGIN_X, 44],
    info: { title, subject: "Docházka zaměstnanců" },
    defaultStyle: {
      font: "Roboto",
      fontSize: 8.5,
      color: C.ink,
      lineHeight: 1.05,
    },

    header: (currentPage: number, _count: number, size: ContextPageSize) => ({
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
                  text: "pokračování",
                  alignment: "right",
                  fontSize: 8,
                  color: C.muted,
                },
              ],
            },
        columnHeader(),
      ],
    }),

    content: blocks,

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
            legendItem("#f8b4c1", "Nepřítomnost"),
          ],
        },
        {
          width: "auto",
          text: `Vytvořeno ${generated}`,
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
